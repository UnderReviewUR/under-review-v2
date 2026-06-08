const q =
  "What's the best group-stage value bet right now — one pick, direct answer?";

const bodies = [
  { question: q, sportHint: "worldcup" },
  { question: q, sportHint: "worldcup", history: [] },
  { question: "group stage value bet", sportHint: "worldcup" },
];

for (const body of bodies) {
  const r = await fetch("https://under-review.app/api/ur-take", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const t = await r.text();
  console.log(r.status, t.slice(0, 150));
}
