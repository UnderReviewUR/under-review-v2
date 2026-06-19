/**
 * WC turn-artifact SLO gates — numeric release criteria for golden threads.
 * Wrong-lane / wrong-fixture / honest-empty on canned artifact fixtures.
 */

import { extractWcTurnArtifact, extractWcTurnArtifactsFromHistory } from "./wcTurnArtifact.js";
import { projectWcFollowUpChips } from "./wcTurnArtifactProjections.js";
import { WC_CARD_TYPE } from "./wcThreadState.js";

/** @typedef {{
 *   id: string,
 *   structured: Record<string, unknown>,
 *   history?: Array<{ role: string, structured?: Record<string, unknown> }>,
 *   forbidChipPatterns?: RegExp[],
 *   requireChipPatterns?: RegExp[],
 *   expectCardType?: string,
 *   expectNamedLeg?: boolean,
 * }} WcTurnArtifactSloCase */

/** @type {WcTurnArtifactSloCase[]} */
export const WC_TURN_ARTIFACT_SLO_GOLDEN = [
  {
    id: "mex-kor-named-legs-no-goals-bleed",
    structured: {
      wcNamedPlayerPropsCard: true,
      cardType: "single_lean",
      fixtureHome: "MEX",
      fixtureAway: "KOR",
      lean: "1. Jimenez over 2.5 shots +120\n2. Quinones over 2.5 shots -105",
      call: "2 of 2 playable",
    },
    forbidChipPatterns: [/goals/i, /Over 3/i],
    requireChipPatterns: [/parlay/i],
    expectNamedLeg: true,
  },
  {
    id: "aus-usa-prop-board-nation",
    structured: {
      cardType: "prop_board",
      fixtureHome: "AUS",
      fixtureAway: "USA",
      propBoardRows: [
        {
          label: "Jackson Irvine",
          market: "player_shots_ou",
          odds: "-177",
          nationAbbr: "AUS",
        },
      ],
    },
    forbidChipPatterns: [/United States scorer value besides Jackson Irvine/i],
    requireChipPatterns: [/Jackson Irvine/i],
    expectCardType: WC_CARD_TYPE.PROP_BOARD,
  },
  {
    id: "bel-egy-totals-under-chips",
    structured: {
      cardType: "single_lean",
      fixtureHome: "BEL",
      fixtureAway: "EGY",
      matchTotalsLean: { side: "Under", line: "2.5" },
      lean: "Lean Under 2.5 goals",
    },
    requireChipPatterns: [/scores early/i],
    forbidChipPatterns: [/Jackson Irvine/i],
  },
];

/**
 * @param {WcTurnArtifactSloCase} c
 * @returns {string[]}
 */
export function evaluateWcTurnArtifactSloCase(c) {
  const failures = [];
  const artifact = extractWcTurnArtifact(c.structured);
  if (!artifact) {
    failures.push("artifact: null");
    return failures;
  }

  if (c.expectCardType && artifact.cardType !== c.expectCardType) {
    failures.push(`cardType: expected ${c.expectCardType}, got ${artifact.cardType}`);
  }
  if (c.expectNamedLeg && !artifact.wcNamedPlayerPropsCard) {
    failures.push("wcNamedPlayerPropsCard: expected true");
  }

  const prior = extractWcTurnArtifactsFromHistory(c.history || []);
  const chips = projectWcFollowUpChips(artifact, prior);

  const chipBlob = chips.join(" ");
  for (const re of c.forbidChipPatterns || []) {
    if (re.test(chipBlob)) failures.push(`forbidden chip pattern: ${re}`);
  }
  for (const re of c.requireChipPatterns || []) {
    if (!re.test(chipBlob)) failures.push(`missing required chip pattern: ${re}`);
  }

  return failures;
}

/**
 * @returns {{ passed: number, failed: number, failures: Array<{ id: string, reasons: string[] }> }}
 */
export function runWcTurnArtifactSloGate() {
  let passed = 0;
  let failed = 0;
  /** @type {Array<{ id: string, reasons: string[] }>} */
  const failures = [];

  for (const c of WC_TURN_ARTIFACT_SLO_GOLDEN) {
    const reasons = evaluateWcTurnArtifactSloCase(c);
    if (reasons.length) {
      failed += 1;
      failures.push({ id: c.id, reasons });
    } else {
      passed += 1;
    }
  }

  return { passed, failed, failures };
}
