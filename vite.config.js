import { resolve } from 'path';
import { defineConfig } from 'vite';

const pages = [
  'index',
  'marketplace',
  'search',
  'skill-detail',
  'create-skill',
  'login',
  'register',
  'dashboard',
  'matches',
  'messages',
  'sessions',
  'reviews',
  'profile',
  'settings',
  'admin',
];

export default defineConfig({
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        pages.map((name) => [name, resolve(__dirname, `${name}.html`)])
      ),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
