import { useCallback, useMemo, useState } from "react";
import { trackFunnelEvent } from "../lib/funnelAnalytics.js";

/**
 * Post–first-answer retention: slip upload nudge + save take + minimal saved list.
 * Not shown on empty thread; non-modal; stays below chat scroll on Ask.
 */
export default function AskUrTakeRetentionStrip({
  askMsgs,
  fileInputRef,
  onSaveTake,
  savedTakes = [],
  onOpenSavedTake,
}) {
  const [savedOpen, setSavedOpen] = useState(false);

  const lastCompleteAi = useMemo(() => {
    for (let i = askMsgs.length - 1; i >= 0; i--) {
      const m = askMsgs[i];
      if (m?.role === "ai" && !m.loading && String(m.text || "").trim() && m.text !== "ANALYZING...") {
        return m;
      }
    }
    return null;
  }, [askMsgs]);

  const userTurns = useMemo(() => askMsgs.filter((m) => m.role === "user").length, [askMsgs]);

  const slipDismissed = useMemo(() => {
    try {
      return localStorage.getItem("ur_slip_wedge_dismissed") === "1";
    } catch {
      return false;
    }
  }, []);

  const [slipHidden, setSlipHidden] = useState(slipDismissed);

  const showRow = Boolean(lastCompleteAi && userTurns >= 1);
  if (!showRow) return null;

  const slipCopy =
    askMsgs.filter((m) => m.role === "ai" && !m.loading).length % 2 === 1
      ? "Want me to check a bet slip before you place it?"
      : "Upload a slip and I’ll flag the weakest leg — not a guarantee, just structure.";

  const dismissSlip = useCallback(() => {
    setSlipHidden(true);
    try {
      localStorage.setItem("ur_slip_wedge_dismissed", "1");
    } catch {
      /* ignore */
    }
  }, []);

  const onSlipClick = useCallback(() => {
    trackFunnelEvent("slip_review_start", { uploadSource: "post_answer_nudge", hasImage: true });
    fileInputRef?.current?.click?.();
  }, [fileInputRef]);

  const toggleSaved = useCallback(() => {
    setSavedOpen((o) => {
      const next = !o;
      if (next) trackFunnelEvent("saved_take_view", { count: savedTakes.length });
      return next;
    });
  }, [savedTakes.length]);

  return (
    <div className="ur-ask-retention-strip">
      {!slipHidden ? (
        <div className="ur-ask-retention-row ur-ask-retention-slip">
          <p className="ur-ask-retention-copy">{slipCopy}</p>
          <div className="ur-ask-retention-actions">
            <button type="button" className="ur-ask-retention-btn" onClick={onSlipClick}>
              Attach image
            </button>
            <button type="button" className="ur-ask-retention-btn ur-ask-retention-btn--ghost" onClick={dismissSlip}>
              Not now
            </button>
          </div>
        </div>
      ) : null}

      <div className="ur-ask-retention-row ur-ask-retention-save">
        <p className="ur-ask-retention-copy">
          Save this take so you can review what happened later — process over outcomes.
        </p>
        <div className="ur-ask-retention-actions">
          <button type="button" className="ur-ask-retention-btn" onClick={onSaveTake}>
            Save take
          </button>
          {savedTakes.length > 0 ? (
            <button type="button" className="ur-ask-retention-btn ur-ask-retention-btn--ghost" onClick={toggleSaved}>
              Saved ({savedTakes.length})
            </button>
          ) : null}
        </div>
      </div>

      {savedOpen && savedTakes.length > 0 ? (
        <ul className="ur-ask-saved-list">
          {savedTakes.map((t) => (
            <li key={t.id}>
              <button type="button" className="ur-ask-saved-item" onClick={() => onOpenSavedTake?.(t)}>
                <span className="ur-ask-saved-sport">{t.sport || "Take"}</span>
                <span className="ur-ask-saved-snippet">{t.headlineSnippet}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
