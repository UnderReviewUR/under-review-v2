import { useEffect, useState } from "react";

const STORAGE_KEY = "ur_take_onboarding_v1_done";

/**
 * One-time overlay when the user opens UR Take with an empty thread (first session only).
 */
export default function UrTakeOnboardingOverlay({ visible }) {
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
          <li>Use suggested chips after answers to go deeper in one tap.</li>
          <li>Follow-ups stay in thread so context carries forward.</li>
        </ul>
        <button type="button" className="ur-onboarding-cta" onClick={dismiss}>
          Got it
        </button>
      </div>
    </div>
  );
}
