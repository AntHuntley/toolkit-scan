import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Maintainers only: `npm run build:ui` -> ../ui (served by server.mjs), `npm run build:single` -> ../ui-single (one
// self-contained HTML file used by share.mjs). Users get the committed build output.
const single = !!process.env.SINGLE
export default defineConfig({
  plugins: single ? [react(), viteSingleFile()] : [react()],
  build: { outDir: single ? '../ui-single' : '../ui', emptyOutDir: true },
  server: { proxy: { '/api': 'http://localhost:4747' } },
})
