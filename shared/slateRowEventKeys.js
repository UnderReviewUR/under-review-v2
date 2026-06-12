import {
  nbaEventKey,
  mlbEventKey,
  tennisEventKeyFromBoardRow,
  f1EventKey,
  golfSnapshotKey,
  nflSnapshotBoardKey,
  parseAwayHomeFromLabel,
  wcEventKey,
} from "./homeEventDedup.js";
import { getDisplayableF1NextRace } from "./eventValidity.js";
import { normalizeNbaSideToken, normalizeTeamAbbr } from "./nbaTeamAbbrev.js";

function normalizeTeamToken(s) {
  return String(s || "")
    .trim()
    .replace(/\./g, "")
    .toUpperCase();
}

/** Align slate copy tokens with `normalizeNbaSideToken` (abbr vs full city name). */
function normalizeSlateNbaLabelToken(label) {
  const s = String(label || "").trim();
  if (!s) return "";
  if (/\s/.test(s)) {
    return String(normalizeTeamAbbr(s) || "")
      .trim()
      .toUpperCase()
      .replace(/\./g, "");
  }
  return normalizeTeamToken(s);
}

function nbaGameMatchesLabel(g, awayLabel, homeLabel) {
  if (!awayLabel || !homeLabel) return false;
  const a = normalizeNbaSideToken(g?.awayTeam);
  const h = normalizeNbaSideToken(g?.homeTeam);
  const la = normalizeSlateNbaLabelToken(awayLabel);
  const lh = normalizeSlateNbaLabelToken(homeLabel);
  if (a && h && la && lh) {
    return (
      (a.includes(la) || la.includes(a)) &&
      (h.includes(lh) || lh.includes(h))
    );
  }
  return false;
}

function mlbGameMatchesLabel(g, awayLabel, homeLabel) {
  return nbaGameMatchesLabel(g, awayLabel, homeLabel);
}

function tennisRowMatchesLabel(row, label) {
  const l = String(label || "").toLowerCase();
  const p1 = String(row.event_first_player || row.home_team || "").toLowerCase();
  const p2 = String(row.event_second_player || row.away_team || "").toLowerCase();
  if (!p1 || !p2) return false;
  const last1 = p1.split(/\s+/).pop();
  const last2 = p2.split(/\s+/).pop();
  return (
    (l.includes(last1) && l.includes(last2)) || (l.includes(p1.split(" ")[0]) && l.includes(p2.split(" ")[0]))
  );
}

/**
 * Best-effort keys for a Today's Slate row so we can dedupe against Live Snapshot + cards.
 */
export function inferSlateRowEventKeys(row, bundle) {
  if (!row || typeof row !== "object") return [];
  const sport = String(row.sport || "").toLowerCase();
  const keys = [];

  if (sport === "nba" && Array.isArray(bundle?.nba?.todaysGames) && bundle.nba.todaysGames.length) {
    const label = String(row.game || row.event || "");
    const { away, home } = parseAwayHomeFromLabel(label);
    let g =
      bundle.nba.todaysGames.find((x) => nbaGameMatchesLabel(x, away, home)) || null;
    if (!g && bundle.nba.todaysGames.length === 1) g = bundle.nba.todaysGames[0];
    const k = g ? nbaEventKey(g) : null;
    if (k) keys.push(k);
  }

  if (sport === "mlb" && Array.isArray(bundle?.mlb?.games) && bundle.mlb.games.length) {
    const label = String(row.game || row.event || "");
    const { away, home } = parseAwayHomeFromLabel(label);
    let g =
      bundle.mlb.games.find((x) => mlbGameMatchesLabel(x, away, home)) || null;
    if (!g && bundle.mlb.games.length === 1) g = bundle.mlb.games[0];
    const k = g ? mlbEventKey(g) : null;
    if (k) keys.push(k);
  }

  if (sport === "tennis" && Array.isArray(bundle?.tennis) && bundle.tennis.length) {
    const label = String(row.game || row.match || row.event || "");
    let rowData =
      bundle.tennis.find((t) => tennisRowMatchesLabel(t?.raw || t, label)) || null;
    if (!rowData && bundle.tennis.length === 1) rowData = bundle.tennis[0];
    const raw = rowData?.raw || rowData;
    const k = raw ? tennisEventKeyFromBoardRow(raw) : null;
    if (k) keys.push(k);
  }

  if (sport === "f1" && bundle?.f1) {
    const nr = getDisplayableF1NextRace(bundle.f1);
    const k = nr ? f1EventKey(nr) : null;
    if (k) keys.push(k);
  }

  if (sport === "golf" && bundle?.golf) {
    const k = golfSnapshotKey(bundle.golf);
    if (k) keys.push(k);
  }

  if (sport === "nfl") {
    keys.push(nflSnapshotBoardKey());
  }

  if (sport === "worldcup" && Array.isArray(bundle?.worldcup?.matches)) {
    const label = String(row.game || row.match || row.event || "").toLowerCase();
    const hit = bundle.worldcup.matches.find((m) => {
      const home = String(m?.homeTeam || "").toLowerCase();
      const away = String(m?.awayTeam || "").toLowerCase();
      return home && away && label.includes(home) && label.includes(away);
    });
    const k = hit ? wcEventKey(hit) : null;
    if (k) keys.push(k);
  }

  return keys;
}

export function attachSlateRowEventKeys(item, bundle) {
  if (!item || typeof item !== "object") return item;
  const extra = inferSlateRowEventKeys(item, bundle);
  if (!extra.length) return item;
  return { ...item, _eventKeys: extra };
}
