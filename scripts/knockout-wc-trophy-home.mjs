/**
 * Strip studio black from public/wc-trophy-home.png → trimmed RGBA PNG.
 * Run: node scripts/knockout-wc-trophy-home.mjs
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(__dirname, "../public/wc-trophy-home.png");
const tmp = `${src}.tmp`;

if (!fs.existsSync(src)) {
  console.error("Missing", src);
  process.exit(1);
}

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const lum = Math.max(r, g, b);
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  // Near-black studio backdrop: low luminance and little color.
  if (lum < 36 && chroma < 28) data[i + 3] = 0;
  else if (lum < 64 && chroma < 36) data[i + 3] = Math.round(((lum - 36) / 28) * 255);
}

let minX = info.width;
let minY = info.height;
let maxX = 0;
let maxY = 0;

for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4;
    if (data[i + 3] < 12) continue;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
}

const pad = 4;
const left = Math.max(0, minX - pad);
const top = Math.max(0, minY - pad);
const width = Math.min(info.width - left, maxX - minX + 1 + pad * 2);
const height = Math.min(info.height - top, maxY - minY + 1 + pad * 2);

await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .extract({ left, top, width, height })
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(tmp);

fs.renameSync(tmp, src);
console.log("Updated", src, `${width}x${height} RGBA (cropped from ${info.width}x${info.height})`);
