/**
 * World Cup take retention QA — sim attribution, dedup, comparative proof.
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import { extractLatestUserTurnForRouting } from "./urTakeSportRouting.js";
import { capWcCharsAtWord, splitWcSentences } from "./wcSentenceBoundaries.js";

/** @param {string} a @param {string} b @returns {number} 0–1 overlap score */
export function wcSentenceSimilarity(a, b) {
  const na = String(a || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const nb = String(b || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const aWords = na.split(/\s+/).filter(Boolean);
  const bWords = nb.split(/\s+/).filter(Boolean);
  if (!aWords.length || !bWords.length) return 0;
  const overlap = aWords.filter((w) => bWords.includes(w)).length;
  return overlap / Math.max(aWords.length, bWords.length);
}

/**
 * @param {number | null | undefined} lastUpdatedMs
 * @param {number} [nowMs]
 */
const WC_MODEL_ATTRIBUTION_BRACKET_RE =
  /^\[(UR model\s*·\s*10k Poisson\/Elo\s*·\s*[^\]]+)\]\s*/i;

/**
 * Split leading "[UR model · 10k Poisson/Elo · …]" from card WHY prose.
 * @param {string} text
 * @returns {{ body: string, attribution: string | null }}
 */
export function extractWcModelAttributionPrefix(text) {
  const t = String(text || "").trim();
  const m = t.match(WC_MODEL_ATTRIBUTION_BRACKET_RE);
  if (!m) return { body: t, attribution: null };
  return {
    attribution: String(m[1] || "").trim(),
    body: t.slice(m[0].length).trim(),
  };
}

/** @param {string} text */
export function stripWcModelAttributionPrefix(text) {
  return extractWcModelAttributionPrefix(text).body;
}

export function buildWcSimAttributionLabel(lastUpdatedMs, nowMs = Date.now()) {
  const d = Number(lastUpdatedMs);
  const dateStr =
    Number.isFinite(d) && d > 0
      ? new Date(d).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        })
      : new Date(nowMs).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        });
  return `[UR model · 10k Poisson/Elo · ${dateStr}]`;
}

/**
 * @param {string} body
 * @param {Record<string, unknown> | null | undefined} [structured]
 */
export function responseCitesWcSimPercentages(body, structured) {
  const blob = [
    body,
    structured?.line,
    structured?.whyNow,
    structured?.deep,
  ]
    .filter(Boolean)
    .join("\n");
  const hasPct = /\d+\.?\d*\s*%/.test(blob);
  const hasSimCue =
    /\b(sims?|simulation|monte carlo|poisson|elo|advancepct|groupwinpct|r16pct)\b/i.test(
      blob,
    ) ||
    /\b\d+\.?\d*\s*%\s*(?:advance|group win|r16|qf|sf|final|win|reach)\b/i.test(blob);
  return hasPct && hasSimCue;
}

/**
 * @param {string} body
 * @param {Record<string, unknown> | null | undefined} [structured]
 */
