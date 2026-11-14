# AgroShift AI · NASA Space Apps Challenge 2026

Plataforma web en español para explorar estrategias de rotación agrícola, con series históricas reales de **NASA POWER** y un motor multicriterio heurístico y explicable. Caso piloto: Altiplano boliviano (Viacha, La Paz).

> **Transparencia:** La climatología proviene de NASA POWER. Los coeficientes por cultivo, umbrales y puntajes son **supuestos ilustrativos sin calibración agronómica**, no predicciones de rendimientos, ahorros o ingresos. El sistema no sustituye validación local.

## Inicio rápido con Docker Compose

```bash
cp .env.example .env
# Edita .env y cambia POSTGRES_PASSWORD por una contraseña fuerte.
docker compose up --build -d
docker compose ps
```

- Web: http://localhost:3000
- API/OpenAPI: http://localhost:8000/docs
- Salud: http://localhost:8000/api/health

Selecciona una ubicación en el mapa, completa la ficha del terreno y pulsa **Analizar estrategias**. La primera consulta puede tardar, según NASA. Sin conexión a NASA POWER, el análisis responde un error visible: **no se generan datos climáticos falsos**.

## Desarrollo sin Docker

Backend (por defecto SQLite local para desarrollo):
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend (otra terminal):
```bash
cd frontend
npm install
npm run dev
```

Next.js reenvía `/api/*` al FastAPI local. API y Web se comunican en la red interna con Docker Compose.

## Estructura

```text
agroshift-ai/
├── backend/
│   ├── app/
│   │   ├── config.py           # variables de entorno
│   │   ├── database.py         # SQLAlchemy (Postgres/SQLite)
│   │   ├── models.py           # parcelas, clima caché, análisis
│   │   ├── schemas.py          # Pydantic y validaciones
│   │   ├── main.py             # REST API
│   │   └── services/
│   │       ├── nasa.py         # NASA POWER Daily Point
│   │       └── rotation.py     # 3 rotaciones y scoring explicable
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/                    # Next.js App Router
│   ├── components/             # MapLibre y Recharts
│   ├── lib/api.ts              # tipos + cliente
│   └── Dockerfile
├── compose.yaml
└── .env.example
```

## API

- `GET /api/health`
- `GET /api/crops`
- `POST /api/fields`
- `GET /api/fields`
- `GET /api/fields/{id}`
- `POST /api/analyze` (requiere `field_id` y pesos `water`, `soil`, `income`)
- `GET /api/analyses/{id}`

Ejemplo:
```bash
curl -X POST http://localhost:8000/api/fields \
  -H 'Content-Type: application/json' \
  -d '{"name":"Parcela piloto Viacha","latitude":-16.65,"longitude":-68.30,"hectares":2.5,"soil_texture":"desconocida","irrigation":false,"current_crop":"papa"}'

curl -X POST http://localhost:8000/api/analyze \
  -H 'Content-Type: application/json' \
  -d '{"field_id":1,"priorities":{"water":45,"soil":40,"income":15}}'
```

## Limitaciones científicas y técnicas

1. **POWER**: raster meteorológico de resolución gruesa; la caché redondea lat/lon a 0.5°. Se informa la coordenada efectivamente consultada. El dato NO equivale a una observación a escala de parcela.
2. Se analiza **2020–2024** para tener una ventana anual completa y reproducible. El usuario puede cambiarlo por variables de entorno.
3. La referencia actual repite el cultivo introducido para formar una comparación básica. Una rotación histórica real necesitaría una ficha de 3–5 campañas agrícolas.
4. Los umbrales de agua y heladas son *heurísticos demostrativos*. No son restricciones científicas validadas. El scoring no evalúa ventanas de siembra, plagas, precios, textura/pH ni balances hídricos mensuales.
5. La DB usa PostgreSQL/PostGIS como imagen base, pero en este MVP las geometrías opcionales se guardan en JSON; el frontend usa un punto, sin editor de polígonos. Para posteriores fases: columna Geometry, GIST, dibujo de parcelas, zonificación espacial.
6. No hay autenticación ni aislamiento multiusuario. **No desplegar públicamente con datos personales o sensibles** sin seguridad, cuotas y controles.
7. En el piloto no se consumen todavía SMAP, GPM, Landsat, SoilGrids ni FAO de forma automática. NASA POWER es la integración satelital/meteorológica real de esta entrega.
8. Las solicitudes NASA se almacenan en caché sin caducidad para periodos históricos. Evita llamadas duplicadas; definir TTL o versionado si se analizan años recientes.

## Despliegue en Coolify

1. Subir este repositorio a GitHub.
2. En Coolify: **New Resource → Docker Compose**, seleccionar repositorio y `compose.yaml`.
3. Establecer `POSTGRES_PASSWORD` como secreto de producción; crear DNS y asociar el dominio únicamente al servicio `web`, puerto 3000.
4. En el servicio `web`, Next.js usa `INTERNAL_API_URL=http://api:8000` para proxy; el backend debe permanecer en la red privada de Compose.
5. **Antes de exposición pública**: eliminar el binding publicado del puerto 8000 (`127.0.0.1:8000:8000`), agregar rate limiting y autenticación por equipo, configurar backups de Postgres y HTTPS.
6. En algunas configuraciones de Coolify es necesario ajustar dominios/puertos proxy. No abrir Postgres públicamente.

## Pruebas

```bash
cd backend
python -m pytest -q
```

## Fuentes

- NASA POWER daily API: https://power.larc.nasa.gov/docs/services/api/temporal/daily/
- NASA POWER project: https://power.larc.nasa.gov/
- Challenge: https://www.spaceappschallenge.org/2026/challenges/

**Próximos desarrollos:** historial completo de rotaciones y calendario fenológico, datos locales de laboratorio, polygons PostGIS, capas NDVI Landsat, disponibilidad hídrica GPM/SMAP, restricciones agronómicas calibradas y generación de reportes PDF.
