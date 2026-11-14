from datetime import date, datetime, timezone
from sqlalchemy import ForeignKey, String, Float, Integer, DateTime, JSON, Date, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

def utcnow():
    return datetime.now(timezone.utc)

class Field(Base):
    __tablename__ = 'fields'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    hectares: Mapped[float] = mapped_column(Float)
    soil_texture: Mapped[str] = mapped_column(String(30))
    irrigation: Mapped[bool] = mapped_column(default=False)
    current_crop: Mapped[str] = mapped_column(String(50), default='papa')
    soil_ph: Mapped[float | None] = mapped_column(Float, nullable=True)
    geometry_geojson: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    analyses: Mapped[list['Analysis']] = relationship(back_populates='field', cascade='all, delete-orphan')

class ClimateCache(Base):
    __tablename__ = 'climate_cache'
    __table_args__ = (UniqueConstraint('grid_lat', 'grid_lon', 'start_year', 'end_year', name='uq_nasa_cell_period'),)
    id: Mapped[int] = mapped_column(primary_key=True)
    grid_lat: Mapped[float] = mapped_column(Float)
    grid_lon: Mapped[float] = mapped_column(Float)
    start_year: Mapped[int] = mapped_column(Integer)
    end_year: Mapped[int] = mapped_column(Integer)
    payload: Mapped[dict] = mapped_column(JSON)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

class Analysis(Base):
    __tablename__ = 'analyses'
    id: Mapped[int] = mapped_column(primary_key=True)
    field_id: Mapped[int] = mapped_column(ForeignKey('fields.id'))
    priorities: Mapped[dict] = mapped_column(JSON)
    result: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    field: Mapped[Field] = relationship(back_populates='analyses')

class Campaign(Base):
    __tablename__ = 'campaigns'
    id: Mapped[int] = mapped_column(primary_key=True)
    field_id: Mapped[int] = mapped_column(ForeignKey('fields.id'), index=True)
    crop: Mapped[str] = mapped_column(String(50))
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    notes: Mapped[str] = mapped_column(String(2000), default='')

class Plan(Base):
    __tablename__ = 'plans'
    id: Mapped[int] = mapped_column(primary_key=True)
    field_id: Mapped[int] = mapped_column(ForeignKey('fields.id'), index=True)
    analysis_id: Mapped[int] = mapped_column(ForeignKey('analyses.id'), index=True)
    strategy_id: Mapped[str] = mapped_column(String(30))
    notes: Mapped[str] = mapped_column(String(2000), default='')
    snapshot: Mapped[dict] = mapped_column(JSON)
    checklist: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

# Explicit creation at startup also upgrades pre-existing databases.
PERFORMANCE_INDEXES = (
    Index('ix_analyses_field_id_id', Analysis.field_id, Analysis.id),
    Index('ix_campaigns_field_start', Campaign.field_id, Campaign.start_date),
    Index('ix_plans_field_id_id', Plan.field_id, Plan.id),
)