export function detectMissingWcSimAttribution(body, structured) {
  if (!responseCitesWcSimPercentages(body, structured)) return false;
  if (structured?.modelAttribution && String(structured.modelAttribution).trim()) return false;
  const blob = [
    body,
    structured?.line,
    structured?.whyNow,
    structured?.call,
    structured?.modelAttribution,
  ]
    .filter(Boolean)
    .join("\n");
  if (/\[UR model\s*·\s*10k/i.test(blob)) return false;
  if (/\bUR sims?\b/i.test(blob)) return false;
  if (/\bUR\b[^.\n]{0,48}\bsims?\b/i.test(blob)) return false;
  return true;
}

const WC_THIN_ROSTER_WHY_RE = /^group\s+[a-l]\s+is\s+four\s+teams:/i;

/**
 * WHY is roster trivia without sim delta or honest data-gap language.
 * @param {string} whyNow
 */
export function isWcThinRosterOnlyWhy(whyNow) {
  const w = String(whyNow || "").trim();
  if (!w) return false;
  if (/\d+\.?\d*\s*%/.test(w) && /\b(vs market|sim|delta|mispric|overpric|underpric)\b/i.test(w)) {
    return false;
  }
  if (
    /\b(cannot quantify|not in context|can't prove|no live|missing.*odds|needs fresh lines)\b/i.test(
      w,
    )
  ) {
    return false;
  }
  return WC_THIN_ROSTER_WHY_RE.test(w) || (/Group\s+[A-L]\s+is\s+four\s+teams/i.test(w) && !/\d+\.?\d*\s*%/.test(w));
}

/** @param {string} question */
export function isWcRunnerUpValueFollowUp(question) {
  const q = String(question || "").trim();
  if (!q) return false;
  if (/\bwhich\s+group\b/i.test(q) && /\brunner[- ]?up\b/i.test(q)) return true;
  return (
    /\b(runner[- ]?up|second\s+(?:most\s+)?mispric|#2)\b/i.test(q) &&
    /\b(group|value)\b/i.test(q)
  );
}

const WC_RUNNER_UP_GROUP_PATTERNS = [
  /Runner-up\s+gap:\s*Group\s+([A-L])\b/i,
  /;\s*Group\s+([A-L])\s+runner[- ]?up\b/i,
  /\brunner[- ]?up\s+Group\s+([A-L])\b/i,
  /\bGroup\s+([A-L])\s+runner[- ]?up\b/i,
  /\bRunner-up\s+Group\s+([A-L])\b/i,
  /#\s*2\s+Group\s+([A-L])\b/i,
  /\bsecond[\s-]+Group\s+([A-L])\b/i,
  /\bwhich\s+group\b[\s\S]{0,32}\bGroup\s+([A-L])\b/i,
];

/**
 * @param {string} blob
 * @returns {string | null}
 */
export function parseWcRunnerUpGroupLetter(blob) {
  const text = String(blob || "").trim();
  if (!text) return null;
  for (const re of WC_RUNNER_UP_GROUP_PATTERNS) {
    const m = text.match(re);
    if (m?.[1]) return String(m[1]).toUpperCase();
  }
  return null;
}

/**
 * @param {string} blob
 * @returns {string | null}
 */
export function parseWcRunnerUpTeamAbbr(blob) {
  const text = String(blob || "");
  const m =
    text.match(/Runner-up\s+Group\s+[A-L]\s*[:—-]\s*([A-Z]{3})\b/i) ||
    text.match(/Runner-up\s+Group\s+[A-L][^(]*\(\s*([A-Z]{3})\s*[,)]/i) ||
    text.match(/Runner-up\s+gap:\s*Group\s+[A-L]\s*[-—]\s*([A-Z]{3})\b/i) ||
    text.match(/Group\s+[A-L]\s*[-—]\s*([A-Z]{3})\s+is\s+\d+\.?\d*\s*%\s+market/i);
  return m?.[1] ? String(m[1]).toUpperCase() : null;
}

/**
 * @param {object | null | undefined} structured
 * @returns {{ group: string | null, teamAbbr: string | null }}
 */
export function extractWcRunnerUpFromStructured(structured) {
  if (!structured || typeof structured !== "object") {
    return { group: null, teamAbbr: null };
  }
  const group =
    structured.runnerUpGroupLetter != null && String(structured.runnerUpGroupLetter).trim()
      ? String(structured.runnerUpGroupLetter).trim().toUpperCase()
      : parseWcRunnerUpGroupLetter(
          [structured.call, structured.lean, structured.whyNow, structured.line]
            .filter(Boolean)
            .join(" "),
        );
  const teamAbbr =
    structured.runnerUpTeamAbbr != null && String(structured.runnerUpTeamAbbr).trim()
      ? String(structured.runnerUpTeamAbbr).trim().toUpperCase()
      : parseWcRunnerUpTeamAbbr(
          [structured.whyNow, structured.call, structured.line].filter(Boolean).join(" "),
        );
  return { group, teamAbbr };
}

/**
 * @param {object[]} history
 * @returns {{ group: string | null, teamAbbr: string | null }}
 */
export function extractWcRunnerUpFromHistory(history) {
  if (!Array.isArray(history)) return { group: null, teamAbbr: null };
  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i];
    const role = String(turn?.role || "").toLowerCase();
    if (role !== "assistant" && role !== "ai") continue;

    const fromStructured = extractWcRunnerUpFromStructured(turn.structured);
    if (fromStructured.group) return fromStructured;

    const text = String(turn?.content || turn?.text || "");
    const group = parseWcRunnerUpGroupLetter(text);
    if (group) {
      return { group, teamAbbr: parseWcRunnerUpTeamAbbr(text) };
    }
  }
  return { group: null, teamAbbr: null };
}

/** @param {object[]} history @returns {string | null} */
export function extractWcRunnerUpGroupFromHistory(history) {
  return extractWcRunnerUpFromHistory(history).group;
}

/**
 * Parent take established a runner-up anchor (structured field or call/why prose).
 * @param {object | null | undefined} message
 */
export function parentTakeHasWcRunnerUpAnchor(message) {
  if (!message) return false;
  if (extractWcRunnerUpFromStructured(message.structured).group) return true;
  const blob = [message.content, message.text].filter(Boolean).join(" ");
  return Boolean(parseWcRunnerUpGroupLetter(blob));
}

/**
 * @param {string} question
 * @param {object[]} history
 * @returns {string}
 */
export function buildWcPushBackBindingBlock(question, history) {
  if (!isWcRunnerUpValueFollowUp(question)) return "";
  const { group, teamAbbr } = extractWcRunnerUpFromHistory(history);
  if (!group) return "";
  const teamClause = teamAbbr ? ` (best misprice: ${teamAbbr})` : "";
  return `PUSH-BACK BINDING (mandatory): Prior take named Group ${group} as runner-up value${teamClause}. Answer ONLY Group ${group}${teamAbbr ? ` / ${teamAbbr}` : ""} — explain in plain English why the advance line is wrong (sim% vs market%), not a roster list. Do NOT re-issue the #1 group pick or a new flagship slate card for a different group.`;
}

/**
 * @param {object[]} history
 * @returns {Record<string, unknown> | null}
 */
export function findPriorAssistantStructuredTake(history) {
  if (!Array.isArray(history)) return null;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const turn = history[i];
    const role = String(turn?.role || "").toLowerCase();
    if (role !== "assistant" && role !== "ai") continue;
    if (turn?.structured && typeof turn.structured === "object") return turn.structured;
  }
  return null;
}

/**
 * @param {Record<string, unknown> | null | undefined} structured
 * @returns {number | null}
 */
export function extractWcStructuredAdvanceDelta(structured) {
  if (!structured || typeof structured !== "object") return null;
  const blob = [structured.line, structured.whyNow, structured.deep, structured.lean]
    .filter(Boolean)
    .join(" ");
  const deltaPt = blob.match(/\(([+-]?\d+\.?\d*)pt\)/i);
  if (deltaPt) return parseFloat(deltaPt[1]);

  const simFirst = blob.match(
    /(?:UR sims? put|UR sim)[^.]*?(\d+\.?\d*)\s*%[^.]*?(?:market|implies)[^.]*?(\d+\.?\d*)\s*%/i,
  );
  if (simFirst) return parseFloat(simFirst[1]) - parseFloat(simFirst[2]);

  const marketFirst = blob.match(
    /(?:market|implies)[^.]*?(\d+\.?\d*)\s*%[^.]*?(?:UR sims? put|UR sim|sims? put)[^.]*?(\d+\.?\d*)\s*%/i,
  );
  if (marketFirst) return parseFloat(marketFirst[2]) - parseFloat(marketFirst[1]);

  return null;
}

/**
 * @param {Record<string, unknown> | null | undefined} structured
 */
export function structuredTakeRecommendsFadeAdvance(structured) {
  if (!structured || typeof structured !== "object") return false;
  const blob = [structured.lean, structured.call, structured.whyNow]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/\b(pass on|fade )\b/.test(blob)) return true;
  if (/\boverpric(?:e|ed|ing)\b/.test(blob) && /\b(advance|qualify|escape)\b/.test(blob)) {
    return true;
  }
  const delta = extractWcStructuredAdvanceDelta(structured);
  return delta != null && Number.isFinite(delta) && delta < -5;
}

/**
 * Fade/pass target from a prior structured group-value take.
 * @param {Record<string, unknown> | null | undefined} prior
 * @returns {{ groupLetter: string, pickAbbr: string | null, pickName: string } | null}
 */
