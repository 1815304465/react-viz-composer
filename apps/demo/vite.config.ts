import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    conditions: ['development', 'import', 'module', 'browser', 'default'],
    // Prefer TypeScript sources (do not emit .js beside .ts under packages/*/src)
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.mts', '.json'],
  },
});
