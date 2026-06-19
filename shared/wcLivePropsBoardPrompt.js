/**
 * Match-specific player props board guidance — live score, KV lines, ranked picks.
 */

import { formatWcLiveGameStateLine } from "./wcKickoffDisplay.js";
import { wcMatchupTeamDisplayName } from "./wcMatchupWinnerLine.js";
import {
  collapseMatchPlayerPropRowsForDisplay,
  hasMatchPlayerPropRows,
  matchPlayerPropRowsFromEvent,
  WC_MATCH_PLAYER_PROP_PROMPT_LABELS,
} from "./wcMatchPlayerProps.js";

/**
 * @param {string} odds
 */
function americanImpliedProb(odds) {
  const s = String(odds || "").trim();
  const n = Number.parseInt(s.replace(/^\+/, ""), 10);
  if (!Number.isFinite(n)) return 0;
  if (s.startsWith("-")) return n / (n + 100);
  return 100 / (n + 100);
}

/**
 * @param {string} odds
 */
function americanOddsRank(odds) {
  const raw = String(odds || "").trim().replace(/^\+/, "");
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return 999999;
  if (String(odds).startsWith("-")) return n;
  return n + 1000;
}

/**
 * @param {Record<string, unknown> | null | undefined} match
 * @param {string} [homeAbbr]
 * @param {string} [awayAbbr]
 */
