/** Shared Anthropic model ids for lightweight UR Take satellite calls. */
export const UR_TAKE_HAIKU_MODEL = "claude-haiku-4-5-20251001";

/** Default Sonnet class model for opening structured cards (override via ANTHROPIC_MODEL). */
export const UR_TAKE_SONNET_MODEL_DEFAULT = "claude-sonnet-5";

/**
 * Sonnet 5 rejects non-default sampling params and runs adaptive thinking unless disabled.
 * @param {string} [model]
 */
export function isClaudeSonnet5Model(model) {
  const m = String(model || "")
    .trim()
    .toLowerCase();
  return m === "claude-sonnet-5" || m.startsWith("claude-sonnet-5-");
}
