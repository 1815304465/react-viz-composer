import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        mockData: resolve(__dirname, 'src/mockData.ts'),
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@react-viz-composer/core',
        '@react-viz-composer/components',
        '@react-viz-composer/utilities',
      ],
      output: {
        exports: 'named',
      },
    },
  },
});
