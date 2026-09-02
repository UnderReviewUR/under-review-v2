import { useEffect, useMemo, useState } from "react";
import { isTodaySlateSportVisible } from "../../shared/siteSportVisibility.js";

const SPORT_COLOR = {
  nba: "#FF6B00",
  mlb: "#1DB954",
  golf: "#64748B",
  tennis: "#0891B2",
  f1: "#E10600",
  nfl: "#4A90D9",
  laliga: "#EE4444",
  worldcup: "#00F5E9",
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

function softSlateError(raw) {
  const msg = String(raw || "");
  if (
    /FUNCTION_INVOCATION_TIMEOUT|timeout|504|503|502|upstream|bad_model_json/i.test(msg)
  ) {
    return "Slate angles are warming up — showing posted games below.";
  }
  if (msg.includes("bad_model_json") || msg.includes("upstream_error")) {
    return "Slate is reconnecting — showing posted games below.";
  }
  return "Couldn't load slate angles — showing posted games below.";
}

function SlateRow({ label, item, fallbackSports }) {
  if (!item || typeof item !== "object") return null;
  const sport = String(item.sport || "nba").toLowerCase();
  const color = SPORT_COLOR[sport] || SPORT_COLOR.nba;
  const title = item.game || item.event || item.match || "Slate";
  const angle = item.angle || "";
  const why = item.why || "";
  const titleMentionsWta = /\bwta\b/i.test(`${title} ${item.event || ""} ${item.match || ""}`);
  const isFallbackSource =
    (fallbackSports && fallbackSports.has(sport)) || (sport === "tennis" && titleMentionsWta);
  return (
    <div
      className="today-slate-row"
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
          {sport === "worldcup" ? "WORLD CUP" : sport === "laliga" ? "LA LIGA" : sport}
        </span>
        {isFallbackSource ? (
          <span
            style={{
              fontFamily: "var(--mono-font)",
              fontSize: 9,
              letterSpacing: 1,
              color: "var(--muted)",
            }}
            title="From the live board — verify before betting"
          >
            Board
          </span>
        ) : null}
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{title}</span>
      </div>
      {angle ? (
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>{angle}</div>
      ) : null}
      {why ? (
        <div style={{ fontSize: 12, color: "var(--soft)", lineHeight: 1.45 }}>{why}</div>
      ) : null}
    </div>
  );
}

const SLATE_ROW_KEYS = ["safeLean", "sharpAngle", "contrarian"];
const SLATE_ROW_LABEL = {
  safeLean: "Safe lean",
  sharpAngle: "Sharp angle",
  contrarian: "Contrarian",
};

/**
 * Build board-backed slate rows when /api/today-slate fails or returns empty.
 * @param {{ nflGames?: Array, laligaMatches?: Array }} boards
 */
export function buildTodaySlateBoardFallback(boards = {}) {
  const rows = [];
  const nfl = Array.isArray(boards.nflGames) ? boards.nflGames : [];
  for (const g of nfl.slice(0, 3)) {
    const away = g?.awayAbbr || g?.awayTeam?.abbr || g?.away || "AWAY";
    const home = g?.homeAbbr || g?.homeTeam?.abbr || g?.home || "HOME";
    const line =
      g?.spread != null
        ? `${home} ${Number(g.spread) > 0 ? "+" : ""}${g.spread}`
        : g?.statusDisplay || "Posted";
    rows.push({
      sport: "nfl",
      game: `${away} @ ${home}`,
      angle: line,
      why: "From the NFL board — ask UR Take for the full read.",
      _eventKeys: g?.gameKey || g?.id ? [String(g.gameKey || g.id)] : [],
    });
  }
  const liga = Array.isArray(boards.laligaMatches) ? boards.laligaMatches : [];
  for (const m of liga.slice(0, 2)) {
    const away = m?.awayAbbr || m?.awayName || "AWAY";
    const home = m?.homeAbbr || m?.homeName || "HOME";
    const ml =
      m?.awayOdds != null || m?.homeOdds != null
        ? `${away} ${m.awayOdds ?? "—"} / Draw ${m.drawOdds ?? "—"} / ${home} ${m.homeOdds ?? "—"}`
        : "Matchweek posted";
    rows.push({
      sport: "laliga",
      game: `${away} @ ${home}`,
      angle: ml,
      why: "From the La Liga board — ask UR Take for the full read.",
      _eventKeys: m?.providerMatchId ? [String(m.providerMatchId)] : [],
    });
  }
  return rows;
}

export default function TodaySlatePanel({
  excludeEventKeys = [],
  onDisplayedEventKeysChange,
  fallbackSports = [],
  nflGames = [],
  laligaMatches = [],
}) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  const excludeSet = useMemo(() => new Set(excludeEventKeys || []), [excludeEventKeys]);
  const fallbackSportsSet = useMemo(
    () => new Set((fallbackSports || []).map((s) => String(s || "").toLowerCase())),
    [fallbackSports],
  );

  const boardFallbackRows = useMemo(
    () => buildTodaySlateBoardFallback({ nflGames, laligaMatches }),
    [nflGames, laligaMatches],
  );

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
          setErr(softSlateError(e?.message));
          setData(null);
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
      const sport = String(item?.sport || "nba").toLowerCase();
      if (!isTodaySlateSportVisible(sport)) return false;
      const ek = Array.isArray(item?._eventKeys) ? item._eventKeys : [];
      if (ek.length === 0) return true;
      return !ek.some((k) => excludeSet.has(k));
    });
  }, [data, excludeSet]);

  useEffect(() => {
    if (!onDisplayedEventKeysChange) return;
    const keys = new Set();
    if (data) {
      visibleRowKeys.forEach((rk) => {
        const item = data[rk];
        (Array.isArray(item?._eventKeys) ? item._eventKeys : []).forEach((k) => keys.add(k));
      });
    } else {
      boardFallbackRows.forEach((row) => {
        (Array.isArray(row?._eventKeys) ? row._eventKeys : []).forEach((k) => keys.add(k));
      });
    }
    onDisplayedEventKeysChange(Array.from(keys));
  }, [data, visibleRowKeys, boardFallbackRows, onDisplayedEventKeysChange]);

  const slateRowRenderable = (key) => {
    const item = data?.[key];
    if (!item || typeof item !== "object") return false;
    return Boolean(
      (item.angle && String(item.angle).trim()) ||
        (item.why && String(item.why).trim()) ||
        item.game ||
        item.event ||
        item.match,
    );
  };

  const hasRenderableSlateRows =
    Boolean(data) && visibleRowKeys.some((k) => slateRowRenderable(k));

  const showBoardFallback = !loading && (!hasRenderableSlateRows || Boolean(err));
  const fallbackVisible = boardFallbackRows.filter((row) => {
    const sport = String(row.sport || "").toLowerCase();
    if (!isTodaySlateSportVisible(sport) && sport !== "laliga" && sport !== "nfl") return false;
    const ek = Array.isArray(row._eventKeys) ? row._eventKeys : [];
    if (ek.length === 0) return true;
    return !ek.some((k) => excludeSet.has(k));
  });

  return (
    <div
      className="today-slate-panel"
      style={{
        marginTop: 10,
        marginBottom: 10,
        padding: "14px 14px 12px",
        background: "linear-gradient(180deg, rgba(0,245,233,.06), rgba(15,23,42,.08))",
        border: "1px solid rgba(0,245,233,.2)",
        borderRadius: 14,
      }}
    >
      <div className="today-slate-title" style={{ marginBottom: 4 }}>
        {showBoardFallback && !hasRenderableSlateRows ? "On the board" : "Today's slate"}
      </div>
      {loading && (
        <div className="today-slate-loading" style={{ fontSize: 12, color: "var(--muted)" }}>
          Pulling sharp angles across sports…
        </div>
      )}
      {err && !loading && (
        <div className="today-slate-error" style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
          {err}
        </div>
      )}
      {!loading && !err && data && hasRenderableSlateRows ? (
        <>
          {visibleRowKeys.map((key) => (
            <SlateRow
              key={key}
              label={SLATE_ROW_LABEL[key] || key}
              item={data[key]}
              fallbackSports={fallbackSportsSet}
            />
          ))}
          <div className="today-slate-updated" style={{ marginTop: 8 }}>
            {formatUpdatedLabel(data.generatedAt)}
          </div>
        </>
      ) : null}
      {showBoardFallback && fallbackVisible.length > 0 ? (
        <>
          {fallbackVisible.map((row, i) => (
            <SlateRow
              key={`board-${row.sport}-${i}`}
              label={i === 0 ? "Upcoming posted" : "Also posted"}
              item={row}
              fallbackSports={new Set([row.sport])}
            />
          ))}
        </>
      ) : null}
      {showBoardFallback && fallbackVisible.length === 0 && !loading ? (
        <div className="today-slate-empty">
          No posted games in this window yet — ask UR Take on a specific matchup.
        </div>
      ) : null}
    </div>
  );
}
