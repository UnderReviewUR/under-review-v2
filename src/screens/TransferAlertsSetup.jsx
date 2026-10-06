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

const DEFAULT_PREFS = {
  teams: {
    barcelona: true,
    alabama: true,
    real_madrid: false,
    man_city: false,
    arsenal: false,
    liverpool: false,
    ne_patriots: false,
    dal_cowboys: false,
    kc_chiefs: false,
  },
  customTeams: [],
  interests: {
    transfers: true,
    injuries: true,
    roster: true,
    rumors: false,
    coaching: true,
    gameDay: true,
  },
};

const SPORTS = [
  { id: "nfl", label: "NFL" },
  { id: "soccer", label: "Soccer" },
  { id: "cfb", label: "CFB" },
  { id: "other", label: "Other" },
];

const SOURCES = ["Schefter", "Rapoport", "Shams", "Ornstein", "Other"];

const STEPS = ["enable", "teams", "interests", "done"];

export default function TransferAlertsSetup() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("Owner phone alerts — enable once, then tailor what lands.");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  /** Server has ≥1 subscription on file (any device). */
  const [serverCount, setServerCount] = useState(0);
  /** This browser/PWA has an active PushManager subscription. */
  const [thisDevice, setThisDevice] = useState(false);
  const [step, setStep] = useState("enable");
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [curatedTeams, setCuratedTeams] = useState([]);
  const [interestDefs, setInterestDefs] = useState([]);
  const [customInput, setCustomInput] = useState("");
  const [prefsBusy, setPrefsBusy] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [sport, setSport] = useState("nfl");
  const [source, setSource] = useState("Schefter");
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [injectAsk, setInjectAsk] = useState(true);
  const [pasteStatus, setPasteStatus] = useState("");
  const [pasteBusy, setPasteBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("ur_access_token") || "" : "";

  async function detectThisDevice() {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setThisDevice(false);
        return false;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        setThisDevice(false);
        return false;
      }
      const sub = await reg.pushManager.getSubscription();
      const ok = Boolean(sub?.endpoint);
      setThisDevice(ok);
      return ok;
    } catch {
      setThisDevice(false);
      return false;
    }
  }

  const loadConfig = useCallback(async () => {
    const [pushRes, breakingRes] = await Promise.all([
      fetch("/api/transfer-alerts-push", { headers: ownerHeaders(code, token) }),
      fetch("/api/owner-breaking", { headers: ownerHeaders(code, token) }),
    ]);

    if (!pushRes.ok) {
      setReady(false);
      setServerCount(0);
      if (pushRes.status === 401) {
        setStatus("Owner code required (security gate). Friend/Pro codes won’t work.");
        return null;
      }
      if (pushRes.status === 503) {
        setStatus("Push isn’t configured on this deploy (VAPID keys missing).");
        return null;
      }
      setStatus(`Push setup failed (HTTP ${pushRes.status}).`);
      return null;
    }

    const pushData = await pushRes.json();
    setReady(true);
    const count = Number(pushData.count) || (pushData.subscribed ? 1 : 0);
    setServerCount(count);
    const onThisPhone = await detectThisDevice();

    if (onThisPhone) {
      setStatus(
        `✓ This phone is enabled (${count} device${count === 1 ? "" : "s"} on file). Pick teams + interests, then test with a paste.`,
      );
      setStep((s) => (s === "enable" ? "teams" : s));
    } else if (count > 0) {
      setStatus(
        `Server has ${count} device${count === 1 ? "" : "s"} on file, but this phone isn’t enabled yet. Tap Enable push on this home-screen app.`,
      );
    } else {
      setStatus("Step 1: Open from the home-screen icon → Enable push → Allow.");
    }

    if (breakingRes.ok) {
      const breakingData = await breakingRes.json();
      if (breakingData.prefs) setPrefs(breakingData.prefs);
      if (Array.isArray(breakingData.curatedTeams)) setCuratedTeams(breakingData.curatedTeams);
      if (Array.isArray(breakingData.interests)) setInterestDefs(breakingData.interests);
    } else if (breakingRes.status === 404) {
      setStatus((prev) => `${prev} (Note: owner-breaking API missing — use the PR preview URL, not production.)`);
    }

    return pushData;
  }, [code, token]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  async function enable() {
    setBusy(true);
    try {
      if (!window.isSecureContext) {
        setStatus("Needs HTTPS (or localhost). Safari tabs over HTTP won’t work.");
        return;
      }
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus(
          "This browser can’t do Web Push. On iPhone: Add to Home Screen, open that icon (not Safari), then Enable.",
        );
        return;
      }
      const cfg = await loadConfig();
      if (!cfg?.vapidPublicKey) {
        setStatus("No VAPID public key from server — Enable can’t finish. Check owner code / deploy env.");
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js?v=3", { scope: "/" });
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(
          `Notifications = ${permission}. On iOS, Allow only appears inside the home-screen app. Settings → Notifications → Under Review if you blocked it.`,
        );
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(
          res.status === 401
            ? "Enable failed — owner code / owner token only."
            : `Enable failed (${data.error || res.status}).`,
        );
        return;
      }
      const count = Number(data.count) || 1;
      setServerCount(count);
      setThisDevice(true);
      setStatus(
        `✓ Enabled on this phone. ${count} device${count === 1 ? "" : "s"} on file. Next: pick teams, then send a test paste.`,
      );
      setStep("teams");
      setShowPaste(true);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function sendTestPush() {
    setTestBusy(true);
    setPasteStatus("");
    try {
      const res = await fetch("/api/owner-breaking", {
        method: "POST",
        headers: ownerHeaders(code, token),
        body: JSON.stringify({
          sport: "other",
          source: "Other",
          text: "Under Review test — if you see this, Enable worked.",
          injectAsk: false,
          code: code || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) {
        setPasteStatus("Test paste needs the PR preview (owner-breaking isn’t on production yet).");
        return;
      }
      if (!res.ok) {
        setPasteStatus(data.error || `Test failed (${res.status}).`);
        return;
      }
      if (data.push?.ok) {
        setPasteStatus(`Test sent to ${data.push.sent || "?"} device(s). Check your lock screen.`);
      } else {
        setPasteStatus(`Test skipped: ${data.push?.reason || "unknown"} — Enable this phone first.`);
      }
    } catch (err) {
      setPasteStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setTestBusy(false);
    }
  }

  async function persistPrefs(next) {
    setPrefsBusy(true);
    setPrefs(next);
    try {
      const res = await fetch("/api/owner-breaking", {
        method: "POST",
        headers: ownerHeaders(code, token),
        body: JSON.stringify({ prefs: next, code: code || undefined }),
      });
      if (!res.ok) {
        setStatus("Couldn’t save preferences — check owner access.");
        return false;
      }
      const data = await res.json();
      if (data.prefs) setPrefs(data.prefs);
      return true;
    } catch {
      setStatus("Couldn’t save preferences.");
      return false;
    } finally {
      setPrefsBusy(false);
    }
  }

  function toggleTeam(id) {
    const next = {
      ...prefs,
      teams: { ...prefs.teams, [id]: !prefs.teams?.[id] },
    };
    persistPrefs(next);
  }

  function toggleInterest(id) {
    const next = {
      ...prefs,
      interests: { ...prefs.interests, [id]: !prefs.interests?.[id] },
    };
    persistPrefs(next);
  }

  function addCustomTeam() {
    const name = customInput.replace(/\s+/g, " ").trim();
    if (name.length < 2) return;
    const list = [...(prefs.customTeams || [])];
    if (list.some((x) => x.toLowerCase() === name.toLowerCase())) {
      setCustomInput("");
      return;
    }
    if (list.length >= 8) {
      setStatus("Max 8 custom teams.");
      return;
    }
    persistPrefs({ ...prefs, customTeams: [...list, name] });
    setCustomInput("");
  }

  function removeCustomTeam(name) {
    persistPrefs({
      ...prefs,
      customTeams: (prefs.customTeams || []).filter((x) => x !== name),
    });
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
        setPasteStatus(`Sent. ${data.preview || ""}`);
        setText("");
      } else if (data.push?.skipped) {
        setPasteStatus(`Enable push first (${data.push.reason || "no_subscribers"}).`);
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

  const chip = (active, label, onClick) => (
    <button
      type="button"
      key={label}
      onClick={onClick}
      disabled={prefsBusy || (!token && !code.trim())}
      style={{
        padding: "10px 14px",
        borderRadius: 999,
        border: active ? "1px solid #00f5e9" : "1px solid #2a2d36",
        background: active ? "rgba(0,245,233,0.12)" : "#12141a",
        color: active ? "#00f5e9" : "#c5cad6",
        fontSize: 14,
        cursor: "pointer",
        opacity: prefsBusy ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );

  const stepIndex = STEPS.indexOf(step);

  return (
    <div
      style={{
        minHeight: "100dvh",
        padding: "48px 24px 40px",
        background: "#070710",
        color: "#e8eaf0",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 440, margin: "0 auto" }}>
        <p style={{ letterSpacing: 2, fontSize: 11, opacity: 0.6, marginBottom: 8 }}>UNDER REVIEW · OWNER</p>
        <h1 style={{ fontSize: 28, margin: "0 0 8px" }}>Phone alerts</h1>
        <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 16 }}>
          {STEPS.map((s, i) => (
            <span key={s} style={{ marginRight: 10, color: i <= stepIndex ? "#00f5e9" : "#5a6170" }}>
              {i + 1}. {s}
            </span>
          ))}
        </p>
        <p style={{ lineHeight: 1.5, opacity: 0.85, marginBottom: 12 }}>{status}</p>
        <p style={{ fontSize: 13, opacity: 0.55, marginBottom: 24 }}>
          This phone: {thisDevice ? "✓ enabled" : "not enabled"} · Devices on file: {serverCount}
          {ready ? "" : " · server not ready"}
        </p>

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
            background: thisDevice ? "#1a1d26" : "#00f5e9",
            color: thisDevice ? "#e8eaf0" : "#080a0c",
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer",
            opacity: busy || (!token && !code.trim()) ? 0.5 : 1,
            marginBottom: 12,
            borderWidth: thisDevice ? 1 : 0,
            borderStyle: "solid",
            borderColor: "#2a2d36",
          }}
        >
          {busy ? "Working…" : thisDevice ? "Re-enable on this phone" : "1 · Enable push"}
        </button>

        {thisDevice ? (
          <button
            type="button"
            disabled={testBusy || (!token && !code.trim())}
            onClick={sendTestPush}
            style={{
              width: "100%",
              padding: 12,
              border: "1px solid #2a2d36",
              borderRadius: 10,
              background: "#12141a",
              color: "#00f5e9",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              marginBottom: 20,
              opacity: testBusy ? 0.5 : 1,
            }}
          >
            {testBusy ? "Sending test…" : "Send test push to this phone"}
          </button>
        ) : null}
        {pasteStatus && !showPaste ? (
          <p style={{ marginTop: -8, marginBottom: 20, fontSize: 13, opacity: 0.75, lineHeight: 1.45 }}>
            {pasteStatus}
          </p>
        ) : null}

        {(thisDevice || step !== "enable") && (
          <>
            <section style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 18, margin: "0 0 6px" }}>2 · Teams</h2>
              <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 12, lineHeight: 1.4 }}>
                Tap what you want on the phone. Barcelona + Alabama auto-feed; other chips filter transfer wires /
                label what you care about. Add up to 8 custom names.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {(curatedTeams.length
                  ? curatedTeams
                  : Object.keys(prefs.teams || {}).map((id) => ({ id, label: id }))
                ).map((t) => chip(Boolean(prefs.teams?.[t.id]), t.label, () => toggleTeam(t.id)))}
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Add team (e.g. Tottenham)"
                  style={{ ...fieldStyle, marginBottom: 0, flex: 1 }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomTeam();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addCustomTeam}
                  style={{
                    padding: "0 16px",
                    borderRadius: 10,
                    border: "1px solid #2a2d36",
                    background: "#12141a",
                    color: "#e8eaf0",
                    cursor: "pointer",
                  }}
                >
                  Add
                </button>
              </div>
              {(prefs.customTeams || []).length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {prefs.customTeams.map((name) =>
                    chip(true, `× ${name}`, () => removeCustomTeam(name)),
                  )}
                </div>
              ) : null}
              {step === "teams" ? (
                <button
                  type="button"
                  onClick={() => setStep("interests")}
                  style={{
                    marginTop: 16,
                    width: "100%",
                    padding: 12,
                    border: "none",
                    borderRadius: 10,
                    background: "#e8eaf0",
                    color: "#080a0c",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Next · Interests
                </button>
              ) : null}
            </section>

            <section style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 18, margin: "0 0 6px" }}>3 · Interests</h2>
              <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 12, lineHeight: 1.4 }}>
                What kinds of alerts fire. Rumors default off so you’re not inundated.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {(interestDefs.length
                  ? interestDefs
                  : Object.keys(prefs.interests || {}).map((id) => ({ id, label: id }))
                ).map((d) =>
                  chip(Boolean(prefs.interests?.[d.id]), d.label, () => toggleInterest(d.id)),
                )}
              </div>
              {step === "interests" || step === "done" ? (
                <button
                  type="button"
                  onClick={() => {
                    setStep("done");
                    setStatus(
                      `✓ You’re set. This phone ${thisDevice ? "is enabled" : "still needs Enable"} (${serverCount} on file). Auto alerts follow your teams + interests.`,
                    );
                    setShowPaste(true);
                  }}
                  style={{
                    marginTop: 16,
                    width: "100%",
                    padding: 12,
                    border: "none",
                    borderRadius: 10,
                    background: "#00f5e9",
                    color: "#080a0c",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Done — alerts will arrive
                </button>
              ) : null}
            </section>
          </>
        )}

        <p style={{ fontSize: 13, opacity: 0.5, lineHeight: 1.45, marginBottom: 20 }}>
          Open from the home-screen icon (not Safari). Preferences save to the server for this owner only.
        </p>

        <button
          type="button"
          onClick={() => setShowPaste((v) => !v)}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            color: "#9aa3b5",
            fontSize: 13,
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          {showPaste ? "Hide paste" : "Paste a beat line (always available)"}
        </button>

        {showPaste ? (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 13, opacity: 0.65, lineHeight: 1.45, marginBottom: 16 }}>
              No X firehose — paste Schefter / Shams / Ornstein when you already saw it. Ignores team toggles.
            </p>
            <select value={sport} onChange={(e) => setSport(e.target.value)} style={fieldStyle}>
              {SPORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <select value={source} onChange={(e) => setSource(e.target.value)} style={fieldStyle}>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={280}
              placeholder="One-line breaking text"
              style={{ ...fieldStyle, resize: "vertical", fontFamily: "inherit" }}
            />
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https:// (optional)"
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
                Also inject into NFL Ask (~36h)
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
        ) : null}
      </div>
    </div>
  );
}
