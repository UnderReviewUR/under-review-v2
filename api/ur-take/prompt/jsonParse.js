export function tryParseJsonObject(text) {
  const raw = String(text || "").trim();
  const parse = (s) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };
  let o = parse(raw);
  if (o) return o;
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    o = parse(fence[1].trim());
    if (o) return o;
  }
  const m = raw.match(/\{[\s\S]*\}\s*$/);
  if (m) return parse(m[0]);
  return null;
}
