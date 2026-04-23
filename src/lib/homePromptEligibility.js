/** Shared rules for dynamic home prompts — hide “live / pre-match” nudges once the underlying event is done. */
import {
  classifyF1Race,
  classifyTennisMatch,
  EVENT_VALIDITY,
  isDisplayableValidity,
} from "../../shared/eventValidity.js";

export function isTennisMatchFinished(m) {
  return classifyTennisMatch(m) === EVENT_VALIDITY.FINISHED;
}

/** F1 “next” race row, or null once that GP is complete (no race-day prompt). */
export function getF1NextRaceForHomePrompts(f1Data) {
  const nextRace = f1Data?.schedule?.races?.find((r) => r?.is_next);
  if (!nextRace) return null;
  if (!isDisplayableValidity(classifyF1Race(nextRace))) return null;
  return nextRace;
}
