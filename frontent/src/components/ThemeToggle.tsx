import { useSyncExternalStore } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { getThemePreference, setThemePreference, subscribeTheme, type ThemePreference } from '../theme/theme';

export function ThemeToggle() {
  const preference = useSyncExternalStore(subscribeTheme, getThemePreference);
  const Icon = preference === 'system' ? Monitor : preference === 'dark' ? Moon : Sun;
  return (
    <div className="theme-toolbar">
      <label className="theme-toggle">
        <Icon size={18} aria-hidden="true" />
        <span>Apariencia</span>
        <select aria-label="Apariencia" value={preference}
          onChange={event => setThemePreference(event.target.value as ThemePreference)}>
          <option value="system">Sistema</option>
          <option value="light">Claro</option>
          <option value="dark">Oscuro</option>
        </select>
      </label>
    </div>
  );
}
