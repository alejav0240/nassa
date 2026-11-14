import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('System default, live changes, overrides, persistence and cleanup', async () => {
  const values = new Map();
  const handlers = new Map();
  const media = { matches: false, addEventListener: (key, fn) => handlers.set(key, fn), removeEventListener: key => handlers.delete(key) };
  globalThis.localStorage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  globalThis.document = { documentElement: { dataset: {}, style: {} } };
  globalThis.window = { matchMedia: () => media, addEventListener: (key, fn) => handlers.set(key, fn), removeEventListener: key => handlers.delete(key) };
  const theme = await import('../src/theme/theme.ts');
  const dispose = theme.initializeTheme();
  assert.equal(theme.getThemePreference(), 'system');
  assert.equal(document.documentElement.dataset.theme, 'light');
  media.matches = true; handlers.get('change')();
  assert.equal(document.documentElement.dataset.theme, 'dark');
  theme.setThemePreference('light'); handlers.get('change')();
  assert.equal(document.documentElement.dataset.theme, 'light');
  dispose(); const disposeAgain = theme.initializeTheme();
  assert.equal(theme.getThemePreference(), 'light');
  theme.setThemePreference('system');
  assert.equal(document.documentElement.dataset.theme, 'dark');
  values.set(theme.THEME_KEY, 'light'); handlers.get('storage')({ key: theme.THEME_KEY });
  assert.equal(document.documentElement.dataset.theme, 'light');
  localStorage.setItem = () => { throw new Error('storage unavailable'); };
  theme.setThemePreference('dark');
  assert.equal(document.documentElement.dataset.theme, 'dark');
  disposeAgain(); assert.equal(handlers.size, 0);
});

test('Semantic notice colors meet 4.5:1 text contrast in both themes', () => {
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  const section = css.split('/* Semantic foreground/background pairs')[1];
  const luminance = hex => {
    const channels = hex.match(/\w\w/g).map(x => parseInt(x, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  };
  const pairs = [...section.matchAll(/--agro-\w+-bg: #([\da-f]{6}); --agro-\w+-text: #([\da-f]{6})/g)];
  assert.equal(pairs.length, 8);
  for (const [, bg, fg] of pairs) {
    const a = luminance(bg), b = luminance(fg);
    assert.ok((Math.max(a,b) + .05) / (Math.min(a,b) + .05) >= 4.5, `${fg} on ${bg}`);
  }
});
