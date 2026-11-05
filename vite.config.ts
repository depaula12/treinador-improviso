import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// versão do build (aparece no registro de erros): commit na Vercel ou a data do build
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {}
const build = env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? new Date().toISOString().slice(0, 16).replace('T', ' ')

export default defineConfig({
  plugins: [react()],
  server: { host: true },
  define: { __BUILD__: JSON.stringify(build) },
})