export function extractWcFadeAdvanceTargetFromPrior(prior) {
  if (!prior || typeof prior !== "object") return null;
  if (!structuredTakeRecommendsFadeAdvance(prior)) return null;

  const lean = String(prior.lean || "");
  const call = String(prior.call || "");

  const passLean = lean.match(/\b(?:Pass on|Fade)\s+(.+?)\s+to advance(?:\s+in Group\s+([A-L]))?/i);
  if (passLean) {
    const namePart = passLean[1].trim();
    let groupLetter =
      passLean[2]?.toUpperCase() ||
      String(prior.groupLetter || prior.primaryMispriceGroupLetter || "").toUpperCase() ||
      null;
    const team =
      WC_2026_TEAMS.find(
        (t) =>
          t.name.toLowerCase() === namePart.toLowerCase() ||
          String(t.abbreviation).toUpperCase() === namePart.toUpperCase(),
      ) || null;
    if (team) {
      groupLetter = groupLetter || String(team.group).toUpperCase();
      return {
        groupLetter: String(groupLetter).toUpperCase(),
        pickAbbr: team.abbreviation,
        pickName: team.name,
      };
    }
    if (groupLetter) {
      return { groupLetter, pickAbbr: null, pickName: namePart };
    }
  }

  const fadeCall = call.match(/\bFade\s+(.+?)\s+Group\s+([A-L])\b/i);
  if (fadeCall) {
    const namePart = fadeCall[1].trim();
    const groupLetter = fadeCall[2].toUpperCase();
    const team =
      WC_2026_TEAMS.find(
        (t) =>
          t.name.toLowerCase() === namePart.toLowerCase() ||
          String(t.abbreviation).toUpperCase() === namePart.toUpperCase(),
      ) || null;
    return {
      groupLetter,
      pickAbbr: team?.abbreviation || null,
      pickName: team?.name || namePart,
    };
  }

  const letter = String(
    prior.groupLetter || prior.primaryMispriceGroupLetter || "",
  ).toUpperCase();
  if (letter) {
    const blob = [lean, call, prior.whyNow].filter(Boolean).join(" ");
    const longshot = WC_2026_TEAMS.find(
      (t) =>
        String(t.group).toUpperCase() === letter &&
        (blob.includes(t.name) || blob.includes(t.abbreviation)),
    );
    if (longshot) {
      return {
        groupLetter: letter,
        pickAbbr: longshot.abbreviation,
        pickName: longshot.name,
      };
    }
  }

  return null;
}

/**
 * Deterministic reaffirmation when user pushback agrees with a fade/pass thesis.
 * @param {string} question
 * @param {object[]} history
 * @param {{ isConversationFollowUp?: boolean, priorStructured?: Record<string, unknown> | null }} [opts]
 */
export function shouldUseWcGroupValuePushBackPrebuilt(question, history, opts = {}) {
  if (!opts.isConversationFollowUp) return false;
  const q = String(question || "").trim();
  if (isWcRunnerUpValueFollowUp(q)) return false;
  if (!isWcGroupValuePushBackChallenge(q)) return false;
  const prior = opts.priorStructured || findPriorAssistantStructuredTake(history);
  return Boolean(extractWcFadeAdvanceTargetFromPrior(prior));
}

/**
 * User challenges group favorites / paths after a fade-advance take.
 * @param {string} question
 */
export function isWcGroupValuePushBackChallenge(question) {
  const q = String(question || "").trim();
  if (!q) return false;
  return (
    /\b(more likely|way more|clearly|obvious|near-?lock|favorite|favored|contender)\b/i.test(q) &&
    /\b(advance|qualify|top two|escape|group [a-l])\b/i.test(q)
  );
}

/**
 * @param {string} question
 * @param {object[]} history
 */
export function buildWcGroupValuePushBackBindingBlock(question, history) {
  if (!isWcGroupValuePushBackChallenge(question)) return "";
  const prior = findPriorAssistantStructuredTake(history);
  if (!structuredTakeRecommendsFadeAdvance(prior)) return "";

  const callBlob = String(prior?.call || prior?.lean || "");
  const pick =
    callBlob.match(/\b(?:Pass on|Fade)\s+(.+?)\s+to advance\b/i)?.[1]?.trim() ||
    callBlob.match(/\b(?:Pass on|Fade)\s+([A-Z]{2,4})\b/i)?.[1]?.trim() ||
    "the longshot";

  return `PUSH-BACK BINDING (mandatory): Prior take was PASS/FADE on ${pick} to advance — market overpriced vs UR sim. The user naming Portugal/Colombia (or other favorites) AGREES with that read — do NOT flip to backing ${pick} to advance. Open in first person ("Fair push — you're right that Portugal and Colombia are the live paths here") then restate the SAME fade/pass play with sim% vs market%. Never write "user makes a good point" or third-person praise. Do not hedge with "or flip it".`;
}

/**
 * Lean says "to advance" while sim delta is materially below market (wrong side).
 * @param {Record<string, unknown> | null | undefined} structured
 */
export function detectWcAdvancementLeanDirectionMismatch(structured) {
  if (!structured || typeof structured !== "object") return false;
  const ct = String(structured.callType || "").toLowerCase();
  if (!["group_slate", "advancement", "analysis"].includes(ct)) return false;

  const blob = [structured.lean, structured.call].filter(Boolean).join(" ").toLowerCase();
  if (/\b(pass on|fade )\b/.test(blob)) return false;
  if (!/\bto advance\b/.test(blob)) return false;

  const delta = extractWcStructuredAdvanceDelta(structured);
  if (delta == null || !Number.isFinite(delta)) return false;
  return delta < -5;
}

/**
 * @param {string} text
 */
export function detectWcRoboticPushbackConcession(text) {
  return /\b(user makes a good point|you're right to push back|the user is correct|valid pushback|user correctly notes|user makes a valid)\b/i.test(
    String(text || ""),
  );
}

export const WC_PUSHBACK_VOICE_PROMPT = `WC PUSH-BACK VOICE (mandatory on follow-ups):
- Never write "user makes a good point" or describe the user in third person.
- If their pushback matches your thesis (they name the favorites you already priced in), agree naturally: "Fair push — Portugal and Colombia are the live paths here." Then restate the SAME play; do not flip to backing the longshot you faded.
- If you truly change the call, lead with "Changed my read —" and cite new numbers — not performative deference.
- One confident play per thread unless numbers changed — do not make reversing the call a habit.`;

