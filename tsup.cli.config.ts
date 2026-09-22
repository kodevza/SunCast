import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli/suncast.ts'],
  outDir: 'dist/cli',
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  dts: false,
  sourcemap: true,
  splitting: false,
})
