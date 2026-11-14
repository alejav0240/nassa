from types import SimpleNamespace
from app.services.rotation import evaluate
from app.services.nasa import summarize_power

CLIMATE = {'annual_rainfall_mm': 480, 'annual_frost_days': 80}
FIELD = SimpleNamespace(id=1, current_crop='papa', irrigation=False, soil_texture='franca', soil_ph=6.5)

def test_three_rotations_include_baseline():
    result = evaluate(FIELD, CLIMATE, {'water': 40, 'soil': 40, 'income': 20})
    assert len(result['strategies']) == 3
    assert {s['id'] for s in result['strategies']} == {'actual', 'agua', 'suelo'}
    assert all(s['risks'] for s in result['strategies'])

def test_weighted_score_responds_to_priorities():
    water = evaluate(FIELD, CLIMATE, {'water': 100, 'soil': 0, 'income': 0})
    soil = evaluate(FIELD, CLIMATE, {'water': 0, 'soil': 100, 'income': 0})
    assert water['strategies'][0]['id'] == 'agua'
    assert soil['strategies'][0]['id'] == 'suelo'

def test_power_missing_values_and_annual_totals():
    payload = {'properties': {'parameter': {
        'PRECTOTCORR': {'20200101': 3, '20200102': -999, '20210101': 7},
        'T2M': {'20200101': 10, '20200102': 12, '20210101': 8},
        'T2M_MIN': {'20200101': -1, '20200102': 4, '20210101': -2},
        'T2M_MAX': {'20200101': 18, '20200102': 22, '20210101': 20},
    }}}
    try:
        summarize_power(payload, 2020, 2021)
        assert False, 'series incompletas deben ser rechazadas'
    except ValueError:
        pass
