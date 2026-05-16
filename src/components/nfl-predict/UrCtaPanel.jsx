import { useEffect, useState } from "react";

import { formatNflSeasonCountdownLine, getDaysUntilNfl2026SeasonStart } from "../../lib/nflSeasonCountdown.js";

const LS_DISMISS = "ur_nfl_2026_cta_dismissed";

export default function UrCtaPanel({ dismissible = true }) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(LS_DISMISS) === "1";
    } catch {
      return false;
    }
  });

  const [daysUntil, setDaysUntil] = useState(() => getDaysUntilNfl2026SeasonStart());

  useEffect(() => {
    const tick = () => setDaysUntil(getDaysUntilNfl2026SeasonStart());
    tick();
    const id = window.setInterval(tick, 60 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!dismissible || !dismissed) return;
    try {
      window.localStorage.setItem(LS_DISMISS, "1");
    } catch {
      /* ignore */
    }
  }, [dismissible, dismissed]);

  if (dismissible && dismissed) return null;

  const countdownLine = formatNflSeasonCountdownLine(daysUntil);

  const body = (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid var(--nfl-predict-border)",
        background: "linear-gradient(180deg, rgba(0,245,233,.06), rgba(20,20,20,.95))",
        padding: "14px 14px 16px",
        margin: dismissible ? "12px 12px 0" : "16px 0 0",
        position: dismissible ? "sticky" : "relative",
        bottom: dismissible ? 8 : undefined,
        zIndex: dismissible ? 5 : undefined,
      }}
    >
      {dismissible ? (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 36,
            height: 36,
            borderRadius: 8,
            border: "none",
            background: "rgba(255,255,255,.06)",
            color: "#fff",
            cursor: "pointer",
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      ) : null}
      <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--nfl-predict-text)", whiteSpace: "pre-line" }}>
        {`${countdownLine}

While you're locking in your predictions, the sharpest bettors are already building their edge.

Under Review is live right now — NBA playoffs, MLB, tennis, F1, and golf. Real analysis. Real angles. No noise.

When September hits, we'll have every NFL week covered. Props, spreads, angles, injury impact, live takes mid-game.

The people subbing now are the ones ready when it matters.`}
      </div>
      <a
        href="https://under-review.app"
        target="_blank"
        rel="noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 14,
          minHeight: 48,
          padding: "0 18px",
          borderRadius: 12,
          background: "var(--nfl-predict-accent)",
          color: "#080808",
          fontWeight: 800,
          textDecoration: "none",
        }}
      >
        Try it free →
      </a>
    </div>
  );

  return body;
}
