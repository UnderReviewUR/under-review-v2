import { useMemo, useState } from "react";

import { encodePicks } from "../../lib/nflPredictState.js";

export default function ShareModal({ picks, onClose, isViewingShared, onMakeOwn }) {
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [shareUrl, setShareUrl] = useState("");

  const count = useMemo(() => Object.keys(picks || {}).filter((id) => picks[id]?.winner).length, [picks]);

  const fallbackUrl = useMemo(() => {
    const enc = encodePicks(picks);
    const path = typeof window !== "undefined" ? window.location.pathname || "/" : "/";
    return `${typeof window !== "undefined" ? window.location.origin : ""}${path}?picks=${encodeURIComponent(enc)}`;
  }, [picks]);

  async function doShare() {
    setBusy(true);
    setToast("");
    setShareUrl("");
    try {
      const enc = encodePicks(picks);
      const res = await fetch("/api/nfl-predict-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ picksEncoded: enc }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.url) {
        setShareUrl(data.url);
        setToast("Link ready — tap copy");
      } else {
        setShareUrl(fallbackUrl);
        setToast("Using on-device link (copy below)");
      }
    } catch {
      setShareUrl(fallbackUrl);
      setToast("Using on-device link (copy below)");
    } finally {
      setBusy(false);
    }
  }

  async function copyText(t) {
    try {
      await navigator.clipboard.writeText(t);
      setToast("Copied to clipboard");
    } catch {
      setToast("Copy failed — select link manually");
    }
  }

  return (
    <div
      className="nfl-predict-share-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.72)",
        zIndex: 80,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 16,
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 16,
          background: "var(--nfl-predict-surface)",
          border: "1px solid var(--nfl-predict-border)",
          padding: 16,
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        {isViewingShared ? (
          <div
            style={{
              marginBottom: 12,
              padding: 10,
              borderRadius: 10,
              background: "rgba(0,245,233,.08)",
              border: "1px solid rgba(0,245,233,.25)",
              fontSize: 14,
            }}
          >
            👀 Viewing shared picks
            <button
              type="button"
              onClick={onMakeOwn}
              style={{
                display: "block",
                marginTop: 8,
                background: "none",
                border: "none",
                color: "var(--nfl-predict-accent)",
                fontWeight: 700,
                cursor: "pointer",
                padding: 0,
                minHeight: 44,
              }}
            >
              Make your own picks →
            </button>
          </div>
        ) : null}
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Share board</div>
        <div style={{ fontSize: 13, color: "var(--nfl-predict-muted)", marginBottom: 14 }}>
          You&apos;ve picked {count}/272 games
        </div>
        <button
          type="button"
          onClick={doShare}
          disabled={busy || count === 0}
          style={{
            width: "100%",
            minHeight: 48,
            borderRadius: 12,
            border: "none",
            background: "var(--nfl-predict-accent)",
            color: "#080808",
            fontWeight: 800,
            cursor: busy ? "wait" : "pointer",
            marginBottom: 12,
          }}
        >
          {busy ? "Working…" : "Share"}
        </button>
        {shareUrl ? (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "var(--nfl-predict-muted)", marginBottom: 6 }}>Your link</div>
            <div style={{ wordBreak: "break-all", fontSize: 13, marginBottom: 8 }}>{shareUrl}</div>
            <button
              type="button"
              onClick={() => copyText(shareUrl)}
              style={{
                minHeight: 44,
                padding: "0 16px",
                borderRadius: 10,
                border: "1px solid var(--nfl-predict-border)",
                background: "#111",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Copy
            </button>
          </div>
        ) : null}
        {toast ? (
          <div style={{ fontSize: 13, color: "var(--nfl-predict-accent)", marginBottom: 8 }}>{toast}</div>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            minHeight: 44,
            marginTop: 8,
            borderRadius: 10,
            border: "1px solid #333",
            background: "transparent",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
