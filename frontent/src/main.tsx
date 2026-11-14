import 'leaflet/dist/leaflet.css';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { applyTheme, initialTheme } from './theme/theme';
import './index.css';

applyTheme(initialTheme());

createRoot(document.getElementById('root')!).render(<App />);
