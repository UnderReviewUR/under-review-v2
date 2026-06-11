import { useLayoutEffect, useRef } from "react";
import { measureUrChatDockFooterStackPx } from "../lib/urChatDockFooterStackPx.js";

/**
 * Physical tail inside `.ur-chat-scroll` — height equals measured fixed footer stack.
 * Adds real scrollHeight so the last answer line clears the dock on iOS Safari.
 */
export default function UrChatDockScrollSpacer({ enabled = true }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;
    const el = ref.current;
    if (!el) return undefined;

    const apply = () => {
      const px = measureUrChatDockFooterStackPx();
      el.style.height = `${px}px`;
      el.dataset.urDockSpacerPx = String(px);
    };

    apply();
    requestAnimationFrame(apply);
    requestAnimationFrame(() => {
      requestAnimationFrame(apply);
    });
    const t0 = window.setTimeout(apply, 0);
    const t50 = window.setTimeout(apply, 50);
    const t200 = window.setTimeout(apply, 200);

    const dock = document.querySelector(".app .docked-bar.ur-docked-bar");
    const nav = document.querySelector(".app nav.bottom-nav");
    let roDock;
    let roNav;
    let moDock;
    if (typeof ResizeObserver !== "undefined") {
      roDock = dock ? new ResizeObserver(apply) : null;
      roNav = nav ? new ResizeObserver(apply) : null;
      if (roDock && dock) roDock.observe(dock);
      if (roNav && nav) roNav.observe(nav);
    }
    if (typeof MutationObserver !== "undefined" && dock) {
      moDock = new MutationObserver(apply);
      moDock.observe(dock, { subtree: true, childList: true, attributes: true, characterData: true });
    }
    window.addEventListener("resize", apply);
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", apply);
      vv.addEventListener("scroll", apply);
    }

    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t50);
      window.clearTimeout(t200);
      window.removeEventListener("resize", apply);
      if (vv) {
        vv.removeEventListener("resize", apply);
        vv.removeEventListener("scroll", apply);
      }
      roDock?.disconnect();
      roNav?.disconnect();
      moDock?.disconnect();
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={ref}
      className="ur-chat-dock-scroll-spacer"
      aria-hidden="true"
      data-ur-measure="dock-footer-stack"
    />
  );
}
