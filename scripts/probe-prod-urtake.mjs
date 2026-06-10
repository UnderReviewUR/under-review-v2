const base = process.argv[2] || "https://under-review.app";

const cases = [
  {
    id: "wc03",
    sport: "worldcup",
    question:
      "What's the best group-stage value bet right now — one pick, direct answer?",
  },
  {
    id: "nba-finals",
    sport: "nba",
    question:
      "NBA Finals Game 4 tonight (SAS @ NYK): Knicks lead the series 2-1. what is the sharpest angle — spread, total, or key prop — and what one thing flips the read?",
  },
];

for (const c of cases) {
  const t0 = Date.now();
  const res = await fetch(`${base}/api/ur-take`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: c.question, sport: c.sport }),
  });
  const raw = await res.text();
  let j = null;
  try {
    j = JSON.parse(raw);
  } catch {
    j = { _parseError: raw.slice(0, 400) };
  }
  console.log(
    JSON.stringify(
      {
        id: c.id,
        status: res.status,
        elapsedMs: Date.now() - t0,
        fallback: j?.fallback,
        fallbackReason: j?.fallbackReason,
        sport: j?.sport,
        wcIntent: j?.wcIntent,
        responseHead: String(j?.response || "").slice(0, 220),
        structured: j?.structured
          ? {
              callType: j.structured.callType,
              call: String(j.structured.call || "").slice(0, 80),
              edge: String(j.structured.edge || "").slice(0, 120),
              line: String(j.structured.line || "").slice(0, 120),
              lean: String(j.structured.lean || "").slice(0, 80),
            }
          : null,
        topKeys: j && typeof j === "object" ? Object.keys(j) : [],
      },
      null,
      2,
    ),
  );
}
