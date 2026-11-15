# Entrega local del módulo ML de Viacha

## Qué se reproduce

El módulo `app/ml/` entrena un `IsolationForest` con datos diarios reales de NASA POWER. El piloto está fijado en latitud `-16.57`, longitud `-68.69`, comunidad `AG`, tiempo solar local `LST`, fechas `2015-01-01` a `2024-12-31` y variables `T2M`, `T2M_MIN`, `T2M_MAX`, `PRECTOTCORR`. La referencia de entrenamiento es `2015-01-30` a `2022-12-31` (2893 días con características completas); la evaluación es `2023-01-01` a `2024-12-31` (731 días). Con la serie verificada se obtienen 54 días atípicos. La puntuación describe rareza retrospectiva; no es una probabilidad ni una predicción agrícola.

La [API Daily Point de NASA POWER](https://power.larc.nasa.gov/docs/services/api/temporal/daily/) acepta estos parámetros y el tiempo `LST`. La respuesta incluye un campo `times.data` con el tiempo de procesamiento de cada solicitud. Por eso dos descargas con observaciones idénticas pueden tener distinto SHA-256 del archivo completo.

| Comprobación | SHA-256 |
| --- | --- |
| JSON original conservado en esta computadora | `ace01267682e4b253a2b5a6a5a2b20d7c35584caeecaf46eca4ae4c393274d9b` |
| Observaciones, ubicación, fechas, unidades y tiempo `LST` del piloto, en JSON canónico | `d70f60ca0b8084a16da9d7c3ae56b7f7af67e1c783ee3477f9f5fd9afde1e8f9` |
| Modelo local generado con el JSON original | `5cd8abb9d25c86c0c39fad048ee990ace9556018e12050faecfa215e43e62c1d` |

`app.ml.verify_source` valida fechas, coordenadas, unidades, cobertura y valores antes de calcular la segunda huella. Esa huella usa claves ordenadas y separadores JSON compactos, excluye `times.data` y devuelve código de error si las observaciones difieren de las validadas. Si falla, no se deben repetir las cifras de 54 anomalías sin evaluar la nueva serie.

## Preparación en otra computadora con PowerShell

Ejecutar desde la raíz de un checkout que **incluya todos los archivos sin seguimiento listados abajo**. Se requiere Python 3.12 o superior, acceso a NASA POWER y Node.js para abrir el panel Vite.

```powershell
Set-Location .\backend
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
New-Item -ItemType Directory -Force data, artifacts | Out-Null

$rawPath = 'data/nasa_power_viacha_2015_2024.json'
if (Test-Path $rawPath) { throw 'El JSON NASA ya existe; verificarlo sin sobrescribirlo.' }
$nasaUrl = 'https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,T2M_MIN,T2M_MAX,PRECTOTCORR&community=AG&latitude=-16.57&longitude=-68.69&start=20150101&end=20241231&format=JSON&time-standard=LST'
Invoke-WebRequest -Uri $nasaUrl -OutFile $rawPath -TimeoutSec 180
Get-FileHash $rawPath -Algorithm SHA256
.\.venv\Scripts\python.exe -m app.ml.verify_source

if (Test-Path 'artifacts/climate_model.joblib') { throw 'Ya existe un modelo; conservarlo y verificarlo antes de reentrenar.' }
.\.venv\Scripts\python.exe -m app.ml.train
.\.venv\Scripts\python.exe -m pytest -q

$report = Get-Content 'artifacts/climate_report.json' -Raw | ConvertFrom-Json
$report.model_id
$report.observations
$report.evaluation.flagged_days
Get-FileHash 'artifacts/climate_model.joblib' -Algorithm SHA256
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

La última orden mantiene FastAPI abierto. En otra ventana de PowerShell:

```powershell
Invoke-RestMethod 'http://127.0.0.1:8000/api/health'
$ml = Invoke-RestMethod 'http://127.0.0.1:8000/api/ml/climate-anomalies'
$ml.availability
$ml.evaluation.flagged_days
$ml.anomalies.Count
Invoke-RestMethod 'http://127.0.0.1:8000/api/fields?limit=100'
```

Se espera `ready`, 54 y 54 si la huella de observaciones coincide. El hash **completo** del JSON descargado puede diferir del original aunque el entrenamiento sea equivalente. El reporte de cada entrenamiento guarda el hash completo de **su** JSON; el endpoint verifica ese vínculo local antes de cargar el modelo. Nunca cargar un `joblib` de origen ajeno.

Comprobación local del 14 de noviembre de 2026: una segunda descarga tuvo SHA-256 completo `9cc62850f4705bb22cf08fde7506cfc6e4c0e93d7712789581db3cfa83e6d569`; la única diferencia en el JSON interpretado fue `times.data` (`0.265` frente a `0.225`). La huella de observaciones coincidió. Un entrenamiento aislado con esa nueva descarga generó de nuevo 54 anomalías y el mismo SHA-256 de modelo; los archivos originales no se sobrescribieron. La suite completa tuvo 35 pruebas aprobadas, y `npm.cmd run lint` y `npm.cmd run build` finalizaron correctamente en `frontent/`.

Para visualizar el módulo en el frontend Vite, desde otra ventana en la raíz del checkout:

```powershell
Set-Location .\frontent
npm.cmd ci
npm.cmd run lint
npm.cmd run build
npm.cmd run dev
```

Abrir `http://127.0.0.1:3000`, seleccionar una parcela y entrar en **Análisis → Insights AI**. Mantener `VITE_API_BASE_URL` sin definir para usar el proxy `/api` de Vite hacia FastAPI local. La advertencia para parcelas distintas de Viacha es intencional.

## Archivos que debe recibir el equipo

`git diff --stat` omite los archivos nuevos que aún no están bajo seguimiento. En el estado local de esta entrega hay modificaciones de archivos existentes en:

- `backend/.gitignore`, `backend/README.md`, `backend/app/main.py`, `backend/requirements.txt`.
- `frontent/.env.example`, `frontent/README.md`, `frontent/src/index.css`, `frontent/src/screens/AnalysisScreen.tsx`, `frontent/src/services/apiClient.ts`, `frontent/vite.config.ts`.

También hay archivos **nuevos y aún sin seguimiento** que son imprescindibles:

- `backend/app/ml/__init__.py`, `backend/app/ml/model.py`, `backend/app/ml/pipeline.py`, `backend/app/ml/train.py`, `backend/app/ml/verify_source.py`.
- `backend/tests/test_ml.py`, `frontent/src/components/ClimateAnomaliesSection.tsx`, `backend/ML_ENTREGA.md`.

Quien prepare el intercambio por Git debe incluir los archivos anteriores de forma consciente; esta guía no realiza operaciones de Git. `frontent/src/index.css` contiene también ajustes de compatibilidad de temas, por lo que conviene revisar su diff completo junto con los cambios del equipo.

Los archivos `backend/data/nasa_power_viacha_2015_2024.json`, `backend/artifacts/climate_model.joblib` y `backend/artifacts/climate_report.json` permanecen **ignorados por Git** y se generan localmente mediante los comandos anteriores. Tampoco se comparte `.venv/` ni `.env`. No copiar el artefacto serializado desde una fuente no confiable.

## Dos aplicaciones frontend y límite de Compose

`frontent/` es la aplicación React/Vite que contiene `ClimateAnomaliesSection`, consume `/api/ml/climate-anomalies` y usa el proxy local. `frontend--resp/` es una aplicación Next.js distinta; `compose.yaml` construye esa aplicación, no el panel Vite. Además, `backend/Dockerfile` copia código y dependencias, pero no incorpora los directorios locales ignorados `data/` y `artifacts/`. Por tanto, el flujo reproducible del panel ML es FastAPI local más `frontent/` local. Habilitar el módulo dentro de Compose requeriría decidir explícitamente cómo montar los datos y artefactos y qué frontend servir; esta entrega no cambia Compose ni sustituye ninguna aplicación.
