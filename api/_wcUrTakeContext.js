/**
 * World Cup 2026 — server-side UR Take context (mirrors NBA board injection pattern).
 * Elo stays internal; model sees strength tags only.
 */

import { getDurableJson } from "./_durableStore.js";
import { getGroupsPayload, getMatchesPayload } from "./world-cup.js";
import { isKvFresh } from "../shared/selfHealingKv.js";

const WC_GROUPS_TTL_MS = 300 * 1000;
const WC_MATCHES_TTL_MS = 60 * 1000;
import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import { wcTeamsWithStrengthTags } from "../shared/wc2026Strength.js";

const GROUP_LETTERS = "ABCDEFGHIJKL".split("");

function isLiveStatus(status) {
  return ["live", "in_progress", "1h", "2h", "ht"].includes(String(status || "").toLowerCase());
}

function isFinished(status) {
  return String(status || "").toLowerCase() === "ft";
}

function isScheduled(status) {
  const s = String(status || "").toLowerCase();
  return s === "ns" || s === "scheduled" || s === "not started" || s === "upcoming";
}

function buildStaticGroups() {
  /** @type {Record<string, ReturnType<typeof wcTeamsWithStrengthTags>>} */
  const groups = {};
  for (const letter of GROUP_LETTERS) {
    const teams = WC_2026_TEAMS.filter((t) => t.group === letter);
    if (teams.length) groups[letter] = wcTeamsWithStrengthTags(teams);
  }
  return groups;
}

function mergeStandingsIntoGroups(staticGroups, apiGroups) {
  const out = { ...staticGroups };
  for (const letter of GROUP_LETTERS) {
    const apiRows = Array.isArray(apiGroups?.[letter]) ? apiGroups[letter] : [];
    const hasPlayed = apiRows.some((r) => Number(r.played) > 0);
    if (!hasPlayed) continue;

    const byAbbr = new Map(
      (staticGroups[letter] || []).map((t) => [String(t.abbreviation).toUpperCase(), t]),
    );
    const merged = apiRows
      .slice()
      .sort((a, b) => Number(b.points) - Number(a.points) || Number(b.gd) - Number(a.gd))
      .map((row, i) => {
        const key = String(row.team || "")
          .trim()
          .toUpperCase();
        const base = byAbbr.get(key) || {
          name: row.team,
          abbreviation: key,
          strengthTag: "Longshot",
        };
        return {
          ...base,
          strengthTag: base.strengthTag || (i === 0 ? "Favorite" : i === 1 ? "Contender" : "Longshot"),
          played: Number(row.played) || 0,
          won: Number(row.won) || 0,
          drawn: Number(row.drawn) || 0,
          lost: Number(row.lost) || 0,
          gd: Number(row.gd) || 0,
          points: Number(row.points) || 0,
          hasResults: true,
        };
      });
    if (merged.length) out[letter] = merged;
  }
  return out;
}

/**
 * @param {object} ctx
 * @returns {string}
 */
