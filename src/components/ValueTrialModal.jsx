import { useCallback, useEffect, useRef, useState } from "react";
import { trackFunnelEvent } from "../lib/funnelAnalytics.js";
import {
  VALUE_TRIAL_MODAL_BODY,
  VALUE_TRIAL_MODAL_HEADLINE,
  VALUE_TRIAL_MODAL_SUB,
  VALUE_TRIAL_CTA_LABEL,
  PRO_RESTORE_RECEIPT_HINT,
} from "../lib/proUpgradeCopy.js";

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
}

async function postTrialCheckout(email) {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, trial: true }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 403 && data.error === "already_pro") {
    return { ok: false, alreadyPro: true, message: data.message || "You already have Pro access." };
  }
  if (data.url) {
    trackFunnelEvent("checkout_start", { surface: "value_trial_modal", trial: true });
    return { ok: true, url: data.url };
  }
  return { ok: false, error: data.error || "checkout_failed", message: data.message || data.error };
}

/**
 * Value-based trial offer — after 2nd good take or first track attempt (not quota anger).
 */
export default function ValueTrialModal({
  open = false,
  surface = "unknown",
  onClose,
  onAlreadyPro,
  setUserEmail,
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    trackFunnelEvent("value_trial_modal_open", { surface });
    try {
      const stored = localStorage.getItem("ur_email") || "";
      setEmail(stored.trim());
    } catch {
      setEmail("");
    }
    setError("");
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open, surface]);

  const startTrial = useCallback(async () => {
    const addr = String(email || "").trim().toLowerCase();
    if (!isValidEmail(addr)) {
      setError("Enter a valid email to start your trial.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await postTrialCheckout(addr);
      if (result.alreadyPro) {
        onAlreadyPro?.();
        onClose?.();
        return;
      }
      if (result.ok && result.url) {
        try {
          localStorage.setItem("ur_email", addr);
        } catch {
          /* ignore */
        }
        setUserEmail?.(addr);
        window.location.href = result.url;
        return;
      }
      setError(result.message || "Checkout unavailable. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }, [email, onAlreadyPro, onClose, setUserEmail]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8,10,12,.92)",
        zIndex: 102,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ur-value-trial-title"
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-2)",
          borderRadius: 20,
          padding: 24,
          maxWidth: 400,
          width: "100%",
        }}
      >
        <div
          id="ur-value-trial-title"
          style={{
            fontFamily: "var(--display-font)",
            fontSize: 22,
            letterSpacing: 0.5,
            color: "var(--text)",
            marginBottom: 8,
            lineHeight: 1.2,
          }}
        >
          {VALUE_TRIAL_MODAL_HEADLINE}
        </div>
        <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55, margin: "0 0 6px" }}>
          {VALUE_TRIAL_MODAL_SUB}
        </p>
        <p style={{ fontSize: 13, color: "var(--soft)", lineHeight: 1.55, margin: "0 0 16px" }}>
          {VALUE_TRIAL_MODAL_BODY}
        </p>
        <label style={{ display: "block", fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>
          Email for your trial
        </label>
        <input
          ref={inputRef}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") startTrial();
          }}
          placeholder="you@example.com"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid var(--border-2)",
            background: "var(--surface-2)",
            color: "var(--text)",
            fontFamily: "var(--body-font)",
            fontSize: 14,
            marginBottom: error ? 8 : 14,
          }}
        />
        {error ? (
          <p style={{ fontSize: 12, color: "#f87171", margin: "0 0 12px" }} role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={startTrial}
          style={{
            width: "100%",
            padding: "13px",
            border: "none",
            borderRadius: 10,
            background: "var(--cyan-bright)",
            color: "#080A0C",
            fontFamily: "var(--display-font)",
            fontSize: 17,
            letterSpacing: 1.5,
            cursor: busy ? "wait" : "pointer",
            marginBottom: 10,
            opacity: busy ? 0.75 : 1,
          }}
        >
          {busy ? "Starting…" : VALUE_TRIAL_CTA_LABEL}
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            background: "none",
            border: "none",
            color: "var(--muted)",
            cursor: "pointer",
            fontSize: 12,
            fontFamily: "var(--body-font)",
            marginBottom: 12,
          }}
        >
          Not now
        </button>
        <p style={{ fontSize: 10, color: "var(--muted)", lineHeight: 1.45, margin: 0 }}>
          {PRO_RESTORE_RECEIPT_HINT}
        </p>
      </div>
    </div>
  );
}
