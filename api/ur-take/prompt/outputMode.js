/** Output JSON mode + tier contracts for ur-take handler. */
import { NBA_FINALS_STRUCTURED_JSON_CONTRACT } from "../../../shared/nbaFinalsStructured.js";
import { isWcPlayerMarketIntent, WC_INTENT } from "../../../shared/wcUrTakeIntent.js";
import { normalizeText } from "./normalize.js";

export function isSettledFactQuestion(question) {
  const q = String(question || "").toLowerCase();
  const patterns = [
    /who won/i,
    /what was the score/i,
    /did .+ (beat|lose|win)/i,
    /final score/i,
    /how did .+ do/i,
    /who (is|plays for|plays on)/i,
    /what team (does|is)/i,
    /when (did|does)/i,
    /current standings/i,
    /who leads/i,
  ];
  return patterns.some((p) => p.test(q));
}

export function isTier1InformationalQuestion(question) {
  const q = normalizeText(question);
  if (
    q.includes("who wins") ||
    q.includes(" vs ") ||
    q.includes(" v ") ||
    q.includes("prop") ||
    q.includes("spread") ||
    q.includes("total") ||
    q.includes("cover") ||
    q.includes("k prop") ||
    q.includes("strikeout") ||
    q.includes("pitcher")
  ) {
    return false;
  }
  if (/\b(is|are|will|does)\s+.+\s+(playing|play|start|starting|active|available|dress)\b/.test(q)) return true;
  if (/\b(what time|when does|where is the game)\b/.test(q)) return true;
  return false;
}

export function shouldUseTier25WithDeep({ question, matchupContext, sportHint }) {
  if (matchupContext) return true;
  const q = normalizeText(question);
  if (q.includes("who wins") || q.includes(" who wins")) return true;
  if (q.includes(" vs ") || q.includes(" v ") || q.includes(" @ ")) return true;
  if (q.includes("prop")) return true;
  if (q.includes("cover") || q.includes("spread") || q.includes("total")) return true;
  if (q.includes("strikeout") || q.includes("k prop") || (q.includes("pitcher") && q.includes("tonight"))) return true;
  const s = String(sportHint || "").toLowerCase();
  if (s && s !== "generic" && s !== "image_review") {
    if (/\b(best|lean|edge|angle|fade|lock|pick|bet)\b/.test(q)) return true;
  }
  return false;
}

export function isSpreadOrGameSideQuestion(question) {
  const q = normalizeText(question);
  if (!q) return false;
  return (
    q.includes("spread") ||
    q.includes("ats") ||
    q.includes("against the spread") ||
    q.includes("game side") ||
    q.includes("which team covers") ||
    q.includes("who covers") ||
    (q.includes("cover") && (q.includes("line") || q.includes("side")))
  );
}

export function resolveOutputJsonMode({
  chaseSignals,
  intent,
  hasImage,
  liveSignals,
  question,
  matchupContext,
  sportHint,
  wcIntent,
  finalsMode = false,
}) {
  if (String(sportHint || "").toLowerCase() === "nba" && finalsMode) {
    return "nba_finals_json";
  }
  if (String(sportHint || "").toLowerCase() === "worldcup") {
    if (String(wcIntent || "") === WC_INTENT.RULES) return "tier1_json";
    return "tier2_5_json";
  }
  if (chaseSignals?.isChase) return "plain";
  if (intent === "slip_review") return "plain";
  if (intent === "prop_projection") return "tier2_5_json";
  if (hasImage && liveSignals?.isLive) return "tier2_live_json";
  if (isTier1InformationalQuestion(question)) return "tier1_json";
  if (
    isSettledFactQuestion(question) &&
    !shouldUseTier25WithDeep({ question, matchupContext, sportHint })
  ) {
    return "tier1_json";
  }
  if (shouldUseTier25WithDeep({ question, matchupContext, sportHint })) return "tier2_5_json";
  return "plain";
}

