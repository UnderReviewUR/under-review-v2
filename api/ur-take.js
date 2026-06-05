/**
 * Vercel entry for /api/ur-take — re-exports config, handler, and symbols tests import.
 * Implementation lives under api/ur-take/.
 */
export { config } from "./ur-take/config.js";
export { detectIntent, resolveSportHint } from "./ur-take/intentRouting.js";
export { UR_TAKE_CORE_VOICE_PROMPT, sanitizeLeanBroTone } from "./_urTakeCoreVoice.js";
export { buildNbaUrTakeDecisionModeSpine } from "./_urTakeSystemPromptRegistry.js";

export {
  stripNbaLeadInDisclosure,
  normalizeConfidenceVocabularyInText,
  resolveQuestionNbaPlayers,
  normalizeNbaMarketPlayerKey,
  summarizeNbaNewsImpact,
  buildNbaStatusShiftSection,
  applyNbaMarketInvalidation,
  applyNbaConfidenceModifiers,
  resolveNbaDecisionMode,
  buildNbaConditionalPayload,
  resolveNbaMatchupFromQuestion,
  buildAllowedMatchupPlayerPool,
  extractMentionedPlayersFromOutput,
  validatePlayersAgainstMatchup,
  buildNbaContextForModel,
  resolveMlbDecisionMode,
} from "./ur-take/handler.js";

export { default } from "./ur-take/handler.js";
