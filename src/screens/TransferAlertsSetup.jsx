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

const SPORTS = [
  { id: "nfl", label: "NFL" },
  { id: "soccer", label: "Soccer" },
  { id: "cfb", label: "CFB / Alabama" },
  { id: "other", label: "Other" },
];

const SOURCES = ["Schefter", "Rapoport", "Shams", "Ornstein", "Other"];

export default function TransferAlertsSetup() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("Open this page from the Under Review home-screen icon, then enable alerts.");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [sport, setSport] = useState("nfl");
  const [source, setSource] = useState("Schefter");
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [injectAsk, setInjectAsk] = useState(true);
  const [pasteStatus, setPasteStatus] = useState("");
  const [pasteBusy, setPasteBusy] = useState(false);

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

      const reg = await navigator.serviceWorker.register("/sw.js?v=3", { scope: "/" });
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

  async function sendPaste() {
    setPasteBusy(true);
    setPasteStatus("");
    try {
      const res = await fetch("/api/owner-breaking", {
        method: "POST",
        headers: ownerHeaders(code, token),
        body: JSON.stringify({
          sport,
          source,
          text,
          link: link.trim() || undefined,
          injectAsk: sport === "nfl" ? injectAsk : false,
          code: code || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPasteStatus(data.error || "Paste failed.");
        return;
      }
      if (data.push?.ok) {
        setPasteStatus(`Pushed${data.ask?.ok ? " + Ask inject" : ""}. ${data.preview || ""}`);
        setText("");
      } else if (data.push?.skipped) {
        setPasteStatus(
          `Saved but push skipped (${data.push.reason || "no_subscribers"}). Enable alerts above first.`,
        );
      } else {
        setPasteStatus(data.push?.reason || "Push failed.");
      }
    } catch (err) {
      setPasteStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setPasteBusy(false);
    }
  }

  const fieldStyle = {
    width: "100%",
    marginBottom: 12,
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #2a2d36",
    background: "#12141a",
    color: "#e8eaf0",
    fontSize: 16,
  };

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
        <h1 style={{ fontSize: 28, margin: "0 0 12px" }}>Owner alerts</h1>
        <p style={{ lineHeight: 1.5, opacity: 0.85, marginBottom: 24 }}>{status}</p>
        {!token ? (
          <input
            type="password"
            autoComplete="off"
            placeholder="Owner code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={fieldStyle}
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
          {busy ? "Working…" : ready ? "Enable Web Push" : "Continue"}
        </button>
        <p style={{ marginTop: 20, fontSize: 13, opacity: 0.55, lineHeight: 1.45 }}>
          Owner only. Same subscription receives transfer wires, Alabama RSS, and paste pushes. Open from the
          home-screen icon so iOS treats this as Under Review, not Safari.
        </p>

        <hr style={{ border: "none", borderTop: "1px solid #2a2d36", margin: "32px 0 24px" }} />

        <h2 style={{ fontSize: 20, margin: "0 0 8px" }}>Paste → push</h2>
        <p style={{ fontSize: 13, opacity: 0.65, lineHeight: 1.45, marginBottom: 16 }}>
          Sport + source + one line. Hits your phone in seconds. No cron. NFL lines can also inject into Ask.
        </p>

        <label style={{ fontSize: 12, opacity: 0.6, display: "block", marginBottom: 6 }}>Sport</label>
        <select value={sport} onChange={(e) => setSport(e.target.value)} style={fieldStyle}>
          {SPORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>

        <label style={{ fontSize: 12, opacity: 0.6, display: "block", marginBottom: 6 }}>Source</label>
        <select value={source} onChange={(e) => setSource(e.target.value)} style={fieldStyle}>
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <label style={{ fontSize: 12, opacity: 0.6, display: "block", marginBottom: 6 }}>One-line text</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={280}
          placeholder="e.g. Patriots trading WR X to Jets for a 3rd"
          style={{ ...fieldStyle, resize: "vertical", fontFamily: "inherit" }}
        />

        <label style={{ fontSize: 12, opacity: 0.6, display: "block", marginBottom: 6 }}>
          Link (optional)
        </label>
        <input
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://"
          style={fieldStyle}
        />

        {sport === "nfl" ? (
          <label
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              fontSize: 13,
              opacity: 0.85,
              marginBottom: 16,
            }}
          >
            <input
              type="checkbox"
              checked={injectAsk}
              onChange={(e) => setInjectAsk(e.target.checked)}
            />
            Inject into NFL Ask breaking context (~36h)
          </label>
        ) : null}

        <button
          type="button"
          disabled={pasteBusy || !text.trim() || (!token && !code.trim())}
          onClick={sendPaste}
          style={{
            width: "100%",
            padding: 14,
            border: "none",
            borderRadius: 10,
            background: "#e8eaf0",
            color: "#080a0c",
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer",
            opacity: pasteBusy || !text.trim() || (!token && !code.trim()) ? 0.5 : 1,
          }}
        >
          {pasteBusy ? "Sending…" : "Push to my phone"}
        </button>
        {pasteStatus ? (
          <p style={{ marginTop: 14, fontSize: 13, opacity: 0.75, lineHeight: 1.45 }}>{pasteStatus}</p>
        ) : null}
      </div>
    </div>
  );
}
