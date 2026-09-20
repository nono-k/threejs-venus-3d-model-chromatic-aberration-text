import path from 'node:path';
import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  base: '/threejs-text-hover-display-3d-model/',
  root: 'src/',
  publicDir: '../public/',
  plugins: [glsl()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
