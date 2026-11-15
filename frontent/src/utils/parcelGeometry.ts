import area from '@turf/area';
import { polygon } from '@turf/helpers';
import {
  LatLngPoint,
  Parcel,
  ParcelBoundingBox,
  ParcelMeasurement,
} from '../types/agroshift';

/**
 * Geodesic helpers for measuring a parcel boundary drawn on the Leaflet map.
 *
 * The area is computed with Turf's spherical geodesic implementation. The
 * perimeter uses the haversine distance. Results are referential: they do not
 * replace a topographic survey, RTK/GNSS measurement or cadastral boundary.
 */

const EARTH_RADIUS_M = 6371008.8;
const METERS_PER_DEGREE_LAT = 111320;
const MIN_AREA_HA = 0.01;
const MAX_AREA_HA = 5000;
const MAX_VERTICES = 1000;
const DUPLICATE_DISTANCE_M = 0.05;

export interface ScanValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface GeometryAnalysis {
  ring: LatLngPoint[];
  areaM2: number;
  areaHa: number;
  perimeterM: number;
  centroid: LatLngPoint;
  bbox: ParcelBoundingBox;
  errors: string[];
  warnings: string[];
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function distanceMeters(a: LatLngPoint, b: LatLngPoint): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function isFinitePoint(point: LatLngPoint): boolean {
  return (
    Number.isFinite(point?.lat) &&
    Number.isFinite(point?.lng) &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    point.lng >= -180 &&
    point.lng <= 180
  );
}

function pointsAreNear(a: LatLngPoint, b: LatLngPoint): boolean {
  return distanceMeters(a, b) <= DUPLICATE_DISTANCE_M;
}

/**
 * Removes invalid coordinates, an optional closing vertex and consecutive
 * duplicate clicks. The returned ring is intentionally left unclosed so it can
 * be rendered by Leaflet and serialized later.
 */
export function normalizePolygonPoints(points: LatLngPoint[]): LatLngPoint[] {
  const finite = points
    .filter(isFinitePoint)
    .map((point) => ({
      lat: Number(point.lat.toFixed(6)),
      lng: Number(point.lng.toFixed(6)),
    }));

  if (finite.length > 3 && pointsAreNear(finite[0], finite[finite.length - 1])) {
    finite.pop();
  }

  return finite.filter(
    (point, index) => index === 0 || !pointsAreNear(finite[index - 1], point)
  );
}

function ringCoordinates(ring: LatLngPoint[]): [number, number][] {
  const coordinates = ring.map((point) => [point.lng, point.lat] as [number, number]);
  coordinates.push([ring[0].lng, ring[0].lat]);
  return coordinates;
}

function orientation(a: LatLngPoint, b: LatLngPoint, c: LatLngPoint): number {
  return (b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng);
}

function pointOnSegment(a: LatLngPoint, b: LatLngPoint, c: LatLngPoint): boolean {
  return (
    Math.min(a.lng, b.lng) - 1e-12 <= c.lng &&
    c.lng <= Math.max(a.lng, b.lng) + 1e-12 &&
    Math.min(a.lat, b.lat) - 1e-12 <= c.lat &&
    c.lat <= Math.max(a.lat, b.lat) + 1e-12
  );
}

function segmentsIntersect(
  a: LatLngPoint,
  b: LatLngPoint,
  c: LatLngPoint,
  d: LatLngPoint
): boolean {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);

  if (
    ((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) &&
    ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0))
  ) {
    return true;
  }

  if (Math.abs(o1) < 1e-12 && pointOnSegment(a, b, c)) return true;
  if (Math.abs(o2) < 1e-12 && pointOnSegment(a, b, d)) return true;
  if (Math.abs(o3) < 1e-12 && pointOnSegment(c, d, a)) return true;
  if (Math.abs(o4) < 1e-12 && pointOnSegment(c, d, b)) return true;
  return false;
}

function isSelfIntersecting(ring: LatLngPoint[]): boolean {
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    for (let j = i + 2; j < ring.length; j += 1) {
      // The last segment is adjacent to the first one and shares its vertex.
      if (i === 0 && j === ring.length - 1) continue;
      const c = ring[j];
      const d = ring[(j + 1) % ring.length];
      if (segmentsIntersect(a, b, c, d)) return true;
    }
  }
  return false;
}