export const WC_NEEDS_LEAN_DIRECTION_QA_SUFFIX = `

WC LEAN DIRECTION QA (mandatory — prior answer backed the wrong side):
- When UR sim advance % is BELOW market implied % (negative delta), the play is PASS or FADE advance — never "Lean: [team] to advance".
- Example: sim 24% vs market 50% (-26pt) → "Pass on DR Congo to advance at +100" — NOT "DR Congo to advance at +100".`;

export const WC_PUSHBACK_VOICE_QA_SUFFIX = `

WC PUSH-BACK VOICE QA (mandatory — prior answer sounded robotic or flipped wrongly):
- Do not say "user makes a good point" or "you're right to push back."
- Use first-person agreement ("Fair push — …" / "You know what, great point here — …") then restate the same fade/pass if favorites were already in your thesis.
- Do not flip from fade/pass on a longshot to backing that longshot because the user mentioned favorites.`;

/**
 * Console warning only — no regeneration loop.
 * @param {{ whyNow?: string, question?: string, isFollowUp?: boolean }} opts
 */
export function warnWcThinFollowUpWhy(opts = {}) {
  if (!opts.isFollowUp) return;
  const whyNow = String(opts.whyNow || "").trim();
  if (!isWcThinRosterOnlyWhy(whyNow)) return;
  console.warn(
    JSON.stringify({
      event: "wc_thin_why",
      question: String(opts.question || "").slice(0, 160),
      whyPreview: whyNow.slice(0, 240),
    }),
  );
}

/**
 * @param {string} watchFor
 * @param {string} whyNow
 * @param {string} [deep]
 */
export function isWcWatchForDupedAgainstWhy(watchFor, whyNow, deep = "") {
  const wf = String(watchFor || "").trim();
  const why = String(whyNow || "").trim();
  if (!wf || !why) return false;
  if (wcSentenceSimilarity(wf, why) >= 0.8) return true;

  for (const sent of splitWcSentences(why)) {
    if (wcSentenceSimilarity(wf, sent) >= 0.85) return true;
  }

  const deepSents = splitWcSentences(deep);
  const lastDeep = deepSents[deepSents.length - 1] || "";
  if (lastDeep && wcSentenceSimilarity(wf, lastDeep) >= 0.85) return true;

  return false;
}

/**
 * @param {string} question
 */
export function isWcCrossGroupMispriceQuestion(question) {
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  if (!q) return false;
  if (isWcGroupPathMispriceQuestion(q)) return false;
  if (isWcKnockoutSlateQuestion(q)) return false;
  if (isWcTomorrowOrSlateBetQuestion(q)) return true;
  return (
    /\b(most mispriced|mispriced).*(?:group|groups)\b/i.test(q) ||
    /\bwhich (?:world cup )?group\b/i.test(q) ||
    /\b(best|top|single)\b[\s\S]{0,48}\bgroup[\s-]*stage\b/i.test(q) ||
    /\bgroup[\s-]*stage\s+value\b/i.test(q)
  );
}

/**
 * @typedef {"today" | "tomorrow"} WcSlateDay
 */

/** Questions that must never route to fixture slate prebuilts. */
function isWcSlateRoutingExclusion(question) {
  const q = String(question || "");
  return /\b(golden boot|golden glove|player prop|anytime scorer|player parlay|parlay prop)\b/i.test(
    q,
  );
}

/**
 * ET broadcast day cue — tonight rolls into today's slate.
 * @param {string} question
 */
export function isWcSlateDayCue(question) {
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  return /\b(today'?s?|tomorrow'?s?|tonight|this evening)\b/i.test(q);
}

/**
 * @param {string} question
 */
export function isWcSlateBoardCue(question) {
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  return /\b(slate|board|fixtures?|matches?|games?)\b/i.test(q);
}

/**
 * Multi-fixture slate scope (not a single named matchup).
 * @param {string} question
 */
export function isWcMultiMatchSlateCue(question) {
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  if (!q) return false;
  const hasDay = isWcSlateDayCue(q);
  const hasWc = /\bworld cup\b/i.test(q);
  return (
    /\b(each|every|all|per|any)\b[\s\S]{0,48}\b(game|match|fixture)s?\b/i.test(q) ||
    /\b(game|match|fixture)s?\b[\s\S]{0,40}\b(today|tomorrow|tonight)\b/i.test(q) ||
    /\b(today|tomorrow|tonight)\b[\s\S]{0,40}\b(game|match|fixture)s?\b/i.test(q) ||
    (hasDay && isWcSlateBoardCue(q)) ||
    /\bon the board\b/i.test(q) ||
    (hasWc && isWcSlateBoardCue(q))
  );
}

/**
 * Betting market language for slate boards (totals, spreads, ML, misprice).
 * @param {string} question
 */
export function isWcSlateBetMarketCue(question) {
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  if (!q) return false;
  return (
    /\b(spreads?|handicaps?|asian handicap|goal\s*totals?|totals?|over\/under|o\/u)\b/i.test(
      q,
    ) ||
    /\b(?:the\s+)?over\b/i.test(q) ||
    /\bunders?\b/i.test(q) ||
    /\bmoneylines?\b/i.test(q) ||
    /\bML\b/.test(q) ||
    /\b(?:go|going|hit)\s+(?:the\s+)?over\b/i.test(q) ||
    /\bover\s+\d+(?:\.\d+)?\b/i.test(q) ||
    /\bunder\s+\d+(?:\.\d+)?\b/i.test(q) ||
    /\b\d+\+?\s*goals?\b/i.test(q) ||
    /\bsee\s+\d+\+?\s*goals?\b/i.test(q) ||
    /\bover\s+play\b/i.test(q)
  );
}

/**
 * Daily fixture value on the verified board ("most mispriced game today").
 * @param {string} question
 */
