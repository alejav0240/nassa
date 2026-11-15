"""Transparent educational heuristic, not validated crop-yield or agronomic advice."""
from .nasa import SOURCE_URL

CROPS = {
 'papa': {'label': 'Papa', 'water': 65, 'soil': 35, 'market': 75, 'min_rain': 350, 'max_frost': 140, 'family': 'solanaceae', 'notes': 'Cultivo con alta sensibilidad a manejo de heladas y enfermedades.'},
 'quinua': {'label': 'Quinua', 'water': 85, 'soil': 55, 'market': 65, 'min_rain': 200, 'max_frost': 200, 'family': 'amaranthaceae', 'notes': 'Adaptación variable por ecotipo; validar ciclo y salinidad.'},
 'haba': {'label': 'Haba', 'water': 55, 'soil': 90, 'market': 62, 'min_rain': 400, 'max_frost': 130, 'family': 'fabaceae', 'notes': 'Leguminosa; potencial de fijación de N condicionado por manejo e inoculación.'},
 'cebada': {'label': 'Cebada', 'water': 75, 'soil': 58, 'market': 60, 'min_rain': 250, 'max_frost': 175, 'family': 'poaceae', 'notes': 'Puede aportar cobertura; se debe evaluar competencia por agua.'},
 'avena': {'label': 'Avena', 'water': 60, 'soil': 75, 'market': 48, 'min_rain': 350, 'max_frost': 155, 'family': 'poaceae', 'notes': 'Posible cobertura o forraje según disponibilidad de agua.'},
 'tarwi': {'label': 'Tarwi', 'water': 70, 'soil': 95, 'market': 50, 'min_rain': 300, 'max_frost': 165, 'family': 'fabaceae', 'notes': 'Leguminosa andina; verificar mercado, variedades y manejo.'},
}

# Coefficients are openly declared demonstration assumptions, not calibrated measurements.
CROP_METADATA = {'provenance': 'Parámetros heurísticos ilustrativos del prototipo. Requieren calibración con fuentes agronómicas y expertos locales.', 'source': 'Equipo AgroShift AI'}


def recommend_crops(field, climate: dict, limit: int = 3) -> dict:
    """Rank crops using observed climate plus transparent prototype coefficients.

    This is an exploratory compatibility screen, not a yield forecast or an
    agronomic recommendation. Missing soil data is reported as uncertainty
    instead of being replaced by an assumed measurement.
    """
    rain = climate['annual_rainfall_mm']
    frost = climate['annual_frost_days']
    recommendations = []
    for crop_id, crop in CROPS.items():
        rainfall_score = min(100, round((rain / crop['min_rain']) * 100, 1)) if crop['min_rain'] else 0
        frost_score = min(100, round((crop['max_frost'] / max(frost, 1)) * 100, 1))
        climate_score = round((rainfall_score + frost_score) / 2, 1)
        soil_score = float(crop['soil'])
        market_score = float(crop['market'])
        score = round(climate_score * 0.55 + soil_score * 0.25 + market_score * 0.20, 1)
        reasons = []
        risks = []
        if rain >= crop['min_rain']:
            reasons.append(f"La precipitación histórica ({rain} mm/año) supera el umbral orientativo de {crop['min_rain']} mm.")
        else:
            risks.append(f"La precipitación histórica ({rain} mm/año) queda por debajo del umbral orientativo de {crop['min_rain']} mm.")
        if frost <= crop['max_frost']:
            reasons.append(f"Las heladas aproximadas ({frost} días/año) están dentro del límite ilustrativo de {crop['max_frost']} días.")
        else:
            risks.append(f"Las heladas aproximadas ({frost} días/año) superan el límite ilustrativo de {crop['max_frost']} días.")
        if field.irrigation:
            reasons.append('La parcela declara disponibilidad de riego, sujeta a validar caudal y calendario.')
        else:
            risks.append('No se declaró riego: validar la distribución mensual de lluvia y la humedad del suelo.')
        if field.soil_texture == 'desconocida' or field.soil_ph is None:
            risks.append('Faltan textura y/o pH medidos; la compatibilidad del suelo no está verificada.')
        else:
            reasons.append(f"Se incorporó el perfil declarado de suelo ({field.soil_texture}, pH {field.soil_ph}).")
        status = 'compatible' if score >= 70 and not risks else 'revisar' if score >= 50 else 'no_priorizar'
        recommendations.append({
            'id': crop_id,
            'label': crop['label'],
            'score': score,
            'status': status,
            'is_current': crop_id == field.current_crop,
            'reasons': reasons[:3],
            'risks': risks[:3],
            'criteria': {
                'climate': {'score': climate_score, 'label': 'Compatibilidad climática'},
                'rainfall': {'score': rainfall_score, 'observed_mm': rain, 'threshold_mm': crop['min_rain']},
                'frost': {'score': frost_score, 'observed_days': frost, 'threshold_days': crop['max_frost']},
                'soil': {'score': soil_score, 'label': 'Coeficiente heurístico de suelo'},
                'market': {'score': market_score, 'label': 'Coeficiente heurístico de mercado'},
            },
        })
    recommendations.sort(key=lambda item: item['score'], reverse=True)
    return {
        'field_id': field.id,
        'source': ['NASA POWER', 'Catálogo heurístico AgroShift AI'],
        'climate_years': climate['years'],
        'data_quality': climate.get('data_quality'),
        'recommendations': recommendations[:limit],
        'methodology': {
            'formula': '55% clima + 25% suelo heurístico + 20% mercado heurístico',
            'scope': 'Filtro exploratorio de compatibilidad; no predice rendimiento, ingresos ni éxito agronómico.',
            'limitations': [
                'Los coeficientes no están calibrados con ECOCROP ni validados localmente en esta versión.',
                'No se usa altitud porque todavía no es un dato persistido en la API de parcelas.',
                'La precipitación anual no sustituye balance hídrico mensual ni calendario fenológico.',
                'Validar semillas, plagas, manejo, mercado y recomendación con especialistas locales.',
            ],
        },
    }

