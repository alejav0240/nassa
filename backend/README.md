# Backend AgroShift AI

API FastAPI compatible con el frontend existente. Python 3.12+; SQLite para desarrollo y PostgreSQL para el despliegue de Compose.

## Ejecutar

Desde `backend/`:

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Documentación interactiva: http://localhost:8000/docs. Pruebas: `python -m pytest -q` desde `backend/`. Las pruebas usan bases temporales, sin tocar datos de usuario ni consultar NASA.

## Configuración

- `DATABASE_URL`: por defecto `sqlite:///./agroshift.db`.
- `CORS_ORIGINS`: orígenes separados por coma; por defecto `http://localhost:3000`.
- `CLIMATE_START_YEAR`, `CLIMATE_END_YEAR`: 2020 y 2024; años completos desde 1981, máximo 21 años.
- `NASA_TIMEOUT_SECONDS`: 75, máximo 180 segundos.
- `API_KEY`: opcional, al menos 24 caracteres. Al configurarla se exige `X-API-Key` en todas las rutas salvo salud y preflight. Es una credencial de equipo, NO autenticación multiusuario. En Compose, Nginx la inyecta desde el servidor al proxy `/api`; nunca se expone al navegador.

No hay aislamiento entre agricultores/cuentas. Mantener el MVP en un entorno privado hasta implementar identidad, cuotas y controles de despliegue. Las escrituras locales no autentican usuarios si `API_KEY` está vacía/no definida.

## Endpoints

| Método | Ruta | Función |
|---|---|---|
| GET | `/api/health` | Vida del proceso |
| GET | `/api/ready` | Conexión a base de datos |
| GET | `/api/crops` | Catálogo y procedencia de coeficientes |
| GET, POST | `/api/fields` | Listar/crear parcelas |
| GET, PUT, DELETE | `/api/fields/{id}` | Consultar/reemplazar/eliminar parcela |
| GET, POST | `/api/fields/{id}/campaigns` | Historial agrícola |
| DELETE | `/api/fields/{id}/campaigns/{campaign_id}` | Quitar campaña |
| POST | `/api/analyze` | Consultar clima y comparar estrategias |
| POST | `/api/recommendations` | Ordenar cultivos por compatibilidad climática y datos declarados |
| GET | `/api/data-sources` | Registro de fuentes oficiales y estado de integración |
| GET | `/api/data-sources/{source_id}/probe` | Verificación puntual de acceso a una fuente |
| GET | `/api/analyses/{id}` | Recuperar análisis histórico |
| GET | `/api/fields/{id}/analyses` | Análisis de parcela |
| POST | `/api/plans` | Guardar estrategia de un análisis |
| GET, PUT, DELETE | `/api/plans/{id}` | Consultar/reemplazar notas y checklist/eliminar plan |
| GET | `/api/fields/{id}/plans` | Planes de una parcela |

Listas de parcelas, análisis y planes admiten `limit` (1–100) y `offset`. PUT reemplaza el recurso editable completo; no es PATCH. Las campañas usan fechas inclusivas: dos campañas no pueden compartir un día. El modelo representa un cultivo a la vez; no soporta asociaciones simultáneas.

Crear campaña:

```json
{"crop":"papa","start_date":"2024-10-01","end_date":"2025-03-01","notes":"Campaña registrada por el agricultor"}
```

Guardar plan:

```json
{"analysis_id":1,"strategy_id":"agua","notes":"Revisar disponibilidad de semillas"}
```

Actualizar notas/checklist:

```json
{"notes":"Consultar con asesor local","checklist":{"soil":false,"water":true,"seeds":false,"expert_review":false}}
```

Claves de estrategias: `actual`, `agua`, `suelo`. Los planes preservan una instantánea de la estrategia, parcela, prioridades, metodología y clima. Editar la parcela no reescribe decisiones anteriores. Eliminar una parcela elimina sus campañas, análisis y planes en la misma transacción.

## Modelo local de anomalías climáticas (piloto Viacha)

Para reproducir el piloto en otra computadora, incluida la verificación de la descarga NASA y la lista de archivos que deben compartirse, consulte [ML_ENTREGA.md](ML_ENTREGA.md).

El módulo `app/ml/` es independiente del motor heurístico de rotaciones. Usa `IsolationForest` de scikit-learn para identificar combinaciones meteorológicas retrospectivas atípicas. No predice rendimientos, sequías futuras, enfermedades ni pérdidas, y su puntuación no es una probabilidad.

