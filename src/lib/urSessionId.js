const UR_SESSION_ID_KEY = "ur_session_id";

/**
 * Stable anonymous session id (localStorage) for free-tier quota before email.
 * @returns {string}
 */
export function getOrCreateUrSessionId() {
  if (typeof localStorage === "undefined") {
    return `ephemeral-${Date.now()}`;
  }
  try {
    let id = localStorage.getItem(UR_SESSION_ID_KEY);
    if (id && id.length >= 16) return id;
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `ur-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(UR_SESSION_ID_KEY, id);
    return id;
  } catch {
    return `ephemeral-${Date.now()}`;
  }
}
