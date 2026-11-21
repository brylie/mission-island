import { defineConfig } from 'vite'
import { defaultIslandPort, multiplayer } from './server/multiplayer.ts'

export default defineConfig({
  server: { host: '0.0.0.0', port: defaultIslandPort, strictPort: true },
  preview: { host: '0.0.0.0', port: defaultIslandPort, strictPort: true },
  build: { rolldownOptions: { input: ['index.html', 'workbench.html', 'second-island.html'] } },
  plugins: [multiplayer()],
})
