/**
 * NBA-only deterministic grounding QA: rosters and injury/status vs BDL-injected context.
 * Does not call the model; used by _urTakeOutputQA.lintUrTakeOutput.
 */

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Same contract as extractMentionedPlayersFromOutput in ur-take.js (duplicated to avoid circular imports).
 * @param {string} output
 * @param {Map<string, string>} knownPlayerToTeam lower-case keys
 */
function extractMentionedPlayersFromVerifiedMap(output, knownPlayerToTeam) {
  const text = String(output || "");
  if (!text || !knownPlayerToTeam || knownPlayerToTeam.size === 0) return [];
  const names = [...knownPlayerToTeam.keys()]
    .map((k) => {
      const pretty = k
        .split(" ")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");
      return { key: k, pretty };
    })
    .sort((a, b) => b.pretty.length - a.pretty.length);
  const hits = [];
  for (const n of names) {
    const re = new RegExp(`\\b${escapeRegExp(n.pretty)}\\b`, "i");
    if (re.test(text)) hits.push(n.key);
  }
  return [...new Set(hits)];
}

/** @param {string} s */
function normalizeInjuryBucket(s) {
  const t = String(s || "").toLowerCase();
  if (!t.trim()) return "unknown";
  if (/\bout\b|ruled\s+out|will\s+not\s+play|inactive\b|\bil\b|\bio\b|surgery|season[- ]ending/i.test(t)) {
    return "out";
  }
  if (/\bprobable\b|likely\s+to\s+play|expected\s+to\s+play|available\b|\bgtd\b/i.test(t)) {
    return "active_or_probable";
  }
  if (/\bquestionable\b|\bdoubtful\b|game[- ]time\s+decision/i.test(t)) {
    return "uncertain";
  }
  if (/\bday[- ]to[- ]day\b|\bdd\b/i.test(t)) return "uncertain";
  return "unknown";
}

/**
 * Slate-wide verified names → team (BallDontLie roster grounding + stats/injuries on slate teams).
 * @param {object|null} nbaContext
 * @param {{ awayAbbr?: string, homeAbbr?: string } | null} matchup
 */
export function buildNbaGroundingSnapshot(nbaContext, matchup) {
  const pbt = nbaContext?.rosterGrounding?.playersByTeamAbbrev || {};
  const slateTeams = new Set();
  for (const g of nbaContext?.todaysGames || []) {
    const a = String(g?.awayTeam?.abbr || "").toUpperCase();
    const h = String(g?.homeTeam?.abbr || "").toUpperCase();
    if (a && a !== "?") slateTeams.add(a);
    if (h && h !== "?") slateTeams.add(h);
  }
  if (slateTeams.size === 0) {
    for (const k of Object.keys(pbt)) {
      const u = String(k || "").toUpperCase();
      if (u && u !== "?") slateTeams.add(u);
    }
  }

  /** @type {Map<string, string>} */
  const verifiedPlayerToTeam = new Map();

  const addName = (name, team) => {
    const n = String(name || "").trim();
    const tm = String(team || "").toUpperCase();
    if (!n || !tm || tm === "UNK" || tm === "?") return;
    if (slateTeams.size > 0 && !slateTeams.has(tm)) return;
    const k = n.toLowerCase();
    if (!verifiedPlayerToTeam.has(k)) verifiedPlayerToTeam.set(k, tm);
  };

  for (const team of slateTeams) {
    const abbr = String(team || "").toUpperCase();
    for (const n of pbt[abbr] || []) addName(n, abbr);
  }

  for (const row of nbaContext?.playerStats || []) {
    addName(row?.name, row?.team);
  }
  for (const row of nbaContext?.injuries || []) {
    addName(row?.player, row?.team);
  }

  /** @type {Map<string, { statusRaw: string, bucket: string, team: string }>} */
  const injuryByPlayerLower = new Map();
  for (const row of nbaContext?.injuries || []) {
    const name = String(row?.player || "").trim();
    if (!name) continue;
    const statusRaw = String(row?.status || "").trim();
    const team = String(row?.team || "").toUpperCase();
    injuryByPlayerLower.set(name.toLowerCase(), {
      statusRaw,
      bucket: normalizeInjuryBucket(statusRaw),
      team,
    });
  }

  const slateTeamAbbrevs = [...slateTeams].sort();
  let focusAllowedTeams = null;
  if (matchup?.awayAbbr && matchup?.homeAbbr) {
    focusAllowedTeams = [
      String(matchup.awayAbbr).toUpperCase(),
      String(matchup.homeAbbr).toUpperCase(),
    ];
  }

  return {
    verifiedPlayerToTeam,
    slateTeamAbbrevs,
    focusAllowedTeams,
    injuryByPlayerLower,
  };
}

