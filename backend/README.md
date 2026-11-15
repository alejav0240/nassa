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

## Datos climáticos

NASA POWER se consulta realmente, sin sustitución por datos inventados. Documentación: https://power.larc.nasa.gov/docs/services/api/temporal/daily/

Se aceptan únicamente años con todos los días válidos en las cuatro variables. No se rellenan días ni se extrapolan totales. `data_quality.complete_years` y `excluded_years` hacen visible la cobertura; si no queda ningún año completo, responde 503. Es una política conservadora de calidad del MVP, no una recomendación oficial de NASA.

La caché conserva la agrupación previa de coordenadas a 0,5 grados, informa coordenadas originales/consultadas y no afirma medir una parcela. La versión 2 recalcula entradas antiguas al primer uso. Se resuelven conflictos por inserciones concurrentes de la misma clave. Una carrera todavía puede realizar dos consultas NASA, aunque persiste una sola entrada.

El clima sirve para advertencias históricas. El ranking mantiene coeficientes heurísticos de demostración; no es un modelo predictivo ni agronómico validado. El historial se guarda y se incorpora al contexto del análisis, pero la línea base futura sigue repitiendo el cultivo actual. No se generan calendarios fenológicos ni cifras de rendimiento/ahorro.

## Sugerencias de cultivo

`POST /api/recommendations` recibe `field_id` y un `limit` opcional (1–6). Combina la serie histórica disponible de NASA POWER con los coeficientes heurísticos del catálogo de cultivos y los datos declarados de suelo/riego. Devuelve puntuación, razones, riesgos y calidad de datos para cada opción.

La respuesta es un filtro exploratorio: no incorpora todavía ECOCROP, altitud persistida, variedades, plagas, calendario fenológico ni estadísticas productivas locales. No debe interpretarse como rendimiento esperado ni como recomendación agronómica definitiva.

## Esquema y actualización

El arranque usa `create_all`: crea las nuevas tablas `campaigns` y `plans` sin modificar columnas existentes. No elimina datos. No sustituye una herramienta de migraciones para futuros cambios de columnas. Hacer backup de la base antes de actualizar un despliegue existente.

Se habilitan claves foráneas en SQLite. Las campañas bloquean escrituras por parcela en PostgreSQL y reservan el escritor en SQLite para evitar solapamientos concurrentes. Usar PostgreSQL para concurrencia de producción.

## Verificación realizada

28 pruebas automatizadas, ejecutadas en Python 3.14 local y Python 3.12 en Docker: API, geometrías, calidad climática, HTTP de NASA, prioridades, caché, campañas, planes, eliminación relacionada, instantáneas y credencial opcional. Consulta real de NASA para 2024 en la zona piloto. Imagen Docker construida y recorrido de integración verificado en PostgreSQL 16/PostGIS: conexión, parcelas, campañas, análisis, planes y eliminación relacionada. La suite automatizada usa SQLite temporal. Las dependencias emiten una advertencia de deprecación del transporte httpx del cliente de pruebas; no hubo fallos.
