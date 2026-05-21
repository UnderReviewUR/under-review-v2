/**
 * Final authority for **home surface stack order**.
 * `nba_cards` slot is reserved; standalone NBA PLAYOFFS spotlight is not mounted on home (NBA tab + slate + preview).
 * Playoff-vs-regular *within* NBA is handled by {@link ../priority.js} `nbaPriorityScore` + pipeline sort.
 * Do not reintroduce ad-hoc ordering in components — extend this module if the product order changes.
 */
export const HOME_SURFACE_STACK_ORDER = Object.freeze([
  "nba_cards",
  "mlb_cards",
  "tracker_and_nfl_major",
  "tennis_spotlight",
  "f1_cards",
  "golf_cards",
]);
