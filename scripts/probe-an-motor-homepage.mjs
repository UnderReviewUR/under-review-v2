const UA = "UnderReview/1.0";
const r = await fetch("https://www.actionnetwork.com/motor-sports", { headers: { "User-Agent": UA } });
const html = await r.text();
const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
const data = JSON.parse(m[1]);
const hp = data?.props?.pageProps?.homepageData;
const keys = hp && typeof hp === "object" ? Object.keys(hp) : [];
const oddsSnippets = [];
function walk(o, path = "", depth = 0) {
  if (depth > 8 || !o || typeof o !== "object") return;
  if (Array.isArray(o)) {
    for (let i = 0; i < Math.min(o.length, 3); i++) walk(o[i], `${path}[${i}]`, depth + 1);
    return;
  }
  for (const [k, v] of Object.entries(o)) {
    const p = path ? `${path}.${k}` : k;
    if (/odds|price|american|book|verstappen|f1|grand prix|outright/i.test(k)) {
      oddsSnippets.push({ path: p, type: typeof v, sample: typeof v === "string" ? v.slice(0, 80) : Array.isArray(v) ? `array[${v.length}]` : null });
    }
    if (typeof v === "object") walk(v, p, depth + 1);
  }
}
walk(hp);
console.log(JSON.stringify({ homepageDataKeys: keys, oddsSnippets: oddsSnippets.slice(0, 40) }, null, 2));
