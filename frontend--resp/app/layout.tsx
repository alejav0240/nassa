import './globals.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'AgroShift AI | NASA Space Apps', description: 'Decisiones de rotación agrícola respaldadas por observaciones NASA' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="es"><body>{children}</body></html>; }