/**
 * @param {string} text
 * @param {Map<string, string>} verifiedPlayerToTeam lower → team abbr
 */
function extractMentionsFromVerifiedCatalog(text, verifiedPlayerToTeam) {
  return extractMentionedPlayersFromVerifiedMap(text, verifiedPlayerToTeam);
}

const DEFINITE_ACTIVE_PHRASE =
  /\b(?:is\s+probable|listed\s+as\s+probable|expected\s+to\s+play|cleared\s+to\s+play|starting\b)/i;
const DEFINITE_OUT_DECLARATION = /\b(?:ruled\s+out|is\s+out|will\s+not\s+play)\b/i;

/**
 * @param {string} sentence
 * @param {{ bucket: string, statusRaw: string }} inj
 */
function injurySentenceContradictsContext(sentence, inj) {
  const s = String(sentence || "").trim();
  if (!inj || inj.bucket === "unknown") return false;
  if (/^\s*if\b/i.test(s)) return false;

  if (inj.bucket === "out") {
    return DEFINITE_ACTIVE_PHRASE.test(s);
  }

  if (inj.bucket === "active_or_probable" || inj.bucket === "uncertain") {
    return DEFINITE_OUT_DECLARATION.test(s);
  }

  return false;
}

/**
 * @param {string} text
 * @param {ReturnType<typeof buildNbaGroundingSnapshot>} snapshot
 */
export function lintNbaHardGrounding(text, snapshot) {
  const raw = String(text || "").trim();
  /** @type {{ ruleCode: string, player?: string, expectedTeam?: string, mentionedTeam?: string, expectedStatus?: string, mentionedStatus?: string }[]} */
  const events = [];
  /** @type {string[]} */
  const criticalCodes = [];

  if (!snapshot || !(snapshot.verifiedPlayerToTeam instanceof Map) || snapshot.verifiedPlayerToTeam.size === 0) {
    return { criticalCodes: [], events };
  }

  const { verifiedPlayerToTeam, focusAllowedTeams, injuryByPlayerLower } = snapshot;
  const mentions = extractMentionsFromVerifiedCatalog(raw, verifiedPlayerToTeam);

  const allowedFocus =
    focusAllowedTeams?.length === 2 ? new Set(focusAllowedTeams.map((t) => String(t).toUpperCase())) : null;

  for (const key of mentions) {
    const team = String(verifiedPlayerToTeam.get(key) || "").toUpperCase();
    const pretty = key
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    if (allowedFocus && team && !allowedFocus.has(team)) {
      criticalCodes.push("nba_grounding_player_off_matchup");
      events.push({
        ruleCode: "nba_grounding_player_off_matchup",
        player: pretty,
        expectedTeam: team,
        mentionedTeam: [...allowedFocus].join("/"),
      });
    }

    const inj = injuryByPlayerLower.get(key);
    if (!inj) continue;

    const chunks = raw.split(/(?<=[.!?])\s+/);
    for (const sent of chunks) {
      const re = new RegExp(`\\b${pretty.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (!re.test(sent)) continue;
      if (injurySentenceContradictsContext(sent, inj)) {
        criticalCodes.push("nba_grounding_injury_contradiction");
        events.push({
          ruleCode: "nba_grounding_injury_contradiction",
          player: pretty,
          expectedStatus: inj.statusRaw || inj.bucket,
          mentionedStatus: sent.slice(0, 160),
        });
        break;
      }
    }
  }

  return {
    criticalCodes: [...new Set(criticalCodes)],
    events,
  };
}

/** Appended on regeneration pass when NBA grounding failed (sportHint nba). */
export const NBA_GROUNDING_REGENERATION_SUFFIX = `

[NBA HARD GROUNDING — rewrite required]
Your prior answer likely violated verified BallDontLie / ESPN-injected context.
Rewrite from scratch:
- Only NBA player names that appear in playersByTeamAbbrev / verified roster strings in the user context for this slate (or the focused matchup teams when the question is matchup-specific).
- Player–team assignments and injury/status lines must match the injury block and roster lists exactly — no contradictory availability language.
- Do not cite players from other games when the user asked about a specific matchup — only names from the two matchup teams' verified lists.
`;