function polygonCentroid(ring: LatLngPoint[]): LatLngPoint {
  let twiceArea = 0;
  let x = 0;
  let y = 0;

  for (let i = 0; i < ring.length; i += 1) {
    const current = ring[i];
    const next = ring[(i + 1) % ring.length];
    const cross = current.lng * next.lat - next.lng * current.lat;
    twiceArea += cross;
    x += (current.lng + next.lng) * cross;
    y += (current.lat + next.lat) * cross;
  }

  if (Math.abs(twiceArea) < 1e-14) {
    const average = ring.reduce(
      (acc, point) => ({ lat: acc.lat + point.lat, lng: acc.lng + point.lng }),
      { lat: 0, lng: 0 }
    );
    return {
      lat: Number((average.lat / ring.length).toFixed(6)),
      lng: Number((average.lng / ring.length).toFixed(6)),
    };
  }

  return {
    lat: Number((y / (3 * twiceArea)).toFixed(6)),
    lng: Number((x / (3 * twiceArea)).toFixed(6)),
  };
}

function polygonBoundingBox(ring: LatLngPoint[]): ParcelBoundingBox {
  return ring.reduce<ParcelBoundingBox>(
    (box, point) => ({
      minLat: Math.min(box.minLat, point.lat),
      minLng: Math.min(box.minLng, point.lng),
      maxLat: Math.max(box.maxLat, point.lat),
      maxLng: Math.max(box.maxLng, point.lng),
    }),
    {
      minLat: ring[0].lat,
      minLng: ring[0].lng,
      maxLat: ring[0].lat,
      maxLng: ring[0].lng,
    }
  );
}

function analyzePolygon(points: LatLngPoint[]): GeometryAnalysis | null {
  const rawValidPoints = points.filter(isFinitePoint);
  const ring = normalizePolygonPoints(points);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (rawValidPoints.length !== points.length) {
    errors.push('Algunas coordenadas están fuera del rango geográfico válido.');
  }

  const hasConsecutiveDuplicates = points.some(
    (point, index) =>
      index > 0 &&
      isFinitePoint(point) &&
      isFinitePoint(points[index - 1]) &&
      pointsAreNear(points[index - 1], point)
  );
  if (hasConsecutiveDuplicates) {
    warnings.push('Se ignoraron vértices duplicados consecutivos.');
  }

  if (ring.length < 3) {
    errors.push('Marca al menos 3 vértices para formar una superficie.');
    return {
      ring,
      areaM2: 0,
      areaHa: 0,
      perimeterM: 0,
      centroid: ring[0] ?? { lat: 0, lng: 0 },
      bbox: ring.length
        ? polygonBoundingBox(ring)
        : { minLat: 0, minLng: 0, maxLat: 0, maxLng: 0 },
      errors,
      warnings,
    };
  }

  if (ring.length > MAX_VERTICES) {
    errors.push(`El contorno supera el máximo de ${MAX_VERTICES} vértices.`);
  }

  if (isSelfIntersecting(ring)) {
    errors.push('El contorno se cruza a sí mismo. Corrige los vértices para continuar.');
  }

  const coordinates = ringCoordinates(ring);
  const areaM2 = area(polygon([coordinates]));
  const areaHa = areaM2 / 10000;
  const perimeterM = coordinates.slice(1).reduce((total, current, index) => {
    const previous = coordinates[index];
    return (
      total +
      distanceMeters(
        { lat: previous[1], lng: previous[0] },
        { lat: current[1], lng: current[0] }
      )
    );
  }, 0);

  if (!Number.isFinite(areaM2) || areaM2 <= 0) {
    errors.push('No se pudo calcular una superficie válida para este contorno.');
  } else if (areaHa < MIN_AREA_HA) {
    errors.push(`La superficie mínima medible es ${MIN_AREA_HA} ha.`);
  } else if (areaHa > MAX_AREA_HA) {
    errors.push(`La superficie máxima admitida es ${MAX_AREA_HA.toLocaleString('es-BO')} ha.`);
  }

  if (areaHa >= MIN_AREA_HA && areaHa < 0.1) {
    warnings.push('Parcela muy pequeña: el trazado manual puede tener mayor incertidumbre.');
  }
  if (ring.length > 100) {
    warnings.push('Contorno con muchos vértices: revisa que no haya puntos redundantes.');
  }
  if (areaHa > 1000) {
    warnings.push('Superficie extensa: verifica la escala y el cierre del contorno.');
  }

  return {
    ring,
    areaM2,
    areaHa,
    perimeterM,
    centroid: polygonCentroid(ring),
    bbox: polygonBoundingBox(ring),
    errors,
    warnings,
  };
}

