import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/core/index.ts'],
  outDir: 'dist',
  clean: true,
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  dts: true,
  sourcemap: true,
  splitting: false,
})
