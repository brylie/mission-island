import { defineConfig } from 'vite'
import { defaultIslandPort, multiplayer } from './server/multiplayer.ts'
import { notesDirectory } from './server/playtest-marks.ts'
import { workbenchSave } from './server/workbench-save.ts'

// Playtest marks are written while the game runs. They are not source, and LAN clients must not
// download them, so the dev server neither serves nor watches them, wherever they are configured.
const playtestNotes = ['**/playtest-notes/**', `${notesDirectory(import.meta.dirname)}/**`]

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: defaultIslandPort,
    strictPort: true,
    // Vite replaces this list when configured, so keep its default exclusions.
    fs: { deny: ['.env', '.env.*', '*.{crt,pem,key,p12,pfx,cer,der}', '.npmrc', '.yarnrc.yml', '**/.git/**', '**/.mission-island/metrics/**', ...playtestNotes] },
    watch: { ignored: playtestNotes },
  },
  preview: { host: '0.0.0.0', port: defaultIslandPort, strictPort: true },
  build: { rolldownOptions: { input: ['index.html', 'workbench.html', 'second-island.html'] } },
  plugins: [multiplayer(), workbenchSave(import.meta.dirname)],
})
