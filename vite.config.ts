import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import istanbul from 'vite-plugin-istanbul'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const plugins = [react()]
  if (mode === 'coverage') {
    plugins.push(
      istanbul({
        include: 'src/**/*',
        extension: ['.js', '.ts', '.tsx'],
        requireEnv: false,
      }),
    )
  }

  return {
    plugins,
  }
})
