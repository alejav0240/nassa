"""Transparent educational heuristic, not validated crop-yield or agronomic advice."""
from .nasa import SOURCE_URL

CROPS = {
    'papa': {'label': 'Papa', 'scientific_name': 'Solanum tuberosum', 'region': 'Altiplano y valles', 'harvest_days': '90–180 días', 'products': 'Papa fresca, chuño, tunta, harina y almidón', 'risks': 'Tizón tardío, heladas, sequía y glicoalcaloides en tubérculos verdes.', 'water': 65, 'soil': 75, 'market': 75, 'min_rain': 350, 'max_rain': 800, 'min_temp': 10, 'max_temp': 20, 'ph_min': 5.0, 'ph_max': 6.5, 'soil_textures': {'franca', 'arenosa'}, 'max_frost': 140, 'family': 'solanaceae', 'notes': 'Suelo profundo y bien drenado; validar variedad y manejo de heladas.'},
    'quinua': {'label': 'Quinua', 'scientific_name': 'Chenopodium quinoa', 'region': 'Altiplano', 'harvest_days': '120–240 días', 'products': 'Grano, harina y productos procesados', 'risks': 'Saponinas; desaponificar antes del consumo. Validar salinidad y ecotipo.', 'water': 85, 'soil': 65, 'market': 65, 'min_rain': 200, 'max_rain': 600, 'min_temp': 8, 'max_temp': 20, 'ph_min': 5.5, 'ph_max': 8.0, 'soil_textures': {'franca', 'arenosa', 'arcillosa'}, 'max_frost': 200, 'family': 'amaranthaceae', 'notes': 'Adaptación variable por ecotipo y tolerancia a sequía.'},
    'canahua': {'label': 'Cañahua', 'scientific_name': 'Chenopodium pallidicaule', 'region': 'Altiplano', 'harvest_days': '110–180 días', 'products': 'Grano, harina y bebidas', 'risks': 'Heladas intensas, sequía extrema y pérdida de calidad por mala poscosecha.', 'water': 90, 'soil': 60, 'market': 45, 'min_rain': 200, 'max_rain': 500, 'min_temp': 8, 'max_temp': 18, 'ph_min': 5.5, 'ph_max': 8.0, 'soil_textures': {'franca', 'arenosa'}, 'max_frost': 220, 'family': 'amaranthaceae', 'notes': 'Cultivo andino rústico; verificar disponibilidad de semilla local.'},
    'cebada': {'label': 'Cebada', 'scientific_name': 'Hordeum vulgare', 'region': 'Altiplano y valles', 'harvest_days': '100–180 días', 'products': 'Grano, malta, harina y forraje', 'risks': 'Roya, sequía, granos contaminados y micotoxinas por mala poscosecha.', 'water': 75, 'soil': 70, 'market': 60, 'min_rain': 250, 'max_rain': 600, 'min_temp': 8, 'max_temp': 20, 'ph_min': 6.0, 'ph_max': 8.0, 'soil_textures': {'franca', 'arenosa', 'arcillosa'}, 'max_frost': 175, 'family': 'poaceae', 'notes': 'Puede aportar cobertura; evaluar competencia por agua.'},
    'avena': {'label': 'Avena', 'scientific_name': 'Avena sativa', 'region': 'Altiplano y valles', 'harvest_days': '90–180 días', 'products': 'Grano, harina y forraje', 'risks': 'Roya, sequía y micotoxinas por mala poscosecha.', 'water': 60, 'soil': 75, 'market': 48, 'min_rain': 350, 'max_rain': 700, 'min_temp': 8, 'max_temp': 20, 'ph_min': 5.5, 'ph_max': 7.5, 'soil_textures': {'franca', 'arenosa'}, 'max_frost': 155, 'family': 'poaceae', 'notes': 'Posible cobertura o forraje según disponibilidad de agua.'},
    'haba': {'label': 'Haba', 'scientific_name': 'Vicia faba', 'region': 'Altiplano y valles', 'harvest_days': '120–210 días', 'products': 'Haba fresca, seca y harina', 'risks': 'Ascochyta, heladas y favismo en personas susceptibles a G6PD.', 'water': 55, 'soil': 85, 'market': 62, 'min_rain': 400, 'max_rain': 800, 'min_temp': 8, 'max_temp': 20, 'ph_min': 6.0, 'ph_max': 7.5, 'soil_textures': {'franca', 'arcillosa'}, 'max_frost': 130, 'family': 'fabaceae', 'notes': 'Leguminosa; fijación de N condicionada por manejo e inoculación.'},
    'oca': {'label': 'Oca', 'scientific_name': 'Oxalis tuberosa', 'region': 'Altiplano y valles altos', 'harvest_days': '180–270 días', 'products': 'Oca fresca, deshidratada y mermeladas', 'risks': 'Heladas, pudriciones y oxalatos según variedad y preparación.', 'water': 60, 'soil': 72, 'market': 48, 'min_rain': 350, 'max_rain': 700, 'min_temp': 8, 'max_temp': 18, 'ph_min': 5.0, 'ph_max': 7.0, 'soil_textures': {'franca', 'arenosa'}, 'max_frost': 170, 'family': 'oxalidaceae', 'notes': 'Requiere ciclo largo; validar calendario y manejo de tubérculos.'},
    'tarwi': {'label': 'Tarwi', 'scientific_name': 'Lupinus mutabilis', 'region': 'Altiplano y valles', 'harvest_days': '150–330 días', 'products': 'Grano, harina y bebidas', 'risks': 'Alcaloides tóxicos; desamargado alimentario validado y alergias a lupino.', 'water': 70, 'soil': 90, 'market': 50, 'min_rain': 300, 'max_rain': 700, 'min_temp': 8, 'max_temp': 20, 'ph_min': 5.0, 'ph_max': 7.5, 'soil_textures': {'franca', 'arenosa'}, 'max_frost': 165, 'family': 'fabaceae', 'notes': 'Leguminosa andina; verificar mercado y variedad.'},
    'maiz': {'label': 'Maíz', 'scientific_name': 'Zea mays', 'region': 'Valles, Chaco y llanos', 'harvest_days': '90–180 días', 'products': 'Grano, choclo, harina y forraje', 'risks': 'Sequía, heladas, pudriciones y micotoxinas por mala poscosecha.', 'water': 45, 'soil': 70, 'market': 78, 'min_rain': 500, 'max_rain': 1000, 'min_temp': 18, 'max_temp': 30, 'ph_min': 5.5, 'ph_max': 7.5, 'soil_textures': {'franca', 'arcillosa'}, 'max_frost': 20, 'family': 'poaceae', 'notes': 'Requiere ambiente cálido y suficiente agua durante floración.'},
    'trigo': {'label': 'Trigo', 'scientific_name': 'Triticum aestivum', 'region': 'Valles y llanos', 'harvest_days': '110–180 días', 'products': 'Harina, grano y forraje', 'risks': 'Roya, sequía y micotoxinas por almacenamiento deficiente.', 'water': 60, 'soil': 70, 'market': 70, 'min_rain': 350, 'max_rain': 700, 'min_temp': 12, 'max_temp': 23, 'ph_min': 6.0, 'ph_max': 7.5, 'soil_textures': {'franca', 'arcillosa'}, 'max_frost': 90, 'family': 'poaceae', 'notes': 'Validar variedad, fecha de siembra y riesgo de roya.'},
    'arveja': {'label': 'Arveja', 'scientific_name': 'Pisum sativum', 'region': 'Valles y zonas altas', 'harvest_days': '60–150 días', 'products': 'Vaina fresca, grano seco y harina', 'risks': 'Oídio, heladas en floración y exceso de humedad.', 'water': 55, 'soil': 78, 'market': 68, 'min_rain': 300, 'max_rain': 700, 'min_temp': 8, 'max_temp': 20, 'ph_min': 6.0, 'ph_max': 7.5, 'soil_textures': {'franca', 'arenosa'}, 'max_frost': 100, 'family': 'fabaceae', 'notes': 'Ciclo corto; requiere buen drenaje y manejo de enfermedades.'},
    'arroz': {'label': 'Arroz', 'scientific_name': 'Oryza sativa', 'region': 'Llanos tropicales', 'harvest_days': '80–150 días', 'products': 'Grano, harina y subproductos', 'risks': 'Manejo de agua, enfermedades, micotoxinas y contaminación poscosecha.', 'water': 95, 'soil': 55, 'market': 82, 'min_rain': 1000, 'max_rain': 2000, 'min_temp': 20, 'max_temp': 30, 'ph_min': 5.0, 'ph_max': 7.0, 'soil_textures': {'arcillosa', 'franca'}, 'max_frost': 0, 'family': 'poaceae', 'notes': 'No priorizar sin agua controlada y ambiente cálido.'},
    'soya': {'label': 'Soya', 'scientific_name': 'Glycine max', 'region': 'Llanos', 'harvest_days': '100–160 días', 'products': 'Grano, aceite, harina y alimentos procesados', 'risks': 'Plagas, sequía, alergias y micotoxinas por mala poscosecha.', 'water': 75, 'soil': 72, 'market': 80, 'min_rain': 600, 'max_rain': 1200, 'min_temp': 20, 'max_temp': 30, 'ph_min': 5.5, 'ph_max': 7.5, 'soil_textures': {'franca', 'arcillosa'}, 'max_frost': 5, 'family': 'fabaceae', 'notes': 'Requiere ambiente cálido, drenaje y manejo de inoculación.'},
}

