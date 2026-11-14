"""NASA POWER daily point adapter. Never replaces NASA observations with synthetic data."""
from collections import defaultdict
from datetime import date, timedelta
from math import isfinite
from statistics import mean
import httpx
from fastapi import HTTPException

BASE_URL = 'https://power.larc.nasa.gov/api/temporal/daily/point'
PARAMETERS = ('T2M', 'T2M_MIN', 'T2M_MAX', 'PRECTOTCORR')
SOURCE_URL = 'https://power.larc.nasa.gov/docs/services/api/temporal/daily/'

def valid(value):
    return type(value) in (int, float) and isfinite(value) and value > -900

def summarize_power(payload: dict, start_year: int, end_year: int) -> dict:
    if not 1981 <= start_year <= end_year <= 9998:
        raise ValueError('Período climático inválido')
    try:
        params = payload['properties']['parameter']
        precipitation = params['PRECTOTCORR']
        avg_temp = params['T2M']
        min_temp = params['T2M_MIN']
        max_temp = params['T2M_MAX']
    except (KeyError, TypeError) as exc:
        raise ValueError('La respuesta NASA no contiene las variables esperadas') from exc
    if not all(isinstance(params.get(key), dict) for key in PARAMETERS):
        raise ValueError('Variables NASA inválidas')
    monthly = defaultdict(lambda: {'precipitation_mm': [], 'temp_c': [], 'frost_days': 0, 'heat_days': 0})
    yearly = defaultdict(list)
    complete_years = []
    excluded_years = []
    # Incomplete annual sums underestimate rainfall and can mislead rotation selection.
    for year in range(start_year, end_year + 1):
        current = date(year, 1, 1)
        days = []
        while current.year == year:
            days.append(current.strftime('%Y%m%d'))
            current += timedelta(days=1)
        if not all(all(valid(params[key].get(day)) for key in PARAMETERS)
                   and precipitation[day] >= 0
                   and min_temp[day] <= avg_temp[day] <= max_temp[day] for day in days):
            excluded_years.append(year)
            continue
        complete_years.append(year)
        for day in days:
            month = int(day[4:6])
            monthly[month]['precipitation_mm'].append(float(precipitation[day]))
            yearly[year].append(float(precipitation[day]))
            monthly[month]['temp_c'].append(float(avg_temp[day]))
            monthly[month]['frost_days'] += int(min_temp[day] < 0)
            monthly[month]['heat_days'] += int(max_temp[day] >= 30)
    if not complete_years:
        raise ValueError('NASA devolvió una serie insuficiente: no hay años completos para las cuatro variables')
    monthly_out = []
    for month in range(1, 13):
        values = monthly[month]
        n_years = len(complete_years)
        monthly_out.append({
            'month': month,
            'precipitation_mm': round(sum(values['precipitation_mm']) / n_years, 1) if values['precipitation_mm'] else None,
            'temperature_c': round(mean(values['temp_c']), 1) if values['temp_c'] else None,
            'frost_days_per_year': round(values['frost_days'] / n_years, 1),
            'heat_days_per_year': round(values['heat_days'] / n_years, 1),
        })
    annual_rain = {int(k): round(sum(v), 1) for k, v in yearly.items() if v}
    if not annual_rain or not any(m['temperature_c'] is not None for m in monthly_out):
        raise ValueError('NASA devolvió una serie insuficiente para evaluar la parcela')
    rain_values = list(annual_rain.values())
    annual_rain_mean = mean(rain_values)
    return {
        'source': 'NASA POWER', 'source_url': SOURCE_URL, 'data_type': 'historical_gridded_estimate', 'summary_version': 2,
        'data_quality': {'complete_years': complete_years, 'excluded_years': excluded_years,
                         'policy': 'Solo años completos en las cuatro variables; sin imputación'},
        'years': [start_year, end_year], 'annual_rainfall_mm': round(annual_rain_mean, 1),
        'annual_rainfall_by_year': annual_rain,
        'rainfall_variability_pct': round(100 * (max(rain_values)-min(rain_values))/annual_rain_mean, 1) if annual_rain_mean else None,
        'annual_frost_days': round(sum(m['frost_days'] for m in monthly.values()) / len(complete_years), 1),
        'mean_temperature_c': round(mean(t for m in monthly.values() for t in m['temp_c']), 1),
        'monthly': monthly_out,
        'limitations': ['POWER ofrece datos de una cuadrícula climática, no mediciones en la parcela.',
                        'Días con TMIN menor a 0°C son un indicador aproximado de helada meteorológica.',
                        'No se estiman rendimientos, humedad real del suelo ni ingresos agrícolas.'] +
                        ([f'Años excluidos por datos incompletos: {excluded_years}'] if excluded_years else []),
    }

async def fetch_power(latitude: float, longitude: float, start_year: int, end_year: int, timeout: float = 75) -> dict:
    args = {
        'parameters': ','.join(PARAMETERS), 'community': 'AG', 'latitude': latitude,
        'longitude': longitude, 'start': f'{start_year}0101', 'end': f'{end_year}1231',
        'format': 'JSON', 'time-standard': 'LST',
    }
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            response = await client.get(BASE_URL, params=args)
            response.raise_for_status()
            return summarize_power(response.json(), start_year, end_year)
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(status_code=503, detail=f'NASA POWER no disponible o con respuesta inválida: {str(exc)[:240]}') from exc
