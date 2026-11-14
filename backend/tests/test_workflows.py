from copy import deepcopy
from datetime import date, timedelta
import asyncio
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.services.nasa import summarize_power, fetch_power

FIELD = {'name': 'Parcela piloto', 'latitude': -16.65, 'longitude': -68.3, 'hectares': 2.4}

def power_payload(year=2024):
    parameters = {key: {} for key in ('T2M', 'T2M_MIN', 'T2M_MAX', 'PRECTOTCORR')}
    day = date(year, 1, 1)
    while day.year == year:
        for key, value in zip(parameters, (12, -1, 20, 2)):
            parameters[key][day.strftime('%Y%m%d')] = value
        day += timedelta(days=1)
    return {'properties': {'parameter': parameters}}

@pytest.fixture
def client():
    return TestClient(app)

@pytest.mark.parametrize('geometry', [
    {'type': 'Polygon', 'coordinates': [None]},
    {'type': 'Polygon', 'coordinates': [[None]*4]},
    {'type': 'Polygon', 'coordinates': [[[0,0],[1,1],[0,1],[1,0],[0,0]]]},
    {'type': 'Polygon', 'coordinates': [[[0,0],[1,1],[2,2],[0,0]]]},
    {'type': 'Point', 'coordinates': [0,0]},
])
def test_invalid_geometry_returns_422(client, geometry):
    assert client.post('/api/fields', json={**FIELD, 'geometry_geojson': geometry}).status_code == 422

def test_field_campaign_crud(client):
    row = client.post('/api/fields', json=FIELD).json()
    fid = row['id']
    payload = {'crop': 'papa', 'start_date': '2024-10-01', 'end_date': '2025-03-01'}
    response = client.post(f'/api/fields/{fid}/campaigns', json=payload)
    assert response.status_code == 201
    assert client.post(f'/api/fields/{fid}/campaigns', json=payload).status_code == 409
    assert len(client.get(f'/api/fields/{fid}/campaigns').json()) == 1
    assert client.put(f'/api/fields/{fid}', json={**FIELD, 'name': 'Actualizada'}).json()['name'] == 'Actualizada'
    assert client.delete(f'/api/fields/{fid}').status_code == 204
    assert client.get(f'/api/fields/{fid}').status_code == 404

def test_analysis_cache_plan_and_deletion(client, monkeypatch):
    climate = summarize_power(power_payload(), 2024, 2024)
    calls = []
    async def fake(*args):
        calls.append(args)
        return deepcopy(climate)
    monkeypatch.setattr('app.main.fetch_power', fake)
    fid = client.post('/api/fields', json=FIELD).json()['id']
    first = client.post('/api/analyze', json={'field_id': fid})
    assert first.status_code == 200, first.text
    analysis = first.json()
    assert client.post('/api/analyze', json={'field_id': fid}).status_code == 200
    assert len(calls) == 1
    assert len(client.get(f'/api/fields/{fid}/analyses').json()) == 2
    created = client.post('/api/plans', json={'analysis_id': analysis['id'], 'strategy_id': 'agua'})
    assert created.status_code == 201, created.text
    pid = created.json()['id']
    assert client.put(f'/api/plans/{pid}', json={'notes': 'Revisar', 'checklist': {'water': True}}).json()['checklist']['water']
    client.put(f'/api/fields/{fid}', json={**FIELD, 'name': 'Cambio'})
    assert client.get(f'/api/plans/{pid}').json()['snapshot']['field']['name'] == FIELD['name']
    assert len(client.get(f'/api/fields/{fid}/plans').json()) == 1
    assert client.delete(f'/api/fields/{fid}').status_code == 204
    assert client.get(f'/api/plans/{pid}').status_code == 404
    assert client.get(f"/api/analyses/{analysis['id']}").status_code == 404

def test_nasa_failure_not_saved(client, monkeypatch):
    async def unavailable(*args):
        raise HTTPException(503, 'NASA no disponible')
    monkeypatch.setattr('app.main.fetch_power', unavailable)
    fid = client.post('/api/fields', json=FIELD).json()['id']
    assert client.post('/api/analyze', json={'field_id': fid}).status_code == 503
    assert client.get(f'/api/fields/{fid}/analyses').json() == []

def test_climate_complete_year_and_missing_year():
    payload = power_payload()
    result = summarize_power(payload, 2023, 2024)
    assert result['annual_rainfall_mm'] == 732
    assert result['monthly'][1]['precipitation_mm'] == 58
    assert result['annual_frost_days'] == 366
    assert result['data_quality']['excluded_years'] == [2023]
    payload['properties']['parameter']['T2M_MIN']['20240101'] = -999
    with pytest.raises(ValueError):
        summarize_power(payload, 2024, 2024)

