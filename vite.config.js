import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const commitSha =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.VITE_COMMIT_SHA ||
  "unknown";

const buildTime = new Date().toISOString();

/** Dev SPA fallback to index.html (API + Vite assets excluded). */
function spaFallbackPlugin() {
  return {
    name: "spa-fallback",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const raw = req.url || "";
        const qIdx = raw.indexOf("?");
        const pathOnly = (qIdx === -1 ? raw : raw.slice(0, qIdx)).split("#")[0];

        const isDevAsset =
          pathOnly.startsWith("/@") ||
          pathOnly.startsWith("/node_modules/") ||
          pathOnly.startsWith("/src/") ||
          pathOnly.startsWith("/api/") ||
          /\.[a-zA-Z0-9]+$/.test(pathOnly);

        if (!isDevAsset && pathOnly !== "/index.html") {
          req.url = `/index.html${qIdx === -1 ? "" : raw.slice(qIdx)}`;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  define: {
    "import.meta.env.VITE_COMMIT_SHA": JSON.stringify(commitSha),
    "import.meta.env.VITE_BUILD_TIME": JSON.stringify(buildTime),
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), "index.html"),
      },
    },
  },
  plugins: [react(), spaFallbackPlugin()],
  /** Allow REACT_APP_STRUCTURED_UR_TAKE alongside VITE_* for structured UR Take UI flag. */
  envPrefix: ["VITE_", "REACT_APP_"],
  server: {
    host: true,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
  preview: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
