/** True when re-opening the World Cup tab should return to the browse home (not stay in UR Take chat). */
export function shouldResetWorldCupBrowseHome({ alreadyOnWc, wcMsgCount, nav }) {
  return Boolean(alreadyOnWc && wcMsgCount > 0 && !nav);
}