@pytest.mark.parametrize('value', [float('inf'), float('nan'), True, -999])
def test_bad_climate_values(value):
    payload = power_payload()
    payload['properties']['parameter']['T2M']['20240101'] = value
    with pytest.raises(ValueError):
        summarize_power(payload, 2024, 2024)

def test_api_key(client, monkeypatch):
    monkeypatch.setattr(settings, 'api_key', 'a' * 32)
    assert client.get('/api/health').status_code == 200
    assert client.get('/api/fields').status_code == 401
    assert client.get('/api/fields', headers={'X-API-Key': 'a' * 32}).status_code == 200

def test_invalid_fields_and_missing_resources(client):
    assert client.post('/api/fields', json={**FIELD, 'name': '   '}).status_code == 422
    assert client.post('/api/fields', json={**FIELD, 'latitude': 91}).status_code == 422
    assert client.get('/api/fields?limit=0').status_code == 422
    assert client.get('/api/plans/999').status_code == 404
    assert client.post('/api/plans', json={'analysis_id': 999, 'strategy_id': 'agua'}).status_code == 404

@pytest.mark.parametrize('status,body', [(429, {}), (500, {}), (200, {'bad': 'payload'})])
def test_nasa_http_failures(monkeypatch, status, body):
    import httpx
    original_client = httpx.AsyncClient
    transport = httpx.MockTransport(lambda request: httpx.Response(status, json=body))
    monkeypatch.setattr('app.services.nasa.httpx.AsyncClient', lambda **kwargs: original_client(transport=transport, **kwargs))
    with pytest.raises(HTTPException) as error:
        asyncio.run(fetch_power(-16.5, -68.5, 2024, 2024))
    assert error.value.status_code == 503

def test_nasa_request_parameters(monkeypatch):
    import httpx
    original_client = httpx.AsyncClient
    def handle(request):
        assert request.url.params['community'] == 'AG'
        assert request.url.params['start'] == '20240101'
        assert request.url.params['end'] == '20241231'
        assert request.url.params['parameters'] == 'T2M,T2M_MIN,T2M_MAX,PRECTOTCORR'
        return httpx.Response(200, json=power_payload())
    transport = httpx.MockTransport(handle)
    monkeypatch.setattr('app.services.nasa.httpx.AsyncClient', lambda **kwargs: original_client(transport=transport, **kwargs))
    assert asyncio.run(fetch_power(-16.5, -68.5, 2024, 2024))['annual_rainfall_mm'] == 732

def test_readiness_and_schema(client):
    assert client.get('/api/ready').status_code == 200
    assert client.get('/openapi.json').status_code == 200

def test_valid_polygon(client):
    geometry = {'type': 'Polygon', 'coordinates': [[[-68.3,-16.6],[-68.2,-16.6],[-68.2,-16.5],[-68.3,-16.6]]]}
    assert client.post('/api/fields', json={**FIELD, 'geometry_geojson': geometry}).status_code == 201

def test_concurrent_campaigns(client):
    from concurrent.futures import ThreadPoolExecutor
    fid = client.post('/api/fields', json=FIELD).json()['id']
    payload = {'crop': 'papa', 'start_date': '2024-10-01', 'end_date': '2025-03-01'}
    def create(_):
        return client.post(f'/api/fields/{fid}/campaigns', json=payload).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(create, range(2))) == [201, 409]

def test_cache_insertion_race_recovers(client, monkeypatch):
    from sqlalchemy.orm import Session
    from sqlalchemy.exc import IntegrityError
    from app.models import ClimateCache
    climate = summarize_power(power_payload(), 2024, 2024)
    async def fake(*args):
        return deepcopy(climate)
    monkeypatch.setattr('app.main.fetch_power', fake)
    fid = client.post('/api/fields', json=FIELD).json()['id']
    original_commit = Session.commit
    injected = []
    def commit(session):
        cache = next((obj for obj in session.new if isinstance(obj, ClimateCache)), None)
        if cache is not None and not injected:
            injected.append(True)
            data = {key: getattr(cache, key) for key in ('grid_lat', 'grid_lon', 'start_year', 'end_year', 'payload')}
            engine = session.get_bind()
            session.rollback()
            with Session(engine) as other:
                other.add(ClimateCache(**data))
                original_commit(other)
            raise IntegrityError('duplicate cache', {}, Exception('unique constraint'))
        return original_commit(session)
    monkeypatch.setattr(Session, 'commit', commit)
    response = client.post('/api/analyze', json={'field_id': fid})
    assert response.status_code == 200, response.text
    assert injected
