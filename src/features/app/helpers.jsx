import { useEffect } from "react";

export function normalizeText(v) {
  return String(v || "").trim().toLowerCase();
}

export function slugify(v) {
  return String(v || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function isNflInSeason() {
  const m = new Date().getMonth();
  return m >= 8 || m <= 1;
}

export function isNflRampMode() {
  const m = new Date().getMonth();
  return m >= 6 && m <= 7;
}

export function normalizeTennisMatch(match, fallbackTour = "ATP", activeTournament = null) {
  if (!match) return null;

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
  const isLive = rawLive === "1";
  let status = String(match.status || match.event_status || "Scheduled").trim();
  if (isLive) status = "Live";

  const eventDate = String(match.event_date || "").trim();
  const eventTime = String(match.event_time || "").trim();
  const commenceTime = match.commence_time || (eventDate && eventTime ? `${eventDate}T${eventTime}:00` : eventDate ? `${eventDate}T00:00:00` : null);

  const surf = String(match.bdl_tournament_surface || "").trim();
  const staticWta =
    String(match.source || "").includes("ur_static_wta") ||
    !!match.ur_static_snapshot ||
    String(match.source || "").includes("client_db_snapshot");

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
    raw: { ...match, live: rawLive, status, home, away, tournament, event_date: eventDate, event_time: eventTime },
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

/**
 * When /api/tennis is unreachable or returns nothing, build matchup cards from the
 * same player JSON the app already loaded — keeps the board populated (local dev + outages).
 */
export function buildFallbackTennisMatches(playersPayload, activeContext = null) {
  if (!playersPayload || typeof playersPayload !== "object") return [];

  const tournamentName = activeContext?.currentTournament?.name || "Tour";
  const surface = String(activeContext?.currentTournament?.surface || "").trim();
  const isoDay = new Date().toISOString().slice(0, 10);
  const isoCommence = `${isoDay}T17:00:00`;

  const cards = [];

  const addPairs = (merged, fallbackTour, leagueName, eventType) => {
    if (!merged || typeof merged !== "object") return;
    const ranked = Object.entries(merged)
      .map(([name, row]) => ({ name, rank: Number(row?.eloRank), row }))
      .filter((x) => Number.isFinite(x.rank))
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 16);

    for (let i = 0; i + 1 < ranked.length && cards.length < 14; i += 2) {
      const row = normalizeTennisMatch(
        {
          id: `db-${fallbackTour}-${slugify(ranked[i].name)}-${slugify(ranked[i + 1].name)}`,
          home_team: ranked[i].name,
          away_team: ranked[i + 1].name,
          tournament: tournamentName,
          round: "Database snapshot · live feed unavailable",
          event_date: isoDay,
          event_time: "17:00",
          event_status: "scheduled",
          live: "0",
          league_name: leagueName,
          event_type_type: eventType,
          score: "-",
          commence_time: isoCommence,
          source: "client_db_snapshot",
          ur_static_snapshot: true,
          bdl_tournament_surface: surface,
        },
        fallbackTour,
        activeContext,
      );
      if (row) cards.push(row);
    }
  };

  addPairs(playersPayload.atp, "ATP", "ATP", "ATP Singles");
  addPairs(playersPayload.wta, "WTA", "WTA", "WTA Singles");

  cards.sort((a, b) => {
    const aLive = String(a?.raw?.live || "0") === "1" ? 1 : 0;
    const bLive = String(b?.raw?.live || "0") === "1" ? 1 : 0;
    if (aLive !== bLive) return bLive - aLive;
    const aPref = preferredTournamentScore(a, activeContext);
    const bPref = preferredTournamentScore(b, activeContext);
    if (aPref !== bPref) return bPref - aPref;
    const aTime = Number.isFinite(a.commenceTs) ? a.commenceTs : Number.MAX_SAFE_INTEGER;
    const bTime = Number.isFinite(b.commenceTs) ? b.commenceTs : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });

  return cards;
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

export function ChatThread({ msgs, scrollContainerRef }) {
  useEffect(() => {
    if (!msgs?.length) return;
    const t = setTimeout(() => {
      const el = scrollContainerRef?.current;
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
    return () => clearTimeout(t);
  }, [msgs, scrollContainerRef]);

  if (!msgs || msgs.length === 0) return null;
  return (
    <div className="chat-thread" style={{ marginBottom: 20 }}>
      {msgs.map((m, i) =>
        m.loading ? (
          <LoadingBubble key={i} sport={m.sport} />
        ) : (
          <div key={i} className={`bubble ${m.role}`}>
            {m.image && <img src={m.image} alt="" className="bubble-img" />}
            {renderMessage(m.text)}
          </div>
        )
      )}
    </div>
  );
}
