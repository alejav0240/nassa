import 'leaflet/dist/leaflet.css';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { initializeTheme } from './theme/theme';
import './index.css';

const disposeTheme = initializeTheme();
if (import.meta.hot) import.meta.hot.dispose(disposeTheme);

createRoot(document.getElementById('root')!).render(<App />);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
      console.error('No se pudo activar la instalación sin conexión:', error);
    });
  });
}
