/** @file NBA injury index helpers — extracted from handler.js */
export function normalizeNbaAvailabilityClass(status, detail = "") {
  const s = `${String(status || "").toLowerCase()} ${String(detail || "").toLowerCase()}`;
  if (
    /\b(out|inactive|dnp|did not play|ruled out|available:\s*out|suspended|not with team)\b/.test(s)
  ) {
    return "out";
  }
  if (/\b(doubtful)\b/.test(s)) return "doubtful";
  if (/\b(questionable|game[- ]time decision|gtd|probable)\b/.test(s)) return "questionable";
  return "unknown";
}

export function hasMaterialNbaNewsImpact(newsImpact) {
  const teams = Array.isArray(newsImpact?.affectedTeams) ? newsImpact.affectedTeams : [];
  return teams.some((t) => (t?.outs || []).length > 0 || (t?.doubtful || []).length > 0);
}

export function getNbaInjuryIndex(nbaContext) {
  const map = new Map();
  for (const row of nbaContext?.injuries || []) {
    const name = String(row?.player || "").trim();
    if (!name) continue;
    map.set(name.toLowerCase(), {
      player: name,
      team: String(row?.team || "").toUpperCase(),
      statusRaw: String(row?.status || "").trim(),
      detail: String(row?.detail || "").trim(),
      statusClass: normalizeNbaAvailabilityClass(row?.status, row?.detail),
    });
  }
  return map;
}

function buildUrTakeFollowUpCoreSystemPrompt() {
  return `${buildCoreFrameworkPrompt()}

FABRICATION GUARDRAIL — MANDATORY
Do not invent players, teams, lines, scores, or stats that are not explicitly supplied in the full sport context JSON and verification blocks in the user message for this request.
Estimated prop thresholds derived from playerStats or analogous stat bundles in context when live odds are unavailable are authorized — label them clearly as season-average or estimate-tier reads, not as posted book lines.

ROSTER ENFORCEMENT — MANDATORY
Prefer players and teams from verified roster or verification lists in the user message. For user-named pros missing from live lists, analyze with a live-data-unavailable note — never refuse as "not in verified field." Never use training memory for team assignments.

ARITHMETIC RULE — MANDATORY
When you reference pace math, totals, series scoring averages, or cumulative stats, show the arithmetic in one line so it is checkable (example: "218 + 211 + 225 = 654 combined → 654/3 = 218 avg").

DATA PERSISTENCE — FOLLOW-UPS (mandatory)
The user message includes the same full server-assembled context payload as the opening turn whenever this sport provides JSON or verification blocks. Never claim roster, injury, stat, or board data is unavailable if it appears in that payload.

FOLLOW-UP STYLE — MANDATORY
Answer only the specific question asked. 3-5 sentences maximum. No section headers. No MATCH READ. No PROP PROJECTIONS. Speak like a sharp friend replying to a text.

CROSS-SPORT & THREAD DISCIPLINE — MANDATORY
Prior messages may be about a different sport than this request. Answer from the server context supplied for this turn only — silently, with no narration of the sport change.
Never say "cross-sport mismatch," "your first question was about," "the context payload I have," "paste the game context," "I'll need you to," or "I need to flag." Never ask the user to paste or supply context the server already attached.
Never tell the user there is a "constraint conflict," sport mismatch, or ruleset violation. Never ask them to close a thread (including F1), switch chats, or clarify sport routing. Never refuse or stop mid-answer for sport-context reasons.
If the payload is thin or off-thread, still give structural insight and a sharp lean — never meta-decline or lecture.`;
}
