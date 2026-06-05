/** NBA handler-only runtime helpers */
import {
  classifyNbaBoardGamePhase,
  extractNbaTeamAbbrevsFromQuestion,
  nbaGameHasVerifiedBoxScore,
} from "../../nba.js";
import { nbaBoardHasPostedPropMarkets } from "../../../shared/nbaPostedPropMarkets.js";
import { normalizeConfidenceVocabularyInText } from "./textSanitizers.js";
import { gameRowMatchesPropGame } from "./contextForModel.js";

export function buildNbaObservabilityMeta({
  decisionMode,
  sport,
  matchupGroundingApplied,
  postValidationChecked,
  postValidationTriggered,
  fallbackOrRepairUsed,
}) {
  return {
    decisionMode: String(decisionMode || "none"),
    sport: String(sport || "nba"),
    matchupGroundingApplied: Boolean(matchupGroundingApplied),
    postValidationChecked: Boolean(postValidationChecked),
    postValidationTriggered: Boolean(postValidationTriggered),
    fallbackOrRepairUsed: Boolean(fallbackOrRepairUsed),
  };
}

export function logNbaObservability(meta) {
  console.log(
    JSON.stringify({
      event: "ur_take_nba_observability",
      ...meta,
    }),
  );
}

/** Removes internal control markers from user-visible prose. */
export function stripNbaInternalControlLabels(text) {
  const s = String(text || "");
  if (!s.trim()) return s.trim();
  return s
    .split(/\r?\n/)
    .filter((line) => {
      const l = String(line || "").trim();
      if (!l) return true;
      if (/^DECISION MODE:\s*/i.test(l)) return false;
      if (/NBA SERVER DECISION MODE/i.test(l)) return false;
      if (/CONDITIONAL_WAIT MODE/i.test(l)) return false;
      if (/^NBA GAME-STATE AUTHORITY\b/i.test(l)) return false;
      return true;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function findFocusedNbaGameFromBoard(nbaContext, matchup) {
  const games = Array.isArray(nbaContext?.todaysGames) ? nbaContext.todaysGames : [];
  if (!games.length) return null;
  if (matchup?.awayAbbr && matchup?.homeAbbr) {
    const aa = String(matchup.awayAbbr).toUpperCase();
    const ha = String(matchup.homeAbbr).toUpperCase();
    const hit = games.find(
      (g) =>
        String(g?.awayTeam?.abbr || "").toUpperCase() === aa &&
        String(g?.homeTeam?.abbr || "").toUpperCase() === ha,
    );
    if (hit) return hit;
  }
  if (games.length === 1) return games[0];
  return null;
}

/**
 * True when injected board/tournament state shows in-progress play for the resolved sport.
 * NFL/F1: not wired here (always false).
 *
 * @param {{
 *   sportHint: string,
 *   nbaContext: object | null | undefined,
 *   nbaMatchup: { awayAbbr?: string, homeAbbr?: string } | null,
 *   mlbContext: object | null | undefined,
 *   liveMatches: unknown[] | null | undefined,
 *   golfContextEffective: object | null | undefined,
 * }} p
 */
export function computeIsBoardLive(p) {
  const s = String(p?.sportHint || "").toLowerCase();
  if (s === "nba") {
    const games = Array.isArray(p?.nbaContext?.todaysGames) ? p.nbaContext.todaysGames : [];
    const rowIsLiveOrHalftime = (g) => {
      const ph = classifyNbaBoardGamePhase(g);
      return ph === "live" || ph === "halftime";
    };
    const focused =
      p?.nbaMatchup?.awayAbbr && p?.nbaMatchup?.homeAbbr
        ? findFocusedNbaGameFromBoard(p.nbaContext, p.nbaMatchup)
        : null;
    if (focused) return rowIsLiveOrHalftime(focused);
    return games.some(rowIsLiveOrHalftime);
  }
  if (s === "mlb") {
    const games = Array.isArray(p?.mlbContext?.games) ? p.mlbContext.games : [];
    return games.some((g) => String(g?.state || "").toLowerCase() === "in");
  }
  if (s === "tennis" || s === "tennis_wta_profile") {
    return Array.isArray(p?.liveMatches) && p.liveMatches.length > 0;
  }
  if (s === "golf") {
    return String(p?.golfContextEffective?.currentEvent?.state || "").toLowerCase() === "in";
  }
  return false;
}

export function buildNbaGameStateGateSnapshot(nbaContext, matchup) {
  const focusedGame = findFocusedNbaGameFromBoard(nbaContext, matchup);
  const phase = classifyNbaBoardGamePhase(focusedGame);
  const verifiedBoxScore = nbaGameHasVerifiedBoxScore(focusedGame);
  const allowsLiveNarrative =
    verifiedBoxScore && (phase === "live" || phase === "halftime" || phase === "final");
  return { focusedGame, phase, verifiedBoxScore, allowsLiveNarrative };
}

export function buildNbaGameStateAuthorityBlock(gate) {
  if (!gate || typeof gate !== "object") return "";
  const { phase, verifiedBoxScore, allowsLiveNarrative } = gate;
  const phaseLabel = String(phase || "unknown");

  let rules =
    "- Phase comes ONLY from `todaysGames[]` rows (state, status, scores, period, clock). Never infer score or quarter from user wording alone.\n";
  if (!allowsLiveNarrative) {
    rules +=
      "- STRICT: Do not state or imply current in-game score, quarter, clock, halftime, live momentum, or pace math from invented game state.\n";
    rules += `- Board-classified phase for this matchup: **${phaseLabel}**. Use pregame-safe reasoning from injuries, matchup structure, series context, and listed markets only; do not explain missing live data to the user.\n`;
  } else {
    rules +=
      "- Live/halftime/final numbers may appear ONLY when copied from JSON for this game (scores/status). Never invent clocks or quarters.\n";
  }

  return `NBA GAME-STATE AUTHORITY (SERVER ??? obey; never quote this header)
Focused matchup phase (board-derived): ${phaseLabel}. Verified box scores on focused row: ${verifiedBoxScore ? "yes" : "no"}.
${rules}`;
}

/** When the focused board row is final ??? recap-only framing for the user prompt. */
export function buildNbaPostGameUserPromptBlock(gate) {
  if (!gate || String(gate.phase || "").toLowerCase() !== "final") return "";
  return `NBA POST-GAME MODE (SERVER ??? focused matchup is FINAL)
The game is finished. Write as a recap / results read, not a live betting card.
- Do not use live-betting framing (no "best look / watch" live scaffold, no quarter-clock signature ending in "�� Live.", no "live trigger" as if the book is still open on this outcome).
- Do not give floor/ceiling or "lean the over/under if it posts" style **actionable** prop sizing on markets that are decided for this game ??? state what the box score and posted results show when present.
- If the user asks for props, explain what hit or missed using numbers from context only; label the read as informational, not a ticket to place now.
- If context rows still look in-progress but you have a verified final scoreline in this payload, trust the final scoreline and avoid forward-looking bet language.`;
}

export function formatNbaGameStateBlocksForUserPrompt(gate) {
  if (!gate || typeof gate !== "object") return "";
  const authority = buildNbaGameStateAuthorityBlock(gate);
  const postGame = buildNbaPostGameUserPromptBlock(gate);
  const body = postGame ? `${authority}\n\n${postGame}` : authority;
  return body ? `${body}\n\n` : "";
}

export function buildNbaLiveNoPropSystemPromptBlock(gate, nbaContext) {
  const phase = String(gate?.phase || "").toLowerCase();
  const isLiveGame = phase === "live" || phase === "halftime";
  const props = Array.isArray(nbaContext?.propLines) ? nbaContext.propLines : [];
  const focusedGame = gate?.focusedGame || null;
  const relevantPropCount = focusedGame
    ? props.filter((pl) => gameRowMatchesPropGame(pl?.game, focusedGame)).length
    : props.length;
  const hasPostedAnProps = nbaBoardHasPostedPropMarkets(nbaContext);
  if (!gate?.allowsLiveNarrative || !isLiveGame || relevantPropCount > 0 || hasPostedAnProps) {
    return "";
  }

  return `NBA LIVE GAME RULE ??? PROP MARKETS UNAVAILABLE (SERVER ??? obey; never quote this header)
Never surface technical errors, variable names, array names, HTTP status codes, or API details to users. Ever. No exceptions.
When prop lines are unavailable, do not mention it. Do not apologize. Do not explain. Pivot to the strongest angle from live game state: minutes played, pace, foul trouble, rotation patterns, early stat lines, and matchup dynamics.
The opener is governed by Step 1 of the framework ??? state the trigger condition (live minute, foul count, rotation shift); do not open with what you don't have.
When analyzing a live game, close the response with a one-line signature in this format: TEAM1 SCORE, TEAM2 SCORE �� Q? TIME �� Live. This replaces the need to announce "the game is live" in the opening.`;
}

export function formatNbaLiveScoreSignature(game) {
  if (!game || typeof game !== "object") return "";
  const awayAbbr = String(game?.awayTeam?.abbr || "AWAY").toUpperCase();
  const homeAbbr = String(game?.homeTeam?.abbr || "HOME").toUpperCase();
  const awayScore = game?.awayTeam?.score;
  const homeScore = game?.homeTeam?.score;
  if (!Number.isFinite(Number(awayScore)) || !Number.isFinite(Number(homeScore))) return "";

  const period = Number(game?.period);
  const quarter = Number.isFinite(period) && period > 0 ? `Q${period}` : "Q?";
  const clock = String(game?.clock || "").trim() || String(game?.status || "").trim() || "time unavailable";
  return `${awayAbbr} ${Number(awayScore)}, ${homeAbbr} ${Number(homeScore)} �� ${quarter} ${clock} �� Live.`;
}

/* Post-generation live-state repair (regex replace of model output) intentionally not shipped yet.
   Rely on data gate + NBA GAME-STATE AUTHORITY prompt block first; add repair only if production
   shows the model still hallucinates scores/times after that. */

export function normalizeConfidenceVocabulary(label) {
  const s = String(label || "").trim().toLowerCase();
  if (s === "high") return "High";
  if (s === "medium" || s === "lean") return "Medium";
  if (s === "speculative" || s === "low" || s === "watch") return "Speculative";
  return "";
}

export function confidenceVocabRank(label) {
  const norm = normalizeConfidenceVocabulary(label);
  if (norm === "High") return 3;
  if (norm === "Medium") return 2;
  return 1;
}

export function confidenceVocabFromRank(rank) {
  if (rank >= 3) return "High";
  if (rank >= 2) return "Medium";
  return "Speculative";
}

export function ensureNbaTakeConfidenceConsistency({
  takeRecord,
  decisionMode,
  derivedConfidence,
  confidenceModifier,
}) {
  if (!takeRecord || typeof takeRecord !== "object") return takeRecord;

  // Terminal floor: conditional_wait always emits Speculative regardless of model output.
  if (decisionMode === "conditional_wait") {
    return {
      ...takeRecord,
      confidence: "Speculative ??? Status unresolved; wait for final availability.",
    };
  }

  const reason = String(confidenceModifier?.reason || "").trim();
  const modifierLabel = normalizeConfidenceVocabulary(
    confidenceModifier?.label || derivedConfidence || "Speculative",
  );
  const modifierRank = confidenceVocabRank(modifierLabel);

  const current = String(takeRecord.confidence || "").trim();
  const isMissing = !current || /^unspecified$/i.test(current);
  const headMatch = current.match(/^([A-Za-z]+)/);
  const modelLabel = headMatch ? normalizeConfidenceVocabulary(headMatch[1]) : "";
  const modelRank = modelLabel ? confidenceVocabRank(modelLabel) : modifierRank;

  // Clamp: final rank cannot exceed modifier rank (e.g. modifier Speculative blocks model High).
  const finalRank = Math.min(modelRank, modifierRank);
  const finalLabel = confidenceVocabFromRank(finalRank);

  // If clamp dropped the model's tier, the model's prose justification no longer holds ??? replace with modifier reason.
  if (!isMissing && finalRank < modelRank) {
    return {
      ...takeRecord,
      confidence: reason ? `${finalLabel} ??? ${reason}` : finalLabel,
    };
  }

  // Model wrote a valid tier within the cap ??? preserve as-is.
  if (!isMissing && modelLabel) {
    return takeRecord;
  }

  // Missing or unspecified ??? fill with clamped label + modifier reason.
  return {
    ...takeRecord,
    confidence: reason ? `${finalLabel} ??? ${reason}` : finalLabel,
  };
}

export function hasNbaNoMarketHardFail(text) {
  const s = String(text || "");
  return /\bno edge here\b/i.test(s) ||
    /\bcome back (?:when|later)\b/i.test(s) ||
    /\bwait for lines\b/i.test(s) ||
    /^\s*no\s+(?:player\s+)?prop\s+markets?\s+(?:posted|available)\b/i.test(s) ||
    /\bprops?\s+(?:aren't|are not)\s+(?:fully\s+)?available\b/i.test(s) ||
    /\bno confirmed (?:markets?|prices?)\b/i.test(s) ||
    /\bmarket snapshot is empty\b/i.test(s) ||
    /^\s*no (?:markets?|prices?) posted\b/i.test(s);
}

export function isNbaNoMarketUpcomingSlate(nbaContext) {
  const games = Array.isArray(nbaContext?.todaysGames) ? nbaContext.todaysGames : [];
  const hasUpcoming = games.some((g) => {
    const state = String(g?.state || "").toLowerCase();
    return state !== "post";
  });
  return !nbaBoardHasPostedPropMarkets(nbaContext) && hasUpcoming;
}

export function buildNbaNoMarketHardFallback(question, nbaContext) {
  const games = Array.isArray(nbaContext?.todaysGames) ? nbaContext.todaysGames : [];
  const qTeams = extractNbaTeamAbbrevsFromQuestion(question);

  const gameForQuestion = games.find((g) => {
    const aa = String(g?.awayTeam?.abbr || "").toUpperCase();
    const ha = String(g?.homeTeam?.abbr || "").toUpperCase();
    return qTeams.length >= 2
      ? qTeams.includes(aa) && qTeams.includes(ha)
      : qTeams.length === 1
        ? qTeams.includes(aa) || qTeams.includes(ha)
        : false;
  }) || games.find((g) => String(g?.state || "").toLowerCase() !== "post") || games[0] || null;

  const away = String(gameForQuestion?.awayTeam?.abbr || qTeams[0] || "AWAY").toUpperCase();
  const home = String(gameForQuestion?.homeTeam?.abbr || qTeams[1] || "HOME").toUpperCase();
  const title = `${away} @ ${home}`;
  const phase = classifyNbaBoardGamePhase(gameForQuestion);
  const isLiveGame = phase === "live" || phase === "halftime";
  const liveSignature = formatNbaLiveScoreSignature(gameForQuestion);

  const pbt = nbaContext?.rosterGrounding?.playersByTeamAbbrev || {};
  const awayName = Array.isArray(pbt?.[away]) ? pbt[away][0] : null;
  const homeName = Array.isArray(pbt?.[home]) ? pbt[home][0] : null;

  const totalKeys = Object.keys(nbaContext?.gameTotals || {});
  const maybeTotal = totalKeys.length > 0 ? nbaContext.gameTotals[totalKeys[0]]?.total : null;
  const lowBand = Number.isFinite(Number(maybeTotal)) ? Math.max(208.5, Number(maybeTotal) - 5) : 214.5;
  const highBand = Number.isFinite(Number(maybeTotal)) ? Number(maybeTotal) + 1.5 : 221.5;

  const p1 = awayName
    ? `${awayName} volume is the first prop angle: lean over points if his opener lands in a fair band, and fade only if it opens materially above role baseline.`
    : `${away} shot-creation volume is the first prop angle: lean overs on lead usage if books hang conservative numbers.`;
  const p2 = homeName
    ? `${homeName} creation counters that: look assists/points depending on coverage, and avoid extremes unless the opener is clearly mispriced.`
    : `${home} primary initiator creation is the counter-angle: target assists or points based on coverage, not guesswork.`;

  if (isLiveGame) {
    const liveP1 = awayName
      ? `${awayName}'s live role is the first angle: weigh his minutes, touches, and foul count before chasing raw scoring pace.`
      : `${away} shot-creation is the first angle: weigh live touches and rotation shape before chasing raw scoring pace.`;
    const liveP2 = homeName
      ? `${homeName}'s counter is creation volume: his assists/points profile gets stronger if the defense is sending help early.`
      : `${home} primary creation is the counter-angle: trust role, matchup pressure, and foul trouble over stale pregame assumptions.`;

    return `${title} is a live-state read now: lean into the side creating cleaner possessions and avoid chasing raw pace unless minutes and rotation pattern support it.

${liveP1} ${liveP2}

Early stat lines matter more than pregame priors now: foul trouble, shortened rotations, and whether the lead creators are getting full run should drive the next move. If the game is producing paint touches and free throws without empty transition possessions, live overs get cleaner; if both teams are bleeding clock, stay selective.

${liveSignature || `${away} ?, ${home} ? �� Q? ${String(gameForQuestion?.status || "in progress").trim()} �� Live.`}`;
  }

  return `Check your books now, then lean into the strongest pregame angle.

${title} pregame edge is the number, not the delay.

${p1} ${p2}

Game total framework: under is the lean if the opener is ${highBand.toFixed(1)} or higher; over only becomes playable if it opens ${lowBand.toFixed(1)} or lower. In the middle band, stay selective and price-sensitive.

Live trigger: if the first 6 minutes produce 8+ combined free throws or repeated early-clock paint attacks, pivot to live over; if both teams are walking it up and living late-clock, stay with under angles.`;
}