export function formatWorldCupUrTakePromptBlock(ctx) {
  if (!ctx || typeof ctx !== "object") return "";

  const lines = [
    "WORLD CUP 2026 — VERIFIED CONTEXT (use for all answers; do not claim missing tournament data)",
    `Tournament: ${ctx.tournament}`,
    `Hosts: ${(ctx.hosts || []).join(", ")}`,
    `Dates: ${ctx.dateRange}`,
    "",
    "STRENGTH TAGS (pre-tournament / baseline — never cite numeric power ratings or rating points):",
    "Favorite = group favorite · Contender = realistic knockout team · Longshot = upset/long-shot profile",
    "",
    "GROUPS (12 × 4 teams):",
  ];

  for (const letter of GROUP_LETTERS) {
    const teams = ctx.groups?.[letter];
    if (!Array.isArray(teams) || !teams.length) continue;
    const teamBits = teams.map((t) => {
      const rec = t.hasResults
        ? `${t.name} (${t.strengthTag}, ${t.points} pts, ${t.won}W-${t.drawn}D-${t.lost}L)`
        : `${t.name} (${t.strengthTag})`;
      return rec;
    });
    lines.push(`  Group ${letter}: ${teamBits.join(" · ")}`);
  }

  if (Array.isArray(ctx.live) && ctx.live.length) {
    lines.push("", "LIVE NOW:");
    for (const m of ctx.live) {
      lines.push(
        `  ${m.homeTeam} ${m.homeScore ?? 0}-${m.awayScore ?? 0} ${m.awayTeam}${m.group ? ` (Group ${m.group})` : ""}`,
      );
    }
  }

  if (Array.isArray(ctx.results) && ctx.results.length) {
    lines.push("", "RESULTS (completed):");
    for (const m of ctx.results.slice(-12)) {
      lines.push(
        `  ${m.homeTeam} ${m.homeScore}-${m.awayScore} ${m.awayTeam}${m.group ? ` Group ${m.group}` : ""} — ${m.date}`,
      );
    }
  }

  if (Array.isArray(ctx.upcoming) && ctx.upcoming.length) {
    lines.push("", "UPCOMING FIXTURES:");
    for (const m of ctx.upcoming.slice(0, 8)) {
      lines.push(
        `  ${m.homeTeam} vs ${m.awayTeam}${m.group ? ` (Group ${m.group})` : ""} — ${m.date} ${m.time || ""} ${m.stadium || m.city || ""}`.trim(),
      );
    }
  }

  lines.push(
    "",
    "VOICE: JSON summary — lead with the answer in sentence one (team + verdict, no setup), then 2-3 support sentences, 150 words max. JSON deep — full reasoning, no word limit. Plain sentences in summary, no bullet lists, no disclaimers. Name teams and groups from this block.",
  );

  const text = lines.join("\n");
  return text.length > 12000 ? `${text.slice(0, 11997)}...` : text;
}

/**
 * Full World Cup board for UR Take — same role as buildNbaUrTakeBoard output.
 * @returns {Promise<object|null>}
 */
async function loadWorldCupGroupsPayload() {
  const cached = await getDurableJson("wc2026_groups");
  if (cached?.groups && Object.keys(cached.groups).length && isKvFresh(cached.lastUpdated, WC_GROUPS_TTL_MS)) {
    return cached;
  }
  return getGroupsPayload();
}

async function loadWorldCupMatchesPayload() {
  const cached = await getDurableJson("wc2026_matches");
  if (cached?.matches?.length && isKvFresh(cached.lastUpdated, WC_MATCHES_TTL_MS)) {
    return cached;
  }
  return getMatchesPayload();
}

export async function buildWorldCupUrTakeContext() {
  const [groupsPayload, matchesPayload] = await Promise.all([
    loadWorldCupGroupsPayload(),
    loadWorldCupMatchesPayload(),
  ]);

  const staticGroups = buildStaticGroups();
  const groups = mergeStandingsIntoGroups(staticGroups, groupsPayload?.groups || {});
  const matches = Array.isArray(matchesPayload?.matches) ? matchesPayload.matches : [];

  const live = matches.filter((m) => isLiveStatus(m?.status));
  const results = matches.filter((m) => isFinished(m?.status));
  const upcoming = matches.filter((m) => isScheduled(m?.status));

  const ctx = {
    source: "world_cup_2026",
    tournament: "2026 FIFA World Cup",
    hosts: ["USA", "Mexico", "Canada"],
    dateRange: "June 11 — July 19, 2026",
    groups,
    live,
    results,
    upcoming,
    lastUpdated: Math.max(
      Number(groupsPayload?.lastUpdated) || 0,
      Number(matchesPayload?.lastUpdated) || 0,
    ),
  };

  ctx.promptBlock = formatWorldCupUrTakePromptBlock(ctx);
  if (!ctx.promptBlock || Object.keys(groups).length < 12) return null;

  return ctx;
}

/** @deprecated — use buildWorldCupUrTakeContext */
export async function buildWorldCupContext() {
  const ctx = await buildWorldCupUrTakeContext();
  return ctx?.promptBlock || "";
}
