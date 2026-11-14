export type Theme = 'light' | 'dark';
export type ThemePreference = Theme | 'system';
// v2 defaults existing installations to the new System mode as well.
export const THEME_KEY = 'agroterra_theme_v2';
const listeners = new Set<() => void>();
let preference: ThemePreference = 'system';

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_KEY);
    if (value === 'light' || value === 'dark') return value;
  } catch { /* The app also works without storage access. */ }
  return 'system';
}
export function getThemePreference() { return preference; }
export function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function applyTheme() {
  const theme = preference === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : preference;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  listeners.forEach(listener => listener());
}
export function setThemePreference(value: ThemePreference) {
  preference = value;
  try { localStorage.setItem(THEME_KEY, value); } catch { /* Session only. */ }
  applyTheme();
}
export function initializeTheme() {
  preference = readPreference();
  applyTheme();
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const onSystemChange = () => { if (preference === 'system') applyTheme(); };
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_KEY || event.key === null) {
      preference = readPreference();
      applyTheme();
    }
  };
  media.addEventListener('change', onSystemChange);
  window.addEventListener('storage', onStorage);
  return () => {
    media.removeEventListener('change', onSystemChange);
    window.removeEventListener('storage', onStorage);
  };
}
