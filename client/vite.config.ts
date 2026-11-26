import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

/** Every page the app can open directly. Keep in step with the routes in src/App.tsx. */
const PAGES = [
  'onboarding',
  'app',
  ...['symposium', 'reflect', 'debate', 'council', 'hall', 'archive', 'oracle', 'train', 'landscape', 'mythinking', 'journal', 'profile', 'settings'].map(
    (p) => `app/${p}`,
  ),
]

/**
 * Static hosts answer "Not Found" when someone refreshes /app/hall, because no
 * such file exists. Copying index.html into a folder per page means every
 * address has a real file, so no host-side rewrite rule is needed.
 */
function pageCopies(): Plugin {
  let outDir = 'dist'
  return {
    name: 'page-copies',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    closeBundle() {
      const index = join(outDir, 'index.html')
      for (const page of PAGES) {
        mkdirSync(join(outDir, page), { recursive: true })
        copyFileSync(index, join(outDir, page, 'index.html'))
      }
      copyFileSync(index, join(outDir, '404.html'))
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), pageCopies()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
