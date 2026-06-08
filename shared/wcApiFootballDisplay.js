/**
 * User-facing API-Football quota chip copy.
 */

/**
 * @param {{ enabled?: boolean, remainingBudget?: number | null, dailyLimit?: number, usedToday?: number } | null | undefined} quota
 */
export function formatWcApiFootballQuotaChip(quota) {
  if (!quota?.enabled) return null;
  const remaining = Number(quota.remainingBudget);
  const limit = Number(quota.dailyLimit) || 100;
  const used = Number(quota.usedToday) || 0;
  if (!Number.isFinite(remaining)) {
    return `Backup stats API · ${used}/${limit} used today`;
  }
  if (remaining <= 15) {
    return `Backup stats API low · ${remaining} of ${limit} calls left today`;
  }
  return `Backup stats API · ${remaining} of ${limit} calls left today`;
}
