/**
 * Golf outright winner markets: multiple selections are mutually exclusive.
 * Users often describe dutching / basket coverage ("$1 on 3 players") — not parlays.
 */

/** @typedef {"outright"|"placement"|"matchup"|"unknown"} GolfMarketType */
/** @typedef {"single"|"basket"|"parlay"|"unknown"} BetStructureType */

/** Common PGA surnames for NL name-list detection (lowercase). */
const GOLF_SURNAME_HINTS = new Set([
  "rahm",
  "mcilroy",
  "rory",
  "scheffler",
  "scottie",
  "spieth",
  "morikawa",
  "hovland",
  "fleetwood",
  "thomas",
  "schauffele",
  "burns",
  "henley",
  "hatton",
  "dechambeau",
  "koepka",
  "woods",
  "fowler",
  "rose",
  "lowry",
  "fitzpatrick",
  "homa",
  "clark",
  "young",
  "aberg",
  "smalley",
  "cantlay",
  "xander",
  "finau",
  "reed",
  "matsuyama",
  "day",
]);

/**
 * @param {string} q normalized question
 * @returns {number}
 */
function countGolfSurnameHints(q) {
  const tokens = q.split(/[^a-z]+/).filter(Boolean);
  let n = 0;
  const seen = new Set();
  for (const t of tokens) {
    if (GOLF_SURNAME_HINTS.has(t) && !seen.has(t)) {
      seen.add(t);
      n += 1;
    }
  }
  return n;
}

/**
 * True when the user is sizing separate stakes across multiple golfers (not asking for a parlay ticket).
 * Tuned for natural language — users rarely say "basket" or "dutch."
 * @param {string} question
 * @returns {boolean}
 */
export function detectOutrightBasketIntent(question) {
  const q = String(question || "")
    .toLowerCase()
    .replace(/\s+/g, " ");

  const multiByCount =
    /\b(?:\d+|two|three|four|five|several|multiple)\s+(?:players?|golfers?|names|picks|outrights?|winners?|bets?)\b/.test(
      q,
    ) ||
    /\b(?:players?|golfers?)\b[\s\S]{0,40}\b(?:and|\+|,)\b[\s\S]{0,40}\b(?:players?|golfers?)\b/.test(q);

  /** "on Rahm, Rory and Scottie" / "on X, Y and Z" */
  const multiByNameList =
    /\bon\s+(?:[a-z]{2,}(?:\s+[a-z]{2,})?\s*,\s*)+[a-z]{2,}(?:\s+[a-z]{2,})?\s+and\s+[a-z]{2,}/.test(q) ||
    countGolfSurnameHints(q) >= 2;

  const multiSelection = multiByCount || multiByNameList;

  const informalMoney =
    /\b(?:a\s+)?buck(?:s)?\b/.test(q) || /\b(?:a\s+)?(?:dollar|bill)s?\b/.test(q);

  const perStake =
    /\$\s*\d+(?:\.\d{1,2})?\s*(?:each|apiece|per|on)\b/.test(q) ||
    /\$\s*\d+(?:\.\d{1,2})?\s+on\b/.test(q) ||
    /\b(?:place|put|bet|wager|sprinkle)\s+\$?\d+(?:\.\d{1,2})?/.test(q) ||
    (/\$\s*1\b/.test(q) && /\b\d+\s+players?\b/.test(q)) ||
    (informalMoney && /\b(?:put|place|bet)\b.{0,24}\bon\b/.test(q));

  const basketWords =
    /\b(?:dutch(?:ing)?|basket|coverage|cover(?:ing)?|hedge|sprinkle|round\s*robin|multiple\s+singles)\b/.test(
      q,
    );

  const aheadSizing =
    /\b(?:come out ahead|still\s+(?:be\s+)?ahead|ahead\s+if|profit\s+if|make\s+money\s+if)\b/.test(q) &&
    (multiSelection || perStake || informalMoney);

  const oneWinnerProfitFrame =
    /\b(?:profit|money|cash|ahead)\b.*\bif\s+(?:one|any|either)\s+(?:of\s+(?:them|those|these)\s+)?wins?\b/.test(q) ||
    /\bif\s+(?:one|any|either)\s+(?:of\s+(?:them|those|these)\s+)?wins?\b.*\b(?:profit|ahead|still|positive)\b/.test(
      q,
    );

  return (
    basketWords ||
    aheadSizing ||
    (multiSelection && perStake) ||
    (oneWinnerProfitFrame && (multiSelection || perStake || multiByNameList))
  );
}

