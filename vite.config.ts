import { defineConfig } from 'vite'
import { multiplayer } from './server/multiplayer.ts'

export default defineConfig({
  server: { host: '0.0.0.0', port: 5173, strictPort: true },
  preview: { host: '0.0.0.0', port: 5173, strictPort: true },
  build: { rolldownOptions: { input: ['index.html', 'workbench.html', 'second-island.html'] } },
  plugins: [multiplayer()],
})
