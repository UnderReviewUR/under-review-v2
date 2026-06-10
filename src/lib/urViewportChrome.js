/** iOS Safari / WebKit bottom chrome for fixed dock + nav (not needed in home-screen PWA). */

export function isStandaloneWebApp() {
  if (typeof window === "undefined") return false;
  try {
    if (window.navigator.standalone === true) return true;
  } catch {
    /* ignore */
  }
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
  } catch {
    /* ignore */
  }
  return false;
}

function activeTextInput() {
  if (typeof document === "undefined") return null;
  const el = document.activeElement;
  if (!el || typeof el.matches !== "function") return null;
  return el.matches("input, textarea, select, [contenteditable='true']") ? el : null;
}

/**
 * @returns {{ vvRise: number, keyboardHeight: number }}
 * vvRise — lift fixed dock for browser toolbar / keyboard (single offset, never stack both).
 * keyboardHeight — extra scroll padding on non-docked screens while an input is focused.
 */
export function readUrViewportChromeInsets(vv = typeof window !== "undefined" ? window.visualViewport : null) {
  if (typeof window === "undefined" || isStandaloneWebApp()) {
    return { vvRise: 0, keyboardHeight: 0 };
  }

  const innerH = window.innerHeight;
  const height = vv && typeof vv.height === "number" ? vv.height : innerH;
  const offsetTop = vv && typeof vv.offsetTop === "number" ? vv.offsetTop : 0;

  /* One inset for fixed bottom UI — do not also add innerH - height (that double-counts). */
  const vvRise = Math.max(0, innerH - height - offsetTop);

  const focused = activeTextInput();
  const keyboardHeight = focused ? Math.max(0, innerH - height) : 0;

  return { vvRise, keyboardHeight };
}

export function applyUrViewportChromeInsets(insets) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--ur-vv-rise", `${Math.max(0, insets.vvRise)}px`);
  root.style.setProperty("--keyboard-height", `${Math.max(0, insets.keyboardHeight)}px`);
}

export function clearUrViewportChromeInsets() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.removeProperty("--ur-vv-rise");
  root.style.removeProperty("--keyboard-height");
}
