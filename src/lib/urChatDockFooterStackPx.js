/**
 * Fixed footer stack height for docked UR Take scroll panes (px).
 *
 * Measured from the live dock element — no CSS height estimates:
 *   visualViewportBottom − dock.getBoundingClientRect().top
 *
 * That span is the dock bar + bottom nav + safe-area band that overlaps scroll content.
 */
export function measureUrChatDockFooterStackPx() {
  if (typeof window === "undefined" || typeof document === "undefined") return 0;
  const dock = document.querySelector(".app .docked-bar.ur-docked-bar");
  if (!dock) return 0;

  const dockTop = dock.getBoundingClientRect().top;
  const vv = window.visualViewport;
  const viewportBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
  return Math.max(0, Math.ceil(viewportBottom - dockTop));
}
