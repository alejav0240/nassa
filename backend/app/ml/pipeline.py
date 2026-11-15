"""Validated daily observations and causal features for retrospective anomaly detection."""
from datetime import date
from math import pi

import numpy as np
import pandas as pd

from app.services.nasa import PARAMETERS, SOURCE_URL

FEATURES = [
    'rain_7d_mm', 'rain_30d_mm', 'tmin_c', 'tmean_c', 'tmax_c',
    'frost_7d', 'dry_spell_days', 'season_sin', 'season_cos',
]
UNITS = {'PRECTOTCORR': 'mm/day', 'T2M_MIN': 'C', 'T2M': 'C', 'T2M_MAX': 'C'}
DRY_THRESHOLD_MM = 1.0


def prepare(payload: dict, start: date, end: date) -> tuple[pd.DataFrame, dict]:
    """Return chronological complete days; never alter or fill NASA observations."""
    if start > end:
        raise ValueError('Intervalo invertido')
    header = payload.get('header', {})
    parameters = payload.get('properties', {}).get('parameter', {})
    metadata = payload.get('parameters', {})
    if header.get('time_standard') != 'LST':
        raise ValueError('Se requiere tiempo local LST')
    if any(metadata.get(k, {}).get('units') != UNITS[k] for k in PARAMETERS):
        raise ValueError('Unidades NASA inesperadas')
    if any(not isinstance(parameters.get(k), dict) for k in PARAMETERS):
        raise ValueError('Faltan variables NASA')
    expected = pd.date_range(start, end, freq='D')
    frame = pd.DataFrame(index=expected)
    for key in PARAMETERS:
        series = parameters[key]
        if len(series) != len(set(series)):
            raise ValueError('Fechas duplicadas')
        values = {}
        for raw_day, value in series.items():
            try:
                day = pd.to_datetime(raw_day, format='%Y%m%d', errors='raise')
            except (ValueError, TypeError) as exc:
                raise ValueError('Fecha NASA inválida') from exc
            if day in values:
                raise ValueError('Fechas duplicadas')
            if start <= day.date() <= end:
                values[day] = value
        frame[key] = pd.to_numeric(pd.Series(values), errors='coerce').reindex(expected)
        frame.loc[~np.isfinite(frame[key]) | (frame[key] <= -900), key] = np.nan
    bad = (frame.PRECTOTCORR < 0) | (frame.T2M_MIN > frame.T2M) | (frame.T2M > frame.T2M_MAX)
    frame.loc[bad, list(PARAMETERS)] = np.nan
    missing_days = int(frame[list(PARAMETERS)].isna().any(axis=1).sum())
    quality = {
        'expected_days': len(frame), 'missing_or_invalid_days': missing_days,
        'missing_pct': round(100 * missing_days / len(frame), 3),
        'policy': 'Días inválidos excluidos; ventanas móviles requieren observaciones completas, sin imputación.',
        'source': SOURCE_URL, 'time_standard': 'LST', 'units': UNITS,
        'api_version': header.get('api', {}).get('version'),
    }
    return frame, quality


def engineer(frame: pd.DataFrame) -> pd.DataFrame:
    """Trailing windows include the evaluated day and no future observations."""
    if not frame.index.is_monotonic_increasing or not frame.index.is_unique:
        raise ValueError('Las fechas deben ser únicas y cronológicas')
    out = frame.copy()
    rain = out.PRECTOTCORR
    out['rain_7d_mm'] = rain.rolling(7, min_periods=7).sum()
    out['rain_30d_mm'] = rain.rolling(30, min_periods=30).sum()
    out['tmin_c'] = out.T2M_MIN
    out['tmean_c'] = out.T2M
    out['tmax_c'] = out.T2M_MAX
    out['frost_7d'] = out.T2M_MIN.le(0).where(out.T2M_MIN.notna()).rolling(7, min_periods=7).sum()
    streak = []
    length = 0
    for value in rain:
        if pd.isna(value):
            length = 0
            streak.append(np.nan)
        else:
            length = length + 1 if value < DRY_THRESHOLD_MM else 0
            streak.append(length)
    out['dry_spell_days'] = streak
    phase = 2 * pi * (out.index.dayofyear.to_numpy() - 1) / np.where(out.index.is_leap_year, 366, 365)
    out['season_sin'] = np.sin(phase)
    out['season_cos'] = np.cos(phase)
    return out.dropna(subset=FEATURES)
