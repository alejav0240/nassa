from copy import deepcopy
from datetime import date
import json

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.ml.model import ModelUnavailable, infer, split, train
from app.ml.pipeline import FEATURES, engineer, prepare


def sample_payload(days=40):
    dates = pd.date_range('2020-01-01', periods=days)
    params = {key: {} for key in ('T2M', 'T2M_MIN', 'T2M_MAX', 'PRECTOTCORR')}
    for day in dates:
        key = day.strftime('%Y%m%d')
        for parameter, value in [('T2M', 10), ('T2M_MIN', 1), ('T2M_MAX', 20), ('PRECTOTCORR', 2)]:
            params[parameter][key] = value
    return {'header': {'time_standard': 'LST', 'api': {'version': 'test'}},
            'parameters': {key: {'units': 'mm/day' if key == 'PRECTOTCORR' else 'C'} for key in params},
            'properties': {'parameter': params}}


def test_missing_invalid_and_units():
    payload = sample_payload()
    payload['properties']['parameter']['PRECTOTCORR']['20200110'] = -999
    frame, quality = prepare(payload, date(2020, 1, 1), date(2020, 2, 9))
    assert quality['missing_or_invalid_days'] == 1
    assert quality['missing_pct'] == 2.5
    assert pd.isna(frame.loc['2020-01-10', 'PRECTOTCORR'])
    assert engineer(frame).index.min() == pd.Timestamp('2020-02-09')
    payload['parameters']['T2M']['units'] = 'K'
    with pytest.raises(ValueError, match='Unidades'):
        prepare(payload, date(2020, 1, 1), date(2020, 2, 9))


def test_ordering_duplicate_and_future_leakage():
    frame, _ = prepare(sample_payload(), date(2020, 1, 1), date(2020, 2, 9))
    features = engineer(frame)
    assert features.loc['2020-01-30', 'rain_30d_mm'] == 60
    changed = frame.copy()
    changed.loc['2020-02-09', 'PRECTOTCORR'] = 1000
    assert engineer(changed).loc['2020-01-30', 'rain_30d_mm'] == 60
    with pytest.raises(ValueError, match='cronológicas'):
        engineer(frame.iloc[::-1])
    with pytest.raises(ValueError, match='únicas'):
        engineer(pd.concat([frame, frame.iloc[[-1]]]))


def test_insufficient_data_and_no_model(tmp_path):
    frame, _ = prepare(sample_payload(), date(2020, 1, 1), date(2020, 2, 9))
    with pytest.raises(ModelUnavailable, match='Cobertura insuficiente'):
        split(engineer(frame))
    with pytest.raises(ModelUnavailable, match='no entrenado'):
        infer(tmp_path / 'raw.json', tmp_path / 'artifacts')


def test_training_reproducible_and_inference(tmp_path):
    # Synthetic fixture checks pipeline mechanics only; it is not scientific evaluation.
    from app.ml.model import PILOT
    days = pd.date_range('2015-01-01', '2024-12-31')
    payload = sample_payload(1)
    params = {key: {} for key in payload['properties']['parameter']}
    for i, day in enumerate(days):
        key = day.strftime('%Y%m%d')
        params['PRECTOTCORR'][key] = float((i * 7) % 17)
        params['T2M_MIN'][key] = float(-3 + (i % 20))
        params['T2M'][key] = params['T2M_MIN'][key] + 7
        params['T2M_MAX'][key] = params['T2M'][key] + 6
    payload['properties']['parameter'] = params
    payload['geometry'] = {'coordinates': [PILOT['longitude'], PILOT['latitude']]}
    payload['header'].update({'start': '20150101', 'end': '20241231'})
    raw = tmp_path / 'raw.json'
    raw.write_text(json.dumps(payload))
    first = train(raw, tmp_path / 'artifacts')
    second = train(raw, tmp_path / 'artifacts')
    assert first['evaluation'] == second['evaluation']
    assert first['observations']['training'] > 2500
    assert infer(raw, tmp_path / 'artifacts')['availability'] == 'ready'
    raw.write_text('{}')
    with pytest.raises((ModelUnavailable, ValueError)):
        infer(raw, tmp_path / 'artifacts')


def test_endpoint_validation_unavailable_and_existing_api(monkeypatch):
    monkeypatch.setattr('app.main.infer', lambda: (_ for _ in ()).throw(ModelUnavailable('sin modelo')))
    with TestClient(app) as client:
        assert client.get('/api/ml/climate-anomalies').status_code == 503
        assert client.get('/api/ml/climate-anomalies?latitude=91').status_code == 422
        assert client.get('/api/ml/climate-anomalies?latitude=-15').status_code == 422
        assert client.get('/api/ml/climate-anomalies?start_date=2024-12-31&end_date=2023-01-01').status_code == 422
        assert client.get('/api/health').status_code == 200
        assert client.get('/api/crops').status_code == 200


def test_campaign_exposure_same_for_three_strategies(monkeypatch):
    monkeypatch.setattr('app.main.infer', lambda: {'anomalies': [
        {'date': '2023-10-02', 'score': -0.6}, {'date': '2024-01-01', 'score': -0.7}],
        'evaluation_period': ['2023-01-01', '2024-12-31']})
    with TestClient(app) as client:
        field = client.post('/api/fields', json={
            'name': 'Piloto', 'latitude': -16.57, 'longitude': -68.69,
            'hectares': 1, 'current_crop': 'papa',
        }).json()
        response = client.post(f"/api/fields/{field['id']}/campaigns", json={
            'crop': 'papa', 'start_date': '2023-10-01', 'end_date': '2023-10-31',
        })
        assert response.status_code == 201
        data = client.get(f"/api/ml/climate-anomalies?field_id={field['id']}").json()
        assert data['campaign_exposure'][0]['anomalous_days'] == 1
        assert len({str(value) for value in data['strategy_comparison'].values()}) == 1
        assert client.get('/api/ml/climate-anomalies?field_id=99999').status_code == 404
