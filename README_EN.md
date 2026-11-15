# AgroShift AI — From Satellite to Furrow

**NASA Space Apps Challenge 2026**  
**Challenge:** Field Shift: Adapting Farms with NASA Data  
**Team:** `sudo -rm -rf/`  
**Pilot area:** Viacha, Bolivian Altiplano

> **From satellite to furrow:** helping farmers explore crop-rotation choices with NASA climate data and local field knowledge.

## Project overview

AgroShift AI is a **Spanish-language, mobile-first agricultural decision-support prototype** built for the NASA Space Apps Challenge 2026. Farmers face changing rainfall, frost, water constraints, and declining soil health, but often lack accessible ways to connect environmental data to decisions about what to grow next.

Our prototype brings together **historical NASA POWER weather records**, farmer-supplied field characteristics, crop information, and stated priorities to explore and explain **three illustrative crop-rotation strategies**. It aims to make environmental evidence easier to understand, rather than promise a guaranteed agricultural outcome.

The initial use case is **Viacha, Bolivia**, in the high-altitude Altiplano.

## The challenge we address

The *Field Shift: Adapting Farms with NASA Data* challenge calls for a decision-support tool that combines NASA Earth observations with local soil information, crop characteristics, and farmer priorities so that farmers can compare rotation strategies that may support soil health, water conservation, and climate resilience.

AgroShift AI responds with an accessible workflow: identify a field, record local conditions, choose priorities, inspect historical climate information, and compare understandable alternatives.

## What the prototype does

- **Field registration and maps:** locate fields on an interactive map, register parcel information, and work with reference parcel polygons.
- **Local agricultural context:** record soil texture, irrigation availability, current crops, and historical growing campaigns.
- **NASA-powered climate context:** retrieve and summarize historical precipitation, temperature, and frost-related information from NASA POWER.
- **Three strategy comparison:** compare an illustrative current baseline with two alternative rotation strategies using a transparent multicriteria scoring model.
- **Explainable crop suggestions:** explore indicative crop compatibility, reasons, risks, and missing information, rather than unsupported yield predictions.
- **Historical climate anomaly exploration:** an experimental machine-learning module identifies unusual *past* weather patterns for the Viacha pilot.
- **Saved decisions:** store analysis results and follow-up plans through the backend API.
- **Source transparency:** distinguish the NASA dataset actually used in calculations from sources listed for potential future integration.

## How it works

1. **Select a location.** The farmer registers a parcel through the map and provides local agricultural details.
2. **Set priorities.** The user indicates how to weigh water, soil, and economic considerations.
3. **Retrieve climate history.** The backend requests historical NASA POWER daily data for the relevant geographic area and checks data quality.
4. **Compare alternatives.** A heuristic multicriteria engine creates and evaluates three illustrative crop-rotation strategies.
5. **Review the evidence.** The interface explains scores, trade-offs, risks, data sources, and scientific limitations.
6. **Save a plan.** The farmer can preserve an exploratory decision for subsequent review with local experts.

**Important:** the recorded historical campaigns currently provide context but do not fully determine the future baseline rotation; the baseline uses a simplified representation of the current crop. This is a prototype limitation, not a completed agronomic planning model.

## Why NASA data matters

The primary operational NASA resource is **NASA POWER (Prediction Of Worldwide Energy Resources)**:

- Project: https://power.larc.nasa.gov/
- Daily API: https://power.larc.nasa.gov/docs/services/api/temporal/daily/

NASA POWER supplies historical weather variables used to describe the climatic conditions behind the exploratory comparisons. The default rotation-analysis window is **2020–2024**, configurable in the backend. The API validates available data and reports missing or incomplete periods instead of fabricating values when the NASA source is unavailable.

NASA POWER has a coarser spatial resolution than an individual field. Values are **regional climate estimates, not direct parcel-scale measurements**.

### Experimental machine-learning pilot

A separate module in `backend/app/ml/` uses **Isolation Forest** to identify unusual combinations of historical weather variables at the Viacha pilot point. Its documented NASA POWER data period is **2015–2024**, with retrospective evaluation for **2023–2024**. It does **not** forecast droughts, agricultural losses, or yields, and it does not modify the rotation rankings.

The raw NASA download and trained model artifacts are generated locally and are **not included in Git**. See [`backend/ML_ENTREGA.md`](backend/ML_ENTREGA.md) for the documented reproduction procedure, data checks, scope, and limitations.

### Other Earth observation sources

The project contains a source registry for datasets and services such as **SMAP, GPM, Landsat, MODIS, ECOSTRESS, GEDI**, and non-NASA agricultural resources. Those sources are **not all operational inputs** to the current rotation calculation. Their status is identified separately so that planned connections are not confused with validated integrations.

## Technology stack

| Area | Technologies |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Maps and geospatial interface | Leaflet, React Leaflet, Turf.js |
| Charts and UI | Recharts, Lucide icons |
| API | Python, FastAPI, Pydantic |
| Data layer | SQLAlchemy; SQLite for local development, PostgreSQL/PostGIS through Docker Compose |
| Climate-data integration | NASA POWER Daily API |
| Experimental ML | scikit-learn, pandas, NumPy, joblib |
| Development and deployment | Git, GitHub, Docker Compose, Nginx |

## Repository structure

```text
nassa/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI endpoints
│   │   ├── models.py                # Persisted data models
│   │   ├── schemas.py               # Request/response validation
│   │   ├── services/
│   │   │   ├── nasa.py              # NASA POWER integration
│   │   │   └── rotation.py          # Exploratory scoring and crop data
│   │   └── ml/                      # Experimental climate-anomaly module
│   ├── tests/
│   ├── README.md
│   └── ML_ENTREGA.md
├── frontent/                        # React + Vite application (repository spelling)
│   ├── src/
│   │   ├── components/
│   │   ├── screens/
│   │   └── services/
│   └── package.json
├── compose.yaml
├── README.md                         # Original Spanish documentation
└── README_EN.md                      # English project guide
```

