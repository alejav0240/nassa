from typing import Literal
from pydantic import BaseModel, Field, ConfigDict, model_validator

CropId = Literal['papa','quinua','haba','cebada','avena','tarwi']
SoilTexture = Literal['arenosa','franca','arcillosa','desconocida']

class FieldCreate(BaseModel):
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
            if not rings or not isinstance(rings[0], list) or not 4 <= len(rings[0]) <= 1000:
                raise ValueError('Polygon requiere de 4 a 1000 vértices')
            for ring in rings:
                if not 4 <= len(ring) <= 1000 or ring[0] != ring[-1]:
                    raise ValueError('Cada anillo debe estar cerrado')
                for point in ring:
                    if len(point) < 2 or not -180 <= point[0] <= 180 or not -90 <= point[1] <= 90:
                        raise ValueError('Coordenadas de polígono inválidas')
        return self

class FieldRead(FieldCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)

class Priorities(BaseModel):
    water: int = Field(default=40, ge=0, le=100)
    soil: int = Field(default=40, ge=0, le=100)
    income: int = Field(default=20, ge=0, le=100)

    @model_validator(mode='after')
    def nonzero(self):
        if not (self.water + self.soil + self.income):
            raise ValueError('Al menos una prioridad debe ser mayor que cero')
        return self

class AnalyzeRequest(BaseModel):
    field_id: int
    priorities: Priorities = Field(default_factory=Priorities)
