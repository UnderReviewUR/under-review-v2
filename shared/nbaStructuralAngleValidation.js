/**
 * @deprecated Import from `shared/structuralAngleValidation.js` — re-exports for backward compatibility.
 */
import { classifyNbaRosterPosition } from "./structuralAngleValidation.js";

export {
  buildNbaStructuralPlayerIndex,
  classifyNbaRosterPosition,
  enrichNbaInjuriesWithStructuralImpact,
  fetchEspnDepthRotationKeysByTeam,
  filterInjurySummaryForStructuralAngles,
  lintNbaStructuralAngleViolations,
  meetsNbaStructuralImpactThreshold,
  narrativeClaimsInteriorVacancyForPlayer,
  sanitizeNbaNewsImpactForStructuralAngles,
  validateStructuralAngleCopy,
  validatePlayerForStructuralAngle,
} from "./structuralAngleValidation.js";

/** @param {string} position */
export function isNbaGuardPosition(position) {
  return classifyNbaRosterPosition(position) === "guard";
}

export { LOW_IMPACT_PLAYER_BLOCKLIST as NBA_STRUCTURAL_IRRELEVANT_PLAYERS } from "./lowImpactPlayerBlocklist.js";
