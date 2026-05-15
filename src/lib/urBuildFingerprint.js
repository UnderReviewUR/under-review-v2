/**
 * Build identity for confirming deployed JS matches repo (see `vite.config.js` `define`).
 * `VITE_COMMIT_SHA` / `VITE_BUILD_TIME` are injected at bundle time when available from CI.
 */
export function getUrBuildFingerprint() {
  return {
    sha: import.meta.env.VITE_COMMIT_SHA ?? "unset",
    builtAt: import.meta.env.VITE_BUILD_TIME ?? "unset",
    mode: import.meta.env.MODE ?? "unknown",
  };
}

export function logUrBuildFingerprint() {
  if (typeof console !== "undefined" && console.warn) {
    console.warn("[UR build fingerprint]", getUrBuildFingerprint());
  }
}
