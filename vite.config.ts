import { defineConfig } from 'vite'
import { defaultIslandPort, multiplayer } from './server/multiplayer.ts'
import { workbenchSave } from './server/workbench-save.ts'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: defaultIslandPort,
    strictPort: true,
    // Vite replaces this list when configured, so keep its default exclusions.
    fs: { deny: ['.env', '.env.*', '*.{crt,pem,key,p12,pfx,cer,der}', '.npmrc', '.yarnrc.yml', '**/.git/**', '**/.mission-island/metrics/**'] },
  },
  preview: { host: '0.0.0.0', port: defaultIslandPort, strictPort: true },
  build: { rolldownOptions: { input: ['index.html', 'workbench.html', 'second-island.html'] } },
  plugins: [multiplayer(), workbenchSave(import.meta.dirname)],
})
