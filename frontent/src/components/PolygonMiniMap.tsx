import { MapContainer, Polygon, TileLayer } from 'react-leaflet';
import { Parcel } from '../types/agroterra';

interface PolygonMiniMapProps {
  parcel: Parcel;
  heightClass?: string;
}

export function PolygonMiniMap({ parcel, heightClass = 'h-44' }: PolygonMiniMapProps) {
  const positions = parcel.polygon.map((p) => [p.lat, p.lng] as [number, number]);

  return (
    <div className={`w-full ${heightClass} rounded-2xl overflow-hidden border border-slate-200 relative z-0`}>
      <MapContainer
        key={parcel.id}
        center={[parcel.centroid.lat, parcel.centroid.lng]}
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
      <div className="absolute bottom-2 left-2 z-[400] bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-700 border border-slate-200/80">
        Mapa base OSM · Polígono referencial
      </div>
    </div>
  );
}
