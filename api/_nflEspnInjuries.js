/**
 * ESPN league injury + participation notes (preseason sit/play lives in comments).
 */
import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { detectNflTeamHint } from "../src/lib/detectSportFromQuestion.js";
import {
  classifyNflParticipationComment,
  nflAvailabilityNameMatch,
} from "../shared/nflEspnParticipation.js";

const KV_KEY = "nfl_espn_injuries";
const TTL_SEC = 30 * 60;
const ESPN_INJURIES_URL =
  "https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries";

/**
 * @param {Record<string, unknown>} team
 * @param {Record<string, unknown>} row
 */
function normalizeInjuryRow(team, row) {
  const athlete = row?.athlete && typeof row.athlete === "object" ? row.athlete : {};
  const name = String(athlete.displayName || athlete.shortName || "").trim();
  const teamName = String(team?.displayName || "");
  const teamAbbr =
    detectNflTeamHint(teamName) ||
    String(athlete.team?.abbreviation || "").toUpperCase() ||
    null;
  const comment = String(row.shortComment || row.longComment || "").trim();
  const status = String(row.status || "").trim() || "Unknown";
  return {
    player: name,
    team: teamAbbr,
    teamName,
    position: athlete.position?.abbreviation || athlete.position || null,
    status,
    comment,
    participation: classifyNflParticipationComment(comment),
    date: row.date || null,
    source: "espn_injuries",
  };
}

/**
 * @returns {Promise<{ rows: Array<Record<string, unknown>>, fetchedAt: number, source: string }>}
 */
export async function fetchNflEspnInjurySnapshot() {
  try {
    const cached = await getDurableJson(KV_KEY);
    if (cached?.rows?.length && cached.fetchedAt && Date.now() - cached.fetchedAt < TTL_SEC * 1000) {
      return { rows: cached.rows, fetchedAt: cached.fetchedAt, source: "kv" };
    }
  } catch {
    /* ignore */
  }

  try {
    const res = await fetch(ESPN_INJURIES_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; UnderReview/1.0)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.warn(JSON.stringify({ event: "nfl_espn_injuries_http", status: res.status }));
      return { rows: [], fetchedAt: Date.now(), source: "http_error" };
    }
    const json = await res.json();
    /** @type {Array<Record<string, unknown>>} */
    const rows = [];
    for (const team of json.injuries || []) {
      for (const row of team.injuries || []) {
        const n = normalizeInjuryRow(team, row);
        if (n.player) rows.push(n);
      }
    }
    const fetchedAt = Date.now();
    await setDurableJson(KV_KEY, { rows, fetchedAt }, { ttlSeconds: TTL_SEC });
    return { rows, fetchedAt, source: "live" };
  } catch (err) {
    console.warn(
      JSON.stringify({ event: "nfl_espn_injuries_failed", error: err?.message || String(err) }),
    );
    return { rows: [], fetchedAt: Date.now(), source: "error" };
  }
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {string} question
 * @param {string[]} [extraNames]
 */
export function pickNflAvailabilityForQuestion(rows, question, extraNames = []) {
  const q = String(question || "");
  const names = extraNames.map((n) => String(n || "").trim()).filter(Boolean);
  /** @type {Array<Record<string, unknown>>} */
  const hits = [];
  const seen = new Set();
  for (const row of rows || []) {
    const player = String(row.player || "");
    if (!player) continue;
    const key = player.toLowerCase();
    if (seen.has(key)) continue;
    const named = names.some((n) => nflAvailabilityNameMatch(n, player) || nflAvailabilityNameMatch(player, n));
    const inQ = nflAvailabilityNameMatch(player, q);
    if (!named && !inQ) continue;
    seen.add(key);
    hits.push(row);
  }
  return hits;
}

/**
 * Protected-tail block so Ask can answer "is X dressing?"
 * @param {Array<Record<string, unknown>>} hits
 * @param {{ asOf?: number, source?: string }} [meta]
 */
export function formatNflAvailabilityPromptBlock(hits, meta = {}) {
  if (!Array.isArray(hits) || !hits.length) {
    return "NFL AVAILABILITY: no ESPN participation note matched the named players. Do not invent sit/play. PASS on dressing asks until inactives or a note exists.";
  }
  const ageMin =
    meta.asOf && Number.isFinite(Number(meta.asOf))
      ? Math.max(0, Math.round((Date.now() - Number(meta.asOf)) / 60000))
      : null;
  const head = `NFL AVAILABILITY (ESPN${ageMin != null ? `, ~${ageMin}m old` : ""}):`;
  const lines = hits.slice(0, 12).map((r) => {
    const part = String(r.participation || "unknown").toUpperCase();
    const note = String(r.comment || "").slice(0, 180);
    return `${r.player} (${r.team || "?"}): ${r.status || "?"} · ${part}${note ? ` — ${note}` : ""}`;
  });
  return `${head}\n${lines.join("\n")}\nUse PLAY/SIT/LIMITED from the note. Status Active is not the same as "will play tonight."`;
}
