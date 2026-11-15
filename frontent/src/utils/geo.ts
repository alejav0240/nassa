import area from '@turf/area';
import { polygon } from '@turf/helpers';
import { LatLngPoint, SatelliteSourceSpec } from '../types/agroshift';

/**
 * Calculates approximate polygon area in hectares using Turf.js geodesic calculation.
 */
export function calculatePolygonAreaHa(points: LatLngPoint[]): number {
  if (points.length < 3) return 0;
  try {
    const ring = points.map((p) => [p.lng, p.lat]);
    // Close ring for GeoJSON polygon
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push([first[0], first[1]]);
    }
    const geoPolygon = polygon([ring]);
    const squareMeters = area(geoPolygon);
    const hectares = squareMeters / 10000;
    return Math.round(hectares * 100) / 100;
  } catch {
    return 0;
  }
}

/**
 * Calculates geometric centroid of a polygon.
 */
export function calculateCentroid(points: LatLngPoint[]): LatLngPoint {
  if (points.length === 0) {
    return { lat: -16.652, lng: -68.295 };
  }
  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 }
  );
  return {
    lat: Number((sum.lat / points.length).toFixed(5)),
    lng: Number((sum.lng / points.length).toFixed(5)),
  };
}

/**
 * Formats coordinates in clean decimal degrees with hemisphere markers.
 */
export function formatCoordinates(point: LatLngPoint): string {
  const latDir = point.lat >= 0 ? 'N' : 'S';
  const lngDir = point.lng >= 0 ? 'E' : 'O';
  return `${Math.abs(point.lat).toFixed(4)}° ${latDir}, ${Math.abs(point.lng).toFixed(4)}° ${lngDir}`;
}

/**
 * Checks whether a parcel is smaller than a satellite sensor's native pixel footprint.
 */
export function checkSpatialRepresentativeness(
  parcelAreaHa: number,
  source: SatelliteSourceSpec
): {
  isSufficient: boolean;
  pixelAreaHa: number;
  ratioText: string;
  explanation: string;
} {
  const parcelM2 = parcelAreaHa * 10000;
  const pixelM2 = source.spatialResolutionMeters * source.spatialResolutionMeters;
  const pixelAreaHa = Math.round((pixelM2 / 10000) * 100) / 100;

  if (parcelM2 < pixelM2) {
    const coveragePct = ((parcelM2 / pixelM2) * 100).toFixed(3);
    return {
      isSufficient: false,
      pixelAreaHa,
      ratioText: `${parcelAreaHa.toFixed(2)} ha frente a píxel de ~${pixelAreaHa.toLocaleString('es-BO')} ha`,
      explanation: `La parcela cubre aproximadamente ${coveragePct}% de un píxel nativo de ${source.name} (${source.spatialResolution}). El valor mostrado representa una referencia regional con mezcla de coberturas vecinas; el remuestreo no aumenta la resolución física real del sensor.`,
    };
  }

  return {
    isSufficient: true,
    pixelAreaHa,
    ratioText: `${parcelAreaHa.toFixed(2)} ha con cobertura de píxel ${source.spatialResolution}`,
    explanation: `La extensión de la parcela permite muestrear al menos un píxel nativo de ${source.name} (${source.spatialResolution}), aunque siempre se recomienda validación en terreno.`,
  };
}