La serie piloto procede de [NASA POWER Daily Point](https://power.larc.nasa.gov/docs/services/api/temporal/daily/), comunidad `AG`, horario `LST`, latitud `-16.57`, longitud `-68.69`, intervalo completo `2015-01-01` a `2024-12-31`. La consulta devolvió 3653 días con `PRECTOTCORR` (mm/día), `T2M_MIN`, `T2M` y `T2M_MAX` (°C), versión API `v2.10.3`; no hubo días faltantes o inválidos en esta descarga. SHA-256 del JSON original: `ace01267682e4b253a2b5a6a5a2b20d7c35584caeecaf46eca4ae4c393274d9b`. El archivo original y los artefactos se mantienen en directorios locales ignorados por Git; no se editan los valores de NASA.

Desde PowerShell, dentro de `backend/`:

```powershell
New-Item -ItemType Directory -Force data,artifacts | Out-Null
$url = 'https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,T2M_MIN,T2M_MAX,PRECTOTCORR&community=AG&latitude=-16.57&longitude=-68.69&start=20150101&end=20241231&format=JSON&time-standard=LST'
Invoke-WebRequest -Uri $url -OutFile data/nasa_power_viacha_2015_2024.json -TimeoutSec 180
Get-FileHash data/nasa_power_viacha_2015_2024.json -Algorithm SHA256
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m app.ml.train
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

El SHA-256 del archivo completo puede cambiar entre descargas por el campo de tiempo de procesamiento `times.data`. Antes de esperar exactamente 54 anomalías, ejecute `python -m app.ml.verify_source`: valida los metadatos y compara la huella SHA-256 de las observaciones con la serie evaluada. Si esa huella cambia, vuelva a validar cobertura, calidad y resultados antes de compartir cifras. El entrenamiento genera `artifacts/climate_model.joblib` y `artifacts/climate_report.json` localmente; ambos, junto con el JSON NASA, están excluidos de Git. Para ver el panel ML, ejecute `npm.cmd install` (si faltan dependencias) y `npm.cmd run dev` desde `frontent/`, y abra `http://127.0.0.1:3000`. `compose.yaml` sirve otro frontend (`frontend--resp/`); su imagen API tampoco copia los datos ni artefactos locales, por lo que no reproduce este panel ML sin configuración adicional de volúmenes.

El pipeline valida unidades, fechas, valores de relleno (≤ -900), precipitación no negativa y orden de temperaturas. Los días inválidos quedan excluidos y las ventanas móviles exigen cobertura completa; no se imputan datos. Calcula lluvia acumulada de 7 y 30 días, temperatura mínima/media/máxima, número de días con mínima ≤ 0 °C en 7 días, racha seca (< 1 mm/día) y seno/coseno estacionales. Todas las ventanas usan el día evaluado y días anteriores. El escalado y el modelo se ajustan solo con datos de entrenamiento. La semilla es 42; 200 árboles y umbral de anomalía en el percentil 5 de puntuaciones de entrenamiento.

Evaluación real de esta descarga: entrenamiento `2015-01-30` a `2022-12-31` (2893 días, tras 29 días de ventana inicial); evaluación `2023-01-01` a `2024-12-31` (731 días). Se marcaron 54 días (7,39 %). Cuantiles de `score_samples` de evaluación, de 0/5/50/95/100 %: `-0.631971 / -0.548897 / -0.467815 / -0.424393 / -0.412112`; menor significa más raro. La concordancia Jaccard de días marcados frente a semillas 43 y 44 fue `0.625` y `0.695`: el resultado es sensible a la semilla. Un comparador sencillo (lluvia acumulada o mínima bajo el percentil 10 del mes de entrenamiento) marcó 184 días, con 38 coincidencias con el modelo. El 26 de septiembre de 2023 el modelo registró puntuación `-0.631971`, lluvia de 30 días `2.48 mm` y 62 días consecutivos con lluvia diaria inferior a 1 mm. Son valores observados y una descripción estadística, no atribución causal ni daño agrícola verificado.

`GET /api/ml/climate-anomalies` devuelve versión, procedencia, calidad, períodos, parámetros, puntuaciones y explicaciones. Admite `latitude`, `longitude`, `start_date`, `end_date` y `field_id` opcionales. Por ahora solo acepta el punto piloto y fechas dentro de 2023–2024; responde 422 para otras coordenadas/fechas y 503 si faltan el modelo o los datos. Con `field_id` del piloto incluye coincidencias con campañas históricas registradas y la misma evidencia para las tres estrategias. No cambia sus puntajes, orden ni calendario. Solo se cargan artefactos generados localmente y verificados contra su manifiesto; nunca cargar modelos de terceros con `joblib`.

La vista Vite vigente en `frontent/` muestra estos datos en **Análisis → Insights AI**, identificando el punto piloto y avisando cuando la parcela seleccionada no coincide. La referencia es una estimación de cuadrícula, no medición directa de parcela. Sin etiquetas independientes de impacto no hay métricas válidas de precisión, sensibilidad, F1 o AUC. El despliegue Docker actual no incluye los archivos locales ignorados: necesita un volumen local con `backend/data/` y `backend/artifacts/` para ofrecer este endpoint.

## Datos climáticos

NASA POWER se consulta realmente, sin sustitución por datos inventados. Documentación: https://power.larc.nasa.gov/docs/services/api/temporal/daily/

Se aceptan únicamente años con todos los días válidos en las cuatro variables. No se rellenan días ni se extrapolan totales. `data_quality.complete_years` y `excluded_years` hacen visible la cobertura; si no queda ningún año completo, responde 503. Es una política conservadora de calidad del MVP, no una recomendación oficial de NASA.

La caché conserva la agrupación previa de coordenadas a 0,5 grados, informa coordenadas originales/consultadas y no afirma medir una parcela. La versión 2 recalcula entradas antiguas al primer uso. Se resuelven conflictos por inserciones concurrentes de la misma clave. Una carrera todavía puede realizar dos consultas NASA, aunque persiste una sola entrada.

El clima sirve para advertencias históricas. El ranking mantiene coeficientes heurísticos de demostración; no es un modelo predictivo ni agronómico validado. El historial se guarda y se incorpora al contexto del análisis, pero la línea base futura sigue repitiendo el cultivo actual. No se generan calendarios fenológicos ni cifras de rendimiento/ahorro.

## Sugerencias de cultivo

`POST /api/recommendations` recibe `field_id` y un `limit` opcional (1–6). Combina la serie histórica disponible de NASA POWER con los coeficientes heurísticos del catálogo de cultivos y los datos declarados de suelo/riego. Devuelve puntuación, razones, riesgos y calidad de datos para cada opción.

La respuesta es un filtro exploratorio: no incorpora todavía ECOCROP, altitud persistida, variedades, plagas, calendario fenológico ni estadísticas productivas locales. No debe interpretarse como rendimiento esperado ni como recomendación agronómica definitiva.

## Fuentes externas y trazabilidad

El registro de fuentes en `app/services/data_sources.py` incluye NASA POWER, ECOCROP, GAEZ, SoilGrids, FAOSTAT, INE Bolivia, OAP, SIIP, SMAP, GPM, Landsat, MODIS, ECOSTRESS y GEDI. Cada entrada declara agencia, URL oficial, papel científico, resolución, frecuencia, adaptador y limitaciones.

El estado no es ambiguo:

- `connected`: la fuente participa actualmente en un cálculo de la API. Hoy corresponde a NASA POWER.
- `metadata_available`: el backend puede consultar el catálogo público de metadatos NASA CMR sin descargar datos ni afirmar que existe una observación válida para la parcela.
- `adapter_available`: existe el punto de integración y su documentación, pero todavía requiere ETL, autenticación, procesamiento raster o validación de formato antes de usarse en recomendaciones.

La interfaz muestra este registro y enlaza a cada fuente oficial. El endpoint `probe` hace una comprobación limitada de disponibilidad; no descarga datasets masivos y no convierte una página accesible en evidencia agronómica.

## Esquema y actualización

El arranque usa `create_all`: crea las nuevas tablas `campaigns` y `plans` sin modificar columnas existentes. No elimina datos. No sustituye una herramienta de migraciones para futuros cambios de columnas. Hacer backup de la base antes de actualizar un despliegue existente.

Se habilitan claves foráneas en SQLite. Las campañas bloquean escrituras por parcela en PostgreSQL y reservan el escritor en SQLite para evitar solapamientos concurrentes. Usar PostgreSQL para concurrencia de producción.

## Verificación realizada

28 pruebas automatizadas, ejecutadas en Python 3.14 local y Python 3.12 en Docker: API, geometrías, calidad climática, HTTP de NASA, prioridades, caché, campañas, planes, eliminación relacionada, instantáneas y credencial opcional. Consulta real de NASA para 2024 en la zona piloto. Imagen Docker construida y recorrido de integración verificado en PostgreSQL 16/PostGIS: conexión, parcelas, campañas, análisis, planes y eliminación relacionada. La suite automatizada usa SQLite temporal. Las dependencias emiten una advertencia de deprecación del transporte httpx del cliente de pruebas; no hubo fallos.
