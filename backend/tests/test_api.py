from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, text
from app.main import app


def test_health_and_field_roundtrip():
    with TestClient(app) as client:
        assert client.get('/api/health').status_code == 200
        health = client.get('/health')
        assert health.status_code == 200
        assert health.json() == {'status': 'ok', 'service': 'AgroShift AI', 'version': '0.2.0'}
        created = client.post('/api/fields', json={
            'name':'Parcela de prueba', 'latitude':-16.65, 'longitude':-68.3,
            'hectares':1.2, 'current_crop':'papa'
        })
        assert created.status_code == 201
        field_id = created.json()['id']
        assert client.get(f'/api/fields/{field_id}').json()['name'] == 'Parcela de prueba'


def test_field_create_is_idempotent_and_rejects_reference_reuse():
    payload = {
        'client_ref': 'local-parcel-123', 'name': 'Parcela idempotente',
        'latitude': -16.65, 'longitude': -68.3, 'hectares': 1.2,
        'current_crop': 'papa',
    }
    with TestClient(app) as client:
        first = client.post('/api/fields', json=payload)
        second = client.post('/api/fields', json=payload)
        assert first.status_code == second.status_code == 201
        assert first.json()['id'] == second.json()['id']

        changed = {**payload, 'name': 'Otra parcela'}
        assert client.post('/api/fields', json=changed).status_code == 409


def test_startup_adds_client_ref_to_existing_fields_table(tmp_path, monkeypatch):
    legacy_engine = create_engine(f'sqlite:///{tmp_path}/legacy.db')
    with legacy_engine.begin() as connection:
        connection.execute(text('''CREATE TABLE fields (
            id INTEGER PRIMARY KEY, name VARCHAR(120) NOT NULL, latitude FLOAT NOT NULL,
            longitude FLOAT NOT NULL, hectares FLOAT NOT NULL, soil_texture VARCHAR(30) NOT NULL,
            irrigation BOOLEAN NOT NULL, current_crop VARCHAR(50) NOT NULL, soil_ph FLOAT,
            geometry_geojson JSON, created_at DATETIME
        )'''))
        connection.execute(text("INSERT INTO fields (id,name,latitude,longitude,hectares,soil_texture,irrigation,current_crop) VALUES (1,'Legacy',-16.5,-68.5,1,'franca',0,'papa')"))
    monkeypatch.setattr('app.main.engine', legacy_engine)

    with TestClient(app):
        columns = {column['name'] for column in inspect(legacy_engine).get_columns('fields')}
        indexes = inspect(legacy_engine).get_indexes('fields')

    assert 'client_ref' in columns
    assert any(index['name'] == 'uq_fields_client_ref' and index['unique'] for index in indexes)
    with legacy_engine.connect() as connection:
        assert connection.execute(text('SELECT name FROM fields WHERE id=1')).scalar_one() == 'Legacy'
    legacy_engine.dispose()


def test_reject_invalid_priorities():
    with TestClient(app) as client:
        resp = client.post('/api/analyze', json={'field_id':1,'priorities':{'water':0,'soil':0,'income':0}})
        assert resp.status_code == 422
