import { useEffect, useState } from "react";

const STORAGE_KEY = "ur_visited";

/**
 * One-time overlay on first visit to the app (home); dismissed state stored in `ur_visited`.
 */
export default function UrTakeOnboardingOverlay({ visible, worldCupLine = null }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!visible) {
      setOpen(false);
      return;
    }
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      /* non-fatal */
    }
    setOpen(true);
  }, [visible]);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* non-fatal */
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ur-onboard-title"
      className="ur-onboarding-backdrop"
    >
      <div className="ur-onboarding-card">
        <div id="ur-onboard-title" className="ur-onboarding-title">
          UR Take
        </div>
        <p className="ur-onboarding-lead">
          Ask in plain English or paste a screenshot. You get structured betting reads — props, edges,
          and live angles — without digging through feeds.
        </p>
        <ul className="ur-onboarding-list">
          <li>First line is the answer — tap Full breakdown only if you want more.</li>
          {worldCupLine ? <li>{worldCupLine}</li> : null}
          <li>Use suggested chips after answers to go deeper in one tap.</li>
        </ul>
        <button type="button" className="ur-onboarding-cta" onClick={dismiss}>
          Got it
        </button>
      </div>
    </div>
  );
}
