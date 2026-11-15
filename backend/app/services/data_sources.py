"""Official agricultural and Earth-observation source registry.

This module deliberately separates a source being documented, reachable, and
actually used in a calculation. A public landing page is not treated as a
measurement, and unavailable data is never replaced with a fabricated value.
"""
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote

import httpx


@dataclass(frozen=True)
class SourceSpec:
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


SOURCE_REGISTRY = (
    SourceSpec('NASA_POWER', 'NASA POWER', 'NASA', 'Clima histórico', 'API REST', 'https://power.larc.nasa.gov/api/temporal/daily/point', 'nasa_power', 'connected', '0.5° aprox.', 'Diaria', 'Estimación gridded; no es una medición puntual de la parcela.'),
    SourceSpec('ECOCROP', 'ECOCROP', 'FAO', 'Requisitos ecológicos por cultivo', 'Portal + dataset', 'https://gaez.fao.org/pages/ecocrop', 'ecocrop_catalog', 'adapter_available', None, 'Estática', 'El dataset requiere descarga, normalización y validación de nombres de cultivos.'),
    SourceSpec('GAEZ', 'GAEZ', 'FAO/IIASA', 'Aptitud agroecológica', 'Portal geoespacial', 'https://gaez.fao.org/', 'gaez_catalog', 'adapter_available', 'Raster global', 'Multitemporal', 'La aptitud no equivale a rendimiento observado en una parcela.'),
    SourceSpec('SoilGrids', 'SoilGrids', 'ISRIC', 'Propiedades del suelo', 'WCS', 'https://maps.isric.org/', 'soilgrids_wcs', 'adapter_available', '250 m', 'Base 2020', 'Requiere extraer y convertir coberturas WCS; validar con laboratorio local.'),
    SourceSpec('FAOSTAT', 'FAOSTAT', 'FAO', 'Producción, superficie y rendimiento', 'API/bulk download', 'https://www.fao.org/faostat/en/', 'faostat_bulk', 'adapter_available', 'Nacional', 'Anual', 'Series nacionales/regionales; no predicen el rendimiento de una parcela.'),
    SourceSpec('INE_BOLIVIA', 'INE Bolivia', 'INE', 'Estadística agrícola nacional', 'Descarga oficial', 'https://www.ine.gob.bo/index.php/estadisticas-economicas/agropecuaria/agricultura-cuadros-estadisticos/', 'ine_download', 'adapter_available', 'Departamental', 'Anual', 'Los cuadros publicados requieren ETL y control de cambios.'),
    SourceSpec('OAP', 'OAP', 'MDRyT Bolivia', 'Producción agrícola territorial', 'Portal oficial', 'https://oap.produccion.gob.bo/ano-civil/', 'oap_download', 'adapter_available', 'Territorial', 'Anual', 'La disponibilidad y formato pueden variar por gestión.'),
    SourceSpec('SIIP', 'SIIP', 'MDRyT Bolivia', 'Producción y potencial productivo', 'Descarga Excel', 'https://siip.produccion.gob.bo/repSIIP2/sitap_descarga_excel.php', 'siip_download', 'adapter_available', 'Municipal/departamental', 'Anual', 'Requiere normalización de hojas y metadatos antes de mezclar series.'),
    SourceSpec('SMAP', 'SMAP', 'NASA', 'Humedad superficial del suelo', 'NASA CMR metadata', 'https://cmr.earthdata.nasa.gov/search/collections.json', 'nasa_cmr', 'metadata_available', '9 km aprox.', 'Diaria', 'Resolución insuficiente para muchas parcelas pequeñas; productos requieren Earthdata.'),
    SourceSpec('GPM', 'GPM IMERG', 'NASA/JAXA', 'Precipitación satelital', 'NASA CMR metadata', 'https://cmr.earthdata.nasa.gov/search/collections.json', 'nasa_cmr', 'metadata_available', '10 km aprox.', '30 min', 'El acceso a granules puede requerir Earthdata y control de calidad temporal.'),
    SourceSpec('Landsat', 'Landsat', 'NASA/USGS', 'Reflectancia y vegetación', 'NASA CMR metadata', 'https://cmr.earthdata.nasa.gov/search/collections.json', 'nasa_cmr', 'metadata_available', '30 m', '8–16 días', 'Nubes, máscaras QA y procesamiento de composiciones aún no están integrados.'),
    SourceSpec('MODIS', 'MODIS', 'NASA', 'Vegetación y temperatura', 'NASA CMR metadata', 'https://cmr.earthdata.nasa.gov/search/collections.json', 'nasa_cmr', 'metadata_available', '250–1000 m', 'Diaria–16 días', 'La resolución espacial limita el uso directo en parcelas pequeñas.'),
    SourceSpec('ECOSTRESS', 'ECOSTRESS', 'NASA/JPL', 'Temperatura y estrés hídrico', 'NASA CMR metadata', 'https://cmr.earthdata.nasa.gov/search/collections.json', 'nasa_cmr', 'metadata_available', '~70 m', 'Irregular', 'Cobertura irregular y acceso a productos mediante Earthdata.'),
    SourceSpec('GEDI', 'GEDI', 'NASA', 'Estructura/biomasa', 'NASA CMR metadata', 'https://cmr.earthdata.nasa.gov/search/collections.json', 'nasa_cmr', 'metadata_available', 'Huellas', 'Irregular', 'No es una medición continua ni un rendimiento agrícola.'),
)

CMR_KEYWORDS = {
    'SMAP': 'SMAP soil moisture', 'GPM': 'GPM IMERG', 'Landsat': 'Landsat',
    'MODIS': 'MODIS land', 'ECOSTRESS': 'ECOSTRESS', 'GEDI': 'GEDI',
}


def list_sources() -> list[dict[str, Any]]:
    return [asdict(source) for source in SOURCE_REGISTRY]


def _cmr_url(source_id: str) -> str:
    return 'https://cmr.earthdata.nasa.gov/search/collections.json?keyword=' + quote(CMR_KEYWORDS[source_id]) + '&page_size=1'


async def probe_source(source_id: str, timeout: float = 12) -> dict[str, Any]:
    source = next((item for item in SOURCE_REGISTRY if item.id == source_id), None)
    if source is None:
        raise ValueError(f'Fuente desconocida: {source_id}')
    url = _cmr_url(source_id) if source.adapter == 'nasa_cmr' else source.official_url
    checked_at = datetime.now(timezone.utc).isoformat()
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            response = await client.get(url, headers={'User-Agent': 'AgroShift-AI/0.3 source-check'})
            response.raise_for_status()
        return {'id': source.id, 'reachable': True, 'checked_at': checked_at, 'http_status': response.status_code, 'detail': 'Fuente oficial respondió; esto valida acceso, no la calidad del dato.'}
    except (httpx.HTTPError, ValueError) as exc:
        return {'id': source.id, 'reachable': False, 'checked_at': checked_at, 'http_status': None, 'detail': f'No se pudo verificar la fuente: {str(exc)[:180]}'}
