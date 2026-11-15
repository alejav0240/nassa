from typing import Any
from pydantic import BaseModel


class SourceRead(BaseModel):
    id: str
    name: str
    agency: str
    role: str
    access: str
    official_url: str
    adapter: str
    status: str
    spatial_resolution: str | None
    temporal_resolution: str | None
    limitations: str


class SourcesRead(BaseModel):
    sources: list[SourceRead]
    note: str


class SourceProbeRead(BaseModel):
    id: str
    reachable: bool
    checked_at: str
    http_status: int | None
    detail: str
