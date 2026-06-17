import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const commitSha =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.VITE_COMMIT_SHA ||
  "unknown";

const buildTime = new Date().toISOString();

/** Dev routing for multi-page build: /worldcup + SPA fallback to index.html. */
function worldcupRoutePlugin() {
  return {
    name: "worldcup-route",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const raw = req.url || "";
        const qIdx = raw.indexOf("?");
        const pathOnly = (qIdx === -1 ? raw : raw.slice(0, qIdx)).split("#")[0];
        const query = qIdx === -1 ? "" : raw.slice(qIdx);

        if (pathOnly === "/worldcup" || pathOnly === "/worldcup/") {
          req.url = `/worldcup.html${query}`;
          return next();
        }

        const isDevAsset =
          pathOnly.startsWith("/@") ||
          pathOnly.startsWith("/node_modules/") ||
          pathOnly.startsWith("/src/") ||
          pathOnly.startsWith("/api/") ||
          /\.[a-zA-Z0-9]+$/.test(pathOnly);

        if (!isDevAsset && pathOnly !== "/index.html") {
          req.url = `/index.html${query}`;
        }
        next();
      });
    },
    closeBundle() {
      const distDir = join(process.cwd(), "dist");
      const src = join(distDir, "worldcup.html");
      if (!existsSync(src)) return;
      const destDir = join(distDir, "worldcup");
      mkdirSync(destDir, { recursive: true });
      copyFileSync(src, join(destDir, "index.html"));
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
        worldcup: resolve(process.cwd(), "worldcup.html"),
      },
    },
  },
  plugins: [react(), worldcupRoutePlugin()],
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
