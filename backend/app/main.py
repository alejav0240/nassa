from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session
from .config import settings
from .database import Base, engine, get_db
from .models import Field, ClimateCache, Analysis
from .schemas import FieldCreate, FieldRead, AnalyzeRequest
from .services.nasa import fetch_power
from .services.rotation import CROPS, CROP_METADATA, evaluate

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(title='AgroShift AI API', version='0.1.0', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=[x.strip() for x in settings.cors_origins.split(',')], allow_credentials=False, allow_methods=['GET', 'POST'], allow_headers=['Content-Type'])

@app.get('/api/health')
def health():
    return {'status': 'ok', 'service': 'AgroShift AI', 'version': '0.1.0'}

@app.get('/api/crops')
def crops():
    return {'crops': [{'id': k, **v} for k, v in CROPS.items()], 'methodology': CROP_METADATA}

@app.get('/api/fields', response_model=list[FieldRead])
def list_fields(db: Session = Depends(get_db)):
    return db.scalars(select(Field).order_by(Field.id.desc()).limit(100)).all()

@app.post('/api/fields', response_model=FieldRead, status_code=201)
def create_field(payload: FieldCreate, db: Session = Depends(get_db)):
    field = Field(**payload.model_dump())
    db.add(field)
    db.commit()
    db.refresh(field)
    return field

@app.get('/api/fields/{field_id}', response_model=FieldRead)
def get_field(field_id: int, db: Session = Depends(get_db)):
    field = db.get(Field, field_id)
    if not field:
        raise HTTPException(404, 'Parcela no encontrada')
    return field

@app.post('/api/analyze')
async def analyze(payload: AnalyzeRequest, db: Session = Depends(get_db)):
    field = db.get(Field, payload.field_id)
    if not field:
        raise HTTPException(404, 'Parcela no encontrada')
    # Coordinates rounded to the nearest NASA POWER approx. 0.5° grid cell for cache reuse.
    # This is a cache grouping approximation, NOT a claim of precise cell geolocation.
    grid_lat = round(field.latitude * 2) / 2
    grid_lon = round(field.longitude * 2) / 2
    cache = db.scalar(select(ClimateCache).where(
        ClimateCache.grid_lat == grid_lat, ClimateCache.grid_lon == grid_lon,
        ClimateCache.start_year == settings.climate_start_year,
        ClimateCache.end_year == settings.climate_end_year))
    if cache:
        climate = cache.payload
    else:
        climate = await fetch_power(grid_lat, grid_lon, settings.climate_start_year, settings.climate_end_year, settings.nasa_timeout_seconds)
        cache = ClimateCache(grid_lat=grid_lat, grid_lon=grid_lon, start_year=settings.climate_start_year, end_year=settings.climate_end_year, payload=climate)
        db.add(cache)
        db.commit()
    result = evaluate(field, climate, payload.priorities.model_dump())
    result['climate']['query_coordinates'] = {'latitude': grid_lat, 'longitude': grid_lon}
    result['climate']['requested_coordinates'] = {'latitude': field.latitude, 'longitude': field.longitude}
    result['climate']['cache_grouping_note'] = 'Coordenadas redondeadas para caché; no equivalen necesariamente al centro de la celda nativa de NASA.'
    row = Analysis(field_id=field.id, priorities=payload.priorities.model_dump(), result=result)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {'id': row.id, 'created_at': row.created_at, **result}

@app.get('/api/analyses/{analysis_id}')
def get_analysis(analysis_id: int, db: Session = Depends(get_db)):
    result = db.get(Analysis, analysis_id)
    if not result:
        raise HTTPException(404, 'Análisis no encontrado')
    return {'id': result.id, 'created_at': result.created_at, **result.result}
