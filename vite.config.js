import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const commitSha =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.VITE_COMMIT_SHA ||
  'unknown'

const buildTime = new Date().toISOString()

export default defineConfig({
  define: {
    'import.meta.env.VITE_COMMIT_SHA': JSON.stringify(commitSha),
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(buildTime),
  },
  plugins: [react()],
  /** Allow REACT_APP_STRUCTURED_UR_TAKE alongside VITE_* for structured UR Take UI flag. */
  envPrefix: ["VITE_", "REACT_APP_"],
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
})
