/**
 * Detect posted NBA player prop markets from Action Network (propsOdds) or Odds API (propLines).
 */

function playerHasPostedPropLine(player) {
  if (!player?.props || typeof player.props !== "object") return false;
  for (const market of Object.values(player.props)) {
    if (market?.over?.line != null || market?.under?.line != null) return true;
  }
  return false;
}

function propsOddsBlockHasLines(block) {
  if (!block || typeof block !== "object") return false;
  if (block.hasPostedLines === true) return true;
  const players = Array.isArray(block.players) ? block.players : [];
  return players.some(playerHasPostedPropLine);
}

/**
 * @param {Record<string, unknown>|null|undefined} boardOrContext
 */
export function nbaBoardHasPostedPropMarkets(boardOrContext) {
  if (!boardOrContext || typeof boardOrContext !== "object") return false;
  const propLines = Array.isArray(boardOrContext.propLines) ? boardOrContext.propLines : [];
  if (propLines.length > 0) return true;
  if (propsOddsBlockHasLines(boardOrContext.propsOdds)) return true;
  const byGame = boardOrContext.propsOddsByGameId;
  if (byGame && typeof byGame === "object") {
    for (const block of Object.values(byGame)) {
      if (propsOddsBlockHasLines(block)) return true;
    }
  }
  return false;
}

/**
 * @param {Record<string, unknown>|null|undefined} boardOrContext
 */
export function countNbaActiveSlatePropSignals(boardOrContext) {
  const propLines = Array.isArray(boardOrContext?.propLines) ? boardOrContext.propLines : [];
  if (propLines.length > 0) return propLines.length;
  const players = Array.isArray(boardOrContext?.propsOdds?.players)
    ? boardOrContext.propsOdds.players
    : [];
  const withLines = players.filter(playerHasPostedPropLine).length;
  if (withLines > 0) return withLines;
  if (boardOrContext?.propsOdds?.hasPostedLines) return 1;
  const byGame = boardOrContext?.propsOddsByGameId;
  if (byGame && typeof byGame === "object") {
    for (const block of Object.values(byGame)) {
      const n = countNbaActiveSlatePropSignals({ propsOdds: block });
      if (n > 0) return n;
    }
  }
  return 0;
}