export function isWcDailyFixtureValueQuestion(question) {
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  if (!q || isWcSlateRoutingExclusion(q)) return false;
  if (!isWcSlateDayCue(q)) return false;
  if (/\b(group\s+[a-l]|to advance|advancement|group[\s-]*stage|group[\s-]*winner)\b/i.test(q)) {
    return false;
  }
  const valueCue =
    /\b(mispriced?|misprice|most mispriced|value|best bet|sharp|edge|cleanest)\b/i;
  const directPick = /\b(one pick|direct answer)\b/i.test(q);
  if (!valueCue.test(q) && !directPick) return false;
  return (
    /\b(fixture|game|match|matchup|board|slate)\b/i.test(q) ||
    directPick ||
    /\bmost mispriced\b/i.test(q)
  );
}

/**
 * WC tab implicit slate — day + bet intent without naming "matches" (sport context supplied by caller).
 * @param {string} question
 */
export function isWcWcTabImplicitSlateQuestion(question) {
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  if (!q || isWcSlateRoutingExclusion(q)) return false;
  if (!isWcSlateDayCue(q)) return false;
  if (/\b(group\s+[a-l]|to advance|advancement|group[\s-]*winner|outright winner)\b/i.test(q)) {
    return false;
  }
  return (
    /\b(worth betting|worth a bet|who should i bet|what(?:'s| is) the play|what(?:'s| is) worth|give me (?:a |one )?(?:bet|pick|lean)|one pick)\b/i.test(
      q,
    ) ||
    /\b(bet on|betting on|betting)\b/i.test(q)
  );
}

/**
 * Which ET slate day the user asked for — defaults to today when unspecified.
 * @param {string} question
 * @returns {WcSlateDay}
 */
