/** ESPN scoreboard `dates=` expects YYYYMMDD in US Eastern calendar sense. */

import { toEtDateString } from "../shared/etDateUtils.js";

export { toEtDateString };

export function getTodayEtDateString() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

export function getTomorrowEtDateString() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

export function etDateStringToEspnYmd(etYyyyMmDd) {
  return String(etYyyyMmDd || "").replace(/-/g, "");
}

/**
 * Add whole calendar days in US Eastern (YYYY-MM-DD), DST-safe vs naive UTC date math.
 * @param {string} etYyyyMmDd
 * @param {number} deltaDays
 */
export function addCalendarDaysEt(etYyyyMmDd, deltaDays) {
  const s = String(etYyyyMmDd || "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return getTodayEtDateString();
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const da = parseInt(m[3], 10);
  const want = `${y}-${String(mo).padStart(2, "0")}-${String(da).padStart(2, "0")}`;
  let anchor = Date.UTC(y, mo - 1, da, 12, 0, 0);
  for (let k = -36; k <= 36; k++) {
    const t = Date.UTC(y, mo - 1, da, 12 + k, 0, 0);
    if (new Date(t).toLocaleDateString("en-CA", { timeZone: "America/New_York" }) === want) {
      anchor = t;
      break;
    }
  }
  const out = new Date(anchor + Number(deltaDays) * 86400000);
  return out.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}