def evaluate(field, climate: dict, priorities: dict) -> dict:
    existing = field.current_crop
    # Preserve current baseline; distinct conservative and soil-support scenarios.
    plans = [
        ('actual', 'Rotación actual (línea base)', [existing, existing, existing], 'Mantiene el cultivo reportado para mostrar la línea base; se desconoce la rotación histórica completa.'),
        ('agua', 'Diversificación orientada al agua', [existing, 'quinua' if existing != 'quinua' else 'cebada', 'cebada' if existing != 'cebada' else 'quinua'], 'Explora cultivos con mayor puntuación heurística de eficiencia hídrica.'),
        ('suelo', 'Diversificación orientada al suelo', [existing, 'tarwi' if existing != 'tarwi' else 'haba', 'avena' if existing != 'avena' else 'cebada'], 'Explora una leguminosa y cobertura potencial, sujetas a evaluación local.'),
    ]
    out = []
    rain = climate['annual_rainfall_mm']
    frost = climate['annual_frost_days']
    denominator = sum(priorities.values())
    for plan_id, title, crop_ids, explanation in plans:
        cs = [CROPS[crop_id] for crop_id in crop_ids]
        water = sum(c['water'] for c in cs) / len(cs)
        soil = sum(c['soil'] for c in cs) / len(cs)
        market = sum(c['market'] for c in cs) / len(cs)
        families = {c['family'] for c in cs}
        soil = min(100, soil + 5 * (len(families) - 1))
        score = round((water * priorities['water'] + soil * priorities['soil'] + market * priorities['income']) / denominator, 1)
        risks = []
        for crop_id in dict.fromkeys(crop_ids):
            crop = CROPS[crop_id]
            if rain < crop['min_rain']:
                risks.append(f"{crop['label']}: precipitación histórica anual ({rain} mm) por debajo del umbral orientativo ({crop['min_rain']} mm).")
            if frost > crop['max_frost']:
                risks.append(f"{crop['label']}: frecuencia aproximada de heladas ({frost} días/año) supera el umbral ilustrativo ({crop['max_frost']}).")
        if not field.irrigation:
            risks.append('No se declaró disponibilidad de riego: validar distribución estacional de lluvia y humedad del suelo.')
        if field.soil_texture == 'desconocida' or field.soil_ph is None:
            risks.append('Falta información completa del suelo: validar textura, pH, materia orgánica y análisis de laboratorio.')
        if plan_id == 'actual':
            risks.append('La rotación histórica completa no fue informada; la línea base repite el cultivo actual como supuesto.')
        if not risks:
            risks.append('Validar variedades locales, calendario agrícola, acceso a semillas, plagas y mercado.')
        out.append({'id': plan_id, 'title': title, 'crops': [{'id': c, 'label': CROPS[c]['label']} for c in crop_ids],
                    'score': score, 'scores': {'water': round(water, 1), 'soil': round(soil, 1), 'income': round(market, 1)},
                    'explanation': explanation, 'benefits': [f'Diversidad de familias botánicas: {len(families)}', 'Comparación transparente con los mismos pesos de prioridades'],
                    'risks': risks, 'flagged_for_review': len(risks) > 0})
    out.sort(key=lambda r: r['score'], reverse=True)
    return {
        'field_id': field.id, 'priorities': priorities, 'climate': climate, 'strategies': out,
        'methodology': {'method': 'Reglas y suma ponderada multicriterio; puntuaciones de demostración NO calibradas.',
                        'formula': '(agua*peso_agua + suelo*peso_suelo + mercado*peso_ingreso) / suma_pesos',
                        'nasa_source': SOURCE_URL, 'crop_coefficients': CROP_METADATA,
                        'scope': 'Exploración educativa. Los puntajes NO predicen rendimientos, ahorro, ingresos, fijación real de N ni viabilidad agronómica.',
                        'limitations': ['Línea base hipotética si no se conoce el historial de rotación.',
                                        'Umbrales anuales no sustituyen balance hídrico mensual ni fenología.',
                                        'No hay índices de vegetación ni medición de suelo satelital en esta versión.',
                                        'La compatibilidad necesita validación por especialistas locales.']},
    }
