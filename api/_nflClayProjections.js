/**
 * Mike Clay–style projection layer for NFL Ask.
 * KV overlay (cron/ingest) wins over bundled seed when fresher.
 */
import { getDurableJson, setDurableJson } from "./_durableStore.js";
import {
  NFL_CLAY_INJURY_RULE,
  NFL_CLAY_PROJECTIONS_SEED,
} from "./data/nfl-clay-projections.js";

export const NFL_CLAY_KV_KEY = "nfl_clay_projections";
export const NFL_CLAY_STALE_DAYS = 16;

/**
 * @param {unknown} raw
 * @returns {{ ok: true, bundle: object } | { ok: false, error: string }}
 */
export function validateNflClayBundle(raw) {
  if (!raw || typeof raw !== "object") return { ok: false, error: "bundle must be an object" };
  const players = raw.players;
  if (!players || typeof players !== "object" || Array.isArray(players)) {
    return { ok: false, error: "players map required" };
  }
  const names = Object.keys(players);
  if (names.length < 5) return { ok: false, error: "need at least 5 player projections" };
  for (const name of names.slice(0, 40)) {
    const row = players[name];
    if (!row || typeof row !== "object") {
      return { ok: false, error: `invalid row for ${name}` };
    }
  }
  return {
    ok: true,
    bundle: {
      asOf: String(raw.asOf || new Date().toISOString().slice(0, 10)),
      source: String(raw.source || "ingest"),
      sourceLabel: String(raw.sourceLabel || "internal role/volume prior"),
      injuryRule: String(raw.injuryRule || NFL_CLAY_INJURY_RULE),
      players: { ...players },
      updatedAt: String(raw.updatedAt || new Date().toISOString()),
    },
  };
}

/**
 * @returns {Promise<{ bundle: object, source: "kv"|"seed", stale: boolean, ageDays: number|null }>}
 */
export async function loadNflClayProjections() {
  let kv = null;
  try {
    kv = await getDurableJson(NFL_CLAY_KV_KEY);
  } catch {
    kv = null;
  }
  const validated = kv ? validateNflClayBundle(kv) : { ok: false };
  const bundle = validated.ok ? validated.bundle : { ...NFL_CLAY_PROJECTIONS_SEED };
  const source = validated.ok ? "kv" : "seed";
  const asOfMs = Date.parse(String(bundle.asOf || ""));
  const ageDays = Number.isFinite(asOfMs)
    ? Math.floor((Date.now() - asOfMs) / (24 * 60 * 60 * 1000))
    : null;
  const stale = ageDays == null || ageDays > NFL_CLAY_STALE_DAYS;
  return { bundle, source, stale, ageDays };
}

/**
 * @param {object} bundle
 */
export async function persistNflClayProjections(bundle) {
  const validated = validateNflClayBundle(bundle);
  if (!validated.ok) throw new Error(validated.error);
  await setDurableJson(NFL_CLAY_KV_KEY, validated.bundle, { ttlSeconds: 60 * 60 * 24 * 60 });
  return validated.bundle;
}

/**
 * @param {string[]} playerNames
 * @param {number} [limit]
 */
export function formatClayContextForPlayers(playerNames, limit = 4, bundle = NFL_CLAY_PROJECTIONS_SEED) {
  const names = (playerNames || []).map((n) => String(n || "").trim()).filter(Boolean);
  const players = bundle?.players || {};
  const lines = [];
  for (const name of names) {
    const row = players[name];
    if (!row) continue;
    const bits = [];
    if (row.passYds != null) bits.push(`passYds ${row.passYds}`);
    if (row.passTd != null) bits.push(`passTD ${row.passTd}`);
    if (row.rushAtt != null) bits.push(`rushAtt ${row.rushAtt}`);
    if (row.rushYds != null) bits.push(`rushYds ${row.rushYds}`);
    if (row.rushTd != null) bits.push(`rushTD ${row.rushTd}`);
    if (row.targets != null) bits.push(`tgt ${row.targets}`);
    if (row.rec != null) bits.push(`rec ${row.rec}`);
    if (row.recYds != null) bits.push(`recYds ${row.recYds}`);
    if (row.recTd != null) bits.push(`recTD ${row.recTd}`);
    const note = row.note ? ` — ${row.note}` : "";
    lines.push(`${name} (${row.pos || "?"}/${row.team || "?"}): ${bits.join(", ")}${note}`);
    if (lines.length >= limit) break;
  }
  if (!lines.length) return "";
  const asOf = bundle.asOf || "unknown";
  return [
    "",
    `ROLE / VOLUME PRIOR (internal — asOf ${asOf}). Support only: check whether the live line assumes too much/too little usage. NEVER name Clay, ESPN, or any analyst in the user answer. Live board + recent/season stats always outrank this prior.`,
    `Availability rule: ${bundle.injuryRule || NFL_CLAY_INJURY_RULE}`,
    ...lines,
  ].join("\n");
}

/**
 * @param {string} question
 * @param {string[]} [hintNames]
 */
export async function buildNflClayPromptSlice(question, hintNames = []) {
  const { bundle, source, stale, ageDays } = await loadNflClayProjections();
  const names = [...hintNames];
  if (!names.length) {
    for (const name of Object.keys(bundle.players || {})) {
      if (String(question || "").toLowerCase().includes(name.toLowerCase())) names.push(name);
    }
  }
  let block = formatClayContextForPlayers(names, 4, bundle);
  if (!block && stale) {
    block =
      "\n\nROLE / VOLUME PRIOR: none loaded for this ask — do not invent forward volume numbers; lean on live line + recent/season usage only.";
  } else if (block && stale) {
    block += `\n[Role prior freshness: ageDays=${ageDays ?? "?"} — directional support only; live usage outranks.]`;
  }
  return { block, bundle, source, stale, ageDays };
}
