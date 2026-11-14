from contextlib import asynccontextmanager
from copy import deepcopy
import secrets
from fastapi import FastAPI, Depends, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, delete, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from .config import settings
from .database import Base, engine, get_db
from .models import Field, ClimateCache, Analysis, Campaign, Plan
from .schemas import FieldCreate, FieldRead, AnalyzeRequest, CampaignCreate, CampaignRead, PlanCreate, PlanRead, PlanUpdate
from .schemas import CropsResponse, ErrorResponse, HealthResponse
from .services.nasa import fetch_power
from .services.climate_cache import get_climate
from .services.rotation import CROPS, CROP_METADATA, evaluate

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    from .models import PERFORMANCE_INDEXES
    for index in PERFORMANCE_INDEXES:
        index.create(bind=engine, checkfirst=True)
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
    version='0.2.0',
    openapi_tags=tags_metadata,
    contact={'name': 'AgroShift AI'},
    lifespan=lifespan,
)
app.add_middleware(CORSMiddleware, allow_origins=[x.strip() for x in settings.cors_origins.split(',')], allow_credentials=False, allow_methods=['GET', 'POST', 'PUT', 'DELETE'], allow_headers=['Content-Type', 'X-API-Key'])

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
    return {'status': 'ok', 'service': 'AgroShift AI', 'version': '0.2.0'}

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
def list_fields(limit: int = Query(100, ge=1, le=100), offset: int = Query(0, ge=0), db: Session = Depends(get_db)):
    return db.scalars(select(Field).order_by(Field.id.desc()).offset(offset).limit(limit)).all()

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
def analyze(payload: AnalyzeRequest, db: Session = Depends(get_db)):
    """Genera y almacena un análisis de rotación para una parcela."""
    field = db.get(Field, payload.field_id)
    if not field:
        raise HTTPException(404, 'Parcela no encontrada')
    # Coordinates rounded to the nearest NASA POWER approx. 0.5° grid cell for cache reuse.
    # This is a cache grouping approximation, NOT a claim of precise cell geolocation.
    grid_lat = round(field.latitude * 2) / 2
    grid_lon = round(field.longitude * 2) / 2
    # FastAPI executes this synchronous endpoint in a worker thread. Database
    # calls and climate summarization must not block the ASGI event loop.
    db.expunge(field)
    db.commit()
    climate = get_climate(db, grid_lat, grid_lon, settings.climate_start_year,
                          settings.climate_end_year, settings.nasa_timeout_seconds, fetch_power)
    result = evaluate(field, climate, payload.priorities.model_dump())
    campaigns = db.scalars(select(Campaign).where(Campaign.field_id == field.id).order_by(Campaign.start_date)).all()
    result['history'] = [CampaignRead.model_validate(c).model_dump(mode='json') for c in campaigns]
    result['field_snapshot'] = FieldRead.model_validate(field).model_dump(mode='json')
    result['history_note'] = 'Historial registrado como contexto; la línea base futura repite el cultivo actual, no reconstruye campañas pasadas.'
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


@app.middleware('http')
async def protect_api(request: Request, call_next):
    if settings.api_key and request.method != 'OPTIONS' and request.url.path != '/api/health':
        supplied = request.headers.get('X-API-Key', '')
        if not secrets.compare_digest(supplied.encode(), settings.api_key.encode()):
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=401, content={'detail': 'Credencial de API inválida'})
    return await call_next(request)

@app.get('/api/ready')
def ready(db: Session = Depends(get_db)):
    try:
        db.execute(text('SELECT 1'))
    except SQLAlchemyError as exc:
        raise HTTPException(503, 'Base de datos no disponible') from exc
    return {'status': 'ready'}

@app.put('/api/fields/{field_id}', response_model=FieldRead)
def update_field(field_id: int, payload: FieldCreate, db: Session = Depends(get_db)):
    field = get_field(field_id, db)
    for key, value in payload.model_dump().items():
        setattr(field, key, value)
    db.commit()
    db.refresh(field)
    return field

@app.delete('/api/fields/{field_id}', status_code=204)
def delete_field(field_id: int, db: Session = Depends(get_db)):
    field = get_field(field_id, db)
    db.execute(delete(Plan).where(Plan.field_id == field_id))
    db.execute(delete(Campaign).where(Campaign.field_id == field_id))
    # Bulk delete avoids loading every historical JSON analysis into memory.
    db.execute(delete(Analysis).where(Analysis.field_id == field_id))
    db.execute(delete(Field).where(Field.id == field_id))
    db.commit()
    return Response(status_code=204)

