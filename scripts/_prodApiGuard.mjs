/** Default local API when running `npm run dev:api` (see dev-api-server.mjs). */
export const DEFAULT_LOCAL_API_BASE = "http://127.0.0.1:3001";

/**
 * @param {string} base
 */
export function isProdApiBase(base) {
  try {
    const host = new URL(String(base || "").trim()).hostname.toLowerCase();
    if (host === "under-review.app" || host === "www.under-review.app") return true;
    if (host.endsWith(".vercel.app")) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * @param {{ argv?: string[], defaultBase?: string }} [opts]
 */
export function resolveScriptApiBase(opts = {}) {
  const argv = opts.argv || process.argv;
  const baseArgEq = argv.find((a) => a.startsWith("--base="))?.slice(7);
  const baseIdx = argv.indexOf("--base");
  const fromFlag = baseArgEq || (baseIdx >= 0 ? argv[baseIdx + 1] : null);
  const base = String(fromFlag || opts.defaultBase || DEFAULT_LOCAL_API_BASE).trim();
  return base.replace(/\/$/, "");
}

/**
 * Exit unless `--allow-prod` when targeting production (burns Anthropic credits).
 * @param {string} base
 * @param {{ argv?: string[], scriptName?: string }} [opts]
 */
export function enforceProdApiGuard(base, opts = {}) {
  if (!isProdApiBase(base)) return base;
  const argv = opts.argv || process.argv;
  if (argv.includes("--allow-prod")) return base;
  const name = opts.scriptName || "script";
  console.error(`[${name}] Refusing production API (${base}).`);
  console.error("  Audit/smoke scripts call Sonnet on every question — use local dev API or pass --allow-prod.");
  console.error(`  Local: npm run dev:api  →  --base ${DEFAULT_LOCAL_API_BASE}`);
  process.exit(1);
}