export function formatWcLiveMatchStatePhrase(match, homeAbbr, awayAbbr) {
  if (!match || typeof match !== "object") return "";

  const home = String(homeAbbr || match.homeTeam || "")
    .trim()
    .toUpperCase();
  const away = String(awayAbbr || match.awayTeam || "")
    .trim()
    .toUpperCase();
  const homeDisplay = wcMatchupTeamDisplayName(home);
  const awayDisplay = wcMatchupTeamDisplayName(away);

  const hs = Number(match.homeScore);
  const as = Number(match.awayScore);
  const hasScore = Number.isFinite(hs) && Number.isFinite(as);
  const status = String(match.status || "").toLowerCase();

  /** @type {string} */
  let scorePhrase = "";
  if (hasScore) {
    if (hs > as && homeDisplay) scorePhrase = `${homeDisplay} leads ${hs}-${as}`;
    else if (as > hs && awayDisplay) scorePhrase = `${awayDisplay} leads ${as}-${hs}`;
    else scorePhrase = `${hs}-${as} tied`;
  }

  /** @type {string} */
  let clockPhrase = "";
  const minuteRaw = match.minute != null ? String(match.minute).trim().replace(/'/g, "") : "";
  if (status === "ht") clockPhrase = "at halftime";
  else if (status === "1h" || status === "1st") {
    clockPhrase = minuteRaw ? `in the ${minuteRaw}th minute (1st half)` : "in the 1st half";
  } else if (status === "2h" || status === "2nd") {
    clockPhrase = minuteRaw ? `in the ${minuteRaw}th minute (2nd half)` : "in the 2nd half";
  } else if (minuteRaw) {
    clockPhrase = `in the ${minuteRaw}th minute`;
  } else {
    const ribbon = formatWcLiveGameStateLine(match, home, away);
    const clockBit = ribbon.split(" · ").find((p) => /'|HT|1H|2H/i.test(p));
    if (clockBit === "HT") clockPhrase = "at halftime";
    else if (clockBit) clockPhrase = `at ${clockBit}`;
  }

  if (scorePhrase && clockPhrase) return `${scorePhrase} ${clockPhrase}`;
  return scorePhrase || clockPhrase || formatWcLiveGameStateLine(match, home, away);
}

/**
 * @param {string} question
 * @param {Record<string, unknown> | null | undefined} propsPayload
 */
export function resolvePrimaryPropsMarketFromQuestion(question, propsPayload) {
  const q = String(question || "").trim();
  if (/1\s*\+?\s*shots?|one or more shots?|to have \d+\s*shots?/i.test(q)) {
    return "player_shots_ou";
  }
  if (/\bsot\b|shots?\s+on\s+target|on target/i.test(q)) {
    return "player_sot_ou";
  }
  if (/anytime|goalscorer|to score|score a goal/i.test(q)) {
    return "anytime_scorer";
  }
  if (/assist/i.test(q)) {
    return "player_assists_ou";
  }

  const markets = propsPayload?.markets;
  if (markets && typeof markets === "object") {
    for (const key of [
      "player_shots_ou",
      "player_sot_ou",
      "anytime_scorer",
      "player_goal_or_assist",
    ]) {
      const rows = Array.isArray(markets[key]) ? markets[key] : [];
      if (rows.some((r) => r?.name && r?.americanOdds)) return key;
    }
  }
  return "player_shots_ou";
}

/**
 * @param {string} market
 * @param {string | undefined} line
 */
function marketLineLabel(market, line) {
  const lineNum = Number.parseFloat(String(line ?? "").trim());
  if (market === "player_shots_ou" && Number.isFinite(lineNum) && lineNum <= 1) {
    return "1+ shots";
  }
  if (market === "player_sot_ou" && Number.isFinite(lineNum) && lineNum <= 0.5) {
    return "1+ SOT";
  }
  if (line != null && String(line).trim()) {
    return `Over ${line}`;
  }
  return WC_MATCH_PLAYER_PROP_PROMPT_LABELS[market] || market;
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} market
 * @param {string} reason
 */
function formatPropsPick(row, market, reason) {
  const name = String(row.name || "").trim();
  const odds = String(row.americanOdds || "").trim();
  const nation = row.nationAbbr ? String(row.nationAbbr).toUpperCase() : "";
  const lineLabel = marketLineLabel(market, row.line != null ? String(row.line) : undefined);
  return {
    name,
    odds,
    nationAbbr: nation,
    lineLabel,
    label: `${name}${nation ? ` (${nation})` : ""} ${lineLabel} ${odds}`,
    reason,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} propsPayload
 * @param {Record<string, unknown> | null | undefined} match
 * @param {object} opts
 */
export function buildWcPropsBoardPickRecommendations(propsPayload, match, opts = {}) {
  const market = String(opts.market || "player_shots_ou");
  const homeAbbr = String(opts.homeAbbr || match?.homeTeam || "")
    .trim()
    .toUpperCase();
  const awayAbbr = String(opts.awayAbbr || match?.awayTeam || "")
    .trim()
    .toUpperCase();

  const raw = matchPlayerPropRowsFromEvent(propsPayload, /** @type {import("./wcMatchPlayerProps.js").WcMatchPlayerPropMarket} */ (market), 60);
  const filtered = raw.filter((r) => {
    const side = String(r.side || "over").toLowerCase();
    if (side && side !== "over" && side !== "yes") return false;
    if (market.includes("_ou")) {
      const line = Number.parseFloat(String(r.line ?? ""));
      if (Number.isFinite(line) && line > 1.5) return false;
    }
    return true;
  });
  const rows = collapseMatchPlayerPropRowsForDisplay(filtered, market);
  if (!rows.length) return [];

  const ranked = rows
    .map((r) => ({
      ...r,
      impliedProb: americanImpliedProb(String(r.americanOdds || "")),
      oddsRank: americanOddsRank(String(r.americanOdds || "")),
    }))
    .sort((a, b) => a.oddsRank - b.oddsRank);

  const hs = Number(match?.homeScore);
  const as = Number(match?.awayScore);
  const trailingAbbr =
    Number.isFinite(hs) && Number.isFinite(as)
      ? hs < as
        ? homeAbbr
        : as < hs
          ? awayAbbr
          : null
      : null;
  const trailingDisplay = trailingAbbr ? wcMatchupTeamDisplayName(trailingAbbr) : null;

  /** @type {Array<ReturnType<typeof formatPropsPick>>} */
  const picks = [];
  const used = new Set();

  const chalk = ranked.find((r) => r.impliedProb >= 0.68) || ranked[0];
  if (chalk) {
    picks.push(
      formatPropsPick(
        chalk,
        market,
        `Board favorite on ${marketLineLabel(market, chalk.line != null ? String(chalk.line) : undefined)} — books price ${Math.round(chalk.impliedProb * 100)}% implied; safest volume leg on the board`,
      ),
    );
    used.add(String(chalk.name));
  }

  const value = ranked.find(
    (r) =>
      !used.has(String(r.name)) &&
      String(r.americanOdds || "").startsWith("+") &&
      r.impliedProb >= 0.32 &&
      r.impliedProb <= 0.52,
  );
  if (value) {
    picks.push(
      formatPropsPick(
        value,
        market,
        `Plus-money tier with ${Math.round(value.impliedProb * 100)}% implied — better payout than the chalk without full longshot risk`,
      ),
    );
    used.add(String(value.name));
  }

  if (trailingAbbr) {
    const script = ranked.find(
      (r) =>
        !used.has(String(r.name)) &&
        String(r.nationAbbr || "").toUpperCase() === trailingAbbr &&
        r.impliedProb >= 0.42,
    );
    if (script) {
      picks.push(
        formatPropsPick(
          script,
          market,
          `${trailingDisplay} trailing — expect more shooting volume as they chase the result`,
        ),
      );
      used.add(String(script.name));
    }
  }

  if (picks.length < 3) {
    const next = ranked.find((r) => !used.has(String(r.name)));
    if (next) {
      picks.push(
        formatPropsPick(
          next,
          market,
          `Next tier on the board at ${next.americanOdds} — secondary option if you want a different nation or price`,
        ),
      );
    }
  }

  return picks.slice(0, 3);
}

/**
 * Synthesized target lean for probes/tests (mirrors LLM binding without calling Claude).
 * @param {object} opts
 */
export function buildWcPropsBoardTargetLeanPreview(opts = {}) {
  const {
    match = null,
    propsPayload = null,
    priorLean = null,
    question = "",
    homeName = "",
    awayName = "",
    homeAbbr = "",
    awayAbbr = "",
  } = opts;

  if (!hasMatchPlayerPropRows(propsPayload)) return null;

  const liveState = formatWcLiveMatchStatePhrase(match, homeAbbr, awayAbbr);
  const market = resolvePrimaryPropsMarketFromQuestion(question, propsPayload);
  const marketLabel =
    market === "player_shots_ou"
      ? "Player to Have 1+ Shots"
      : WC_MATCH_PLAYER_PROP_PROMPT_LABELS[market] || market;
  const picks = buildWcPropsBoardPickRecommendations(propsPayload, match, {
    market,
    homeAbbr,
    awayAbbr,
  });
  if (!picks.length) return null;

  const totalsRaw = String(priorLean?.lean || priorLean?.call || "").trim();
  const totalsMatch = totalsRaw.match(/\b(Under|Over)\s+[\d.]+(?:\s+goals?)?/i);
  const totalsHold = totalsMatch ? ` Still holding the ${totalsMatch[0]} match lean.` : "";

  const liveLead = liveState ? `${liveState}. ` : "";
  const pickLines = picks
    .map((p, i) => {
      const tier = i === 0 ? "Best chalk" : i === 1 ? "Value" : "Match-script";
      return `${tier}: ${p.label} — ${p.reason}`;
    })
    .join("; ");

  return `${liveLead}On ${marketLabel}: ${pickLines}.${totalsHold}`.trim();
}

/**
 * Binding prompt block when BDL props are posted for a generic thread follow-up.
 * @param {import("./wcTurnConstants.js").WcTurnPlan | null | undefined} plan
 * @param {{ homeName?: string, awayName?: string }} fixture
 * @param {object} opts
 */
export function buildWcPostedGenericPropsFollowUpPromptBlock(plan, fixture = {}, opts = {}) {
  const propsPayload = opts.propsPayload ?? null;
  const match = opts.match ?? null;
  const question = String(opts.question || "").trim();
  const homeRaw = String(fixture.homeName || plan?.pinnedHome || "").trim();
  const awayRaw = String(fixture.awayName || plan?.pinnedAway || "").trim();
  const homeName = homeRaw.length <= 4 ? wcMatchupTeamDisplayName(homeRaw) : homeRaw;
  const awayName = awayRaw.length <= 4 ? wcMatchupTeamDisplayName(awayRaw) : awayRaw;
  const homeAbbr = String(plan?.pinnedHome || match?.homeTeam || homeRaw).toUpperCase();
  const awayAbbr = String(plan?.pinnedAway || match?.awayTeam || awayRaw).toUpperCase();

  const liveState = formatWcLiveMatchStatePhrase(match, homeAbbr, awayAbbr);
  const market = resolvePrimaryPropsMarketFromQuestion(question, propsPayload);
  const marketLabel =
    market === "player_shots_ou"
      ? "Player to Have 1+ Shots (Over 0.5)"
      : WC_MATCH_PLAYER_PROP_PROMPT_LABELS[market] || market;
  const picks = buildWcPropsBoardPickRecommendations(propsPayload, match, {
    market,
    homeAbbr,
    awayAbbr,
    priorLean: plan?.priorLean,
  });

  const priorTotals = String(plan?.priorLean?.lean || plan?.priorLean?.call || "").trim();
  const targetLean =
    buildWcPropsBoardTargetLeanPreview({
      match,
      propsPayload,
      priorLean: plan?.priorLean,
      question,
      homeName,
      awayName,
      homeAbbr,
      awayAbbr,
    }) || "Name 2–3 specific posted legs with odds and reconcile with the prior match lean.";

  const pickJson = picks.map((p) => ({
    player: p.name,
    nation: p.nationAbbr,
    line: p.lineLabel,
    odds: p.odds,
    tier: p.reason.split(" — ")[0],
    reason: p.reason,
  }));

  return [
    "WC GENERIC PROPS FOLLOW-UP — LINES POSTED (binding; match-specific picks required)",
    `Fixture: ${homeName} vs ${awayName}. BDL player prop lines ARE posted — use markets from the grounding packet only.`,
    liveState ? `Live state (lead with this): ${liveState}.` : "",
    `Primary market focus: ${marketLabel}.`,
    priorTotals ? `Prior match lean to preserve: ${priorTotals}.` : "",
    "REQUIRED: (1) open with live score + clock, (2) name exactly 2–3 picks from the board with American odds and nation, (3) tag each as chalk / value / match-script with data-driven reasoning (odds tier + game state), (4) hold the prior totals/ML lean unless the user asked to pivot, (5) no generic 'look at volume shooters' without naming players and lines.",
    `Recommended pick ladder (cite these or equivalent from grounding markets[].topLegs): ${JSON.stringify(pickJson)}`,
    `Target lean line (use or closely match): "${targetLean}"`,
  ]
    .filter(Boolean)
    .join("\n");
}
