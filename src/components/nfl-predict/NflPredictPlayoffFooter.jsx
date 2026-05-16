import { useMemo, useState } from "react";

import ProCheckoutCTA from "../ProCheckoutCTA.jsx";
import { encodePicks } from "../../lib/nflPredictState.js";

function pickedCount(picks) {
  return Object.keys(picks || {}).filter((id) => picks[id]?.winner).length;
}

export default function NflPredictPlayoffFooter({
  picks,
  onContinuePicking,
  onSubscribePro,
  restoreProEntitlement,
  setUserEmail,
  isPro = false,
  bracketComplete = false,
  bracketWinner = null,
}) {
  const [shareBusy, setShareBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareToast, setShareToast] = useState("");

  const count = useMemo(() => pickedCount(picks), [picks]);

  const fallbackUrl = useMemo(() => {
    const enc = encodePicks(picks);
    const path = typeof window !== "undefined" ? window.location.pathname || "/nfl" : "/nfl";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}${path}?predictor=1&picks=${encodeURIComponent(enc)}`;
  }, [picks]);

  async function createShareLink() {
    if (count === 0) {
      setShareToast("Pick at least one game to share");
      return;
    }
    setShareBusy(true);
    setShareToast("");
    try {
      const enc = encodePicks(picks);
      const res = await fetch("/api/nfl-predict-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ picksEncoded: enc }),
      });
      const data = await res.json().catch(() => ({}));
      const url = res.ok && data?.url ? data.url : fallbackUrl;
      setShareUrl(url);
      setShareToast("Link ready — send it to friends");
    } catch {
      setShareUrl(fallbackUrl);
      setShareToast("Link ready (saved on this device)");
    } finally {
      setShareBusy(false);
    }
  }

  async function copyShareLink() {
    const t = shareUrl || fallbackUrl;
    try {
      await navigator.clipboard.writeText(t);
      setShareToast("Copied — friends open your board in the predictor");
    } catch {
      setShareToast("Copy the link below manually");
    }
  }

  return (
    <div style={{ padding: "8px 12px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
      {bracketComplete ? (
        <section
          style={{
            borderRadius: 14,
            border: "1px solid rgba(245,158,11,.35)",
            background: "linear-gradient(180deg, rgba(245,158,11,.1), rgba(20,20,20,.95))",
            padding: "16px 14px",
          }}
        >
          <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 800, lineHeight: 1.3 }}>
            🏆 Bracket complete! {bracketWinner || "Champion"} wins Super Bowl LXI
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: "var(--nfl-predict-muted)", lineHeight: 1.45 }}>
            Share your full prediction with friends below
          </p>
        </section>
      ) : (
        <section
          style={{
            borderRadius: 14,
            border: "1px solid var(--nfl-predict-border)",
            background: "linear-gradient(180deg, rgba(0,245,233,.08), rgba(20,20,20,.95))",
            padding: "16px 14px",
          }}
        >
        <div
          style={{
            fontFamily: "var(--mono-font)",
            fontSize: 10,
            letterSpacing: "0.14em",
            color: "var(--nfl-predict-accent)",
            marginBottom: 10,
          }}
        >
          ROAD TO THE SUPER BOWL
        </div>
        <h3 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 800, lineHeight: 1.3 }}>
          Pick your way through the bracket
        </h3>
        <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--nfl-predict-muted)", lineHeight: 1.55 }}>
          Wild Card → Divisional → Championship → Super Bowl. Bracket picks are separate from your regular-season board (
          <span style={{ color: "var(--nfl-predict-accent)" }}>{count}/272</span> games picked).
        </p>
        <button
          type="button"
          onClick={onContinuePicking}
          style={{
            width: "100%",
            minHeight: 48,
            borderRadius: 12,
            border: "none",
            background: "var(--nfl-predict-accent)",
            color: "#080808",
            fontWeight: 800,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Pick the bracket →
        </button>
        </section>
      )}

      <section
        style={{
          borderRadius: 14,
          border: "1px solid var(--nfl-predict-border)",
          background: "var(--nfl-predict-surface)",
          padding: "16px 14px",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>Share with friends</div>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--nfl-predict-muted)", lineHeight: 1.5 }}>
          Send a link so they open the <strong style={{ color: "var(--nfl-predict-text)" }}>2026 Predictor</strong> with your
          board loaded — same seeds, same bubble teams.
        </p>
        <button
          type="button"
          disabled={shareBusy || count === 0}
          onClick={createShareLink}
          style={{
            width: "100%",
            minHeight: 44,
            borderRadius: 10,
            border: "1px solid var(--nfl-predict-accent)",
            background: "rgba(0,245,233,.1)",
            color: "var(--nfl-predict-accent)",
            fontWeight: 700,
            fontSize: 13,
            cursor: count === 0 ? "not-allowed" : "pointer",
            opacity: count === 0 ? 0.5 : 1,
            marginBottom: shareUrl ? 10 : 0,
          }}
        >
          {shareBusy ? "Creating link…" : "Create share link"}
        </button>
        {shareUrl ? (
          <div style={{ marginTop: 10 }}>
            <div
              style={{
                fontSize: 12,
                wordBreak: "break-all",
                color: "var(--nfl-predict-muted)",
                padding: "10px 10px",
                borderRadius: 8,
                background: "#0d0d0d",
                border: "1px solid #2a2a2a",
                marginBottom: 8,
              }}
            >
              {shareUrl}
            </div>
            <button
              type="button"
              onClick={copyShareLink}
              style={{
                width: "100%",
                minHeight: 44,
                borderRadius: 10,
                border: "none",
                background: "#222",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Copy link for friends
            </button>
          </div>
        ) : null}
        {shareToast ? (
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--nfl-predict-accent)" }}>{shareToast}</p>
        ) : null}
      </section>

      {!isPro ? (
        <section
          style={{
            borderRadius: 14,
            border: "1px solid rgba(255,45,107,.35)",
            background: "linear-gradient(165deg, rgba(255,45,107,.12), rgba(20,20,20,.98))",
            padding: "16px 14px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono-font)",
              fontSize: 10,
              letterSpacing: "0.12em",
              color: "#FF2D6B",
              marginBottom: 8,
            }}
          >
            SAMPLE PRO TAKE
          </div>
          <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.35, marginBottom: 10 }}>
            Will Josh Allen throw over 2.5 passing TDs vs the Rams?
          </div>
          <p style={{ margin: "0 0 14px", fontSize: 14, lineHeight: 1.55, color: "var(--nfl-predict-text)" }}>
            Allen vs Stafford sets up as a shootout on paper — but LA’s reworked secondary has been stingier in the red
            zone. Count on Josh to land <strong>two TDs max</strong>; the fireworks come between the 20s, not always in the
            end zone.
          </p>
          <div
            style={{
              display: "inline-block",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.06em",
              color: "#FF2D6B",
              border: "1px solid rgba(255,45,107,.45)",
              borderRadius: 8,
              padding: "6px 10px",
              marginBottom: 14,
            }}
          >
            LEAN: UNDER 2.5 PASS TDs
          </div>
          <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--nfl-predict-muted)", lineHeight: 1.45 }}>
            PRO unlocks playoff-round picks, Super Bowl angles, and live prop takes like this every week — not just the
            regular-season board.
          </p>
          {restoreProEntitlement && setUserEmail ? (
            <ProCheckoutCTA
              className="nfl-predict-pro-cta"
              restoreProEntitlement={restoreProEntitlement}
              setUserEmail={setUserEmail}
            >
              <span
                style={{
                  display: "block",
                  width: "100%",
                  minHeight: 48,
                  lineHeight: "48px",
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(90deg, #FF2D6B, #FF6B9D)",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                Subscribe to PRO →
              </span>
            </ProCheckoutCTA>
          ) : (
            <button
              type="button"
              onClick={onSubscribePro}
              style={{
                width: "100%",
                minHeight: 48,
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(90deg, #FF2D6B, #FF6B9D)",
                color: "#fff",
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Subscribe to PRO →
            </button>
          )}
        </section>
      ) : null}
    </div>
  );
}