# Coefficients are openly declared demonstration assumptions, not calibrated measurements.
CROP_METADATA = {'provenance': 'Fichas orientativas y parámetros heurísticos del prototipo. Requieren calibración por variedad, localidad y expertos locales.', 'source': 'AgroShift AI; referencias de orientación FAO/CIP declaradas por el producto'}


def _range_score(value: float, minimum: float, maximum: float) -> float:
    if minimum <= value <= maximum:
        return 100.0
    distance = minimum - value if value < minimum else value - maximum
    width = max(maximum - minimum, 1)
    return round(max(0, 100 - (distance / width) * 100), 1)


def _soil_fit(field, crop: dict) -> tuple[float, list[str], list[str]]:
    reasons: list[str] = []
    risks: list[str] = []
    texture = field.soil_texture
    ph = field.soil_ph
    texture_score = 60.0
    ph_score = 60.0
    if texture == 'desconocida':
        risks.append('Falta textura de suelo medida; la compatibilidad física queda pendiente.')
    elif texture in crop['soil_textures']:
        texture_score = 100.0
        reasons.append(f"La textura declarada ({texture}) coincide con el perfil orientativo.")
    else:
        texture_score = 25.0
        risks.append(f"La textura declarada ({texture}) no es la preferida para {crop['label']}.")
    if ph is None:
        risks.append('Falta pH medido; validar acidez antes de decidir la siembra.')
    else:
        ph_score = _range_score(ph, crop['ph_min'], crop['ph_max'])
        if crop['ph_min'] <= ph <= crop['ph_max']:
            reasons.append(f"El pH declarado ({ph}) está dentro del rango orientativo {crop['ph_min']}–{crop['ph_max']}.")
        else:
            risks.append(f"El pH declarado ({ph}) queda fuera del rango orientativo {crop['ph_min']}–{crop['ph_max']}.")
    return round((texture_score + ph_score) / 2, 1), reasons, risks


