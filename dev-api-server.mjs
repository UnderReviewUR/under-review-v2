import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const port = Number(process.env.API_PORT || 3001);

/* Screenshots as base64 expand ~4/3 — keep headroom for nbaContext + history. */
app.use(express.json({ limit: "25mb" }));

async function loadHandler(routeName) {
  const filePath = path.join(__dirname, "api", `${routeName}.js`);
  const moduleUrl = pathToFileURL(filePath).href;
  const mod = await import(moduleUrl);
  return mod?.default;
}

app.all("/api/:route", async (req, res) => {
  try {
    const handler = await loadHandler(req.params.route);
    if (typeof handler !== "function") {
      return res.status(404).json({ error: "API route not found" });
    }
    return await handler(req, res);
  } catch (error) {
    if (error?.code === "ERR_MODULE_NOT_FOUND") {
      return res.status(404).json({ error: "API route not found" });
    }
    console.error(`[api] ${req.method} ${req.path} failed`, error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`[api] Local API server running on http://localhost:${port}`);
});
