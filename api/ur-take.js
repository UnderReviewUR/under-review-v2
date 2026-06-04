export const config = { api: { bodyParser: { sizeLimit: "2mb" } } };

import { applyCors } from "./_cors.js";
import { getDurableJson } from "./_durableStore.js";
import { getEnv } from "./_env.js";
import { shouldRequireUrTakeAuth, verifyBearerForUrTake } from "./_urTakeAuth.js";
import { sanitizeUrTakeBody } from "./_sanitizeUrTakeBody.js";
import {
  BRO_TONE_REGENERATION_SUFFIX,
  QA_REGENERATION_SYSTEM_SUFFIX,
  logLeanContractIfMissing,
  qaRequiresRegeneration,
  runUnderReviewPostProcess,
} from "./_urTakeOutputQA.js";
import {
  generateLiveFollowUpsWithHaiku,
  shouldAttachLiveFollowUps,
} from "./_urTakeLiveFollowUps.js";
import {
  allowRateLimit,
  emailLimit,
  getClientIp,
  ipLimit,
} from "./_rateLimitUrTake.js";
import {
  getFreeQuotaStatus,
  getSessionQuotaStatus,
  isGateServerQuotaEnforce,
  releaseGateQuota,
  releaseSessionQuota,
  reserveGateQuota,
  reserveSessionQuota,
  shouldEnforceGateQuotaForTake,
} from "./_gateQuota.js";
import { buildDerbyContext, isDerbyActive } from "./_derby2026.js";
import { buildWorldCupUrTakeContext } from "./_wcUrTakeContext.js";
import {
  runWcUrTakeQA,
  wcQaRequiresRegeneration,
  WC_PLAYER_MARKET_QA_SUFFIX,
  WC_QA_REGENERATION_SUFFIX,
} from "./_wcUrTakeQA.js";
import {
  classifyWcQuestionIntent,
  shouldInjectStaticRules,
  WC_FOLLOW_UP_SYSTEM_APPENDIX,
  WC_INTENT,
} from "../shared/wcUrTakeIntent.js";
import { buildNbaRelevanceLog } from "../shared/nbaUrTakeRelevance.js";
import { nbaRequiresLiveUrTakeBoardRefresh } from "../shared/nbaLiveBoardRefresh.js";
import {
  classifyNbaQuestionIntent,
  NBA_INTENT,
  resolveRequiredNbaEntities,
} from "../shared/nbaUrTakeIntent.js";
import {
  formatNbaOutrightsForPrompt,
  nbaOutrightsInjectedForContext,
} from "../shared/nbaOutrightsFreshness.js";
import { resolveNbaFinalsUrTakeContext } from "../shared/nbaFinalsUtils.js";
import {
  readNbaFinalsMvpFromKv,
  readNbaFinalsSeriesFromKv,
} from "./_nbaOutrightsData.js";
import {
  buildEntityBindingPromptBlock,
  resolveRequiredEntities,
} from "../shared/wcUrTakeEntityBinding.js";
import { extractMentionedWcTeams } from "../shared/wcUrTakeKeywords.js";
import {
  isWcPlayerMarketIntent,
  resolveWcPlayerMarketResponse,
} from "../shared/wcUrTakePlayerMarket.js";
import { buildWcPlayerMarketPrebuiltStructured } from "../shared/wcPlayerMarketResolve.js";
import {
  buildWcSessionMemoryPrompt,
  extractSessionWcEntities,
} from "../shared/wcUrTakeSessionMemory.js";
import {
  buildWcMatchupIntentRules,
  getWcTeamStrengthTags,
} from "../shared/wcUrTakeMatchup.js";
import {
  buildPriceBindingPromptBlock,
  extractSessionAmericanOdds,
  stripSessionBleedPrices,
  stripWcStructuredSessionPrices,
} from "../shared/wcUrTakePricing.js";
import { normalizeWcStructuredForDelivery } from "../shared/wcUrTakeStructured.js";
import {
  buildWcRulesStructuredFromProse,
  formatWcRulesResponseAsProse,
} from "../shared/wcUrTakeStructured.js";
import { stripRulesThreadBleed, WC_RULES_TURN_APPENDIX } from "../shared/wcUrTakeRules.js";
import { questionReferencesDerby } from "../shared/derbyIntent.js";
import {
  buildUrTakeSportTurnScopeRules,
  resolveSportHint as resolveSportHintShared,
  questionMentionsWorldCup,
  sportsContextSwitched,
  stripUrTakeDeadEndCopy,
} from "../shared/urTakeSportRouting.js";
import { fetchAnthropicMessages } from "./_anthropicRetry.js";
import { appendTakeForUser, extractTakeFromResponse } from "./_takeLedger.js";
import { buildCanonicalNflContext } from "./_nflContext.js";
import { formatPropContextForPlayers } from "./_nflPropLineContext.js";
import {
  extractMentionedPersonFromQuestion,
  F1_ALWAYS_INCLUDE,
  isNameInMergedList,
  mergeVerifiedNamesWithFallback,
  MLB_ALWAYS_INCLUDE,
  NFL_ALWAYS_INCLUDE,
  personNamesMatch,
  TENNIS_ALWAYS_INCLUDE,
} from "./_sportVerifiedFieldFallbacks.js";
import {
  buildTeamDraftFocusBlock,
  getActiveDraftBundle,
  getNflTeamAbbrFromName,
  getNflDraftPhase,
  getNflTeamNameFromAbbr,
  resolveNflTeamFromQuestion,
} from "./nfl-draft-season.js";
import { simulateDraftRounds } from "./nfl-draft-engine.js";
import { detectNflTeamHint } from "../src/lib/detectSportFromQuestion.js";
import {
  buildNbaUrTakeBoard,
  buildNbaNewsImpact,
  canonicalizeTeamAbbr,
  extractNbaTeamAbbrevsFromQuestion,
  classifyNbaBoardGamePhase,
  nbaGameHasVerifiedBoxScore,
  questionMentionsPlayer,
} from "./nba.js";
import { buildMlbUrTakeBoard } from "./mlb.js";
import {
  alignGolfBoardToQuestion,
  buildCombinedVerifiedGolfField,
  getUnifiedGolfBoard,
  isKnownPgaTourPlayer,
  normalizeGolfName,
  resolveGolfPlayerInField,
} from "./_golfProviders.js";
import {
  extractGolfTournamentIntentFromQuestion,
  golfLabelsMatchIntent,
  golfQuestionNeedsEventRealign,
  GOLF_INTENT_WRONG_COURSE_FRAGMENTS,
} from "../shared/golfTournamentIntent.js";
import {
  resolveGolfPrimaryEvent,
  stripMisalignedGolfCourseArtifacts,
} from "../shared/golfHomeEventSelection.js";
import { augmentNbaRosterGroundingWithUi } from "../src/lib/nbaUiSurface.js";
import { getNbaPropsForBoard, hydrateNbaPropsOdds } from "./_nbaProps.js";
import {
  countNbaActiveSlatePropSignals,
  nbaBoardHasPostedPropMarkets,
} from "../shared/nbaPostedPropMarkets.js";
import {
  slimNbaPlayerStatRowForUrTake,
  slimPlayoffSeriesForBoard,
} from "../shared/nbaUrTakeSlim.js";
import { getSlipImageRouteMeta } from "./_slipImageIntent.js";
import { buildF1UrTakeContext } from "./f1.js";
import { buildF1OddsPromptBlock } from "./_f1Odds.js";
import {
  buildGolfOutrightBasketUserPromptAppendix,
  classifyGolfBetStructure,
} from "./_golfOutrightBasket.js";
import {
  buildCoreFrameworkPrompt,
  buildFactAuthorityPrompt,
  buildMlbParlayResponseRule,
  buildTakeTrustUiMetadata,
  composeRegisteredUrTakeSystemPrompt,
  detectParlayIntent,
  detectUrTakeLongFormIntent,
  resolveEvidenceSparsityProfile,
} from "./_urTakeSystemPromptRegistry.js";
import {
  buildNbaGroundingSnapshot,
  NBA_GROUNDING_REGENERATION_SUFFIX,
  NBA_STRUCTURAL_REGENERATION_SUFFIX,
} from "./_urTakeNbaGroundingQA.js";
import {
  UNIVERSAL_STRUCTURAL_REGENERATION_SUFFIX,
  buildTennisStructuralQaContext,
} from "../shared/structuralAngleValidation.js";
/** Core bro-voice system instructions — canonical text in ./_urTakeCoreVoice.js */
export { UR_TAKE_CORE_VOICE_PROMPT, sanitizeLeanBroTone } from "./_urTakeCoreVoice.js";
import {
  isNbaGroundingProseRefusal,
  tryBuildNbaGroundingRedirectStructured,
} from "./_urTakeGroundingRedirect.js";
import { buildAllowlistLowerSetFromSnapshot } from "./_urTakeNbaInventedPlayerShadow.js";
import {
  buildEnrichedMemoryPrompt,
  extractStructuredFromPlayText,
  saveSessionMemory,
} from "./_urTakeMemory.js";
import { appendSessionStructuralEdgeBlock } from "../shared/urTakeSessionStructuralEdge.js";
import {
  validateStructuredURTakeResponse,
  normalizeStructuredUrTakeResponse,
  repairStructuredForDelivery,
  stripBrokenQuoteFragments,
} from "./types/urTakeResponse.js";
import { getStructuredURTakePrompt } from "./prompts/urTakeStructuredPrompt.js";
import {
  applyNbaPropRecentFormContradiction,
  findFirstPlayerStatRowForQuestion,
  inferNbaPropDirection,
  inferPropDirectionFromText,
  nbaOverVsRecentFormContradiction,
  nbaUnderVsSeasonAverageImplausible,
  parseNbaRequestedMarket,
  resolveNbaRequestedMarket,
} from "./_nbaPropSanity.js";

export { buildNbaUrTakeDecisionModeSpine } from "./_urTakeSystemPromptRegistry.js";

/** Inline duplicate of _golfOddsApi.buildGolfOddsFreshnessPromptBlock — avoids ur-take importing scrape stack at module load. */
function buildGolfOddsFreshnessPromptBlock(odds) {
  const fresh = odds?.freshness;
  if (!fresh?.isStale && !fresh?.staleWarning) {
    if (odds?.fetchedAt) {
      return `\nODDS FRESHNESS: Posted prices fetched at ${odds.fetchedAt} (${fresh?.ageMinutes ?? "?"} min ago). Cite only prices listed under odds.outrights / odds.topFinish / odds.makeCut.\n`;
    }
    return "";
  }
  return `\nODDS FRESHNESS (mandatory):\n${fresh.staleWarning}\nFetched at: ${fresh.fetchedAt || odds.fetchedAt || "unknown"}.\n`;
}

/** Inline duplicate of _nbaPropsApi.buildNbaPropsFreshnessPromptBlock — avoids ur-take importing scrape stack at module load. */
function buildNbaPropsFreshnessPromptBlock(propsOdds) {
  const fresh = propsOdds?.freshness;
  const liveTag = propsOdds?.isLive || fresh?.maxAgeMinutes === 15 ? " (live game — max 15 min)" : "";
  if (!fresh?.isStale && !fresh?.staleWarning) {
    if (propsOdds?.fetchedAt) {
      return `\nODDS FRESHNESS: Posted NBA prop lines fetched at ${propsOdds.fetchedAt} (${fresh?.ageMinutes ?? "?"} min ago${liveTag}). Cite only prices listed under propsOdds.players[].props (points/rebounds/assists) and their books arrays.\n`;
    }
    return "";
  }
  return `\nODDS FRESHNESS (mandatory):\n${fresh.staleWarning}\nFetched at: ${fresh.fetchedAt || propsOdds.fetchedAt || "unknown"}${liveTag}.\n`;
}

/**
 * @param {Record<string, unknown> | null | undefined} nbaContext
 * @param {{ awayAbbr?: string, homeAbbr?: string } | null | undefined} nbaMatchup
 */
function buildNbaGameTotalsPromptBlock(nbaContext, nbaMatchup) {
  const totals =
    nbaContext?.gameTotals && typeof nbaContext.gameTotals === "object" && !Array.isArray(nbaContext.gameTotals)
      ? nbaContext.gameTotals
      : {};
  const away = String(nbaMatchup?.awayAbbr || "").toUpperCase();
  const home = String(nbaMatchup?.homeAbbr || "").toUpperCase();
  let row = null;
  let label = null;
  for (const [k, v] of Object.entries(totals)) {
    const ku = String(k).toUpperCase();
    if (away && home && ku.includes(away) && ku.includes(home)) {
      row = v;
      label = k;
      break;
    }
  }
  if (!row && Object.keys(totals).length === 1) {
    label = Object.keys(totals)[0];
    row = totals[label];
  }
  if (row?.total != null && Number.isFinite(Number(row.total))) {
    const pace = row.pace || "NEUTRAL";
    const src = row.source ? ` source=${row.source}` : "";
    return `\nGAME TOTAL (posted): ${label} — ${Number(row.total)} (pace: ${pace}${src}). Cite this number verbatim for pace/total reads; do not invent a different total.\n`;
  }
  return `\nGAME TOTAL: No posted total in gameTotals for this matchup — discuss pace qualitatively; do not invent a total line.\n`;
}

/**
 * @param {Record<string, unknown> | null | undefined} nbaContext
 * @param {{ awayAbbr?: string, homeAbbr?: string } | null | undefined} nbaMatchup
 */
/** Inline duplicate of shared/nbaPropsBoardDisplay.formatKeyPropsLinesForPrompt */
function buildNbaKeyPropsLinesPromptBlock(nbaContextForModel, propsOdds) {
  const stale =
    Boolean(nbaContextForModel?.propsOddsStale) ||
    Boolean(propsOdds?.freshness?.isStale);
  const stats = Array.isArray(nbaContextForModel?.playerStats)
    ? nbaContextForModel.playerStats
    : [];
  const rows = stats
    .filter((p) => p?.consensusProps?.markets && Object.keys(p.consensusProps.markets).length > 0)
    .sort((a, b) => Number(b?.pts || 0) - Number(a?.pts || 0))
    .slice(0, 10);
  if (!rows.length) return "";
  const lines = rows.map((p) => {
    const m = p.consensusProps.markets || {};
    const parts = [];
    for (const [market, row] of Object.entries(m)) {
      if (!row?.line) continue;
      const o = row.overOdds != null ? `o${row.overOdds}` : "";
      const u = row.underOdds != null ? `u${row.underOdds}` : "";
      parts.push(`${market} ${row.line} (${o}/${u} ${row.book || ""})`.trim());
    }
    return `- ${p.name} (${p.team}): ${parts.join("; ") || "no lines"}`;
  });
  const header = stale
    ? "KEY POSTED PROP LINES (stale — do not cite as live; describe relatively only):"
    : "KEY POSTED PROP LINES (consensus — cite only when ODDS FRESHNESS allows):";
  return `\n${header}\n${lines.join("\n")}\n`;
}

function resolveNbaPropsOddsForPrompt(nbaContext, nbaMatchup) {
  const base = nbaContext?.propsOdds;
  if (!base || typeof base !== "object") return null;
  const away = String(nbaMatchup?.awayAbbr || "").toUpperCase();
  const home = String(nbaMatchup?.homeAbbr || "").toUpperCase();
  if (!away || !home) return base;

  const games = Array.isArray(nbaContext?.todaysGames) ? nbaContext.todaysGames : [];
  const focus = games.find((g) => {
    const a = String(g?.awayTeam?.abbr || "").toUpperCase();
    const h = String(g?.homeTeam?.abbr || "").toUpperCase();
    return (a === away && h === home) || (a === home && h === away);
  });
  const gid = focus?.actionNetworkGameId ?? base?.gameId ?? nbaContext?.sourceMeta?.propsOddsGameId;
  if (gid != null && nbaContext?.propsOddsByGameId?.[String(gid)]) {
    return nbaContext.propsOddsByGameId[String(gid)];
  }
  return base;
}

/** Closing when markets / lines are missing — structural only; no hypothetical prices (aligns with STRUCTURAL ANALYSIS MODE). */
const NBA_STRUCTURAL_MARKET_CLOSING_RULE = `- Close with a direct structural call (THE CALL): name the edge and who benefits — grounded only in payload data. No hypothetical prices, no "if the line posts at X," no fabricated thresholds.`;

// Odds enhance but never gate a response. Availability is server-side only; the universal
// DATA AVAILABILITY RULE lives in composeRegisteredUrTakeSystemPrompt.

/** Deep-remove oddsAvailable so it never appears in model-facing JSON or prompts. */
function stripOddsAvailabilityFromContext(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(stripOddsAvailabilityFromContext);
  if (typeof value === "object") {
    const out = { ...value };
    delete out.oddsAvailable;
    for (const k of Object.keys(out)) {
      out[k] = stripOddsAvailabilityFromContext(out[k]);
    }
    return out;
  }
  return value;
}

function contextJsonForModel(obj) {
  return JSON.stringify(stripOddsAvailabilityFromContext(obj ?? {}), null, 2);
}

/** Keeps NBA follow-ups from dead-ending on name typos ("drop the name…"). */
const NBA_FOLLOW_UP_THREAD_RULE = `NBA FOLLOW-UP THREAD RULE (mandatory — same chat as prior messages)
- Verified BDL roster + slate + matchup context are supplied in the NBA context JSON below — you must resolve who the user means without asking. Map typos/nicknames to the closest verified full name on **this game's** roster strings in that payload; use that verified full name naturally in the first paragraph (where it fits the framework — never a staged name-drop opener). Execute props/rebounds/assists/PRA for that player.
- Forbidden anywhere in the message: "if you meant", "tell me who", "drop the name", "correct me if", or any user-facing name confirmation.
- Mandatory closer: Observable live trigger from game state in context, OR a structural THE CALL — numbers only if they appear in the payload (DATA CONFIDENCE RULE).
- Only if no token plausibly matches either roster after fuzzy resolution: two game-level angles using verified stars already named in context — still no spelling/confirmation asks.`;

// ── TODAY string — injected into every prompt ──────────────────────────────
function getTodayStr() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

// ── Helper: extract text from Anthropic response ───────────────────────────
function extractAnthropicText(data) {
  if (!data) return "";
  if (Array.isArray(data.content)) {
    const parts = [];
    for (const block of data.content) {
      if (!block || typeof block !== "object") continue;
      if (block.type === "text" && typeof block.text === "string") parts.push(block.text);
      else if (block.type === "output_text" && typeof block.text === "string") parts.push(block.text);
    }
    if (parts.length) return parts.join("\n").trim();
  }
  if (typeof data.text === "string" && data.text.trim()) return data.text.trim();
  return "";
}

/** When RULES turn leaks betting-shaped JSON, recover prose for tier1/rules delivery. */
function coerceWcRulesModelText(text, responseDeep = null) {
  const raw = String(text || "").trim();
  const parsed = tryParseJsonObject(raw);
  if (parsed && typeof parsed.summary === "string" && parsed.summary.trim()) {
    return {
      text: parsed.summary.trim(),
      deep: typeof parsed.deep === "string" ? parsed.deep.trim() : responseDeep,
    };
  }
  if (
    parsed &&
    typeof parsed === "object" &&
    !parsed.summary &&
    (parsed.whyNow || parsed.lean || parsed.call)
  ) {
    const parts = [parsed.lean, parsed.whyNow, parsed.edge, parsed.call]
      .filter((v) => typeof v === "string" && v.trim())
      .map((v) => String(v).trim());
    const prose = parts.join("\n\n");
    return { text: prose || raw, deep: responseDeep };
  }
  return { text: raw, deep: responseDeep };
}

function finalizeWcRulesDelivery({
  responseText,
  responseDeep,
  question,
  bleedForbidden,
  structuredResponse,
}) {
  const coerced = coerceWcRulesModelText(responseText, responseDeep);
  let text = stripRulesThreadBleed(coerced.text, bleedForbidden);
  let deep = coerced.deep ? stripRulesThreadBleed(String(coerced.deep), bleedForbidden) : null;

  const structured = buildWcRulesStructuredFromProse(
    text,
    deep,
    String(question || ""),
    bleedForbidden,
  );
  const formatted = formatWcRulesResponseAsProse(structured);
  if (formatted.trim()) text = formatted;

  return {
    responseText: text,
    responseDeep: deep,
    structuredResponse: structured,
  };
}

/** Dual-publish: turn validated structured JSON into prose so extractTakeFromResponse + UI still work. */
function formatStructuredResponseAsUrTakeProse(s) {
  if (!s || typeof s !== "object") return "";
  const lean = String(s.lean || "").trim();
  const call = String(s.call || "").trim();
  const conf = String(s.confidence || "").trim();
  const lines = [];
  if (lean) lines.push(lean);
  if (call) lines.push(`THE PLAY: ${call}`);
  if (conf) lines.push(`CONFIDENCE\n${conf}`);
  if (s.whyNow) lines.push(String(s.whyNow).trim());
  if (s.edge) lines.push(String(s.edge).trim());
  const a = s.analysis;
  if (a && typeof a === "object") {
    if (a.matchupAnalysis) lines.push(`MATCH READ\n${String(a.matchupAnalysis).trim()}`);
    if (a.injuryContext) lines.push(`INJURY / AVAILABILITY\n${String(a.injuryContext).trim()}`);
    if (a.marketContext) lines.push(`MARKET\n${String(a.marketContext).trim()}`);
    if (a.lineMovement) lines.push(`LINE MOVEMENT\n${String(a.lineMovement).trim()}`);
    if (a.statisticalEdge) lines.push(`STAT EDGE\n${String(a.statisticalEdge).trim()}`);
  }
  if (Array.isArray(s.caveats) && s.caveats.length) {
    lines.push(`WHAT KILLS IT\n${s.caveats.map((c) => String(c).trim()).filter(Boolean).join("\n")}`);
  }
  return lines.filter(Boolean).join("\n\n");
}

// ── Intent + sport helpers ─────────────────────────────────────────────────
function normalizeText(v) {
  return String(v || "").trim().toLowerCase();
}

function pickSurfaceKey(context) {
  const s = normalizeText(context?.currentTournament?.surface || "");
  if (s.includes("clay")) return "clay";
  if (s.includes("grass")) return "grass";
  return "hard";
}

function getPlayerSurfaceScore(player, surfaceKey) {
  const surfaceMap = {
    hard: ["hElo", "hardElo", "elo"],
    clay: ["cElo", "clayElo", "elo"],
    grass: ["gElo", "grassElo", "elo"],
  };
  const keys = surfaceMap[surfaceKey] || ["elo"];
  for (const key of keys) {
    const v = Number(player?.[key]);
    if (Number.isFinite(v)) return v;
  }
  return Number.NEGATIVE_INFINITY;
}

function buildTourShortlist(playersByTour, surfaceKey, limit = 8) {
  const entries = Object.entries(playersByTour || {});
  const ranked = entries
    .map(([name, p]) => ({
      name,
      score: getPlayerSurfaceScore(p, surfaceKey),
      hold: p?.serveStats?.holdPct ?? null,
      brk: p?.returnStats?.breakPct ?? null,
      dr: p?.overallStats?.dominanceRatio ?? null,
      style: p?.style || null,
    }))
    .filter((x) => Number.isFinite(x.score))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return ranked;
}

/** Best single Elo label for snapshot (thin rows may lack surface-specific fields). */
function snapshotEloLabel(p, surfaceKey) {
  const pick = (v, label) =>
    Number.isFinite(Number(v)) ? `${label} ${Number(v)}` : null;
  if (surfaceKey === "clay") {
    const c = pick(p?.cElo, "cElo");
    if (c) return c;
  } else if (surfaceKey === "hard") {
    const h = pick(p?.hElo, "hElo");
    if (h) return h;
  } else if (surfaceKey === "grass") {
    const g = pick(p?.gElo, "gElo");
    if (g) return g;
  }
  return (
    pick(p?.cElo, "cElo") ||
    pick(p?.hElo, "hElo") ||
    pick(p?.gElo, "gElo") ||
    pick(p?.elo, "Elo") ||
    pick(p?.yElo2026, "yElo")
  );
}

function snapshotHoldHint(p) {
  if (typeof p?.serveStats === "string" && p.serveStats.trim()) {
    return p.serveStats.split(",")[0]?.trim() || null;
  }
  if (p?.serveStats?.holdPct != null) {
    return `${p.serveStats.holdPct}% hold`;
  }
  if (typeof p?.returnStats === "string" && p.returnStats.trim()) {
    return p.returnStats.split(",")[0]?.trim().slice(0, 72) || null;
  }
  return null;
}

function snapshotDrHint(p) {
  if (typeof p?.overallStats === "string") {
    const m = p.overallStats.match(/Dominance Ratio\s+([\d.]+)/i);
    if (m) return `DR ${m[1]}`;
    const loose = p.overallStats.match(/\bDR\s+([\d.]+)\b/i);
    if (loose) return `DR ${loose[1]}`;
  }
  if (p?.overallStats?.dominanceRatio != null) {
    return `DR ${p.overallStats.dominanceRatio}`;
  }
  const note = String(p?.fullNote || "");
  const fromNote = note.match(/(?:Dominance Ratio|DR)\s+([\d.]+)/i);
  if (fromNote) return `DR ${fromNote[1]}`;
  return null;
}

/** Ranked snapshot lines for prompt injection (surface-weighted). Safe on sparse rows. */
function buildTennisPlayerSnapshot(playerDb, surfaceKey, limit = 30) {
  const ranked = buildTourShortlist(playerDb, surfaceKey, limit);
  return ranked
    .map(({ name }) => {
      try {
        const p = playerDb?.[name];
        if (!p || typeof p !== "object") return `${name} | (no row in DB)`;

        const eloTag = snapshotEloLabel(p, surfaceKey);
        const hold = snapshotHoldHint(p);
        const dr = snapshotDrHint(p);

        const surf =
          p.surfaceNote?.[surfaceKey] ||
          (surfaceKey === "clay" ? p.surfaceNote?.clay : null) ||
          (surfaceKey === "hard" ? p.surfaceNote?.hard : null) ||
          (surfaceKey === "grass" ? p.surfaceNote?.grass : null);

        const surfaces = surf
          ? `${surfaceKey}: ${String(surf).slice(0, 140)}`
          : [
              p.surfaceNote?.clay ? `clay: ${String(p.surfaceNote.clay).slice(0, 90)}` : null,
              p.surfaceNote?.hard ? `hard: ${String(p.surfaceNote.hard).slice(0, 90)}` : null,
            ]
              .filter(Boolean)
              .join(", ");

        const form =
          p.record2026 ||
          p.surfaceRecord2026 ||
          p.record ||
          p.miamiNote ||
          "";

        const note = p.fullNote ? String(p.fullNote).slice(0, 120) : "";

        const signals = [eloTag, hold, dr].filter(Boolean).join(" · ");
        const thin =
          !eloTag && !hold && !dr && !surfaces && !String(form).trim() && !note;

        const bits = [
          `${name}`,
          p.style ? String(p.style) : "",
          signals || (thin ? "partial row — cite cautiously from notes only" : ""),
          surfaces || "",
          form ? String(form).slice(0, 80) : "",
          note ? note : "",
        ].filter(Boolean);

        return bits.join(" | ");
      } catch {
        return `${name} | (snapshot parse skipped — row present but malformed)`;
      }
    })
    .join("\n");
}

function findPlayerRowLoose(name, tourObj) {
  if (!name || !tourObj || typeof tourObj !== "object") return null;
  const n = normalizeText(name);
  if (!n) return null;
  if (tourObj[name]) return tourObj[name];
  for (const [k, v] of Object.entries(tourObj)) {
    const kn = normalizeText(k);
    if (kn === n || kn.includes(n) || n.includes(kn)) return v;
  }
  return null;
}

function buildMatchupTennisDigest(homeName, awayName, players, surfaceKey) {
  const rowH =
    findPlayerRowLoose(homeName, players?.atp) ||
    findPlayerRowLoose(homeName, players?.wta);
  const rowA =
    findPlayerRowLoose(awayName, players?.atp) ||
    findPlayerRowLoose(awayName, players?.wta);

  const one = (label, row) => {
    if (!row || typeof row !== "object") {
      return `${label}: (no dedicated UR profile row for this name — do not invent stats; use matchup + tour context only.)`;
    }
    const eloTag = snapshotEloLabel(row, surfaceKey);
    const hold = snapshotHoldHint(row);
    const dr = snapshotDrHint(row);
    const surf =
      surfaceKey === "clay"
        ? row.surfaceNote?.clay
        : surfaceKey === "grass"
          ? row.surfaceNote?.grass
          : row.surfaceNote?.hard;
    const surfaces = surf ? `${surfaceKey}: ${String(surf).slice(0, 130)}` : "";

    const form =
      row.record2026 ||
      row.surfaceRecord2026 ||
      row.record ||
      row.miamiNote ||
      "";
    const note = row.fullNote ? String(row.fullNote).slice(0, 110) : "";

    const signals = [eloTag, hold, dr].filter(Boolean).join(" · ");
    const bits = [
      `${label}`,
      row.style ? String(row.style) : "",
      signals || "partial signals — cite cautiously",
      surfaces || "",
      form ? String(form).slice(0, 72) : "",
      note ? note : "",
    ].filter(Boolean);

    return bits.join(" | ");
  };

  return `${one(String(homeName || "").trim() || "Player A", rowH)}
${one(String(awayName || "").trim() || "Player B", rowA)}`;
}

/**
 * Ace prop lines aligned with the app Prop Guide (TennisScreen).
 * Clay events foreground avg_aces_clay, then ace_rate, then hard proxy — same contract as UI.
 */
function buildAcePropsDigest(aceProps, tournamentSurface) {
  if (!aceProps || typeof aceProps !== "object") return "Not available";
  const keys = Object.keys(aceProps);
  if (keys.length === 0) return "Not available";
  const surf = normalizeText(tournamentSurface);
  const clayEvent = surf.includes("clay");
  const lines = [];
  for (const [key, row] of Object.entries(aceProps)) {
    if (!row || typeof row !== "object") continue;
    const name = String(key || "").trim() || "unknown";
    const acePct = row.ace_rate != null ? String(row.ace_rate) : "—";
    const hard = row.avg_aces_hard;
    const clay = row.avg_aces_clay;
    if (clayEvent && clay != null && clay !== "" && Number.isFinite(Number(clay))) {
      lines.push(
        `${name}: ${clay} clay aces/gm · ${acePct} tour ace% · ${hard} hard aces/gm (proxy — matches app Prop Guide on clay)`,
      );
    } else {
      lines.push(`${name}: ${hard} aces/gm (hard proxy) · ${acePct} tour ace% (app Prop Guide line)`);
    }
  }
  return lines.join("\n");
}

function extractNflPlayersFromContext(nflContext) {
  const names = [];
  const seen = new Set();

  const add = (n) => {
    const t = String(n || "").trim();
    if (!t) return;
    const k = t.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    names.push(t);
  };

  if (nflContext && typeof nflContext === "object" && !Array.isArray(nflContext)) {
    const ui = nflContext.uiPlayers;
    if (ui && typeof ui === "object") {
      for (const k of Object.keys(ui)) add(k);
    }
  }

  const text =
    typeof nflContext === "string"
      ? nflContext
      : contextJsonForModel(nflContext);

  const regex = /^([^\n|]{2,})\s+\|\s+(RB|WR|TE|QB)\s+\|/gm;
  let match;
  while ((match = regex.exec(text))) {
    add(match[1]);
  }

  for (const n of NFL_ALWAYS_INCLUDE) add(n);
  return names;
}

function extractNflQuestionSubject(question) {
  const q = normalizeText(question).replace(/[^a-z0-9'\s.-]/g, " ");

  const willPattern =
    /\bwill\s+([a-z][a-z'-]*(?:\s+[a-z][a-z'-]*){0,2})\s+(throw|pass|rush|run|score|catch|record|have)\b/;
  const overUnderPattern =
    /\b([a-z][a-z'-]*(?:\s+[a-z][a-z'-]*){0,2})\s+(over|under)\s+\d/;

  const willMatch = q.match(willPattern);
  if (willMatch) return String(willMatch[1] || "").trim();

  const ouMatch = q.match(overUnderPattern);
  if (ouMatch) return String(ouMatch[1] || "").trim();

  return "";
}

function findNflPlayerMatch(questionSubject, playerNames) {
  if (!questionSubject || !Array.isArray(playerNames) || playerNames.length === 0) {
    return null;
  }

  if (isNameInMergedList(questionSubject, playerNames)) {
    return (
      playerNames.find((n) => personNamesMatch(questionSubject, n)) ||
      extractMentionedPersonFromQuestion(questionSubject, playerNames) ||
      questionSubject
    );
  }

  const subject = normalizeText(questionSubject);
  const subjectTokens = subject.split(/\s+/).filter(Boolean);
  if (subjectTokens.length === 0) return null;

  for (const playerName of playerNames) {
    const playerNorm = normalizeText(playerName);
    const playerTokens = playerNorm.split(/\s+/).filter(Boolean);

    if (playerNorm.includes(subject) || subject.includes(playerNorm)) {
      return playerName;
    }

    const overlap = subjectTokens.filter((t) => playerTokens.includes(t));
    if (overlap.length > 0) {
      return playerName;
    }
  }

  return null;
}

function shouldApplyNflUnsupportedGuard(question) {
  const q = normalizeText(question);
  return (
    q.includes(" over ") ||
    q.includes(" under ") ||
    q.includes("yards") ||
    q.includes("passing") ||
    q.includes("rushing") ||
    q.includes("receiving") ||
    q.includes("td") ||
    q.includes("touchdown")
  );
}

/** Draft / GM / capital questions — different guardrails than in-season prop board. */
function isNflDraftAngleQuestion(question) {
  const q = normalizeText(question);
  const needles = [
    "draft",
    "nfl draft",
    "first round",
    "round 1",
    "round one",
    "combine",
    "mock draft",
    "war room",
    "general manager",
    "front office",
    "trade up",
    "trade back",
    "on the clock",
    "pittsburgh",
    "overall pick",
    "top pick",
    "prospect",
    "draft capital",
    "comp pick",
    "compensatory",
    "draft order",
    "draft slot",
    "draft board",
    "kiper",
    "mcshay",
    "predict",
    "prediction",
    "pick by pick",
    "pick-by-pick",
    "each pick",
    "every pick",
    "every round",
    "all seven",
    "seven round",
    "seven rounds",
    "full mock",
    "who will we pick",
    "who we pick",
    "who we take",
    "our picks",
    "my picks",
  ];
  if (
    /\bgm\b/.test(q) &&
    (q.includes("draft") || q.includes("war room") || q.includes("front office"))
  ) {
    return true;
  }
  return needles.some((n) => q.includes(n));
}

/**
 * Routes draft questions so league-wide and prospect-profile asks are not forced into team simulation.
 * @returns {"TYPE_A"|"TYPE_B"|"TYPE_C"}
 */
function getNflDraftQuestionRoute(question, focusTeamAbbr) {
  const lower = String(question || "").toLowerCase();
  const hasTeam = !!focusTeamAbbr;

  const leagueWide =
    /\bsleeper|\bsleepers\b|biggest sleeper|best value picks?|who falls|who rises|\bwhole class\b|league[- ]wide|across the (draft|class|league)|who goes top|\btop\s*5\b|wins the draft|which team wins|\bwin the draft\b|best players available|most interesting (draft )?situation|best prospect at\b|\bbest (edge|quarterback|qb|receiver|wr|running back|rb|tackle|corner|corners|te|tight end|safety|safeties|idl|iol|guard|center|linebacker|lb)\b.*\b(in this class|this year|the class)\b/i.test(
      lower,
    ) || /\bwho (has|have) the (most|best) interesting\b/i.test(lower);

  if (leagueWide) return "TYPE_B";

  const profile =
    /\bgrade on\b|\b(valuation|value) on\b|\bdraft stock\b|\bprojected range\b|\bpositional rank\b/i.test(lower) ||
    /\bwhere (does|will)\b[\s\S]{0,120}\b(go|land|come off the board)\b/i.test(lower);

  if (profile) return "TYPE_C";

  const teamSim =
    /\bsimulate\b|\bmock draft\b|\bfull mock\b|\b(my|our) team'?s\b|\bwar room\b|\brounds?\s*1\s*[-–]\s*3\b|\bpick[\s-]by[\s-]pick\b|\beach pick\b|\bevery round\b|\ball seven\b|\bseven round/i.test(lower) ||
    (hasTeam &&
      /\bdraft\b|\bmock\b|\bpicks?\b|\bneeds?\b|\bcapital\b|\bwho will\b|\bwhat will\b|\bwho (does|do)\b/i.test(lower));

  if (teamSim) return "TYPE_A";

  return "TYPE_B";
}

function isSettledFactQuestion(question) {
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

function detectLiveGameSignals(question, hasImage) {
  const q = normalizeText(question);
  const liveKeywords = [
    "left in",
    "minutes left",
    "seconds left",
    "time left",
    "right now",
    "currently",
    "just happened",
    "live",
    "this quarter",
    "this inning",
    "this half",
    "this set",
    "bottom of",
    "top of",
    "end of",
    "q1",
    "q2",
    "q3",
    "q4",
    "1st half",
    "2nd half",
    "overtime",
    "ot",
    "needs",
    "has to",
    "on pace",
  ];
  const hasLiveKeyword = liveKeywords.some((kw) => q.includes(kw));
  return {
    isLive: hasImage || hasLiveKeyword,
    hasImage,
    hasLiveKeyword,
  };
}

function hasRecentLiveScreenshotContext(history) {
  if (!Array.isArray(history) || history.length === 0) return false;
  const recent = history.slice(-6);
  const livePattern =
    /\b(live|q[1-4]|quarter|halftime|1st q|2nd q|3rd q|4th q|clock|odds|draftkings|fanduel|scoreboard|@\s*[A-Z]{2,4}|\b\d{1,3}\s*[-:]\s*\d{1,3}\b)\b/i;
  return recent.some((msg) => livePattern.test(String(msg?.content ?? msg?.text ?? "")));
}

function isShortMarketFollowUp(question) {
  const q = normalizeText(question);
  const compact = q.replace(/\s+/g, " ").trim();
  if (!compact) return false;
  if (compact.length > 40) return false;
  return (
    /^(total|total over under|over|under|side|best bet)\??$/.test(compact) ||
    /^(over under|o\/u|ou)\??$/.test(compact) ||
    /^(over\??|under\??|side\??|best bet\??)$/.test(compact)
  );
}

export function detectIntent(question, hasImage) {
  const q = normalizeText(question);

  const hasExplicitSlipLanguage =
    q.includes("slip") ||
    q.includes("parlay") ||
    q.includes("entry") ||
    q.includes("ticket") ||
    q.includes("pick em") ||
    q.includes("pick'em") ||
    q.includes("bet slip") ||
    q.includes("my slip") ||
    q.includes("my ticket");

  if (hasImage && hasExplicitSlipLanguage) {
    return "slip_review";
  }

  if (q.includes("fade")) return "fade";
  if (q.includes("sleeper")) return "sleeper";
  if (q.includes("outright")) return "outright";
  if (getSlipImageRouteMeta(String(question ?? ""), Boolean(hasImage)).routesToSlip) {
    return "slip_review";
  }
  if (
    q.includes("best props") ||
    q.includes("what props") ||
    q.includes("prop for") ||
    q.includes("aces") ||
    q.includes("double faults") ||
    q.includes("games played") ||
    q.includes("scoreline") ||
    q.includes("predict") ||
    q.includes("projection") ||
    q.includes("what will") ||
    q.includes("how many")
  ) {
    return "prop_projection";
  }
  if (q.includes("prop")) return "prop";

  return "general";
}

export function resolveSportHint(opts) {
  return resolveSportHintShared({
    ...opts,
    chatHistory: opts?.chatHistory ?? opts?.history,
    derbyActive: isDerbyActive(),
    questionIsDerby: questionReferencesDerby(String(opts?.question || "")),
  });
}

function nbaUrTakeContextHasUsableData(ctx) {
  if (!ctx || typeof ctx !== "object") return false;
  return (
    (Array.isArray(ctx.todaysGames) && ctx.todaysGames.length > 0) ||
    (Array.isArray(ctx.playerStats) && ctx.playerStats.length > 0) ||
    (Array.isArray(ctx.propLines) && ctx.propLines.length > 0) ||
    !!ctx.liveBoxscore ||
    (Array.isArray(ctx.injuries) && ctx.injuries.length > 0)
  );
}

function normalizeAvailabilityStatusClass(value) {
  const s = String(value || "").toLowerCase();
  if (!s) return "";
  if (s.includes("questionable") || s.includes("gtd")) return "questionable";
  if (s.includes("doubtful")) return "doubtful";
  if (s.includes("out") || s.includes("inactive")) return "out";
  return "";
}

function getNbaSeriesGameNumberForGame(game, playoffSeries) {
  const away = String(game?.awayTeam?.abbr || "").toUpperCase();
  const home = String(game?.homeTeam?.abbr || "").toUpperCase();
  if (!away || !home || !Array.isArray(playoffSeries)) return 0;
  const row = playoffSeries.find((s) => {
    const sa = String(s?.away || "").toUpperCase();
    const sh = String(s?.home || "").toUpperCase();
    return (sa === away && sh === home) || (sa === home && sh === away);
  });
  if (!row) return 0;
  const sa = String(row?.away || "").toUpperCase();
  const sh = String(row?.home || "").toUpperCase();
  const awayWins = sa === away && sh === home ? Number(row?.awayWins || 0) : Number(row?.homeWins || 0);
  const homeWins = sa === away && sh === home ? Number(row?.homeWins || 0) : Number(row?.awayWins || 0);
  const played = (Number.isFinite(awayWins) ? awayWins : 0) + (Number.isFinite(homeWins) ? homeWins : 0);
  return played + 1;
}

/** Plain-language elimination signal for serverSummaryOneLiner (series wins in matchup question order). */
function appendPlayoffEliminationSuffix(winsAwayF, winsHomeF, af, hf) {
  const a = Number(winsAwayF) || 0;
  const h = Number(winsHomeF) || 0;
  if (a <= 2 && h <= 2) return " — no team facing elimination yet.";
  if (a === 3 && h === 3) return " — next game eliminates the loser.";
  const hi = Math.max(a, h);
  const lo = Math.min(a, h);
  if (hi >= 3 && lo <= 2 && hi > lo) {
    const trailing = a < h ? af : h < a ? hf : "";
    if (trailing) return ` — ${trailing} facing elimination.`;
  }
  return "";
}

/**
 * Explicit series snapshot for the Haiku JSON payload when the question anchors a matchup.
 * playoffSeries rows are ESPN-shaped: { away, home, awayWins, homeWins, round, status }.
 * awayF/homeF follow resolveNbaMatchupFromQuestion board order (@ away at home).
 */
function buildFocusedPlayoffSeriesSnapshot(awayF, homeF, playoffSeriesRows, todaysGames) {
  const af = String(awayF || "").toUpperCase();
  const hf = String(homeF || "").toUpperCase();
  const game = (todaysGames || []).find((g) => {
    const a = String(g?.awayTeam?.abbr || "").toUpperCase();
    const h = String(g?.homeTeam?.abbr || "").toUpperCase();
    return (a === af && h === hf) || (a === hf && h === af);
  });
  if (!af || !hf) return null;
  const hasPlayoffRows = Array.isArray(playoffSeriesRows) && playoffSeriesRows.length > 0;
  const row = hasPlayoffRows
    ? (playoffSeriesRows.find((s) => {
        const sa = String(s?.away || "").toUpperCase();
        const sh = String(s?.home || "").toUpperCase();
        return (sa === af && sh === hf) || (sa === hf && sh === af);
      }) || null)
    : null;

  const gameSeriesSummary = String(game?.seriesSummary || "").trim();
  const gameSeriesLeader = String(game?.seriesLeader || "").toUpperCase();
  const gameSeriesWins = Number(game?.seriesWins);
  const gameSeriesDeficit = Number(game?.seriesDeficit);
  const hasGameSeries =
    gameSeriesSummary &&
    Number.isFinite(gameSeriesWins) &&
    Number.isFinite(gameSeriesDeficit) &&
    gameSeriesWins >= 0 &&
    gameSeriesDeficit >= 0;
  if (!hasGameSeries && !row) return null;

  const nextGameNum = hasGameSeries
    ? gameSeriesWins + gameSeriesDeficit + 1
    : getNbaSeriesGameNumberForGame(
        game || { awayTeam: { abbr: af }, homeTeam: { abbr: hf } },
        playoffSeriesRows,
      );

  let winsAwayF = 0;
  let winsHomeF = 0;
  if (hasGameSeries && (gameSeriesLeader === af || gameSeriesLeader === hf)) {
    if (gameSeriesLeader === af) {
      winsAwayF = gameSeriesWins;
      winsHomeF = gameSeriesDeficit;
    } else {
      winsAwayF = gameSeriesDeficit;
      winsHomeF = gameSeriesWins;
    }
  } else if (row) {
    const sa = String(row?.away || "").toUpperCase();
    const sh = String(row?.home || "").toUpperCase();
    if (sa === af && sh === hf) {
      winsAwayF = Number(row?.awayWins) || 0;
      winsHomeF = Number(row?.homeWins) || 0;
    } else if (sa === hf && sh === af) {
      winsAwayF = Number(row?.homeWins) || 0;
      winsHomeF = Number(row?.awayWins) || 0;
    }
  }

  const leader =
    winsAwayF > winsHomeF ? af : winsHomeF > winsAwayF ? hf : "tied";
  let serverSummaryOneLiner =
    leader === "tied"
      ? `${af} and ${hf} are tied ${winsAwayF}-${winsHomeF}${nextGameNum > 0 ? ` — Game ${nextGameNum} tonight` : ""}.`
      : `${leader} leads ${Math.max(winsAwayF, winsHomeF)}-${Math.min(winsAwayF, winsHomeF)}${nextGameNum > 0 ? ` — Game ${nextGameNum} tonight` : ""}.`;
  serverSummaryOneLiner += appendPlayoffEliminationSuffix(winsAwayF, winsHomeF, af, hf);

  const priorCount =
    typeof row?.completedGamesCombinedPointsCount === "number"
      ? row.completedGamesCombinedPointsCount
      : Array.isArray(row?.completedGamesCombinedPoints)
        ? row.completedGamesCombinedPoints.length
        : 0;
  const avgCombined = row?.completedGamesCombinedPointsAverage;
  let summaryWithAvg = serverSummaryOneLiner;
  if (priorCount > 0 && Number.isFinite(avgCombined)) {
    summaryWithAvg += ` Completed finals in fetch window (${priorCount}): combined avg ${avgCombined} pts/game.`;
  }

  return {
    awayAbbr: af,
    homeAbbr: hf,
    awayWinsInQuestionOrder: winsAwayF,
    homeWinsInQuestionOrder: winsHomeF,
    leaderAbbr: leader === "tied" ? null : leader,
    nextGameNumber: nextGameNum > 0 ? nextGameNum : null,
    round: row?.round || null,
    statusText: row?.status || gameSeriesSummary || null,
    completedGamesCombinedPointsCount: priorCount,
    completedGamesCombinedPointsAverage: Number.isFinite(avgCombined) ? avgCombined : null,
    serverSummaryOneLiner: summaryWithAvg,
  };
}

function getNbaAvailabilityImpactCountForGame(game, bdlAvailability) {
  const away = String(game?.awayTeam?.abbr || "").toUpperCase();
  const home = String(game?.homeTeam?.abbr || "").toUpperCase();
  if (!away || !home || !bdlAvailability || typeof bdlAvailability !== "object") return 0;
  let count = 0;
  for (const meta of Object.values(bdlAvailability)) {
    const team = String(meta?.team || "").toUpperCase();
    if (team !== away && team !== home) continue;
    const cls = normalizeAvailabilityStatusClass(meta?.statusClass || meta?.status || meta?.availability);
    if (cls) count += 1;
  }
  return count;
}

function selectTopNbaSlateGameForGuarantee(nbaContext) {
  const games = Array.isArray(nbaContext?.todaysGames) ? nbaContext.todaysGames : [];
  if (games.length === 0) return null;
  const playable = games.filter((g) => !["post", "final"].includes(String(g?.state || "").toLowerCase()));
  const candidates = playable.length > 0 ? playable : games;
  const bdlAvailability = nbaContext?.bdlAvailability || nbaContext?.bdlGrounding?.bdlAvailability || {};
  const playoffSeries = Array.isArray(nbaContext?.playoffSeries) ? nbaContext.playoffSeries : [];
  const scored = candidates.map((g, idx) => ({
    game: g,
    idx,
    injuryImpactCount: getNbaAvailabilityImpactCountForGame(g, bdlAvailability),
    seriesGameNumber: getNbaSeriesGameNumberForGame(g, playoffSeries),
  }));
  const maxInjury = Math.max(0, ...scored.map((s) => s.injuryImpactCount));
  if (maxInjury > 0) {
    return scored
      .filter((s) => s.injuryImpactCount === maxInjury)
      .sort((a, b) => b.seriesGameNumber - a.seriesGameNumber || a.idx - b.idx)[0];
  }
  const maxSeries = Math.max(0, ...scored.map((s) => s.seriesGameNumber));
  if (maxSeries > 0) {
    return scored
      .filter((s) => s.seriesGameNumber === maxSeries)
      .sort((a, b) => a.idx - b.idx)[0];
  }
  return scored[0];
}

function buildFirstSessionGuaranteeInjection(feature) {
  if (!feature?.game) return "";
  const g = feature.game;
  const away = String(g?.awayTeam?.abbr || g?.awayTeam?.name || "Away");
  const home = String(g?.homeTeam?.abbr || g?.homeTeam?.name || "Home");
  const seriesLine =
    feature.seriesGameNumber > 0
      ? `Series leverage: Game ${feature.seriesGameNumber} (from playoffSeries context).`
      : "Series leverage: no playoff game number present in context.";
  const injuryLine =
    feature.injuryImpactCount > 0
      ? `Injury status: ${feature.injuryImpactCount} availability flags tied to this matchup in bdlAvailability.`
      : "Injury status: no high-impact bdlAvailability flags on this matchup.";
  return `FIRST-SESSION GUARANTEE — AUTO-SURFACE TOP SLATE GAME (DO NOT REVEAL THIS INTERNAL ROUTING)
User asked a broad opener with no prior conversation. Treat this as: "here's the sharpest angle on tonight's slate."
Primary matchup to anchor: ${away} @ ${home}.
${seriesLine}
${injuryLine}
Use matchup context + injury status + series pressure to deliver one decisive angle as the opener.`;
}

function getContextQuality({
  sportHint,
  players,
  context,
  liveMatches,
  golfContext,
  nbaContext,
  mlbContext,
  nflContext,
  f1Context,
  wcContext,
  matchupContext,
}) {
  if (matchupContext) return "high";

  if (
    sportHint === "worldcup" &&
    wcContext?.groups &&
    typeof wcContext.groups === "object" &&
    Object.keys(wcContext.groups).length >= 12
  ) {
    return "full";
  }

  if (
    sportHint === "tennis_wta_profile" &&
    players?.wta &&
    Object.keys(players.wta).length > 0
  )
    return "medium";

  if (sportHint === "tennis" && (context?.currentTournament || (liveMatches || []).length || players)) return "high";
  if (sportHint === "golf" && golfContext?.currentEvent) return "high";
  if (sportHint === "nba" && (nbaContext?.todaysGames?.length || nbaContext?.playerStats?.length)) return "high";
  if (sportHint === "mlb") {
    const gt =
      mlbContext?.gameTotals &&
      typeof mlbContext.gameTotals === "object" &&
      !Array.isArray(mlbContext.gameTotals)
        ? mlbContext.gameTotals
        : {};
    if (
      (mlbContext?.games?.length || 0) > 0 ||
      (mlbContext?.propLines?.length || 0) > 0 ||
      Object.keys(gt).length > 0
    ) {
      return "high";
    }
  }
  if (sportHint === "nfl" && nflContext) return "medium";
  if (sportHint === "f1" && (f1Context?.standings?.length || f1Context?.schedule?.races?.length)) return "high";
  if (sportHint === "derby" && isDerbyActive()) return "high";

  return "low";
}

function deriveConfidenceLabel({
  intent,
  sportHint,
  hasImage,
  matchupContext,
  question,
  contextQuality = "medium",
  isLive = false,
}) {
  const q = normalizeText(question);
  let score = 0;

  if (sportHint && sportHint !== "generic" && sportHint !== "image_review") score += 2;
  if (intent === "slip_review") score += 2;
  if (hasImage) score += 1;
  if (matchupContext) score += 1;
  if (contextQuality === "high" || contextQuality === "full") score += 2;
  if (contextQuality === "medium") score += 1;

  if (
    q.includes("best") ||
    q.includes("sharpest") ||
    q.includes("safest") ||
    q.includes("highest confidence")
  ) {
    score += 1;
  }

  let label;
  if (score >= 6) label = "High";
  else if (score >= 3) label = "Medium";
  else label = "Speculative";

  if (isLive && label === "High") return "Medium";
  return label;
}

function buildSlipReviewPrompt({
  question,
  sportHint,
  nbaContext,
  nflContext,
  mlbContext,
  golfContext,
  f1Context,
  derivedConfidence,
  priorTakesSummary,
}) {
  let relevantContext = "";

  if (sportHint === "nba") {
    relevantContext = `NBA context:
${contextJsonForModel({
  seasonContext: nbaContext?.seasonContext || null,
  todaysGames: nbaContext?.todaysGames || [],
  playoffSeries: nbaContext?.playoffSeries || [],
  propLines: (nbaContext?.propLines || []).slice(0, 80),
  injuries: nbaContext?.injuries || [],
  recentForm: nbaContext?.recentForm || "",
  gameTotals: nbaContext?.gameTotals || {},
  playerStats: (nbaContext?.playerStats || []).slice(0, 60),
  rosterGrounding: nbaContext?.rosterGrounding || null,
  todaysGamesSlateMeta: nbaContext?.todaysGamesSlateMeta || null,
  todaysGamesSlateNote: nbaContext?.todaysGamesSlateNote || null,
})}`;
  } else if (sportHint === "nfl") {
    relevantContext = `NFL context:
${typeof nflContext === "string" ? nflContext : contextJsonForModel(nflContext)}`;
  } else if (sportHint === "mlb") {
    relevantContext = `MLB context:
${contextJsonForModel(mlbContext)}`;
  } else if (sportHint === "golf") {
    relevantContext = `Golf context:
${contextJsonForModel(golfContext)}`;
  } else if (sportHint === "f1") {
    relevantContext = `F1 context:
${contextJsonForModel(f1Context)}`;
  }

  return `You are reviewing a betting slip or pick entry.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}User request:
${question}

Sport:
${sportHint || "unknown"}

${relevantContext}

Critical rules:
- Prioritize the image/slip content first.
- Only mention players, teams, games, props, injuries, pricing, matchup edges, or market timing if they are visible in the image or supported by the provided context.
- Do NOT invent matchup analysis that is not supported by the image or context.
- Do NOT claim line shopping, stale pricing, or market movement unless the context clearly supports it.
- If the slip is repetitive, say that directly.
- Use "repetitive construction" or "same-stat fragility" instead of "correlation" unless the legs are truly linked.
- If details are partially unreadable, say what you can confirm and stop there.
- Be sharp, concise, and product-quality.

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Do not call something High unless the image and context clearly justify it.

Required response format:

OPENING TAKE
[one sharp sentence]

SLIP VERDICT
[Keep / Trim / Fade / Rebuild]

BIGGEST STRENGTH
[one to two lines]

BIGGEST RISK
[one to two lines]

BEST KEEP
[one line]

FIRST CUT
[one line]

CONFIDENCE
[High / Medium / Speculative]

TIMING
[one line]`;
}

function hasObjectKeys(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0);
}

function resolveOddsAvailabilityForSport({
  sportHint,
  nbaContext,
  mlbContext,
  golfContext,
  f1Context,
  nflContext,
  liveMatches,
  context,
}) {
  if (sportHint === "nba") {
    const hasProps = Array.isArray(nbaContext?.propLines) && nbaContext.propLines.length > 0;
    const spreadRows =
      nbaContext?.spreads && typeof nbaContext.spreads === "object" && !Array.isArray(nbaContext.spreads)
        ? Object.values(nbaContext.spreads)
        : [];
    const hasSpread = spreadRows.some((s) => s?.current?.displayLine && !s?.lineUnavailable);
    const hasAnProps = nbaBoardHasPostedPropMarkets(nbaContext);
    return hasProps || hasSpread || hasAnProps;
  }
  if (sportHint === "mlb") {
    const hasProps = Array.isArray(mlbContext?.propLines) && mlbContext.propLines.length > 0;
    const hasTotals = hasObjectKeys(mlbContext?.gameTotals);
    return hasProps || hasTotals;
  }
  if (sportHint === "golf") {
    const rows = Array.isArray(golfContext?.odds?.outrights) ? golfContext.odds.outrights : [];
    return rows.some((r) => r?.odds != null && Number.isFinite(Number(r.odds)));
  }
  if (sportHint === "f1") {
    const sm = f1Context?.odds || f1Context?.smarketsOdds;
    return Boolean(
      sm?.hasPostedLines ||
        (Array.isArray(sm?.markets?.raceWinner) && sm.markets.raceWinner.length > 0) ||
        hasObjectKeys(f1Context?.odds) ||
        Array.isArray(f1Context?.markets) ||
        Array.isArray(f1Context?.outrights),
    );
  }
  if (sportHint === "tennis" || sportHint === "tennis_wta_profile") {
    const rows = Array.isArray(liveMatches) ? liveMatches : [];
    const fromRows = rows.some((m) => m?.odd_1 != null || m?.odd_2 != null);
    const fromContext = Boolean(
      context?.odds ||
        (Array.isArray(context?.matches) &&
          context.matches.some((m) => m?.odd_1 != null || m?.odd_2 != null)),
    );
    return fromRows || fromContext;
  }
  if (sportHint === "nfl") {
    if (typeof nflContext === "string") {
      return /\bodds\b|\bline\b|\bspread\b|\btotal\b/i.test(nflContext);
    }
    return Boolean(
      nflContext?.odds ||
        nflContext?.markets ||
        nflContext?.lines ||
        nflContext?.spreads ||
        nflContext?.totals,
    );
  }
  return true;
}

// ── Anthropic call wrapper (429 retries via fetchAnthropicMessages) ──────────
async function callAnthropic({
  apiKey,
  model,
  system,
  messages,
  temperature = 0.45,
  max_tokens = 800,
}) {
  /** Allow slow Claude completions when the host permits long functions (see vercel.json maxDuration). */
  return fetchAnthropicMessages({
    apiKey,
    model,
    max_tokens,
    temperature,
    system,
    messages,
    timeoutMs: 52000,
    maxRetries: 3,
  });
}

function summarizePriorTakes(history) {
  if (!Array.isArray(history) || history.length === 0) return "";

  const assistantTurns = history.filter((h) => h.role === "assistant" || h.role === "ai");
  if (assistantTurns.length === 0) return "";

  const priorTakes = [];
  for (const turn of assistantTurns) {
    const text = String(turn.content || turn.text || "");
    const structured =
      turn.structured && typeof turn.structured === "object" ? turn.structured : null;

    // Extract THE PLAY line
    const playMatch = text.match(/THE PLAY\s*\n([^\n]+)/i);
    const confidenceMatch = text.match(/CONFIDENCE\s*\n([^\n]+)/i);
    const liveCallMatch = text.match(/LIVE CALL\s*\n([^\n]+)/i);

    const play =
      (structured?.call && String(structured.call).trim()) ||
      playMatch?.[1]?.trim() ||
      liveCallMatch?.[1]?.trim();
    const confidence =
      (structured?.confidence && String(structured.confidence).trim()) ||
      confidenceMatch?.[1]?.trim() ||
      "";

    if (play) {
      priorTakes.push({
        play: play.slice(0, 160),
        confidence,
      });
    }
  }

  if (priorTakes.length === 0) return "";

  const lines = priorTakes
    .slice(-5) // last 5 takes in session
    .map((t, i) => `${i + 1}. ${t.play}${t.confidence ? ` (${t.confidence})` : ""}`)
    .join("\n");

  return `PRIOR TAKES THIS SESSION (most recent last)
${lines}

When the current question relates to any of these — same player, same team,
same game, same market, or a correlated bet — reference the prior take
explicitly. Examples:
"Related to my Cade under call — if he's under 22.5, Pistons team total
likely under 108 too."
"Same game as the Cade take above. If you're already on Cade, the Pistons
ML adds correlated risk — size accordingly."
"This is the third time you've asked about this player tonight."

Never silently contradict a prior take. If you're changing your read,
acknowledge it explicitly. If the new question is unrelated, ignore the
prior takes — don't force a connection.

SESSION STRUCTURAL EDGE: When a SESSION STRUCTURAL EDGE block appears below,
that player/angle is the established structural thesis for this chat. Maintain it
on follow-ups unless new evidence explicitly flips the read — live leaderboard
position alone is NOT sufficient to abandon the structural edge.`;
}

function summarizePriorTakesWithStructuralEdge(history, sportHint = "") {
  const base = summarizePriorTakes(history);
  return appendSessionStructuralEdgeBlock(base, history, sportHint);
}

function detectChaseSignals(question, history) {
  const q = normalizeText(question);

  // Explicit chase language
  const chasePhrases = [
    "i need this",
    "need this to hit",
    "have to win",
    "already bet",
    "i already took",
    "just tell me",
    "are you sure",
    "promise me",
    "guarantee",
    "can't lose this one",
    "please say",
    "tell me yes",
    "tell me it's",
    "this has to",
  ];
  const hasChaseLanguage = chasePhrases.some((p) => q.includes(p));

  // Repeated subject detection — pull last 5 user turns
  const priorUserTurns = Array.isArray(history)
    ? history
        .filter((h) => h.role === "user")
        .slice(-5)
        .map((h) => normalizeText(h.content || h.text || ""))
    : [];

  // Extract nouns/names roughly — look for capitalized-ish tokens in current question
  const currentTokens = q.split(/\s+/).filter((t) => t.length >= 4);
  const repeatedTokens = currentTokens.filter((token) =>
    priorUserTurns.some((priorQ) => priorQ.includes(token)),
  );

  // If >= 3 substantive tokens overlap with prior turns, likely same topic
  const sameTopicCount = priorUserTurns.filter((priorQ) => {
    const overlap = currentTokens.filter((t) => priorQ.includes(t));
    return overlap.length >= 3;
  }).length;

  const hasHedgingPanicLanguage =
    (q.includes("already bet") || q.includes("already took")) &&
    (q.includes("other side") ||
      /\bover\b/.test(q) ||
      /\bunder\b/.test(q) ||
      q.includes("is this safe") ||
      q.includes("is it safe"));

  return {
    hasChaseLanguage,
    sameTopicCount,
    hasHedgingPanicLanguage,
    repeatedTokenOverlap: repeatedTokens.length,
    isChase: hasChaseLanguage || sameTopicCount >= 2 || hasHedgingPanicLanguage,
  };
}

function normalizeIncomingChatHistory(raw, { maxMessages = 6 } = {}) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const h of raw) {
    const role =
      h.role === "assistant" || h.role === "ai"
        ? "assistant"
        : h.role === "user"
          ? "user"
          : null;
    const content = String(h.content ?? h.text ?? "").trim();
    if (!role || !content || /^ANALYZING/i.test(content)) continue;
    const row = { role, content: content.slice(0, 4000) };
    const sport = String(h.sport || "").trim().toLowerCase();
    if (sport) row.sport = sport;
    if (h.structured && typeof h.structured === "object") {
      const s = h.structured;
      row.structured = {
        lean: s.lean != null ? String(s.lean).slice(0, 120) : undefined,
        call: s.call != null ? String(s.call).slice(0, 400) : undefined,
        whyNow: s.whyNow != null ? String(s.whyNow).slice(0, 600) : undefined,
        edge: s.edge != null ? String(s.edge).slice(0, 600) : undefined,
        callType: s.callType != null ? String(s.callType).slice(0, 64) : undefined,
        confidence: s.confidence != null ? String(s.confidence).slice(0, 32) : undefined,
      };
    }
    out.push(row);
  }
  const merged = [];
  for (const m of out) {
    if (!merged.length && m.role === "assistant") continue;
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) {
      last.content += `\n\n${m.content}`;
      continue;
    }
    merged.push({ role: m.role, content: m.content });
  }
  return merged.slice(-maxMessages);
}

function tryParseJsonObject(text) {
  const raw = String(text || "").trim();
  const parse = (s) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };
  let o = parse(raw);
  if (o) return o;
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    o = parse(fence[1].trim());
    if (o) return o;
  }
  const m = raw.match(/\{[\s\S]*\}\s*$/);
  if (m) return parse(m[0]);
  return null;
}

/** First balanced `{ ... }` slice with JSON-safe string handling (handles leading prose before JSON). */
function extractBalancedJsonObject(text) {
  const raw = String(text || "").trim();
  const start = raw.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < raw.length; i++) {
    const c = raw[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (c === "\\") {
        escape = true;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        const slice = raw.slice(start, i + 1);
        try {
          return JSON.parse(slice);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function tryExtractSummaryDeepFromLooseText(text) {
  const raw = String(text || "").trim();
  const start = raw.indexOf('{"summary"');
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const candidate = JSON.parse(raw.slice(start, end + 1));
      if (candidate && typeof candidate.summary === "string") return candidate;
    } catch {
      // fall through
    }
  }

  const block = raw.match(/"summary"\s*:\s*"([\s\S]*?)"\s*,\s*"deep"\s*:\s*"([\s\S]*?)"/);
  if (block) {
    const unescape = (s) =>
      String(s || "")
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    return { summary: unescape(block[1]), deep: unescape(block[2]) };
  }
  return null;
}

function normalizeSummaryDeepPayload(summary, deep) {
  let outSummary = String(summary || "").trim();
  let outDeep = typeof deep === "string" ? deep.trim() : null;

  const nested = tryParseJsonObject(outSummary) || tryExtractSummaryDeepFromLooseText(outSummary);
  if (nested && typeof nested.summary === "string" && nested.summary.trim()) {
    outSummary = nested.summary.trim();
    outDeep =
      typeof nested.deep === "string" && nested.deep.trim()
        ? nested.deep.trim()
        : outDeep;
  }

  return {
    summary: outSummary,
    deep: outDeep,
  };
}

/** Removes internal routing labels the model sometimes echoes into user-facing text. */
function stripBannedInternalLeakStrings(text) {
  let s = String(text || "");
  s = s.replace(/\bFOLLOW-UP\s+GATE\s+VIOLATION\b\s*:?\s*/gi, "");
  return s.replace(/\n{3,}/g, "\n\n").trim();
}

/** Phrases that must never appear in user-facing UR Take output (full-body sweep). */
const BANNED_DATA_AVAILABILITY_BODY_PHRASES = [
  "unavailable in context",
  "unavailable in compact context",
  "missing from context",
  "data missing from context",
  "not in context",
  "Season usage data unavailable",
  "Last 5 games data missing",
  "anchoring to the structural reality",
  "absent from compact",
  "compact context",
  "compact data",
  "from compact",
  "Recent form absent",
  "Recent form unavailable",
  "QA notice",
  "automated checks",
  "flagged residual risk",
  "verify lines and role",
  "treat analysis as directional",
  "residual risk in this draft",
];

function escapeRegExpLiteral(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Global opener sanitizer: remove lead-in paragraphs that describe missing data
 * instead of giving analysis. Keeps the rest of the answer intact.
 * Also strips banned data-availability phrasing anywhere in the body.
 */
function stripBannedDataAvailabilityOpener(text) {
  let s = stripBannedInternalLeakStrings(String(text || "").trim());
  if (!s) return s;
  const bannedLead =
    /^(?:no edge(?: here)?\.?|no\s+(?:player\s+)?prop\s+markets?\s+(?:posted|available)\b|i don't have\b|i can'?t\b|without\b|the context provided\b|the data provided\b|come back when\b|when (?:markets?|prices?) post\b|props?\s+(?:aren'?t|are not)\s+(?:fully\s+)?available\b)/i;
  for (let i = 0; i < 4; i += 1) {
    const paras = s.split(/\n\n+/);
    if (!paras.length) break;
    const head = String(paras[0] || "").trim();
    if (!head) {
      s = paras.slice(1).join("\n\n").trim();
      continue;
    }
    if (bannedLead.test(head)) {
      s = paras.slice(1).join("\n\n").trim();
      continue;
    }
    break;
  }
  for (const phrase of BANNED_DATA_AVAILABILITY_BODY_PHRASES) {
    const re = new RegExp(escapeRegExpLiteral(phrase), "gi");
    s = s.replace(re, "");
  }
  s = s
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n[ \t]+\n/g, "\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return s;
}

/**
 * Global body sanitizer: remove legacy performance-tracker strings from any line
 * in the model output (summary or deep), not just the opener.
 */
function stripBannedPerformanceTrackerLines(text) {
  let s = stripBannedInternalLeakStrings(String(text || ""));
  if (!s.trim()) return s.trim();
  const bannedLineMatchers = [
    /historical record/i,
    /\b0-0-0\b/i,
    /\b0\.0u\b/i,
    /last 30 days on this confidence tier/i,
    /tier historical record/i,
  ];
  const kept = s
    .split(/\r?\n/)
    .filter((line) => !bannedLineMatchers.some((re) => re.test(line)));
  return stripBannedInternalLeakStrings(kept.join("\n").replace(/\n{3,}/g, "\n\n").trim());
}

/**
 * BDL grounding leak — model hallucinations of internal grounding notes.
 * Pattern is intentionally broad so variants (different verbs, different surrounding text,
 * different BallDontLie phrasings) all collapse to the same strip.
 */
const NBA_BDL_LEAK_PATTERN =
  /\bBDL\s+grounding\b|\bBallDontLie\s+(?:grounding|roster|slate|data)\b|\b(?:could|cannot|couldn't|can't|did\s+not|didn't)\s+cleanly\s+match\b/i;

/** Drops leading roster/data-disclosure paragraphs models still emit despite prompt bans. */
export function stripNbaLeadInDisclosure(text) {
  let s = String(text || "").trim();
  if (!s) return s;
  const bannedLead =
    /\b(?:I don't have tonight's confirmed roster|beyond the verified names in the system|Working from partial roster data|working from partial roster data|verified names in the system|partial roster data|roster data is still loading|combined API \+ product UI|clientUiAugmented)\b/i;
  const cantConfirm =
    /^I can't confirm[^\n]*(roster|lineup|availability|names|data)[^\n]*$/im;
  for (let i = 0; i < 4; i += 1) {
    const paras = s.split(/\n\n+/);
    if (!paras.length) break;
    const head = paras[0].trim();
    if (!head) {
      s = paras.slice(1).join("\n\n").trim();
      continue;
    }
    if (bannedLead.test(head) || cantConfirm.test(head) || NBA_BDL_LEAK_PATTERN.test(head)) {
      s = paras.slice(1).join("\n\n").trim();
      continue;
    }
    break;
  }
  // Body sweep — drop any paragraph anywhere that mentions BDL grounding leak phrasing.
  s = s
    .split(/\n\n+/)
    .filter((p) => !NBA_BDL_LEAK_PATTERN.test(p))
    .join("\n\n")
    .trim();
  return s.trim();
}

/**
 * Post-gen confidence vocabulary normalizer — runs on every NBA response.
 * Maps any legacy Tier 1/2/3 + STRONG EDGE/LEAN/WATCH labels the model still produces
 * back into the canonical High / Medium / Speculative vocabulary.
 */
export function normalizeConfidenceVocabularyInText(text) {
  let s = String(text || "");
  if (!s) return s;
  const tierMap = { 1: "High", 2: "Medium", 3: "Speculative" };
  // "Tier N" with optional "- STRONG EDGE / LEAN / WATCH" suffix → canonical label.
  s = s.replace(
    /\bTier\s*([1-3])(?:\s*[-—:]\s*(?:STRONG\s*EDGE|Strong\s*Edge|strong\s*edge|LEAN|Lean|lean|WATCH|Watch|watch))?\b/g,
    (_m, n) => tierMap[Number(n)] || _m,
  );
  // CONFIDENCE label lines that still emit STRONG EDGE / LEAN / WATCH.
  s = s.replace(/(\bCONFIDENCE\b\s*[:\n]+\s*)STRONG\s+EDGE\b/gi, "$1High");
  s = s.replace(/(\bCONFIDENCE\b\s*[:\n]+\s*)LEAN\b/gi, "$1Medium");
  s = s.replace(/(\bCONFIDENCE\b\s*[:\n]+\s*)WATCH\b/gi, "$1Speculative");
  // Bare uppercase compound STRONG EDGE anywhere is unambiguously the legacy label.
  s = s.replace(/\bSTRONG\s+EDGE\b/g, "High");
  return s;
}

function isTruthyFlag(v) {
  const s = String(v || "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function buildNbaObservabilityMeta({
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

function logNbaObservability(meta) {
  console.log(
    JSON.stringify({
      event: "ur_take_nba_observability",
      ...meta,
    }),
  );
}

/** Removes internal control markers from user-visible prose. */
function stripNbaInternalControlLabels(text) {
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

function findFocusedNbaGameFromBoard(nbaContext, matchup) {
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
function computeIsBoardLive(p) {
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

function buildNbaGameStateGateSnapshot(nbaContext, matchup) {
  const focusedGame = findFocusedNbaGameFromBoard(nbaContext, matchup);
  const phase = classifyNbaBoardGamePhase(focusedGame);
  const verifiedBoxScore = nbaGameHasVerifiedBoxScore(focusedGame);
  const allowsLiveNarrative =
    verifiedBoxScore && (phase === "live" || phase === "halftime" || phase === "final");
  return { focusedGame, phase, verifiedBoxScore, allowsLiveNarrative };
}

function buildNbaGameStateAuthorityBlock(gate) {
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

  return `NBA GAME-STATE AUTHORITY (SERVER — obey; never quote this header)
Focused matchup phase (board-derived): ${phaseLabel}. Verified box scores on focused row: ${verifiedBoxScore ? "yes" : "no"}.
${rules}`;
}

/** When the focused board row is final — recap-only framing for the user prompt. */
function buildNbaPostGameUserPromptBlock(gate) {
  if (!gate || String(gate.phase || "").toLowerCase() !== "final") return "";
  return `NBA POST-GAME MODE (SERVER — focused matchup is FINAL)
The game is finished. Write as a recap / results read, not a live betting card.
- Do not use live-betting framing (no "best look / watch" live scaffold, no quarter-clock signature ending in "· Live.", no "live trigger" as if the book is still open on this outcome).
- Do not give floor/ceiling or "lean the over/under if it posts" style **actionable** prop sizing on markets that are decided for this game — state what the box score and posted results show when present.
- If the user asks for props, explain what hit or missed using numbers from context only; label the read as informational, not a ticket to place now.
- If context rows still look in-progress but you have a verified final scoreline in this payload, trust the final scoreline and avoid forward-looking bet language.`;
}

function formatNbaGameStateBlocksForUserPrompt(gate) {
  if (!gate || typeof gate !== "object") return "";
  const authority = buildNbaGameStateAuthorityBlock(gate);
  const postGame = buildNbaPostGameUserPromptBlock(gate);
  const body = postGame ? `${authority}\n\n${postGame}` : authority;
  return body ? `${body}\n\n` : "";
}

function buildNbaLiveNoPropSystemPromptBlock(gate, nbaContext) {
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

  return `NBA LIVE GAME RULE — PROP MARKETS UNAVAILABLE (SERVER — obey; never quote this header)
Never surface technical errors, variable names, array names, HTTP status codes, or API details to users. Ever. No exceptions.
When prop lines are unavailable, do not mention it. Do not apologize. Do not explain. Pivot to the strongest angle from live game state: minutes played, pace, foul trouble, rotation patterns, early stat lines, and matchup dynamics.
The opener is governed by Step 1 of the framework — state the trigger condition (live minute, foul count, rotation shift); do not open with what you don't have.
When analyzing a live game, close the response with a one-line signature in this format: TEAM1 SCORE, TEAM2 SCORE · Q? TIME · Live. This replaces the need to announce "the game is live" in the opening.`;
}

function formatNbaLiveScoreSignature(game) {
  if (!game || typeof game !== "object") return "";
  const awayAbbr = String(game?.awayTeam?.abbr || "AWAY").toUpperCase();
  const homeAbbr = String(game?.homeTeam?.abbr || "HOME").toUpperCase();
  const awayScore = game?.awayTeam?.score;
  const homeScore = game?.homeTeam?.score;
  if (!Number.isFinite(Number(awayScore)) || !Number.isFinite(Number(homeScore))) return "";

  const period = Number(game?.period);
  const quarter = Number.isFinite(period) && period > 0 ? `Q${period}` : "Q?";
  const clock = String(game?.clock || "").trim() || String(game?.status || "").trim() || "time unavailable";
  return `${awayAbbr} ${Number(awayScore)}, ${homeAbbr} ${Number(homeScore)} · ${quarter} ${clock} · Live.`;
}

/* Post-generation live-state repair (regex replace of model output) intentionally not shipped yet.
   Rely on data gate + NBA GAME-STATE AUTHORITY prompt block first; add repair only if production
   shows the model still hallucinates scores/times after that. */

function normalizeConfidenceVocabulary(label) {
  const s = String(label || "").trim().toLowerCase();
  if (s === "high") return "High";
  if (s === "medium" || s === "lean") return "Medium";
  if (s === "speculative" || s === "low" || s === "watch") return "Speculative";
  return "";
}

function confidenceVocabRank(label) {
  const norm = normalizeConfidenceVocabulary(label);
  if (norm === "High") return 3;
  if (norm === "Medium") return 2;
  return 1;
}

function confidenceVocabFromRank(rank) {
  if (rank >= 3) return "High";
  if (rank >= 2) return "Medium";
  return "Speculative";
}

function ensureNbaTakeConfidenceConsistency({
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
      confidence: "Speculative — Status unresolved; wait for final availability.",
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

  // If clamp dropped the model's tier, the model's prose justification no longer holds — replace with modifier reason.
  if (!isMissing && finalRank < modelRank) {
    return {
      ...takeRecord,
      confidence: reason ? `${finalLabel} — ${reason}` : finalLabel,
    };
  }

  // Model wrote a valid tier within the cap — preserve as-is.
  if (!isMissing && modelLabel) {
    return takeRecord;
  }

  // Missing or unspecified — fill with clamped label + modifier reason.
  return {
    ...takeRecord,
    confidence: reason ? `${finalLabel} — ${reason}` : finalLabel,
  };
}

function hasNbaNoMarketHardFail(text) {
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

function isNbaNoMarketUpcomingSlate(nbaContext) {
  const games = Array.isArray(nbaContext?.todaysGames) ? nbaContext.todaysGames : [];
  const hasUpcoming = games.some((g) => {
    const state = String(g?.state || "").toLowerCase();
    return state !== "post";
  });
  return !nbaBoardHasPostedPropMarkets(nbaContext) && hasUpcoming;
}

function buildNbaNoMarketHardFallback(question, nbaContext) {
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

${liveSignature || `${away} ?, ${home} ? · Q? ${String(gameForQuestion?.status || "in progress").trim()} · Live.`}`;
  }

  return `Check your books now, then lean into the strongest pregame angle.

${title} pregame edge is the number, not the delay.

${p1} ${p2}

Game total framework: under is the lean if the opener is ${highBand.toFixed(1)} or higher; over only becomes playable if it opens ${lowBand.toFixed(1)} or lower. In the middle band, stay selective and price-sensitive.

Live trigger: if the first 6 minutes produce 8+ combined free throws or repeated early-clock paint attacks, pivot to live over; if both teams are walking it up and living late-clock, stay with under angles.`;
}

function escapeRegExp(v) {
  return String(v || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeNbaAvailabilityClass(status, detail = "") {
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

function hasMaterialNbaNewsImpact(newsImpact) {
  const teams = Array.isArray(newsImpact?.affectedTeams) ? newsImpact.affectedTeams : [];
  return teams.some((t) => (t?.outs || []).length > 0 || (t?.doubtful || []).length > 0);
}

function getNbaInjuryIndex(nbaContext) {
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

function resolveQuestionNbaPlayer(question, nbaContext) {
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

function sanitizeNbaQuestionForGeneration(question, nbaContext) {
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

/** Minimal normalization for matching Odds API outcome names to roster/stats names. */
export function normalizeNbaMarketPlayerKey(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
}

function propLineMatchesTargetedPlayer(pl, targetedPlayer) {
  const k = normalizeNbaMarketPlayerKey(pl?.player);
  const t = normalizeNbaMarketPlayerKey(targetedPlayer);
  return Boolean(k && t && k === t);
}

function inferNbaPlayerCentrality(playerName, nbaContext, injuryMeta = null) {
  const key = String(playerName || "").trim().toLowerCase();
  if (!key) return "low";
  const props = (nbaContext?.propLines || []).filter((pl) =>
    propLineMatchesTargetedPlayer(pl, playerName),
  );
  const hasPra = props.some((pl) =>
    String(pl?.prop || "").toLowerCase().includes("points rebounds assists"),
  );
  const stats = (nbaContext?.playerStats || []).find(
    (p) => String(p?.name || "").trim().toLowerCase() === key,
  );
  const pts = Number(stats?.pts || 0);
  const ast = Number(stats?.ast || 0);
  const reb = Number(stats?.reb || 0);
  if (hasPra || props.length >= 3) return "high";
  if (pts >= 22 || ast >= 7 || reb >= 10) return "high";
  if (props.length >= 2 || pts >= 16 || ast >= 5 || reb >= 8) return "medium";
  if (injuryMeta?.statusClass === "out") return "medium";
  return "low";
}

export function summarizeNbaNewsImpact(newsImpact) {
  const teams = Array.isArray(newsImpact?.affectedTeams) ? newsImpact.affectedTeams : [];
  const material = teams.filter(
    (t) => (t?.outs || []).length > 0 || (t?.doubtful || []).length > 0,
  );
  if (material.length === 0) return "";
  const lines = [];
  for (const t of material.slice(0, 2)) {
    const outLine = (t.outs || []).length ? `OUT: ${(t.outs || []).join(", ")}` : null;
    const doubtLine =
      (t.doubtful || []).length ? `DOUBTFUL: ${(t.doubtful || []).join(", ")}` : null;
    const benefit = (t.beneficiaries || [])
      .slice(0, 2)
      .map((b) => `${b.player} (${(b.markets || []).join("/")})`)
      .join("; ");
    const parts = [outLine, doubtLine].filter(Boolean).join(" | ");
    const benefPart = benefit ? ` | BENEFICIARIES: ${benefit}` : "";
    lines.push(`${t.team} [${t.priority || "low"}] ${parts}${benefPart}`.trim());
  }
  return lines.join("\n");
}

export function buildNbaStatusShiftSection(newsImpact, invalidation) {
  if (invalidation?.blocked && invalidation?.targetedPlayer) {
    if (
      invalidation?.blockedReason === "unlisted_market" ||
      invalidation?.blockedReason === "odds_feed_unavailable"
    ) {
      return "";
    }
    return `${invalidation.targetedPlayer} is ${invalidation.statusDisplay || invalidation.statusClass}. Direct prop projection is invalid at this status.`;
  }
  if (invalidation?.unresolved && invalidation?.targetedPlayer) {
    return `${invalidation.targetedPlayer} status is unresolved (${invalidation.statusDisplay || invalidation.statusClass}). Treat any lean as contingent on final availability.`;
  }
  const teams = Array.isArray(newsImpact?.affectedTeams) ? newsImpact.affectedTeams : [];
  const first = teams.find((t) => (t?.outs || []).length > 0 || (t?.doubtful || []).length > 0);
  if (!first) return "";
  const changed = [...(first.outs || []), ...(first.doubtful || [])].slice(0, 2).join(", ");
  return `${first.team} rotation shifted by ${changed}. Price production through role reallocation, not baseline averages.`;
}

function isDirectNbaPropAsk(question) {
  const qText = String(question || "");
  return (
    (/\b(over|under)\b/i.test(qText) && /\b\d{1,3}(?:\.\d+)?\b/.test(qText)) ||
    (/\b(points?|rebounds?|assists?|pra)\b/i.test(qText) &&
      /\b(tonight|live|now|game)\b/i.test(qText))
  );
}

export function applyNbaMarketInvalidation({ question, board, newsImpact }) {
  const targetedPlayers = resolveQuestionNbaPlayers(question, board);
  const targetedPlayer = targetedPlayers[0] || null;
  const requestedMarket = parseNbaRequestedMarket(question);
  const injuriesByPlayer = getNbaInjuryIndex(board);
  const grounded = board?.bdlGrounding?.bdlGroundedPlayers || {};
  // NBA roster truth contract: only BDL grounding can authorize player/team/slate truth.
  const groundedPlayers = targetedPlayers
    .map((name) => {
      const key = String(name || "").trim().toLowerCase();
      const entry = Object.entries(grounded).find(
        ([n]) => String(n || "").trim().toLowerCase() === key,
      );
      if (!entry) return null;
      const [resolvedName, meta] = entry;
      return { name: resolvedName, team: String(meta?.team || "").toUpperCase(), onSlate: meta?.onSlate !== false };
    })
    .filter(Boolean);
  const unresolvedPlayers = targetedPlayers.filter((name) => {
    const key = String(name || "").trim().toLowerCase();
    return !groundedPlayers.some((p) => String(p.name || "").toLowerCase() === key);
  });
  const injuryMeta = targetedPlayer
    ? injuriesByPlayer.get(String(targetedPlayer).toLowerCase()) || null
    : null;
  const statusClass = injuryMeta?.statusClass || "unknown";
  const centrality = targetedPlayer
    ? inferNbaPlayerCentrality(targetedPlayer, board, injuryMeta)
    : "low";
  const unresolvedCentral =
    (statusClass === "questionable" || statusClass === "doubtful") && centrality !== "low";
  const blocked = statusClass === "out";
  const affectedTeams = new Set(
    (newsImpact?.affectedTeams || [])
      .filter((t) => (t?.outs || []).length > 0 || (t?.doubtful || []).length > 0)
      .map((t) => String(t?.team || "").toUpperCase())
      .filter(Boolean),
  );
  const statsRow = targetedPlayer
    ? (board?.playerStats || []).find(
        (p) =>
          String(p?.name || "").trim().toLowerCase() ===
          String(targetedPlayer).trim().toLowerCase(),
      )
    : null;
  const targetedTeam = String(injuryMeta?.team || statsRow?.team || "").toUpperCase();
  const materialRelevantImpact =
    hasMaterialNbaNewsImpact(newsImpact) &&
    (!targetedPlayer || (targetedTeam && affectedTeams.has(targetedTeam)));
  const directPropAsk = isDirectNbaPropAsk(question);
  const activeSlatePropCount = countNbaActiveSlatePropSignals(board);
  const hasTargetPlayerMarket = targetedPlayer
    ? (board?.propLines || []).some((pl) => propLineMatchesTargetedPlayer(pl, targetedPlayer))
    : false;
  const verifyPlayerMarket = (playerName) => {
    const rows = (board?.propLines || []).filter((pl) => propLineMatchesTargetedPlayer(pl, playerName));
    if (!rows.length) return false;
    if (!requestedMarket.market) return true;
    const rowsByMarket = rows.filter((pl) =>
      String(pl?.prop || "").toLowerCase().includes(requestedMarket.market),
    );
    if (!rowsByMarket.length) return false;
    if (!Number.isFinite(requestedMarket.line)) return true;
    return rowsByMarket.some((pl) => Number(pl?.line) === Number(requestedMarket.line));
  };
  const marketVerification = targetedPlayers.map((name) => ({
    player: name,
    grounded: groundedPlayers.some((p) => String(p.name || "").toLowerCase() === String(name || "").toLowerCase()),
    verified: verifyPlayerMarket(name),
  }));
  const hasAnyRequestedMarket = marketVerification.some((m) => m.verified);
  const allRequestedMarketsMissing =
    targetedPlayers.length > 0 && marketVerification.every((m) => !m.verified);
  // Player-level "no line" only when the feed already shows at least one active listed prop elsewhere.
  // Empty slate snapshot (ingestion/key/API) → odds_feed_unavailable; do not blame books/cover timing.
  const blockedPlayerLevelNoListedMarket = Boolean(
    targetedPlayers.length > 0 &&
      directPropAsk &&
      allRequestedMarketsMissing &&
      activeSlatePropCount > 0 &&
      !blocked,
  );
  const blockedOddsFeedSnapshot = Boolean(
    targetedPlayers.length > 0 &&
      directPropAsk &&
      allRequestedMarketsMissing &&
      activeSlatePropCount === 0 &&
      !blocked,
  );
  const blockedNoMarket = Boolean(blockedPlayerLevelNoListedMarket || blockedOddsFeedSnapshot);
  const requiresStatusAcknowledgement =
    blocked || unresolvedCentral || materialRelevantImpact;
  return {
    decisionMode: blocked
      ? "blocked_unavailable"
      : blockedPlayerLevelNoListedMarket
        ? "structural_only"
        : blockedOddsFeedSnapshot
          ? "structural_only"
          : unresolvedCentral
            ? "unresolved_status"
            : "normal",
    blocked,
    blockedReason: blocked
      ? "unavailable"
      : blockedPlayerLevelNoListedMarket
        ? "unlisted_market"
        : blockedOddsFeedSnapshot
          ? "odds_feed_unavailable"
          : null,
    unresolved: unresolvedCentral,
    targetedPlayer,
    statusClass,
    statusDisplay: injuryMeta?.statusRaw || injuryMeta?.detail || statusClass,
    team: injuryMeta?.team || null,
    materialRelevantImpact,
    requiresStatusAcknowledgement,
    hasTargetPlayerMarket,
    directPropAsk,
    requestedMarket,
    targetedPlayers,
    unresolvedPlayers,
    playerGrounding: groundedPlayers,
    marketVerification,
    hasAnyRequestedMarket,
  };
}

function confidenceLabelToRank(label) {
  const normalized = String(label || "").toLowerCase();
  if (normalized === "high") return 3;
  if (normalized === "medium") return 2;
  return 1;
}

function confidenceRankToLabel(rank) {
  if (rank >= 3) return "High";
  if (rank >= 2) return "Medium";
  return "Speculative";
}

export function applyNbaConfidenceModifiers({
  baseConfidence,
  invalidation,
  nbaContext,
  question = "",
}) {
  const directBlockedUnavailable = invalidation?.blockedReason === "unavailable";
  const directBlockedNoMarket = invalidation?.blockedReason === "unlisted_market";
  const directBlockedOddsFeed = invalidation?.blockedReason === "odds_feed_unavailable";
  if (directBlockedUnavailable) {
    return {
      label: "Speculative",
      reason: "Player unavailable — direct prop projection is blocked.",
    };
  }
  if (directBlockedOddsFeed) {
    return {
      label: "Speculative",
      reason: "Structural read only — anchor claims to verified stats and live state in context.",
    };
  }
  if (directBlockedNoMarket) {
    return {
      label: "Speculative",
      reason: "Closest verified structural read — tie claims to pace, role, and matchup data present.",
    };
  }

  const q = String(question || "");
  const rm = invalidation?.requestedMarket ?? parseNbaRequestedMarket(q);
  const dir = inferNbaPropDirection(q);
  let playerRow = null;
  if (invalidation?.targetedPlayer && Array.isArray(nbaContext?.playerStats)) {
    playerRow =
      nbaContext.playerStats.find(
        (p) =>
          String(p?.name || "").trim().toLowerCase() ===
          String(invalidation.targetedPlayer || "").trim().toLowerCase(),
      ) || null;
  }
  if (!playerRow) {
    playerRow = findFirstPlayerStatRowForQuestion(q, nbaContext?.playerStats);
  }
  const implausibleUnder = nbaUnderVsSeasonAverageImplausible(rm, dir, playerRow);
  if (implausibleUnder) {
    return {
      label: "Speculative",
      reason: `Prop under vs season ${implausibleUnder.stat} average is implausible — watch-tier only.`,
    };
  }

  const effectiveDir = dir || inferPropDirectionFromText(q);
  const resolvedMarket = resolveNbaRequestedMarket(q);
  const overRecentContradiction = nbaOverVsRecentFormContradiction(
    resolvedMarket,
    effectiveDir,
    playerRow,
  );
  if (overRecentContradiction) {
    return {
      label: "Speculative",
      reason: `Recent ${overRecentContradiction.unit} form (${overRecentContradiction.recentAvg.toFixed(1)} last 5) sits ${Math.round(overRecentContradiction.gapPct * 100)}% below the ${overRecentContradiction.line} line — conflicting signals, not a clean over.`,
    };
  }

  let rank = confidenceLabelToRank(baseConfidence);
  const reasons = [];
  if (invalidation?.unresolved) {
    rank = Math.max(1, rank - 1);
    reasons.push("Unresolved central status lowers certainty.");
  }
  if (invalidation?.materialRelevantImpact) {
    rank = Math.min(rank, 2);
    reasons.push("Material injury/news impact increases volatility.");
  }
  if (!Array.isArray(nbaContext?.todaysGames) || nbaContext.todaysGames.length === 0) {
    rank = Math.min(rank, 2);
    reasons.push("Slate context is thin for game-specific conviction.");
  }

  return {
    label: confidenceRankToLabel(rank),
    reason: reasons.join(" "),
  };
}

function detectNbaAvailabilityIntent(question) {
  const q = String(question || "").toLowerCase();
  const asksStatus =
    /\b(is|are|will|did)\b[\s\S]{0,80}\b(play|playing|active|available|out|inactive|status|questionable|doubtful)\b/i.test(q) ||
    /\bstatus\b/.test(q) ||
    /\bplaying tonight\b/.test(q) ||
    /\bout tonight\b/.test(q);
  const asksBettingConsequence =
    /\b(impact|benefit|benefits|beneficiary|what does that mean|what happens|angle|bet|prop|play)\b/i.test(q);
  return {
    isAvailabilityQuestion: asksStatus,
    asksBettingConsequence,
  };
}

export function resolveNbaDecisionMode({
  sportHint,
  availabilityIntent,
  directPropAsk,
  invalidation,
}) {
  if (sportHint !== "nba") return "none";
  if (availabilityIntent?.isAvailabilityQuestion && !directPropAsk) {
    return availabilityIntent.asksBettingConsequence
      ? "status_plus_consequence"
      : "status_only";
  }
  if (invalidation?.blockedReason === "unavailable") return "blocked_unavailable";
  if (invalidation?.blockedReason === "odds_feed_unavailable") return "structural_only";
  if (invalidation?.blockedReason === "unlisted_market") return "structural_only";
  if (invalidation?.unresolved && invalidation?.hasTargetPlayerMarket) return "conditional_wait";
  return "actionable";
}

export function buildNbaConditionalPayload({ invalidation, nbaContext, newsImpact }) {
  const player = invalidation?.targetedPlayer || "targeted player";
  const status = invalidation?.statusDisplay || invalidation?.statusClass || "questionable";
  const lines = (nbaContext?.propLines || [])
    .filter((pl) => propLineMatchesTargetedPlayer(pl, player))
    .slice(0, 3)
    .map((pl) => `${pl.prop} ${pl.line}`)
    .join(" | ");
  const teamImpact = (newsImpact?.affectedTeams || []).find(
    (t) => String(t?.team || "").toUpperCase() === String(invalidation?.team || "").toUpperCase(),
  );
  const pivots = (teamImpact?.beneficiaries || [])
    .slice(0, 2)
    .map((b) => `${b.player} (${(b.markets || []).join("/")})`)
    .join("; ");
  return {
    player,
    status,
    listedMarkets: lines || "listed market present",
    ifActive:
      "convert to actionable with one primary angle at posted number and clear threshold.",
    ifOut:
      `hard block direct props for ${player}${pivots ? `; pivot watchlist: ${pivots}` : ""}.`,
    ifUnresolved:
      "keep conditional_wait; no full-size commitment before final availability.",
  };
}

function buildNbaPlayerResolutionBlock(invalidation) {
  const targeted = Array.isArray(invalidation?.targetedPlayers) ? invalidation.targetedPlayers : [];
  if (!targeted.length) return "";
  const rows = targeted.map((name) => {
    const verification = (invalidation?.marketVerification || []).find(
      (v) => String(v?.player || "").toLowerCase() === String(name || "").toLowerCase(),
    );
    const grounded = verification?.grounded ? "grounded" : "not_grounded";
    const market = verification?.verified ? "verified_market" : "unverified_market";
    return `${name}: ${grounded}, ${market}`;
  });
  return `NBA NAMED PLAYER RESOLUTION (BDL + Odds)\n${rows.join("\n")}`;
}

function nbaTeamSignals(team) {
  const out = new Set();
  const abbr = String(team?.abbr || "").toUpperCase();
  const name = String(team?.name || "").toLowerCase();
  if (abbr) out.add(abbr.toLowerCase());
  if (name) out.add(name);
  const cleaned = name.replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned) {
    out.add(cleaned);
    const tokens = cleaned.split(" ").filter(Boolean);
    const last = tokens[tokens.length - 1];
    if (last && last.length >= 4) out.add(last);
  }
  return out;
}

export function resolveNbaMatchupFromQuestion(question, nbaContext) {
  const q = normalizeText(question);
  if (!q) return null;

  const abbrs = extractNbaTeamAbbrevsFromQuestion(question);
  const games = Array.isArray(nbaContext?.todaysGames) ? nbaContext.todaysGames : [];
  const playoffSeries = Array.isArray(nbaContext?.playoffSeries) ? nbaContext.playoffSeries : [];

  /** When today's slate has no game for the named teams, playoff bracket rows still identify the series. */
  const matchupFromPlayoffSeries = () => {
    if (abbrs.length < 2) return null;
    const seriesMatch = playoffSeries.find((row) => {
      const home = String(row?.home || "").toUpperCase();
      const away = String(row?.away || "").toUpperCase();
      if (!home || !away) return false;
      return abbrs.includes(home) && abbrs.includes(away);
    });
    if (!seriesMatch) return null;
    const awayAbbr = String(seriesMatch.away || "").toUpperCase();
    const homeAbbr = String(seriesMatch.home || "").toUpperCase();
    if (!awayAbbr || !homeAbbr) return null;
    return {
      awayAbbr,
      homeAbbr,
      label: `${awayAbbr} at ${homeAbbr}`,
      isSeriesOnly: true,
    };
  };

  if (games.length === 0) {
    return matchupFromPlayoffSeries();
  }

  if (abbrs.length >= 2) {
    const exact = games.find((g) => {
      const away = String(g?.awayTeam?.abbr || "").toUpperCase();
      const home = String(g?.homeTeam?.abbr || "").toUpperCase();
      return abbrs.includes(away) && abbrs.includes(home);
    });
    if (exact) {
      return {
        awayAbbr: String(exact?.awayTeam?.abbr || "").toUpperCase(),
        homeAbbr: String(exact?.homeTeam?.abbr || "").toUpperCase(),
        label: `${String(exact?.awayTeam?.abbr || "").toUpperCase()} at ${String(exact?.homeTeam?.abbr || "").toUpperCase()}`,
      };
    }
  }

  for (const g of games) {
    const awaySignals = nbaTeamSignals(g?.awayTeam);
    const homeSignals = nbaTeamSignals(g?.homeTeam);
    const awayHit = [...awaySignals].some((s) => q.includes(s));
    const homeHit = [...homeSignals].some((s) => q.includes(s));
    if (awayHit && homeHit) {
      const awayAbbr = String(g?.awayTeam?.abbr || "").toUpperCase();
      const homeAbbr = String(g?.homeTeam?.abbr || "").toUpperCase();
      if (!awayAbbr || !homeAbbr) continue;
      return {
        awayAbbr,
        homeAbbr,
        label: `${awayAbbr} at ${homeAbbr}`,
      };
    }
  }

  const fromSeries = matchupFromPlayoffSeries();
  if (fromSeries) return fromSeries;

  if (games.length === 1) {
    const g = games[0];
    const awayAbbr = String(g?.awayTeam?.abbr || "").toUpperCase();
    const homeAbbr = String(g?.homeTeam?.abbr || "").toUpperCase();
    if (awayAbbr && homeAbbr) {
      return {
        awayAbbr,
        homeAbbr,
        label: `${awayAbbr} at ${homeAbbr}`,
      };
    }
  }

  return null;
}

export function buildAllowedMatchupPlayerPool(matchup, nbaContext) {
  const allowedTeams = matchup ? [matchup.awayAbbr, matchup.homeAbbr].filter(Boolean) : [];
  const teamSet = new Set(allowedTeams.map((t) => String(t || "").toUpperCase()));
  const playersByTeamAbbrev = nbaContext?.rosterGrounding?.playersByTeamAbbrev || {};
  const byTeam = {};
  const playerToTeam = new Map();

  for (const team of teamSet) {
    byTeam[team] = [];
    for (const n of playersByTeamAbbrev?.[team] || []) {
      const name = String(n || "").trim();
      if (!name) continue;
      if (!byTeam[team].includes(name)) byTeam[team].push(name);
      if (!playerToTeam.has(name.toLowerCase())) playerToTeam.set(name.toLowerCase(), team);
    }
  }

  for (const row of nbaContext?.playerStats || []) {
    const team = String(row?.team || "").toUpperCase();
    const name = String(row?.name || "").trim();
    if (!teamSet.has(team) || !name) continue;
    if (!byTeam[team]) byTeam[team] = [];
    if (!byTeam[team].includes(name)) byTeam[team].push(name);
    if (!playerToTeam.has(name.toLowerCase())) playerToTeam.set(name.toLowerCase(), team);
  }

  const knownPlayerToTeam = new Map(playerToTeam);
  for (const row of nbaContext?.playerStats || []) {
    const name = String(row?.name || "").trim();
    const team = String(row?.team || "").toUpperCase();
    if (name && team && !knownPlayerToTeam.has(name.toLowerCase())) {
      knownPlayerToTeam.set(name.toLowerCase(), team);
    }
  }
  for (const row of nbaContext?.injuries || []) {
    const name = String(row?.player || "").trim();
    const team = String(row?.team || "").toUpperCase();
    if (name && team && !knownPlayerToTeam.has(name.toLowerCase())) {
      knownPlayerToTeam.set(name.toLowerCase(), team);
    }
  }

  for (const team of Object.keys(byTeam)) byTeam[team].sort();
  const allowedPlayers = [...playerToTeam.keys()].map((k) => {
    for (const [team, names] of Object.entries(byTeam)) {
      const found = names.find((n) => n.toLowerCase() === k);
      if (found) return found;
    }
    return k;
  });

  return {
    allowedTeams,
    allowedPlayers,
    byTeam,
    playerToTeam,
    knownPlayerToTeam,
  };
}

function injectMatchupGroundingBlock(matchup, pool) {
  if (!matchup || !pool || pool.allowedTeams.length !== 2) return "";
  const awayPlayers = pool.byTeam[matchup.awayAbbr] || [];
  const homePlayers = pool.byTeam[matchup.homeAbbr] || [];
  const matchupQuality =
    awayPlayers.length >= 4 && homePlayers.length >= 4
      ? "full"
      : awayPlayers.length > 0 && homePlayers.length > 0
        ? "partial"
        : "thin";
  const awayList = awayPlayers.join(", ") || "(none grounded)";
  const homeList = homePlayers.join(", ") || "(none grounded)";
  return `VALID MATCHUP
- ${matchup.label}
VALID PLAYER POOL
- ${matchup.awayAbbr}: ${awayList}
- ${matchup.homeAbbr}: ${homeList}
- Focused matchup roster quality: ${matchupQuality}

MATCHUP ENFORCEMENT
- If you mention any player-specific prop or take, player must be from ${matchup.awayAbbr} or ${matchup.homeAbbr}.
- Do not mention players from other games/teams.
- If focused matchup roster quality is thin, use team-level analysis and do NOT guess player names. If it is full, use the authorized player names above normally.`;
}

function buildOffMatchupPromptAcknowledgement(question, matchup, pool) {
  if (!matchup || !pool || pool.allowedTeams.length !== 2) return "";
  const knownMap = pool.knownPlayerToTeam;
  if (!knownMap || knownMap.size === 0) return "";
  const allowedTeamSet = new Set(pool.allowedTeams.map((t) => String(t || "").toUpperCase()));
  const mentioned = extractMentionedPlayersFromOutput(question, knownMap);
  if (!mentioned.length) return "";
  const offMatchup = mentioned
    .map((key) => {
      const team = String(knownMap.get(key) || "").toUpperCase();
      if (!team || allowedTeamSet.has(team)) return null;
      return key
        .split(" ")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");
    })
    .filter(Boolean);
  if (!offMatchup.length) return "";
  const teamLabel = `${matchup.awayAbbr}/${matchup.homeAbbr}`;
  if (offMatchup.length === 1) {
    return `Limiting to ${teamLabel} players — ${offMatchup[0]} is not part of this matchup.`;
  }
  return `Limiting to ${teamLabel} players — ${offMatchup.join(", ")} are not part of this matchup.`;
}

export function extractMentionedPlayersFromOutput(output, knownPlayerToTeam) {
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

export function validatePlayersAgainstMatchup(mentionedPlayers, allowedTeamSet, playerToTeamMap) {
  const invalid = [];
  for (const p of mentionedPlayers || []) {
    const team = String(playerToTeamMap?.get(p) || "").toUpperCase();
    if (!team) continue;
    if (!allowedTeamSet.has(team)) {
      invalid.push({
        player: p
          .split(" ")
          .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
          .join(" "),
        team,
      });
    }
  }
  return invalid;
}

function repairOrRegenerateInvalidMatchupOutput({ matchup, pool, invalidPlayers }) {
  const away = matchup?.awayAbbr || "AWAY";
  const home = matchup?.homeAbbr || "HOME";
  const awayPlayers = (pool?.byTeam?.[away] || []).slice(0, 5).join(", ") || "(none grounded)";
  const homePlayers = (pool?.byTeam?.[home] || []).slice(0, 5).join(", ") || "(none grounded)";
  const invalidLine = (invalidPlayers || []).map((x) => `${x.player} (${x.team})`).join(", ");
  return `MATCHUP GROUNDING\nValid matchup: ${away} at ${home}.\nCross-game player mentions were removed: ${invalidLine}.\n\nVALID PLAYER POOL\n${away}: ${awayPlayers}\n${home}: ${homePlayers}\n\nNEXT ACTION\nUse only players from ${away} or ${home}. If you want player props, pick names from the valid pool above.`;
}

function normalizePlayerNameKey(name) {
  return String(name || "").trim().toLowerCase();
}

function inferNbaMarketSetFromStats(statsRow) {
  const pts = Number(statsRow?.pts);
  const ast = Number(statsRow?.ast);
  const reb = Number(statsRow?.reb);
  const out = [];
  if (Number.isFinite(pts) && pts >= 10) out.push("points");
  if (Number.isFinite(ast) && ast >= 4) out.push("assists");
  if (Number.isFinite(reb) && reb >= 5) out.push("rebounds");
  if (!out.length) out.push("points");
  return out.slice(0, 2);
}

function buildNbaOutStatusShiftPlan({ targetedPlayer, teamAbbr, nbaContext, teamImpact }) {
  const targetKey = normalizePlayerNameKey(targetedPlayer);
  const playersByTeam = nbaContext?.rosterGrounding?.playersByTeamAbbrev || {};
  const verifiedRoster = (playersByTeam?.[String(teamAbbr || "").toUpperCase()] || [])
    .map((n) => String(n || "").trim())
    .filter(Boolean);
  const rosterKeySet = new Set(verifiedRoster.map((n) => normalizePlayerNameKey(n)));
  const statsRows = Array.isArray(nbaContext?.playerStats) ? nbaContext.playerStats : [];
  const statsMap = new Map(
    statsRows
      .map((row) => [normalizePlayerNameKey(row?.name), row])
      .filter(([k]) => Boolean(k)),
  );

  const candidates = [];
  const seen = new Set();
  const pushCandidate = (name, markets = []) => {
    const cleaned = String(name || "").trim();
    const key = normalizePlayerNameKey(cleaned);
    if (!cleaned || !key || key === targetKey || seen.has(key)) return;
    if (rosterKeySet.size > 0 && !rosterKeySet.has(key)) return;
    const row = statsMap.get(key) || null;
    const resolvedMarkets = Array.isArray(markets) && markets.length ? markets : inferNbaMarketSetFromStats(row);
    seen.add(key);
    candidates.push({ name: cleaned, stats: row, markets: resolvedMarkets });
  };

  for (const b of teamImpact?.beneficiaries || []) {
    pushCandidate(b?.player, b?.markets || []);
  }
  if (candidates.length < 3) {
    const rankedRoster = verifiedRoster
      .map((name) => ({ name, row: statsMap.get(normalizePlayerNameKey(name)) || null }))
      .sort((a, b) => {
        const as = Number(a.row?.pts || 0) + Number(a.row?.ast || 0) * 1.4 + Number(a.row?.reb || 0) * 0.9;
        const bs = Number(b.row?.pts || 0) + Number(b.row?.ast || 0) * 1.4 + Number(b.row?.reb || 0) * 0.9;
        return bs - as;
      });
    for (const row of rankedRoster) {
      if (candidates.length >= 3) break;
      pushCandidate(row.name, inferNbaMarketSetFromStats(row.row));
    }
  }

  const selected = candidates.slice(0, 3);
  const replacementLines = selected.length
    ? selected
        .map((c) => {
          const pts = Number(c?.stats?.pts);
          const ast = Number(c?.stats?.ast);
          const reb = Number(c?.stats?.reb);
          const statsLine =
            Number.isFinite(pts) || Number.isFinite(ast) || Number.isFinite(reb)
              ? `${Number.isFinite(pts) ? `${pts} pts` : "n/a pts"}, ${Number.isFinite(ast) ? `${ast} ast` : "n/a ast"}, ${Number.isFinite(reb) ? `${reb} reb` : "n/a reb"}`
              : "no stable season stat row in payload";
          return `- ${c.name}: ${statsLine}; watch ${c.markets.join("/")} volume up.`;
        })
        .join("\n")
    : "- Verified roster replacements unavailable in payload; do not name replacement players until rosterGrounding refreshes.";

  const shiftLine = selected.length
    ? `Prop shifts: ${targetedPlayer} props stay blocked while out. Lean ${selected.map((c) => `${c.name} ${c.markets.join("/")}`).join("; ")} toward over if books post near baseline.`
    : `Prop shifts: ${targetedPlayer} props stay blocked while out; without verified replacement names, use team-level pace/usage angles only.`;
  const triggerPrimary = selected[0]?.name || "replacement guard";
  const triggerSecondary = selected[1]?.name || "secondary creator";
  const liveTrigger = `Live trigger: if ${triggerPrimary} and ${triggerSecondary} both clear opening-rotation minutes and early touch volume by halftime, keep the replacement-over angle; if one is stuck in a low-minute role, cut exposure.`;

  return { replacementLines, shiftLine, liveTrigger };
}

function buildNbaAvailabilityResponse({
  question,
  nbaContext,
  nbaInvalidation,
  derivedConfidence,
  nbaConfidenceModifier,
  decisionMode,
}) {
  const targetedPlayer = nbaInvalidation?.targetedPlayer || resolveQuestionNbaPlayer(question, nbaContext) || "Target player";
  const injuriesByPlayer = getNbaInjuryIndex(nbaContext || {});
  const injuryMeta = injuriesByPlayer.get(String(targetedPlayer).toLowerCase()) || null;
  const statusClass = injuryMeta?.statusClass || "unknown";
  const statusDisplay = injuryMeta?.statusRaw || injuryMeta?.detail || (statusClass === "unknown" ? "No injury designation in current context" : statusClass);
  const intent = detectNbaAvailabilityIntent(question);
  const includeConsequence =
    decisionMode === "status_plus_consequence" || intent.asksBettingConsequence;

  const firstLine =
    statusClass === "unknown"
      ? `STATUS\n${targetedPlayer} — ${statusDisplay}.`
      : `STATUS\n${targetedPlayer} — ${statusDisplay}.`;

  const confidenceLine = `CONFIDENCE\n${derivedConfidence}${nbaConfidenceModifier?.reason ? ` — ${nbaConfidenceModifier.reason}` : ""}`;
  let consequenceBlock = "";
  if (includeConsequence) {
    if (statusClass === "out") {
      const teamImpact = (nbaContext?.newsImpact?.affectedTeams || []).find(
        (t) => String(t?.team || "").toUpperCase() === String(injuryMeta?.team || "").toUpperCase(),
      );
      const outPlan = buildNbaOutStatusShiftPlan({
        targetedPlayer,
        teamAbbr: injuryMeta?.team,
        nbaContext,
        teamImpact,
      });
      consequenceBlock = `\n\nHow to play it\n${targetedPlayer} is out — do not play direct props on this player.\n\nReplacement looks\n${outPlan.replacementLines}\n\nProp reads\n${outPlan.shiftLine}\n\nWatch\n${String(outPlan.liveTrigger || "").replace(/^Live trigger:\s*/i, "").trim()}`;
    } else if (statusClass === "questionable" || statusClass === "doubtful") {
      consequenceBlock = `\n\nHow to play it\nTreat ${targetedPlayer} props as contingent until final availability confirms. Avoid full-size exposure before status lock.`;
    } else {
      consequenceBlock = `\n\nHow to play it\nNo explicit injury downgrade in current context. Use listed markets and matchup structure for any sizing decision.`;
    }
  }

  const statusShift =
    statusClass === "out" || statusClass === "questionable" || statusClass === "doubtful"
      ? `${targetedPlayer} status is ${statusDisplay}. Availability should be acknowledged before prop recommendations.`
      : null;

  return {
    response: `${firstLine}${consequenceBlock}\n\n${confidenceLine}`,
    statusShift,
  };
}

function isTier1InformationalQuestion(question) {
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

function shouldUseTier25WithDeep({ question, matchupContext, sportHint }) {
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

function isSpreadOrGameSideQuestion(question) {
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

function resolveOutputJsonMode({
  chaseSignals,
  intent,
  hasImage,
  liveSignals,
  question,
  matchupContext,
  sportHint,
  wcIntent,
}) {
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

function buildJsonOutputContract(
  mode,
  sportHint,
  { requireStatusShift = false, longFormRequested = false } = {},
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

  const worldCupTier25Spec = `TIER 2.5 — WORLD CUP 2026 (summary + deep)

summary field (plain text inside the JSON string, no markdown):
- Punchy direct answer: first sentence states the verdict and names the team(s). No setup or context in the opener.
- Max 150 words for summary total. Plain sentences only — no bullet lists, no ALL-CAPS section headers, no ">>" line.
- After the lead, at most 2-3 sentences of supporting reasoning.

deep field (same JSON object):
- Full reasoning with no word limit — group paths, risks, alt angles, fixture context, anything useful.
- Do NOT paste or repeat the summary verbatim; expand with new detail.
- Plain text inside the JSON string, no markdown.

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

  if (mode === "tier2_5_json") {
    const tier25Body = sport === "worldcup" ? worldCupTier25Spec : tier25Spec;
    return `OUTPUT CONTRACT — TIER 2.5 + DEEP (mandatory)
Return ONLY valid JSON with exactly these keys:
${sport === "nba" && requireStatusShift ? '{"summary":"...","deep":"...","statusShift":"..."}' : '{"summary":"...","deep":"..."}'}

${tier25Body}`;
  }

  return "";
}

function collectNbaVerifiedPlayerNamesFromGrounding(nbaContext) {
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

function questionExplicitlyNamesPlayerCue(question) {
  const q = String(question || "").trim();
  if (!q) return false;
  const fullName = /\b(?:about|for)\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/;
  const surnameCue = /\bfor\s+[A-Z][a-z]{2,}(?:'s)?\b/;
  const possessivePlayer = /\b[A-Z][a-z]{2,}'s\s+(?:PRA|line|prop)/;
  return fullName.test(q) || surnameCue.test(q) || possessivePlayer.test(q);
}

function buildNbaRosterListInner(nbaContext, rosterOpts = {}) {
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

function buildNbaRosterProminentInjection(nbaContext, rosterOpts = {}) {
  return `════════════════════════════════════════
${buildNbaRosterListInner(nbaContext, rosterOpts)}
════════════════════════════════════════`;
}

const NO_MARKET_VERIFIED_PLAYER_STEP_2 = `2. Name the two to four highest-usage players from the AUTHORIZED list for each team in the matchup. For SAS this must include Wembanyama if present. Never stop at one name if more authorized names exist for the matchup teams.
If fewer than two authorized names exist for the matchup, do NOT invent names.
Give a sharp team-level read anchored to matchup context — never mention missing lines,
loading pipelines, or roster completeness.`;

const PROP_PROJECTION_MODE_BLOCK = `PROP PROJECTION MODE — MANDATORY

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

const SPREAD_AND_GAME_SIDE_BLOCK = `SPREAD AND GAME SIDE — when user asks about a spread, ATS, or which team covers:

- Use only spreads.{gameKey}.current.displayLine from the NBA context JSON (favorite carries the minus, e.g. DET -4.5 at home). Never flip favorite/underdog.
- If spreads[].lineMovement.hasMovement is true, cite lineMovement.narrative in analysis.lineMovement.
- If lineUnavailable is true, say "line unavailable" once — no invented numbers.

Answer the spread question directly in the first sentence. Do not pivot to a prop angle.
Format: '[Team] covers at [number] if [specific condition]. The fragile assumption behind the other side: [one sentence].'
Identify the specific game script that decides the cover — pace, foul trouble, bench depth, specific player performance threshold.
Name the kill script explicitly: 'This breaks if [specific condition].'
End with the live trigger format: 'Live trigger: [player/team] [observable action] by [time marker] — if yes, [cover holds]. If no, [reassess].'`;

const ROSTER_ENFORCEMENT_NBA = `ROSTER ENFORCEMENT — THIS IS A HARD RULE WITH NO EXCEPTIONS

playersByTeamAbbrev in rosterGrounding lists the ONLY players you are
allowed to name as members of each team. Use this for internal checks only —
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
   unconfirmed, partial, or loading — if coverage is weak, reflect that only
   through CONFIDENCE (High / Medium / Speculative), not a prose disclaimer.

3. Your training data about NBA rosters is STALE and WRONG. Trades,
   injuries, and roster moves happen constantly. A player you "know"
   is on a team from training may have been traded months ago. NEVER
   use training memory for specific player-team assignments.

4. "De'Andre Murray", "Marcus Young", or any name you generate that
   is not in playersByTeamAbbrev is a hallucinated player. Hallucinated
   players destroy user trust and make this product worthless. There
   is no acceptable scenario where you invent a player name.

5. EXCEPTION — IMAGE OR USER-NAMED PLAYER: When an image is attached OR the
   Question explicitly names a player (or shows their line card), that name and
   any stats visible in the screenshot or stated in the Question are AUTHORIZED.
   Do not reply with “I can't cite [that player] without verification.” The user
   supplied the source. Use API roster lists only as a supplement.
   If they are missing from playersByTeamAbbrev, note "live roster data unavailable
   for [player]" and analyze from stats in context — never refuse as "not in verified roster."

ROSTER DISCLOSURE RULE:
Never tell the user which players are verified, partial, or loading.
Never say "working from partial roster data."
Never say "data is still loading" or any variation.
Never say which team's roster is confirmed vs thin.
Never mention client UI, API merge, rosterGroundingQuality, or "combined" data sources.
The confidence line reflects data quality. That is the only place uncertainty
about data completeness belongs. Nowhere else.

TYPO / SLANG NAME RESOLUTION (mandatory): Verified BallDontLie roster lists for this slate are sufficient to identify who the user means. When a token in the Question does not exactly match a listed name, fuzzy-match it to the closest authorized full name on either team (playersByTeamAbbrev / INTERNAL authorized-name blocks). Use that verified full name naturally in the analysis — never ask the user to confirm identity ("if you meant", "tell me who", "correct spelling"). Do not use staged "That's [Name] —" openers; align with global tone rules. ESPN/board enrichment in context is authoritative for game framing — not an excuse to punt on name resolution.

ENFORCEMENT CHECK: Before generating your response, mentally verify each player name:
If the name appears in the Question or attached image → allowed.
Otherwise, for roster membership → must appear under the correct team in
playersByTeamAbbrev or remove it.`;

function _parseNbaTonightGameAbbrs(tonightGame) {
  const s = String(tonightGame || "").trim();
  const m = s.match(/^([A-Z0-9]{2,4})\s*@\s*([A-Z0-9]{2,4})$/i);
  if (!m) return null;
  return { away: m[1].toUpperCase(), home: m[2].toUpperCase() };
}

function _collectTonightNbaSlateAbbrs(todaysGames) {
  const set = new Set();
  for (const g of todaysGames || []) {
    const aa = canonicalizeTeamAbbr(g?.awayTeam?.abbr);
    const ha = canonicalizeTeamAbbr(g?.homeTeam?.abbr);
    if (aa && aa !== "?" && aa !== "UNK") set.add(aa);
    if (ha && ha !== "?" && ha !== "UNK") set.add(ha);
  }
  return set;
}

function _filterBdlAvailabilityToTeams(avail, allowTeams) {
  if (!avail || typeof avail !== "object" || !allowTeams || allowTeams.size === 0) return {};
  const out = {};
  for (const [name, meta] of Object.entries(avail)) {
    const t = canonicalizeTeamAbbr(meta?.team);
    if (t && allowTeams.has(t)) out[name] = meta;
  }
  return out;
}

/** @param {unknown[]} injuries */
function _injuryRowsByNormalizedPlayerName(injuries) {
  const m = new Map();
  for (const r of injuries || []) {
    const k = String(r?.player || "").trim().toLowerCase();
    if (k && !m.has(k)) m.set(k, r);
  }
  return m;
}

/**
 * Slim stat rows use `name`; raw rows may use `player`.
 * Union with `filteredInjuries` so players who only appear as retained injury rows (e.g. named in the question but off the focused stat slice) still get a row.
 * @param {unknown[]} rows
 * @param {unknown[]} filteredInjuries
 */
function _collectBdlAvailabilityPlayerNames(rows, filteredInjuries) {
  /** @type {Map<string, string>} lower -> canonical display */
  const map = new Map();
  for (const row of rows || []) {
    const display = String(row?.name || row?.player || "").trim();
    if (!display) continue;
    const k = display.toLowerCase();
    if (!map.has(k)) map.set(k, display);
  }
  for (const inj of filteredInjuries || []) {
    const display = String(inj?.player || "").trim();
    if (!display) continue;
    const k = display.toLowerCase();
    if (!map.has(k)) map.set(k, display);
  }
  return map;
}

/**
 * One row per player in the slimmed stat bundle — explicit healthy vs injured for the model.
 * @param {Map<string, string>} displayNamesByLower
 * @param {Map<string, object>} injuriesByLower
 */
function _buildBdlAvailabilityModelArray(displayNamesByLower, injuriesByLower) {
  const out = [];
  for (const displayName of displayNamesByLower.values()) {
    const k = displayName.toLowerCase();
    const inj = injuriesByLower.get(k);
    if (inj) {
      const parts = [
        inj.status != null && String(inj.status).trim(),
        inj.detail != null && String(inj.detail).trim(),
        inj.returnDate != null && String(inj.returnDate).trim(),
      ].filter(Boolean);
      out.push({
        player: displayName,
        status: "INJURED",
        detail: parts.join(" — ") || String(inj.status || "").trim() || "Listed on BDL injury feed",
      });
    } else {
      out.push({
        player: displayName,
        status: "NOT LISTED / ACTIVE per BDL",
      });
    }
  }
  out.sort((a, b) => String(a.player).localeCompare(String(b.player)));
  return out;
}

function _buildNbaSlateRowDigest(game) {
  const a = String(game?.awayTeam?.abbr || "").toUpperCase();
  const h = String(game?.homeTeam?.abbr || "").toUpperCase();
  const at = String(game?.awayTeam?.name || "").trim();
  const ht = String(game?.homeTeam?.name || "").trim();
  const tLabel = game?.startTimeUtc
    ? new Date(game.startTimeUtc).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
      })
    : "";
  const when = tLabel ? `${tLabel} ET` : "time TBD";
  return `${a} vs ${h} — ${at || a} at ${ht || h} — ${when}`;
}

/**
 * Shallow clone via JSON, then filter what is sent to the model (Haiku) only.
 * Fetch/cache code keeps full nbaContext server-side; call sites pass this for prompt JSON + roster block.
 * @param {object} nbaContext
 * @param {{ awayAbbr: string, homeAbbr: string } | null} nbaMatchup
 * @param {string} [question] When trimming injuries to tonight's slate, keep rows for players named in the question.
 */
export function buildNbaContextForModel(nbaContext, nbaMatchup, question = "") {
  if (!nbaContext || typeof nbaContext !== "object") return nbaContext;
  const todays = Array.isArray(nbaContext.todaysGames) ? nbaContext.todaysGames : [];
  const tonight = _collectTonightNbaSlateAbbrs(todays);
  const awayF = nbaMatchup ? String(nbaMatchup.awayAbbr || "").toUpperCase() : "";
  const homeF = nbaMatchup ? String(nbaMatchup.homeAbbr || "").toUpperCase() : "";
  /** Two-team matchup scope — stats + rosterGrounding.playersByTeamAbbrev use this when set. */
  const matchupTeamSet = awayF && homeF ? new Set([awayF, homeF]) : null;
  /** Broader slate scope when no matchup resolved (multi-game boards). */
  const relevantTeams = matchupTeamSet || (tonight.size > 0 ? tonight : null);

  let raw;
  try {
    raw = JSON.parse(JSON.stringify(nbaContext));
  } catch {
    return nbaContext;
  }

  if (tonight.size > 0) {
    raw.bdlAvailability = _filterBdlAvailabilityToTeams(raw.bdlAvailability, tonight);
    if (raw.bdlGrounding && typeof raw.bdlGrounding === "object") {
      raw.bdlGrounding = { ...raw.bdlGrounding };
      raw.bdlGrounding.bdlAvailability = _filterBdlAvailabilityToTeams(
        raw.bdlGrounding.bdlAvailability,
        tonight,
      );
      if (raw.bdlGrounding.bdlGroundedPlayers) {
        const gP = {};
        for (const [k, v] of Object.entries(raw.bdlGrounding.bdlGroundedPlayers)) {
          const t = canonicalizeTeamAbbr(v?.team);
          if (t && tonight.has(t)) gP[k] = v;
        }
        raw.bdlGrounding.bdlGroundedPlayers = gP;
      }
    }
  }

  /** BallDontLie injury rows after slate/question filtering — same source as INJURED rows in `bdlAvailability`. */
  let filteredInjuries = Array.isArray(raw.injuries) ? raw.injuries.slice() : [];
  if (tonight.size > 0 && Array.isArray(raw.injuries)) {
    const q = String(question || "");
    filteredInjuries = raw.injuries.filter((r) => {
      const t = canonicalizeTeamAbbr(r?.team);
      if (t && tonight.has(t)) return true;
      const playerLc = String(r?.player || "").toLowerCase();
      return Boolean(q && playerLc && questionMentionsPlayer(q, playerLc));
    });
    raw.injuries = filteredInjuries;
  }

  if (Array.isArray(raw.playerStats)) {
    if (relevantTeams && relevantTeams.size > 0) {
      raw.playerStats = raw.playerStats.filter((row) => {
        const t = String(row?.team || "").toUpperCase();
        if (relevantTeams.has(t)) return true;
        if (matchupTeamSet) {
          const tg = _parseNbaTonightGameAbbrs(row?.tonightGame);
          if (tg) {
            const a = [tg.away, tg.home].sort().join();
            const b = [awayF, homeF].sort().join();
            if (a && b && a === b) return true;
          }
        }
        return false;
      });
    } else {
      raw.playerStats = raw.playerStats.slice(0, 72);
    }
    if (!matchupTeamSet && Array.isArray(raw.playerStats) && raw.playerStats.length > 96) {
      raw.playerStats = raw.playerStats.slice(0, 96);
    }
  }

  if (raw.rosterGrounding && raw.rosterGrounding.playersByTeamAbbrev) {
    const rosterAbbrScope = matchupTeamSet || relevantTeams;
    const pbt = {};
    if (rosterAbbrScope && rosterAbbrScope.size > 0) {
      for (const ab of rosterAbbrScope) {
        if (raw.rosterGrounding.playersByTeamAbbrev[ab]) {
          pbt[ab] = raw.rosterGrounding.playersByTeamAbbrev[ab];
        }
      }
    }
    raw.rosterGrounding = { ...raw.rosterGrounding, playersByTeamAbbrev: pbt };
    if (raw.rosterGrounding.qualityByTeam) {
      const q = {};
      const qScope = matchupTeamSet || relevantTeams;
      if (qScope && qScope.size > 0) {
        for (const ab of qScope) {
          if (raw.rosterGrounding.qualityByTeam[ab] != null) {
            q[ab] = raw.rosterGrounding.qualityByTeam[ab];
          }
        }
      }
      raw.rosterGrounding.qualityByTeam = q;
    }
  }

  if (matchupTeamSet && Array.isArray(raw.propLines)) {
    const fa = awayF;
    const fh = homeF;
    raw.propLines = raw.propLines.filter((pl) => {
      const g = String(pl?.game || "");
      if (!g) return true;
      const gup = g.toUpperCase();
      return gup.includes(fa) && gup.includes(fh);
    });
  }

  const focusedPropsOdds = resolveNbaPropsOddsForPrompt(nbaContext, nbaMatchup);
  if (focusedPropsOdds && typeof focusedPropsOdds === "object") {
    raw.propsOdds = focusedPropsOdds;
  } else {
    delete raw.propsOdds;
  }
  raw.propsOddsStale = Boolean(
    nbaContext?.propsOddsStale ?? focusedPropsOdds?.freshness?.isStale,
  );
  delete raw.propsOddsByGameId;
  delete raw.propsOddsMeta;

  if (matchupTeamSet && todays.length > 0) {
    raw.todaysGames = todays.map((g) => {
      const a = String(g?.awayTeam?.abbr || "").toUpperCase();
      const h = String(g?.homeTeam?.abbr || "").toUpperCase();
      const isFocus = (a === awayF && h === homeF) || (a === homeF && h === awayF);
      if (isFocus) return g;
      return {
        _slimSlate: true,
        awayTeam: { abbr: g?.awayTeam?.abbr, name: g?.awayTeam?.name, score: g?.awayTeam?.score },
        homeTeam: { abbr: g?.homeTeam?.abbr, name: g?.homeTeam?.name, score: g?.homeTeam?.score },
        startTimeUtc: g?.startTimeUtc,
        startTimeSource: g?.startTimeSource,
        state: g?.state,
        status: g?.status,
        period: g?.period,
        clock: g?.clock,
        seriesContext: g?.seriesContext,
        digest: _buildNbaSlateRowDigest(g),
      };
    });
  }

  if (matchupTeamSet && raw.gameTotals && typeof raw.gameTotals === "object" && !Array.isArray(raw.gameTotals)) {
    const o = {};
    for (const [k, v] of Object.entries(raw.gameTotals)) {
      const ku = k.toUpperCase();
      if (ku.includes(awayF) && ku.includes(homeF)) o[k] = v;
    }
    if (Object.keys(o).length > 0) raw.gameTotals = o;
  }

  if (matchupTeamSet && raw.spreads && typeof raw.spreads === "object" && !Array.isArray(raw.spreads)) {
    const o = {};
    for (const [k, v] of Object.entries(raw.spreads)) {
      const ku = k.toUpperCase();
      if (ku.includes(awayF) && ku.includes(homeF)) o[k] = v;
    }
    if (Object.keys(o).length > 0) raw.spreads = o;
  }

  // Same filter for slate-resolved and playoffSeries-only matchups (isSeriesOnly): awayF/homeF scope the model.
  if (matchupTeamSet && Array.isArray(raw.playoffSeries)) {
    raw.playoffSeries = raw.playoffSeries.filter((row) => {
      const s = JSON.stringify(row || "").toUpperCase();
      return s.includes(awayF) && s.includes(homeF);
    });
    raw.focusedSeriesSnapshot = buildFocusedPlayoffSeriesSnapshot(awayF, homeF, raw.playoffSeries, todays);
  }

  raw.liveScoreLabels = buildNbaLiveScoreInterpretationLabels(
    Array.isArray(raw.todaysGames) ? raw.todaysGames : [],
    raw.gameTotals && typeof raw.gameTotals === "object" && !Array.isArray(raw.gameTotals)
      ? raw.gameTotals
      : null,
  );

  if (Array.isArray(raw.playerStats)) {
    raw.playerStats = raw.playerStats.map((row) => slimNbaPlayerStatRowForUrTake(row));
  }
  raw.playoffSeries = slimPlayoffSeriesForBoard(raw.playoffSeries || []);

  {
    const injuryByNorm = _injuryRowsByNormalizedPlayerName(filteredInjuries);
    const namesMap = _collectBdlAvailabilityPlayerNames(raw.playerStats, filteredInjuries);
    raw.bdlAvailability = _buildBdlAvailabilityModelArray(namesMap, injuryByNorm);
  }

  delete raw.urTakeParsing;
  delete raw.propFeedMeta;
  delete raw.fetchedAt;
  delete raw.playoffFocusMeta;
  delete raw._rosterDiag;
  delete raw.liveEdgeAlerts;
  delete raw.playoffPathGrounding;
  delete raw.oddsAvailable;
  delete raw.spreadMovementByGame;

  return raw;
}

function extractMlbMarketHints(qRaw) {
  const q = String(qRaw || "").toLowerCase();
  const hints = new Set();
  if (/\b(strikeout|strikeouts|\bk\b|\bks\b|\bso\b|punchies)\b/i.test(q)) hints.add("strikeouts");
  if (/\b(total\s+bases|\btb\b)\b/i.test(q)) hints.add("total_bases");
  if (/\b(home\s*run|homer|\bhr\b|\bhrs\b)\b/i.test(q)) hints.add("home_runs");
  if (/\bhits\b/i.test(q)) hints.add("hits");
  if (/\brbi(s)?\b/i.test(q)) hints.add("rbis");
  if (
    /\b(game\s+total|team\s+total|runs\s+total|total\s+runs|over[/\s-]+under|ou\s*\d)/i.test(q)
  ) {
    hints.add("game_total");
  }
  return hints;
}

function mlbPropMatchesMarketHints(pl, hints) {
  if (!hints || hints.size === 0) return true;
  const raw = `${pl?.propRaw || ""} ${pl?.prop || ""}`.toLowerCase();
  for (const h of hints) {
    if (h === "game_total") continue;
    if (
      h === "strikeouts" &&
      (raw.includes("strikeout") || raw.includes("pitcher_strikeout"))
    )
      return true;
    if (h === "total_bases" && (raw.includes("total_base") || raw.includes("total bases")))
      return true;
    if (h === "home_runs" && raw.includes("home_run")) return true;
    if (h === "hits" && raw.includes("batter_hits")) return true;
    if (h === "rbis" && raw.includes("batter_rbis")) return true;
  }
  return false;
}

function collectMlbRosterNames(mlbContext) {
  const names = [];
  const seen = new Set();
  for (const pl of mlbContext?.propLines || []) {
    const n = String(pl?.player || "").trim();
    if (!n || seen.has(n.toLowerCase())) continue;
    seen.add(n.toLowerCase());
    names.push(n);
  }
  for (const g of mlbContext?.games || []) {
    for (const side of ["homeTeam", "awayTeam"]) {
      const pit = g?.[side]?.pitcher;
      const n = String(pit || "").trim();
      if (!n || /^tbd$/i.test(n) || seen.has(n.toLowerCase())) continue;
      seen.add(n.toLowerCase());
      names.push(n);
    }
  }
  for (const inj of mlbContext?.injuries || []) {
    const n = String(inj?.player || "").trim();
    if (!n || seen.has(n.toLowerCase())) continue;
    seen.add(n.toLowerCase());
    names.push(n);
  }
  return names;
}

function findMlbPlayerReference(question, mlbContext) {
  const q = normalizeText(question);
  if (!q) return { matched: false };
  const candidates = [];
  for (const fullName of collectMlbRosterNames(mlbContext)) {
    const lower = fullName.toLowerCase();
    const parts = lower.split(/\s+/).filter(Boolean);
    const last = parts[parts.length - 1];
    if (q.includes(lower)) {
      candidates.push({ fullName, score: 100 });
      continue;
    }
    if (last && last.length >= 4 && new RegExp(`\\b${escapeRegExp(last)}\\b`, "i").test(q)) {
      candidates.push({ fullName, score: last.length });
    }
  }
  if (candidates.length === 0) return { matched: false };
  candidates.sort((a, b) => b.score - a.score);
  const topScore = candidates[0].score;
  const tied = candidates.filter((c) => c.score === topScore);
  if (tied.length > 1) return { matched: false, ambiguous: true };
  return { matched: true, canonicalName: tied[0].fullName };
}

function playerNamesAlign(a, b) {
  const na = String(a || "")
    .trim()
    .toLowerCase();
  const nb = String(b || "")
    .trim()
    .toLowerCase();
  if (!na || !nb) return false;
  if (na === nb) return true;
  const la = na.split(/\s+/).pop();
  const lb = nb.split(/\s+/).pop();
  return Boolean(la && lb && la === lb && la.length >= 4);
}

function scoreMlbGameMatch(question, g) {
  const ql = normalizeText(question);
  let s = 0;
  for (const t of [g?.awayTeam, g?.homeTeam]) {
    const ab = String(t?.abbr || "").toLowerCase();
    const nm = String(t?.name || "");
    const nml = nm.toLowerCase();
    if (ab && ql.includes(ab)) s += 3;
    if (nm.length > 4 && ql.includes(nml)) s += 4;
    const last = nm.split(" ").pop();
    if (last && last.length >= 4 && ql.includes(last.toLowerCase())) s += 2;
    if (nml.includes("red sox") && ql.includes("red sox")) s += 4;
    if (nml.includes("white sox") && ql.includes("white sox")) s += 4;
  }
  return s;
}

function findMlbGameReference(question, games) {
  if (!Array.isArray(games) || games.length === 0) return { matched: false };
  const scored = games
    .map((g) => ({ g, s: scoreMlbGameMatch(question, g) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  if (scored.length === 0) return { matched: false };
  if (scored[0].s >= 4) return { matched: true, game: scored[0].g };
  if (scored[0].s >= 3 && (scored.length === 1 || scored[0].s > scored[1].s)) {
    return { matched: true, game: scored[0].g };
  }
  if (scored[0].s >= 2 && scored.length === 1) return { matched: true, game: scored[0].g };
  return { matched: false };
}

function gameRowMatchesPropGame(plGame, g) {
  if (!plGame || !g) return false;
  const parts = String(plGame)
    .split("@")
    .map((s) => s.trim().toLowerCase());
  if (parts.length !== 2) return false;
  const [pa, ph] = parts;
  const ga = String(g.awayTeam?.name || "").toLowerCase();
  const gh = String(g.homeTeam?.name || "").toLowerCase();
  const rough = (a, b) =>
    Boolean(a && b && (a.includes(b) || b.includes(a) || a.split(/\s+/).pop() === b.split(/\s+/).pop()));
  return (
    (rough(pa, ga) && rough(ph, gh)) || (rough(pa, gh) && rough(ph, ga))
  );
}

function findGameTotalsKeyForGame(gameTotals, g) {
  if (!g || !gameTotals || typeof gameTotals !== "object") return null;
  for (const key of Object.keys(gameTotals)) {
    if (gameRowMatchesPropGame(key, g)) return key;
  }
  return null;
}

function formatNbaLabelNumber(n) {
  if (!Number.isFinite(n)) return String(n);
  const x = Math.round(n * 2) / 2;
  return Number.isInteger(x) ? String(x) : x.toFixed(1);
}

/**
 * Pre-computed score strings for the model JSON (format-only; uses existing todaysGames + gameTotals only).
 */
function buildNbaLiveScoreInterpretationLabels(todaysGames, gameTotals) {
  const lines = [];
  if (!Array.isArray(todaysGames) || todaysGames.length === 0) return lines;
  const gt =
    gameTotals && typeof gameTotals === "object" && !Array.isArray(gameTotals) ? gameTotals : null;

  for (const g of todaysGames) {
    if (!g || typeof g !== "object") continue;
    const awayAbbr = String(g?.awayTeam?.abbr ?? "").trim() || "AWAY";
    const homeAbbr = String(g?.homeTeam?.abbr ?? "").trim() || "HOME";
    const awayScore = g?.awayTeam?.score;
    const homeScore = g?.homeTeam?.score;
    if (!Number.isFinite(Number(awayScore)) || !Number.isFinite(Number(homeScore))) continue;

    const a = Number(awayScore);
    const h = Number(homeScore);
    const combined = a + h;

    const period = Number(g?.period);
    const qNum = Number.isFinite(period) && period > 0 ? period : null;
    const qLabel = qNum != null ? `Q${qNum}` : "Q?";

    lines.push(`${awayAbbr} has scored: ${formatNbaLabelNumber(a)} points`);
    lines.push(`${homeAbbr} has scored: ${formatNbaLabelNumber(h)} points`);
    lines.push(
      `Combined total through ${qLabel}: ${formatNbaLabelNumber(a)}+${formatNbaLabelNumber(h)}`,
    );

    if (gt) {
      const key = findGameTotalsKeyForGame(gt, g);
      if (key) {
        const totalLine = Number(gt[key]?.total);
        if (Number.isFinite(totalLine)) {
          const delta = totalLine - combined;
          const dStr = formatNbaLabelNumber(delta);
          const lStr = formatNbaLabelNumber(totalLine);
          lines.push(`To hit over ${lStr}: need ${dStr} more combined points`);
          lines.push(`To cash under ${lStr}: must stay under ${dStr} combined remaining`);
        }
      }
    }
  }
  return lines;
}

/**
 * MLB server decision mode (MLB only — aligns conditional analysis with missing-market guardrails).
 * - actionable: posted data in propLines/gameTotals matches this question's player/game/market scope.
 * - structural_only: everything else (thin slate, no listed market for the ask, empty bundle) — still full LLM take.
 *
 * Known limitations (baseline — keep question-aware routing lean; refine deliberately):
 * - Player detection uses names from propLines plus probable/listed pitchers on games[] only — not full batting rosters.
 * - Game/prop/totals matching can fall back to structural_only when ESPN vs Odds API team strings diverge.
 * - If the question implies a player but extractMlbMarketHints finds no market keywords, any prop row for that player still qualifies as actionable (narrow by prompts later if needed).
 */
export function resolveMlbDecisionMode(mlbContext = {}, question = "") {
  const games = Array.isArray(mlbContext?.games) ? mlbContext.games : [];
  const propLines = Array.isArray(mlbContext?.propLines) ? mlbContext.propLines : [];
  const gameTotals =
    mlbContext?.gameTotals &&
    typeof mlbContext.gameTotals === "object" &&
    !Array.isArray(mlbContext.gameTotals)
      ? mlbContext.gameTotals
      : {};

  const hasGames = games.length > 0;
  const hasProps = propLines.length > 0;
  const hasTotals = Object.keys(gameTotals).length > 0;

  if (!hasGames && !hasProps && !hasTotals) {
    return "structural_only";
  }

  const marketHints = extractMlbMarketHints(question);
  const wantsGameTotal = marketHints.has("game_total");
  const playerRef = findMlbPlayerReference(question, mlbContext);
  const gameRef = findMlbGameReference(question, games);

  const propsForPlayer = playerRef.matched
    ? propLines.filter((pl) => playerNamesAlign(pl?.player, playerRef.canonicalName))
    : [];

  if (playerRef.matched) {
    if (propsForPlayer.length === 0) return "structural_only";
    const hintsNoTotal = new Set(marketHints);
    hintsNoTotal.delete("game_total");
    if (hintsNoTotal.size === 0) {
      return "actionable";
    }
    const ok = propsForPlayer.some((pl) => mlbPropMatchesMarketHints(pl, hintsNoTotal));
    return ok ? "actionable" : "structural_only";
  }

  if (gameRef.matched) {
    const forGame = propLines.filter((pl) => gameRowMatchesPropGame(pl.game, gameRef.game));
    const totalsKey = findGameTotalsKeyForGame(gameTotals, gameRef.game);
    if (wantsGameTotal) {
      if (totalsKey) return "actionable";
      return forGame.length > 0 ? "actionable" : "structural_only";
    }
    const hintsNoTotal = new Set(marketHints);
    hintsNoTotal.delete("game_total");
    if (hintsNoTotal.size === 0) {
      return forGame.length > 0 ? "actionable" : "structural_only";
    }
    const ok = forGame.some((pl) => mlbPropMatchesMarketHints(pl, hintsNoTotal));
    return ok ? "actionable" : "structural_only";
  }

  return "structural_only";
}

function buildMlbParlayUserPromptAppendix(question) {
  if (!detectParlayIntent(question)) return "";
  return `\n\n${buildMlbParlayResponseRule()}`;
}

function buildMlbPreMarketUserPrompt({
  question,
  mlbContext,
  derivedConfidence,
  priorTakesSummary,
  mlbVerifiedBlock,
}) {
  const gameTotals =
    mlbContext?.gameTotals &&
    typeof mlbContext.gameTotals === "object" &&
    !Array.isArray(mlbContext.gameTotals)
      ? mlbContext.gameTotals
      : {};
  const totalsKeys = Object.keys(gameTotals);
  const totalsPreview =
    totalsKeys.length > 0
      ? JSON.stringify(
          Object.fromEntries(totalsKeys.slice(0, 12).map((k) => [k, gameTotals[k]])),
          null,
          2,
        )
      : null;

  const totalsNote = totalsPreview
    ? `Listed game totals from payload only — cite these numbers verbatim when referencing a total:\n${totalsPreview}`
    : "No gameTotals in this payload — do not state a game total number.";

  return `You are answering an MLB betting question (structural / partial-board mode — same quality bar as full lines).

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${question}

MLB context (JSON — authoritative for what exists; absence means unknown):
${contextJsonForModel(mlbContext)}

${mlbVerifiedBlock}

${totalsNote}

SERVER MODE — STRUCTURAL (mandatory)
- Do NOT invent prop numbers, K totals, strikeout lines, hitter lines, juice, or price quotes.
- Do NOT say or imply "expect K props at X", "books will price", "likely opens at", "look for under 6.5", or any fabricated numeric projection unless that exact number appears in propLines or gameTotals in the JSON above.
- Do NOT assume books are pricing anything until propLines lists the market.
- You MAY describe park factors and venue using games[].park (and named pitchers only when printed on that side — never invent a starter name).
- You MAY cite a game total ONLY from gameTotals in the JSON (exact number).

MLB ANTI-REFUSAL (mandatory)
- Never refuse, decline, or say you "cannot" give a mispricing read solely because probable starters are TBD, gameTotals is missing for some matchups, or a specific prop is not in propLines. TBD starters are normal pre-lock — open directly with park / bullpen / pace / leverage framing (the structural lean). Do not lead with starter uncertainty, probables caveats, or throat-clearing; the only starter caveat when TBD is the final sentence below.
- Never say "I can't call this mispriced" or any variant that declines the lean — deliver the structural angle, then hedge at the end.
- When probable starters or pitchers are still TBD in games[] or context, end the entire response with exactly one final sentence: "Confirm starters before placing." (after your lean — not instead of it.)
- You must still output a useful directional lean (over/under/side/watch) from structural anchors in games[], injuries, and any numbers present in gameTotals or propLines. If a posted total exists for a game, cite it verbatim; if not, discuss run environment qualitatively without inventing a line.

Answer structure:
1. Lean first — give a clear take (over/under/side/slight lean/close) even when market verification is missing.

2. Structural angles — park/run environment, role, matchup, and game-script framing without fake prop numbers.

3. What breaks the lean — one concrete condition that would invalidate or flip it.

4. Optional clarifier — ask for one compact missing market detail (exact line / market scope) to tighten the recommendation.

CONFIDENCE — cap at Medium; align tone with ${derivedConfidence}.

${buildMlbParlayUserPromptAppendix(question)}

${buildUrTakeSportTurnScopeRules("mlb")}

Rules:
- Do not invent unrelated games or props.
`;
}

function buildMlbActionableUserPrompt({
  question,
  mlbContext,
  derivedConfidence,
  priorTakesSummary,
  mlbVerifiedBlock,
}) {
  return `You are answering an MLB betting question.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${question}

MLB context:
${contextJsonForModel(mlbContext)}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Only go above that if the input strongly justifies it.

${mlbVerifiedBlock}

SERVER MODE — ACTIONABLE (propLines present in payload)
- You MAY cite specific prop lines ONLY when they appear in propLines (player, prop type, line, book/sportsbook field as given).
- You MAY cite game total numbers ONLY from gameTotals in the JSON.
- Do NOT invent props, K totals, or juice not shown in propLines or gameTotals.
- Do NOT claim books "will" open or price at a level without a listed line in propLines.

MLB ANTI-REFUSAL (mandatory)
- Never refuse the take solely because a probable pitcher is still TBD in games[] — open with the grounded lean from listed lines and structure; do not open with pitcher-TBD disclaimers or conditional throat-clearing.
- Never say "I can't call this mispriced" — commit to the lean from verified lines and structure, then hedge last.
- When starters are still TBD, end with exactly one sentence: "Confirm starters before placing."

${buildMlbParlayUserPromptAppendix(question)}

${buildUrTakeSportTurnScopeRules("mlb")}

Rules:
- Do not invent unrelated games or props.

Lead with the strongest grounded angle using verified lines from propLines. If starters are still TBD in games[], keep the body of the answer committed to structure and listed lines; close with "Confirm starters before placing." — do not front-load TBD or "conditional on confirmation" at the top.
`;
}

function buildMlbVerifiedPlayerListBlock(mlbContext, question = "") {
  const pitchers = [];
  const propListed = [];
  const pitSeen = new Set();
  const propSeen = new Set();
  const pitcherListLines = [];
  for (const g of mlbContext?.games || []) {
    const homeAbbr = String(g?.homeTeam?.abbr || "?").trim();
    const awayAbbr = String(g?.awayTeam?.abbr || "?").trim();
    const homePitcher = String(g?.homeTeam?.pitcher || "").trim() || "TBD";
    const awayPitcher = String(g?.awayTeam?.pitcher || "").trim() || "TBD";
    pitcherListLines.push(`${awayAbbr} @ ${homeAbbr}: ${awayPitcher} (away) vs ${homePitcher} (home)`);

    for (const side of ["homeTeam", "awayTeam"]) {
      const pit = g?.[side]?.pitcher;
      if (pit == null) continue;
      const n = String(pit).trim();
      if (n && !pitSeen.has(n)) {
        pitSeen.add(n);
        pitchers.push(n);
      }
    }
  }
  pitchers.sort();
  for (const pl of mlbContext?.propLines || []) {
    if (!pl?.player) continue;
    const n = String(pl.player).trim();
    if (n && !propSeen.has(n)) {
      propSeen.add(n);
      propListed.push(n);
    }
  }
  propListed.sort();
  const pitcherList = pitcherListLines.length > 0 ? pitcherListLines.join("\n") : "(no games in payload)";

  const merged = mergeVerifiedNamesWithFallback(
    [...pitchers, ...propListed],
    MLB_ALWAYS_INCLUDE,
  );
  const asked = extractMentionedPersonFromQuestion(question, merged);

  return `MLB SLATE (live probables + prop board + known-star fallback):
Pitcher matchups:
${pitcherList}

Pitchers: ${pitchers.length ? pitchers.join(", ") : "(none in games array)"}
Prop-listed players: ${propListed.length ? propListed.join(", ") : "(none)"}
Known active pool (fallback): ${merged.join(", ")}
${asked ? `\nUser-mentioned player anchor: ${asked} — analyze even if not yet on tonight's prop board; say "live slate data unavailable for [player]" instead of refusing.` : ""}

FIELD RULES:
- Prefer probables and prop-listed names for "playing tonight" and posted-line questions.
- For any known MLB player the user names (including recent call-ups), give structural/form analysis even if absent from propLines — never say "not in the verified field" or refuse solely because they are missing from the list.
When a pitcher shows as "TBD", still open with park, bullpen leverage, run environment, and game state — do not lead with "starter TBD for [team]" or similar upfront caveats; reserve starter uncertainty for the closing sentence "Confirm starters before placing." Never refuse solely because starters are unsettled.`;
}

function buildNflVerifiedPlayerListBlock(nflContextEffective, question = "") {
  const live = [];
  if (nflContextEffective && typeof nflContextEffective === "object" && !Array.isArray(nflContextEffective)) {
    const ui = nflContextEffective.uiPlayers;
    if (ui && typeof ui === "object") {
      for (const k of Object.keys(ui)) {
        const t = String(k).trim();
        if (t) live.push(t);
      }
    }
  }
  const merged = mergeVerifiedNamesWithFallback(live, NFL_ALWAYS_INCLUDE).sort();
  const asked = extractMentionedPersonFromQuestion(question, merged);
  const staleNote =
    "Board names are directional when labeled offseason — treat usage/role from payload first.";
  if (merged.length === 0) {
    return `NFL PLAYER POOL NOTE: Live board is empty.
For any known NFL player in the user's question, still give role/matchup analysis — say "live usage data unavailable for [player]" instead of refusing.

${staleNote}`;
  }
  return `NFL PLAYER POOL (board + known active fallback):
${merged.join(", ")}

${staleNote}
${asked ? `\nUser-mentioned player anchor: ${asked} — analyze even if missing from the live board; never refuse as "not in verified field."` : ""}

FIELD RULES:
- Prefer board names for posted prop/usage lines.
- For any known NFL professional the user names, provide analysis even when board rows are missing — note "live usage data unavailable" rather than refusing.`;
}

function buildNflDraftProspectBlock(draftBundle) {
  const prospects = Array.isArray(draftBundle?.prospects) ? draftBundle.prospects : [];
  if (!prospects.length) {
    return `DRAFT PROSPECT ANCHORS: unavailable in active bundle.
If a user asks for a non-board name, label it "simulation-only (UDFA-range)" and do not present it as an official slot outcome.`;
  }
  const lines = prospects.map((p) => {
    const status =
      p?.boardStatus === "verified_pool"
        ? "verified_pool"
        : p?.boardStatus === "boarded"
          ? "boarded"
          : "simulation-only";
    let stats = "stats: n/a";
    if (typeof p?.nflGrade === "number" && Number.isFinite(p.nflGrade)) {
      stats = `NFL grade: ${p.nflGrade}`;
    } else if (p?.keyStats && typeof p.keyStats === "object") {
      stats = Object.entries(p.keyStats)
        .slice(0, 3)
        .map(([k, v]) => `${k}:${v}`)
        .join(" | ");
    }
    const band = p?.projectedRange ? `slot band ${p.projectedRange}` : "slot band n/a";
    const cr = p?.consensusRank != null ? `consensus #${p.consensusRank}` : "";
    return `- ${p.name} (${p.position}, ${p.school}) [${status}] — ${band}${cr ? `; ${cr}` : ""} — ${stats}`;
  });
  return `VERIFIED 2026 DRAFT PROSPECT ANCHORS:
${lines.join("\n")}

Roster-grounding rule for draft names:
- If a requested prospect is NOT in this list, you must label them exactly as "simulation-only (UDFA-range)".
- You may discuss fit hypotheticals, but you must not present them as locked pick outcomes in official board language.`;
}

function buildDraftProspectsByPositionBlock(draftBundle) {
  const prospects = Array.isArray(draftBundle?.prospects)
    ? draftBundle.prospects.filter((p) => Number(p?.projectedRound || 9) <= 4)
    : [];
  if (!prospects.length) return "(verified rounds 1-4 pool unavailable)";
  const grouped = {};
  for (const p of prospects) {
    const pos = String(p.position || "UNK").toUpperCase();
    if (!grouped[pos]) grouped[pos] = [];
    grouped[pos].push(p);
  }
  const lines = [];
  for (const pos of Object.keys(grouped).sort()) {
    const row = grouped[pos]
      .sort(
        (a, b) =>
          Number((a.consensusRank ?? a.overallRank) || 999) -
          Number((b.consensusRank ?? b.overallRank) || 999),
      )
      .slice(0, 10)
      .map((p) => `${p.name} (${p.school}) #${p.consensusRank ?? p.overallRank}`)
      .join(", ");
    lines.push(`${pos}: ${row}`);
  }
  return lines.join("\n");
}

function collectTennisVerifiedNames(players, liveMatches) {
  const set = new Set();
  for (const tour of ["atp", "wta"]) {
    const o = players?.[tour];
    if (o && typeof o === "object") {
      for (const k of Object.keys(o)) {
        const n = String(k).trim();
        if (n) set.add(n);
      }
    }
  }
  for (const m of liveMatches || []) {
    const h = String(m?.home_team || m?.raw?.home_team || m?.raw?.home || "").trim();
    const a = String(m?.away_team || m?.raw?.away_team || m?.raw?.away || "").trim();
    if (h) set.add(h);
    if (a) set.add(a);
  }
  return set;
}

function buildTennisVerifiedPlayerListBlock(players, liveMatches, question = "") {
  const live = [...collectTennisVerifiedNames(players, liveMatches)];
  const merged = mergeVerifiedNamesWithFallback(live, TENNIS_ALWAYS_INCLUDE).sort();
  const asked = extractMentionedPersonFromQuestion(question, merged);
  if (merged.length === 0) {
    return `TENNIS PLAYER POOL NOTE: Live board and database keys are empty.
For any player the user names, still give surface/form analysis — say "live draw data unavailable" instead of refusing.`;
  }
  return `TENNIS PLAYER POOL (live board + ATP/WTA keys + tour fallback):
${merged.join(", ")}
${asked ? `\nUser-mentioned player anchor: ${asked} — analyze even if not on today's live board.` : ""}

FIELD RULES:
- Prefer this list and liveMatches for draw-specific and live-match questions.
- For any top/pro tour player the user names (including recent qualifiers), provide analysis even if missing from live board — note "live draw data unavailable" rather than refusing.
- Never say a legitimate tour player is "not in the verified field."`;
}

function collectGolfVerifiedNames(golfContext) {
  return new Set(buildCombinedVerifiedGolfField(golfContext));
}

function extractGolfPlayerMentionFromQuestion(question, golfContext) {
  const q = String(question || "").trim();
  if (!q) return null;
  const field = buildCombinedVerifiedGolfField(golfContext || {});
  for (const name of field) {
    const nl = name.toLowerCase();
    if (nl.length >= 4 && q.toLowerCase().includes(nl)) return name;
    const last = normalizeGolfName(name).lastName;
    if (last && last.length >= 4 && new RegExp(`\\b${last}\\b`, "i").test(q)) return name;
  }
  const parts = q.split(/\s+/).filter((w) => w.length >= 3);
  for (let i = 0; i < parts.length - 1; i++) {
    const two = `${parts[i]} ${parts[i + 1]}`;
    if (isKnownPgaTourPlayer(two)) return two;
  }
  return null;
}

function buildGolfVerifiedPlayerListBlock(golfContext) {
  const sorted = buildCombinedVerifiedGolfField(golfContext).sort();
  const asked = extractGolfPlayerMentionFromQuestion(golfContext?.question, golfContext);
  const askedKnown =
    asked && isKnownPgaTourPlayer(asked)
      ? resolveGolfPlayerInField(asked, sorted) || asked
      : null;

  if (sorted.length === 0) {
    return `GOLF FIELD NOTE: Live leaderboard and field lists are empty in this payload.
For any known PGA Tour professional in the user's question, still provide course-fit and form analysis from season context — note "leaderboard position not yet available" instead of refusing.`;
  }

  const askedLine = askedKnown
    ? `\nUser-mentioned golfer anchor: ${askedKnown} (known PGA Tour pro — analyze even if live position is missing from feed).`
    : "";

  return `GOLF FIELD (live leaderboard + rankings + odds field + major-championship fallback):
${sorted.join(", ")}
${askedLine}

FIELD RULES:
- Prefer this list for live position, cut-line, and "who's leading" questions.
- For prop / top-20 / matchup questions about any known PGA Tour professional (including names in the user's question), provide analysis even when live leaderboard rows are missing — say "leaderboard position not yet available" rather than refusing.
- Never tell the user a legitimate PGA Tour pro is "not in the field" or "not in the verified field."`;
}

function buildF1VerifiedDriverListBlock(f1Context, question = "") {
  const live = [];
  for (const row of f1Context?.standings || []) {
    const n = String(row?.full_name || "").trim();
    if (n) live.push(n);
  }
  const merged = mergeVerifiedNamesWithFallback(live, F1_ALWAYS_INCLUDE).sort();
  const asked = extractMentionedPersonFromQuestion(question, merged);
  if (merged.length === 0) {
    return `F1 DRIVER POOL NOTE: Standings payload is empty.
For any F1 driver the user names, still give weekend/form analysis — say "live standings data unavailable" instead of refusing.`;
  }
  return `F1 DRIVER POOL (standings + grid fallback):
${merged.join(", ")}
${asked ? `\nUser-mentioned driver anchor: ${asked} — analyze even if missing from standings (e.g. reserve/sub).` : ""}

FIELD RULES:
- Prefer standings/session fields for grid-position questions.
- For any F1 driver the user names (including reserves/replacements), provide analysis even when standings rows are missing — note "live standings data unavailable" rather than refusing.
- Never say a legitimate F1 driver is "not in the verified field."`;
}

function golfClientCourseArtifactsMisaligned(g) {
  if (!g || typeof g !== "object") return false;
  const beforeStats = Array.isArray(g.courseStats) ? g.courseStats.length : 0;
  const stripped = stripMisalignedGolfCourseArtifacts(g);
  const afterStats = Array.isArray(stripped.courseStats) ? stripped.courseStats.length : 0;
  if (beforeStats > 0 && afterStats === 0) return true;
  const beforeCourse =
    g.course && typeof g.course === "object"
      ? String(g.course.name || "").trim()
      : String(g.course || "").trim();
  const afterCourse =
    stripped.course && typeof stripped.course === "object"
      ? String(stripped.course.name || "").trim()
      : String(stripped.course || "").trim();
  return Boolean(beforeCourse && afterCourse && beforeCourse !== afterCourse);
}

/** Same slim shape as client `buildGolfContext` (App.jsx) — keeps model JSON aligned with the browser path. */
function slimUnifiedGolfBoardForUrTake(board, questionText) {
  const g = stripMisalignedGolfCourseArtifacts(
    board && typeof board === "object" ? board : null,
  );
  if (!g) return null;
  const primary = resolveGolfPrimaryEvent(g);
  const lb = (rows) => (Array.isArray(rows) ? rows.slice(0, 48) : []);
  const slimTournament = (t) => {
    if (!t || typeof t !== "object") return null;
    return {
      name: t.name ?? null,
      shortName: t.shortName ?? null,
      state: t.state ?? null,
      round: t.round ?? null,
      venue: t.venue ?? null,
      leaderboard: lb(t.leaderboard),
    };
  };
  return {
    currentEvent: primary
      ? {
          name: primary.name || null,
          shortName: primary.shortName || null,
          course: primary.course || primary.courseName || null,
          location: primary.location || null,
          round: primary.round || null,
          state: primary.state || null,
          leaderboard: lb(primary.leaderboard || g.currentEvent?.leaderboard),
        }
      : null,
    tournament: slimTournament(g.tournament),
    course: g.course || null,
    rankings: (g.rankings || []).slice(0, 12),
    odds: {
      outrights: (g.odds?.outrights || []).slice(
        0,
        g.odds?.hasPostedLines ? 48 : 16,
      ),
      topFinish:
        g.odds?.topFinish && typeof g.odds.topFinish === "object"
          ? Object.fromEntries(Object.entries(g.odds.topFinish).slice(0, 24))
          : {},
      makeCut:
        g.odds?.makeCut && typeof g.odds.makeCut === "object"
          ? Object.fromEntries(Object.entries(g.odds.makeCut).slice(0, 24))
          : {},
      linesUnavailable: Boolean(g.odds?.linesUnavailable),
      hasPostedLines: Boolean(
        g.odds?.hasPostedLines ||
          (g.odds?.outrights || []).some(
            (o) => o?.odds != null && Number.isFinite(Number(o.odds)),
          ),
      ),
      fetchedAt: g.odds?.fetchedAt || null,
      freshness: g.odds?.freshness || null,
      source: g.odds?.source || null,
    },
    recentResults: (g.recentResults || []).slice(0, 10),
    courseStats: (g.courseStats || []).slice(0, 8),
    fieldRoster: Array.isArray(g.fieldRoster) ? g.fieldRoster.slice(0, 120) : [],
    question: questionText || "",
    questionEventAlignment: g.questionEventAlignment || null,
  };
}

function resolveGolfQuestionAlignmentArg(golfContextEffective) {
  const align = golfContextEffective?.questionEventAlignment;
  if (!align?.requestedLabel || !align?.requestedSlug) return align ?? null;
  const ce = golfContextEffective?.currentEvent;
  if (
    ce &&
    golfLabelsMatchIntent(ce.name, ce.shortName, {
      slug: align.requestedSlug,
      label: align.requestedLabel,
    })
  ) {
    return null;
  }
  return align;
}

function buildGolfQuestionAlignmentPromptBlock(alignment, currentEvent) {
  if (!alignment?.requestedLabel) return "";
  const slug = alignment.requestedSlug || "";
  const forbidden = GOLF_INTENT_WRONG_COURSE_FRAGMENTS[slug] || [];
  const forbiddenLine = forbidden.length
    ? `- FORBIDDEN VENUES for this question (do not name or describe): ${forbidden.join(", ")}.`
    : "";
  const course = String(currentEvent?.course || "").trim();
  const courseLine =
    course && course !== "TBD"
      ? `- Verified course for this event in payload: ${course}. Cite only this venue.`
      : `- currentEvent.course is TBD — do NOT invent or recall a course name from memory; describe tournament/setup only from leaderboard and odds in the payload.`;

  const prevName = String(alignment.previousFeedEvent || "").trim();
  const requested = String(alignment.requestedLabel || "").trim();
  const realigned = prevName.length > 0 && prevName !== requested;

  if (realigned) {
    const prev = ` The live-feed default week was "${alignment.previousFeedEvent}" — ignore that event entirely.`;
    return `
QUESTION EVENT ALIGNMENT (mandatory):
The user asked about "${alignment.requestedLabel}".${prev}
- Ground every answer in currentEvent for "${alignment.requestedLabel}" only.
- If currentEvent.state is pre/upcoming or leaderboard is empty: treat as pre-tournament — do NOT cite live scores, positions, or course conditions from any other PGA Tour week.
${courseLine}
${forbiddenLine}`;
  }

  const minimal = [courseLine, forbiddenLine].filter(Boolean).join("\n");
  if (!minimal) return "";
  return `\n${minimal}\n`;
}

function golfClientContextLooksUsable(g) {
  if (!g || typeof g !== "object") return false;
  if (String(g.currentEvent?.name || "").trim()) return true;
  if (Array.isArray(g.currentEvent?.leaderboard) && g.currentEvent.leaderboard.length > 0) return true;
  if (
    Array.isArray(g.odds?.outrights) &&
    g.odds.outrights.some((o) => o?.odds != null && Number.isFinite(Number(o.odds)))
  ) {
    return true;
  }
  if (String(g.tournament?.name || "").trim()) return true;
  return false;
}

function buildMessagesForAnthropic({ userPrompt, history, intent, hasImage, image }) {
  const prior = intent === "slip_review" ? [] : normalizeIncomingChatHistory(history);

  if (hasImage) {
    const content = [];
    let textBlock = userPrompt;
    if (prior.length) {
      const transcript = prior
        .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
        .join("\n\n");
      textBlock = `Prior conversation (most recent last):\n${transcript}\n\n---\n\nCurrent message:\n${userPrompt}`;
    }
    content.push({ type: "text", text: textBlock });
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: image.mediaType,
        data: image.base64,
      },
    });
    return [{ role: "user", content }];
  }

  return [...prior, { role: "user", content: userPrompt }];
}

/**
 * Dev-only audit log for NBA UR Take grounding (no images, no raw user text).
 * Enable with UR_TAKE_NBA_AUDIT_LOG=1 in the API environment.
 * @param {Record<string, unknown>} payload
 */
function logNbaUrTakeAuditIfDev(payload) {
  if (String(process.env.UR_TAKE_NBA_AUDIT_LOG ?? "").trim() !== "1") return;
  try {
    console.log(JSON.stringify({ event: "ur_take_nba_audit", ...payload }));
  } catch {
    // ignore logging failures
  }
}

/** Production-safe: always log when `/api/ur-take` returns a generic feed snag (no env gates). */
function logUrTakeApiFallback(payload) {
  const raw = payload.rawModelText != null ? String(payload.rawModelText) : "";
  console.error("[urTakeApiFallback]", {
    requestId: payload.requestId ?? null,
    fallbackReason: payload.fallbackReason,
    sport: payload.sport ?? null,
    providerStatus: payload.providerStatus ?? null,
    providerErrorName: payload.providerErrorName ?? null,
    providerErrorMessage: payload.providerErrorMessage ?? null,
    parseErrorMessage: payload.parseErrorMessage ?? null,
    validationErrors: payload.validationErrors ?? null,
    responseKeys: payload.responseKeys ?? null,
    structuredKeys: payload.structuredKeys ?? null,
    rawModelTextPresent: Boolean(raw.length),
    rawModelTextLength: raw.length,
    questionLength: typeof payload.questionLength === "number" ? payload.questionLength : 0,
    parsedKeys: payload.parsedKeys ?? null,
    stack: payload.stack,
    authReason: payload.authReason ?? null,
    sanitizeCode: payload.sanitizeCode ?? null,
    sanitizeError: payload.sanitizeError ?? null,
    extra: payload.extra,
  });
}

// ── Main Handler ────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const requestStart = Date.now();
  let nbaBoardBuildMs = 0;
  let anthropicMs = 0;
  let haikuFollowUpsMs = 0;
  if (!applyCors(req, res, { methods: "POST, OPTIONS" })) return;
  if (req.method === "OPTIONS") return res.status(200).end();

  const requestId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : `rq${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  console.log(
    JSON.stringify({
      tag: "[urTakeRequest]",
      requestId,
      event: "ur_take_request_start",
      contentLength: Number(req.headers["content-length"]) || null,
    }),
  );

  const feedSnagResponse = (sportVal, fallbackReason, logCtx = {}) => {
    const text =
      "The feed hit a snag on that one — try rephrasing or ask about a specific player or matchup and I'll work with what's available.";
    const reason =
      typeof fallbackReason === "string" && fallbackReason.trim()
        ? fallbackReason.trim()
        : "unknown_server_fallback";
    const sportOut = sportVal || "unknown";
    const q = String(logCtx.question ?? req.body?.question ?? "");
    const rawModelText =
      logCtx.rawModelText != null
        ? String(logCtx.rawModelText)
        : logCtx.rawModelTextSlice != null
          ? String(logCtx.rawModelTextSlice)
          : "";
    logUrTakeApiFallback({
      requestId,
      fallbackReason: reason,
      sport: sportOut,
      providerStatus: logCtx.providerStatus ?? null,
      providerErrorName: logCtx.providerErrorName ?? null,
      providerErrorMessage: logCtx.providerErrorMessage ?? null,
      parseErrorMessage: logCtx.parseErrorMessage ?? null,
      validationErrors: logCtx.validationErrors ?? null,
      responseKeys: ["requestId", "response", "take", "confidence", "sport", "fallback", "fallbackReason"],
      structuredKeys: logCtx.structuredKeys ?? null,
      rawModelText,
      questionLength: q.length,
      parsedKeys: logCtx.parsedKeys ?? null,
      stack: logCtx.err?.stack ? String(logCtx.err.stack).slice(0, 2000) : undefined,
      authReason: logCtx.authReason ?? null,
      sanitizeCode: logCtx.sanitizeCode ?? null,
      sanitizeError: logCtx.sanitizeError ?? null,
      extra: logCtx.extra,
    });
    return res.status(200).json({
      requestId,
      response: text,
      take: text,
      confidence: "none",
      sport: sportOut,
      fallback: true,
      fallbackReason: reason,
    });
  };

  if (req.method !== "POST") {
    return feedSnagResponse(null, "http_method_not_post");
  }

  const dailyTakePipeline =
    Boolean(process.env.CRON_SECRET) &&
    String(req.headers["x-daily-take-internal"] ?? "").trim() === "1" &&
    req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`;

  const clientIp = getClientIp(req);
  if (!dailyTakePipeline && !allowRateLimit(`urtake:ip:${clientIp}`, ipLimit())) {
    return feedSnagResponse(null, "ip_rate_limited");
  }

  /** @type {{ ok: true, email: string | null, tier: string } | { ok: false, reason: string } | null} */
  let urAuth = null;
  if (dailyTakePipeline) {
    urAuth = { ok: true, email: null, tier: "pro" };
  } else if (shouldRequireUrTakeAuth()) {
    urAuth = verifyBearerForUrTake(req.headers.authorization);
    if (!urAuth.ok) {
      if (urAuth.reason === "server_misconfigured") {
        return feedSnagResponse(null, "auth_server_misconfigured");
      }
      return feedSnagResponse(null, "auth_verify_failed", { authReason: urAuth.reason });
    }
    if (urAuth.email && !allowRateLimit(`urtake:email:${urAuth.email}`, emailLimit())) {
      return feedSnagResponse(null, "email_rate_limited", {
        extra: { emailDomain: String(urAuth.email).split("@")[1] || "" },
      });
    }
  }

  const sanitized = sanitizeUrTakeBody(req.body);
  if (!sanitized.ok) {
    const hint =
      req.body && typeof req.body === "object" && req.body !== null && "sportHint" in req.body
        ? /** @type {{ sportHint?: string }} */ (req.body).sportHint
        : null;
    const sportForSnag =
      typeof hint === "string" && hint.trim() ? hint.trim() : null;
    return feedSnagResponse(sportForSnag, `request_body_${String(sanitized.code || "invalid")}`, {
      sanitizeCode: sanitized.code ?? null,
      sanitizeError: sanitized.error ?? null,
    });
  }
  req.body = sanitized.body;

  if (urAuth?.ok && urAuth.email) {
    req.body.userEmail = urAuth.email;
  }

  const userTier = urAuth?.tier ?? "free";
  const isPro = ["pro", "owner", "friend"].includes(userTier);

  const ANTHROPIC_API_KEY = getEnv("ANTHROPIC_API_KEY");
  const ANTHROPIC_MODEL = getEnv("ANTHROPIC_MODEL") || "claude-sonnet-4-20250514";

  if (!ANTHROPIC_API_KEY) {
    return feedSnagResponse(
      typeof req.body?.sportHint === "string" && req.body.sportHint.trim()
        ? req.body.sportHint.trim()
        : null,
      "missing_provider_key",
    );
  }

  // Structured redesign: ON by default when client opts in (structured:true).
  // Set STRUCTURED_UR_TAKE_MODE=0 (or false/off) on the server to disable without redeploying the client.
  const structuredUrTakeGloballyDisabled = (() => {
    const v = String(process.env.STRUCTURED_UR_TAKE_MODE ?? "")
      .trim()
      .toLowerCase();
    return v === "0" || v === "false" || v === "off" || v === "no";
  })();
  /** Backup opt-in if JSON body loses `structured` in transit (proxy/middleware). Browser sends `X-UR-Take-Structured: 1`. */
  const structuredHeaderRequested =
    String(req.headers["x-ur-take-structured"] ?? "").trim() === "1";
  /** Immutable for the whole request — never flip false on parse failure or QA loses structured instructions on retry. */
  const structuredModeRequested =
    !structuredUrTakeGloballyDisabled &&
    (req.query?.structured === "true" ||
      req.body?.structured === true ||
      structuredHeaderRequested);

  const {
    question,
    userEmail,
    sportHint: incomingSportHint,
    teamHint,
    players,
    context,
    liveMatches,
    golfContext,
    nbaContext: nbaContextFromClient,
    mlbContext: mlbContextFromClient,
    f1Context: f1ContextFromClient,
    nflContext,
    matchupContext,
    image,
    history: incomingHistory,
    wcEventId: incomingWcEventId,
  } = req.body || {};
  const bettingStyle =
    req.body?.bettingStyle === "limits"
      ? "limits"
      : "balanced";

  const normalizedUrTakeHistoryForGate = normalizeIncomingChatHistory(incomingHistory);
  const isConversationFollowUp = normalizedUrTakeHistoryForGate.length > 1;

  if (!question || !String(question).trim()) {
    return feedSnagResponse(
      typeof incomingSportHint === "string" && incomingSportHint.trim()
        ? incomingSportHint.trim()
        : null,
      "empty_question",
    );
  }

  const hasImage = !!image?.base64;

  const intent = detectIntent(question, hasImage);
  const chaseSignals = detectChaseSignals(question, incomingHistory);
  const shortMarketFollowUp = isShortMarketFollowUp(question);
  const hasLiveTranscriptContext = hasRecentLiveScreenshotContext(incomingHistory);
  if (chaseSignals.isChase) {
    console.log(
      JSON.stringify({
        event: "chase_detected",
        userEmail: userEmail || "anonymous",
        sameTopicCount: chaseSignals.sameTopicCount,
        hasChaseLanguage: chaseSignals.hasChaseLanguage,
        hasHedgingPanicLanguage: chaseSignals.hasHedgingPanicLanguage,
        question: String(question).slice(0, 200),
        ts: new Date().toISOString(),
      }),
    );
  }
  const liveKeywordSignals = detectLiveGameSignals(question, hasImage);

  const uiSportHintForRouting =
    typeof incomingSportHint === "string" && incomingSportHint.trim()
      ? incomingSportHint.trim()
      : null;

  let sportHint = resolveSportHint({
    incomingSportHint,
    question,
    matchupContext,
    hasImage,
    golfContext,
    chatHistory: incomingHistory,
  });

  const sportSwitched = sportsContextSwitched(uiSportHintForRouting, sportHint);
  if (sportSwitched) {
    console.log(
      JSON.stringify({
        event: "ur_take_sport_context_switch",
        from: uiSportHintForRouting,
        to: sportHint,
        questionHead: String(question || "").slice(0, 120),
      }),
    );
  }
  const firstSessionNoHistory = !Array.isArray(incomingHistory) || incomingHistory.length === 0;
  let firstSessionGuaranteeFeature = null;
  let preloadedNbaBoard = null;
  if (firstSessionNoHistory && (sportHint === "generic" || sportHint === "image_review")) {
    try {
      const fresh = await buildNbaUrTakeBoard(String(question || ""));
      const featured = selectTopNbaSlateGameForGuarantee(fresh);
      if (featured?.game) {
        preloadedNbaBoard = fresh;
        firstSessionGuaranteeFeature = featured;
        sportHint = "nba";
      }
    } catch (err) {
      console.warn("[ur-take] first-session guarantee board load failed:", err?.message || err);
    }
  }
  if (
    (sportHint === "generic" || sportHint === "image_review") &&
    questionMentionsWorldCup(question)
  ) {
    sportHint = "worldcup";
  }

  const detectedSport = sportHint;
  console.log("[ur-take] request:", {
    sport: detectedSport,
    questionSlice: question?.slice(0, 80),
  });
  const nbaDebugEnabled = isTruthyFlag(getEnv("UR_TAKE_NBA_DEBUG"));

  /** Server-authoritative slate — drop stale client payloads when UI sport ≠ routed sport. */
  let nbaContext =
    sportSwitched && sportHint !== "nba" ? null : nbaContextFromClient;
  let mlbContext =
    sportSwitched && sportHint !== "mlb" ? null : mlbContextFromClient;
  let golfContextEffective =
    sportSwitched && sportHint !== "golf" ? null : golfContext;
  let f1Context =
    sportSwitched && sportHint !== "f1" ? null : f1ContextFromClient;
  let wcContext = null;
  /** @type {{ wcIntent: string | null, mentionedTeams: string[], requiredEntities: string[], knockoutRulesInjected: boolean, structuralEdgeInjected: boolean, playerPropDetected: boolean, wcEventId: string | null, qaEntityMatch: string | null, qaIntentMatch: string | null, qaPlayerMatch: string | null }} */
  const wcRelevanceLog = {
    wcIntent: null,
    mentionedTeams: [],
    requiredEntities: [],
    knockoutRulesInjected: false,
    structuralEdgeInjected: false,
    playerPropDetected: false,
    playerMarketTier: null,
    wcEventId: null,
    qaEntityMatch: null,
    qaIntentMatch: null,
    qaPlayerMatch: null,
  };
  let nbaRelevanceMustFetch = null;
  let nbaRelevanceServerBoardFetched = false;
  let nbaRelevanceClientContextUsable = null;
  let nbaLiveBoardRefreshForced = false;
  let nbaClientContextIgnored = false;
  let nbaFinalsOutrightsBlock = null;
  let nbaFinalsContextBlock = null;
  /** @type {{ finalsMode: boolean, seriesState: object | null }} */
  let nbaFinalsModeMeta = { finalsMode: false, seriesState: null };
  /** @type {{ outrightsInjected: boolean, seriesStale: boolean, mvpStale: boolean, seriesAgeMinutes: number | null, mvpAgeMinutes: number | null } | null} */
  let nbaFinalsOutrightsMeta = null;
  let wcIntent = null;
  let wcRequiredEntities = [];
  let wcForbiddenEntities = [];
  /** @type {Record<string, string>} */
  let wcStrengthTags = {};
  if (sportHint === "worldcup" || questionMentionsWorldCup(question)) {
    if (sportHint !== "worldcup") sportHint = "worldcup";
    wcIntent = classifyWcQuestionIntent(String(question || ""), incomingHistory);
    wcRequiredEntities = resolveRequiredEntities(String(question || ""), incomingHistory, wcIntent);
    wcRelevanceLog.wcIntent = wcIntent;
    wcRelevanceLog.mentionedTeams = extractMentionedWcTeams(String(question || ""));
    wcRelevanceLog.requiredEntities = wcRequiredEntities;
    wcRelevanceLog.knockoutRulesInjected = shouldInjectStaticRules(String(question || ""), wcIntent);
    wcRelevanceLog.playerPropDetected = isWcPlayerMarketIntent(wcIntent);
    wcRelevanceLog.playerMarketTier = wcContext?.playerMarketTier || null;
    const wcEventIdTrimmed =
      incomingWcEventId != null && String(incomingWcEventId).trim()
        ? String(incomingWcEventId).trim()
        : null;
    wcRelevanceLog.wcEventId = wcEventIdTrimmed;
    const sessionEntities = extractSessionWcEntities(incomingHistory);
    const reqSet = new Set(wcRequiredEntities);
    wcForbiddenEntities = sessionEntities.filter((e) => !reqSet.has(e));
    try {
      wcContext = await buildWorldCupUrTakeContext(String(question || ""), {
        wcIntent,
        requiredEntities: wcRequiredEntities,
        injectStaticRules: wcRelevanceLog.knockoutRulesInjected,
        wcEventId: wcEventIdTrimmed,
      });
    } catch (err) {
      console.warn("[ur-take] buildWorldCupUrTakeContext failed:", err?.message || err);
    }
    wcStrengthTags = getWcTeamStrengthTags(wcContext?.groups, wcRequiredEntities);
  }
  let effectiveStructuredModeRequested = structuredModeRequested;
  if (sportHint === "worldcup" && wcIntent === WC_INTENT.RULES) {
    effectiveStructuredModeRequested = false;
  }
  if (sportHint === "nba") {
    const liveBoardRefreshForced = nbaRequiresLiveUrTakeBoardRefresh(
      nbaContextFromClient || nbaContext,
      String(question || ""),
    );
    nbaLiveBoardRefreshForced = liveBoardRefreshForced;
    const mustFetchNbaBoard =
      sportSwitched ||
      liveBoardRefreshForced ||
      !nbaUrTakeContextHasUsableData(nbaContext);
    nbaRelevanceMustFetch = mustFetchNbaBoard;
    nbaRelevanceClientContextUsable = liveBoardRefreshForced
      ? false
      : nbaUrTakeContextHasUsableData(nbaContextFromClient);
    try {
      const nbaT0 = Date.now();
      let fresh = null;
      if (mustFetchNbaBoard) {
        const usePreloaded =
          !liveBoardRefreshForced && preloadedNbaBoard && !sportSwitched;
        fresh =
          (usePreloaded ? preloadedNbaBoard : null) ||
          (await buildNbaUrTakeBoard(String(question || "")));
        if (!nbaBoardHasPostedPropMarkets(fresh)) {
          fresh = await hydrateNbaPropsOdds(fresh);
        }
      }
      if (!fresh && mustFetchNbaBoard) {
        console.warn(
          JSON.stringify({
            event: "ur_take_nba_board_empty_after_fetch",
            sportSwitched,
            questionHead: String(question || "").slice(0, 120),
          }),
        );
      }
      if (fresh) {
        nbaRelevanceServerBoardFetched = true;
        const probeGameId =
          fresh?.todaysGames?.find((g) => g?.actionNetworkGameId)?.actionNetworkGameId ??
          fresh?.sourceMeta?.propsOddsGameId ??
          null;
        const kvProbe = probeGameId != null ? await getNbaPropsForBoard(probeGameId) : null;
        console.log(
          JSON.stringify({
            event: "ur_take_nba_props_kv_probe",
            gameId: probeGameId,
            kvHit: Boolean(kvProbe),
            hasPostedLines: Boolean(kvProbe?.hasPostedLines),
            playerCount: kvProbe?.playerCount ?? 0,
            boardHasPropsOdds: Boolean(fresh?.propsOdds),
            boardHasPostedLines: Boolean(fresh?.propsOdds?.hasPostedLines),
            boardPropLinesCount: Array.isArray(fresh?.propLines) ? fresh.propLines.length : 0,
            boardTodaysGamesCount: Array.isArray(fresh?.todaysGames) ? fresh.todaysGames.length : 0,
            hydrateCalled: mustFetchNbaBoard,
            sportSwitched,
          }),
        );
        nbaBoardBuildMs = Date.now() - nbaT0;
        nbaClientContextIgnored = liveBoardRefreshForced;
        nbaContext = {
          ...fresh,
          question: String(question || ""),
          clientUiSurface: liveBoardRefreshForced
            ? fresh.clientUiSurface
            : (nbaContextFromClient?.clientUiSurface ?? fresh.clientUiSurface),
        };
        nbaContext.rosterGrounding = augmentNbaRosterGroundingWithUi(
          nbaContext.rosterGrounding,
          nbaContext.todaysGames || [],
        );
        if (
          !sportSwitched &&
          nbaContextFromClient &&
          typeof nbaContextFromClient === "object" &&
          Array.isArray(nbaContextFromClient.injuries) &&
          nbaContextFromClient.injuries.length > 0
        ) {
          const merged = new Map();
          for (const row of nbaContext.injuries || []) {
            const k = String(row?.player || "").trim().toLowerCase();
            if (k) merged.set(k, row);
          }
          for (const row of nbaContextFromClient.injuries) {
            const k = String(row?.player || "").trim().toLowerCase();
            if (k) merged.set(k, row);
          }
          nbaContext = { ...nbaContext, injuries: [...merged.values()] };
        }
      }
    } catch (err) {
      console.warn("[ur-take] buildNbaUrTakeBoard failed:", err?.message || err);
      if (!sportSwitched && !liveBoardRefreshForced) {
        nbaContext = nbaContextFromClient;
      }
    }
    if (
      !sportSwitched &&
      !liveBoardRefreshForced &&
      isConversationFollowUp &&
      nbaContextFromClient &&
      typeof nbaContextFromClient === "object"
    ) {
      const c = nbaContextFromClient;
      const overlays = {};
      const serverPlayoffSeries = Array.isArray(nbaContext?.playoffSeries) ? nbaContext.playoffSeries : [];
      if (
        serverPlayoffSeries.length === 0 &&
        Array.isArray(c.playoffSeries) &&
        c.playoffSeries.length > 0
      ) {
        overlays.playoffSeries = c.playoffSeries;
      }
      if (Array.isArray(c.injuries) && c.injuries.length > 0) {
        overlays.injuries = c.injuries;
      }
      if (Object.keys(overlays).length > 0) {
        nbaContext = { ...nbaContext, ...overlays };
      }
      const cPbt = c.rosterGrounding?.playersByTeamAbbrev;
      if (cPbt && typeof cPbt === "object" && !Array.isArray(cPbt) && Object.keys(cPbt).length > 0) {
        const sRg = nbaContext.rosterGrounding;
        const sPbt = (sRg && sRg.playersByTeamAbbrev) || {};
        const mergedPbt = { ...sPbt };
        for (const [k, val] of Object.entries(cPbt)) {
          if (!Array.isArray(val) || !val.length) continue;
          const key = String(k).toUpperCase();
          const prev = mergedPbt[key];
          if (!Array.isArray(prev) || !prev.length) {
            mergedPbt[key] = val.slice();
          } else {
            const seen = new Set(prev.map((n) => String(n).toLowerCase()));
            const add = prev.slice();
            for (const n of val) {
              const nm = String(n || "").trim();
              if (nm && !seen.has(nm.toLowerCase())) {
                seen.add(nm.toLowerCase());
                add.push(nm);
              }
            }
            mergedPbt[key] = add;
          }
        }
        nbaContext = {
          ...nbaContext,
          rosterGrounding: {
            ...(sRg && typeof sRg === "object" ? sRg : {}),
            playersByTeamAbbrev: mergedPbt,
          },
        };
      }
    }
    const nbaIntentForOutrights = classifyNbaQuestionIntent(
      String(question || ""),
      incomingHistory,
    );
    const nbaMatchupProbe =
      resolveNbaMatchupFromQuestion(String(question || ""), nbaContext || {}) || null;
    const finalsCtxProbe = resolveNbaFinalsUrTakeContext({
      nbaContext,
      nbaMatchup: nbaMatchupProbe,
      question: String(question || ""),
      nbaIntent: nbaIntentForOutrights,
    });
    nbaFinalsModeMeta = {
      finalsMode: finalsCtxProbe.finalsMode,
      seriesState: finalsCtxProbe.seriesState,
    };
    nbaFinalsContextBlock = finalsCtxProbe.contextBlock;

    const needsOutrights =
      finalsCtxProbe.finalsMode ||
      nbaIntentForOutrights === NBA_INTENT.SERIES_WINNER ||
      nbaIntentForOutrights === NBA_INTENT.FINALS_MVP;

    if (needsOutrights) {
      const requiredEntities = resolveRequiredNbaEntities(
        String(question || ""),
        incomingHistory,
        nbaIntentForOutrights,
      );
      const [seriesKv, mvpKv] = await Promise.all([
        readNbaFinalsSeriesFromKv(),
        readNbaFinalsMvpFromKv(),
      ]);
      nbaFinalsOutrightsBlock = formatNbaOutrightsForPrompt({
        nbaIntent: nbaIntentForOutrights,
        question: String(question || ""),
        requiredEntities,
        seriesKv,
        mvpKv,
      });
      nbaFinalsOutrightsMeta = {
        outrightsInjected: nbaOutrightsInjectedForContext(seriesKv, mvpKv),
        seriesStale: Boolean(seriesKv?.stale),
        mvpStale: Boolean(mvpKv?.stale),
        seriesAgeMinutes: seriesKv?.freshness?.ageMinutes ?? null,
        mvpAgeMinutes: mvpKv?.freshness?.ageMinutes ?? null,
      };
      if (nbaContext) {
        nbaContext = {
          ...nbaContext,
          finalsMode: finalsCtxProbe.finalsMode,
          finalsSeriesState: finalsCtxProbe.seriesState,
          ...(nbaFinalsOutrightsBlock
            ? {
                finalsOutrightsBlock: nbaFinalsOutrightsBlock,
                finalsOutrights: { series: seriesKv, mvp: mvpKv },
              }
            : {}),
        };
      }
    } else if (nbaContext && finalsCtxProbe.finalsMode) {
      nbaContext = {
        ...nbaContext,
        finalsMode: true,
        finalsSeriesState: finalsCtxProbe.seriesState,
      };
    }
  }

  if (sportHint === "mlb") {
    try {
      const freshMlb = await buildMlbUrTakeBoard(String(question || ""));
      if (
        freshMlb &&
        (sportSwitched ||
          (Array.isArray(freshMlb.propLines) && freshMlb.propLines.length > 0) ||
          Object.keys(freshMlb.gameTotals || {}).length > 0)
      ) {
        mlbContext = {
          ...(mlbContext && typeof mlbContext === "object" ? mlbContext : {}),
          ...freshMlb,
          question: String(question || ""),
        };
      }
    } catch (e) {
      console.warn("[ur-take] MLB board refresh failed, using client context", e?.message || e);
    }
  }

  if (sportHint === "golf") {
    const clientGolfRaw = golfContext && typeof golfContext === "object" ? golfContext : null;
    const clientGolf = clientGolfRaw
      ? stripMisalignedGolfCourseArtifacts(clientGolfRaw)
      : null;
    if (clientGolf) golfContextEffective = clientGolf;
    const questionStr = String(question || "");
    const intent = extractGolfTournamentIntentFromQuestion(questionStr);
    const needsQuestionAlign = golfQuestionNeedsEventRealign(clientGolf, questionStr);
    const needsHydrate = sportSwitched || !golfClientContextLooksUsable(clientGolf);
    const needsCourseArtifactAlign = golfClientCourseArtifactsMisaligned(clientGolfRaw);

    if (intent || needsQuestionAlign || needsHydrate || needsCourseArtifactAlign) {
      try {
        const board = await getUnifiedGolfBoard();
        const aligned = intent
          ? await alignGolfBoardToQuestion(board, questionStr)
          : needsQuestionAlign
            ? await alignGolfBoardToQuestion(board, questionStr)
            : board;
        const slim = slimUnifiedGolfBoardForUrTake(aligned, questionStr);
        if (slim && golfClientContextLooksUsable(slim)) {
          golfContextEffective = slim;
          console.log(
            JSON.stringify({
              tag: "[urTakeGolfHydrate]",
              requestId,
              event: intent
                ? "golf_context_question_aligned"
                : needsQuestionAlign
                  ? "golf_context_question_aligned"
                  : "golf_context_server_hydrated",
              alignment: slim.questionEventAlignment || undefined,
              course: slim.currentEvent?.course || null,
            }),
          );
        }
      } catch (e) {
        console.warn("[ur-take] server golf board hydrate failed:", e?.message || e);
      }
    }
  }

  if (sportHint === "nba" && nbaContext && !nbaContext.newsImpact) {
    nbaContext.newsImpact = buildNbaNewsImpact(nbaContext);
  }

  if (sportHint === "f1") {
    const hasNbaNoise =
      nbaContextFromClient &&
      typeof nbaContextFromClient === "object" &&
      ((Array.isArray(nbaContextFromClient.todaysGames) &&
        nbaContextFromClient.todaysGames.length > 0) ||
        (Array.isArray(nbaContextFromClient.playerStats) &&
          nbaContextFromClient.playerStats.length > 0));
    if (hasNbaNoise) {
      console.log(
        JSON.stringify({
          event: "wrong_sport_context_payload",
          requestedSport: incomingSportHint ?? null,
          resolvedSportHint: sportHint,
          resolvedContextSport: "f1",
          wrongSportContextDetected: true,
        }),
      );
    }
    try {
      const serverF1 = await buildF1UrTakeContext({ question: String(question || "") });
      const sources = serverF1?.urTakeAssembly?.sources || ["server_openf1"];
      f1Context = {
        ...(typeof f1ContextFromClient === "object" && f1ContextFromClient ? f1ContextFromClient : {}),
        ...serverF1,
      };
      console.log(
        JSON.stringify({
          event: "sport_context_route",
          requestedSport: incomingSportHint ?? null,
          resolvedSportHint: sportHint,
          resolvedContextSport: "f1",
          contextSourcesUsed: sources,
          wrongSportContextDetected: Boolean(hasNbaNoise),
        }),
      );
    } catch (err) {
      console.warn("[ur-take] buildF1UrTakeContext failed:", err?.message || err);
      f1Context =
        typeof f1ContextFromClient === "object" && f1ContextFromClient ? f1ContextFromClient : {};
    }
  }

  const oddsAvailable = resolveOddsAvailabilityForSport({
    sportHint,
    nbaContext,
    mlbContext,
    golfContext: golfContextEffective,
    f1Context,
    nflContext,
    liveMatches,
    context,
  });
  if (sportHint === "nba" && nbaContext && typeof nbaContext === "object") {
    nbaContext = { ...nbaContext, oddsAvailable };
  }
  if (sportHint === "mlb" && mlbContext && typeof mlbContext === "object") {
    mlbContext = { ...mlbContext, oddsAvailable };
  }
  if (sportHint === "mlb") {
    console.log("[ur-take] MLB context audit", {
      propLinesCount: Array.isArray(mlbContext?.propLines) ? mlbContext.propLines.length : 0,
      gameTotalsCount: Object.keys(mlbContext?.gameTotals ?? {}).length,
      gamesCount: Array.isArray(mlbContext?.games) ? mlbContext.games.length : 0,
      source: mlbContext?.primarySource ?? "unknown",
    });
  }
  if (sportHint === "golf" && golfContextEffective && typeof golfContextEffective === "object") {
    golfContextEffective = { ...golfContextEffective, oddsAvailable };
  }
  if (sportHint === "f1" && f1Context && typeof f1Context === "object") {
    f1Context.oddsAvailable = oddsAvailable;
  }
  if (sportHint === "nfl" && nflContext && typeof nflContext === "object") {
    nflContext.oddsAvailable = oddsAvailable;
  }
  if (!oddsAvailable) {
    console.warn(
      `[odds] unavailable — running without lines (sport=${String(sportHint || "unknown")}; server log only, not shown to model)`,
    );
  }

  const nbaNewsImpact = sportHint === "nba" ? nbaContext?.newsImpact || null : null;
  const nbaInvalidation =
    sportHint === "nba"
      ? applyNbaMarketInvalidation({
          question,
          board: nbaContext || {},
          newsImpact: nbaNewsImpact,
        })
      : {
          decisionMode: "normal",
          blocked: false,
          unresolved: false,
          targetedPlayer: null,
          statusClass: "unknown",
          statusDisplay: "",
          team: null,
          requiresStatusAcknowledgement: false,
        };

  const nbaAvailabilityIntent =
    sportHint === "nba"
      ? detectNbaAvailabilityIntent(question)
      : { isAvailabilityQuestion: false, asksBettingConsequence: false };
  const nbaDirectPropAsk = sportHint === "nba" ? isDirectNbaPropAsk(question) : false;
  const nbaDecisionMode =
    sportHint === "nba"
      ? resolveNbaDecisionMode({
          sportHint,
          availabilityIntent: nbaAvailabilityIntent,
          directPropAsk: nbaDirectPropAsk,
          invalidation: nbaInvalidation,
        })
      : "none";

  const mlbDecisionMode =
    sportHint === "mlb" ? resolveMlbDecisionMode(mlbContext || {}, String(question || "")) : null;

  const contextQuality = getContextQuality({
    sportHint,
    players,
    context,
    liveMatches,
    golfContext: golfContextEffective,
    nbaContext,
    mlbContext,
    nflContext,
    f1Context,
    wcContext,
    matchupContext,
  });

  const nbaMatchup =
    sportHint === "nba" ? resolveNbaMatchupFromQuestion(question, nbaContext || {}) : null;

  if (sportHint === "nba") {
    const nbaIntentForFinals = classifyNbaQuestionIntent(
      String(question || ""),
      incomingHistory,
    );
    const finalsCtxFinal = resolveNbaFinalsUrTakeContext({
      nbaContext,
      nbaMatchup,
      question: String(question || ""),
      nbaIntent: nbaIntentForFinals,
    });
    nbaFinalsModeMeta = {
      finalsMode: finalsCtxFinal.finalsMode,
      seriesState: finalsCtxFinal.seriesState,
    };
    nbaFinalsContextBlock = finalsCtxFinal.contextBlock;
    if (nbaContext && finalsCtxFinal.finalsMode) {
      nbaContext = {
        ...nbaContext,
        finalsMode: true,
        finalsSeriesState: finalsCtxFinal.seriesState,
      };
    }
  }

  const isBoardLive = computeIsBoardLive({
    sportHint,
    nbaContext,
    nbaMatchup,
    mlbContext,
    liveMatches,
    golfContextEffective,
  });
  const liveSignals = {
    ...liveKeywordSignals,
    isBoardLive,
    isEffectivelyLive: Boolean(liveKeywordSignals.hasLiveKeyword) || isBoardLive,
  };

  const baseDerivedConfidence = deriveConfidenceLabel({
    intent,
    sportHint,
    hasImage,
    matchupContext,
    question,
    contextQuality,
    isLive: liveKeywordSignals.isLive,
  });
  const nbaConfidenceModifier =
    sportHint === "nba"
      ? applyNbaConfidenceModifiers({
          baseConfidence: baseDerivedConfidence,
          invalidation: nbaInvalidation,
          nbaContext,
          question: String(question || ""),
        })
      : { label: baseDerivedConfidence, reason: "" };
  const derivedConfidence = nbaConfidenceModifier.label;
  const nbaMatchupPool =
    sportHint === "nba" && nbaMatchup
      ? buildAllowedMatchupPlayerPool(nbaMatchup, nbaContext || {})
      : null;
  const nbaGroundingSnapshot =
    sportHint === "nba" && nbaContext && typeof nbaContext === "object"
      ? buildNbaGroundingSnapshot(nbaContext, nbaMatchup)
      : null;
  const nbaMatchupGroundingBlock =
    sportHint === "nba" ? injectMatchupGroundingBlock(nbaMatchup, nbaMatchupPool) : "";
  const nbaMatchupGroundingApplied = sportHint === "nba" && Boolean(nbaMatchupGroundingBlock);
  const nbaOffMatchupPromptAcknowledgement =
    sportHint === "nba" ? buildOffMatchupPromptAcknowledgement(question, nbaMatchup, nbaMatchupPool) : "";

  const nbaGameStateGate =
    sportHint === "nba" ? buildNbaGameStateGateSnapshot(nbaContext || {}, nbaMatchup) : null;

  const nbaContextForModel =
    sportHint === "nba" && nbaContext && typeof nbaContext === "object"
      ? buildNbaContextForModel(nbaContext, nbaMatchup, question)
      : nbaContext;

  const tennisSystemPromptExtra = ``;

  const evidenceSparsityProfile = resolveEvidenceSparsityProfile({
    contextQuality,
    question: String(question || ""),
    hasMatchupContext: Boolean(matchupContext),
    sportHint,
    intent,
    hasImage,
  });
  const takeTrustUi = buildTakeTrustUiMetadata({
    contextQuality,
    evidenceSparsityProfile,
    sportHint,
  });
  const takeClientPayload = (takeRecord) => ({
    id: takeRecord.id,
    playLine: takeRecord.playLine,
    confidence: takeRecord.confidence,
    status: takeRecord.status,
    trust: takeTrustUi,
  });

  let memoryBlock = "";
  if (userEmail && isPro && !isConversationFollowUp) {
    memoryBlock = await buildEnrichedMemoryPrompt(userEmail, getDurableJson);
  }

  const longFormRequested = detectUrTakeLongFormIntent(String(question || ""));

  const systemPrompt = composeRegisteredUrTakeSystemPrompt({
    contextQuality,
    sportHint,
    chaseSignals,
    tennisSystemPromptExtra,
    nbaDecisionMode,
    mlbDecisionMode,
    question: String(question || ""),
    intent,
    hasImage,
    hasMatchupContext: Boolean(matchupContext),
    evidenceSparsityProfile,
    liveSignals,
    bettingStyle,
    memoryBlock,
    longFormRequested,
  });

  const outputJsonMode =
    isConversationFollowUp && String(sportHint || "").toLowerCase() !== "worldcup"
      ? "plain"
      : resolveOutputJsonMode({
          chaseSignals,
          intent,
          hasImage,
          liveSignals: liveKeywordSignals,
          question,
          matchupContext,
          sportHint,
          wcIntent,
        });
  const jsonContract = buildJsonOutputContract(outputJsonMode, sportHint, {
    requireStatusShift:
      sportHint === "nba" && Boolean(nbaInvalidation?.requiresStatusAcknowledgement),
    longFormRequested,
  });
  const propProjectionModeBlock = intent === "prop_projection" ? `\n\n${PROP_PROJECTION_MODE_BLOCK}` : "";
  const spreadAndGameSideBlock = isSpreadOrGameSideQuestion(question)
    ? `\n\n${SPREAD_AND_GAME_SIDE_BLOCK}`
    : "";
  /** Structured mode must NOT also attach summary/deep JSON contract — model would return wrong shape and validation always fails. */
  const attachTieredJsonContract =
    outputJsonMode !== "plain" && Boolean(jsonContract) && !effectiveStructuredModeRequested;
  let systemPromptForModel = attachTieredJsonContract
      ? `${systemPrompt}

JSON RESPONSE MODE (overrides conflicting FORMATTING / DEFAULT RESPONSE FORMAT rules above for this turn only)
For matchup, player prop, and "who wins" style questions when this contract applies, return JSON with summary (Tier 2.5) and deep (Tier 3 full format).
For factual Tier-1 questions, return JSON with only summary as a short string.
For live in-game Tier-2 questions, return JSON with only summary in the compressed live format.
For all other questions where no contract is attached, use plain text as already specified.

${jsonContract}${propProjectionModeBlock}${spreadAndGameSideBlock}`
      : `${systemPrompt}${propProjectionModeBlock}${spreadAndGameSideBlock}`;
  const nbaLiveNoPropSystemPromptBlock =
    sportHint === "nba" ? buildNbaLiveNoPropSystemPromptBlock(nbaGameStateGate, nbaContext) : "";
  if (nbaLiveNoPropSystemPromptBlock) {
    systemPromptForModel = `${systemPromptForModel}

${nbaLiveNoPropSystemPromptBlock}`;
  }
  if (isConversationFollowUp) {
    if (sportHint === "worldcup") {
      const wcFollowUpAppendix =
        wcIntent === WC_INTENT.RULES
          ? `${WC_FOLLOW_UP_SYSTEM_APPENDIX}

WC RULES FOLLOW-UP (mandatory): Structured betting JSON mode is OFF. Return tier1 summary (+ optional deep) factual rules only — no Lean/Edge/Prop card.`
          : WC_FOLLOW_UP_SYSTEM_APPENDIX;
      systemPromptForModel = `${systemPromptForModel}\n\n${wcFollowUpAppendix}`;
    } else {
      systemPromptForModel = buildUrTakeFollowUpCoreSystemPrompt();
      systemPromptForModel = `${systemPromptForModel}\n\n${buildFactAuthorityPrompt()}`;
    }
  }
  if (sportHint === "worldcup" && wcIntent === WC_INTENT.RULES) {
    systemPromptForModel = `${systemPromptForModel}\n\n${WC_RULES_TURN_APPENDIX}`;
  }

  if (
    isDerbyActive() &&
    (questionReferencesDerby(String(question || "")) || sportHint === "derby")
  ) {
    const derbyCtx = buildDerbyContext();
    if (derbyCtx) {
      systemPromptForModel = `${systemPromptForModel}\n\n${derbyCtx}`;
    }
  }

  const priorTakesSummary = summarizePriorTakesWithStructuralEdge(incomingHistory, sportHint);
  let wcPriorTakesSummary = priorTakesSummary;
  if (sportHint === "worldcup") {
    const wcMemory = buildWcSessionMemoryPrompt(priorTakesSummary, incomingHistory, sportHint, {
      wcIntent,
      requiredEntities: wcRequiredEntities,
      question: String(question || ""),
    });
    wcPriorTakesSummary = wcMemory.summary;
    wcRelevanceLog.structuralEdgeInjected = wcMemory.structuralEdgeInjected;
  }
  const nbaImpactSummary =
    sportHint === "nba" ? summarizeNbaNewsImpact(nbaNewsImpact) : "";
  const nbaStatusShiftLine =
    sportHint === "nba"
      ? buildNbaStatusShiftSection(nbaNewsImpact, nbaInvalidation)
      : "";
  const nbaConditionalPayload =
    sportHint === "nba" && nbaDecisionMode === "conditional_wait"
      ? buildNbaConditionalPayload({
          invalidation: nbaInvalidation,
          nbaContext,
          newsImpact: nbaNewsImpact,
        })
      : null;
  const nbaPlayerResolutionBlock =
    sportHint === "nba" ? buildNbaPlayerResolutionBlock(nbaInvalidation) : "";
  let nbaPostValidationChecked = false;
  let nbaPostValidationTriggered = false;
  let nbaFallbackOrRepairUsed = false;

  if (
    sportHint === "nba" &&
    (nbaDecisionMode === "status_only" || nbaDecisionMode === "status_plus_consequence")
  ) {
    const availabilityPayload = buildNbaAvailabilityResponse({
      question,
      nbaContext,
      nbaInvalidation,
      derivedConfidence,
      nbaConfidenceModifier,
      decisionMode: nbaDecisionMode,
    });
    let takeRecord = extractTakeFromResponse({
      responseText: availabilityPayload.response,
      sport: "nba",
      intent,
      question,
    });
    takeRecord = ensureNbaTakeConfidenceConsistency({
      takeRecord,
      decisionMode: nbaDecisionMode,
      derivedConfidence,
      confidenceModifier: nbaConfidenceModifier,
    });
    if (userEmail) {
      appendTakeForUser(userEmail, takeRecord).catch((e) => {
        console.warn("take logging failed:", e?.message || e);
      });
    }
    const nbaMeta = buildNbaObservabilityMeta({
      decisionMode: nbaDecisionMode,
      sport: "nba",
      matchupGroundingApplied: nbaMatchupGroundingApplied,
      postValidationChecked: false,
      postValidationTriggered: false,
      fallbackOrRepairUsed: false,
    });
    logNbaObservability(nbaMeta);
    return res.status(200).json({
      requestId,
      response: availabilityPayload.response,
      responseDeep: null,
      responseFormat: "plain",
      statusShift: availabilityPayload.statusShift,
      decisionMode: nbaDecisionMode,
      ...(nbaDebugEnabled ? { nbaDebug: nbaMeta } : {}),
      sport: "nba",
      intent,
      take: takeClientPayload(takeRecord),
    });
  }

  if (
    sportHint === "nba" &&
    nbaDecisionMode === "blocked_unavailable" &&
    nbaInvalidation.targetedPlayer
  ) {
    const affected = (nbaNewsImpact?.affectedTeams || []).find(
      (t) => String(t?.team || "").toUpperCase() === String(nbaInvalidation.team || "").toUpperCase(),
    );
    const outPlan = buildNbaOutStatusShiftPlan({
      targetedPlayer: nbaInvalidation.targetedPlayer,
      teamAbbr: nbaInvalidation.team,
      nbaContext,
      teamImpact: affected,
    });
    const blockedLead = `${nbaInvalidation.targetedPlayer} is ${nbaInvalidation.statusDisplay || "out"}. Direct prop projection is invalid.`;
    const watchBody = String(outPlan.liveTrigger || "").replace(/^Live trigger:\s*/i, "").trim();
    const blockedResponse = `How the board shifts
${blockedLead}

Replacement looks
${outPlan.replacementLines}

Prop reads
${outPlan.shiftLine}

Watch
${watchBody}

CONFIDENCE
${derivedConfidence}${nbaConfidenceModifier.reason ? ` — ${nbaConfidenceModifier.reason}` : ""}`;
    const blockedStatusShift = nbaStatusShiftLine || null;

    let takeRecord = extractTakeFromResponse({
      responseText: blockedResponse,
      sport: "nba",
      intent,
      question,
    });
    takeRecord = ensureNbaTakeConfidenceConsistency({
      takeRecord,
      decisionMode: nbaDecisionMode,
      derivedConfidence,
      confidenceModifier: nbaConfidenceModifier,
    });
    if (userEmail) {
      appendTakeForUser(userEmail, takeRecord).catch((e) => {
        console.warn("take logging failed:", e?.message || e);
      });
    }
    const nbaMeta = buildNbaObservabilityMeta({
      decisionMode: nbaDecisionMode,
      sport: "nba",
      matchupGroundingApplied: nbaMatchupGroundingApplied,
      postValidationChecked: false,
      postValidationTriggered: false,
      fallbackOrRepairUsed: false,
    });
    logNbaObservability(nbaMeta);
    return res.status(200).json({
      requestId,
      response: blockedResponse,
      responseDeep: null,
      responseFormat: "plain",
      statusShift: blockedStatusShift,
      decisionMode: nbaDecisionMode,
      ...(nbaDebugEnabled ? { nbaDebug: nbaMeta } : {}),
      sport: "nba",
      intent,
      take: takeClientPayload(takeRecord),
    });
  }

  let userPrompt = question;
  /** Scoped for Anthropic token budget — NFL TYPE_A draft simulation uses a higher max_tokens ceiling. */
  let draftTeamSimulationInject = false;

  if (intent === "slip_review") {
    userPrompt = buildSlipReviewPrompt({
      question,
      sportHint,
      nbaContext: nbaContextForModel,
      nflContext,
      mlbContext,
      golfContext: golfContextEffective,
      f1Context,
      derivedConfidence,
      priorTakesSummary,
    });
  } else if (sportHint === "tennis_wta_profile") {
    // DATA FRESHNESS: this sport reads from live APIs — no staleness injection needed.
    // If you ever add hardcoded fallbacks, add dataFreshness to the payload.
    const surfaceKey = pickSurfaceKey({
      currentTournament: { surface: context?.currentTournament?.surface },
    });

    const wtaSnapshot = buildTennisPlayerSnapshot(players?.wta, surfaceKey, 40);

    const wtaPlayerNames = Object.keys(players?.wta || {});
    const questionLower = normalizeText(question);

    const mentionedPlayers = wtaPlayerNames.filter((name) => {
      const lower = normalizeText(name);
      if (!lower) return false;
      if (questionLower.includes(lower)) return true;
      const parts = lower.split(/\s+/).filter(Boolean);
      const lastName = parts[parts.length - 1];
      return lastName.length > 3 && questionLower.includes(lastName);
    });

    let matchupDigest = "";
    if (mentionedPlayers.length >= 2) {
      matchupDigest = buildMatchupTennisDigest(
        mentionedPlayers[0],
        mentionedPlayers[1],
        players,
        surfaceKey,
      );
    }

    userPrompt = `You are answering a WTA tennis question as Under Review.

TODAY
${getTodayStr()}

${context && typeof context === "object" ? `TENNIS APP CONTEXT (JSON — full server bundle; same on every turn including follow-ups)
${contextJsonForModel(context)}

` : ""}${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}QUESTION
${question}

MODE
This is a profile-based WTA analysis. There is NO live fixtures feed for WTA.
Answer using ONLY the player database below. Do not invent live odds, scheduled
matches, or current draws. The user knows there is no live board — they want a
sharp, data-driven take based on the players' rally profiles, serve/return splits,
surface records, and tiebreak rates.

${matchupDigest ? `MATCHUP DIGEST (use this for head-to-head questions)
${matchupDigest}

` : ""}WTA PLAYER DATABASE (cite only these stats — do not fabricate)
${wtaSnapshot || "Not loaded"}

CONFIDENCE GUIDANCE
Default confidence: ${derivedConfidence}
WTA mode is profile-based — confidence should generally be Medium or Speculative
unless the surface/style mismatch is truly obvious from the data.

EXECUTION RULES — READ CAREFULLY
1. Lead with the take. First sentence is a concrete claim about a specific player
   or matchup using actual data from above.

2. NEVER say "no live data" or "feed unavailable" or anything about data limitations.
   Just answer the question with the profiles you have.

3. Cite specific stats from the database when justifying a take — rally splits,
   tiebreak rate, surface record, serve/return numbers. If a player isn't in the
   database, say so directly and pivot to who IS analyzable.

4. For head-to-head questions, identify the surface/style edge:
   - Who has the better rally profile for this surface?
   - Who has the tiebreak edge if it goes to a deciding set?
   - Who has the serve dominance on this surface?
   - Cite the actual numbers, not generic "X is better on clay."

5. Use the standard format (THE PLAY, MARKET MISTAKE, WHY MISPRICED, etc.) but
   for pure analytical questions ("who wins?"), THE PLAY can be the player you'd
   back if a price were available.

6. Add this exact line at the end of CONFIDENCE:
   SCOPE — WTA profile-based read; confirm live odds before sizing any bet.`;
  } else if (sportHint === "tennis") {
    // DATA FRESHNESS: this sport reads from live APIs — no staleness injection needed.
    // If you ever add hardcoded fallbacks, add dataFreshness to the payload.
    const leagueStr = normalizeText(matchupContext?.league || "");
    const isWtaLeague =
      leagueStr.includes("wta") ||
      (leagueStr.includes("women") && leagueStr.includes("tennis"));

    const rawMx = matchupContext?.raw || {};
    const mxHome = String(rawMx.home || "").trim();
    const mxAway = String(rawMx.away || "").trim();
    const boardSurfaceHint =
      String(rawMx.bdl_tournament_surface || "").trim() ||
      context?.currentTournament?.surface ||
      "";

    const surfaceKey = pickSurfaceKey({
      currentTournament: {
        surface: boardSurfaceHint || context?.currentTournament?.surface,
      },
    });

    const atpSnapshot = buildTennisPlayerSnapshot(players?.atp, surfaceKey, 30);
    const wtaSnapshot = buildTennisPlayerSnapshot(players?.wta, surfaceKey, 30);

    const matchupDigest =
      mxHome && mxAway
        ? buildMatchupTennisDigest(mxHome, mxAway, players, surfaceKey)
        : "";

    const liveBoard = (liveMatches || [])
      .slice(0, 15)
      .map((m) => {
        const score =
          m.raw?.score && m.raw.score !== "-" ? ` | Score: ${m.raw.score}` : "";
        const live = String(m.raw?.live || "0") === "1" ? " [LIVE]" : "";
        const surfRaw = String(m.raw?.bdl_tournament_surface || "").trim();
        const surf =
          surfRaw.length > 0 ? ` | Surface: ${surfRaw}` : "";
        const snap =
          m.raw?.ur_static_snapshot || String(m.raw?.source || "").includes("ur_static_wta")
            ? " [WTA profile snapshot — not a confirmed draw time]"
            : "";
        return `${m.title}${live}${snap} | ${m.network || ""}${surf}${m.raw?.round ? ` | ${m.raw.round}` : ""}${score}`;
      })
      .join("\n");

    const cardTournamentName = String(rawMx.tournament_name || "").trim();
    const globalTournamentName = String(context?.currentTournament?.name || "").trim();
    const tournamentMismatch =
      !!cardTournamentName &&
      !!globalTournamentName &&
      normalizeText(cardTournamentName) !== normalizeText(globalTournamentName);

    const tournamentName =
      cardTournamentName || context?.currentTournament?.name || "Current Tournament";
    const tournamentSurface =
      boardSurfaceHint || context?.currentTournament?.surface || "Unknown";
    let tournamentContext = context?.currentTournament?.context || "";
    if (tournamentMismatch) {
      tournamentContext =
        `App active tournament filter is "${globalTournamentName}" but this MATCHUP CARD fixture is "${cardTournamentName}" — use the CARD tournament for venue, surface, altitude, and conditions. ` +
        tournamentContext;
    }
    const tournamentSpeed = context?.currentTournament?.speed || "";
    const breakingNews = String(context?.breaking || "").trim();

    const hasLiveBoard = liveBoard.trim().length > 0;
    const tennisVerifiedBlock = buildTennisVerifiedPlayerListBlock(players, liveMatches, question);
    const fixtureHome = mxHome || "HOME_PLAYER";
    const fixtureAway = mxAway || "AWAY_PLAYER";
    const matchFocusBlock =
      mxHome && mxAway
        ? `MATCH FOCUS — THIS OVERRIDES EVERYTHING ELSE

A specific match is on the card: ${fixtureHome} vs ${fixtureAway}

YOUR ENTIRE RESPONSE IS ABOUT THIS MATCH ONLY.

Rules:
1. Every section (THE PLAY, MATCH READ, PROP PROJECTIONS, FADE) must
   reference ${fixtureHome} or ${fixtureAway} by name. No exceptions.

2. Do NOT give tournament-level takes in place of match-level takes.
   "Alcaraz benefits most at Madrid" is NOT an answer to a question
   about ${fixtureHome} vs ${fixtureAway}.

3. Tournament context (surface, altitude, speed) is background only.
   It informs HOW you analyze this match. It is not the answer itself.

4. If the user asks "Clay — who benefits more?", answer: which of
   ${fixtureHome} or ${fixtureAway} benefits more from this surface, and why,
   using their specific stats from the player database.

5. If the user asks "what are the best props?", deliver prop projections
   for ${fixtureHome} and ${fixtureAway} specifically — aces, double faults,
   games, break points, scoreline. Not tournament outright recommendations.

6. The only time you may mention a player not named ${fixtureHome} or
   ${fixtureAway} is in the FADE section to establish relative value context,
   and only briefly.

7. TENNIS RESPONSE WORDING RULES:
   - Never mention database/profile depth/Elo-ranking availability in the body.
     Banned body phrases: "no dedicated UR profile row", "limited in profile depth",
     "database does not rank", "limited in the database", "profile is limited".
     Thin data belongs in CONFIDENCE only, one phrase.
   - WHY MISPRICED = market error only (1–2 sentences). WHY IT FITS = player-matchup reason only (1–2 sentences). No repetition.
   - Age/injury context that materially affects matchup should lead WHY IT FITS (sentence 1 or 2), not be buried.
   - CONFIDENCE format: "[High/Medium/Speculative] — [one phrase basis]", max 15 words after dash.

VIOLATION: Responding about Alcaraz, Zverev, Swiatek, or any other
player when the question is about ${fixtureHome} vs ${fixtureAway} is a
critical failure. Do not do this under any circumstances.`
        : "";
    const tennisPropProjectionUserBlock =
      intent === "prop_projection" && mxHome && mxAway
        ? `DIRECT PROP REQUEST — MANDATORY OUTPUT FOR THIS MATCH

The user asked for props on ${fixtureHome} and ${fixtureAway}. Your summary must include:
- Match winner lean with threshold
- Total games projection (OVER/UNDER + number)
- Aces projection for ${fixtureHome} and ${fixtureAway} (per set and total)
- Double-fault projection for ${fixtureHome} and ${fixtureAway}
- Break points saved projection for each
- Scoreline projection

If data is thin, use tour/surface baselines, but still produce all projections.`
        : "";

    // DATA FRESHNESS: this sport reads from live APIs — no staleness injection needed.
    // If you ever add hardcoded fallbacks, add dataFreshness to the payload.
    userPrompt = `You are answering a tennis betting question as Under Review.

TODAY
${getTodayStr()}

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}QUESTION
${question}

${context && typeof context === "object" ? `TENNIS APP CONTEXT (JSON — full server bundle; same on every turn including follow-ups)
${contextJsonForModel(context)}

` : ""}${matchFocusBlock ? `${matchFocusBlock}\n\n` : ""}${breakingNews ? `BREAKING NEWS — READ FIRST AND ADJUST ALL ANSWERS ACCORDINGLY
${breakingNews}

` : ""}TOURNAMENT CONTEXT
Name: ${tournamentName}
Surface: ${tournamentSurface}
Speed: ${tournamentSpeed}
Context: ${tournamentContext}

${tennisVerifiedBlock}

${tennisPropProjectionUserBlock ? `${tennisPropProjectionUserBlock}\n` : ""}

FIXTURE vs FILTER (mandatory)
TOURNAMENT CONTEXT applies to the CURRENT FIXTURE on the card, not the app's active tournament filter alone.
If the match card shows a different tournament than the global filter, use the MATCH tournament and its surface.
Example: Munich BMW Open (ATP 250) is medium clay at low altitude; Madrid Mutua Madrid Open (Masters 1000) is medium-slower clay at altitude — they play very differently. Never mix them.

${matchupDigest ? `MATCHUP CARD — PLAYER DIGEST (use in WHY MISPRICED / WHY IT FITS — cite only these signals; do not invent stats)
Official event surface on card (ATP feed): ${boardSurfaceHint || "not on card — use tournament context above"}
${matchupDigest}

` : ""}${hasLiveBoard ? `LIVE MATCH BOARD
${liveBoard}

` : ""}ATP PLAYER DATABASE (surface-ranked snapshot — cite only these stats)
${atpSnapshot || "Not loaded"}

WTA PLAYER DATABASE (surface-ranked snapshot — cite only these stats)
${wtaSnapshot || "Not loaded"}

PROP GUIDE DIGEST — ACE / SERVE VOLUME (canonical; must match app Prop Guide card text)
${buildAcePropsDigest(context?.ace_props, tournamentSurface)}

ACE_PROPS_JSON (verbatim — same source as digest; use for field-level checks only)
${context?.ace_props ? contextJsonForModel(context.ace_props) : "{}"}

CONFIDENCE GUIDANCE
Default confidence: ${derivedConfidence}
Only go above that if the data strongly justifies it.

EXECUTION RULES — READ CAREFULLY
1. Opener authority is Step 1 of THE UNDERREVIEW RESPONSE FRAMEWORK above. The first sentence states the trigger condition (line threshold, surface/lineup status, game script). Do not open with a limitation, disclaimer, or pipeline note.

2. Never say "in data-only mode", "live feed unavailable", "based on available data",
   or any variation. The user does not care about your data pipeline. They want a call.

3. If breaking news is present above, it overrides everything else. Adjust the entire
   response to account for it — withdrawals, injuries, scheduling changes. Do not
   recommend a player who has withdrawn. Do not ignore news that changes the board.

4. Name specific players. Use the player database above.
   Do not give generic archetype-only answers — "clay specialist" is not a play unless tied to a named player and threshold.

5. Use the stats in the database rows: cElo, serve/hold hints, DR, surface notes, form strings.
   Reference them in WHY MISPRICED. Do not invent statistics.

6. Price discipline is mandatory on every answer.
   Every play must include a price threshold: "only at +150 or better",
   "only if implied probability is under 40%", "value entry under -120".
   Never recommend a play without a price anchor (bands are OK — do not invent a precise book quote).

7. If the live board has matches, use them.
   Name the players, round context, and what the board implies.

8. If no live board is shown, execute from the player database snapshot.
   Surface + cElo + serve/hold + surface notes + form = a specific, justified play.

9. For match bets: name player, market, price threshold, and one key statistical reason from the snapshot.
   For futures: name player, market (outright / top-4 / top-8), price threshold,
   why the surface profile justifies it, and one player or price to fade with reasoning.

10. For withdrawal or injury questions: immediately redirect to who benefits most.
    Reprice the field. Name the new favorite and the value plays that opened up.

11. Confidence must cite what data it rests on in CONFIDENCE line.
    High = specific snapshot stats + surface match + price discipline.
    Medium = surface model without live board confirmation.
    Speculative = thin data.
    Never call something High without citing the specific signals that justify it.

NO-MARKET FALLBACK RULE (ATP — mandatory when live board is thin, ace_props is empty, or match pricing is missing but tournament/player context is loaded)

You are NOT allowed to respond with "wait for lines" or "come back when books post"
as the primary answer.

Instead, do ALL of the following:

1. Open with a confident pre-market call: match winner framing or side market
   (games/sets) using surface Elo bands from the player database snapshot rows
   (cElo / hElo / gElo as provided) — no fabricated odds; use price-threshold language.

${NO_MARKET_VERIFIED_PLAYER_STEP_2}

3. For each player (when at least two names exist on the TENNIS PLAYER POOL above), state:
   - Market shape to watch (match winner band, spread in games, over/under games, ace prop)
   - A threshold in words ("only playable if implied favorite is under 65%")
   - Reasoning from surface Elo, serve/hold hints, DR, form strings, or round context on the board

4. When PROP GUIDE DIGEST / ace_props is present, tie ace overs/unders to named players using
   ONLY the numbers printed in PROP GUIDE DIGEST (or verbatim in ACE_PROPS_JSON). When the
   tournament surface is clay, the digest foregrounds avg_aces_clay — cite that value with label
   "clay aces/gm" exactly as shown. Do not substitute a different per-game ace average from memory.
   When liveMatches lists rounds or live flags, reference them explicitly.

5. End with a live trigger: set, break, or stat pace that would confirm or break the lean.

Never open with "no board pricing." Give named players, surface-backed ranges,
and something to watch from liveMatches or the snapshot.

REQUIRED RESPONSE FORMAT
Plain text only. No markdown. No bold. No asterisks.

One sharp opening sentence that is the call itself.

Then:

THE PLAY
[specific player + market + price threshold — one line]

MARKET MISTAKE
[what the book is mispricing and why — one to two lines]

WHY MISPRICED
[cite specific stats from the snapshot rows — one to two lines]

TIMING EDGE
[when to bet and why — one line]

WHY IT FITS
[surface + tournament fit + player profile — one to two lines]

FADE
[one explicit player or market to avoid, with one-line reason]

CONFIDENCE
[High / Medium / Speculative — followed by one phrase citing what data this rests on]

TIMING
[one line: bet now / wait for price / live trigger]${
      isWtaLeague
        ? `

SCOPE (mandatory extra line — WTA matchup or card)
SCOPE — Under Review is deepest on ATP markets; this WTA read uses tour-level profiles and live card context — confirm prices before sizing.`
        : ""
    }`;
  } else if (sportHint === "golf") {
    // DATA FRESHNESS: this sport reads from live APIs — no staleness injection needed.
    // If you ever add hardcoded fallbacks, add dataFreshness to the payload.
    const golfState = String(golfContextEffective?.currentEvent?.state || "").toLowerCase();
    const golfIsFinal = golfState === "post" || golfState === "final";
    const golfVerifiedBlock = buildGolfVerifiedPlayerListBlock(golfContextEffective);
    const golfHasVerifiedNames = collectGolfVerifiedNames(golfContextEffective).size > 0;
    const golfBetStructure = classifyGolfBetStructure(question, "golf");
    const golfOutrightBasketBlock = buildGolfOutrightBasketUserPromptAppendix(
      question,
      golfContextEffective?.odds?.outrights,
    );

    if (golfIsFinal) {
      userPrompt = `You are answering a golf question after the tournament has FINISHED.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${question}

Golf context:
${contextJsonForModel(golfContextEffective)}

${golfVerifiedBlock}
${buildGolfQuestionAlignmentPromptBlock(
        resolveGolfQuestionAlignmentArg(golfContextEffective),
        golfContextEffective?.currentEvent,
      )}
${buildGolfOddsFreshnessPromptBlock(golfContextEffective?.odds)}

TOURNAMENT STATUS: FINAL (currentEvent.state is post/final)
- Do NOT frame this as live betting, pre-market, or "wait for lines / tee times."
- Do NOT tell the user the event has not started or is scheduled for a future date.
- Answer from currentEvent.leaderboard and recentResults (if present) only — cite winner, final scores, and narrative of how the event unfolded.
- If the user asked for a "live" or "best bet" angle, reframe: there is no live market edge after the final putt; give a concise results recap and what the board says about who won and why.
- Name specific golfers from the leaderboard rows. Never invent a golfer not on the board.

FINAL RECAP — BETTING INTELLIGENCE (mandatory; narrative alone is incomplete)
When the tournament status is Final, the recap MUST include all of the following that the JSON can support (skip a bullet only if that slice is truly absent):
1) If odds.outrights rows include numeric American prices, which pre-tournament outrights would have CASHED versus the final leaderboard (name golfer + printed price from context only). If there are no numeric odds (field-only payload), state that in one line and skip hypothetical price tickets.
2) Which top-5 / top-10 / top-20 style prices in odds.topFinish (or related slices) would have cashed — cite the structure present in JSON; skip if empty.
3) Which make-cut prices in odds.makeCut cashed or lost for named golfers — only if those rows exist.
4) One concrete lesson for handicapping a future event at this course (field / setup / volatility) tied to what the final board showed.

Confidence guidance:
- Default confidence should be ${derivedConfidence}.

Use the standard Under Review sections (THE PLAY can be PASS or a retrospective note — not a new bet recommendation).`;
    } else {
      userPrompt = `You are answering a golf betting question.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${question}

Golf context:
${contextJsonForModel(golfContextEffective)}

${golfVerifiedBlock}
${buildGolfQuestionAlignmentPromptBlock(
        resolveGolfQuestionAlignmentArg(golfContextEffective),
        golfContextEffective?.currentEvent,
      )}
${golfOutrightBasketBlock}
${buildGolfOddsFreshnessPromptBlock(golfContextEffective?.odds)}

BET STRUCTURE (server classification — obey for wording and math):
- marketType: ${golfBetStructure.marketType}
- structure: ${golfBetStructure.structure}
${golfBetStructure.structure === "basket" ? "- This turn is NOT a parlay; use basket / coverage / multiple singles only." : ""}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Only go above that if the input strongly justifies it.
${nbaConfidenceModifier.reason ? `- Confidence modifier: ${nbaConfidenceModifier.reason}` : ""}

${buildUrTakeSportTurnScopeRules("golf")}

Rules:
- Use the tournament, odds, rankings, and player names in the provided golf context.
- currentEvent.leaderboard has live positions when the feed provides them — cite scores/positions from those rows when present.
- If a golfer the user names is a known PGA Tour pro but missing from live leaderboard rows, do NOT refuse — note "leaderboard position not yet available" and analyze from rankings, season form, course fit, and static profile data in context.
- Never say a legitimate PGA Tour pro is "not in the verified field", "not on the live leaderboard" as a refusal, or "not in the field."
- Short follow-ups ("any sleepers?", "who else?", "best value longshot?") still apply to this same Golf context JSON — use the leaderboard and odds here; never tell the user to re-paste a screenshot or resend the board when this payload includes field data.
- If data is limited, still stay within golf and give the best golf lean from the available board.
${
  golfHasVerifiedNames
    ? `- Name the golfer(s) the user asked about when they are known PGA Tour professionals or appear in the GOLF FIELD list above.
- For betting-market questions: if odds.outrights has numeric prices, THE PLAY must begin with one specific golfer name and market (example: "Collin Morikawa top-20") using prices from context only. If there are no posted prices, lean on form / course fit without inventing odds.`
    : `- Live field list is thin — still analyze any known PGA Tour pro the user names; do not invent book prices.`
}
- Do not invent unrelated teams, games, or props.

NO-MARKET FALLBACK RULE (mandatory when odds.outrights is empty or thin but leaderboard or event context exists)

You are NOT allowed to respond with "wait for book prices" as the primary answer.

Instead, do ALL of the following:

1. Open with a confident pre-market angle: top-10, top-20, make-cut, or
   matchup H2H — using leaderboard position, strokes-gained narrative from
   context, and course fit.

${NO_MARKET_VERIFIED_PLAYER_STEP_2}

3. For each golfer (when at least two names exist on the GOLF FIELD list above or the user named known pros), state:
   - The market shape to watch (top-10 / top-20 / make cut / first-round leader)
   - A verbal price band or "only if outright is +X or longer" when odds rows exist;
     if no numbers, give a range in words tied to world ranking and form
   - Reasoning from courseStats, recent rounds, or fit notes in context

4. Tie reads to leaderboard position and volatility: chasing vs protecting a lead — but separate "who leads" from "where the bet is" when a SESSION STRUCTURAL EDGE block is present.

5. End with a live trigger: what hole range or round split would flip the lean.

SESSION STRUCTURAL EDGE (when present in PRIOR TAKES / structural block above):
- The established structural player is the primary betting angle; the leaderboard leader is context, not an automatic replacement for THE PLAY.
- Dual framing when they differ: "[Leader] has the lead; [Structural player] is the value / structural play we flagged."
- Only flip the structural edge if you name new evidence (WD, injury, weather, collapse) — not because the board changed.

Never open with market-availability throat-clearing. Give monitoring hooks; name golfers from the GOLF FIELD list or known PGA Tour pros the user asked about.`;
    }
  } else if (sportHint === "nba") {
    const nbaQuestionForModel = sanitizeNbaQuestionForGeneration(question, nbaContext);

    if (isConversationFollowUp) {
      const nbaRosterListBlockFollowUp = buildNbaRosterProminentInjection(nbaContextForModel, {
        hasImage,
        question,
        matchup: nbaMatchup,
      });
      userPrompt = `You are answering a short NBA betting follow-up.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${nbaQuestionForModel}

${nbaMatchupGroundingBlock ? `${nbaMatchupGroundingBlock}\n\n` : ""}${nbaImpactSummary ? `HIGH-PRIORITY NBA NEWS IMPACT (SERVER-COMPUTED — READ FIRST)
${nbaImpactSummary}

` : ""}${nbaInvalidation.unresolved && nbaInvalidation.targetedPlayer ? `UNRESOLVED AVAILABILITY FLAG
Target player: ${nbaInvalidation.targetedPlayer}
Status: ${nbaInvalidation.statusDisplay || nbaInvalidation.statusClass}
Rule: Do not give false certainty. Keep any take contingent on confirmed status.

` : ""}${sportHint === "nba" && nbaGameStateGate ? formatNbaGameStateBlocksForUserPrompt(nbaGameStateGate) : ""}${nbaFinalsContextBlock ? `${nbaFinalsContextBlock}\n` : ""}${nbaFinalsOutrightsBlock ? `${nbaFinalsOutrightsBlock}\n\n` : ""}NBA context (full board — same filtered payload as the opening turn; cite only numbers present):
${contextJsonForModel(nbaContextForModel)}
${buildNbaPropsFreshnessPromptBlock(resolveNbaPropsOddsForPrompt(nbaContextForModel, nbaMatchup))}
${buildNbaKeyPropsLinesPromptBlock(nbaContextForModel, resolveNbaPropsOddsForPrompt(nbaContextForModel, nbaMatchup))}
${buildNbaGameTotalsPromptBlock(nbaContextForModel, nbaMatchup)}

Default confidence should be ${derivedConfidence}.

${nbaRosterListBlockFollowUp}

IMPORTANT: playerStatsText may contain season-average rows with stale team assignments. The INTERNAL authorized-name roster block above overrides playerStatsText for team assignments when both appear.

${NBA_FOLLOW_UP_THREAD_RULE}`;
    } else {
    const nbaRosterListBlock = buildNbaRosterProminentInjection(nbaContextForModel, {
      hasImage,
      question,
      matchup: nbaMatchup,
    });
    const firstSessionGuaranteeBlock = buildFirstSessionGuaranteeInjection(firstSessionGuaranteeFeature);

    userPrompt = `You are answering an NBA betting question.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${nbaQuestionForModel}

${sportHint === "nba" ? `INTERNAL NBA CONTROL (DO NOT QUOTE OR REPEAT VERBATIM)
- decisionMode: ${nbaDecisionMode}
- Obey the NBA DECISION MODE SPINE appended to the system prompt for this mode (substance + avoidance). User prompt rules below still apply where they do not conflict.
- Never print internal labels, control headers, or mode names to the user.

` : ""}${firstSessionGuaranteeBlock ? `${firstSessionGuaranteeBlock}

` : ""}${sportHint === "nba" && nbaGameStateGate ? formatNbaGameStateBlocksForUserPrompt(nbaGameStateGate) : ""}${sportHint === "nba" && nbaPlayerResolutionBlock ? `${nbaPlayerResolutionBlock}

` : ""}${nbaConditionalPayload ? `INTERNAL CONDITIONAL PAYLOAD (DO NOT QUOTE OR REPEAT VERBATIM)
- targetPlayer: ${nbaConditionalPayload.player}
- currentStatus: ${nbaConditionalPayload.status}
- listedMarket: ${nbaConditionalPayload.listedMarkets}
- IF ACTIVE: ${nbaConditionalPayload.ifActive}
- IF OUT: ${nbaConditionalPayload.ifOut}
- IF UNRESOLVED: ${nbaConditionalPayload.ifUnresolved}

` : ""}${nbaImpactSummary ? `HIGH-PRIORITY NBA NEWS IMPACT (SERVER-COMPUTED — READ FIRST)
${nbaImpactSummary}

` : ""}${nbaInvalidation.unresolved && nbaInvalidation.targetedPlayer ? `UNRESOLVED AVAILABILITY FLAG
Target player: ${nbaInvalidation.targetedPlayer}
Status: ${nbaInvalidation.statusDisplay || nbaInvalidation.statusClass}
Rule: Do not give false certainty. Keep any take contingent on confirmed status.

` : ""}${nbaMatchupGroundingBlock ? `${nbaMatchupGroundingBlock}\n\n` : ""}${
      nbaContextForModel?.focusedSeriesSnapshot?.serverSummaryOneLiner
        ? `FOCUSED PLAYOFF SERIES (board-verified — mirror this in series framing; do not invent wins/game number)\n${nbaContextForModel.focusedSeriesSnapshot.serverSummaryOneLiner}\n\n`
        : ""
    }${nbaFinalsContextBlock ? `${nbaFinalsContextBlock}\n` : ""}${nbaFinalsOutrightsBlock ? `${nbaFinalsOutrightsBlock}\n\n` : ""}NBA context:
${contextJsonForModel(nbaContextForModel)}
${buildNbaPropsFreshnessPromptBlock(resolveNbaPropsOddsForPrompt(nbaContextForModel, nbaMatchup))}
${buildNbaKeyPropsLinesPromptBlock(nbaContextForModel, resolveNbaPropsOddsForPrompt(nbaContextForModel, nbaMatchup))}
${buildNbaGameTotalsPromptBlock(nbaContextForModel, nbaMatchup)}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Only go above that if the input strongly justifies it.

${nbaRosterListBlock}

IMPORTANT: playerStatsText may contain season-average rows with stale team
assignments. A player listed as ATL in playerStatsText may have been traded.
The INTERNAL authorized-name roster block above overrides playerStatsText for team assignments.
If a name appears in playerStatsText but not under that team in playersByTeamAbbrev / the authorized list,
do not cite them as being on that team tonight.

When using the Tier-3 format (opener prefixed with ">> ", then THE PLAY and following sections),
no preamble, no roster disclaimer, no source caveat — nothing before the opener sentence.
The opener content is governed by Step 1 of the framework; the ">> " prefix is formatting only.

TEAM-LEVEL READ REQUIREMENTS (mandatory when named players are unavailable)

When you cannot name specific players, you MUST anchor the response to
verifiable team-level data from the provided nbaContext. Specifically:

1. Series context from playoffSeries — what is the current series record?
   Who has home court? What were the scores of prior games in this series?
   This is MORE useful than player names for series betting.

2. Pace and scoring from gameTotals — what is the total line for this game?
   Is this a high-pace or low-pace matchup based on available data?

3. Injury context from injuries array — are any key players listed as out
   or doubtful? This directly affects every prop on the slate.

4. Season context from seasonContext — are we in playoffs? What phase?
   Playoff basketball has specific patterns that change prop values.

Generic statements like "bench guys either explode or vanish" or "home
court helps the home team" are FORBIDDEN when specific series data,
injury reports, or game totals are available in the context.

If the injuries array shows a star player is out, LEAD WITH THAT.
If the series is 3-0, LEAD WITH THAT — series pressure changes everything.
If the game total is 215.5, that tells you something specific about pace
expectations. USE IT.

${nbaInvalidation.requiresStatusAcknowledgement && nbaStatusShiftLine ? `STATUS SHIFT ACKNOWLEDGMENT — MANDATORY
You must explicitly acknowledge this status shift in the response:
${nbaStatusShiftLine}
If output is JSON Tier 2.5, include this in "statusShift" and keep it decisive.

` : ""}

The goal: a user reading this response should learn something specific
about ATL vs NYK tonight that they couldn't get from a generic sports
column. If the response could apply to any two playoff teams, rewrite it.

${ROSTER_ENFORCEMENT_NBA}

${buildUrTakeSportTurnScopeRules("nba")}

Rules:
- Do not invent unrelated games or props.
- Stats in the nbaContext are the ONLY stats you may cite with confidence.
  Never cite a specific percentage or compression rate unless it appears in the provided context payload. If grounded data does not contain a percentage, describe the pattern qualitatively instead. Do not apply estimated compression rates to multiple players in the same response — that is a fabrication pattern regardless of whether the percentages differ.
- If the question references a live game (contains score, time remaining, or
  an attached screenshot), ALWAYS acknowledge the current game state first.
  Never declare a prop a winner while the game is still in progress.
- If a player mentioned in the question is not in today's injury report or
  game list, reflect uncertainty only in CONFIDENCE — never lead the answer with data-availability throat-clearing.
- NBA availability is enforced globally via INJURY GROUNDING (NBA BDL) in the system registry — use the \`bdlAvailability\` array (not training memory).
- When a player row includes "tonightGame", that matchup string comes from today's prop board (Odds API) and is more current than the "team" field from BallDontLie after trades — use it for who plays in which game tonight.
- When "playerStatsText" is present and statsSource is "game_box", treat it as the primary roster truth for who played for which team today (from game box scores). When statsSource is "season_average", do not treat team abbreviations as tonight's lineup — they may lag trades.
- If todaysGamesSlateNote is set, todaysGames is empty for the reason given (e.g. BallDontLie returned no games for that ET date). Trust that note instead of guessing a pipeline failure.
- POSTED PROP LINES (propsOdds): when propsOdds.hasPostedLines is true, prefer
  propsOdds.players[].props (points/rebounds/assists) and per-book prices over
  legacy propLines for cited American lines. Obey ODDS FRESHNESS above — if stale,
  do not cite specific prices as live.
- PROP BOARD HYGIENE: propLines are filtered server-side to drop games that are
  already final (Odds event.completed and/or todaysGames.state === "post").
  Never use a prop row for a matchup that is Final in todaysGames as a "tonight"
  lean — treat those as stale. If the market snapshot still includes completed
  games, ignore those rows and apply the fallback below.

FALLBACK RULE (mandatory when active player prop markets are unavailable for an upcoming/live game the user cares about)

Do not treat unavailable markets as an excuse for thin analysis. The user is here because tip is close.

FALLBACK FORMAT (mandatory when markets are unavailable for a matchup you can see in context):

Same ROSTER DISCLOSURE RULE as above — never mention partial rosters, loading, or which names are "verified."

Open with the sharpest matchup observation you can ground in playerStats, rosterGrounding,
injuries, playoffSeries, or gameTotals — not a dismissal.

Then deliver, in prose (no bullets): (1) primary structural angle from verified stats and matchup;
(2) game script / pace framework using numbers only when present in context (gameTotals, box, recentGames);
(3) one live trigger tied to pace, foul trouble, rotation, or observable stat clips from context — no fabricated thresholds.

Do NOT use "Watch for:" as a section header.
Do NOT use player names as headers (no "JALEN BRUNSON —").
Do NOT open with empty-slate throat-clearing about data availability.
${NBA_STRUCTURAL_MARKET_CLOSING_RULE}

LIVE NBA OVERRIDE: Never surface technical errors, variable names, array names, HTTP status codes, or API details to users. Ever. No exceptions.
When prop lines are unavailable, do not mention it. Do not apologize. Do not explain. Pivot to the strongest angle from live game state: minutes played, pace, foul trouble, rotation patterns, early stat lines, and matchup dynamics.
Lead with the angle, not the caveat. Never open with what you don't have.
When analyzing a live game, close the response with a one-line signature in this format: TEAM1 SCORE, TEAM2 SCORE · Q? TIME · Live. This replaces the need to announce "the game is live" in the opening.

Ignore unrelated injury callouts from the raw user text when they do not match the targeted player/team in this take.

Hard cap: keep the entire answer under 200 words.

Internal structure (do not print these labels):

[Opening line — one sentence, sharpest matchup observation you can defend from context]

[Paragraph 1 — primary structural angle from verified averages vs this matchup. LEAD WITH THE EDGE,
then reasoning. Numbers only from payload (recentGames, playerStats, gameTotals). Max 3 sentences.]

[Paragraph 2 — game total / pace framework: cite totals or pace figures only when they appear in context.
Max 2 sentences. Tie opinions to scheme, injuries, or series facts when you explain why.]

[Paragraph 3 — live trigger from observable game state in context — player, stat clip, rotation, or foul pattern.
Numbers only if visible in live/box context. Max 2 sentences. Cut filler like "rosters shift fast."]

When the INTERNAL authorized-name block lists names for both sides of the matchup, prefer weaving in one player per team across the answer when it fits naturally — not a hard rule. Never invent a player name.
Use only players who appear in that authorized-name block above (unless Question/image authorizes otherwise).

LEAD WITH THE EDGE, NOT THE SETUP.

Every paragraph must start with the conclusion, not the context.

Wrong: "Brunson in playoff home games typically runs high usage. Look for his line in the 24–28 range and lean under if it opens at 27.5."

Right: "Brunson under is the lean if his line opens 27.5 or higher — Knicks depth means he doesn't need to carry at home."

The edge comes first. The reason comes second. Always.

Example shape (ATL vs NYK — adapt names and numbers to verified context only):

Brunson under is the lean if his line opens 27.5 or higher — Knicks depth means he doesn't need to carry at home in the playoffs.

KAT's 3PM line is the other read. Atlanta's perimeter scheme runs him off the arc in high-leverage possessions — under 3.5 is the play if it posts at even money or better.

If gameTotals in context shows 214.5, that band is the pace read: a line that low usually means both sides expect a grind — lean under on big player overs. If the same block shows 222+, plan for a track meet and nudge player overs. Use the number in the JSON, not a wait for the book.`;
    }
  } else if (sportHint === "mlb") {
    // DATA FRESHNESS: this sport reads from live APIs — no staleness injection needed.
    // If you ever add hardcoded fallbacks, add dataFreshness to the payload.
    const mlbVerifiedBlock = buildMlbVerifiedPlayerListBlock(mlbContext, question);

    userPrompt =
      mlbDecisionMode !== "actionable"
        ? buildMlbPreMarketUserPrompt({
            question,
            mlbContext,
            derivedConfidence,
            priorTakesSummary,
            mlbVerifiedBlock,
          })
        : buildMlbActionableUserPrompt({
            question,
            mlbContext,
            derivedConfidence,
            priorTakesSummary,
            mlbVerifiedBlock,
          });
  } else if (sportHint === "f1") {
    const f1VerifiedBlock = buildF1VerifiedDriverListBlock(f1Context, question);
    const f1OddsBlock = buildF1OddsPromptBlock(f1Context?.odds || f1Context?.smarketsOdds);

    userPrompt = `You are answering a Formula 1 betting question.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${question}

F1 context:
${contextJsonForModel(f1Context)}
${f1OddsBlock}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Only go above that if the input strongly justifies it.

${f1VerifiedBlock}

${buildUrTakeSportTurnScopeRules("f1")}

Rules:
- The F1 context JSON is server-assembled; **never** ask the user to paste F1 data, context, or screenshots to proceed.
- Use the queryFocus and schedule.races fields in context for the event the user named (e.g. Miami Grand Prix) when present.
- Whether odds grids or qualifying splits appear or not, deliver the same-caliber **race-only** read: head-to-head matchup, points finish, qualifying pace, tire or weather hooks — grounded only in fields present in context.
- Do not invent unrelated drivers, races, or props.

NO-MARKET FALLBACK RULE (mandatory when betting markets in context are thin or odds blocks are empty but the next race or weekend is upcoming)

You are NOT allowed to respond with "wait for prices" or "check back when
markets post" as the primary answer.

Instead, do ALL of the following:

1. Open with a confident pre-race angle: podium finish lean, top-6, or
   head-to-head constructor pairing — grounded in driver standings and session
   data you actually have.

${NO_MARKET_VERIFIED_PLAYER_STEP_2}

3. For each driver (when at least two names exist on the F1 DRIVER POOL above), tie to:
   - Podium or top-N finish framing from current points / form
   - Qualifying-to-race correlation when session data lists practice or qual gaps
   - Constructor teammate dynamic when both appear in context

4. Use schedule.races and sessions: reference next race name, track type, and
   weather or format notes only if present in context — never invent session times.

5. End with a live trigger: what to watch in FP3/qualifying or lap 1 that would
   confirm or break the lean.

Never open with "no odds yet." Give them a monitoring plan and a priced band
in words (e.g. "podium only makes sense at +400 or better — watch qual gap").`;
  } else if (sportHint === "nfl") {
    const canonicalNfl = await buildCanonicalNflContext({ question, matchupContext });
    const nflContextEffective =
      nflContext && String(nflContext).trim()
        ? nflContext
        : canonicalNfl.promptContext;

    const nflDataFreshness =
      typeof nflContext === "object" &&
      nflContext !== null &&
      !Array.isArray(nflContext) &&
      nflContext.dataFreshness
        ? nflContext.dataFreshness
        : canonicalNfl.dataFreshness;

    const availableNflPlayers = extractNflPlayersFromContext(nflContextEffective);
    const subject = extractNflQuestionSubject(question);
    const matchedPlayer = findNflPlayerMatch(subject, availableNflPlayers);

    const nflDraftAngle = isNflDraftAngleQuestion(question);
    const draftBundleForPrompt = getActiveDraftBundle();
    const draftPhase = getNflDraftPhase(new Date(), draftBundleForPrompt);
    const nflDraftWindowActive =
      nflDraftAngle && (draftPhase === "pre_draft" || draftPhase === "during_draft");
    const draftProspectBlock = buildNflDraftProspectBlock(draftBundleForPrompt);
    const focusTeamFromQuestion = resolveNflTeamFromQuestion(question);
    const nflTeamAbbrFromQuestionMap = detectNflTeamHint(question);
    const focusTeam =
      focusTeamFromQuestion ||
      (nflTeamAbbrFromQuestionMap
        ? getNflTeamNameFromAbbr(nflTeamAbbrFromQuestionMap)
        : null) ||
      getNflTeamNameFromAbbr(teamHint);
    const focusTeamAbbr = focusTeam
      ? getNflTeamAbbrFromName(focusTeam)
      : String(teamHint || "").toUpperCase() || null;
    const focusTeamAbbrFromResolvedName = focusTeamFromQuestion
      ? getNflTeamAbbrFromName(focusTeamFromQuestion)
      : null;
    const teamHintAbbrRaw = String(teamHint || "").trim().toUpperCase();
    const focusTeamAbbrFromClient =
      teamHintAbbrRaw && getNflTeamNameFromAbbr(teamHintAbbrRaw)
        ? teamHintAbbrRaw
        : null;
    /** Regex-extracted franchise name → abbr; else nickname/city map on question text; else validated client tab hint. TYPE_B league-wide wins inside route() before TYPE_A. */
    const focusTeamAbbrForRoute =
      focusTeamAbbrFromResolvedName ||
      nflTeamAbbrFromQuestionMap ||
      focusTeamAbbrFromClient ||
      null;
    const nflDraftRoute = nflDraftWindowActive
      ? getNflDraftQuestionRoute(question, focusTeamAbbrForRoute)
      : null;
    draftTeamSimulationInject =
      nflDraftWindowActive && nflDraftRoute === "TYPE_A";
    const teamState = focusTeamAbbr ? draftBundleForPrompt?.teams?.[focusTeamAbbr] : null;
    const teamPickList = (teamState?.picks || [])
      .filter((p) => Number(p?.round || 9) <= 3)
      .sort((a, b) => Number(a.overall || 0) - Number(b.overall || 0))
      .map((p) => `R${p.round} #${p.overall}`)
      .join(", ");
    const teamNeedPriority = (teamState?.needPriority || teamState?.needs || []).join(", ") || "best-player-available";
    const sensibleSimulation =
      draftTeamSimulationInject && focusTeamAbbr
        ? simulateDraftRounds({ teamAbbr: focusTeamAbbr, rounds: 3, chaosMode: false })
        : null;
    const chaosSimulation =
      draftTeamSimulationInject && focusTeamAbbr
        ? simulateDraftRounds({ teamAbbr: focusTeamAbbr, rounds: 3, chaosMode: true })
        : null;
    const prospectsFormattedByPosition = buildDraftProspectsByPositionBlock(draftBundleForPrompt);
    const teamCapitalBlock =
      nflDraftAngle && focusTeam
        ? buildTeamDraftFocusBlock(focusTeam, draftBundleForPrompt)
        : "";
    const nflContextForPrompt =
      (typeof nflContextEffective === "string"
        ? nflContextEffective
        : contextJsonForModel(nflContextEffective)) +
      (teamCapitalBlock ? `\n\n---\n\n${teamCapitalBlock}` : "");
    const nflVerifiedBlock = buildNflVerifiedPlayerListBlock(nflContextEffective, question);

    const questionPropNames = [];
    if (subject) questionPropNames.push(subject);
    if (matchedPlayer && !questionPropNames.includes(matchedPlayer)) {
      questionPropNames.push(matchedPlayer);
    }
    const questionPropSlice = formatPropContextForPlayers(questionPropNames, 3);

    let nflUserPromptBody = `You are answering an NFL betting question.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${question}

DATA FRESHNESS — READ FIRST
${nflDataFreshness != null ? JSON.stringify(nflDataFreshness, null, 2) : "Staleness metadata not available"}

NFL context:
${nflContextForPrompt}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Only go above that if the input strongly justifies it.

${nflVerifiedBlock}

${draftProspectBlock}

${
  nflDraftWindowActive
    ? `DRAFT QUESTION CLASSIFICATION — read the question and pick exactly one route (THIS REQUEST: ${nflDraftRoute}):

TEAM NAME EXTRACTION (mandatory before asking for clarification):

Before responding "Which team?", scan the user's question for NFL team nicknames and cities (cowboys, eagles, chiefs, patriots, ravens, kansas city, green bay, etc.).

Server-resolved team abbreviation for this request: ${focusTeamAbbrForRoute || "NONE"}.

Examples: "simulate the cowboys draft" → teamHint DAL → Dallas simulation; "what should the chiefs do?" → KC; "jets mock draft" → NYJ.

Only ask "Which team?" if NO team name or city appears anywhere in the question AND the resolved abbreviation above is NONE. If ANY team reference exists in the question OR the server resolved an abbreviation, run the simulation immediately — no clarification interrogatives.

TYPE A — TEAM SIMULATION
Signals: "simulate [team]", "Cowboys draft", "what will [team] do", "[team] mock",
"[team] rounds 1-3", "my team's picks", "pick by pick", "mock draft"
Response: Run sensible board + chaos branch only when a franchise is resolved below.
Never ask for a team when the question is Type B or Type C.

TYPE B — LEAGUE-WIDE DRAFT ANALYSIS
Signals: "biggest sleepers", "best value picks", "who falls", "who rises",
"best prospect at [position]", "most interesting situation", "who goes top 5",
"best players available", "which team wins the draft"
Response: Answer directly from the VERIFIED prospect pool above. No team required.
Never ask which team the user means. Never route this to simulation.

TYPE C — PROSPECT PROFILE
Signals: player + "draft", "where does [player] go", "grade on [player]",
"[player] fit", draft stock/range/projection questions
Response: projectedRange, positionalRank/EDGE (or position rank), strengths/concerns if in pool, and 2–3 best-fit teams grounded in TEAM DRAFT CAPITAL needs when context exists.

RULE: Never ask for a franchise when the route is TYPE B or TYPE_C.
RULE: Never use numbered clarification lists ("1. Give me...", "2. Tell me...").
RULE — DRAFT TONE (Types A/B/C): Never open with what you need ("I need...", "Give me:",
"Once you X I'll Y"). Lead with insight; if you genuinely lack one fact, ask in one neutral sentence — never transactional or bossy.

`
    : ""
}${
  nflDraftWindowActive && !draftTeamSimulationInject
    ? `NFL DRAFT — ANALYSIS MODE (${nflDraftRoute}, not team simulation):
Answer the user's question outright. Pull every prospect name from VERIFIED anchors / pool rows only — cite projectedRange, consensusRank, nflGrade there and compare to positional value tiers.
Do NOT append team-mock simulations unless they asked for a team's picks.

TYPE B — OPEN / LEAGUE QUESTIONS:
If which team wins the draft / most interesting capital / league-wide sleeper questions: answer with concrete teams or prospects plus reasoning — zero clarification interrogatives.

TYPE B — SLEEPERS ("sleepers", "best value vs ADP/board", falls):
Use this layout (titles optional; keep tight):

DRAFT SLEEPERS — 2026

[Player], [Position], [School] — one line tying undervaluation to likely draft slot vs where their traits say they belong (use pool ranges).
[repeat for 5–7 names drawn from verified pool rows — not memorized scouting]

ROUND VALUE NOTE
One sentence naming which round clusters have the richest mispriced traits this year based on POOL tiers (example pattern only: Round 3 interior depth depressing Day 2 IOL valuations).

Define sleeper using POOL cues: consensus/projected band clearly later than traits suggest, multi-team fits underpriced versus consensus landing spot, medical/character noise — always cite pool fields instead of invented hype.

TYPE C — PROSPECT PROFILE:
Structured answer: positional rank vs class, projectedRange + source bands in pool, strengths/concerns arrays when present, then 2–3 teams whose TEAMS needs + picks map cleanly.

`
    : ""
}${
  draftTeamSimulationInject
    ? `NFL DRAFT 2026 — TEAM SIMULATION MODE ONLY (TYPE_A)

Team: ${focusTeamAbbr || "UNKNOWN"}
Picks: ${teamPickList || "No rounds 1-3 picks found in active state"}
Priority needs: ${teamNeedPriority}
Draft location: ${draftBundleForPrompt?.event?.location || "Pittsburgh, PA"}

VERIFIED PROSPECT POOL (rounds 1-4 only — do not name prospects outside this list):
${prospectsFormattedByPosition}

SIMULATION BASELINE (engine output — align narrative; validate slot realism — only when Team is NOT UNKNOWN below)
SENSIBLE: ${sensibleSimulation ? JSON.stringify(sensibleSimulation) : "(no franchise resolved — skip baseline)"}
CHAOS: ${chaosSimulation ? JSON.stringify(chaosSimulation) : "(no franchise resolved — skip baseline)"}

SIMULATION RULES (mandatory — TYPE A team resolved only):
1. Target under 400 words total.
2. Never open with inability hedges — open directly with the simulation header.
3. Only detail picks for the anchored team — use slot numbers under Picks.
4. No league-wide mock of picks 1–11 unless one short clause ties to YOUR pick.
5. Labels for missing pool names: "Day 3 / UDFA range" — never invent prospects.

TYPE A — TEAM UNKNOWN (mandatory stop):
If Team shows UNKNOWN OR no NFL franchise was resolved AND the route is TYPE_A, respond with ONLY this exact sentence — nothing before or after, no apologies, no lists:

Which team? Drop the franchise and I'll run the board — sensible scenario plus a chaos branch.

MY TEAM wording with no franchise also maps here — identical single-line reply.

TYPE A — TEAM RESOLVED:
Use baseline JSON only if SENSIBLE/CHAOS rows exist above; otherwise synthesize obeying slot validation.

PROSPECT SLOT VALIDATION (mandatory before finalizing any simulation):
- Each prospect must appear in VERIFIED anchors / pool.
- Respect projectedRange + consensusRank + projectedRound — no absurd reaches vs bands (David Bailey ≠ top 12 profile on this board).
- POSITION_VALUE_MAP & economics still apply.

FOCUS TEAM: Only ${focusTeam || focusTeamAbbr || "[named team]"} slots/needs unless question names another trade partner.`
    : ""
}

${buildUrTakeSportTurnScopeRules("nfl")}

Rules:
- Use only players/teams/roles that exist in the provided NFL context — **except** the "NFL DRAFT BOARD" section: Round 1 pick numbers, team slot holders, trade notes on those slots, and OFFICIAL ROUND 1 PICKS (when populated) are authoritative for draft questions.
- If the asked player is not in provided context, return PASS and explain missing context in one line — **unless** the question is draft-centric (see DRAFT / GM MODE below); then you may discuss well-known prospects qualitatively but must not fabricate who was selected at which slot.
- Draft identity enforcement: for draft-centric questions, any prospect name outside VERIFIED 2026 DRAFT PROSPECT ANCHORS must be labeled "simulation-only (UDFA-range)" before analysis.
- Do not invent unrelated games, props, role changes, or target-share claims.

- Data staleness: If DATA FRESHNESS above shows isCurrentSeason: false, you MUST include exactly one short line acknowledging the limitation — **except in NFL DRAFT TEAM SIMULATION (see below)**, where staleness belongs only in the single CONFIDENCE block at the end. Example phrasings: "Working off 2024 QB stats and offseason tier data — this gets sharper once Week 1 posts." / "Offseason snapshot, not live 2026 — flagging uncertainty accordingly." Do not let this line dominate the answer, but do not omit it when the snapshot is not current-season.`;

    nflUserPromptBody += `

${
  draftTeamSimulationInject
    ? `NFL DRAFT SIMULATION — RESPONSE FORMAT (mandatory; omit fully if you already returned the single-line franchise prompt for UNKNOWN team)

CRITICAL RULES BEFORE WRITING ANYTHING:

1. Do not open with "I can't" or "without live war-room intel" or any hedge. Everyone knows mocks are speculation. Skip that entirely. Open directly with the simulation.

2. No board-flow paragraphs. Do not list who goes at picks 1–11 in a wall of text. The user asked about their team, not the entire draft. The only prospect names you list in depth are the picks for the team being simulated.

3. Board context belongs in ONE line per pick maximum (under the pick line). Not a separate "BOARD FLOW" section.

4. The CHAOS BRANCH must be:
   - ONE sentence describing the disruptive event (specific, plausible — trade-up, medical flag, run at a position, rival reach).
   - Then 2–3 lines showing how the team adapts and why it still works.
   - Chaos means the board shifts — not absurd reaches or profiles that violate PROSPECT SLOT VALIDATION.

5. BOARD WATCH BEFORE THURSDAY is 2–3 specific pre-draft storylines that directly affect THIS team's picks — not generic draft advice.

6. CONFIDENCE: ONE appearance only, at the end. Do not repeat simulation disclaimers elsewhere. No duplicate "offseason snapshot" lines outside CONFIDENCE.

7. Only name prospects from the verified 2026 draft pool. Honor PROSPECT SLOT VALIDATION above.

REQUIRED FORMAT — use this structure (replace brackets with real picks/slots for the requested rounds):

[TEAM] DRAFT SIMULATION — 2026

SENSIBLE BOARD

Pick [overall #]: [Player], [Position], [School]
[One line — why this pick at this slot]

Pick [overall #]: [Player], [Position], [School]
[One line — why]

(add lines for each pick the user asked for — must match this team's actual slots from Picks above)

---

CHAOS BRANCH

[One sentence: the disruptive event]
[2–3 lines: how the team adapts and why it still works — may reference different prospect names if slots change, still validated]

---

BOARD WATCH BEFORE THURSDAY
• [Specific storyline — direct impact on this team's board]
• [Another specific storyline]
• [Optional third]

CONFIDENCE
Simulation. Pre-draft consensus board + verified prospect pool. Accuracy sharpens once live trades and day-of decisions are known.[If DATA FRESHNESS requires it, append one short staleness clause here only — nowhere else.]`
    : teamCapitalBlock
      ? `TEAM PICK-BY-PICK SIMULATION:
- Anchored team: ${focusTeam}. Use TEAM DRAFT CAPITAL rows in order when user asks for pick-by-pick outcomes.
- Never present a name as a locked-in league selection pre-draft; frame as likely paths.`
      : ""
}

${
  draftTeamSimulationInject
    ? ""
    : nflDraftAngle && nflDraftWindowActive
    ? ""
    : nflDraftAngle
    ? `NO-MARKET / DRAFT ANGLE (when the question is draft-centric, not a priced prop, and you are outside the pre/during-draft windowed analysis above):
You are NOT allowed to stall with "wait until the draft" as the whole answer.

Instead:
1. Open with board truth: their Round 1 slot(s) from NFL DRAFT BOARD and any trade-note capital.
2. Map roster need → 2–3 realistic target buckets (position/archetype), without claiming a player "will" go at a specific pick unless clearly hypothetical.
3. Name one trade-up or trade-back lever that fits their slot + needs.
4. End with a live trigger: what combine / medical / pro-day / smoke-screen signal would flip the lean.

Skip the generic "two active NFL players from the prop board" requirement when this block applies.`
    : `NO-MARKET FALLBACK RULE (mandatory when prop boards or weekly lines are empty in context but games or usage data imply an upcoming slate)

You are NOT allowed to respond with "wait for lines" or "come back when props drop"
as the primary answer.

Instead, do ALL of the following:

1. Open with a confident pre-market call: anytime TD, passing yards, rushing
   yards, or receptions — anchored to defense tier data and player role from
   nflContext.

${NO_MARKET_VERIFIED_PLAYER_STEP_2}

3. For each player (when at least two names exist on the NFL PLAYER POOL above), state:
   - The prop type to watch
   - A pre-market band in words ("fade yards if the line opens above 275")
   - Reasoning from matchup defense tiers, red-zone role, or snap context in the payload

4. Tie offense to opposing defense tiers and game environment when those fields exist.

5. End with a live trigger: quarter or script cue that would confirm the lean
   (e.g. "If they're trailing early, check live pass attempts over").

Never open with "props aren't out." Give named players and monitoring hooks.`
}`;

    userPrompt = questionPropSlice
      ? `${questionPropSlice}\n\n${nflUserPromptBody}`
      : nflUserPromptBody;
  } else if (sportHint === "derby") {
    userPrompt = `You are answering a Kentucky Derby 2026 betting question.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${question}

STATIC DERBY FIELD DATA is appended to your system instructions — use it as the authoritative source for post positions, morning-line style odds, trainer/jockey, edges, and editorial verdicts.

Rules:
- Answer as a horse racing / Derby analyst using that appendix; cite horses by name and post when relevant.
- Do not invent runners or prices outside the appendix.
- Do not pivot to NBA, NFL, MLB, tennis, golf, or F1 unless the user explicitly asks.

Confidence guidance:
- Default confidence should be ${derivedConfidence}.`;
  } else if (sportHint === "worldcup" && wcContext?.promptBlock) {
    const entityBindingBlock = buildEntityBindingPromptBlock(wcRequiredEntities);
    const priceBindingBlock = buildPriceBindingPromptBlock(
      String(question || ""),
      wcRequiredEntities,
      wcIntent,
    );
    const wcMatchupBlock =
      wcIntent === WC_INTENT.MATCHUP
        ? buildWcMatchupIntentRules({ phase: wcContext?.phase || "GROUP_STAGE" })
        : "";
    const isWcRulesIntent = wcIntent === WC_INTENT.RULES;
    const isWcMatchupIntent = wcIntent === WC_INTENT.MATCHUP;
    const isWcPlayerMarketIntentFlag = isWcPlayerMarketIntent(wcIntent);
    const wcPlayerMarketResolved = isWcPlayerMarketIntentFlag
      ? resolveWcPlayerMarketResponse(String(question || ""), wcIntent, wcContext)
      : null;
    const wcPlayerMarketBlock =
      wcPlayerMarketResolved?.promptAppendix && !wcPlayerMarketResolved.forcePass
        ? `${wcPlayerMarketResolved.promptAppendix}\n\n`
        : "";
    const wcRoleLine = isWcRulesIntent
      ? "You are answering a factual 2026 FIFA World Cup rules question."
      : isWcMatchupIntent
        ? "You are answering a 2026 FIFA World Cup group/matchup advancement question."
        : isWcPlayerMarketIntentFlag
          ? "You are answering a 2026 FIFA World Cup player-market question (Golden Boot / top scorer / named player)."
          : "You are answering a 2026 FIFA World Cup betting question.";
    const wcIntentRules = isWcRulesIntent
      ? `- Answer with tournament rules only. Do NOT lead with a betting take or group-stage prediction.
- Lead sentence one with the direct answer about extra time, penalties, or the specific rule asked.
- No team advancement picks unless the user asked about a specific matchup.
- Do NOT reference prior chat turns, teams, or pricing/matchup questions — this turn is rules-only.`
      : isWcMatchupIntent
        ? `- Return JSON per OUTPUT CONTRACT: summary = balanced advancement read (150 words max); deep = full reasoning (no word limit).
- Sentence one must name BOTH required teams and their strength tags from VERIFIED CONTEXT.
- Use only teams, groups, fixtures, and results from WORLD CUP 2026 — VERIFIED CONTEXT above.
- Reference strength as Favorite / Contender / Longshot — never cite Elo or numeric power ratings.
- If CURRENT OUTRIGHT ODDS is missing or STALE, use cautious structural language — no overconfident winner picks.
- Do not invent scores, lineups, or odds not supported by the context block.
- Stay on World Cup 2026 (USA, Mexico, Canada hosts; June 11 — July 19, 2026).`
        : isWcPlayerMarketIntentFlag
          ? `- Return JSON per OUTPUT CONTRACT: summary = player-market read (150 words max); deep = full reasoning (no word limit).
- Sentence one must name a PLAYER from PLAYER MARKETS — VERIFIED CONTEXT — never only a country/national team as the scorer pick.
- Use GOLDEN BOOT / TOP SCORER ODDS rows when present — cite American prices (e.g. Mbappé +600).
- If lineups are not confirmed, say so once — still rank named early contenders with available odds or squad form.
- Do not invent player names, goal counts, or Golden Boot prices not in VERIFIED CONTEXT.
- Stay on World Cup 2026 (USA, Mexico, Canada hosts; June 11 — July 19, 2026).`
          : `- Return JSON per OUTPUT CONTRACT: summary = punchy verdict (150 words max); deep = full reasoning (no word limit).
- Always answer the user's question directly in summary sentence one. State the take, name the team, give the verdict. Do not open with context or setup. The lead is the answer. Follow with 2-3 sentences of supporting reasoning only in summary.
- Use only teams, groups, fixtures, and results from WORLD CUP 2026 — VERIFIED CONTEXT above.
- Reference strength as Favorite / Contender / Longshot — never cite Elo or numeric power ratings.
- When claiming a team is "mispriced" you MUST cite the exact odds from the CURRENT OUTRIGHT ODDS block in VERIFIED CONTEXT (team abbreviation + price) and the block must not be marked STALE.
- If CURRENT OUTRIGHT ODDS is missing, marked STALE, or says no live odds are available, never use the word "mispriced". Use structural language instead (e.g. "Based on group strength...").
- For match 1X2 moneylines, cite only prices from FIXTURE MATCH ODDS when present and not marked STALE; otherwise use Elo win/draw/loss structure only.
- Only include data relevant to the current tournament phase and the specific question; do not bloat with irrelevant groups or matches.
- In knockout phases, follow KNOCKOUT STAGE RULES in VERIFIED CONTEXT — 90-minute moneylines do not settle advancement; ET/pens apply if level.
- For "can X still win the tournament?" use CITED TEAM PATH — if a team is eliminated, state that clearly.
- Do not invent scores, lineups, or odds not supported by the context block.
- Stay on World Cup 2026 (USA, Mexico, Canada hosts; June 11 — July 19, 2026).`;

    userPrompt = `${wcRoleLine}

${wcPriorTakesSummary ? wcPriorTakesSummary + "\n\n" : ""}${entityBindingBlock ? `${entityBindingBlock}\n\n` : ""}${priceBindingBlock ? `${priceBindingBlock}\n\n` : ""}${wcMatchupBlock ? `${wcMatchupBlock}\n\n` : ""}${wcPlayerMarketBlock}${wcContext.promptBlock}

Question:
${question}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.

Rules:
${wcIntentRules}`;
  } else if (matchupContext) {
    // DATA FRESHNESS: this sport reads from live APIs — no staleness injection needed.
    // If you ever add hardcoded fallbacks, add dataFreshness to the payload.
    userPrompt = `You are answering a betting question about this matchup.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${question}

Matchup context:
${JSON.stringify(matchupContext || {}, null, 2)}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Only go above that if the input strongly justifies it.

${buildUrTakeSportTurnScopeRules(matchupContext?.league ? String(matchupContext.league).toLowerCase() : "generic")}

Rules:
- Stay within the matchup and its sport.
- Do not invent unrelated teams, players, or props.`;
  } else {
    // DATA FRESHNESS: this sport reads from live APIs — no staleness injection needed.
    // If you ever add hardcoded fallbacks, add dataFreshness to the payload.
    const continuationRule =
      shortMarketFollowUp && hasLiveTranscriptContext
        ? `
CONTINUATION RULE — SHORT LIVE FOLLOW-UP
- Recent transcript includes live/screenshot game context. Reuse that game context instead of cold-starting.
- Give a provisional conditional lean now (not a locked bet): "Lean X if number/scope condition holds."
- Ask exactly ONE compact clarifier for the decision-critical missing input (usually exact live number + full game vs 1H).
- Acknowledge uncertainty once, then move to analysis. Do not repeat cannot-assess phrasing and do not output long missing-input checklists.
- Do not fabricate an exact live total/line and do not imply certainty when price/scope is missing.
- If you reference arithmetic (pace math, current score totals, points needed, possession projections), show the exact calculation inline so users can verify it instantly. Format example: "Score: 78 + 72 = 150. Points needed: 219.5 - 150 = 69.5."
`
        : "";

    userPrompt = `You are answering a sports betting question.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${question}

Available context:
${JSON.stringify({
  sportHint,
  matchupContext: matchupContext || null,
  hasImage,
  shortMarketFollowUp,
  hasLiveTranscriptContext,
}, null, 2)}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Only go above that if the input strongly justifies it.

${buildUrTakeSportTurnScopeRules(sportHint)}

Rules:
- Stay within the sport most clearly implied by the question and the attached context.
- If the sport is ambiguous, answer conservatively and do not invent specifics — never refuse or redirect for sport-routing reasons.
- Do not make up games, players, or props that are not supported by the prompt.
${continuationRule}`;
  }

  const messages = buildMessagesForAnthropic({
    userPrompt,
    history: incomingHistory,
    intent,
    hasImage,
    image,
  });

  /** Single user-turn prompt body (embedded JSON contexts live here). Anthropic `messages` also contain prior turns when present. */
  const contextPayload = { userPrompt };
  const contextPayloadJson = JSON.stringify(contextPayload);
  const messagesJson = JSON.stringify(messages);
  const userPromptCharCount = userPrompt.length;

  const hasNoChatHistory = normalizedUrTakeHistoryForGate.length === 0;
  const nbaHasUsableContext =
    !!nbaContext &&
    (Array.isArray(nbaContext?.todaysGames) && nbaContext.todaysGames.length > 0 ||
      Array.isArray(nbaContext?.playerStats) && nbaContext.playerStats.length > 0 ||
      Array.isArray(nbaContext?.propLines) && nbaContext.propLines.length > 0 ||
      !!nbaContext?.liveBoxscore);
  if (sportHint === "nba" && hasNoChatHistory && !nbaHasUsableContext) {
    const response =
      "The NBA feed is loading — check back closer to tip-off or ask about a specific player or matchup and I'll work with what's available.";
    const fallbackTake = extractTakeFromResponse({
      responseText: response,
      sport: "nba",
      intent,
      question,
    });
    return res.status(200).json({
      requestId,
      response,
      responseDeep: null,
      responseFormat: "plain",
      statusShift: null,
      decisionMode: nbaDecisionMode,
      sport: "nba",
      intent,
      take: takeClientPayload(fallbackTake),
      fallback: true,
      fallbackReason: "empty_nba_context",
    });
  }

  if (sportHint === "golf" && hasNoChatHistory && !golfContextEffective) {
    const response =
      "Golf context is still loading. Ask about a specific tournament, player, or matchup and I'll work with what's available.";
    const fallbackTake = extractTakeFromResponse({
      responseText: response,
      sport: "golf",
      intent,
      question,
    });
    return res.status(200).json({
      requestId,
      response,
      responseDeep: null,
      responseFormat: "plain",
      statusShift: null,
      decisionMode: null,
      sport: "golf",
      intent,
      take: takeClientPayload(fallbackTake),
      fallback: true,
      fallbackReason: "empty_golf_context",
    });
  }

  /** Gate quota: reserve before Anthropic; release in `finally` unless take is delivered. */
  let gateQuotaReservation = null;
  let gateQuotaDelivered = false;
  const gateQuotaEnforce = shouldEnforceGateQuotaForTake({
    enforceFlag: isGateServerQuotaEnforce(),
    dailyTakePipeline,
    urAuth,
  });
  const gateQuotaEmail =
    gateQuotaEnforce && urAuth?.ok && urAuth.email
      ? String(urAuth.email).toLowerCase().trim()
      : null;
  const gateQuotaSessionId =
    gateQuotaEnforce && urAuth?.ok && !gateQuotaEmail && urAuth.sessionId
      ? String(urAuth.sessionId).trim()
      : null;

  if (gateQuotaEmail) {
    const reserved = await reserveGateQuota(gateQuotaEmail);
    if (reserved.limitReached) {
      return res.status(200).json({
        requestId,
        limitReached: true,
        code: "limit_reached",
        freeQuota: reserved.freeQuota,
      });
    }
    if (reserved.reservationTs != null) {
      gateQuotaReservation = {
        kind: "email",
        id: gateQuotaEmail,
        reservationTs: reserved.reservationTs,
      };
    }
  } else if (gateQuotaSessionId) {
    const reserved = await reserveSessionQuota(gateQuotaSessionId);
    if (reserved.limitReached) {
      return res.status(200).json({
        requestId,
        limitReached: true,
        code: "email_required",
        reason: "email_required",
        freeQuota: reserved.freeQuota,
      });
    }
    if (reserved.reservationTs != null) {
      gateQuotaReservation = {
        kind: "session",
        id: gateQuotaSessionId,
        reservationTs: reserved.reservationTs,
      };
    }
  }

  try {
    const factualQuestion = isSettledFactQuestion(question);
    const selectedTemperature = factualQuestion ? 0.2 : 0.45;

    const tokenBudget =
      draftTeamSimulationInject
        ? 2600
        : effectiveStructuredModeRequested
          ? 4200
          : outputJsonMode === "tier2_5_json"
            ? 4200
            : outputJsonMode === "tier2_live_json"
              ? 2200
              : outputJsonMode === "tier1_json"
                ? 700
                : outputJsonMode === "plain" &&
                    !isConversationFollowUp &&
                    Boolean(liveSignals?.isEffectivelyLive)
                  ? isPro
                    ? 700
                    : 500
                : isPro ? 1400 : 800;

    // Pro depth guidance only for plain-text full cards — never override JSON contracts,
    // follow-up brevity rules, or draft simulation routes.
    const shouldApplyProDepthAppendix =
      isPro &&
      outputJsonMode === "plain" &&
      !isConversationFollowUp &&
      !draftTeamSimulationInject;

    const proDepthAppendix = shouldApplyProDepthAppendix ? `

[PRO SESSION — DEPTH UNLOCKED]
You are responding to a Pro subscriber. Apply the following:
- Complete the full five-step framework without truncating the structural anchor or close. Do not compress reasoning to meet brevity targets.
- End every analysis card with an explicit verdict block. Use the format appropriate to odds availability:

  If odds ARE available:
  THE PLAY: [lean/fade/pass] · [High/Medium/Speculative] confidence · [one sharp sentence on why]

  If odds are NOT available (no live lines in context):
  THE PLAY: [lean/fade/pass] · [High/Medium/Speculative] confidence · [one sharp sentence on why] — when the line posts, watch for [specific player + specific stat threshold]

- If session history exists, open with one sentence that connects this query to the prior take before building the new card. Do not repeat full prior reasoning — reference it, then advance.
- If evidence is thin, say so plainly in the verdict block rather than omitting it. Thin context, capped confidence, honest close is better than a padded card.
- Never fabricate a line, spread, or total that is not present in the context payload. If odds are unavailable, the verdict close must be directional only — no invented numbers.
` : "";

    const systemPromptWithProAppendix = `${systemPromptForModel}${proDepthAppendix}`;

    if (sportHint === "nba" && nbaContext?.rosterGrounding) {
      console.log(
        "[ur-take] NBA rosterGroundingQuality:",
        nbaContext.rosterGrounding.rosterGroundingQuality ?? "absent",
      );
    }
    const nbaCtxJsonChars =
      sportHint === "nba" ? contextJsonForModel(nbaContextForModel ?? {}).length : null;
    console.log(
      `[ur-take] context: sport=${String(
        sportHint || "unknown",
      )} systemPromptChars=${systemPromptWithProAppendix.length} contextPayloadChars=${userPromptCharCount}${
        nbaCtxJsonChars != null ? ` nbaContextJsonChars=${nbaCtxJsonChars}` : ""
      }`,
    );

    const qaCoherenceContext =
      sportHint === "nba" &&
      nbaGroundingSnapshot &&
      nbaGroundingSnapshot.verifiedPlayerToTeam instanceof Map &&
      nbaGroundingSnapshot.verifiedPlayerToTeam.size > 0
        ? {
            allowedTeamAbbreviations: nbaMatchup
              ? nbaGroundingSnapshot.focusAllowedTeams || []
              : nbaGroundingSnapshot.slateTeamAbbrevs || [],
            knownPlayerToTeam: nbaGroundingSnapshot.verifiedPlayerToTeam,
          }
        : undefined;

    const nbaInventedShadow =
      sportHint === "nba" &&
      nbaMatchup &&
      nbaGroundingSnapshot &&
      Array.isArray(nbaGroundingSnapshot.focusAllowedTeams) &&
      nbaGroundingSnapshot.focusAllowedTeams.length === 2
        ? {
            allowlistLower: buildAllowlistLowerSetFromSnapshot(nbaGroundingSnapshot),
            matchupTeams: /** @type {[string, string]} */ ([
              String(nbaGroundingSnapshot.focusAllowedTeams[0] || "").toUpperCase(),
              String(nbaGroundingSnapshot.focusAllowedTeams[1] || "").toUpperCase(),
            ]),
          }
        : undefined;

    const tennisContextForQa =
      sportHint === "tennis" || sportHint === "tennis_wta_profile"
        ? buildTennisStructuralQaContext({ liveMatches, players })
        : undefined;

    const qaPostOptsBase = {
      sport: sportHint,
      question: String(question || ""),
      nbaContext: nbaContextForModel,
      mlbContext:
        sportHint === "mlb" && mlbContext && typeof mlbContext === "object" ? mlbContext : undefined,
      tennisContext: tennisContextForQa,
      golfContext:
        sportHint === "golf" && golfContextEffective && typeof golfContextEffective === "object"
          ? golfContextEffective
          : undefined,
      f1Context:
        sportHint === "f1" && f1Context && typeof f1Context === "object" ? f1Context : undefined,
      intent,
      liveMode: Boolean(liveSignals?.isEffectivelyLive),
      coherenceContext: qaCoherenceContext,
      nbaGroundingSnapshot: sportHint === "nba" ? nbaGroundingSnapshot : undefined,
      nbaInventedShadow,
    };

    let responseText = "";
    let responseDeep = null;
    let responseFormat = "plain";
    let responseStatusShift = null;
    let lastQaPost = null;
    let qaAttemptCount = 0;
    let qaFallbackApplied = false;
    /** Critical QA codes from the prior generation attempt (used to tailor NBA grounding repair suffix). */
    let prevQaCriticalCodes = [];

    let structuredResponse = null;
    /** Last non-empty Anthropic text for this QA attempt — used if post-process strips everything. */
    let lastNonEmptyRawModelText = "";
    let nbaGroundingRedirectUsed = false;
    let wcPlayerMarketPassUsed = false;

    if (sportHint === "worldcup" && isWcPlayerMarketIntent(wcIntent)) {
      const wcPlayerResolved = resolveWcPlayerMarketResponse(
        String(question || ""),
        wcIntent,
        wcContext,
      );
      if (wcPlayerResolved.forcePass) {
        structuredResponse = wcPlayerResolved.structured;
        responseText = wcPlayerResolved.responseText;
        responseDeep = wcPlayerResolved.responseDeep;
        responseFormat = effectiveStructuredModeRequested ? "structured" : "plain";
        wcPlayerMarketPassUsed = true;
        wcRelevanceLog.playerMarketTier =
          wcPlayerResolved.playerMarketTier || wcRelevanceLog.playerMarketTier;
        console.log(
          JSON.stringify({
            event: "ur_take_wc_player_market_pass",
            sport: "worldcup",
            wcIntent,
            playerMarketTier: wcPlayerResolved.playerMarketTier,
            dataConfidence: wcContext?.dataConfidence || null,
          }),
        );
      }
    }

    if (
      structuredModeRequested &&
      sportHint === "nba" &&
      nbaContext &&
      nbaMatchup &&
      nbaMatchupPool
    ) {
      const redirectStructured = tryBuildNbaGroundingRedirectStructured({
        question: String(question || ""),
        nbaContext,
        nbaMatchup,
        nbaMatchupPool,
        nbaGroundingSnapshot,
      });
      if (redirectStructured) {
        structuredResponse = redirectStructured;
        nbaGroundingRedirectUsed = true;
        console.log(
          JSON.stringify({
            event: "ur_take_nba_grounding_redirect",
            sport: "nba",
            matchup: nbaMatchup?.label || null,
          }),
        );
      }
    }

    for (let qaAttempt = 0; qaAttempt < 2; qaAttempt++) {
      qaAttemptCount = qaAttempt + 1;
      const previousStructured = structuredResponse;
      if (!nbaGroundingRedirectUsed && !wcPlayerMarketPassUsed) {
        structuredResponse = null;
      }
      const broToneRepairSuffix =
        qaAttempt > 0 &&
        prevQaCriticalCodes.some((c) => String(c || "").startsWith("bro_tone_"))
          ? BRO_TONE_REGENERATION_SUFFIX
          : "";
      const universalStructuralRepairSuffix =
        qaAttempt > 0 &&
        !broToneRepairSuffix &&
        prevQaCriticalCodes.some((c) => String(c || "").startsWith("structural_"))
          ? UNIVERSAL_STRUCTURAL_REGENERATION_SUFFIX
          : "";
      const nbaStructuralRepairSuffix =
        sportHint === "nba" &&
        qaAttempt > 0 &&
        !broToneRepairSuffix &&
        !universalStructuralRepairSuffix &&
        prevQaCriticalCodes.some((c) => String(c || "").startsWith("nba_structural"))
          ? NBA_STRUCTURAL_REGENERATION_SUFFIX
          : "";
      const nbaGroundingRepairSuffix =
        sportHint === "nba" &&
        qaAttempt > 0 &&
        !nbaStructuralRepairSuffix &&
        prevQaCriticalCodes.some((c) => {
          const s = String(c || "");
          return s.startsWith("nba_grounding") || s === "nba_unverified_out_claim";
        })
          ? NBA_GROUNDING_REGENERATION_SUFFIX
          : "";
      const wcQaRepairSuffix =
        sportHint === "worldcup" && qaAttempt > 0
          ? `${WC_QA_REGENERATION_SUFFIX}${
              prevQaCriticalCodes.includes("wc_player_question_team_lead")
                ? WC_PLAYER_MARKET_QA_SUFFIX
                : ""
            }`
          : "";
      if (nbaGroundingRedirectUsed && structuredResponse) {
        responseText = formatStructuredResponseAsUrTakeProse(structuredResponse);
        responseDeep = null;
        responseFormat = "plain";
        const qaOptsRedirect = {
          ...qaPostOptsBase,
          structuredLean: String(structuredResponse.lean || ""),
        };
        lastQaPost = runUnderReviewPostProcess(responseText, qaOptsRedirect);
        responseText = lastQaPost.text;
        if (structuredResponse?.lean) {
          structuredResponse.lean = sanitizeLeanBroTone(structuredResponse.lean);
        }
        prevQaCriticalCodes = lastQaPost.qa.criticalRegenerationCodes || [];
        break;
      }

      if (wcPlayerMarketPassUsed && structuredResponse) {
        responseText =
          responseText || formatStructuredResponseAsUrTakeProse(structuredResponse);
        responseDeep = null;
        responseFormat = effectiveStructuredModeRequested ? "structured" : "plain";
        lastQaPost = runUnderReviewPostProcess(responseText, {
          ...qaPostOptsBase,
          structuredLean: String(structuredResponse.lean || ""),
        });
        responseText = lastQaPost.text;
        const wcPassQa = runWcUrTakeQA({
          responseText,
          structured: structuredResponse,
          question: String(question || ""),
          wcIntent,
          requiredEntities: wcRequiredEntities,
          forbiddenEntities: wcForbiddenEntities,
          strengthTags: wcStrengthTags,
          playerMarketKv: wcContext?.playerMarketKv,
          playerMarketTier: wcRelevanceLog.playerMarketTier,
        });
        wcRelevanceLog.qaEntityMatch = wcPassQa.qaEntityMatch;
        wcRelevanceLog.qaIntentMatch = wcPassQa.qaIntentMatch;
        wcRelevanceLog.qaPlayerMatch = wcPassQa.qaPlayerMatch;
        break;
      }

      let systemForAttempt =
        qaAttempt === 0
          ? systemPromptWithProAppendix
          : `${systemPromptWithProAppendix}${QA_REGENERATION_SYSTEM_SUFFIX}${broToneRepairSuffix}${universalStructuralRepairSuffix}${nbaStructuralRepairSuffix}${nbaGroundingRepairSuffix}${wcQaRepairSuffix}`;
      if (effectiveStructuredModeRequested) {
        systemForAttempt += getStructuredURTakePrompt();
        if (isConversationFollowUp) {
          systemForAttempt += `

[FOLLOW-UP + STRUCTURED — OUTPUT CHANNEL]
Structured JSON mode overrides the follow-up "3–5 sentences / no headers" prose rules.
Respond with ONLY the JSON object from STRUCTURED RESPONSE MODE. Answer the follow-up inside whyNow, edge, and analysis fields (keep each field tight; all required keys must be present).
`;
        }
      }
      const temperatureForAttempt =
        qaAttempt === 0 ? selectedTemperature : Math.min(selectedTemperature, 0.28);

      const systemPromptChars = systemForAttempt.length;
      const contextPayloadChars = contextPayloadJson.length;
      const messagesChars = messagesJson.length;
      /** Sum requested for audits; note userPrompt is duplicated inside `messages`, so this overstates unique bytes. */
      const totalChars = systemPromptChars + contextPayloadChars + messagesChars;
      /** Closer to Anthropic request body text volume: system + messages only (user prompt counted once). */
      const anthropicWireApproxChars = systemPromptChars + messagesChars;
      console.log("[UR_TAKE_REQUEST_SIZE]", {
        qaAttempt: qaAttempt + 1,
        sportHint: String(sportHint || "unknown"),
        intent: String(intent || ""),
        isConversationFollowUp,
        systemPromptChars,
        contextPayloadChars,
        messagesChars,
        totalChars,
        anthropicWireApproxChars,
        estimatedTokens: Math.ceil(totalChars / 4),
        estimatedTokensAnthropicWire: Math.ceil(anthropicWireApproxChars / 4),
        userPromptChars: userPromptCharCount,
        ...(nbaCtxJsonChars != null ? { nbaContextJsonChars: nbaCtxJsonChars } : {}),
      });

      if (sportHint === "nba") {
        logNbaUrTakeAuditIfDev({
          phase: "pre_model",
          qaAttempt: qaAttempt + 1,
          sportHint: String(sportHint || "unknown"),
          matchup: nbaMatchup
            ? {
                awayAbbr: nbaMatchup.awayAbbr,
                homeAbbr: nbaMatchup.homeAbbr,
                label: nbaMatchup.label,
              }
            : null,
          injuryRowsForModel: (nbaContextForModel?.injuries || []).slice(0, 80).map((r) => ({
            player: r?.player,
            team: r?.team,
            status: r?.status,
          })),
          injuryRowCount: Array.isArray(nbaContextForModel?.injuries) ? nbaContextForModel.injuries.length : 0,
          playerStatsCount: Array.isArray(nbaContextForModel?.playerStats) ? nbaContextForModel.playerStats.length : 0,
          propLinesCount: Array.isArray(nbaContextForModel?.propLines) ? nbaContextForModel.propLines.length : 0,
          questionCharCount: String(question || "").length,
        });
      }

      const anthropicT0 = Date.now();
      const result = await callAnthropic({
        apiKey: ANTHROPIC_API_KEY,
        model: ANTHROPIC_MODEL,
        system: systemForAttempt,
        messages,
        temperature: temperatureForAttempt,
        max_tokens: tokenBudget,
      });
      anthropicMs += Date.now() - anthropicT0;

      if (!result.ok) {
        if (result.rateLimitedExhausted) {
          const exhaustedFallbackReason = "upstream_rate_limit";
          console.error("[ur-take] upstream retries exhausted", {
            requestId,
            providerRequestId: result.requestId,
            status: result.status,
            upstreamError: result.data?.error ?? null,
            data: result.data,
            fallbackReason: exhaustedFallbackReason,
          });
          return res.status(503).json({
            error: "Couldn't complete that read. Try again.",
            code: "upstream_unavailable",
            fallbackReason: exhaustedFallbackReason,
            requestId,
            providerRequestId: result.requestId,
          });
        }

        console.error("Anthropic error:", {
          requestId,
          providerRequestId: result.requestId,
          status: result.status,
          model: ANTHROPIC_MODEL,
          data: result.data,
        });

        const upstreamType = result.data?.error?.type || "anthropic_error";
        console.error("[ur-take] upstream Anthropic error:", {
          requestId,
          providerRequestId: result.requestId,
          status: result.status,
          type: upstreamType,
          message: result.data?.error?.message || result.data?.message || null,
        });

        let rawSlice = null;
        try {
          rawSlice = JSON.stringify(result.data).slice(0, 1200);
        } catch {
          rawSlice = String(result.data).slice(0, 1200);
        }
        return feedSnagResponse(sportHint, "provider_non_ok", {
          questionLength: String(question || "").length,
          providerStatus: result.status,
          providerErrorName: upstreamType,
          providerErrorMessage:
            result.data?.error?.message || result.data?.message || `HTTP ${result.status}`,
          rawModelText: rawSlice,
          extra: { providerRequestId: result.requestId },
        });
      }

      // If structured mode was requested, extract and validate JSON
      if (effectiveStructuredModeRequested) {
        try {
          const responseTextRaw = extractAnthropicText(result.data).trim();
          const parsedObj =
            tryParseJsonObject(responseTextRaw) ||
            extractBalancedJsonObject(responseTextRaw);
          if (
            !parsedObj ||
            typeof parsedObj !== "object" ||
            Array.isArray(parsedObj)
          ) {
            throw new Error("structured_response_not_json_object");
          }
          structuredResponse = normalizeStructuredUrTakeResponse(parsedObj, sportHint);
          structuredResponse = repairStructuredForDelivery(structuredResponse, sportHint);
          if (sportHint === "worldcup" && structuredResponse) {
            structuredResponse = normalizeWcStructuredForDelivery(
              structuredResponse,
              wcIntent,
              String(question || ""),
              wcRequiredEntities,
            );
            if (isWcPlayerMarketIntent(wcIntent) && structuredResponse) {
              structuredResponse.playerMarketTier =
                wcRelevanceLog.playerMarketTier || wcContext?.playerMarketTier || null;
            }
            if (wcIntent === WC_INTENT.ENTITY_PRICING) {
              const sessionPrices = extractSessionAmericanOdds(incomingHistory);
              structuredResponse = stripWcStructuredSessionPrices(
                structuredResponse,
                String(question || ""),
                sessionPrices,
              );
            }
          }
          if (structuredResponse?.lean) {
            structuredResponse.lean = sanitizeLeanBroTone(structuredResponse.lean);
          }
          if (sportHint === "nba" && nbaContext) {
            structuredResponse = applyNbaPropRecentFormContradiction(structuredResponse, {
              question,
              nbaContext,
            });
          }

          // Validate
          const validation = validateStructuredURTakeResponse(structuredResponse);
          logLeanContractIfMissing(structuredResponse);
          if (!validation.valid) {
            console.error("[STRUCTURED_UR_TAKE_VALIDATION_ERROR]", {
              requestId,
              errors: validation.errors,
            });
            logUrTakeApiFallback({
              requestId,
              fallbackReason: "response_shape_validation_failed",
              sport: sportHint || "unknown",
              validationErrors: validation.errors,
              rawModelText: String(responseTextRaw || "").slice(0, 4000),
              questionLength: String(question || "").length,
              structuredKeys:
                structuredResponse && typeof structuredResponse === "object"
                  ? Object.keys(structuredResponse)
                  : null,
            });

            try {
              globalThis.Sentry?.captureException(new Error("Structured UR Take validation failed"), {
                tags: { phase: "structured_response_validation", sport: sportHint },
                extra: { validationErrors: validation.errors },
                level: "error",
              });
            } catch (e) {
              // Sentry error, skip
            }

            // Invalid structured response — fall back to prose for this attempt (QA may retry)
            structuredResponse = null;
          }
        } catch (parseError) {
          console.error("[STRUCTURED_UR_TAKE_PARSE_ERROR]", {
            requestId,
            error: parseError.message,
            responsePreview: extractAnthropicText(result.data).slice(0, 200),
          });
          logUrTakeApiFallback({
            requestId,
            fallbackReason: "model_parse_failed",
            sport: sportHint || "unknown",
            parseErrorMessage: parseError?.message,
            rawModelText: extractAnthropicText(result.data).slice(0, 4000),
            questionLength: String(question || "").length,
          });

          try {
            globalThis.Sentry?.captureException(parseError, {
              tags: { phase: "structured_response_parse", sport: sportHint },
              extra: {
                responsePreview: extractAnthropicText(result.data).slice(0, 500),
              },
              level: "error",
            });
          } catch (e) {
            // Sentry error, skip
          }

          structuredResponse = null;
        }
      }

      if (effectiveStructuredModeRequested && !structuredResponse && previousStructured) {
        structuredResponse = previousStructured;
      }

      let text = stripBrokenQuoteFragments(extractAnthropicText(result.data));

      if (
        effectiveStructuredModeRequested &&
        !structuredResponse &&
        sportHint === "nba" &&
        nbaContext &&
        nbaMatchup &&
        nbaMatchupPool &&
        isNbaGroundingProseRefusal(text)
      ) {
        const proseRedirect = tryBuildNbaGroundingRedirectStructured({
          question: String(question || ""),
          nbaContext,
          nbaMatchup,
          nbaMatchupPool,
          nbaGroundingSnapshot,
        });
        if (proseRedirect) {
          structuredResponse = proseRedirect;
          text = formatStructuredResponseAsUrTakeProse(proseRedirect);
          console.log(
            JSON.stringify({
              event: "ur_take_nba_grounding_redirect",
              sport: "nba",
              source: "prose_refusal_interceptor",
              matchup: nbaMatchup?.label || null,
            }),
          );
        }
      }

      if (text && String(text).trim()) {
        lastNonEmptyRawModelText = String(text).trim();
      }

      if (!text) {
        let rawSlice = null;
        try {
          rawSlice = JSON.stringify(result.data).slice(0, 1200);
        } catch {
          rawSlice = String(result?.data).slice(0, 1200);
        }
        const blockTypes = Array.isArray(result.data?.content)
          ? result.data.content.map((b) => b?.type).filter(Boolean)
          : [];
        return feedSnagResponse(sportHint, "model_empty_text", {
          questionLength: String(question || "").length,
          providerStatus: result.status,
          providerErrorName: result.data?.stop_reason || null,
          rawModelText: rawSlice,
          extra: { contentBlockTypes: blockTypes },
        });
      }

      responseText = text;
      responseDeep = null;
      responseFormat = "plain";
      responseStatusShift = null;
      if (structuredResponse && typeof structuredResponse === "object") {
        if (sportHint === "worldcup" && wcIntent === WC_INTENT.RULES) {
          structuredResponse = null;
        } else {
          const formatted = formatStructuredResponseAsUrTakeProse(structuredResponse);
          responseText = formatted.trim() ? formatted : text;
          responseDeep = null;
          responseFormat = "plain";
        }
      } else if (outputJsonMode !== "plain") {
        const parsed = tryParseJsonObject(text) || tryExtractSummaryDeepFromLooseText(text);
        if (parsed && typeof parsed.summary === "string" && parsed.summary.trim()) {
          const normalized = normalizeSummaryDeepPayload(parsed.summary, parsed.deep);
          responseText = normalized.summary;
          responseDeep = normalized.deep;
          if (typeof parsed.statusShift === "string" && parsed.statusShift.trim()) {
            responseStatusShift = parsed.statusShift.trim();
          }
          responseFormat = outputJsonMode;
        } else if (sportHint === "worldcup" && wcIntent === WC_INTENT.RULES) {
          const coerced = coerceWcRulesModelText(text, null);
          responseText = coerced.text;
          responseDeep = coerced.deep;
          responseFormat = outputJsonMode;
        } else if (outputJsonMode === "tier2_5_json") {
          const normalized = normalizeSummaryDeepPayload(text, null);
          responseText = normalized.summary || text;
          responseDeep = normalized.deep;
        }
      } else if (sportHint === "worldcup" && wcIntent === WC_INTENT.RULES) {
        const coerced = coerceWcRulesModelText(text, null);
        responseText = coerced.text;
        responseDeep = coerced.deep;
      }

      if (sportHint === "nba") {
        responseText = stripNbaLeadInDisclosure(responseText);
        if (responseDeep) responseDeep = stripNbaLeadInDisclosure(responseDeep);
        responseText = stripNbaInternalControlLabels(responseText);
        if (responseDeep) responseDeep = stripNbaInternalControlLabels(responseDeep);
        if (isNbaNoMarketUpcomingSlate(nbaContext) && hasNbaNoMarketHardFail(responseText)) {
          responseText = buildNbaNoMarketHardFallback(question, nbaContext);
          responseDeep = null;
          responseFormat = "plain";
          nbaFallbackOrRepairUsed = true;
        }
        if (nbaInvalidation.requiresStatusAcknowledgement && !responseStatusShift && nbaStatusShiftLine) {
          responseStatusShift = nbaStatusShiftLine;
        }
        if (nbaDecisionMode === "conditional_wait" && !/\b(wait|contingen|status|confirm)\b/i.test(responseText)) {
          responseText = `Status is unresolved. Wait for final availability before locking a prop.\n\n${responseText}`;
        }
        if (
          nbaMatchupGroundingApplied &&
          nbaOffMatchupPromptAcknowledgement &&
          !responseText.includes(nbaOffMatchupPromptAcknowledgement)
        ) {
          responseText = `${nbaOffMatchupPromptAcknowledgement}\n\n${responseText}`;
        }
        if (nbaMatchup && nbaMatchupPool && nbaMatchupPool.allowedTeams.length === 2) {
          nbaPostValidationChecked = true;
          const allowedTeamSet = new Set(
            nbaMatchupPool.allowedTeams.map((t) => String(t || "").toUpperCase()),
          );
          const knownMap = nbaMatchupPool.knownPlayerToTeam;
          const mentionsSummary = extractMentionedPlayersFromOutput(responseText, knownMap);
          const mentionsDeep = extractMentionedPlayersFromOutput(responseDeep || "", knownMap);
          const invalidSummary = validatePlayersAgainstMatchup(
            mentionsSummary,
            allowedTeamSet,
            knownMap,
          );
          const invalidDeep = validatePlayersAgainstMatchup(
            mentionsDeep,
            allowedTeamSet,
            knownMap,
          );
          const invalidAll = [...invalidSummary, ...invalidDeep].filter(
            (v, i, arr) =>
              arr.findIndex(
                (x) => x.player.toLowerCase() === v.player.toLowerCase() && x.team === v.team,
              ) === i,
          );
          if (invalidAll.length > 0) {
            nbaPostValidationTriggered = true;
            nbaFallbackOrRepairUsed = true;
            const firstInvalid = invalidAll[0];
            const invalidKey = normalizePlayerNameKey(firstInvalid?.player);
            const redirectStructured =
              structuredModeRequested &&
              nbaMatchupPool &&
              invalidKey
                ? tryBuildNbaGroundingRedirectStructured({
                    question: String(question || ""),
                    nbaContext,
                    nbaMatchup,
                    nbaMatchupPool,
                    nbaGroundingSnapshot,
                    forcedOffPlayer: {
                      playerKey: invalidKey,
                      teamAbbr: String(firstInvalid?.team || "").toUpperCase(),
                      reason: "off_matchup",
                    },
                  })
                : null;
            if (redirectStructured) {
              structuredResponse = redirectStructured;
              responseText = formatStructuredResponseAsUrTakeProse(redirectStructured);
              console.log(
                JSON.stringify({
                  event: "ur_take_nba_grounding_redirect",
                  sport: "nba",
                  source: "post_validation",
                  invalidPlayers: invalidAll.slice(0, 3),
                }),
              );
            } else {
              responseText = repairOrRegenerateInvalidMatchupOutput({
                matchup: nbaMatchup,
                pool: nbaMatchupPool,
                invalidPlayers: invalidAll,
              });
            }
            responseDeep = null;
            responseFormat = "plain";
            responseStatusShift = null;
          }
        }
      }

      responseText = stripBannedDataAvailabilityOpener(responseText);
      if (responseDeep) responseDeep = stripBannedDataAvailabilityOpener(responseDeep);
      responseText = stripBannedPerformanceTrackerLines(responseText);
      if (responseDeep) responseDeep = stripBannedPerformanceTrackerLines(responseDeep);

      const qaOptsThisAttempt = {
        ...qaPostOptsBase,
        structuredLean:
          structuredResponse && typeof structuredResponse === "object"
            ? String(structuredResponse.lean || "")
            : undefined,
      };
      lastQaPost = runUnderReviewPostProcess(responseText, qaOptsThisAttempt);
      responseText = lastQaPost.text;
      if (structuredResponse?.lean) {
        structuredResponse.lean = sanitizeLeanBroTone(structuredResponse.lean);
      }

      let wcQaResult = null;
      if (sportHint === "worldcup") {
        wcQaResult = runWcUrTakeQA({
          responseText,
          structured: structuredResponse,
          question: String(question || ""),
          wcIntent,
          requiredEntities: wcRequiredEntities,
          forbiddenEntities: wcForbiddenEntities,
          strengthTags: wcStrengthTags,
          playerMarketKv: wcContext?.playerMarketKv,
          playerMarketTier: wcRelevanceLog.playerMarketTier,
        });
        wcRelevanceLog.qaEntityMatch = wcQaResult.qaEntityMatch;
        wcRelevanceLog.qaIntentMatch = wcQaResult.qaIntentMatch;
        wcRelevanceLog.qaPlayerMatch = wcQaResult.qaPlayerMatch;
        if (!wcQaResult.passed) {
          console.log(
            JSON.stringify({
              event: "ur_take_wc_relevance_qa",
              sport: "worldcup",
              wcIntent,
              issueCodes: wcQaResult.issueCodes,
              qaEntityMatch: wcQaResult.qaEntityMatch,
              qaIntentMatch: wcQaResult.qaIntentMatch,
              qaPlayerMatch: wcQaResult.qaPlayerMatch,
              playerPropDetected: wcRelevanceLog.playerPropDetected,
              regenerationAttempt: qaAttempt,
              headlinePreview: wcQaResult.headlinePreview,
            }),
          );
        }
      }

      const groundingEvents = lastQaPost.qa.groundingEvents || [];
      if (sportHint === "nba" && groundingEvents.length > 0) {
        console.log(
          JSON.stringify({
            event: "ur_take_nba_grounding_qa",
            sport: "nba",
            ruleCodes: [...new Set(groundingEvents.map((e) => e.ruleCode))],
            failures: groundingEvents,
            regenerationAttempted: qaAttempt > 0,
          }),
        );
      }
      prevQaCriticalCodes = lastQaPost.qa.criticalRegenerationCodes || [];
      if (sportHint === "nba") {
        logNbaUrTakeAuditIfDev({
          phase: "post_qa",
          qaAttempt: qaAttempt + 1,
          sportHint: "nba",
          qaCritical: prevQaCriticalCodes,
          groundingEvents: (lastQaPost.qa.groundingEvents || []).slice(0, 20),
          answerPreview: String(responseText || "").slice(0, 4000),
          answerLength: String(responseText || "").length,
        });
      }
      console.log(
        JSON.stringify({
          ...lastQaPost.qa.metricsLine,
          regenerationAttempt: qaAttempt,
          qaRegenerated: qaAttempt > 0,
        }),
      );

      if (responseDeep) {
        const deepPost = runUnderReviewPostProcess(responseDeep, {
          ...qaPostOptsBase,
          nbaInventedShadow: undefined,
        });
        responseDeep = deepPost.text;
      }

      if (!responseText || responseText.trim().length < 50) {
        responseText = responseDeep || responseText;
      }

      if (sportHint === "worldcup" && wcIntent === WC_INTENT.RULES) {
        const bleedForbidden = [...wcForbiddenEntities, ...wcRequiredEntities];
        const finalized = finalizeWcRulesDelivery({
          responseText,
          responseDeep,
          question: String(question || ""),
          bleedForbidden,
          structuredResponse,
        });
        responseText = finalized.responseText;
        responseDeep = finalized.responseDeep;
        structuredResponse = finalized.structuredResponse;
      }

      if (
        (!qaRequiresRegeneration(lastQaPost.qa) && !wcQaRequiresRegeneration(wcQaResult)) ||
        qaAttempt >= 1
      ) {
        break;
      }
      if (wcQaRequiresRegeneration(wcQaResult)) {
        prevQaCriticalCodes = [...prevQaCriticalCodes, ...(wcQaResult?.issueCodes || [])];
      }
    }

    if (lastQaPost && qaRequiresRegeneration(lastQaPost.qa)) {
      const fb = runUnderReviewPostProcess(responseText, {
        ...qaPostOptsBase,
        applySafeFallbackPrefix: true,
      });
      responseText = fb.text;
      lastQaPost = fb;
      qaFallbackApplied = true;
      console.log(
        JSON.stringify({
          event: "ur_take_qa_fallback",
          sport: sportHint || "generic",
          score: fb.qa?.score,
          criticalRegenerationCodes: fb.qa?.criticalRegenerationCodes,
        }),
      );
    }

    if (!responseText || responseText.trim().length < 50) {
      responseText = responseDeep || responseText;
    }

    if (
      sportHint === "worldcup" &&
      isWcPlayerMarketIntent(wcIntent) &&
      wcQaResult &&
      !wcQaResult.passed &&
      ((wcQaResult.issueCodes || []).includes("wc_player_question_team_lead") ||
        (wcQaResult.issueCodes || []).includes("wc_player_missing_names"))
    ) {
      const tier = wcContext?.playerMarketTier || "market_only";
      const prebuilt = buildWcPlayerMarketPrebuiltStructured(
        String(question || ""),
        wcIntent,
        tier,
        wcContext?.playerMarketKv?.goldenBoot,
      );
      if (prebuilt) {
        structuredResponse = prebuilt;
        responseText = `${prebuilt.lean}\n\n${prebuilt.whyNow}`;
        responseDeep = null;
        wcRelevanceLog.qaPlayerMatch = "pass";
        wcRelevanceLog.playerMarketTier = prebuilt.playerMarketTier;
        console.log(
          JSON.stringify({
            event: "ur_take_wc_player_market_repair",
            sport: "worldcup",
            wcIntent,
            playerMarketTier: prebuilt.playerMarketTier,
            priorIssueCodes: wcQaResult.issueCodes,
          }),
        );
      }
    }

    if (sportHint === "worldcup" && wcIntent === WC_INTENT.RULES) {
      const bleedForbidden = [...wcForbiddenEntities, ...wcRequiredEntities];
      const finalized = finalizeWcRulesDelivery({
        responseText,
        responseDeep,
        question: String(question || ""),
        bleedForbidden,
        structuredResponse,
      });
      responseText = finalized.responseText;
      responseDeep = finalized.responseDeep;
      structuredResponse = finalized.structuredResponse;
    } else if (sportHint === "worldcup" && structuredResponse && typeof structuredResponse === "object") {
      structuredResponse = normalizeWcStructuredForDelivery(
        structuredResponse,
        wcIntent,
        String(question || ""),
        wcRequiredEntities,
      );
      if (wcIntent === WC_INTENT.ENTITY_PRICING) {
        const sessionPrices = extractSessionAmericanOdds(incomingHistory);
        structuredResponse = stripWcStructuredSessionPrices(
          structuredResponse,
          String(question || ""),
          sessionPrices,
        );
        responseText = stripSessionBleedPrices(
          responseText,
          String(question || ""),
          sessionPrices,
        );
        if (responseDeep) {
          responseDeep = stripSessionBleedPrices(
            responseDeep,
            String(question || ""),
            sessionPrices,
          );
        }
      }
    }

    let takeRecord = extractTakeFromResponse({
      responseText,
      sport: sportHint || "generic",
      intent,
      question,
    });
    if (sportHint === "nba") {
      takeRecord = ensureNbaTakeConfidenceConsistency({
        takeRecord,
        decisionMode: nbaDecisionMode,
        derivedConfidence,
        confidenceModifier: nbaConfidenceModifier,
      });
      // Post-gen vocabulary normalizer — runs on every NBA response, not gated on missing confidence.
      responseText = normalizeConfidenceVocabularyInText(responseText);
      if (responseDeep) responseDeep = normalizeConfidenceVocabularyInText(responseDeep);
      if (takeRecord && typeof takeRecord === "object" && takeRecord.confidence) {
        takeRecord = {
          ...takeRecord,
          confidence: normalizeConfidenceVocabularyInText(String(takeRecord.confidence)),
        };
      }
    }

    responseText = stripUrTakeDeadEndCopy(responseText);
    if (responseDeep) responseDeep = stripUrTakeDeadEndCopy(responseDeep);

    const nbaMeta =
      sportHint === "nba"
        ? buildNbaObservabilityMeta({
            decisionMode: nbaDecisionMode,
            sport: "nba",
            matchupGroundingApplied: nbaMatchupGroundingApplied,
            postValidationChecked: nbaPostValidationChecked,
            postValidationTriggered: nbaPostValidationTriggered,
            fallbackOrRepairUsed: nbaFallbackOrRepairUsed,
          })
        : null;
    if (nbaMeta) logNbaObservability(nbaMeta);

    // Non-critical side effect: never fail the response if take logging fails.
    if (userEmail) {
      appendTakeForUser(userEmail, takeRecord).catch((e) => {
        console.warn("take logging failed:", e?.message || e);
      });
    }

    if (!responseText || responseText.trim().length === 0) {
      if (lastNonEmptyRawModelText.trim()) {
        console.error("[ur-take] recovered_empty_post_process", {
          requestId,
          sport: sportHint || "unknown",
          recoveredChars: lastNonEmptyRawModelText.length,
          questionLength: String(question || "").length,
        });
        responseText = lastNonEmptyRawModelText;
      } else {
        console.error("[ur-take] empty_response_after_processing", {
          requestId,
          questionHead: String(question || "").slice(0, 100),
        });
        return feedSnagResponse(sportHint, "empty_response_after_processing", {
          questionLength: String(question || "").length,
          rawModelText: "",
          structuredKeys: structuredResponse && typeof structuredResponse === "object" ? Object.keys(structuredResponse) : null,
        });
      }
    }

    if (userEmail && isPro && !isConversationFollowUp) {
      void (async () => {
        try {
          const src = String(responseText || "");
          const playMatch = src.match(/THE PLAY[:\s]+([^\n]{10,200})/i);
          const playText =
            (playMatch?.[1] && String(playMatch[1]).trim()) ||
            String(takeRecord?.playLine || "").trim();
          if (playText.length >= 10) {
            const confRaw = String(takeRecord?.confidence || "");
            const confidenceTier = /\bHigh\b/i.test(confRaw)
              ? "High"
              : /\bSpeculative\b/i.test(confRaw)
                ? "Speculative"
                : /\bMedium\b/i.test(confRaw)
                  ? "Medium"
                  : "Medium";
            const dateStr = new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });

            const { player, market, direction, line, anchor } = extractStructuredFromPlayText(playText);

            await saveSessionMemory(userEmail, [
              {
                v: 1,
                sport: String(sportHint || "unknown"),
                play: playText.slice(0, 200),
                player,
                market,
                direction,
                line,
                anchor,
                confidence: confidenceTier,
                date: dateStr,
              },
            ]);
          }
        } catch {
          /* never block */
        }
      })();
    }

    const qaSummaryForLog = lastQaPost?.qa
      ? {
          score: lastQaPost.qa.score,
          issueCodes: lastQaPost.qa.issueCodes,
          criticalRegenerationCodes: lastQaPost.qa.criticalRegenerationCodes,
          regenerationAttempts: qaAttemptCount,
          qaFallbackApplied,
          passedCriticalGates:
            !qaRequiresRegeneration(lastQaPost.qa) || qaFallbackApplied,
        }
      : null;

    /** Live-mode chips only: plain answer, effective live (keyword and/or board), not a conversation follow-up turn. */
    let followUpsField;
    if (
      shouldAttachLiveFollowUps({
        outputJsonMode,
        isEffectivelyLive: liveSignals?.isEffectivelyLive,
        hasLiveKeyword: liveSignals?.hasLiveKeyword,
        isConversationFollowUp,
      })
    ) {
      try {
        const haikuT0 = Date.now();
        const fus = await generateLiveFollowUpsWithHaiku(responseText, ANTHROPIC_API_KEY);
        haikuFollowUpsMs = Date.now() - haikuT0;
        if (Array.isArray(fus) && fus.length >= 2) {
          followUpsField = fus;
        }
      } catch (e) {
        console.warn("[ur-take] followUps:", e?.message || e);
      }
    }

    const liveModeFlag = Boolean(liveSignals?.isEffectivelyLive);

    const nbaPlayoffFocusLog =
      sportHint === "nba" && nbaContext?.urTakeParsing
        ? {
            playoffFocusMode: Boolean(nbaContext.urTakeParsing.playoffFocusMode),
            playoffFocusTeamCount: nbaContext.urTakeParsing.playoffFocusTeamCount ?? 0,
            playoffPrioritySource: nbaContext.urTakeParsing.playoffPrioritySource ?? "none",
            playoffSeriesRowsReturned: nbaContext.urTakeParsing.playoffSeriesRowsReturned ?? 0,
            playoffSeriesRowsScoreVisible:
              nbaContext.urTakeParsing.playoffSeriesRowsScoreVisible ?? 0,
            statsBundleAbbrevs: nbaContext.urTakeParsing.statsBundleAbbrevs ?? [],
            effectiveFocusAbbrevs: nbaContext.urTakeParsing.effectiveFocusAbbrevs ?? [],
            deepHydratedTeams: nbaContext.urTakeParsing.deepHydratedTeams ?? [],
            directTeamOverride: Boolean(nbaContext.urTakeParsing.directTeamOverride),
            nonPlayoffTeamRequested: Boolean(nbaContext.urTakeParsing.nonPlayoffTeamRequested),
          }
        : {};

    const nbaRelevanceLog =
      sportHint === "nba"
        ? buildNbaRelevanceLog({
            question: String(question || ""),
            history: incomingHistory,
            nbaContext,
            nbaContextFromClient,
            mustFetchNbaBoard: nbaRelevanceMustFetch,
            serverBoardFetched: nbaRelevanceServerBoardFetched,
            clientContextUsable: nbaRelevanceClientContextUsable,
            liveBoardRefreshForced: nbaLiveBoardRefreshForced,
            clientContextIgnored: nbaClientContextIgnored,
            outrightsInjected: Boolean(nbaFinalsOutrightsMeta?.outrightsInjected),
            seriesOutrightsStale: nbaFinalsOutrightsMeta?.seriesStale ?? null,
            mvpOutrightsStale: nbaFinalsOutrightsMeta?.mvpStale ?? null,
            seriesOutrightsAgeMinutes: nbaFinalsOutrightsMeta?.seriesAgeMinutes ?? null,
            mvpOutrightsAgeMinutes: nbaFinalsOutrightsMeta?.mvpAgeMinutes ?? null,
            finalsMode: nbaFinalsModeMeta?.finalsMode ?? null,
            finalsSeriesSummary: nbaFinalsModeMeta?.seriesState?.seriesScoreLabel ?? null,
            finalsGameNumber: nbaFinalsModeMeta?.seriesState?.gameNumber ?? null,
            finalsContextInjected: Boolean(nbaFinalsContextBlock),
            nbaMatchup,
            isConversationFollowUp,
            qaSummary: qaSummaryForLog,
          })
        : null;

    console.log(
      JSON.stringify({
        requestId,
        event: "ur_take_complete",
        sport: sportHint,
        mode: nbaDecisionMode || "standard",
        bettingStyle,
        oddsAvailable,
        fallback: nbaFallbackOrRepairUsed || false,
        confidenceTier: takeRecord?.confidence || "unknown",
        structuredInPayload: Boolean(structuredResponse),
        contextChars: userPromptCharCount,
        durationMs: Date.now() - requestStart,
        isFollowUp: isConversationFollowUp,
        isPro,
        qa: qaSummaryForLog,
        liveMode: liveModeFlag,
        hasLiveKeyword: Boolean(liveSignals?.hasLiveKeyword),
        isBoardLive: Boolean(liveSignals?.isBoardLive),
        isEffectivelyLive: Boolean(liveSignals?.isEffectivelyLive),
        followUpsAttached: Boolean(followUpsField?.length),
        followUpsCount: followUpsField?.length ?? 0,
        nbaBoardBuildMs,
        anthropicMs,
        haikuFollowUpsMs,
        ...nbaPlayoffFocusLog,
        ...(sportHint === "worldcup" ? { wcRelevance: wcRelevanceLog } : {}),
        ...(nbaRelevanceLog ? { nbaRelevance: nbaRelevanceLog } : {}),
      }),
    );

    const responseBody = {
      requestId,
      response: responseText,
      responseDeep,
      responseFormat,
      statusShift: responseStatusShift,
      decisionMode:
        sportHint === "nba"
          ? nbaDecisionMode
          : sportHint === "mlb"
            ? mlbDecisionMode
            : null,
      ...(nbaDebugEnabled && nbaMeta ? { nbaDebug: nbaMeta } : {}),
      sport: sportHint || "generic",
      intent,
      liveMode: liveModeFlag,
      take: takeClientPayload(takeRecord),
      ...(qaSummaryForLog ? { qaSummary: qaSummaryForLog } : {}),
      ...(followUpsField ? { followUps: followUpsField } : {}),
      ...(sportHint === "worldcup" && wcIntent
        ? { wcIntent, userQuestion: String(question || "").trim() }
        : {}),
    };

    if (structuredResponse) {
      responseBody.structured = structuredResponse;
    }

    if (sportHint === "worldcup" && wcContext?.dataConfidence) {
      responseBody.dataConfidence = wcContext.dataConfidence;
    }

    if (gateQuotaEmail) {
      gateQuotaDelivered = true;
      try {
        responseBody.freeQuota = await getFreeQuotaStatus(gateQuotaEmail);
      } catch {
        /* optional mirror payload */
      }
    } else if (gateQuotaSessionId) {
      gateQuotaDelivered = true;
      try {
        responseBody.freeQuota = await getSessionQuotaStatus(gateQuotaSessionId);
      } catch {
        /* optional mirror payload */
      }
    }

    return res.status(200).json(responseBody);
  } catch (err) {
    console.error("[urTakeApiException]", {
      requestId,
      name: err?.name,
      message: err?.message,
      stack: err?.stack ? String(err.stack).slice(0, 2000) : undefined,
    });
    const s =
      req.body && typeof req.body.sportHint === "string" ? req.body.sportHint.trim() : null;
    return feedSnagResponse(s, "exception_caught", {
      questionLength: String(req.body?.question || "").length,
      err,
      providerErrorName: err?.name,
      providerErrorMessage: err?.message,
      rawModelText: "",
    });
  } finally {
    if (gateQuotaReservation && !gateQuotaDelivered) {
      if (gateQuotaReservation.kind === "session") {
        await releaseSessionQuota(
          gateQuotaReservation.id,
          gateQuotaReservation.reservationTs,
        );
      } else {
        await releaseGateQuota(
          gateQuotaReservation.id,
          gateQuotaReservation.reservationTs,
        );
      }
    }
  }
}
