/**
 * Prod smoke — WC script+price philosophy deploy gate.
 * Usage: node scripts/smoke-wc-philosophy-prod.mjs [baseUrl]
 */
const base = process.argv[2] || "https://www.under-review.app";

const cases = [
  {
    id: "home-jimenez-shots",
    body: { question: "Jimenez 2+ shots?" },
    expectSport: "worldcup",
    forbid: /\b(nba|lakers|celtics|rebounds|pra)\b/i,
  },
  {
    id: "wc-tab-jimenez-shots",
    body: { question: "Jimenez 2+ shots?", sport: "worldcup" },
    expectSport: "worldcup",
    forbid: /\b(nba finals|rebounds)\b/i,
  },
  {
    id: "sgp-combo-correlation",
    body: {
      question: "Jimenez 2+ shots and Mexico team to score first goal",
      sport: "worldcup",
    },
    expectSport: "worldcup",
    prefer: /\b(correlat|same.?game|script|share one script|wins if|dies if|cleaner leg)\b/i,
  },
  {
    id: "rules-extra-time",
    body: {
      question: "What are the knockout rules for extra time?",
      sport: "worldcup",
    },
    expectSport: "worldcup",
    expectIntent: "RULES",
    forbid: /\b(pass at|cleaner leg|mispriced|correlat|script hinge)\b/i,
  },
  {
    id: "nba-unchanged",
    body: { question: "Wembanyama rebounds over 11.5", sport: "nba" },
    expectSport: "nba",
    forbid: /\b(world cup|jimenez|mexico group)\b/i,
  },
  {
    id: "home-son-shots-bdl",
    body: { question: "Son 2.5 shots?" },
    expectSport: "worldcup",
    expectIntent: "PLAYER_PROP",
    forbid: /\b(spurs|premier league|tottenham)\b/i,
    prefer:
      /\b(korea|south korea|czech|2\.5|shots|wins if|dies if|[-+]\d{2,4}|pass at|lean over|lean under)\b/i,
  },
  {
    id: "team-opener-ml-script",
    body: {
      question: "Mexico vs South Africa opener — ML or under?",
      sport: "worldcup",
    },
    expectSport: "worldcup",
    expectIntent: "MATCHUP",
    prefer: /\b(wins if|dies if|under|ML|script|pass at|cleaner leg)\b/i,
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** @type {Record<string, unknown>[]} */
const results = [];

for (const c of cases) {
  const t0 = Date.now();
  /** @type {Record<string, unknown>} */
  const row = { id: c.id, ok: false, status: 0, elapsedMs: 0, sport: null, wcIntent: null, head: "", issues: [] };
  try {
    const res = await fetch(`${base}/api/ur-take`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(c.body),
    });
    row.status = res.status;
    const text = await res.text();
    let j = {};
    try {
      j = JSON.parse(text);
    } catch {
      row.issues.push("non_json_response");
      row.head = text.slice(0, 240);
    }
    row.sport = j.sport ?? null;
    row.wcIntent = j.wcIntent ?? null;
    const blob = [
      j.response,
      j.take,
      j.structured?.call,
      j.structured?.lean,
      j.structured?.whyNow,
      j.structured?.edge,
      j.structured?.summary,
      j.structured?.deep,
      j.error,
    ]
      .filter(Boolean)
      .join(" ");
    row.head = String(blob).slice(0, 280);

    if (row.status !== 200) row.issues.push(`http_${row.status}`);
    if (c.expectSport && row.sport !== c.expectSport) {
      row.issues.push(`sport_expected_${c.expectSport}_got_${row.sport}`);
    }
    if (c.expectIntent && row.wcIntent !== c.expectIntent) {
      row.issues.push(`intent_expected_${c.expectIntent}_got_${row.wcIntent}`);
    }
    if (c.forbid && c.forbid.test(blob)) row.issues.push("forbidden_pattern");
    if (c.prefer && !c.prefer.test(blob)) row.issues.push("missing_preferred_pattern");
    row.ok = row.issues.length === 0;
  } catch (err) {
    row.issues.push(String(err?.message || err));
  }
  row.elapsedMs = Date.now() - t0;
  results.push(row);
  console.log(JSON.stringify(row));
  await sleep(8000);
}

const failed = results.filter((r) => !r.ok);
console.log(
  JSON.stringify({
    base,
    pass: results.length - failed.length,
    total: results.length,
    failed: failed.map((r) => ({ id: r.id, issues: r.issues, sport: r.sport, head: r.head })),
  }),
);
process.exit(failed.length ? 1 : 0);
