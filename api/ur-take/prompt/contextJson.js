/** Model context JSON serialization for LLM prompts. */
export function stripOddsAvailabilityFromContext(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(stripOddsAvailabilityFromContext);
  if (typeof value === "object") {
    const out = { ...value };
    delete out.oddsAvailable;
    for (const k of Object.keys(out)) {
      out[k] = stripOddsAvailabilityFromContext(out[k]);
    }
    return out;
  }
  return value;
}

export function contextJsonForModel(obj) {
  return JSON.stringify(stripOddsAvailabilityFromContext(obj ?? {}), null, 2);
}
