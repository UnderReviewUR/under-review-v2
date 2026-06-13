/**
 * User-facing WC copy — strip internal BDL/GOAT labels; keep book + vendor only.
 */

export const NBA_DATA_SOURCE_ANSWER =
  "NBA lines, injuries, and roster context are sourced from DraftKings and other major books through BallDontLie's premium sports data API — the highest tier they offer — so prices stay as current as the feed allows.";

export const WC_DATA_SOURCE_ANSWER =
  "World Cup fixtures, results, and betting lines are sourced from DraftKings odds delivered through BallDontLie's premium sports data API — the highest tier they offer — so prices stay as current as the feed allows.";

export const WC_USER_FACING_COPY_PROMPT = `USER-FACING COPY (mandatory — never violate):
- Never mention BallDontLie, GOAT, BDL, or API tier names in lean, whyNow, deep, edge, or card fields.
- Book lines: "Book line: +100 · DraftKings" (optional " · Jun 13" date) — vendor only, no pipeline jargon.
- Missing lines: "No group-winner line is posted for this market" — not "No BDL seed".
- Team codes: prefer country name on first mention ("DR Congo (COD)") — codes alone are fine in tables/stats.
- Never put "[UR model · 10k Poisson/Elo · …]" or Poisson/Elo pipeline labels on the card face (lean, whyNow, edge). Plain "UR sim X% vs market Y%" is enough unless the user asks how the model works.
- Only if the user explicitly asks where World Cup data comes from, use the approved source answer (DraftKings via BallDontLie premium API — no GOAT label).`;

/**
 * @param {string} line
 */
function sanitizeWcUserFacingLine(line) {
  let t = String(line || "").trim();
  if (!t) return "";

  t = t.replace(
    /Book line:\s*([^·(\n]+?)\s*\(([^)]+)\)/gi,
    (_m, price, inner) => {
      const vendorMatch = inner.match(/\b(DraftKings|FanDuel|BetMGM)\b/i);
      const vendor = vendorMatch ? vendorMatch[1] : inner.split(/\s+via\s+/i)[0]?.trim() || "book";
      const asOf = inner.match(/\bas of\s+([A-Za-z]{3}\s+\d{1,2})\b/i)?.[1];
      const p = String(price || "").trim();
      return asOf ? `Book line: ${p} · ${vendor} · ${asOf}` : `Book line: ${p} · ${vendor}`;
    },
  );

  t = t.replace(/\bBallDontLie GOAT(?: live)?\b/gi, "");
  t = t.replace(/\bvia BallDontLie\b/gi, "");
  t = t.replace(/\bBDL\s+grounding\b/gi, "");
  t = t.replace(/\bBallDontLie\s+(?:grounding|roster|slate|data)\b/gi, "");
  t = t.replace(/^\[(UR model\s*·\s*10k Poisson\/Elo\s*·\s*[^\]]+)\]\s*/i, "");
  t = t.replace(/\bNo BDL group-winner seed is posted\b/gi, "No group-winner line is posted");
  t = t.replace(/\bNo BDL group-winner price exists\b/gi, "No group-winner line exists");
  t = t.replace(/\bNo BDL advancement lines available\b/gi, "No advance lines available");
  t = t.replace(/\bVERIFIED CONTEXT\b/gi, "");
  t = t.replace(/\bGROUP BINDING\b/gi, "");
  t = t.replace(/\bno matches (?:are )?available (?:for|on)\b[^.]*\.?/gi, "");
  t = t.replace(/\bI need to focus on\b[^.]*\.?/gi, "");
  t = t.replace(/\(\s*·\s*as of/gi, " ·");
  t = t.replace(/\(\s*\)/g, "");
  t = t.replace(/\s{2,}/g, " ").trim();
  return t;
}

/**
 * @param {string} text
 */
export function sanitizeWcUserFacingProse(text) {
  const raw = String(text || "");
  if (!raw.trim()) return "";

  return raw
    .split(/\n/)
    .map((line) => sanitizeWcUserFacingLine(line))
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Sport-agnostic sanitizer for all UR Take card / breakdown display. */
export const sanitizeUrTakeUserFacingProse = sanitizeWcUserFacingProse;

/**
 * Prefer "DR Congo" over bare "COD" in headlines when we can infer it.
 * @param {string} text
 * @param {Record<string, { name?: string, abbreviation?: string }>} [teamByAbbr]
 */
export function expandWcTeamAbbrInHeadline(text, teamByAbbr = {}) {
  const t = String(text || "").trim();
  if (!t) return t;
  return t.replace(/\b([A-Z]{3})\b/g, (abbr) => {
    const team = teamByAbbr[abbr];
    if (!team?.name || team.name.length <= 4) return abbr;
    if (t.includes(team.name)) return abbr;
    return team.name;
  });
}
