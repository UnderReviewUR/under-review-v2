/** @file NBA player name resolution — extracted from handler.js */
import { escapeRegExp } from "../prompt/normalize.js";
import { normalizeNbaMarketPlayerKey } from "./keys.js";

function buildNbaPlayerUniverse(nbaContext) {
  const set = new Set();
  const grounded = nbaContext?.bdlGrounding?.bdlGroundedPlayers || {};
  for (const name of Object.keys(grounded)) {
    const normalized = String(name || "").trim();
    if (normalized) set.add(normalized);
  }
  for (const row of nbaContext?.playerStats || []) {
    const name = String(row?.name || "").trim();
    if (name) set.add(name);
  }
  for (const row of nbaContext?.injuries || []) {
    const name = String(row?.player || "").trim();
    if (name) set.add(name);
  }
  return [...set];
}

export function resolveQuestionNbaPlayers(question, nbaContext) {
  const q = String(question || "").trim();
  if (!q) return [];
  const players = buildNbaPlayerUniverse(nbaContext);
  const sorted = players
    .map((name) => String(name || "").trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const hits = [];
  const seen = new Set();
  const expandCandidateName = (candidate) => {
    const raw = String(candidate || "").trim();
    if (!raw) return "";
    const normalized = normalizeNbaMarketPlayerKey(raw);
    const exact = sorted.find((name) => normalizeNbaMarketPlayerKey(name) === normalized);
    if (exact) return exact;
    const firstToken = normalized.split(" ")[0];
    if (!firstToken) return raw;
    const tokenMatches = sorted.filter((name) => {
      const key = normalizeNbaMarketPlayerKey(name);
      const start = key.split(" ")[0];
      return start === firstToken;
    });
    return tokenMatches.length === 1 ? tokenMatches[0] : raw;
  };
  const pushHit = (name) => {
    const n = expandCandidateName(name);
    const k = n.toLowerCase();
    if (!n || seen.has(k)) return;
    seen.add(k);
    hits.push(n);
  };

  for (const name of sorted) {
    const re = new RegExp(`\\b${escapeRegExp(name)}\\b`, "i");
    if (re.test(q)) pushHit(name);
  }

  const surnameToFull = new Map();
  for (const name of sorted) {
    const parts = name.split(/\s+/).filter(Boolean);
    const last = String(parts[parts.length - 1] || "").toLowerCase();
    if (!last || last.length < 4) continue;
    if (!surnameToFull.has(last)) surnameToFull.set(last, new Set());
    surnameToFull.get(last).add(name);
  }
  const qLower = q.toLowerCase();
  for (const [surname, fullSet] of surnameToFull.entries()) {
    if (fullSet.size !== 1) continue;
    const re = new RegExp(`\\b${escapeRegExp(surname)}(?:'s)?\\b`, "i");
    if (re.test(qLower)) pushHit([...fullSet][0]);
  }

  // Fallback when slate context is empty: infer 1-2 names from prop phrasing.
  const patterns = [
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b\s+(?:over|under)\b/g,
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b\s+(?:points?|rebounds?|assists?|pra)\b/gi,
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)'s\s+(?:line|prop|points|rebounds|assists|pra)\b/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(q)) !== null) {
      pushHit(String(m[1] || "").trim());
    }
  }

  return hits;
}

export function resolveQuestionNbaPlayer(question, nbaContext) {
  return resolveQuestionNbaPlayers(question, nbaContext)[0] || null;
}

function resolveNbaPlayerTeam(playerName, nbaContext) {
  const key = String(playerName || "").trim().toLowerCase();
  if (!key) return "";
  const grounded = nbaContext?.bdlGrounding?.bdlGroundedPlayers || {};
  for (const [name, meta] of Object.entries(grounded)) {
    if (String(name || "").trim().toLowerCase() === key) {
      return String(meta?.team || "").toUpperCase();
    }
  }
  const statsHit = (nbaContext?.playerStats || []).find(
    (p) => String(p?.name || "").trim().toLowerCase() === key,
  );
  if (statsHit?.team) return String(statsHit.team).toUpperCase();
  const injuryHit = (nbaContext?.injuries || []).find(
    (i) => String(i?.player || "").trim().toLowerCase() === key,
  );
  if (injuryHit?.team) return String(injuryHit.team).toUpperCase();
  return "";
}

export function sanitizeNbaQuestionForGeneration(question, nbaContext) {
  const raw = String(question || "").trim();
  if (!raw) return raw;
  const targeted = resolveQuestionNbaPlayer(raw, nbaContext);
  if (!targeted) return raw;
  const targetedTeam = resolveNbaPlayerTeam(targeted, nbaContext);
  const hasTargetedTeam = Boolean(targetedTeam);

  let sanitized = raw;
  const pattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+is\s+(out|doubtful|questionable)\b/gi;
  let m;
  while ((m = pattern.exec(raw)) !== null) {
    const mention = String(m[1] || "").trim();
    if (!mention || mention.toLowerCase() === targeted.toLowerCase()) continue;
    const mentionFull = resolveQuestionNbaPlayer(mention, nbaContext) || mention;
    const mentionTeam = resolveNbaPlayerTeam(mentionFull, nbaContext);
    const sameTeam = hasTargetedTeam && mentionTeam && mentionTeam === targetedTeam;
    if (!sameTeam) {
      sanitized = sanitized.replace(m[0], "").replace(/\s{2,}/g, " ").trim();
    }
  }

  return sanitized || raw;
}