export function buildJsonOutputContract(
  mode,
  sportHint,
  { requireStatusShift = false, longFormRequested = false, wcIntent = null } = {},
) {
  const sport = String(sportHint || "generic").toLowerCase();

  const nbaTier25Lead =
    sport === "nba"
      ? `
NBA (formatting only when sport is NBA): write the opener sentence per Step 1 of the framework, then prepend ">> " to that same sentence so the summary begins with ">> ". The ">>" is a formatting prefix, not an opener rule — Step 1 still owns the content of the first sentence.
${requireStatusShift ? 'NBA STATUS SHIFT (mandatory): include "statusShift" in the JSON response with one decisive sentence naming the key availability shift and what it invalidates or unlocks.' : ""}
`
      : "";

  const tier25ModeBanner = longFormRequested
    ? `LONG-FORM MODE IS ON for this turn (user explicitly asked for deep dive / full breakdown / explain everything / every detail / walk me through / long form / complete breakdown / full analysis). Use the LONG-FORM branch below.`
    : `LONG-FORM MODE IS OFF — MOBILE DEFAULT applies. Match system prompt MOBILE DEFAULT length rules and the DEFAULT branch below.`;

  const tier25SpecDefault = `TIER 2.5 — MATCHUP / PROP / SIDE (summary + deep) — MOBILE DEFAULT

${tier25ModeBanner}

summary field (plain text inside the JSON string, no markdown):
- Target 180–260 words for the entire summary.
- At most 3–4 short sections total (optional ALL-CAPS labels). At most 2–3 bullets per section.
- Shape:

>> [Opener sentence per Step 1, with ">> " prepended only if NBA formatting block above applies]

[blank line]

MATCH READ
- [bullet — max 3 bullets in this section total]

PROP PROJECTIONS
- Up to 3 lines total (project STATS not book prices — "project ~7" not "over 6.5 -110"). Pick lines that fit ${sport}.
- Tennis: threshold lean; aces/projection as fits. NBA: points/PRA/threes/total lean as fits. MLB/NFL/Golf/F1: same discipline — fewer lines, tighter.

CONFIDENCE
[High / Medium / Speculative] — one short line only
${nbaTier25Lead}
deep field (same JSON object) — MOBILE DEFAULT
- Target at most ~300 words total for deep.
- Compact expansion only: extra angles, risks, alt markets — do NOT duplicate the full summary text.
- Do NOT output the full legacy Tier-3 section stack (THE PLAY / MARKET MISTAKE / WHY MISPRICED / TIMING EDGE / WHY IT FITS / FADE block in long legacy form).
- Plain text inside the JSON string, no markdown.

CRITICAL
- Never say "limited profile", "held back", or apologize for thin data — put uncertainty only in CONFIDENCE.
- Never invent book lines; estimate stats only.
- Never include the phrase "See full breakdown" in any field (UI handles that).
- If you can only produce 1–2 projection lines, confidence must be Speculative.
- summary MUST NOT include legacy headers like THE PLAY / MARKET MISTAKE / WHY MISPRICED / TIMING EDGE / WHY IT FITS / FADE (those belong in deep only when appropriate).`;

  const tier25SpecLongForm = `TIER 2.5 — MATCHUP / PROP / SIDE (summary + deep) — LONG-FORM MODE

${tier25ModeBanner}

summary field (plain text inside the JSON string, no markdown):
- Keep the summary scannable; prefer 180–260 words when possible but depth may spill moderately if needed for clarity.
- Shape:

>> [Opener sentence per Step 1, with ">> " prepended when NBA formatting applies]

[blank line]

MATCH READ
- [bullet 1 — concrete edge — stats or sequences, not "good form"]
- [bullet 2 — opponent weakness or friction]
- [bullet 3 — surface / park / venue / matchup factor]

PROP PROJECTIONS
[3–6 lines minimum when data allows; project STATS not book prices — "project ~7" not "over 6.5 -110"]
Sport-specific projection lines (pick what fits ${sport}):
- Tennis: match-winner threshold band; total games lean; aces per player ("Name: project ~N"); double faults; break points saved bands; scoreline prediction.
- NBA: points (and rebounds/assists/PRA as role fits); threes for shooters; minutes if role unclear; game total lean.
- MLB: SP strikeouts each; key hitter total bases; game total lean + park note; first-inning angle when useful.
- NFL: QB yards/TDs; primary RB rush; WR1/WR2 yards; anytime TD leans for 2–3; longest play when supported.
- Golf: top-5 / top-10 / top-20 for 2–3 names; make-cut; H2H when asked.
- F1: podium % for 3–4 drivers; points finish mid-grid; DNF risk; margin read when dominant.

CONFIDENCE
[High / Medium / Speculative] — [one-line justification]
${nbaTier25Lead}
deep field (same JSON object) — LONG-FORM MODE
- Must contain the FULL legacy Tier-3 answer: opener sentence (Step 1) prefixed with ">> " when NBA formatting applies, then THE PLAY / MARKET MISTAKE / WHY MISPRICED / TIMING EDGE / WHY IT FITS / FADE / CONFIDENCE / TIMING sections exactly as in the base system prompt (500+ words allowed).
- Plain text inside the JSON string, no markdown.

CRITICAL
- Never say "limited profile", "held back", or apologize for thin data — put uncertainty only in CONFIDENCE.
- Never invent book lines; estimate stats only.
- Never include the phrase "See full breakdown" in any field (UI handles that).
- If you can only produce 1–2 projection lines in summary, confidence must be Speculative.
- summary MUST NOT include legacy headers like THE PLAY / MARKET MISTAKE / WHY MISPRICED / TIMING EDGE / WHY IT FITS / FADE — those belong in deep.
- Those legacy sections belong in deep only.`;

  const tier25Spec = longFormRequested ? tier25SpecLongForm : tier25SpecDefault;

  const worldCupPlayerMarketTier25Spec = `TIER 2.5 — WORLD CUP PLAYER MARKET (summary + deep)

summary (max 40 words, plain text):
- Sentence one answers the question directly: name the PLAYER, price, and verdict (PASS / lean / value / no edge).
- Optional second sentence: one concrete reason only.
- No section headers, no team-as-top-scorer pick, no multi-paragraph setup.

deep (max 100 words, plain text):
- Only extra detail for "Full breakdown" in the app — 2-3 short sentences (alt prices, one risk, lineup caveat).
- Do not repeat the summary. No MATCH READ / MARKET / STAT EDGE blocks.`;

  const worldCupTier25Spec = `TIER 2.5 — WORLD CUP 2026 (summary + deep)

summary (max 50 words, plain text):
- Sentence one = direct answer (team, group, or price verdict). No setup.
- At most one follow-up sentence of support.

deep (max 120 words, plain text):
- Short extra context only — not a thesis. No section headers. UI shows this on "Full breakdown" tap.

CRITICAL
- Never say "limited profile", "held back", or apologize for thin data.
- Never invent scores, lineups, or odds not in context.
- Never include the phrase "Full Breakdown" in any field (UI handles that).
- Reference strength as Favorite / Contender / Longshot only — never cite Elo or numeric power ratings.`;

  if (mode === "tier1_json") {
    return `OUTPUT CONTRACT — TIER 1 (mandatory)
Return ONLY valid JSON on a single line or pretty-printed:
{"summary":"<1–3 plain sentences factual answer — no sections, no >> line>"}
No other keys. No markdown.`;
  }

  if (mode === "tier2_live_json") {
    return `OUTPUT CONTRACT — TIER 2 LIVE (mandatory)
Return ONLY valid JSON:
{"summary":"<full compressed live response: LIVE CALL, THE MATH, WHY NOW, CLOCK, WATCH FOR — show arithmetic explicitly>"}
No other keys. No markdown.`;
  }

  if (mode === "nba_finals_json") {
    return NBA_FINALS_STRUCTURED_JSON_CONTRACT;
  }

  if (mode === "tier2_5_json") {
    const wcPlayer =
      sport === "worldcup" && isWcPlayerMarketIntent(String(wcIntent || ""));
    const tier25Body =
      sport === "worldcup" ? (wcPlayer ? worldCupPlayerMarketTier25Spec : worldCupTier25Spec) : tier25Spec;
    return `OUTPUT CONTRACT — TIER 2.5 + DEEP (mandatory)
Return ONLY valid JSON with exactly these keys:
${sport === "nba" && requireStatusShift ? '{"summary":"...","deep":"...","statusShift":"..."}' : '{"summary":"...","deep":"..."}'}

${tier25Body}`;
  }

  return "";
}

