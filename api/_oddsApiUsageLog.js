/**
 * The Odds API v4 usage: list + event odds cost = (#markets) × (#regions) per request.
 * Scores: cost = 2 if `daysFrom` is set (1–3), else 1.
 * @see https://the-odds-api.com/liveapi/guides/v4/
 * @see https://the-odds-api.com/manage/faqs.html (quota / “request” wording)
 */

/** @param {string} urlString */
export function redactOddsApiUrl(urlString) {
  return String(urlString || "").replace(/([?&])apiKey=[^&]*/gi, "$1apiKey=REDACTED");
}

/**
 * @param {string} urlString
 * @returns {{
 *   kind: string,
 *   expected: number | null,
 *   markets: string,
 *   regions: string,
 *   marketsCount: number,
 *   regionsCount: number,
 *   daysFrom: string | null,
 * }}
 */
export function computeExpectedOddsCredits(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch {
    return {
      kind: "invalid_url",
      expected: null,
      markets: "",
      regions: "",
      marketsCount: 0,
      regionsCount: 0,
      daysFrom: null,
    };
  }

  const path = url.pathname || "";

  if (path.includes("/scores")) {
    const df = url.searchParams.get("daysFrom");
    const n = df != null && df !== "" ? Number(df) : NaN;
    const hasDays = Number.isFinite(n) && n >= 1;
    return {
      kind: "scores",
      expected: hasDays ? 2 : 1,
      markets: "",
      regions: "",
      marketsCount: 0,
      regionsCount: 0,
      daysFrom: df,
    };
  }

  const marketsParam = url.searchParams.get("markets") || "h2h";
  const regionsParam = url.searchParams.get("regions") || "us";
  const marketsCount = String(marketsParam)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean).length;
  const regionsCount = String(regionsParam)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean).length;

  if (path.includes("/events/") && path.includes("/odds")) {
    const expected =
      marketsCount > 0 && regionsCount > 0 ? marketsCount * regionsCount : null;
    return {
      kind: "event_odds",
      expected,
      markets: marketsParam,
      regions: regionsParam,
      marketsCount,
      regionsCount,
      daysFrom: null,
    };
  }

  if (path.includes("/odds")) {
    const expected =
      marketsCount > 0 && regionsCount > 0 ? marketsCount * regionsCount : null;
    return {
      kind: "sport_odds",
      expected,
      markets: marketsParam,
      regions: regionsParam,
      marketsCount,
      regionsCount,
      daysFrom: null,
    };
  }

  return {
    kind: "unknown_path",
    expected: null,
    markets: marketsParam,
    regions: regionsParam,
    marketsCount,
    regionsCount,
    daysFrom: null,
  };
}

/**
 * @param {{ label: string, url: string, response: Response }} p
 */
export function logOddsApiUsage({ label, url, response }) {
  const redacted = redactOddsApiUrl(url);
  const detail = computeExpectedOddsCredits(url);
  const lastRaw = response?.headers?.get?.("x-requests-last");
  const used = response?.headers?.get?.("x-requests-used");
  const remaining = response?.headers?.get?.("x-requests-remaining");
  const actualNum = lastRaw != null && lastRaw !== "" ? Number(lastRaw) : NaN;
  const actualOk = Number.isFinite(actualNum);
  const exp = detail.expected;
  const match =
    actualOk && exp != null && Number.isFinite(exp) ? actualNum === exp : null;

  console.log(
    JSON.stringify({
      event: "odds_api_usage",
      label,
      url: redacted,
      markets: detail.markets,
      regions: detail.regions,
      marketsCount: detail.marketsCount,
      regionsCount: detail.regionsCount,
      daysFrom: detail.daysFrom,
      endpointKind: detail.kind,
      expectedCredits: exp,
      actualCreditsFromXRequestsLast: actualOk ? actualNum : lastRaw,
      xRequestsUsed: used,
      xRequestsRemaining: remaining,
      httpStatus: response?.status ?? null,
      expectedMatchesXRequestsLast: match,
    }),
  );
}
