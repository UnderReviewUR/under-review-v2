/**
 * World Cup UR Take — MATCHUP intent prompt + Favorite/Contender QA helpers.
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import { isKnockoutPhase } from "./wcPhaseUtils.js";
import { wcTeamDisplayNames } from "./wcUrTakeEntityBinding.js";

/**
 * @param {Record<string, Array<{ abbreviation?: string, strengthTag?: string }>> | null | undefined} groups
 * @param {string[]} requiredEntities
 * @returns {Record<string, "Favorite"|"Contender"|"Longshot"|string>}
 */
export function getWcTeamStrengthTags(groups, requiredEntities = []) {
  /** @type {Record<string, string>} */
  const tags = {};
  const wanted = new Set(
    (requiredEntities || []).map((t) => String(t || "").toUpperCase()).filter(Boolean),
  );
  if (!wanted.size) return tags;

  if (groups && typeof groups === "object") {
    for (const teams of Object.values(groups)) {
      if (!Array.isArray(teams)) continue;
      for (const team of teams) {
        const abbr = String(team?.abbreviation || "").toUpperCase();
        if (!abbr || !wanted.has(abbr)) continue;
        tags[abbr] = String(team?.strengthTag || "").trim() || "unknown";
      }
    }
  }

  for (const abbr of wanted) {
    if (tags[abbr]) continue;
    const staticTeam = WC_2026_TEAMS.find((t) => String(t.abbreviation).toUpperCase() === abbr);
    if (staticTeam) {
      const groupTeams = WC_2026_TEAMS.filter((t) => t.group === staticTeam.group).sort(
        (a, b) => Number(b.eloRating) - Number(a.eloRating),
      );
      const rank = groupTeams.findIndex((t) => String(t.abbreviation).toUpperCase() === abbr);
      if (rank === 0) tags[abbr] = "Favorite";
      else if (rank === 1) tags[abbr] = "Contender";
      else tags[abbr] = "Longshot";
    }
  }

  return tags;
}

/**
 * @param {{ phase?: string, isGroupStage?: boolean }} [opts]
 */
export function buildWcMatchupIntentRules(opts = {}) {
  const phase = opts.phase || "GROUP_STAGE";
  const groupStage =
    opts.isGroupStage !== undefined ? opts.isGroupStage : !isKnockoutPhase(phase);

  const lines = [
    "MATCHUP INTENT RULES (binding):",
    "- Always name both teams in sentence one and state their strength tags (Favorite / Contender / Longshot) from VERIFIED CONTEXT.",
    "- Do not carry strong opinions or narratives from previous questions about different matchups or teams.",
    "- Be cautious with strong advancement claims without live form, confirmed lineups, or verified odds.",
  ];

  if (groupStage) {
    lines.push(
      "- Group stage: frame \"who advances\" as qualification paths (1st and 2nd place both advance) — not a knockout H2H winner pick.",
      "- Group opener / host Game 1: scripts skew cautious (rotation, crowd opener) — do not price a must-win knockout script.",
      "- Default lean: the group Favorite is heavily favored to finish 1st; a Contender's realistic path is usually 2nd place, not finishing ahead of the Favorite.",
      '- Do not claim a Contender finishes "ahead of", "above", or "over" the group Favorite unless citing specific verified odds or form.',
      "- Present balanced probabilities for both teams' paths when odds are unavailable.",
      "- Match ML / spread / total: state what each line implies vs your scoreboard script (ML = win; -1.5 = multi-goal; U2.5 = tight favorite win).",
      "- Group opener: modal script is cautious — Pass on ML when fair and name cleaner leg (U2.5, DNB, both advance) in THE PLAY.",
      "- Wins-if / dies-if: one plain-English hinge each — tied to the market you cite from FIXTURE MATCH ODDS.",
    );
  } else {
    lines.push(
      "- Knockout fixture: one team advances — factor extra time and penalties if level after 90 minutes.",
      "- Cite FIXTURE MATCH ODDS when present; otherwise use structural knockout path language only.",
    );
  }

  return lines.join("\n");
}

const CONTENDER_AHEAD_RE =
  /\b(ahead of|above|over|finishes?\s+(?:above|ahead|higher than)|beats?\s+(?:out\s+)?(?:the\s+)?)\b/i;

/**
 * Detect headline claiming a Contender finishes ahead of the group Favorite.
 * @param {string} headline
 * @param {Record<string, string>} strengthTags
 */
export function detectContenderAheadOfFavoriteClaim(headline, strengthTags = {}) {
  const text = String(headline || "");
  if (!text.trim() || !CONTENDER_AHEAD_RE.test(text)) return false;

  const favorites = Object.entries(strengthTags)
    .filter(([, tag]) => String(tag).toLowerCase() === "favorite")
    .map(([abbr]) => abbr);
  const contenders = Object.entries(strengthTags)
    .filter(([, tag]) => String(tag).toLowerCase() === "contender")
    .map(([abbr]) => abbr);

  if (!favorites.length || !contenders.length) return false;

  for (const contAbbr of contenders) {
    const contNames = wcTeamDisplayNames(contAbbr);
    const contMentioned = contNames.some((n) => new RegExp(`\\b${escapeRe(n)}\\b`, "i").test(text));
    if (!contMentioned) continue;

    for (const favAbbr of favorites) {
      const favNames = wcTeamDisplayNames(favAbbr);
      const favMentioned = favNames.some((n) => new RegExp(`\\b${escapeRe(n)}\\b`, "i").test(text));
      if (!favMentioned) continue;

      for (const cn of contNames) {
        for (const fn of favNames) {
          const aheadPatterns = [
            new RegExp(`\\b${escapeRe(cn)}\\b[^.]{0,80}\\b(ahead of|above|over)\\b[^.]{0,40}\\b${escapeRe(fn)}\\b`, "i"),
            new RegExp(
              `\\b${escapeRe(cn)}\\b[^.]{0,40}\\badvances?\\b[^.]{0,80}\\b(ahead of|above|over)\\b[^.]{0,40}\\b${escapeRe(fn)}\\b`,
              "i",
            ),
            new RegExp(
              `\\b${escapeRe(cn)}\\b[^.]{0,40}\\badvances?\\b[^.]{0,40}\\b${escapeRe(fn)}\\b`,
              "i",
            ),
          ];
          if (aheadPatterns.some((re) => re.test(text))) return true;
        }
      }
    }
  }

  return false;
}

/** @param {string} s */
function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
