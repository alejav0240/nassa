import type { Config } from 'tailwindcss';
const config: Config = { content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'], theme: { extend: { colors: { ink:'#0e2422', forest:'#166a4c', mint:'#d9f2e4', cream:'#f5f7f1' } } }, plugins: [] };
export default config;
