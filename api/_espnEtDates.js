/** ESPN scoreboard `dates=` expects YYYYMMDD in US Eastern calendar sense. */

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
