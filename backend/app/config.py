from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = 'sqlite:///./agroshift.db'
    cors_origins: str = 'http://localhost:3000'
    nasa_timeout_seconds: float = 75
    climate_start_year: int = 2020
    climate_end_year: int = 2024
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

settings = Settings()