/**
 * @param {string} question
 * @param {string} [sportHint]
 * @returns {{ marketType: GolfMarketType, structure: BetStructureType }}
 */
export function classifyGolfBetStructure(question, sportHint = "golf") {
  const sport = String(sportHint || "").toLowerCase();
  const q = String(question || "").toLowerCase();

  const outrightMarket =
    sport === "golf" ||
    /\boutright\b/.test(q) ||
    /\b(?:tournament|event)\s+winner\b/.test(q) ||
    (/\bto\s+win\b/.test(q) && /\b(?:tournament|event|heritage|masters|open)\b/.test(q));

  const explicitParlay =
    /\bparlay\b/.test(q) ||
    /\bsgp\b/.test(q) ||
    /\bsame[- ]game\s+parlay\b/.test(q) ||
    /\b\d+\s*[-]?\s*leg\b/.test(q);

  if (outrightMarket && detectOutrightBasketIntent(question)) {
    return { marketType: "outright", structure: "basket" };
  }
  if (explicitParlay) {
    return { marketType: outrightMarket ? "outright" : "unknown", structure: "parlay" };
  }
  if (/\bmatchup\b|\bh2h\b|\bhead[- ]to[- ]head\b/.test(q)) {
    return { marketType: "matchup", structure: "single" };
  }
  if (/\btop\s*[-]?\s*(?:5|10|20)\b|\bmake[- ]cut\b|\bplacement\b/.test(q)) {
    return { marketType: "placement", structure: "single" };
  }
  if (outrightMarket) {
    return { marketType: "outright", structure: "single" };
  }
  return { marketType: "unknown", structure: "single" };
}

/**
 * @param {number} american
 * @returns {number} profit on a $1 stake (not including returned stake)
 */
export function americanOddsProfitPerUnit(american) {
  const n = Number(american);
  if (!Number.isFinite(n) || n === 0) return NaN;
  if (n > 0) return n / 100;
  return 100 / Math.abs(n);
}

/**
 * Net profit if one leg wins in a same-event outright basket (equal $1 stakes).
 * @param {number[]} americanOdds
 * @param {number} [stakePerLeg=1]
 * @returns {{ totalStake: number, scenarios: Array<{ legIndex: number, netProfit: number }> }}
 */
export function computeOutrightBasketScenarios(americanOdds, stakePerLeg = 1) {
  const stakes = americanOdds.map(() => stakePerLeg);
  const totalStake = stakes.reduce((a, b) => a + b, 0);
  const scenarios = americanOdds.map((odds, legIndex) => {
    const winProfit = americanOddsProfitPerUnit(odds) * stakePerLeg;
    const lost = totalStake - stakePerLeg;
    return { legIndex, netProfit: winProfit - lost };
  });
  return { totalStake, scenarios };
}

export function buildGolfOutrightBasketSystemRule() {
  return `GOLF OUTRIGHT BASKET RULE (mandatory — overrides parlay/correlation framing for this turn)

Context: PGA tournament outright winner — only ONE golfer can win. Multiple picks on the same event are mutually exclusive.

When the user sizes stakes across several golfers ("$1 on 3 players," dutching, coverage, "come out ahead" with multiple names):
- marketType: outright winner
- structure: basket / multiple singles / coverage — NOT a parlay
- Never multiply American odds together for combined payout on multiple winners in the same tournament.
- Never call it a "two-leg parlay," "three-leg ticket," or recommend stacking two+ outright winners from the same event as parlay legs unless they explicitly name a book same-event parlay product — and even then warn that standard books reject mutually exclusive winner legs.

Math (equal stake per golfer by default):
- totalStake = stakePerPlayer × numberOfPlayers
- netIfWinner_i = profitAtOdds_i − (totalStake − stakeOnWinner_i)
- If none of the named golfers wins, all stakes lose.

Product wording: say "basket," "coverage," or "multiple singles" — not "parlay."

If they ask whether the basket "comes out ahead," show net profit for each named winner using posted odds from context only; state that every non-winner stake is dead money.`;
}

/**
 * User-turn appendix with worked math when odds rows are present.
 * @param {string} question
 * @param {Array<{ player?: string, name?: string, odds?: number }>} outrightRows
 */
