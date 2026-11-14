import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { applyTheme, initialTheme, THEME_KEY, type Theme } from '../theme/theme';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch { /* Keep session preference. */ }
  }
  return (
    <div className="theme-toolbar">
      <button type="button" className="theme-toggle" onClick={toggle}
        aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
        aria-pressed={theme === 'dark'}>
        {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
        <span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
      </button>
    </div>
  );
}
