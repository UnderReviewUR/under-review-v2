/**
 * Client-safe re-export — preview trim utilities (no Node-only APIs).
 * Server code may import shared/textUtils.js directly.
 */
export {
  dropIncompleteSentenceFragment,
  trimToCompleteSentence,
} from "../../shared/textUtils.js";
