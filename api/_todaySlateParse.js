/**
 * Shared helpers for `/api/today-slate` Anthropic output (also unit-tested).
 */

/** First `{` … matching `}` slice (string-aware), so trailing ``` or prose cannot break JSON.parse. */
export function extractFirstBalancedJsonObject(s) {
  const str = String(s || "");
  const start = str.indexOf("{");
  if (start < 0) return "";
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < str.length; i++) {
    const c = str[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\" && inString) {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === "{") depth += 1;
    else if (c === "}") {
      depth -= 1;
      if (depth === 0) return str.slice(start, i + 1);
    }
  }
  return "";
}

/**
 * Parse Anthropic output into slate JSON. Models often wrap JSON in ```json fences
 * despite instructions — strip fences, slice balanced `{...}`, repair common glitches.
 */
export function safeParseSlateJson(text) {
  let raw = String(text || "").trim();
  raw = raw
    .replace(/^\uFEFF/, "")
    .replace(/```(?:json|JSON)?\s*/g, "")
    .replace(/```\s*$/g, "")
    .trim();
  const braceStart = raw.indexOf("{");
  if (braceStart > 0) raw = raw.slice(braceStart);

  const tryParse = (s) => {
    try {
      const o = JSON.parse(s);
      return o && typeof o === "object" ? o : null;
    } catch {
      return null;
    }
  };

  let candidate = raw.trim();
  let o = tryParse(candidate);
  if (o) return o;

  const balanced = extractFirstBalancedJsonObject(raw);
  if (balanced) {
    o = tryParse(balanced);
    if (o) return o;
    const relaxed = balanced
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/,\s*([}\]])/g, "$1");
    o = tryParse(relaxed);
    if (o) return o;
  }

  const greedy = raw.match(/\{[\s\S]*\}/);
  if (greedy) {
    o = tryParse(greedy[0]);
    if (o) return o;
  }
  return null;
}
