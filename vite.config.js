import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  /** Allow REACT_APP_STRUCTURED_UR_TAKE alongside VITE_* for structured UR Take UI flag. */
  envPrefix: ["VITE_", "REACT_APP_"],
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
})
