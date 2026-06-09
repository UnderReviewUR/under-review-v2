import { copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const commitSha =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.VITE_COMMIT_SHA ||
  "unknown";

const buildTime = new Date().toISOString();

/** SPA entry for /worldcup — dev fallback + dist/worldcup/index.html on build. */
function worldcupRoutePlugin() {
  return {
    name: "worldcup-route",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const pathOnly = (req.url || "").split("?")[0].split("#")[0];
        if (pathOnly === "/worldcup" || pathOnly === "/worldcup/") {
          req.url = "/index.html";
        }
        next();
      });
    },
    closeBundle() {
      const distDir = join(process.cwd(), "dist");
      const src = join(distDir, "index.html");
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
  plugins: [react(), worldcupRoutePlugin()],
  /** Allow REACT_APP_STRUCTURED_UR_TAKE alongside VITE_* for structured UR Take UI flag. */
  envPrefix: ["VITE_", "REACT_APP_"],
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
