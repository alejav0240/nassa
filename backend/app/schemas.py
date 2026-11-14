from datetime import date, datetime
from typing import Any, Literal
from shapely.geometry import shape
from shapely.validation import explain_validity
from pydantic import BaseModel, Field, ConfigDict, model_validator

CropId = Literal['papa','quinua','haba','cebada','avena','tarwi']
SoilTexture = Literal['arenosa','franca','arcillosa','desconocida']

class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, allow_inf_nan=False)

class FieldCreate(StrictModel):
    name: str = Field(min_length=2, max_length=120)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    hectares: float = Field(gt=0, le=100000)
    soil_texture: SoilTexture = 'desconocida'
    irrigation: bool = False
    current_crop: CropId = 'papa'
    soil_ph: float | None = Field(default=None, ge=3, le=10)
    geometry_geojson: dict | None = None

    @model_validator(mode='after')
    def validate_geometry(self):
        if self.geometry_geojson is not None:
            geom = self.geometry_geojson
            if geom.get('type') != 'Polygon' or not isinstance(geom.get('coordinates'), list):
                raise ValueError('geometry_geojson debe ser un Polygon GeoJSON válido')
            rings = geom['coordinates']
            if not rings or len(rings) > 20:
                raise ValueError('Polygon requiere entre 1 y 20 anillos')
            for ring in rings:
                if not isinstance(ring, list) or not 4 <= len(ring) <= 1000 or ring[0] != ring[-1]:
                    raise ValueError('Cada anillo debe tener de 4 a 1000 vértices y estar cerrado')
                for point in ring:
                    if (not isinstance(point, list) or len(point) != 2
                        or any(type(v) not in (int, float) for v in point)
                        or not -180 <= point[0] <= 180 or not -90 <= point[1] <= 90):
                        raise ValueError('Coordenadas de polígono inválidas')
            polygon = shape(geom)
            if not polygon.is_valid or polygon.area == 0:
                raise ValueError('Polígono inválido: ' + explain_validity(polygon))
        return self

class FieldRead(FieldCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)

class Priorities(StrictModel):
    water: int = Field(default=40, ge=0, le=100)
    soil: int = Field(default=40, ge=0, le=100)
    income: int = Field(default=20, ge=0, le=100)

    @model_validator(mode='after')
    def nonzero(self):
        if not (self.water + self.soil + self.income):
            raise ValueError('Al menos una prioridad debe ser mayor que cero')
        return self

class AnalyzeRequest(StrictModel):
    field_id: int = Field(gt=0)
    priorities: Priorities = Field(default_factory=Priorities)


class ErrorResponse(BaseModel):
    detail: str = Field(description='Descripción del error')


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


class CropResponse(BaseModel):
    id: CropId
    label: str
    water: int
    soil: int
    market: int
    min_rain: int
    max_frost: int
    family: str
    notes: str


class CropsResponse(BaseModel):
    crops: list[CropResponse]
    methodology: dict[str, Any]

class CampaignCreate(StrictModel):
    crop: CropId
    start_date: date
    end_date: date
    notes: str = Field(default='', max_length=2000)

    @model_validator(mode='after')
    def dates_valid(self):
        if self.end_date < self.start_date:
            raise ValueError('La fecha final debe ser posterior o igual a la inicial')
        return self

class CampaignRead(CampaignCreate):
    id: int
    field_id: int
    model_config = ConfigDict(from_attributes=True)

class PlanCreate(StrictModel):
    analysis_id: int = Field(gt=0)
    strategy_id: Literal['actual', 'agua', 'suelo']
    notes: str = Field(default='', max_length=2000)

class PlanUpdate(StrictModel):
    notes: str = Field(default='', max_length=2000)
    checklist: dict[Literal['soil', 'water', 'seeds', 'expert_review'], bool] = Field(default_factory=dict)

class PlanRead(PlanCreate):
    id: int
    field_id: int
    snapshot: dict
    checklist: dict[str, bool]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
