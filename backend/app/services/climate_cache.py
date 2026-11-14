"""Persistent cache with bounded, per-process coordination of NASA requests."""
from copy import deepcopy
from threading import Lock
import anyio
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from ..models import ClimateCache

# Fixed memory usage; unrelated keys can occasionally share a lock.
_LOCKS = tuple(Lock() for _ in range(64))

def get_climate(db: Session, latitude: float, longitude: float,
                start_year: int, end_year: int, timeout: float, fetcher) -> dict:
    key = (latitude, longitude, start_year, end_year)
    query = select(ClimateCache).where(
        ClimateCache.grid_lat == latitude, ClimateCache.grid_lon == longitude,
        ClimateCache.start_year == start_year, ClimateCache.end_year == end_year)
    # Caller must release its read transaction before waiting for another request.
    with _LOCKS[hash(key) % len(_LOCKS)]:
        cache = db.scalar(query)
        if cache and cache.payload.get('summary_version') == 2:
            return deepcopy(cache.payload)
        # Do not hold a database connection during a slow remote HTTP request.
        db.commit()
        climate = anyio.run(fetcher, latitude, longitude, start_year, end_year, timeout)
        if cache:
            cache.payload = deepcopy(climate)
        else:
            db.add(ClimateCache(grid_lat=latitude, grid_lon=longitude,
                start_year=start_year, end_year=end_year, payload=deepcopy(climate)))
        try:
            db.commit()
        except IntegrityError:
            # Multiple server processes still rely on the database unique constraint.
            db.rollback()
            cache = db.scalar(query)
            if cache is None:
                raise
            return deepcopy(cache.payload)
        return climate
