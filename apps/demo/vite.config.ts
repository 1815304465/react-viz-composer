import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    conditions: ['development', 'import', 'module', 'browser', 'default'],
    // Prefer TypeScript sources over stale tsc-emitted .js in packages/*/src
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.mts', '.json'],
  },
});