/**
 * Validates a drawn boundary before it is saved or used in the analysis.
 */
export function validateParcelPolygon(points: LatLngPoint[]): ScanValidation {
  const analysis = analyzePolygon(points);
  if (!analysis) {
    return {
      valid: false,
      errors: ['No hay coordenadas para medir.'],
      warnings: [],
    };
  }
  return {
    valid: analysis.errors.length === 0,
    errors: analysis.errors,
    warnings: analysis.warnings,
  };
}

/**
 * Returns the geodesic measurement for a boundary, or null when there are not
 * enough points to build a polygon. The returned valid flag reflects the
 * validation result.
 */
export function measurePolygon(points: LatLngPoint[]): ParcelMeasurement | null {
  const analysis = analyzePolygon(points);
  if (!analysis || analysis.ring.length < 3) return null;

  return {
    areaM2: Math.round(analysis.areaM2 * 100) / 100,
    areaHa: Number(analysis.areaHa.toFixed(4)),
    perimeterM: Math.round(analysis.perimeterM * 10) / 10,
    vertexCount: analysis.ring.length,
    centroid: analysis.centroid,
    bbox: analysis.bbox,
    measuredAt: new Date().toISOString(),
    source: 'drawn',
    valid: analysis.errors.length === 0,
    warnings: analysis.warnings,
  };
}

/**
 * Single source of truth for the area used by every metric in the app.
 */
export function getParcelAreaHa(parcel: Parcel): number {
  return parcel.measurement?.areaHa ?? parcel.areaHa;
}

/**
 * Approximate square used only as a visual reference when the user declares an
 * area manually and does not draw a boundary. It is never marked as measured.
 */
export function createReferencePolygon(
  centroid: LatLngPoint,
  areaHa: number
): LatLngPoint[] {
  const sideMeters = Math.sqrt(Math.max(areaHa, 0.0001) * 10000);
  const halfSide = sideMeters / 2;
  const deltaLat = halfSide / METERS_PER_DEGREE_LAT;
  const cosine = Math.max(0.01, Math.cos(toRadians(centroid.lat)));
  const deltaLng = halfSide / (METERS_PER_DEGREE_LAT * cosine);

  return [
    { lat: centroid.lat + deltaLat, lng: centroid.lng - deltaLng },
    { lat: centroid.lat + deltaLat, lng: centroid.lng + deltaLng },
    { lat: centroid.lat - deltaLat, lng: centroid.lng + deltaLng },
    { lat: centroid.lat - deltaLat, lng: centroid.lng - deltaLng },
  ];
}

export function polygonToGeoJson(points: LatLngPoint[]): {
  type: 'Polygon';
  coordinates: number[][][];
} {
  const ring = normalizePolygonPoints(points);
  if (ring.length < 3) {
    return { type: 'Polygon', coordinates: [] };
  }
  return { type: 'Polygon', coordinates: [ringCoordinates(ring)] };
}

export function formatSquareMeters(areaM2: number): string {
  return `${new Intl.NumberFormat('es-BO', {
    maximumFractionDigits: 0,
  }).format(Math.max(0, areaM2))} m²`;
}

export function formatAreaHa(areaHa: number): string {
  const fractionDigits = areaHa > 0 && areaHa < 1 ? 4 : 2;
  return `${new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: fractionDigits,
  }).format(Math.max(0, areaHa))} ha`;
}

export function formatPerimeter(perimeterM: number): string {
  if (perimeterM >= 1000) {
    return `${(perimeterM / 1000).toLocaleString('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} km`;
  }
  return `${new Intl.NumberFormat('es-BO', {
    maximumFractionDigits: 0,
  }).format(Math.max(0, perimeterM))} m`;
}
