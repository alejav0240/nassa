from datetime import date
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = 'sqlite:///./agroshift.db'
    cors_origins: str = 'http://localhost:3000'
    nasa_timeout_seconds: float = Field(default=75, gt=0, le=180)
    api_key: str | None = None
    climate_start_year: int = 2020
    climate_end_year: int = 2024
    @model_validator(mode='after')
    def valid_period(self):
        if self.api_key is not None:
            self.api_key = self.api_key.strip() or None
        if not 1981 <= self.climate_start_year <= self.climate_end_year < date.today().year:
            raise ValueError('El período climático debe usar años completos desde 1981')
        if self.climate_end_year - self.climate_start_year > 20:
            raise ValueError('El período climático no puede superar 21 años')
        if self.api_key is not None and len(self.api_key.strip()) < 24:
            raise ValueError('API_KEY debe tener al menos 24 caracteres')
        return self

    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

settings = Settings()
