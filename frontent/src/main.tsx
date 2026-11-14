import 'leaflet/dist/leaflet.css';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { initializeTheme } from './theme/theme';
import './index.css';

const disposeTheme = initializeTheme();
if (import.meta.hot) import.meta.hot.dispose(disposeTheme);

createRoot(document.getElementById('root')!).render(<App />);
