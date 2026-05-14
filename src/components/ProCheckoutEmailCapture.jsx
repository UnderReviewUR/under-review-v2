import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { trackFunnelEvent } from "../lib/funnelAnalytics.js";

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
}

async function postCheckout(email, restoreProEntitlement) {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 403 && data.error === "already_pro") {
    // TECH DEBT: replace alert with inline toast / modal (403 already_pro).
    alert(data.message || "You already have Pro access");
    void restoreProEntitlement();
    return { ok: false };
  }
  if (res.status === 400 && data.error === "email_required") {
    return { ok: false, error: "email_required", message: data.message || "Enter a valid email." };
  }
  if (data.url) {
    try {
      track("checkout_initiated");
    } catch {
      /* optional */
    }
    trackFunnelEvent("checkout_start", { surface: "pro_checkout" });
    return { ok: true, url: data.url };
  }
  if (data.retryAfterSeconds) {
    return { ok: false, error: "busy", retryAfterSeconds: data.retryAfterSeconds };
  }
  return { ok: false, error: data.error || "checkout_failed" };
}

/**
 * Pro subscribe — inline email capture then POST /api/checkout (replaces window.prompt).
 */
export default function ProCheckoutEmailCapture({ className, restoreProEntitlement, setUserEmail, children }) {
  const [phase, setPhase] = useState("idle");
  const [email, setEmail] = useState("");
  const [submitError, setSubmitError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (phase !== "capturing") return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [phase]);

  const storedPrefill = useCallback(() => {
    try {
      return localStorage.getItem("ur_email") || "";
    } catch {
      return "";
    }
  }, []);

  const beginCapture = useCallback(() => {
    trackFunnelEvent("checkout_email_capture_open", { surface: "pro_checkout" });
    setSubmitError("");
    const s = storedPrefill().trim();
    setEmail(s);
    setPhase("capturing");
  }, [storedPrefill]);

  const cancelCapture = useCallback(() => {
    setPhase("idle");
    setSubmitError("");
  }, []);

  const runCheckout = useCallback(
    async (addr) => {
      const e = String(addr || "").trim().toLowerCase();
      if (!isValidEmail(e)) return;
      try {
        localStorage.setItem("ur_email", e);
      } catch {
        /* ignore */
      }
      setUserEmail?.(e);
      setPhase("submitting");
      setSubmitError("");
      try {
        const result = await postCheckout(e, restoreProEntitlement);
        if (result.ok && result.url) {
          setPhase("redirecting");
          window.location.href = result.url;
          return;
        }
        if (result.error === "busy") {
          // TECH DEBT: replace alert with inline message (rate-limited checkout).
          alert(`Checkout is busy. Try again in ${result.retryAfterSeconds}s.`);
          setPhase("capturing");
          return;
        }
        if (result.error === "email_required") {
          // TECH DEBT: replace alert with submitError / field validation UI.
          alert(result.message || "Enter a valid email.");
          setPhase("capturing");
          return;
        }
        setSubmitError("Something went wrong — try again");
        setPhase("capturing");
      } catch {
        setSubmitError("Something went wrong — try again");
        setPhase("capturing");
      }
    },
    [restoreProEntitlement, setUserEmail],
  );

  const onIdleClick = useCallback(() => {
    beginCapture();
  }, [beginCapture]);

  if (phase === "idle") {
    return (
      <button type="button" className={className} onClick={onIdleClick}>
        {children}
      </button>
    );
  }

  const busy = phase === "submitting" || phase === "redirecting";
  const canSubmit = isValidEmail(email) && !busy;

  return (
    <div className="ur-pro-checkout-capture">
      <div
        className="ur-pro-checkout-capture__inner"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-2)",
          borderRadius: 14,
          padding: "12px 14px 10px",
          maxHeight: 200,
          opacity: 1,
          transition: "max-height 0.2s ease, opacity 0.2s ease",
          textAlign: "left",
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono-font)",
            fontSize: 10,
            letterSpacing: 1.2,
            color: "var(--muted)",
            textTransform: "lowercase",
            marginBottom: 8,
          }}
        >
          your email
        </div>
        <div style={{ display: "flex", alignItems: "stretch", gap: 8 }}>
          <input
            ref={inputRef}
            type="email"
            name="ur-checkout-email"
            autoComplete="email"
            inputMode="email"
            value={email}
            disabled={busy}
            onChange={(ev) => setEmail(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" && canSubmit) void runCheckout(email);
            }}
            placeholder="email@example.com"
            className="ur-pro-checkout-capture__input"
            style={{
              flex: 1,
              minWidth: 0,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid var(--border-2)",
              background: "var(--surface-2)",
              color: "var(--text)",
              fontFamily: "var(--body-font)",
              fontSize: 14,
              outline: "none",
            }}
          />
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void runCheckout(email)}
            className="ur-pro-checkout-capture__go"
            style={{
              flexShrink: 0,
              padding: "0 14px",
              border: "none",
              borderRadius: 10,
              background: "linear-gradient(90deg, var(--cyan-bright), var(--magenta))",
              color: "#080A0C",
              fontFamily: "var(--display-font)",
              fontSize: 14,
              letterSpacing: 1,
              cursor: canSubmit ? "pointer" : "not-allowed",
              opacity: canSubmit ? 1 : 0.45,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {phase === "submitting" ? <span className="ur-pro-checkout-capture__spinner" aria-hidden /> : null}
            <span>{phase === "redirecting" ? "…" : "Go →"}</span>
          </button>
        </div>
        {submitError ? (
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: "var(--magenta)",
              fontFamily: "var(--body-font)",
            }}
          >
            {submitError}
          </div>
        ) : null}
        {phase === "redirecting" ? (
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: "var(--muted)",
              fontFamily: "var(--body-font)",
            }}
          >
            Redirecting to Stripe…
          </div>
        ) : null}
        <div
          style={{
            marginTop: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontFamily: "var(--mono-font)", fontSize: 10, color: "var(--muted)", letterSpacing: 0.5 }}>
            Secured by Stripe
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={cancelCapture}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              fontFamily: "var(--body-font)",
              fontSize: 12,
              color: "var(--cyan-bright)",
              cursor: busy ? "default" : "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
