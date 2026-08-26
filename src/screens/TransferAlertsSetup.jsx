import { useCallback, useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

function ownerHeaders(code, token) {
  /** @type {Record<string, string>} */
  const h = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  if (code) h["X-UR-Owner-Code"] = code;
  return h;
}

export default function TransferAlertsSetup() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("Open this page from the Under Review home-screen icon, then enable alerts.");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("ur_access_token") || "" : "";

  const loadConfig = useCallback(async () => {
    const res = await fetch("/api/transfer-alerts-push", {
      headers: ownerHeaders(code, token),
    });
    if (!res.ok) {
      setReady(false);
      if (res.status === 401) {
        setStatus("Owner access only. Enter your owner code (not a friend or Pro code).");
        return null;
      }
      setStatus("Push is not configured on the server yet (VAPID keys).");
      return null;
    }
    const data = await res.json();
    setReady(true);
    setStatus(
      data.subscribed
        ? "This phone is subscribed. Tap again if you reinstall the home-screen app."
        : "Ready. Tap enable, then Allow on the iOS prompt.",
    );
    return data;
  }, [code, token]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  async function enable() {
    setBusy(true);
    try {
      if (!window.isSecureContext) {
        setStatus("Needs HTTPS (or localhost).");
        return;
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("This browser cannot receive Web Push. Use the home-screen Under Review app on iOS 16.4+.");
        return;
      }
      const cfg = await loadConfig();
      if (!cfg?.vapidPublicKey) return;

      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("Notifications were not allowed. iOS only prompts from the home-screen app.");
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(cfg.vapidPublicKey),
      });

      const res = await fetch("/api/transfer-alerts-push", {
        method: "POST",
        headers: ownerHeaders(code, token),
        body: JSON.stringify({ subscription: sub.toJSON(), code: code || undefined }),
      });
      if (!res.ok) {
        setStatus("Subscribe failed. Owner code only — other users are not stored.");
        return;
      }
      setStatus("Enabled. Lock-screen banners will say Under Review. You can leave this page.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        padding: "48px 24px 32px",
        background: "#070710",
        color: "#e8eaf0",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        <p style={{ letterSpacing: 2, fontSize: 11, opacity: 0.6, marginBottom: 8 }}>UNDER REVIEW</p>
        <h1 style={{ fontSize: 28, margin: "0 0 12px" }}>Transfer alerts</h1>
        <p style={{ lineHeight: 1.5, opacity: 0.85, marginBottom: 24 }}>{status}</p>
        {!token ? (
          <input
            type="password"
            autoComplete="off"
            placeholder="Owner code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{
              width: "100%",
              marginBottom: 12,
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #2a2d36",
              background: "#12141a",
              color: "#e8eaf0",
              fontSize: 16,
            }}
          />
        ) : null}
        <button
          type="button"
          disabled={busy || (!token && !code.trim())}
          onClick={enable}
          style={{
            width: "100%",
            padding: 14,
            border: "none",
            borderRadius: 10,
            background: "#00f5e9",
            color: "#080a0c",
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer",
            opacity: busy || (!token && !code.trim()) ? 0.5 : 1,
          }}
        >
          {busy ? "Working…" : ready ? "Enable transfer alerts" : "Continue"}
        </button>
        <p style={{ marginTop: 20, fontSize: 13, opacity: 0.55, lineHeight: 1.45 }}>
          Not linked in the public app. Friend/Pro users cannot subscribe. Open from the home-screen icon so iOS
          treats this as Under Review, not Safari.
        </p>
      </div>
    </div>
  );
}
