import { MapContainer, Polygon, TileLayer } from 'react-leaflet';
import { Parcel } from '../types/agroshift';

interface PolygonMiniMapProps {
  parcel: Parcel;
  heightClass?: string;
}

export function PolygonMiniMap({ parcel, heightClass = 'h-44' }: PolygonMiniMapProps) {
  const positions = parcel.polygon.map((p) => [p.lat, p.lng] as [number, number]);
  const center = parcel.measurement?.centroid ?? parcel.centroid;

  return (
    <div className={`w-full ${heightClass} rounded-2xl overflow-hidden border border-[var(--agro-line)] relative z-0`}>
      <MapContainer
        key={parcel.id}
        center={[center.lat, center.lng]}
        zoom={15}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        doubleClickZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {positions.length >= 3 && (
          <Polygon
            positions={positions}
            pathOptions={{
              color: '#166534',
              weight: 2.5,
              fillColor: '#16A34A',
              fillOpacity: 0.35,
            }}
          />
        )}
      </MapContainer>
      <div className="absolute bottom-2 left-2 z-[400] bg-[var(--agro-surface)] backdrop-blur-sm px-2.5 py-1 rounded-lg text-[11px] font-medium text-[var(--agro-text)] border border-[var(--agro-line)]/80">
        {parcel.measurement
          ? `Contorno medido · ${parcel.measurement.vertexCount} vértices`
          : 'Mapa base OSM · Polígono referencial'}
      </div>
    </div>
  );
}
