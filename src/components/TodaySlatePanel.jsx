import { useEffect, useMemo, useState } from "react";

const SPORT_COLOR = {
  nba: "#FF6B00",
  mlb: "#1DB954",
  golf: "#E2E8F0",
  tennis: "#0891B2",
  f1: "#E10600",
  nfl: "#4A90D9",
};

function formatUpdatedLabel(iso) {
  const t = Date.parse(String(iso || ""));
  if (Number.isNaN(t)) return "";
  const min = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (min <= 1) return "Updated just now";
  if (min < 60) return `Updated ${min} min ago`;
  const h = Math.round(min / 60);
  return `Updated ${h} hr${h === 1 ? "" : "s"} ago`;
}

function SlateRow({ label, item }) {
  if (!item || typeof item !== "object") return null;
  const sport = String(item.sport || "nba").toLowerCase();
  const color = SPORT_COLOR[sport] || SPORT_COLOR.nba;
  const title = item.game || item.event || item.match || "Slate";
  const angle = item.angle || "";
  const why = item.why || "";
  return (
    <div
      style={{
        padding: "10px 0",
        borderTop: "1px solid var(--border)",
      }}
    >
      <div style={{ fontFamily: "var(--mono-font)", fontSize: 9, letterSpacing: 1.5, color: "var(--muted)", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
        <span
          style={{
            fontFamily: "var(--mono-font)",
            fontSize: 10,
            fontWeight: 700,
            color,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          {sport}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{title}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>{angle}</div>
      <div style={{ fontSize: 12, color: "var(--soft)", lineHeight: 1.45 }}>{why}</div>
    </div>
  );
}

const SLATE_ROW_KEYS = ["safeLean", "sharpAngle", "contrarian"];
const SLATE_ROW_LABEL = {
  safeLean: "Safe lean",
  sharpAngle: "Sharp angle",
  contrarian: "Contrarian",
};

export default function TodaySlatePanel({ excludeEventKeys = [], onDisplayedEventKeysChange }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  const excludeSet = useMemo(() => new Set(excludeEventKeys || []), [excludeEventKeys]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch("/api/today-slate", { cache: "no-store" });
        const raw = await res.text();
        if (!res.ok) throw new Error(raw.slice(0, 200) || res.statusText);
        const j = JSON.parse(raw);
        if (j?.error) throw new Error(String(j.error));
        if (!cancelled) setData(j);
      } catch (e) {
        if (!cancelled) {
          const msg = String(e?.message || "Failed to load");
          if (msg.includes("bad_model_json") || msg.includes("upstream_error")) {
            setErr("Slate engine refreshing — showing fallback angles shortly.");
          } else {
            setErr(msg);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleRowKeys = useMemo(() => {
    if (!data) return SLATE_ROW_KEYS;
    const order =
      Array.isArray(data._slateRowOrder) && data._slateRowOrder.length === SLATE_ROW_KEYS.length
        ? data._slateRowOrder
        : SLATE_ROW_KEYS;
    return order.filter((rowKey) => {
      const item = data[rowKey];
      const ek = Array.isArray(item?._eventKeys) ? item._eventKeys : [];
      if (ek.length === 0) return true;
      return !ek.some((k) => excludeSet.has(k));
    });
  }, [data, excludeSet]);

  useEffect(() => {
    if (!onDisplayedEventKeysChange || !data) return;
    const keys = new Set();
    visibleRowKeys.forEach((rk) => {
      const item = data[rk];
      (Array.isArray(item?._eventKeys) ? item._eventKeys : []).forEach((k) => keys.add(k));
    });
    onDisplayedEventKeysChange(Array.from(keys));
  }, [data, visibleRowKeys, onDisplayedEventKeysChange]);

  return (
    <div
      style={{
        marginTop: 10,
        marginBottom: 10,
        padding: "14px 14px 12px",
        background: "linear-gradient(180deg, rgba(0,245,233,.06), rgba(15,23,42,.4))",
        border: "1px solid rgba(0,245,233,.2)",
        borderRadius: 14,
      }}
    >
      <div
        style={{
          fontFamily: "var(--mono-font)",
          fontSize: 11,
          letterSpacing: 2,
          color: "#00F5E9",
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        {"Today's slate"}
      </div>
      {loading && (
        <div style={{ fontSize: 12, color: "var(--muted)" }}>Loading cross-sport angles…</div>
      )}
      {err && !loading && (
        <div style={{ fontSize: 12, color: "#FF6B6B" }}>{err}</div>
      )}
      {!loading && !err && data && (
        <>
          {visibleRowKeys.map((key) => (
            <SlateRow key={key} label={SLATE_ROW_LABEL[key] || key} item={data[key]} />
          ))}
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
            {formatUpdatedLabel(data.generatedAt)}
          </div>
        </>
      )}
    </div>
  );
}
