/**
 * Read-path re-exports — scrape lives in `_nbaProps.js` + `_nbaPropsFetch.js` only.
 */
export {
  buildNbaPropsFreshnessPromptBlock,
  hydrateNbaPropsOdds,
  slimNbaPropsOddsForWire,
} from "./_nbaProps.js";

export { resolveActionNetworkGameIdForBoardGame } from "./_nbaPropsGameId.js";