export function extractWcSlateDayFromQuestion(question) {
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  if (!q) return "today";
  const hasToday = /\btoday'?s?\b/i.test(q) || /\btonight\b/i.test(q) || /\bthis evening\b/i.test(q);
  const hasTomorrow = /\btomorrow'?s?\b/i.test(q);
  if (hasToday && !hasTomorrow) return "today";
  if (hasTomorrow && !hasToday) return "tomorrow";
  if (hasToday && hasTomorrow) {
    const todayIdx = q.search(/\b(today'?s?|tonight|this evening)\b/i);
    const tomorrowIdx = q.search(/\btomorrow'?s?\b/i);
    return todayIdx >= tomorrowIdx ? "today" : "tomorrow";
  }
  return "today";
}

/**
 * "Predict each game today" / slate outcome bundles — route to fixture slate prebuilt.
 * @param {string} question
 */
export function isWcSlateOutcomePredictionQuestion(question) {
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  if (!q) return false;
  if (/\b(golden boot|golden glove|player prop|anytime scorer|tournament winner)\b/i.test(q)) {
    return false;
  }
  const hasDay = /\b(today'?s?|tomorrow'?s?)\b/i.test(q);
  const hasWc = /\bworld cup\b/i.test(q);
  const hasPredict = /\b(predict|prediction|predictions|outcome|outcomes|who wins|result|results|forecast|scoreline|scorelines)\b/i.test(
    q,
  );
  const hasMultiMatch =
    /\b(each|every|all)\b[\s\S]{0,40}\b(game|match|fixture)s?\b/i.test(q) ||
    /\b(game|match|fixture)s?\b[\s\S]{0,32}\b(today|tomorrow)\b/i.test(q) ||
    /\b(today|tomorrow)\b[\s\S]{0,32}\b(game|match|fixture|slate)s?\b/i.test(q);
  if (hasPredict && hasMultiMatch && (hasDay || hasWc)) return true;
  if (hasPredict && hasDay && /\b(slate|fixtures?|matches?|games?)\b/i.test(q)) return true;
  return false;
}

/**
 * WC slate routing kinds — {@link resolveWcSlateRoutingKind} returns the first match (high → low).
 * @readonly
 */
export const WC_SLATE_ROUTING_KIND = {
  DAILY_FIXTURE_VALUE: "daily_fixture_value",
  KNOCKOUT_SLATE: "knockout_slate",
  SLATE_MARKET_BOARD: "slate_market_board",
  SLATE_OUTCOME_PREDICTION: "slate_outcome_prediction",
  BROAD_SLATE_BET: "broad_slate_bet",
  WC_TAB_IMPLICIT: "wc_tab_implicit",
};

/**
 * Broad day-scoped bet asks without explicit market board language.
 * @param {string} question
 */
function isWcBroadDailySlateBetQuestion(question) {
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  if (!q) return false;
  if (/\b(golden boot|golden glove|player prop|anytime scorer|player parlay|player parlays|parlay prop)\b/i.test(q)) {
    return false;
  }
  if (/\boutright\b/i.test(q) && !/\b(tomorrow|today'?s?|tonight|slate|matches|board)\b/i.test(q)) {
    return false;
  }
  return (
    /\b(sneaky|good bets?|best bets?|value bets?)\b[\s\S]{0,56}\b(tomorrow|matches tomorrow|world cup matches|today'?s?(?: matches| slate| games)?|tonight)\b/i.test(
      q,
    ) ||
    /\b(tomorrow|today'?s?|tonight)\b[\s\S]{0,56}\b(good bets?|best bets?|world cup bets?|matches to bet)\b/i.test(
      q,
    ) ||
    /\b(best|top|sneaky|good|value)\b[\s\S]{0,40}\bworld cup\b[\s\S]{0,40}\b(bets?|picks?|leans?)\b[\s\S]{0,24}\b(tomorrow|today|tonight)\b/i.test(
      q,
    ) ||
    /\bworld cup\b[\s\S]{0,40}\b(bets?|picks?)\b[\s\S]{0,40}\b(tomorrow|today|tonight)\b/i.test(q)
  );
}

/**
 * Single source of truth for fixture-slate question classification.
 *
 * Precedence (first match wins):
 *  1. daily_fixture_value — day + misprice/game on the board (multi-match cue NOT required)
 *  2. knockout_slate — R32/R16/knockout lexicon + value/slate
 *  3. slate_market_board — multi-match scope + market lexicon (totals/spreads/ML/over)
 *  4. slate_outcome_prediction — predict each game today
 *  5. broad_slate_bet — sneaky/best bets + day ("best WC bets today")
 *  6. wc_tab_implicit — day + bet intent when caller sets fromWcTab (WC screen sport context)
 *
 * Single-fixture totals (e.g. "BRA-JPN over 2.5") intentionally returns null — MATCHUP lane.
 *
 * @param {string} question
 * @param {{ fromWcTab?: boolean }} [opts]
 * @returns {string | null} WC_SLATE_ROUTING_KIND value or null
 */
export function resolveWcSlateRoutingKind(question, opts = {}) {
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  if (!q || isWcSlateRoutingExclusion(q)) return null;

  if (isWcDailyFixtureValueQuestion(q)) {
    return WC_SLATE_ROUTING_KIND.DAILY_FIXTURE_VALUE;
  }
  if (isWcKnockoutSlateCoreQuestion(q)) {
    return WC_SLATE_ROUTING_KIND.KNOCKOUT_SLATE;
  }
  if (isWcSlateMarketBoardQuestion(q)) {
    return WC_SLATE_ROUTING_KIND.SLATE_MARKET_BOARD;
  }
  if (isWcSlateOutcomePredictionQuestion(q)) {
    return WC_SLATE_ROUTING_KIND.SLATE_OUTCOME_PREDICTION;
  }
  if (isWcBroadDailySlateBetQuestion(q)) {
    return WC_SLATE_ROUTING_KIND.BROAD_SLATE_BET;
  }
  if (opts.fromWcTab && isWcWcTabImplicitSlateQuestion(q)) {
    return WC_SLATE_ROUTING_KIND.WC_TAB_IMPLICIT;
  }
  return null;
}

/**
 * Knockout-round slate cues only — not daily fixture value (see orchestrator precedence).
 * @param {string} question
 */
export function isWcKnockoutSlateCoreQuestion(question) {
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  if (!q) return false;
  if (/\b(golden boot|golden glove|player prop|anytime scorer|tournament winner|outright winner)\b/i.test(q)) {
    return false;
  }
  const knockoutCue =
    /\b(knockout(?:[\s-]stage)?|round of 32|r32|round of 16|r16|quarterfinal|semifinal|elimination)\b/i;
  const valueCue =
    /\b(best|top|sharp|sneaky|good|value|mispriced|misprice|most mispriced|cleanest)\b/i;
  const slateCue = /\b(today'?s?|tonight|slate|board|fixture|matchup|match(?:es)?|games?)\b/i;
  const marketCue =
    /\b(moneylines?|ML|spread|total|over\/under|o\/u|handicap|over|under)\b/i;
  const directCue = /\b(one pick|direct answer|right now)\b/i;

  if (/\bbest knockout\b/i.test(q) && valueCue.test(q)) return true;
  if (knockoutCue.test(q) && valueCue.test(q) && (slateCue.test(q) || directCue.test(q))) return true;
  if (knockoutCue.test(q) && slateCue.test(q) && marketCue.test(q)) return true;
  if (knockoutCue.test(q) && /\bmost mispriced\b/i.test(q)) return true;
  return false;
}

/**
 * Knockout slate / board value asks — fixture-bound prebuilt, never group advancement.
 * @param {string} question
 */
export function isWcKnockoutSlateQuestion(question) {
  return (
    isWcDailyFixtureValueQuestion(question) || isWcKnockoutSlateCoreQuestion(question)
  );
}

/**
 * Multi-match slate spread / goal-total board ("best spreads for each match today").
 * @param {string} question
 */
export function isWcSlateMarketBoardQuestion(question) {
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  if (!q || isWcSlateRoutingExclusion(q)) return false;
  if (!isWcMultiMatchSlateCue(q)) return false;
  if (!isWcSlateBetMarketCue(q)) return false;
  return isWcSlateDayCue(q) || /\bworld cup\b/i.test(q);
}

/**
 * @param {string} question
 * @returns {"spreads" | "totals" | "both" | null}
 */
export function resolveWcSlateMarketBoardMode(question) {
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  if (!isWcSlateMarketBoardQuestion(q)) return null;
  const wantsSpread = /\b(spreads?|handicaps?|asian handicap|handicap)\b/i.test(q);
  const wantsTotals =
    /\b(goal\s*totals?|totals?|over\/under|o\/u)\b/i.test(q) ||
    /\b(?:the\s+)?over\b/i.test(q) ||
    /\bunders?\b/i.test(q) ||
    /\bover\s+\d+(?:\.\d+)?\b/i.test(q) ||
    /\bunder\s+\d+(?:\.\d+)?\b/i.test(q) ||
    /\b\d+\+?\s*goals?\b/i.test(q);
  const wantsMoneyline = /\bmoneylines?\b/i.test(q) || /\bML\b/.test(q);
  if (wantsSpread && (wantsTotals || wantsMoneyline)) return "both";
  if (wantsSpread && wantsTotals) return "both";
  if (wantsSpread) return "spreads";
  if (wantsTotals) return "totals";
  if (wantsMoneyline) return "spreads";
  return "totals";
}

/**
 * Broad slate picks ("sneaky bets tomorrow") — route to fixture slate prebuilt, not full LLM.
 * @param {string} question
 * @param {{ fromWcTab?: boolean }} [opts]
 */
export function isWcTomorrowOrSlateBetQuestion(question, opts = {}) {
  return resolveWcSlateRoutingKind(question, opts) != null;
}

/**
 * @param {string} question
 */
export function isWcGroupPathMispriceQuestion(question) {
  const q = String(question || "").trim();
  if (!q) return false;
  return /\bgroup\s+[a-l]\b/i.test(q) && /\b(advancement path|path.*mispriced|mispriced.*path)\b/i.test(q);
}

/**
 * Cross-group upset / sleeper scan — "upsets people are overlooking", etc.
 * @param {string} question
 */
export function isWcGroupUpsetScanQuestion(question) {
  const q = extractLatestUserTurnForRouting(String(question || "").trim());
  if (!q) return false;
  if (isWcGroupPathMispriceQuestion(q)) return false;
  if (isWcTomorrowOrSlateBetQuestion(q)) return false;
  if (/\b(most mispriced|which (?:world cup )?group|group[\s-]*stage\s+value)\b/i.test(q)) {
    return false;
  }

  const upsetLex =
    /\b(upset|upsets|sleeper|sleepers|dark horse|longshot|longshots|underdog|underdogs|surprise|surprises)\b/i;
  const overlookLex =
    /\b(overlook|overlooking|overlooked|missing|sleeping on|under.?the radar|no one'?s talking|nobody'?s|not talking about|people aren'?t|folks aren'?t|ignored|discounting)\b/i;
  const scanLex =
    /\b(potential|any|what|which)\b[\s\S]{0,40}\b(upset|upsets|sleepers?|surprises?)\b/i;

  return (
    (upsetLex.test(q) && overlookLex.test(q)) ||
    scanLex.test(q) ||
    /\b(upsets? people are overlooking|overlooked upsets?|overlooked angles?)\b/i.test(q)
  );
}

/** @param {string} text */
export function detectWcDeepMetaLeak(text) {
  const t = String(text || "");
  if (!t.trim()) return false;
  return (
    /\bVERIFIED CONTEXT\b/i.test(t) ||
    /\bGROUP BINDING\b/i.test(t) ||
    /\bno matches (?:are )?available\b/i.test(t) ||
    /\bI need to focus on\b/i.test(t) ||
    /\b(?:Favorite|Contender|Longshot)\s*\(\s*(?:Favorite|Contender|Longshot)\s*\)/i.test(t) ||
    /\bis four teams:\s*[^.]+\(Favorite\)[^.]+\(Contender\)[^.]+\(Longshot\)[^.]+\(Longshot\)/i.test(t)
  );
}

/**
 * @param {string} question
 * @param {string} body
 * @param {Record<string, unknown> | null | undefined} [structured]
 */
export function detectMissingComparativeProof(question, body, structured) {
  const q = String(question || "").trim();
  if (
    !isWcCrossGroupMispriceQuestion(q) &&
    !isWcGroupPathMispriceQuestion(q) &&
    !isWcGroupUpsetScanQuestion(q)
  ) {
    return false;
  }

  const blob = [
    body,
    structured?.line,
    structured?.whyNow,
    structured?.call,
  ]
    .filter(Boolean)
    .join("\n");

  if (isWcCrossGroupMispriceQuestion(q)) {
    const letters = [
      ...new Set(
        [...blob.matchAll(/\bgroup\s+([a-l])\b/gi)].map((m) => m[1].toUpperCase()),
      ),
    ];
    const hasCompare =
      /(vs\.?|compared to|over group|rank|second|next-best|delta|wider|tighter|runner-up)/i.test(
        blob,
      );
    return letters.length < 2 || !hasCompare;
  }

  if (isWcGroupPathMispriceQuestion(q)) {
    const hasCompare =
      /(vs\.?|compared|second|win group|escape|advance|path|delta|market)/i.test(blob);
    const hasTeam =
      /\b(USA|PAR|AUS|TUR|Paraguay|Australia|Türkiye|Turkey|United States)\b/i.test(blob);
    return !hasCompare || !hasTeam;
  }

  return false;
}

export const WC_SIM_ATTRIBUTION_PROMPT = `SIM ATTRIBUTION (internal + card face):
- Cite sim vs market in plain language on the card face: "UR sim 24% vs market 50% (-26pt)" — no bracket prefix, no "Poisson/Elo" labels unless the user asks how the model works.
- GROUP_MISPRICE_RANKING context may use [UR model · …] for LLM grounding only — strip before user-facing fields.`;

/** Card-face WHY must cite a number — odds, implied %, or sim. */
export const WC_CARD_FACE_NUMERIC_RE =
  /(?:\bat\s+|[·\-–—]\s*)[+-]\d{2,}\b|\b\d+\.?\d*\s*%|\bsim(?:s)?\s+\d|\b\d+\.?\d*\s*(?:advance|win|qf|sf|reach|group)\b|\bmarket[^.\n]{0,48}\d+\.?\d*\s*%|\bvs market[^.\n]{0,24}\d+\.?\d*\s*%/i;

/**
 * @param {string} text
 */
export function wcCardFaceBlobHasNumericWhy(text) {
  return WC_CARD_FACE_NUMERIC_RE.test(String(text || ""));
}

/**
 * @param {Record<string, unknown> | null | undefined} structured
 */
export function isWcNonBettingCardCallType(structured) {
  const ct = String(structured?.callType || "").toLowerCase();
  return ct === "rules" || ct === "predictions_roundup" || ct === "goalscorers_list";
}

/**
 * @param {Record<string, unknown> | null | undefined} structured
 */
export function wcCardFaceNumericWhyFields(structured) {
  const whyNow = String(structured?.whyNow || "").trim();
  const line = String(structured?.line || "").trim();
  return { whyNow, line, faceBlob: [whyNow, line].filter(Boolean).join(" ") };
}

/**
 * @param {string} american
 * @returns {number | null}
 */
function wcAmericanImpliedPct(american) {
  const n = parseInt(String(american || "").replace(/[^\d+-]/g, ""), 10);
  if (!Number.isFinite(n) || n === 0) return null;
  if (n > 0) return Math.round((100 / (n + 100)) * 1000) / 10;
  return Math.round((Math.abs(n) / (Math.abs(n) + 100)) * 1000) / 10;
}

function isWcMatchTotalsStructured(structured) {
  const blob = [structured?.call, structured?.lean, structured?.callType].filter(Boolean).join(" ");
  return /\b(?:over|under)\s+\d+(?:\.\d+)?\s*goals?\b/i.test(blob);
}

/**
 * @param {Record<string, unknown> | null | undefined} structured
 * @param {string} [question]
 * @param {{ wcIntent?: string }} [opts]
 */
export function detectMissingWcCardFaceNumericWhy(structured, question = "", opts = {}) {
  if (!structured || typeof structured !== "object") return false;
  if (structured.wcNamedPlayerPropsCard === true) return false;
  if (isWcNonBettingCardCallType(structured)) return false;

  const wcIntent = String(opts.wcIntent || "").toLowerCase();
  if (wcIntent === "rules") return false;

  const q = String(question || "").trim();
  if (
    /\b(how do|what is a|what are the|rules|explain|extra time|penalty shootout)\b/i.test(q) &&
    !/\b(bet|odds|lean|pass|value|mispric|play)\b/i.test(q)
  ) {
    return false;
  }

  const { faceBlob } = wcCardFaceNumericWhyFields(structured);
  return !wcCardFaceBlobHasNumericWhy(faceBlob);
}

/**
 * @param {Record<string, unknown> | null | undefined} structured
 * @param {string} [question]
 */
export function synthesizeWcCardFaceNumericWhy(structured, question = "") {
  void question;
  const line = String(structured?.line || "").trim();
  if (line && wcCardFaceBlobHasNumericWhy(line)) return line;

  const blob = [
    structured?.line,
    structured?.lean,
    structured?.call,
    structured?.deep,
    structured?.whyNow,
  ]
    .filter(Boolean)
    .join("\n");

  if (isWcMatchTotalsStructured(structured)) {
    const posted = blob.match(
      /posted\s+(\d+\.?\d*)\s+total[^.\n]{0,32}(?:over|under)\s+([+-]\d+)/i,
    );
    if (posted) {
      const implied = wcAmericanImpliedPct(posted[2]);
      const pct = implied != null ? ` (~${implied}% implied)` : "";
      return `Posted ${posted[1]} total — book ${posted[2]}${pct}.`;
    }
    const totalGoals = blob.match(/total\s+(\d+\.?\d*)\s*goals?[^.\n]{0,24}over\s+([+-]\d+)/i);
    if (totalGoals) {
      const implied = wcAmericanImpliedPct(totalGoals[2]);
      const pct = implied != null ? ` (~${implied}% implied)` : "";
      return `Posted ${totalGoals[1]} total — over ${totalGoals[2]}${pct}.`;
    }
    const whyNow = String(structured?.whyNow || "").trim();
    if (whyNow && !/^sims:/i.test(whyNow)) return capWcCharsAtWord(whyNow, 180);
    return "";
  }

  const leg = blob.match(/over\s+(\d+(?:\.\d+)?)\s+(?:at\s+|[·\-–—]\s*)([+-]\d+)/i);
  if (leg) {
    const implied = wcAmericanImpliedPct(leg[2]);
    const pct = implied != null ? ` (~${implied}% implied)` : "";
    return `Over ${leg[1]} at ${leg[2]}${pct} — nearest posted line to your ask.`;
  }

  const odds = blob.match(/\b(-1[0-9]{2}|\+[1-9]\d{2,4})\b/)?.[0];
  const simPct =
    blob.match(/(?:UR\s+)?sims?[^.\n]{0,48}(\d+\.?\d*)\s*%/i)?.[1] ||
    blob.match(/(\d+\.?\d*)\s*%\s+(?:to\s+)?advance(?:\s+from|\s+in|\b)/i)?.[1];
  const marketPct = blob.match(/(?:market|implies)[^.\n]{0,32}~?(\d+\.?\d*)\s*%/i)?.[1];

  if (odds && simPct) {
    return `Listed ${odds} · sims ${simPct}%${marketPct ? ` vs market ~${marketPct}%` : ""}.`;
  }
  if (odds) {
    return `Listed at ${odds} — price check vs script in breakdown.`;
  }
  if (simPct) {
    return `Sims: ${simPct}% path — see breakdown for market compare.`;
  }

  const leanOdds = String(structured?.lean || "").match(/\b([+-]\d{2,})\b/)?.[1];
  if (leanOdds) {
    return `Market ${leanOdds} — one-line price vs path in breakdown.`;
  }

  return "";
}

/**
 * @param {Record<string, unknown> | null | undefined} structured
 * @param {string} [question]
 * @param {{ wcIntent?: string }} [opts]
 */
export function ensureWcCardFaceNumericWhy(structured, question = "", opts = {}) {
  if (!structured || typeof structured !== "object") return structured;
  if (!detectMissingWcCardFaceNumericWhy(structured, question, opts)) return structured;

  const synthesized = synthesizeWcCardFaceNumericWhy(structured, question);
  if (!synthesized) return structured;

  const out = { ...structured };
  const whyNow = String(out.whyNow || "").trim();
  if (!whyNow || !wcCardFaceBlobHasNumericWhy(whyNow)) {
    out.whyNow = synthesized;
  }
  return out;
}

export const WC_COMPARATIVE_PROOF_PROMPT = `COMPARATIVE PROOF (mandatory for ranking / misprice claims):
- "Most mispriced group" → cite GROUP_MISPRICE_RANKING from VERIFIED CONTEXT: name #1 and #2 groups with delta.
- "Group X advancement path" → compare at least two paths or teams in that group (win group vs escape vs R16) with numbers.
- Never claim a superlative without naming the runner-up or alternate path.`;

export { WC_USER_FACING_COPY_PROMPT } from "./wcUserFacingCopy.js";

export const WC_DEDUP_PROMPT = `BREAKDOWN DEDUP (mandatory):
- WHY (whyNow) and WATCH FOR (edge) must be distinct sentences — never copy WHY into WATCH FOR.
- FULL BREAKDOWN (deep) must add roster paths, bracket context, or market lines not repeated in WHY.
- WATCH FOR must be a live trigger (lineup, injury, fixture result) — not a restatement of the thesis.`;

export const WC_NEEDS_ATTRIBUTION_QA_SUFFIX = `

WC SIM ATTRIBUTION QA (mandatory — prior answer omitted sim source):
- When citing sim percentages, say "UR sim" vs market — do not use bare percentages alone.
- Do not put [UR model · 10k Poisson/Elo · date] on the card face unless the user asked about methodology.`;

export const WC_NEEDS_DEDUP_QA_SUFFIX = `

WC DEDUP QA (mandatory — prior answer repeated WHY in WATCH FOR):
- WATCH FOR must be a new sentence — not the last sentence of deep and not a copy of WHY.
- Add a concrete trigger: lineup lock, injury, fixture result, or bracket shift.`;

export const WC_NEEDS_COMPARATIVE_QA_SUFFIX = `

WC COMPARATIVE PROOF QA (mandatory — prior answer claimed misprice without comparison):
- Ranking claims require a second group or alternate path with numbers from GROUP_MISPRICE_RANKING or VERIFIED CONTEXT.
- Name the runner-up explicitly (e.g. "Group I is second — Group D delta is wider").`;

export const WC_NEEDS_NUMERIC_WHY_QA_SUFFIX = `

WC CARD FACE NUMERIC WHY QA (mandatory — prior answer lacked a why clause with a number):
- Card face WHY (whyNow) or LINE must include one number: American odds (+600 / -135), implied %, or sim %.
- BAD: roster trivia or thesis with no price/sim anchor.
- GOOD: "Over 3 at -135 (~57% implied) — nearest posted line to your ask." OR "Market -130 · sim 15% vs market ~57%."
- Never ship lean-only card face — one numeric why line is mandatory on every betting take.`;
