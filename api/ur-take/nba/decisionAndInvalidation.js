/** @file NBA invalidation, confidence, decision modes — extracted from handler.js */
import { countNbaActiveSlatePropSignals } from "../../../shared/nbaPostedPropMarkets.js";
import {
  findFirstPlayerStatRowForQuestion,
  inferNbaPropDirection,
  inferPropDirectionFromText,
  nbaOverVsRecentFormContradiction,
  nbaUnderVsSeasonAverageImplausible,
  parseNbaRequestedMarket,
  resolveNbaRequestedMarket,
} from "../../_nbaPropSanity.js";
import { getNbaInjuryIndex, hasMaterialNbaNewsImpact } from "./injuryIndex.js";
import { normalizeNbaMarketPlayerKey } from "./keys.js";
import { resolveQuestionNbaPlayers } from "./playerResolution.js";

export { normalizeNbaMarketPlayerKey } from "./keys.js";

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

export function isDirectNbaPropAsk(question) {
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

export function detectNbaAvailabilityIntent(question) {
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

export function buildNbaPlayerResolutionBlock(invalidation) {
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