def recommend_crops(field, climate: dict, limit: int = 3) -> dict:
    """Rank crops using observed climate and declared parcel properties.

    This is an exploratory compatibility screen, not a yield forecast or an
    agronomic recommendation. Missing soil data is reported as uncertainty
    instead of being replaced by an assumed measurement.
    """
    rain = climate['annual_rainfall_mm']
    frost = climate['annual_frost_days']
    mean_temp = climate['mean_temperature_c']
    recommendations = []
    for crop_id, crop in CROPS.items():
        rainfall_score = _range_score(rain, crop['min_rain'], crop['max_rain'])
        temperature_score = _range_score(mean_temp, crop['min_temp'], crop['max_temp'])
        frost_score = min(100, round((crop['max_frost'] / max(frost, 1)) * 100, 1)) if crop['max_frost'] else (100.0 if frost <= 1 else 0.0)
        climate_score = round((rainfall_score + temperature_score + frost_score) / 3, 1)
        soil_score, soil_reasons, soil_risks = _soil_fit(field, crop)
        market_score = float(crop['market'])
        score = round(climate_score * 0.55 + soil_score * 0.25 + market_score * 0.20, 1)
        reasons = list(soil_reasons)
        risks = list(soil_risks)
        if rainfall_score >= 75:
            reasons.append(f"La precipitación histórica ({rain} mm/año) está cerca del rango orientativo {crop['min_rain']}–{crop['max_rain']} mm.")
        else:
            risks.append(f"La precipitación histórica ({rain} mm/año) se aleja del rango orientativo {crop['min_rain']}–{crop['max_rain']} mm.")
        if temperature_score >= 75:
            reasons.append(f"La temperatura media histórica ({mean_temp} °C) es compatible con el rango orientativo {crop['min_temp']}–{crop['max_temp']} °C.")
        else:
            risks.append(f"La temperatura media histórica ({mean_temp} °C) se aleja del rango orientativo {crop['min_temp']}–{crop['max_temp']} °C.")
        if frost <= crop['max_frost']:
            reasons.append(f"Las heladas aproximadas ({frost} días/año) están dentro del límite ilustrativo de {crop['max_frost']} días.")
        else:
            risks.append(f"Las heladas aproximadas ({frost} días/año) superan el límite ilustrativo de {crop['max_frost']} días.")
        if field.irrigation:
            reasons.append('La parcela declara disponibilidad de riego, sujeta a validar caudal y calendario.')
        else:
            risks.append('No se declaró riego: validar la distribución mensual de lluvia y la humedad del suelo.')
        status = 'compatible' if score >= 70 and not risks else 'revisar' if score >= 50 else 'no_priorizar'
        recommendations.append({
            'id': crop_id,
            'label': crop['label'],
            'score': score,
            'status': status,
            'is_current': crop_id == field.current_crop,
            'region': crop['region'],
            'harvest_days': crop['harvest_days'],
            'products': crop['products'],
            'food_safety_risks': crop['risks'],
            'notes': crop['notes'],
            'reasons': reasons[:3],
            'risks': risks[:3],
            'criteria': {
                'climate': {'score': climate_score, 'label': 'Compatibilidad climática'},
                'rainfall': {'score': rainfall_score, 'observed_mm': rain, 'minimum_mm': crop['min_rain'], 'maximum_mm': crop['max_rain']},
                'temperature': {'score': temperature_score, 'observed_c': mean_temp, 'minimum_c': crop['min_temp'], 'maximum_c': crop['max_temp']},
                'frost': {'score': frost_score, 'observed_days': frost, 'threshold_days': crop['max_frost']},
                'soil': {'score': soil_score, 'texture': field.soil_texture, 'ph': field.soil_ph, 'ph_min': crop['ph_min'], 'ph_max': crop['ph_max'], 'label': 'Textura y pH declarados'},
                'market': {'score': market_score, 'label': 'Coeficiente heurístico de mercado'},
            },
        })
    recommendations.sort(key=lambda item: item['score'], reverse=True)
    return {
        'field_id': field.id,
        'source': ['NASA POWER', 'Perfil de suelo declarado', 'Catálogo heurístico AgroShift AI'],
        'climate_years': climate['years'],
        'data_quality': climate.get('data_quality'),
        'recommendations': recommendations[:limit],
        'methodology': {
            'formula': '55% clima (lluvia, temperatura y heladas) + 25% textura/pH + 20% mercado heurístico',
            'scope': 'Filtro exploratorio de compatibilidad; no predice rendimiento, ingresos ni éxito agronómico.',
            'limitations': [
                'Los umbrales y coeficientes son orientativos; no están calibrados por variedad ni validados localmente en esta versión.',
                'La textura y el pH provienen del registro de la parcela, no sustituyen un análisis de laboratorio.',
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
