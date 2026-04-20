import { useLayoutEffect, useContext, useRef, useState } from "react";
import { PerformanceContext } from "../../context/PerformanceContext.jsx";
import {
  normalizeConfidenceTier,
  mergeTierSnapshots,
  last30DaysTierSnapshot,
  formatRecordUnits,
  displayConfidenceLabel,
} from "../../lib/urTakePerformance.js";

import { normalizeText } from "../../lib/normalizeText.js";
export { normalizeText };

/** Last N user/assistant turns for `/api/ur-take` follow-ups (no loading rows). */
/** Prefer explicit sport on stored AI bubbles (follow-up routing). */
export function inferUrTakeSportFromMessages(msgs) {
  if (!Array.isArray(msgs)) return null;
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    if (!m || m.loading || m.role !== "ai") continue;
    const s = String(m.sport || "").trim().toLowerCase();
    if (s && s !== "generic") return s;
  }
  return null;
}

export function chatHistoryForApi(msgs, { maxMessages = 6 } = {}) {
  if (!Array.isArray(msgs)) return [];
  const sanitizeForModel = (input) => {
    let s = String(input || "").trim();
    if (!s) return "";
    s = s
      .replace(/^This is a .*? confidence take\.[^\n]*\n?/i, "")
      .replace(/^WRONG SPORT\.[^\n]*\n?/im, "")
      .replace(/^I'm locked into [^\n]*\n?/im, "")
      .replace(/^For tennis prop analysis[^\n]*\n?/im, "")
      .replace(/^What NBA game or player props[^\n]*\n?/im, "")
      .trim();
    return s;
  };
  const cleaned = [];
  for (const m of msgs) {
    if (!m || m.loading) continue;
    const role = m.role === "ai" ? "assistant" : m.role === "user" ? "user" : null;
    const content = sanitizeForModel(m.text ?? m.content ?? "");
    if (!role || !content || /^ANALYZING/i.test(content)) continue;
    cleaned.push({ role, content: content.slice(0, 3500) });
  }
  return cleaned.slice(-maxMessages);
}

export function slugify(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Question sent to `/api/ur-take`.
 * Optionally prepends a short recap of raw prior UI messages when `priorMessages` is passed.
 */
export function buildContextualQuestion(text, opts = {}) {
  const cleaned = String(text ?? "").trim();
  const priorMessages = opts.priorMessages;
  if (!Array.isArray(priorMessages) || priorMessages.length === 0) return cleaned;

  const sanitizeForModel = (input) => {
    let s = String(input || "").trim();
    if (!s) return "";
    s = s
      .replace(/^This is a .*? confidence take\.[^\n]*\n?/i, "")
      .replace(/^WRONG SPORT\.[^\n]*\n?/im, "")
      .replace(/^I'm locked into [^\n]*\n?/im, "")
      .replace(/^For tennis prop analysis[^\n]*\n?/im, "")
      .replace(/^What NBA game or player props[^\n]*\n?/im, "")
      .trim();
    return s;
  };

  const snippets = priorMessages
    .filter((m) => m && !m.loading && m.role === "user")
    .slice(-8)
    .map((m) => {
      const content = sanitizeForModel(m.text ?? m.content ?? "");
      if (!content || /^ANALYZING/i.test(content)) return null;
      const who = "User";
      return `${who}: ${content.slice(0, 1400)}`;
    })
    .filter(Boolean);

  if (!snippets.length) return cleaned;

  return `${snippets.join("\n")}\n\nFollow-up:\n${cleaned}`;
}

/**
 * Only real Ball Dont Lie ATP fixtures — rejects legacy client DB snapshots (`db-*` ids,
 * "Database snapshot…" rounds) and any row missing a numeric BDL match id.
 */
export function isBallDontLieAtpFixture(row) {
  if (!row || typeof row !== "object") return false;
  if (String(row.source || "").trim() !== "balldontlie_atp") return false;
  const roundStr = String(row.round || "");
  if (roundStr.includes("Database snapshot")) return false;

  const bid = row.bdl_match_id ?? row.id;
  if (bid == null || bid === "") return false;
  const sid = String(bid).trim();
  if (sid.startsWith("db-")) return false;

  const num = Number(sid);
  return Number.isFinite(num) && num > 0;
}

export function isNflInSeason() {
  const m = new Date().getMonth();
  return m >= 8 || m <= 1;
}

export function isNflRampMode() {
  const m = new Date().getMonth();
  return m >= 6 && m <= 7;
}

export function normalizeTennisMatch(match, fallbackTour = "ATP", _activeTournament = null) {
  if (!match) return null;

  if (fallbackTour === "ATP" && !isBallDontLieAtpFixture(match)) return null;

  const league = match.league || (normalizeText(match.league_name).includes("wta") || normalizeText(match.event_type_type).includes("women") ? "WTA" : fallbackTour);
  const home = String(match.home_team || match.event_first_player || "").trim();
  const away = String(match.away_team || match.event_second_player || "").trim();
  if (!home || !away) return null;

  const blocked = new Set(["player 1", "player 2", "tbd", "unknown", "n/a", "-"]);
  if (blocked.has(home.toLowerCase()) || blocked.has(away.toLowerCase())) return null;
  if (home.toLowerCase() === away.toLowerCase()) return null;

  const tournament = String(match.tournament || match.tournament_name || "").trim();
  if (!tournament) return null;

  const rawLive = String(match.live ?? match.event_live ?? "0");
  const statusProbe = normalizeText(match.status || match.event_status || "");
  const isLive = rawLive === "1" || statusProbe.includes("in_progress");
  let status = String(match.status || match.event_status || "Scheduled").trim();
  if (isLive) status = "Live";

  const eventDate = String(match.event_date || "").trim();
  const eventTime = String(match.event_time || "").trim();
  const commenceTime = match.commence_time || (eventDate && eventTime ? `${eventDate}T${eventTime}:00` : eventDate ? `${eventDate}T00:00:00` : null);

  const surf = String(match.bdl_tournament_surface || "").trim();
  const staticWta =
    String(match.source || "").includes("ur_static_wta") ||
    !!match.ur_static_snapshot;

  const quickHitters = staticWta
    ? [
        surf ? `${surf} — misprice vs your surface Elo?` : "Misprice vs database Elo?",
        "Games / handicap vs implied vol?",
        "Only play if price clears your threshold — snapshot is not a schedule.",
      ]
    : surf
      ? [
          `${surf} — who benefits more?`,
          "Moneyline vs games/total — best edge?",
          "Live spot or pre-match price?",
        ]
      : ["Best angle here?", "Moneyline or total?", "Any live edge?"];

  return {
    id: match.id || match.event_key || `${home}-${away}-${league}-${eventDate || tournament}`,
    league,
    leagueColor: league === "WTA" ? "#E11D48" : "#0891B2",
    title: `${home} vs ${away}`,
    time: status,
    network: tournament,
    blurb: `${home} vs ${away}${match.round ? ` · ${match.round}` : ""}${match.score && match.score !== "-" ? ` · ${match.score}` : ""}${surf ? ` · ${surf}` : ""}`,
    whatMatters: "Ask for the side, total, props, or live angle.",
    quickHitters,
    confirmed: true,
    commenceTime,
    commenceTs: commenceTime ? new Date(commenceTime).getTime() : Number.MAX_SAFE_INTEGER,
    raw: {
      ...match,
      live: isLive ? "1" : "0",
      status,
      home,
      away,
      tournament,
      event_date: eventDate,
      event_time: eventTime,
    },
  };
}

export function preferredTournamentScore(match, context) {
  const active = context?.currentTournament;
  if (!active || !match) return 0;

  const tournamentSlug = slugify(match.network || match.raw?.tournament || "");
  const keySlug = slugify(active.key || "");
  const nameSlug = slugify(active.name || "");
  if (!tournamentSlug) return 0;

  if (nameSlug && tournamentSlug.includes(nameSlug)) return 5;
  if (keySlug && tournamentSlug.includes(keySlug)) return 5;
  if (nameSlug && nameSlug.includes(tournamentSlug)) return 4;
  if (keySlug && keySlug.includes(tournamentSlug)) return 4;
  return 0;
}

export function getTournamentFetchParam(context) {
  const active = context?.currentTournament;
  if (!active) return "charleston";
  const candidates = [active.key, active.name, active.location].filter(Boolean);
  return candidates.map((v) => slugify(v)).join(",") || "charleston";
}

export function buildNflContext(nflPlayers) {
  return Object.entries(nflPlayers)
    .map(([name, p]) => {
      const tdPg = p.props.td?.pg !== undefined ? `${p.props.td.pg} TDs/g` : "";
      const total = p.rec2025.td !== undefined ? `${p.rec2025.td} total TDs` : "";
      const games = p.rec2025.g !== undefined ? `${p.rec2025.g}g` : "";
      const tdLean = p.props.td?.lean || "—";
      const yLean = p.props.recYds?.lean || p.props.rec?.lean || "—";
      const recPg = p.rec2025.recPg !== undefined ? `, ${p.rec2025.recPg} rec/g` : "";
      const tgt = p.rec2025.tgt !== undefined ? `, ${p.rec2025.tgt} tgt` : "";
      const ypr = p.rec2025.ypr !== undefined ? `, ${p.rec2025.ypr} ypr` : "";
      return [
        `${name} | ${p.pos} | ${p.team} | ${p.tier}`,
        `  Stats: ${p.ydsPg} yds/g, ${total} in ${games}${recPg}${tgt}${ypr}`,
        `  TD rate: ${tdPg || "n/a"} | TD lean: ${tdLean}`,
        `  Volume lean: ${yLean}`,
        `  Situation: ${p.situation}`,
        `  Angles: ${p.bettingAngles.join(" | ")}`,
      ].join("\n");
    })
    .join("\n\n");
}

export function formatServeStats(s) {
  if (!s) return "—";
  const p = [];
  if (s.holdPct !== undefined) p.push(`Hold ${s.holdPct}%`);
  if (s.acePct !== undefined) p.push(`Ace ${s.acePct}%`);
  if (s.dfPct !== undefined) p.push(`DF ${s.dfPct}%`);
  return p.length ? p.join(", ") : "—";
}

export function formatReturnStats(s) {
  if (!s) return "—";
  const p = [];
  if (s.rpwPct !== undefined) p.push(`RPW ${s.rpwPct}%`);
  if (s.breakPct !== undefined) p.push(`Break ${s.breakPct}%`);
  return p.length ? p.join(", ") : "—";
}

export function formatOverallStats(s) {
  if (!s) return "—";
  const p = [];
  if (s.dominanceRatio !== undefined) p.push(`DR ${s.dominanceRatio}`);
  if (s.totalPointsWonPct !== undefined) p.push(`TPW ${s.totalPointsWonPct}%`);
  if (s.tiebreakPct !== undefined) p.push(`Tiebreak ${s.tiebreakPct}%`);
  return p.length ? p.join(", ") : "—";
}

export function getHoldValue(p) {
  return p?.serveStats?.holdPct !== undefined ? `${p.serveStats.holdPct}%` : "—";
}

export function getDrValue(p) {
  return p?.overallStats?.dominanceRatio !== undefined ? `${p.overallStats.dominanceRatio}` : "—";
}

export function getTbValue(p) {
  return p?.overallStats?.tiebreakPct !== undefined ? `${p.overallStats.tiebreakPct}%` : "—";
}

export function golfScoreColor(score) {
  const raw = String(score || "").trim().toUpperCase();
  if (!raw || raw === "—") return "var(--text)";
  if (raw === "E") return "var(--text)";
  if (raw.startsWith("-")) return "#00E676";
  if (raw.startsWith("+")) return "#FF6B6B";
  return "var(--text)";
}

export function renderMessage(text) {
  if (!text) return null;

  const clean = String(text)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();

  return clean.split(/\n{2,}/).map((para, i) => {
    const lines = para.split("\n").map((s) => s.trim()).filter(Boolean);
    const allBullets = lines.length > 1 && lines.every((l) => l.startsWith("•") || (l.includes(" — ") && !l.endsWith(".")));

    if (allBullets) {
      return (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
          {lines.map((line, j) => {
            const norm = line.startsWith("•") ? line.slice(1).trim() : line;
            const parts = norm.split("—").map((s) => s.trim());
            const head = parts[0] || "";
            const tail = parts.slice(1).join(" — ");

            return (
              <div key={j} style={{ background: "rgba(8,145,178,.06)", border: "1px solid rgba(8,145,178,.12)", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontWeight: 600, color: "var(--text)", fontSize: 13, marginBottom: tail ? 4 : 0 }}>{head}</div>
                {tail && <div style={{ fontSize: 12, color: "var(--soft)", lineHeight: 1.55 }}>{tail}</div>}
              </div>
            );
          })}
        </div>
      );
    }

    const isLabelBlock = lines.length >= 2 && /^[A-Z][A-Z\s]+:?$/.test(lines[0]);
    if (isLabelBlock) {
      return (
        <div key={i} style={{ marginBottom: 12, padding: "10px 12px", background: "rgba(255,255,255,.02)", border: "1px solid var(--border)", borderRadius: 10 }}>
          <div
            style={{
              fontFamily: "var(--mono-font)",
              fontSize: 10,
              letterSpacing: 1.5,
              color: "var(--muted)",
              marginBottom: 6,
              textTransform: "uppercase",
            }}
          >
            {lines[0].replace(/:$/, "")}
          </div>
          <div style={{ lineHeight: 1.7 }}>
            {lines.slice(1).map((line, j) => (
              <div key={j} style={{ marginBottom: j === lines.slice(1).length - 1 ? 0 : 6 }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (
      i === 0 &&
      lines.length === 1 &&
      lines[0].trimStart().startsWith(">>")
    ) {
      const opener = lines[0].trimStart().replace(/^>>\s*/, "").trim();
      return (
        <div
          key={i}
          style={{
            fontFamily: "var(--display-font, 'Bebas Neue', sans-serif)",
            fontSize: 26,
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: "1px solid rgba(0, 245, 233, 0.15)",
            background: "linear-gradient(90deg, #00F5E9 0%, #FF2D6B 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {opener}
        </div>
      );
    }

    return (
      <div key={i} style={{ lineHeight: 1.7, marginBottom: 10 }}>
        {lines.map((line, j) => (
          <div key={j} style={{ marginBottom: j === lines.length - 1 ? 0 : 6 }}>
            {line}
          </div>
        ))}
      </div>
    );
  });
}

export function LoadingBubble({ sport }) {
  const emoji = sport === "nba" ? "🏀" : sport === "nfl" ? "🏈" : sport === "f1" ? "🏎️" : sport === "tennis" ? "🎾" : sport === "mlb" ? "⚾" : sport === "golf" ? "⛳" : "⚡";
  const isF1 = sport === "f1";
  return (
    <div className="bubble ai loading" style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 44 }}>
      <style>{`
        @keyframes ur-bounce {
          0%,100%{transform:translateX(0) translateY(0);}
          25%{transform:translateX(24px) translateY(-5px);}
          50%{transform:translateX(48px) translateY(0);}
          75%{transform:translateX(24px) translateY(-5px);}
        }
        @keyframes ur-drive {
          0%  {left:0;   transform:scaleX(1);}
          44% {left:52px;transform:scaleX(1);}
          50% {left:52px;transform:scaleX(-1);}
          94% {left:0;   transform:scaleX(-1);}
          100%{left:0;   transform:scaleX(1);}
        }
        .ur-track{position:relative;width:72px;height:28px;flex-shrink:0;}
        .ur-emoji{position:absolute;top:50%;margin-top:-11px;font-size:20px;line-height:1;}
        .ur-emoji.driving{animation:ur-drive 1.4s ease-in-out infinite;}
        .ur-emoji.bouncing{animation:ur-bounce 0.9s ease-in-out infinite;left:0;}
      `}</style>
      <div className="ur-track">
        <span className={`ur-emoji ${isF1 ? "driving" : "bouncing"}`}>{emoji}</span>
      </div>
      <span style={{ fontFamily: "var(--mono-font)", fontSize: 11, letterSpacing: 2, color: "var(--muted)" }}>ANALYZING...</span>
    </div>
  );
}

function UrTakeAiBubble({ m, performanceData }) {
  const [deepOpen, setDeepOpen] = useState(false);
  const tier = m.takeMeta ? normalizeConfidenceTier(m.takeMeta.confidence) : null;
  const tierSnapshots = performanceData ? mergeTierSnapshots(performanceData.byConfidence) : null;
  const histSnap = tier && tierSnapshots ? tierSnapshots[tier] : null;
  const histLine = formatRecordUnits(
    histSnap || { settled: 0, wins: 0, losses: 0, pushes: 0, roiUnits: 0 },
  );
  const last30 = tier && performanceData ? last30DaysTierSnapshot(performanceData, tier) : null;
  const last30Line = formatRecordUnits(
    last30 || { settled: 0, wins: 0, losses: 0, pushes: 0, roiUnits: 0 },
  );
  const label = displayConfidenceLabel(tier, m.takeMeta?.confidence);
  return (
    <>
      {m.image && <img src={m.image} alt="" className="bubble-img" />}
      {m.takeMeta && (
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8, lineHeight: 1.45 }}>
          This is a {label} confidence take. Tier historical record: {histLine}.
        </div>
      )}
      {renderMessage(m.text)}
      {m.deepText ? (
        <div style={{ marginTop: 12 }}>
          {!deepOpen ? (
            <button type="button" className="quick-btn" onClick={() => setDeepOpen(true)} style={{ fontSize: 11 }}>
              See full breakdown
            </button>
          ) : (
            <>
              <div
                style={{
                  fontFamily: "var(--mono-font)",
                  fontSize: 10,
                  letterSpacing: 1.2,
                  color: "var(--muted)",
                  margin: "12px 0 8px",
                  textTransform: "uppercase",
                }}
              >
                Full breakdown
              </div>
              {renderMessage(m.deepText)}
            </>
          )}
        </div>
      ) : null}
      {m.takeMeta && tier ? (
        <div
          style={{
            fontSize: 10,
            color: "var(--muted)",
            marginTop: 10,
            lineHeight: 1.45,
            borderTop: "1px solid var(--border)",
            paddingTop: 8,
          }}
        >
          Last 30 days on this confidence tier: {last30Line}.
        </div>
      ) : null}
    </>
  );
}

export function ChatThread({ msgs }) {
  const perfCtx = useContext(PerformanceContext);
  const performanceData = perfCtx?.performanceData;
  const bottomRef = useRef(null);

  /** Scroll the nearest scrollport (screen main) to the latest bubble — avoids mutating scrollTop (eslint). */
  useLayoutEffect(() => {
    if (!msgs?.length) return;
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
  }, [msgs]);

  if (!msgs || msgs.length === 0) return null;
  return (
    <div className="chat-thread" style={{ marginBottom: 20 }}>
      {msgs.map((m, i) =>
        m.loading ? (
          <LoadingBubble key={i} sport={m.sport} />
        ) : (
          <div key={i} className={`bubble ${m.role}`}>
            {m.role === "ai" && (m.takeMeta || m.deepText) ? (
              <UrTakeAiBubble m={m} performanceData={performanceData} />
            ) : (
              <>
                {m.image && <img src={m.image} alt="" className="bubble-img" />}
                {renderMessage(m.text)}
              </>
            )}
          </div>
        )
      )}
      <div ref={bottomRef} style={{ height: 1, width: "100%", overflow: "hidden" }} aria-hidden />
    </div>
  );
}
