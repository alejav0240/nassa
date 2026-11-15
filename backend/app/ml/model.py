"""Offline training and read-only retrospective inference for the fixed Viacha pilot."""
from datetime import date, timedelta
from hashlib import sha256
import json
import os
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from .pipeline import FEATURES, engineer, prepare

MODEL_ID = 'viacha-climate-isolation-forest'
MODEL_VERSION = '1.0.0'
PILOT = {'latitude': -16.57, 'longitude': -68.69}
START = date(2015, 1, 1)
TRAIN_END = date(2022, 12, 31)
END = date(2024, 12, 31)
DEFAULT_RAW = Path(__file__).resolve().parents[2] / 'data' / 'nasa_power_viacha_2015_2024.json'
DEFAULT_ARTIFACTS = Path(__file__).resolve().parents[2] / 'artifacts'


class ModelUnavailable(Exception):
    pass


def read_observations(raw_path: Path = DEFAULT_RAW) -> tuple[pd.DataFrame, dict, str]:
    if not raw_path.is_file():
        raise ModelUnavailable('Serie diaria NASA POWER no disponible localmente')
    raw = raw_path.read_bytes()
    def unique_pairs(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError(f'Clave NASA duplicada: {key}')
            result[key] = value
        return result
    payload = json.loads(raw, object_pairs_hook=unique_pairs)
    coordinates = payload.get('geometry', {}).get('coordinates', [])
    if len(coordinates) < 2 or abs(coordinates[0] - PILOT['longitude']) > 0.0001 or abs(coordinates[1] - PILOT['latitude']) > 0.0001:
        raise ValueError('La ubicación NASA no corresponde al piloto')
    header = payload.get('header', {})
    if header.get('start') != START.strftime('%Y%m%d') or header.get('end') != END.strftime('%Y%m%d'):
        raise ValueError('El período NASA no corresponde al piloto')
    frame, quality = prepare(payload, START, END)
    return engineer(frame), quality, sha256(raw).hexdigest()


def split(features: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    train = features.loc[:str(TRAIN_END), FEATURES]
    evaluation = features.loc[str(TRAIN_END + timedelta(days=1)):str(END), FEATURES]
    if len(train) < 3 * 365 or len(evaluation) < 365:
        raise ModelUnavailable('Cobertura insuficiente: se requieren al menos tres años de entrenamiento y uno de evaluación')
    return train, evaluation


def _make_model(seed: int):
    return make_pipeline(StandardScaler(), IsolationForest(n_estimators=200, contamination=0.05, random_state=seed, n_jobs=1))


def _records(evaluation: pd.DataFrame, scores: np.ndarray, threshold: float, training: pd.DataFrame) -> list[dict]:
    reference = training.groupby(training.index.month)[['rain_30d_mm', 'tmin_c', 'frost_7d']].median()
    records = []
    for (day, row), score in zip(evaluation.iterrows(), scores):
        if score > threshold:
            continue
        baseline = reference.loc[day.month]
        observations = {
            'rain_30d_mm': round(float(row.rain_30d_mm), 2),
            'tmin_c': round(float(row.tmin_c), 2),
            'frost_7d': int(row.frost_7d),
            'dry_spell_days': int(row.dry_spell_days),
        }
        comparisons = {
            'monthly_median_rain_30d_mm': round(float(baseline.rain_30d_mm), 2),
            'monthly_median_tmin_c': round(float(baseline.tmin_c), 2),
        }
        differences = []
        if row.rain_30d_mm < baseline.rain_30d_mm:
            differences.append('lluvia acumulada de 30 días inferior a la mediana histórica del mes')
        elif row.rain_30d_mm > baseline.rain_30d_mm:
            differences.append('lluvia acumulada de 30 días superior a la mediana histórica del mes')
        if row.tmin_c < baseline.tmin_c:
            differences.append('temperatura mínima inferior a la mediana histórica del mes')
        elif row.tmin_c > baseline.tmin_c:
            differences.append('temperatura mínima superior a la mediana histórica del mes')
        if row.frost_7d > baseline.frost_7d:
            differences.append('más días con mínima ≤ 0 °C en los últimos siete días que la mediana mensual')
        explanation = 'El modelo identificó esta combinación meteorológica como atípica.'
        if differences:
            explanation += ' Se observó ' + '; '.join(differences) + '.'
        records.append({'date': day.date().isoformat(), 'score': round(float(score), 6),
                        'observed': observations, 'reference': comparisons, 'explanation': explanation})
    return records


def train(raw_path: Path = DEFAULT_RAW, artifact_dir: Path = DEFAULT_ARTIFACTS) -> dict:
    features, quality, raw_hash = read_observations(raw_path)
    training, evaluation = split(features)
    model = _make_model(42)
    model.fit(training)
    train_scores = model.score_samples(training)
    eval_scores = model.score_samples(evaluation)
    threshold = float(np.quantile(train_scores, 0.05))
    flags = eval_scores <= threshold
    # Stability is an unlabeled agreement check, not predictive accuracy.
    base_dates = set(evaluation.index[flags])
    agreements = []
    for seed in (43, 44):
        alternate = _make_model(seed).fit(training)
        alt_threshold = float(np.quantile(alternate.score_samples(training), 0.05))
        alt_dates = set(evaluation.index[alternate.score_samples(evaluation) <= alt_threshold])
        agreements.append(round(len(base_dates & alt_dates) / len(base_dates | alt_dates), 3) if base_dates | alt_dates else 1.0)
    # Transparent statistical comparator: low monthly rain or low monthly temperature.
    monthly_q10 = training.groupby(training.index.month)[['rain_30d_mm', 'tmin_c']].quantile(0.1)
    statistical = np.array([
        row.rain_30d_mm < monthly_q10.loc[day.month].rain_30d_mm or row.tmin_c < monthly_q10.loc[day.month].tmin_c
        for day, row in evaluation.iterrows()
    ])
    anomaly_dates = _records(evaluation, eval_scores, threshold, training)
    report = {
        'model_id': MODEL_ID, 'version': MODEL_VERSION, 'algorithm': 'IsolationForest', 'seed': 42,
        'parameters': {'n_estimators': 200, 'contamination': 0.05, 'threshold': 'percentil 5 de score_samples en entrenamiento'},
        'features': FEATURES, 'source': quality['source'], 'source_sha256': raw_hash,
        'location': PILOT, 'reference_period': [training.index.min().date().isoformat(), training.index.max().date().isoformat()],
        'evaluation_period': [evaluation.index.min().date().isoformat(), evaluation.index.max().date().isoformat()],
        'observations': {'training': len(training), 'evaluation': len(evaluation)}, 'data_quality': quality,
        'score_semantics': 'score_samples de Isolation Forest: valores menores indican mayor rareza; no son probabilidades.',
        'threshold': round(threshold, 8),
        'evaluation': {
            'flagged_days': int(flags.sum()), 'flagged_pct': round(100 * flags.mean(), 2),
            'score_quantiles': {str(q): round(float(np.quantile(eval_scores, q)), 6) for q in (0, 0.05, 0.5, 0.95, 1)},
            'seed_jaccard': agreements, 'statistical_flagged_days': int(statistical.sum()),
            'overlap_with_statistical': int(np.logical_and(flags, statistical).sum()),
        },
        'anomalies': anomaly_dates,
        'limitations': [
            'Detección retrospectiva no supervisada; sin etiquetas verificadas de impacto agrícola.',
            'La coincidencia de variables no demuestra causalidad ni predice rendimientos o clima futuro.',
            'NASA POWER representa una cuadrícula climática; no mide directamente la parcela.',
            'La proporción de anomalías depende del umbral elegido y de la referencia histórica.',
        ],
    }
    artifact_dir.mkdir(parents=True, exist_ok=True)
    model_path = artifact_dir / 'climate_model.joblib'
    report_path = artifact_dir / 'climate_report.json'
    # Stage locally and replace atomically; never touch the original NASA file.
    temporary_path = artifact_dir / 'climate_model.joblib.tmp'
    report_temp = artifact_dir / 'climate_report.json.tmp'
    try:
        joblib.dump(model, temporary_path)
        report['model_sha256'] = sha256(temporary_path.read_bytes()).hexdigest()
        os.replace(temporary_path, model_path)
        with report_temp.open('w', encoding='utf-8') as temporary:
            json.dump(report, temporary, ensure_ascii=False, indent=2)
        os.replace(report_temp, report_path)
    finally:
        temporary_path.unlink(missing_ok=True)
        report_temp.unlink(missing_ok=True)
    return report


def infer(raw_path: Path = DEFAULT_RAW, artifact_dir: Path = DEFAULT_ARTIFACTS) -> dict:
    model_path = artifact_dir / 'climate_model.joblib'
    report_path = artifact_dir / 'climate_report.json'
    if not model_path.is_file() or not report_path.is_file():
        raise ModelUnavailable('Modelo local no entrenado; ejecutar python -m app.ml.train')
    report = json.loads(report_path.read_text(encoding='utf-8'))
    if report.get('model_id') != MODEL_ID or report.get('version') != MODEL_VERSION or report.get('features') != FEATURES:
        raise ModelUnavailable('Versión o esquema del modelo incompatible')
    if sha256(model_path.read_bytes()).hexdigest() != report.get('model_sha256'):
        raise ModelUnavailable('Integridad del artefacto no verificada')
    features, quality, raw_hash = read_observations(raw_path)
    if raw_hash != report.get('source_sha256'):
        raise ModelUnavailable('La serie NASA cambió; volver a entrenar y validar')
    # joblib uses pickle: only this locally generated, checksum-verified artifact is allowed.
    model = joblib.load(model_path)
    training, evaluation = split(features)
    scores = model.score_samples(evaluation)
    result = dict(report)
    result['anomalies'] = _records(evaluation, scores, report['threshold'], training)
    result['data_quality'] = quality
    result['availability'] = 'ready'
    return result
