from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session
from .config import settings
from .database import Base, engine, get_db
from .models import Field, ClimateCache, Analysis
from .schemas import (
    AnalyzeRequest,
    CropsResponse,
    ErrorResponse,
    FieldCreate,
    FieldRead,
    HealthResponse,
)
from .services.nasa import fetch_power
from .services.rotation import CROPS, CROP_METADATA, evaluate

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

tags_metadata = [
    {
        'name': 'Health',
        'description': 'Verificación de disponibilidad del servicio.',
    },
    {
        'name': 'Crops',
        'description': 'Catálogo de cultivos y metodología heurística.',
    },
    {
        'name': 'Fields',
        'description': 'Registro y consulta de parcelas agrícolas.',
    },
    {
        'name': 'Analyses',
        'description': 'Evaluación climática y comparación de estrategias de rotación.',
    },
]

app = FastAPI(
    title='AgroShift AI API',
    summary='API para explorar rotaciones agrícolas con información climática histórica.',
    description=(
        'AgroShift AI combina información de parcelas, datos históricos de NASA POWER '
        'y reglas heurísticas transparentes para comparar estrategias de rotación. '
        'Los puntajes son educativos y no constituyen una recomendación agronómica validada.'
    ),
    version='0.1.0',
    openapi_tags=tags_metadata,
    contact={'name': 'AgroShift AI'},
    lifespan=lifespan,
)
app.add_middleware(CORSMiddleware, allow_origins=[x.strip() for x in settings.cors_origins.split(',')], allow_credentials=False, allow_methods=['GET', 'POST'], allow_headers=['Content-Type'])

@app.get(
    '/api/health',
    tags=['Health'],
    response_model=HealthResponse,
    summary='Verificar disponibilidad de la API',
    description='Devuelve el estado básico y la versión del servicio.',
    response_description='Estado actual de la API.',
)
def health():
    """Verifica que el servicio esté disponible."""
    return {'status': 'ok', 'service': 'AgroShift AI', 'version': '0.1.0'}

@app.get(
    '/api/crops',
    tags=['Crops'],
    response_model=CropsResponse,
    summary='Listar cultivos disponibles',
    description='Devuelve el catálogo de cultivos y los parámetros heurísticos usados por el prototipo.',
    response_description='Catálogo de cultivos y metodología.',
)
def crops():
    """Lista cultivos soportados y su metodología de puntuación."""
    return {'crops': [{'id': k, **v} for k, v in CROPS.items()], 'methodology': CROP_METADATA}

@app.get(
    '/api/fields',
    tags=['Fields'],
    response_model=list[FieldRead],
    summary='Listar parcelas',
    description='Devuelve hasta las 100 parcelas más recientes, ordenadas por identificador descendente.',
    response_description='Lista de parcelas registradas.',
)
def list_fields(db: Session = Depends(get_db)):
    """Lista las parcelas registradas."""
    return db.scalars(select(Field).order_by(Field.id.desc()).limit(100)).all()

@app.post(
    '/api/fields',
    tags=['Fields'],
    response_model=FieldRead,
    status_code=201,
    summary='Crear una parcela',
    description='Registra una parcela y valida sus coordenadas, superficie, cultivo y geometría GeoJSON opcional.',
    response_description='Parcela creada.',
    responses={422: {'description': 'Los datos de la parcela no cumplen las reglas de validación.'}},
)
def create_field(payload: FieldCreate, db: Session = Depends(get_db)):
    """Crea y persiste una parcela agrícola."""
    field = Field(**payload.model_dump())
    db.add(field)
    db.commit()
    db.refresh(field)
    return field

@app.get(
    '/api/fields/{field_id}',
    tags=['Fields'],
    response_model=FieldRead,
    summary='Obtener una parcela',
    description='Busca una parcela por su identificador.',
    response_description='Parcela solicitada.',
    responses={404: {'model': ErrorResponse, 'description': 'La parcela no existe.'}},
)
def get_field(field_id: int, db: Session = Depends(get_db)):
    """Obtiene una parcela por identificador."""
    field = db.get(Field, field_id)
    if not field:
        raise HTTPException(404, 'Parcela no encontrada')
    return field

@app.post(
    '/api/analyze',
    tags=['Analyses'],
    status_code=200,
    summary='Analizar estrategias de rotación',
    description=(
        'Consulta o reutiliza datos climáticos de NASA POWER, evalúa tres estrategias '
        'de rotación con las prioridades indicadas y persiste el resultado. '
        'Los puntajes son heurísticos y deben validarse con especialistas locales.'
    ),
    response_description='Análisis climático y estrategias de rotación.',
    responses={
        404: {'model': ErrorResponse, 'description': 'La parcela no existe.'},
        422: {'description': 'Las prioridades o el identificador de parcela son inválidos.'},
        503: {'model': ErrorResponse, 'description': 'NASA POWER no está disponible o devolvió una respuesta inválida.'},
    },
)
async def analyze(payload: AnalyzeRequest, db: Session = Depends(get_db)):
    """Genera y almacena un análisis de rotación para una parcela."""
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

@app.get(
    '/api/analyses/{analysis_id}',
    tags=['Analyses'],
    summary='Obtener un análisis',
    description='Recupera el resultado completo de un análisis previamente persistido.',
    response_description='Resultado del análisis solicitado.',
    responses={404: {'model': ErrorResponse, 'description': 'El análisis no existe.'}},
)
def get_analysis(analysis_id: int, db: Session = Depends(get_db)):
    """Obtiene un análisis persistido por identificador."""
    result = db.get(Analysis, analysis_id)
    if not result:
        raise HTTPException(404, 'Análisis no encontrado')
    return {'id': result.id, 'created_at': result.created_at, **result.result}
