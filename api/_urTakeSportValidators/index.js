import { lintCrossSportOutput, lintGenericSportContextGap } from "./_shared.js";
import { lintSportEvidenceEnforcement } from "./_evidenceEnforcement.js";
import { lintMlbOutput } from "./mlb.js";
import { lintNflOutput } from "./nfl.js";
import { lintGolfOutput } from "./golf.js";
import { lintF1Output, lintF1WrongSportCrossContamination } from "./f1.js";
import { lintNhlOutput } from "./nhl.js";
import { lintSoccerOutput } from "./soccer.js";
import { lintTennisOutput } from "./tennis.js";
import { lintNbaOutput } from "./nba.js";

export { lintMlbOutput } from "./mlb.js";
export { lintNflOutput } from "./nfl.js";
export { lintGolfOutput } from "./golf.js";
export { lintF1Output } from "./f1.js";
export { lintNhlOutput } from "./nhl.js";
export { lintSoccerOutput } from "./soccer.js";
export { lintTennisOutput } from "./tennis.js";
export { lintNbaOutput } from "./nba.js";
export { lintCrossSportOutput, lintGenericSportContextGap, splitSentences } from "./_shared.js";
export {
  lintSportEvidenceEnforcement,
  lintSportEvidenceClaimViolations,
  lintUnsupportedMatchupSpecificity,
  sportEvidenceLayerIsThin,
} from "./_evidenceEnforcement.js";

/**
 * @param {string | undefined | null} sport
 * @returns {string}
 */
export function normalizeSportHint(sport) {
  const x = String(sport || "")
    .trim()
    .toLowerCase();
  if (x === "tennis_wta_profile") return "tennis";
  if (x === "generic") return "generic";
  return x || "generic";
}

/**
 * @param {string} text
 * @param {object} [options]
 * @param {import("../_urTakeSportEvidence.js").SportEvidenceLayer|null|undefined} [options.sportEvidenceLayer]
 * @param {import("../_urTakeSportEvidence.js").UnsupportedClaimFlags|null|undefined} [options.unsupportedClaimFlags]
 * @returns {{ issues: Array<import("./_shared.js").SportQaIssue>, criticalCodes: string[] }}
 */
export function runSportSpecificValidators(text, options = {}) {
  const sport = normalizeSportHint(options.sport);
  /** @type {import("./_shared.js").SportQaIssue[]} */
  const issues = [];

  issues.push(...lintSportEvidenceEnforcement(text, options));
  issues.push(...lintCrossSportOutput(text));
  issues.push(...lintGenericSportContextGap(text));

  switch (sport) {
    case "mlb":
      issues.push(...lintMlbOutput(text, options));
      break;
    case "nfl":
      issues.push(...lintNflOutput(text, options));
      break;
    case "golf":
      issues.push(...lintGolfOutput(text, options));
      break;
    case "f1":
      issues.push(...lintF1Output(text, options));
      issues.push(...lintF1WrongSportCrossContamination(text));
      break;
    case "nhl":
      issues.push(...lintNhlOutput(text, options));
      break;
    case "soccer":
      issues.push(...lintSoccerOutput(text, options));
      break;
    case "tennis":
      issues.push(...lintTennisOutput(text, options));
      break;
    case "nba":
      issues.push(...lintNbaOutput(text, options));
      break;
    default:
      break;
  }

  const criticalCodes = [
    ...new Set(issues.filter((i) => i.requiresRegeneration).map((i) => i.code)),
  ];

  return { issues, criticalCodes };
}