export function buildGolfOutrightBasketUserPromptAppendix(question, outrightRows = []) {
  if (!detectOutrightBasketIntent(question)) return "";

  const rows = (Array.isArray(outrightRows) ? outrightRows : [])
    .map((r) => ({
      name: String(r?.player || r?.name || "").trim(),
      odds: Number(r?.odds),
    }))
    .filter((r) => r.name && Number.isFinite(r.odds));

  let mathBlock = "";
  if (rows.length >= 2) {
    const slice = rows.slice(0, 6);
    const { totalStake, scenarios } = computeOutrightBasketScenarios(
      slice.map((r) => r.odds),
      1,
    );
    const lines = slice.map((r, i) => {
      const net = scenarios[i]?.netProfit;
      const netStr = Number.isFinite(net) ? `net +$${net.toFixed(2)} if ${r.name} wins` : "";
      return `- $1 on ${r.name} ${r.odds > 0 ? "+" : ""}${r.odds}: ${netStr}`;
    });
    mathBlock = `

OUTRIGHT BASKET MATH (server-computed — use these nets; do not multiply odds):
- Total risk if $1 each: $${totalStake.toFixed(2)}
${lines.join("\n")}
- If none of these golfers wins, all $${totalStake.toFixed(2)} is lost.`;
  }

  return `

GOLF OUTRIGHT BASKET (this question — not a parlay):
The user is describing separate outright winner bets on the same tournament, not a multi-leg parlay. Do not multiply odds. Use basket/coverage/multiple-singles language.${mathBlock}`;
}

/**
 * @param {string} text
 * @returns {import("./_urTakeSportValidators/_shared.js").SportQaIssue[]}
 */
export function lintGolfOutrightParlayMisread(text) {
  const raw = String(text || "");
  if (!raw.trim()) return [];

  const issues = [];
  const multipliedOdds =
    /\+?\d{3,}\s*[×x]\s*\+?\d{3,}/i.test(raw) ||
    /\b(?:multiply|multiplied|product of).{0,40}\bodds\b/i.test(raw) ||
    /\broughly\s+\d{2,4}\s*:\s*1\b/i.test(raw);

  const parlayOnOutrights =
    /\b(?:two|2|three|3)[- ]leg\s+parlay\b/i.test(raw) &&
    /\b(?:outright|tournament winner|to win)\b/i.test(raw);

  const twoLegParlay = /\b(?:two|2)[- ]leg\s+parlay\b/i.test(raw);
  const plusNamePair = /\b[A-Za-z][a-z]+\s*\+\s*[A-Za-z][a-z]+\b/.test(raw);
  const surnameHits = countGolfSurnameHints(raw.toLowerCase());
  const outrightFieldCtx =
    /\b(?:outright|tournament winner|to win the tournament|pga|heritage|masters|open|field|same event|same tournament)\b/i.test(
      raw,
    );
  const twoLegSameFieldParlay =
    twoLegParlay &&
    (surnameHits >= 2 || plusNamePair) &&
    (outrightFieldCtx || surnameHits >= 2 || plusNamePair);

  const correlationParlayBoost =
    /\b(?:correlat|same[- ]event).{0,80}\bparlay\b/i.test(raw) &&
    /\b(?:outright|winner|golf)\b/i.test(raw);

  if (twoLegSameFieldParlay) {
    issues.push({
      code: "golf_outright_two_leg_parlay_impossible",
      severity: "critical",
      message:
        "A two-leg parlay on multiple golfers from the same outright winner market is structurally impossible — use separate singles / basket coverage only.",
      sentence: raw.slice(0, 400),
      requiresRegeneration: true,
    });
  } else if (multipliedOdds && /\b(?:golf|outright|tournament winner|pga)\b/i.test(raw)) {
    issues.push({
      code: "golf_outright_parlay_odds_multiply",
      severity: "critical",
      message:
        "Golf outright basket: do not multiply American odds for multiple winners in the same event.",
      sentence: raw.slice(0, 400),
      requiresRegeneration: true,
    });
  } else if (parlayOnOutrights || correlationParlayBoost) {
    issues.push({
      code: "golf_outright_invalid_parlay_framing",
      severity: "critical",
      message:
        "Multiple outright winners in one tournament are mutually exclusive — use basket/coverage framing, not parlay legs.",
      sentence: raw.slice(0, 400),
      requiresRegeneration: true,
    });
  }

  return issues;
}
