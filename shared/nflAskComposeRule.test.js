import assert from "node:assert/strict";
import test from "node:test";
import {
  NFL_ASK_COMPOSE_RULE,
  buildNflAskComposePromptBlock,
  nflAskGradeExemptPockets,
} from "./nflAskComposeRule.js";
import { buildNflAskDisciplinePromptBlock } from "./nflAskDiscipline.js";
import { resolveNflSuitcaseGuard } from "./nflAskGuard.js";
import { detectNflAskMarket } from "./nflGoatExtractionContract.js";

test("compose rule summary is one suitcase rule", () => {
  assert.match(NFL_ASK_COMPOSE_RULE.summary, /Answer the asked market/i);
  assert.match(NFL_ASK_COMPOSE_RULE.summary, /PASS only/i);
});

test("compose prompt block ships every discipline turn", () => {
  const block = buildNflAskDisciplinePromptBlock({ question: "Who wins NE @ SEA?" });
  assert.match(block, /UR COMPOSE RULE/);
  assert.match(block, /Opinion \/ who-wins/);
  assert.equal(detectNflAskMarket("Who wins NE @ SEA?").marketId, "opinion");
});

test("grade-exempt pockets spare props for non-prop asks", () => {
  const opinion = nflAskGradeExemptPockets({ marketId: "opinion", propTypeHints: [] });
  assert.ok(opinion.has("slate.playerProps"));
  assert.ok(opinion.has("league.rosters"));
  assert.ok(opinion.has("slate.odds"));
  const spread = nflAskGradeExemptPockets({ marketId: "spread", propTypeHints: [] });
  assert.ok(spread.has("slate.playerProps"));
  assert.equal(spread.has("slate.odds"), false);
  const prop = nflAskGradeExemptPockets({
    marketId: "pass_tds",
    propTypeHints: ["passing_tds"],
  });
  assert.equal(prop.size, 0);
});

test("resolveNflSuitcaseGuard does not force PASS on opinion with empty props", () => {
  const detected = detectNflAskMarket("Who wins NE @ SEA?");
  const g = resolveNflSuitcaseGuard(
    {
      grade: "green",
      detected,
      propMatch: { matched: 0 },
      missingNeeded: [],
      forcePass: false,
    },
    "Who wins NE @ SEA?",
  );
  assert.equal(g.forcePass, false);
  assert.equal(g.priced, false);
});

test("resolveNflSuitcaseGuard does not treat empty props as missing spread price", () => {
  const detected = detectNflAskMarket("spread on CIN -6.5?");
  const g = resolveNflSuitcaseGuard(
    {
      grade: "yellow",
      detected,
      propMatch: { matched: 0 },
      missingNeeded: ["slate.playerProps", "league.rosters"],
      forcePass: false,
    },
    "spread on CIN -6.5?",
  );
  assert.equal(g.forcePass, false);
  assert.equal(g.priced, true);
});

test("compose prompt names live board vs paste", () => {
  const p = buildNflAskComposePromptBlock();
  assert.match(p, /live row/i);
  assert.match(p, /do not invent/i);
});
