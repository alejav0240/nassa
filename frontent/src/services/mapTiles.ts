export type MapTheme = 'light' | 'dark';

const cartoKey = (import.meta.env.VITE_CARTO_API_KEY as string | undefined)?.trim();

function withKey(url: string): string {
  return cartoKey ? `${url}?key=${encodeURIComponent(cartoKey)}` : url;
}

export function getBaseMapTileUrl(theme: MapTheme): string {
  if (!cartoKey) return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const style = theme === 'dark' ? 'dark_all' : 'light_all';
  return withKey(`https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png`);
}

export function getBaseMapAttribution(): string {
  return cartoKey
    ? '&copy; OpenStreetMap contributors &copy; CARTO'
    : '&copy; OpenStreetMap contributors';
}
