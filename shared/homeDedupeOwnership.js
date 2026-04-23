/**
 * Pure helpers mirroring Home dedupe ownership: Live Snapshot → Today's Slate → spotlight/cards.
 * Priority: snapshot claims keys first; slate rows overlapping snapshot are suppressed;
 * slate visible rows contribute keys; cards exclude snapshot ∪ slate-displayed keys.
 */

/**
 * @param {Iterable<string>} liveSnapshotKeys
 * @param {{ eventKeys?: string[] }[]} slateRows candidate rows with optional _eventKeys-style arrays
 * @returns {typeof slateRows} rows that would remain visible in TodaySlatePanel given snapshot exclusion only
 */
export function filterSlateRowsForSnapshotOverlap(liveSnapshotKeys, slateRows) {
  const snap = liveSnapshotKeys instanceof Set ? liveSnapshotKeys : new Set(liveSnapshotKeys);
  return slateRows.filter((row) => {
    const ek = Array.isArray(row?.eventKeys) ? row.eventKeys : [];
    if (ek.length === 0) return true;
    return !ek.some((k) => snap.has(k));
  });
}

/**
 * @param {Iterable<string>} liveSnapshotKeys
 * @param {Iterable<string>} slateDisplayedKeys keys from visible slate rows after overlap filter
 * @returns {Set<string>}
 */
export function buildCardExcludeSet(liveSnapshotKeys, slateDisplayedKeys) {
  return new Set([...liveSnapshotKeys, ...slateDisplayedKeys]);
}

/**
 * @param {Iterable<string>} excludeSet
 * @param {{ eventKey?: string|null }[]} cardCandidates minimal shape used by spotlight filters
 */
export function filterCardCandidatesByExcludeSet(excludeSet, cardCandidates) {
  const ex = excludeSet instanceof Set ? excludeSet : new Set(excludeSet);
  return cardCandidates.filter((c) => {
    const k = c?.eventKey;
    return !(k && ex.has(k));
  });
}
