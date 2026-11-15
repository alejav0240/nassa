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
cd frontent
npm install
npm run dev
```

Vite usa `/api` como ruta base. En Docker, Nginx reenvía `/api/*` al FastAPI interno y puede inyectar `API_KEY` sin exponerla al navegador.

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
├── frontent/
│   ├── src/                    # React + Vite
│   ├── src/components/         # componentes y mapas
│   ├── src/services/apiClient.ts # cliente REST y contratos
│   └── Dockerfile
├── compose.yaml
└── .env.example
```

## API

La documentación actualizada del backend, endpoints de campañas y planes, configuración y pruebas está en [backend/README.md](backend/README.md).

- `GET /api/health`
- `GET /api/crops`
- `POST /api/fields`
- `GET /api/fields`
- `GET /api/fields/{id}`
- `POST /api/analyze` (requiere `field_id` y pesos `water`, `soil`, `income`)
- `POST /api/recommendations` (requiere `field_id`; sugiere cultivos compatibles y expone razones/riesgos)
- `GET /api/data-sources` (registro de fuentes oficiales y estado real de integración)
- `GET /api/data-sources/{source_id}/probe` (comprobación puntual de disponibilidad)
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
3. La referencia actual repite el cultivo introducido para formar una comparación básica. Ahora se pueden registrar campañas históricas; se guardan como contexto del análisis, pero todavía no modifican la secuencia futura de referencia.
4. Los umbrales de agua y heladas son *heurísticos demostrativos*. No son restricciones científicas validadas. El scoring no evalúa ventanas de siembra, plagas, precios, textura/pH ni balances hídricos mensuales.
5. La DB usa PostgreSQL/PostGIS como imagen base, pero en este MVP las geometrías opcionales se guardan en JSON; el flujo de parcelas ya permite trabajar con polígonos referenciales, sin afirmar que sean límites topográficos levantados.
6. Hay una credencial de equipo opcional (`API_KEY`), pero no hay identidad ni aislamiento multiusuario. **No desplegar públicamente con datos personales o sensibles** sin seguridad, cuotas y controles.
7. En el piloto no se consumen todavía SMAP, GPM, Landsat, SoilGrids ni FAO de forma automática. NASA POWER es la integración satelital/meteorológica real de esta entrega.
8. Las solicitudes NASA se almacenan en caché sin caducidad para periodos históricos. Evita llamadas duplicadas; definir TTL o versionado si se analizan años recientes.

## Despliegue en Coolify

1. Subir este repositorio a GitHub.
2. En Coolify: **New Resource → Docker Compose**, seleccionar repositorio y `compose.yaml`.
3. Establecer `POSTGRES_PASSWORD` como secreto de producción; crear DNS y asociar el dominio únicamente al servicio `web`, puerto 3000.
4. En el servicio `web`, Nginx usa `http://api:8000` para proxy; el backend debe permanecer en la red privada de Compose.
5. **Antes de exposición pública**: eliminar el binding publicado del puerto 8000 (`127.0.0.1:8000:8000`), agregar rate limiting e identidad multiusuario, configurar backups de Postgres y HTTPS. Si se usa `API_KEY`, definirla para `api` y `web`; Nginx la inyecta al proxy sin enviarla al navegador.
6. En algunas configuraciones de Coolify es necesario ajustar dominios/puertos proxy. No abrir Postgres públicamente.

## Despliegue del frontend en Netlify

El frontend Vite puede desplegarse en Netlify, pero FastAPI y PostgreSQL deben permanecer en un servicio separado (Render, Railway, Fly.io, Cloud Run o un VPS).

1. Importar el repositorio en Netlify. `netlify.toml` configura automáticamente `frontent/` como base, `npm run build` como comando y `dist/` como directorio publicado.
2. Configurar en Netlify las variables server-side:
   - `BACKEND_URL`: URL HTTPS del backend, sin `/api` final.
   - `API_KEY`: misma clave configurada en FastAPI, si está habilitada.
3. Mantener vacío `VITE_API_BASE_URL` para que el frontend use `/api` y el proxy server-side de Netlify inyecte la clave sin exponerla al navegador.
4. Configurar en FastAPI `CORS_ORIGINS` con el dominio de Netlify. Las solicitudes proxificadas son same-origin, pero el dominio debe quedar permitido para accesos directos y preflight.
5. Verificar `https://tu-sitio.netlify.app/api/health` y después crear una parcela y ejecutar un análisis.

El proxy de Netlify está en `frontent/netlify/functions/api-proxy.mjs`; reenvía los métodos REST al backend y no expone `API_KEY` al cliente.

## Despliegue completo en Render

El archivo `render.yaml` define el stack completo: API FastAPI, frontend estático y PostgreSQL.

1. En Render, abrir **New → Blueprint** y seleccionar este repositorio.
2. Render leerá `render.yaml` y creará `agroshift-api`, `agroshift-web` y `agroshift-db`.
3. La API usa `backend/Dockerfile` con `backend/` como contexto de Docker. El `Dockerfile` de la raíz también permite desplegar el servicio desde la configuración Docker predeterminada de Render.
4. Render inyecta `DATABASE_URL` desde PostgreSQL y genera `API_KEY` automáticamente.
5. Después del primer despliegue, verificar:
   - `https://agroshift-api.onrender.com/api/health`
   - `https://agroshift-web.onrender.com`

El backend normaliza la URL PostgreSQL que Render entrega (`postgresql://`) al dialecto `postgresql+psycopg` usado por SQLAlchemy.

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
