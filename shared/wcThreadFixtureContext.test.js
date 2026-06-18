import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcThreadFixtureStack,
  resolveWcThreadFixtureContext,
} from "./wcThreadFixtureContext.js";

const STUB_MATCHES = [
  {
    id: "22",
    homeTeam: "GHA",
    awayTeam: "PAN",
    status: "scheduled",
    commenceTs: Date.now() + 86_400_000,
  },
  {
    id: "24",
    homeTeam: "UZB",
    awayTeam: "COL",
    status: "scheduled",
    commenceTs: Date.now() + 172_800_000,
  },
  {
    id: "30",
    homeTeam: "MAR",
    awayTeam: "BRA",
    status: "scheduled",
    commenceTs: Date.now() + 259_200_000,
  },
  {
    id: "760424",
    homeTeam: "SWE",
    awayTeam: "TUN",
    status: "scheduled",
    commenceTs: Date.now() + 3_600_000,
  },
];

test("resolveWcThreadFixtureContext — Uzbek match follow-up pins UZB/COL not GHA/PAN", () => {
  const history = [
    { role: "user", content: "Best bet on UZB vs COL if I only know the moneyline?" },
    { role: "assistant", content: "Lean Over 2.5 goals." },
    { role: "user", content: "What about the Uzbek match?" },
    { role: "assistant", content: "Colombia should control tempo." },
  ];
  const res = resolveWcThreadFixtureContext({
    question: "best players prop parlays?",
    history,
    matches: STUB_MATCHES,
  });
  assert.equal(res.pinned?.home, "UZB");
  assert.equal(res.pinned?.away, "COL");
  assert.equal(res.pinned?.eventId, "24");
});

test("resolveWcThreadFixtureContext — single nation ref MAR beats older assistant pair text", () => {
  const history = [
    { role: "user", content: "Best bet on Ghana vs Panama moneyline?" },
    {
      role: "assistant",
      content: "Lean Panama ML",
      structured: { fixtureHome: "GHA", fixtureAway: "PAN", wcEventId: "22" },
    },
    { role: "assistant", content: "Under 2.5 for Uzbekistan vs Colombia" },
    { role: "user", content: "Morocco props?" },
    { role: "assistant", content: "Hakimi board thin" },
  ];
  const res = resolveWcThreadFixtureContext({
    question: "best parlays?",
    history,
    matches: STUB_MATCHES,
  });
  assert.equal(res.pinned?.home, "MAR");
  assert.equal(res.pinned?.away, "BRA");
  assert.equal(res.pinned?.eventId, "30");
});

test("resolveWcThreadFixtureContext — multiple nation refs block pin (ambiguous)", () => {
  const history = [
    { role: "user", content: "Best bet on Ghana vs Panama moneyline?" },
    {
      role: "assistant",
      content: "Lean Panama ML",
      structured: { fixtureHome: "GHA", fixtureAway: "PAN", wcEventId: "22" },
    },
    { role: "user", content: "What about Uzbek total?" },
    { role: "assistant", content: "Under 2.5 for Uzbekistan vs Colombia" },
    { role: "user", content: "Morocco props?" },
    { role: "assistant", content: "Hakimi board thin" },
  ];
  const res = resolveWcThreadFixtureContext({
    question: "best parlays?",
    history,
    matches: STUB_MATCHES,
  });
  assert.equal(res.pinned, null);
  assert.equal(res.ambiguous, true);
  assert.ok(res.caveat?.includes("confirm which match"));
});

test("resolveWcThreadFixtureContext — structured thread wins for SWE/TUN follow-up", () => {
  const history = [
    { role: "user", content: "Best bet on SWE vs TUN if I only know the moneyline?" },
    {
      role: "assistant",
      content: "Lean Under 2.5",
      structured: { fixtureHome: "SWE", fixtureAway: "TUN", wcEventId: "760424" },
    },
  ];
  const res = resolveWcThreadFixtureContext({
    question: "best player props for this game?",
    history,
    matches: STUB_MATCHES,
  });
  assert.equal(res.pinned?.eventId, "760424");
  assert.equal(res.pinned?.home, "SWE");
  assert.equal(res.pinned?.away, "TUN");
});

test("buildWcThreadFixtureStack — newest nation ref appears before older pair", () => {
  const history = [
    { role: "user", content: "Ghana vs Panama" },
    { role: "assistant", content: "Lean ML" },
    { role: "user", content: "Morocco props?" },
  ];
  const stack = buildWcThreadFixtureStack(history);
  assert.equal(stack[0]?.source, "nation_ref");
  assert.deepEqual(stack[0]?.nations, ["MAR"]);
});

test("resolveWcThreadFixtureContext — explicit Ghana in question overrides stack", () => {
  const history = [
    { role: "user", content: "Best bet on Ghana vs Panama moneyline?" },
    { role: "assistant", content: "Lean ML", structured: { fixtureHome: "GHA", fixtureAway: "PAN" } },
    { role: "user", content: "Morocco props?" },
  ];
  const res = resolveWcThreadFixtureContext({
    question: "best parlays for Ghana?",
    history,
    matches: STUB_MATCHES,
  });
  assert.equal(res.pinned?.home, "GHA");
  assert.equal(res.pinned?.away, "PAN");
});