> The directory is named **`frontent/`** in this repository. Use that exact spelling when running commands.

## Run locally on Windows

### Requirements

- Python **3.12 or later**
- A supported Node.js installation and npm
- Internet access for live NASA POWER requests

**1. Clone the repository**

```powershell
git clone https://github.com/alejav0240/nassa.git
cd nassa
```

**2. Start the backend** (PowerShell terminal 1)

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

If you have another compatible Python version installed, adapt the `py -3.12` command accordingly. The development backend uses a local SQLite database by default.

**3. Start the frontend** (PowerShell terminal 2, from the repository root)

```powershell
cd frontent
npm.cmd ci
npm.cmd run dev
```

**4. Open the application**

- App: http://127.0.0.1:3000
- API documentation: http://127.0.0.1:8000/docs
- API health: http://127.0.0.1:8000/api/health

The Vite development server proxies `/api` requests to the FastAPI backend. Some analysis screens require the backend and an available NASA POWER connection; otherwise they should display an error or unavailable state.

### Docker Compose alternative

From the repository root:

```powershell
Copy-Item .env.example .env
# Edit .env and set a strong POSTGRES_PASSWORD before starting.
docker compose up --build -d
docker compose ps
```

The Compose configuration builds the `frontent/` web application, the FastAPI backend, and a PostGIS database. It does **not automatically include** locally generated ML datasets or model artifacts; the anomaly panel requires the additional data/model preparation described in `backend/ML_ENTREGA.md`.

**Security:** the prototype is not a production-ready multiuser service. Do not expose private agricultural information, the database, or unauthenticated API endpoints publicly without implementing appropriate authentication, access controls, backups, HTTPS, and rate limiting.

## API overview

Selected endpoints:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Service health |
| GET | `/api/crops` | Crop catalog and metadata |
| GET / POST | `/api/fields` | List or create parcels |
| GET / PUT / DELETE | `/api/fields/{id}` | Manage a parcel |
| GET / POST | `/api/fields/{id}/campaigns` | Manage crop history |
| POST | `/api/analyze` | Compare three illustrative strategies |
| POST | `/api/recommendations` | Explore indicative crop compatibility |
| GET | `/api/data-sources` | Inspect source registry and integration status |
| GET | `/api/analyses/{id}` | Retrieve a previous analysis |
| POST | `/api/plans` | Save an exploratory plan |
| GET | `/api/ml/climate-anomalies` | Read experimental historical anomaly results when locally available |

More details are available in [`backend/README.md`](backend/README.md) and FastAPI's interactive API documentation at `/docs`.

## Tests

Backend tests:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -q
```

Frontend checks:

```powershell
cd frontent
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

These commands describe how to verify the project; their presence does not imply that tests were rerun when this English README was prepared.

## Scientific integrity and current limitations

- **Not a yield prediction:** rotation scores and crop thresholds are illustrative heuristics, not locally calibrated agronomic measurements.
- **No guaranteed outcomes:** the software does not substantiate specific percentages of water savings, soil improvement, financial returns, or crop production.
- **Spatial and temporal uncertainty:** NASA POWER conditions are representative of a broader grid, not a sensor reading from a farmer's parcel.
- **Incomplete soil information:** soil texture, pH, irrigation availability, and crop history depend on farmer-provided information and may be missing or uncertain.
- **Simplified rotation baseline:** historical campaigns are not yet fully translated into a future multiseason agronomic schedule.
- **Historical ML only:** anomaly detection identifies unusual past patterns for a specific pilot, not future climate events.
- **Additional data sources pending:** SMAP, GPM, Landsat, MODIS, and other registered sources are not validated operational inputs to the rotation scoring pipeline.
- **Local validation needed:** agronomists and farmers should evaluate the model's assumptions, crop varieties, sowing windows, pests, and actual soil and water conditions before field use.

If the NASA request fails or data quality is insufficient, the application should report the limitation rather than replace observations with fabricated climate measurements.

## Next steps

- Validate crop parameters and decision criteria with local agronomists and farmers.
- Improve the historical-rotation baseline and seasonal crop-calendar logic.
- Integrate verified soil measurements and additional Earth observation data at appropriate resolutions.
- Improve field geometry persistence and spatial analysis.
- Expand usability testing with Bolivian farming communities.
- Introduce production-grade identity, permissions, and privacy safeguards before public deployment.

## AI-assisted development disclosure

The team used AI-assisted software-development and content-preparation tools during prototyping, debugging, interface exploration, and documentation. The experimental machine-learning functionality uses scikit-learn's Isolation Forest. **NASA climate measurements are sourced from NASA POWER, not generated by AI.** AI-assisted code and media should be identified where applicable in accompanying descriptive text or metadata, and submitted AI-generated visual materials should follow the NASA Space Apps 2026 disclosure rules. Project ideas, interpretation, review, and final responsibility remain with the team.

## Team and links

- **Team:** `sudo -rm -rf/`
- **Project:** AgroShift AI — From Satellite to Furrow
- **Challenge:** [Field Shift: Adapting Farms with NASA Data](https://www.spaceappschallenge.org/2026/challenges/)
- **Source code:** https://github.com/alejav0240/nassa
- **NASA POWER:** https://power.larc.nasa.gov/
- **NASA Space Apps Challenge:** https://www.spaceappschallenge.org/2026/

---

*AgroShift AI is a research and educational prototype for exploring agricultural decision-making with open Earth observation data. It is not a substitute for professional agronomic advice.*
