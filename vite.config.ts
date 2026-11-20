import { defineConfig } from 'vite'
import { multiplayer } from './server/game.ts'

export default defineConfig({
  server: { host: '0.0.0.0', port: 5173, strictPort: true },
  preview: { host: '0.0.0.0', port: 5173, strictPort: true },
  plugins: [multiplayer()],
})
