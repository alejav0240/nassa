from fastapi.testclient import TestClient
from app.main import app


def test_health_and_field_roundtrip():
    with TestClient(app) as client:
        assert client.get('/api/health').status_code == 200
        created = client.post('/api/fields', json={
            'name':'Parcela de prueba', 'latitude':-16.65, 'longitude':-68.3,
            'hectares':1.2, 'current_crop':'papa'
        })
        assert created.status_code == 201
        field_id = created.json()['id']
        assert client.get(f'/api/fields/{field_id}').json()['name'] == 'Parcela de prueba'


def test_reject_invalid_priorities():
    with TestClient(app) as client:
        resp = client.post('/api/analyze', json={'field_id':1,'priorities':{'water':0,'soil':0,'income':0}})
        assert resp.status_code == 422
