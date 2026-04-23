/**
 * Final authority for **home surface stack order** (NBA playoff cards live here first).
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