export function collectNbaVerifiedPlayerNamesFromGrounding(nbaContext) {
  const verifiedPlayerNames = new Set();
  const playersByTeam = nbaContext?.rosterGrounding?.playersByTeamAbbrev || {};
  for (const players of Object.values(playersByTeam)) {
    if (!Array.isArray(players)) continue;
    for (const name of players) {
      const n = String(name || "").trim();
      if (n) verifiedPlayerNames.add(n);
    }
  }
  for (const raw of nbaContext?.clientUiSurface?.featuredPlayersFullNames || []) {
    const n = String(raw || "").trim();
    if (n) verifiedPlayerNames.add(n);
  }
  return verifiedPlayerNames;
}

export function questionExplicitlyNamesPlayerCue(question) {
  const q = String(question || "").trim();
  if (!q) return false;
  const fullName = /\b(?:about|for)\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/;
  const surnameCue = /\bfor\s+[A-Z][a-z]{2,}(?:'s)?\b/;
  const possessivePlayer = /\b[A-Z][a-z]{2,}'s\s+(?:PRA|line|prop)/;
  return fullName.test(q) || surnameCue.test(q) || possessivePlayer.test(q);
}

export function buildNbaRosterListInner(nbaContext, rosterOpts = {}) {
  const { hasImage = false, question = "", matchup = null } = rosterOpts;
  const playersByTeam = nbaContext?.rosterGrounding?.playersByTeamAbbrev || {};
  const qualityByTeam = nbaContext?.rosterGrounding?.qualityByTeam || {};
  let rosterQuality = nbaContext?.rosterGrounding?.rosterGroundingQuality;
  if (matchup?.awayAbbr && matchup?.homeAbbr) {
    const away = String(matchup.awayAbbr || "").toUpperCase();
    const home = String(matchup.homeAbbr || "").toUpperCase();
    const awayCount = (playersByTeam[away] || []).length;
    const homeCount = (playersByTeam[home] || []).length;
    rosterQuality =
      awayCount >= 4 && homeCount >= 4
        ? "full"
        : awayCount > 0 && homeCount > 0
          ? "partial"
          : "thin";
    if (qualityByTeam[away] === "thin" || qualityByTeam[home] === "thin") {
      rosterQuality = "thin";
    } else if (qualityByTeam[away] === "partial" || qualityByTeam[home] === "partial") {
      rosterQuality = rosterQuality === "full" ? "partial" : rosterQuality;
    }
  }
  const names = [...collectNbaVerifiedPlayerNamesFromGrounding(nbaContext)];

  const namedInQuestion = questionExplicitlyNamesPlayerCue(question);
  const userGrounded = hasImage || namedInQuestion;

  if (userGrounded) {
    const apiLine = names.length
      ? `Reference names from context: ${names.join(", ")}`
      : "Use image and Question text as the name source when the slate list is empty.";
    return `USER-SUPPLIED GROUNDING — OVERRIDES “NO NAMES” ROSTER MODE
${hasImage ? "- An image is attached: read visible player names, prop lines, prices, and stat rows from the screenshot as primary evidence.\n" : ""}${namedInQuestion ? "- The Question targets a specific player by name — discuss that player directly.\n" : ""}- ${apiLine}

You MUST use names and numbers from the image and/or the Question.
Do not refuse to name a player who is visible in the image or clearly named in the Question solely because playersByTeamAbbrev is empty or incomplete.
If the named player is not on tonight's roster strings, say "live roster data unavailable for [player]" and still give role/form/matchup analysis — never say they are "not in the verified roster" or "not on the roster" as a refusal.`;
  }

  const thinOrAbsentBody = `INTERNAL ROSTER LIST: no authorized names in payload for these teams.
Do not name specific players for those sides unless the Question or an attached image names them.
Give team-level analysis only — pace, scheme, series context, matchup profile, injuries from context.
Inventing player names destroys trust.`;

  if (names.length === 0) {
    return thinOrAbsentBody;
  }

  if (rosterQuality === "full") {
    return `INTERNAL — AUTHORIZED NAMES FOR TONIGHT (do not describe this list or its completeness to the user):
${names.join(", ")}

Name only these players when discussing tonight's games (unless Question/image authorizes another name per rules below).`;
  }

  if (rosterQuality === "partial") {
    return `INTERNAL — AUTHORIZED NAMES FOR TONIGHT (do not describe this list or its completeness to the user):
${names.join(", ")}

You may ONLY name players on this list for team-specific assignments. For any team with no names in playersByTeamAbbrev, use team-level analysis only — do not supplement with training memory.`;
  }

  if (rosterQuality === "thin") {
    return `INTERNAL — AUTHORIZED NAMES FOR TONIGHT (do not describe this list or its completeness to the user):
${names.join(", ")}

You may name anyone on this list. For a team with no names under playersByTeamAbbrev, use team-level read for that side only.`;
  }

  return `INTERNAL — AUTHORIZED NAMES FOR TONIGHT (do not describe this list or its completeness to the user):
${names.join(", ")}

Name only these players when discussing player-specific props unless the image or question authorizes another name.`;
}

export function buildNbaRosterProminentInjection(nbaContext, rosterOpts = {}) {
  return `════════════════════════════════════════
${buildNbaRosterListInner(nbaContext, rosterOpts)}
════════════════════════════════════════`;
}

export const NO_MARKET_VERIFIED_PLAYER_STEP_2 = `2. Name the two to four highest-usage players from the AUTHORIZED list for each team in the matchup. For SAS this must include Wembanyama if present. Never stop at one name if more authorized names exist for the matchup teams.
If fewer than two authorized names exist for the matchup, do NOT invent names.
Give a sharp team-level read anchored to matchup context — never mention missing lines,
loading pipelines, or roster completeness.`;

export const PROP_PROJECTION_MODE_BLOCK = `PROP PROJECTION MODE — MANDATORY

The user is explicitly asking for prop projections. You MUST deliver:

For tennis:
- Match winner lean with price threshold
- Total games: OVER/UNDER with specific number
- Aces for each player: "project ~N per set, ~N total"
- Double faults for each player: "project ~N"
- Break points saved: "~N% for each player"
- Scoreline prediction: "[winner] in [sets], [X-X X-X] range"

For NBA: points, rebounds, assists for each named player with ranges.
For MLB: K total for each pitcher, total bases for key hitters.
For golf: finishing position probability ranges for named golfers.
For F1: podium probability for named drivers.

If the player database has limited data for a player, use surface/venue
baselines and tour averages. ALWAYS produce projections. Never say
"cannot project without more data." Confidence reflects data quality.

In Tier 2.5 summary, PROP PROJECTIONS must contain at least 4 specific lines.`;

export const SPREAD_AND_GAME_SIDE_BLOCK = `SPREAD AND GAME SIDE — when user asks about a spread, ATS, or which team covers:

- Use only spreads.{gameKey}.current.displayLine from the NBA context JSON (favorite carries the minus, e.g. DET -4.5 at home). Never flip favorite/underdog.
- If spreads[].lineMovement.hasMovement is true, cite lineMovement.narrative in analysis.lineMovement.
- If lineUnavailable is true, say "line unavailable" once — no invented numbers.

Answer the spread question directly in the first sentence. Do not pivot to a prop angle.
Format: '[Team] covers at [number] if [specific condition]. The fragile assumption behind the other side: [one sentence].'
Identify the specific game script that decides the cover — pace, foul trouble, bench depth, specific player performance threshold.
Name the kill script explicitly: 'This breaks if [specific condition].'
End with the live trigger format: 'Live trigger: [player/team] [observable action] by [time marker] — if yes, [cover holds]. If no, [reassess].'`;

export const ROSTER_ENFORCEMENT_NBA = `ROSTER ENFORCEMENT G�� THIS IS A HARD RULE WITH NO EXCEPTIONS

playersByTeamAbbrev in rosterGrounding lists the ONLY players you are
allowed to name as members of each team. Use this for internal checks only G��
never narrate roster completeness, verification status, or data pipelines to the user.

YOU MUST FOLLOW THESE RULES EXACTLY:

1. Before naming ANY player as being on a team, check that their EXACT
   full name appears under that team's abbreviation in
   rosterGrounding.playersByTeamAbbrev. If it does not appear, you
   CANNOT name them as being on that team. Period.

2. If VALID PLAYER POOL includes a focused matchup roster quality line, use that
   matchup-scoped quality instead of global rosterGroundingQuality. If focused
   matchup roster quality is full, use the listed names normally. If it is thin,
   give team-level analysis (pace, scheme, series, totals, injuries from context)
   without inventing players. Do NOT tell the user the roster is missing,
   unconfirmed, partial, or loading G�� if coverage is weak, reflect that only
   through CONFIDENCE (High / Medium / Speculative), not a prose disclaimer.

3. Your training data about NBA rosters is STALE and WRONG. Trades,
   injuries, and roster moves happen constantly. A player you "know"
   is on a team from training may have been traded months ago. NEVER
   use training memory for specific player-team assignments.

4. "De'Andre Murray", "Marcus Young", or any name you generate that
   is not in playersByTeamAbbrev is a hallucinated player. Hallucinated
   players destroy user trust and make this product worthless. There
   is no acceptable scenario where you invent a player name.

5. EXCEPTION G�� IMAGE OR USER-NAMED PLAYER: When an image is attached OR the
   Question explicitly names a player (or shows their line card), that name and
   any stats visible in the screenshot or stated in the Question are AUTHORIZED.
   Do not reply with GǣI can't cite [that player] without verification.Gǥ The user
   supplied the source. Use API roster lists only as a supplement.
   If they are missing from playersByTeamAbbrev, note "live roster data unavailable
   for [player]" and analyze from stats in context G�� never refuse as "not in verified roster."

ROSTER DISCLOSURE RULE:
Never tell the user which players are verified, partial, or loading.
Never say "working from partial roster data."
Never say "data is still loading" or any variation.
Never say which team's roster is confirmed vs thin.
Never mention client UI, API merge, rosterGroundingQuality, or "combined" data sources.
The confidence line reflects data quality. That is the only place uncertainty
about data completeness belongs. Nowhere else.

TYPO / SLANG NAME RESOLUTION (mandatory): Verified BallDontLie roster lists for this slate are sufficient to identify who the user means. When a token in the Question does not exactly match a listed name, fuzzy-match it to the closest authorized full name on either team (playersByTeamAbbrev / INTERNAL authorized-name blocks). Use that verified full name naturally in the analysis G�� never ask the user to confirm identity ("if you meant", "tell me who", "correct spelling"). Do not use staged "That's [Name] G��" openers; align with global tone rules. ESPN/board enrichment in context is authoritative for game framing G�� not an excuse to punt on name resolution.

ENFORCEMENT CHECK: Before generating your response, mentally verify each player name:
If the name appears in the Question or attached image G�� allowed.
Otherwise, for roster membership G�� must appear under the correct team in
playersByTeamAbbrev or remove it.`;

function _parseNbaTonightGameAbbrs(tonightGame) {
  const s = String(tonightGame || "").trim();
  const m = s.match(/^([A-Z0-9]{2,4})\s*@\s*([A-Z0-9]{2,4})$/i);
  if (!m) return null;
  return { away: m[1].toUpperCase(), home: m[2].toUpperCase() };
}