@app.get('/api/fields/{field_id}/campaigns', response_model=list[CampaignRead])
def list_campaigns(field_id: int, db: Session = Depends(get_db)):
    get_field(field_id, db)
    return db.scalars(select(Campaign).where(Campaign.field_id == field_id).order_by(Campaign.start_date)).all()

@app.post('/api/fields/{field_id}/campaigns', response_model=CampaignRead, status_code=201)
def create_campaign(field_id: int, payload: CampaignCreate, db: Session = Depends(get_db)):
    # SQLite lacks row locks; reserve the writer before the overlap check.
    if db.get_bind().dialect.name == 'sqlite':
        db.execute(text('BEGIN IMMEDIATE'))
    # Serialize writers per parcel on Postgres to prevent overlapping inserts.
    field = db.scalar(select(Field).where(Field.id == field_id).with_for_update())
    if field is None:
        raise HTTPException(404, 'Parcela no encontrada')
    overlap = db.scalar(select(Campaign).where(Campaign.field_id == field_id,
        Campaign.start_date <= payload.end_date, Campaign.end_date >= payload.start_date))
    if overlap:
        raise HTTPException(409, 'La campaña se superpone con otra registrada')
    row = Campaign(field_id=field_id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

@app.delete('/api/fields/{field_id}/campaigns/{campaign_id}', status_code=204)
def delete_campaign(field_id: int, campaign_id: int, db: Session = Depends(get_db)):
    row = db.get(Campaign, campaign_id)
    if row is None or row.field_id != field_id:
        raise HTTPException(404, 'Campaña no encontrada')
    db.delete(row)
    db.commit()
    return Response(status_code=204)

@app.get('/api/fields/{field_id}/analyses')
def list_analyses(field_id: int, limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0), db: Session = Depends(get_db)):
    get_field(field_id, db)
    rows = db.scalars(select(Analysis).where(Analysis.field_id == field_id).order_by(Analysis.id.desc()).offset(offset).limit(limit)).all()
    return [{'id': r.id, 'created_at': r.created_at, **r.result} for r in rows]

@app.post('/api/plans', response_model=PlanRead, status_code=201)
def create_plan(payload: PlanCreate, db: Session = Depends(get_db)):
    analysis = db.get(Analysis, payload.analysis_id)
    if analysis is None:
        raise HTTPException(404, 'Análisis no encontrado')
    strategy = next((s for s in analysis.result['strategies'] if s['id'] == payload.strategy_id), None)
    if strategy is None:
        raise HTTPException(422, 'Estrategia ausente del análisis')
    row = Plan(field_id=analysis.field_id, **payload.model_dump(), snapshot={
        'strategy': deepcopy(strategy), 'priorities': analysis.priorities,
        'field': analysis.result.get('field_snapshot'), 'methodology': analysis.result['methodology'],
        'climate': analysis.result['climate']}, checklist={})
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

@app.get('/api/fields/{field_id}/plans', response_model=list[PlanRead])
def list_plans(field_id: int, limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0), db: Session = Depends(get_db)):
    get_field(field_id, db)
    return db.scalars(select(Plan).where(Plan.field_id == field_id).order_by(Plan.id.desc()).offset(offset).limit(limit)).all()

@app.get('/api/plans/{plan_id}', response_model=PlanRead)
def get_plan(plan_id: int, db: Session = Depends(get_db)):
    row = db.get(Plan, plan_id)
    if row is None:
        raise HTTPException(404, 'Plan no encontrado')
    return row

@app.put('/api/plans/{plan_id}', response_model=PlanRead)
def update_plan(plan_id: int, payload: PlanUpdate, db: Session = Depends(get_db)):
    row = get_plan(plan_id, db)
    row.notes = payload.notes
    row.checklist = payload.checklist
    db.commit()
    db.refresh(row)
    return row

@app.delete('/api/plans/{plan_id}', status_code=204)
def delete_plan(plan_id: int, db: Session = Depends(get_db)):
    db.delete(get_plan(plan_id, db))
    db.commit()
    return Response(status_code=204)
