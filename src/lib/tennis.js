// ── Tennis utility functions ─────────────────────────────────────────────────

export function normalizeText(v) {
  return String(v || "").trim().toLowerCase();
}

export function slugify(v) {
  return String(v || "").trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function isNflInSeason() {
  const m = new Date().getMonth();
  return m >= 8 || m <= 1; // Sep–Feb
}

export function isNflRampMode() {
  const m = new Date().getMonth();
  return m >= 6 && m <= 7; // Jul–Aug
}

export function getDaypartLabel() {
  const h = new Date().getHours();
  if (h < 12) return "today";
  if (h < 18) return "this afternoon";
  return "tonight";
}

export function normalizeTennisMatch(match, fallbackTour = "ATP", activeTournament = null) {
  if (!match) return null;

  const league = match.league ||
    (normalizeText(match.league_name).includes("wta") ||
     normalizeText(match.event_type_type).includes("women") ? "WTA" : fallbackTour);

  const home = String(match.home_team || match.event_first_player || "").trim();
  const away = String(match.away_team || match.event_second_player || "").trim();
  if (!home || !away) return null;

  const blocked = new Set(["player 1","player 2","tbd","unknown","n/a","-"]);
  if (blocked.has(home.toLowerCase()) || blocked.has(away.toLowerCase())) return null;
  if (home.toLowerCase() === away.toLowerCase()) return null;

  const tournament = String(match.tournament || match.tournament_name || "").trim();
  if (!tournament) return null;

  const rawLive = String(match.live ?? match.event_live ?? "0");
  const isLive  = rawLive === "1";
  let status    = String(match.status || match.event_status || "Scheduled").trim();
  if (isLive) status = "Live";

  const eventDate    = String(match.event_date || "").trim();
  const eventTime    = String(match.event_time || "").trim();
  const commenceTime = match.commence_time ||
    (eventDate && eventTime ? `${eventDate}T${eventTime}:00` :
     eventDate ? `${eventDate}T00:00:00` : null);

  return {
    id: match.id || match.event_key || `${home}-${away}-${league}-${eventDate || tournament}`,
    league,
    leagueColor: league === "WTA" ? "#E11D48" : "#0891B2",
    title:  `${home} vs ${away}`,
    time:   status,
    network: tournament,
    blurb:  `${home} vs ${away}${match.round ? ` · ${match.round}` : ""}${match.score && match.score !== "-" ? ` · ${match.score}` : ""}`,
    whatMatters: "Ask for the side, total, props, or live angle.",
    quickHitters: ["Best angle here?", "Moneyline or total?", "Any live edge?"],
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
  const keySlug  = slugify(active.key  || "");
  const nameSlug = slugify(active.name || "");
  if (!tournamentSlug) return 0;
  if (nameSlug && tournamentSlug.includes(nameSlug)) return 5;
  if (keySlug  && tournamentSlug.includes(keySlug))  return 5;
  if (nameSlug && nameSlug.includes(tournamentSlug)) return 4;
  if (keySlug  && keySlug.includes(tournamentSlug))  return 4;
  return 0;
}

export function getTournamentFetchParam(context) {
  const active = context?.currentTournament;
  if (!active) return "charleston";
  const candidates = [active.key, active.name, active.location].filter(Boolean);
  return candidates.map(v => slugify(v)).join(",") || "charleston";
}

export function formatServeStats(s) {
  if (!s) return "—";
  const p = [];
  if (s.holdPct !== undefined) p.push(`Hold ${s.holdPct}%`);
  if (s.acePct  !== undefined) p.push(`Ace ${s.acePct}%`);
  if (s.dfPct   !== undefined) p.push(`DF ${s.dfPct}%`);
  return p.length ? p.join(", ") : "—";
}

export function formatReturnStats(s) {
  if (!s) return "—";
  const p = [];
  if (s.rpwPct   !== undefined) p.push(`RPW ${s.rpwPct}%`);
  if (s.breakPct !== undefined) p.push(`Break ${s.breakPct}%`);
  return p.length ? p.join(", ") : "—";
}

export function formatOverallStats(s) {
  if (!s) return "—";
  const p = [];
  if (s.dominanceRatio    !== undefined) p.push(`DR ${s.dominanceRatio}`);
  if (s.totalPointsWonPct !== undefined) p.push(`TPW ${s.totalPointsWonPct}%`);
  if (s.tiebreakPct       !== undefined) p.push(`Tiebreak ${s.tiebreakPct}%`);
  return p.length ? p.join(", ") : "—";
}

export function getHoldValue(p) { return p?.serveStats?.holdPct   !== undefined ? `${p.serveStats.holdPct}%`          : "—"; }
export function getDrValue(p)   { return p?.overallStats?.dominanceRatio !== undefined ? `${p.overallStats.dominanceRatio}` : "—"; }
export function getTbValue(p)   { return p?.overallStats?.tiebreakPct    !== undefined ? `${p.overallStats.tiebreakPct}%`  : "—"; }
