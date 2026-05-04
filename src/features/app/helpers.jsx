import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { normalizeText } from "../../lib/normalizeText.js";
import { extractUrTakeSectionHeading, isUrTakeSectionHeading } from "../../lib/urTakeSectionHeadings.js";
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

/** BallDontLie ATP and Odds API fallback rows — never empty the board when either feed has matchups. */
export function isConfirmedAtpBoardFixture(row) {
  if (!row || typeof row !== "object") return false;
  const src = String(row.source || "").trim();
  if (src === "balldontlie_atp") return isBallDontLieAtpFixture(row);
  if (src === "odds_atp") {
    const roundStr = String(row.round || "");
    if (roundStr.includes("Database snapshot")) return false;
    const oid = row.odds_event_id ?? row.id;
    if (oid == null || oid === "") return false;
    const sid = String(oid).trim();
    if (sid.startsWith("db-")) return false;
    const home = String(row.home_team || row.event_first_player || "").trim();
    const away = String(row.away_team || row.event_second_player || "").trim();
    return !!(home && away);
  }
  return false;
}

/** One line for Home ATP spotlight list: matchup · surface · round · start (when known). */
export function formatAtpHomeSpotlightLine(match) {
  if (!match || typeof match !== "object") return "";
  const vs = String(match.title || "").trim();
  const surf = String(match.raw?.bdl_tournament_surface || "").trim();
  const round = String(match.raw?.round || "").trim();
  const ct = match.commenceTime || match.raw?.commence_iso || match.raw?.bdl_scheduled_time;
  let timePart = "";
  if (ct) {
    const d = new Date(ct);
    if (!Number.isNaN(d.getTime())) {
      timePart = d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      });
    }
  }
  const parts = [vs];
  if (surf) parts.push(surf);
  if (round) parts.push(round);
  if (timePart) parts.push(timePart);
  return parts.join(" · ");
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

  if (fallbackTour === "ATP" && !isConfirmedAtpBoardFixture(match)) return null;

  const league = match.league || (normalizeText(match.league_name).includes("wta") || normalizeText(match.event_type_type).includes("women") ? "WTA" : fallbackTour);
  const home = String(match.home_team || match.event_first_player || "").trim();
  const away = String(match.away_team || match.event_second_player || "").trim();
  if (!home || !away) return null;

  const blocked = new Set(["player 1", "player 2", "tbd", "unknown", "n/a", "-"]);
  if (blocked.has(home.toLowerCase()) || blocked.has(away.toLowerCase())) return null;
  if (home.toLowerCase() === away.toLowerCase()) return null;

  const tournament = String(match.tournament || match.tournament_name || "").trim() || "ATP Tour";

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

/** Display-time only: aligns first visible line with take.trust chips (same patterns as chatHistoryForApi). */
export function stripLeadingUrTakeDisclaimersForDisplay(raw) {
  return String(raw || "")
    .replace(/^This is a .*? confidence take\.[^\n]*\n+/i, "")
    .replace(/^This is a .*? confidence take\.[^\n]*$/im, "")
    .replace(/^WRONG SPORT\.[^\n]*\n+/im, "")
    .replace(/^I'm locked into [^\n]*\n+/im, "")
    .replace(/^For tennis prop analysis[^\n]*\n+/im, "")
    .replace(/^What NBA game or player props[^\n]*\n+/im, "")
    .trimStart();
}

/** ── UR Take AI bubble visual formatting (presentation only; text unchanged) ── */

function peelGameStateHeaderLine(text) {
  const trimmed = text.trimStart();
  const nl = trimmed.indexOf("\n");
  const firstLine = nl >= 0 ? trimmed.slice(0, nl).trim() : trimmed.trim();
  if (!firstLine) return { header: null, rest: text };
  const scoreLike = /^[A-Z]{2,4}\s+\d+/i.test(firstLine);
  const hasDot = firstLine.includes("·");
  const hasQuarterOrLive =
    /\bQ\d\b/i.test(firstLine) || /\bLive\b/i.test(firstLine) || /\bOT\b/i.test(firstLine);
  if (scoreLike && (hasDot || hasQuarterOrLive)) {
    const rest = nl >= 0 ? trimmed.slice(nl + 1) : "";
    return { header: firstLine, rest: rest.trimStart() };
  }
  return { header: null, rest: text };
}

function peelConfidenceLine(text) {
  const lines = text.split("\n");
  if (lines.length === 0) return { rest: text, confidence: null };
  const last = lines[lines.length - 1].trim();
  if (/^Confidence\s*:/i.test(last)) {
    return {
      rest: lines.slice(0, -1).join("\n").trimEnd(),
      confidence: last.trim(),
    };
  }
  if (/^(Medium|High|Low)\s+confidence\b/i.test(last)) {
    return {
      rest: lines.slice(0, -1).join("\n").trimEnd(),
      confidence: last.trim(),
    };
  }
  return { rest: text, confidence: null };
}

/** Single full line that reads as an explicit closing / verdict (scanned from bottom). */
function lineMatchesExplicitClosing(line) {
  const L = line.trim();
  if (!L) return false;
  if (/^(Look for|Back|Fade|Take the)\b/i.test(L)) return true;
  if (/\bis the play\b/i.test(L)) return true;
  if (/\b(lean over|lean under)\b/i.test(L) && L.length < 220) return true;
  if (/^\s*(?:the\s+)?(?:over|under)\s+[\d.]+\b/i.test(L)) return true;
  if (
    /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/.test(L) &&
    /\d+(?:\.\d+)?/.test(L) &&
    /\b(over|under|points?|rebounds?|PRA)\b/i.test(L)
  ) {
    return true;
  }
  return false;
}

function splitLastSentence(block) {
  const t = block.trim();
  if (!t) return { body: "", last: "" };
  for (let i = t.length - 1; i > 0; i--) {
    const c = t[i];
    if (c === "." || c === "!" || c === "?") {
      if (c === "." && /\d/.test(t[i - 1])) {
        const nextCh = t[i + 1];
        if (nextCh && /\d/.test(nextCh)) continue;
      }
      const before = t.slice(0, i).trimEnd();
      if (!before) continue;
      return { body: before, last: t.slice(i).trim() };
    }
  }
  return { body: "", last: t };
}

/**
 * Pull closing call from main narrative (after confidence peel, before Live trigger was split out).
 * Explicit patterns first; otherwise last sentence as verdict hero (two+ sentences only).
 */
function peelClosingFromMain(mainChunk) {
  const lines = mainChunk.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    if (lineMatchesExplicitClosing(line)) {
      const rest = [...lines.slice(0, i), ...lines.slice(i + 1)].join("\n").trimEnd();
      return { rest, closing: line };
    }
  }

  const { body, last } = splitLastSentence(mainChunk);
  if (!last || !body.trim()) {
    return { rest: mainChunk, closing: null };
  }
  return { rest: body.trimEnd(), closing: last.trim() };
}

function peelLiveTriggerSection(text) {
  const m = text.match(/\bLive trigger\b\s*:?\s*/i);
  if (!m || m.index === undefined) return { main: text, trigger: null };
  const main = text.slice(0, m.index).trimEnd();
  const trigger = text.slice(m.index + m[0].length).trim();
  return { main, trigger: trigger || null };
}

/** Prompt syntax; stripped before the headline is shown (never visible). */
function stripLeadingUrTakeHeadlineChevrons(text) {
  let t = String(text || "").trimStart();
  while (/^(?:>\s*){2}/.test(t)) {
    t = t.replace(/^(?:>\s*){2}\s*/, "");
  }
  return t.trim();
}

function splitFirstSentenceHeadline(block) {
  const t = block.trim();
  if (!t) return { first: "", rest: "" };
  for (let i = 1; i < t.length; i++) {
    const c = t[i];
    if (c === "." || c === "!" || c === "?") {
      if (c === "." && /\d/.test(t[i - 1])) {
        const nextCh = t[i + 1];
        if (nextCh && /\d/.test(nextCh)) continue;
      }
      const after = t.slice(i + 1).trimStart();
      if (!after || /^[A-Z"(“]/.test(after)) {
        return { first: t.slice(0, i + 1).trim(), rest: after };
      }
    }
  }
  const nl = t.indexOf("\n");
  if (nl > 0) return { first: t.slice(0, nl).trim(), rest: t.slice(nl + 1).trim() };
  return { first: t, rest: "" };
}

const STAT_HIGHLIGHT_RE =
  /(\d+(?:\.\d+)?)\s+(boards?|rebounds?|points?|assists?|PF|minutes?|PPG|APG|RPG)\b/gi;

const UR_STAT_HIGHLIGHT_PATTERN_LIST = [
  /\d+(?:\.\d+)?\s*(?:pts|reb|ast)(?:\s*\/\s*\d+(?:\.\d+)?\s*(?:pts|reb|ast))+/gi,
  /\(\s*\d+(?:\.\d+)?\s*PRA\s*\)/gi,
  STAT_HIGHLIGHT_RE,
  /\b\d+(?:\.\d+)?\s*(?:pts|reb|ast)\b/gi,
];

function pickNonOverlappingStatRanges(ranges) {
  const byLen = [...ranges].sort((a, b) => b.end - b.start - (a.end - a.start));
  const picked = [];
  for (const r of byLen) {
    if (picked.some((p) => r.start < p.end && r.end > p.start)) continue;
    picked.push(r);
  }
  return picked.sort((a, b) => a.start - b.start);
}

function highlightStatsInText(text) {
  const s = String(text);
  const ranges = [];
  for (const re of UR_STAT_HIGHLIGHT_PATTERN_LIST) {
    const r = new RegExp(re.source, re.flags);
    let m;
    while ((m = r.exec(s)) !== null) {
      ranges.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
    }
  }
  const picked = pickNonOverlappingStatRanges(ranges);
  const out = [];
  let last = 0;
  for (const span of picked) {
    out.push(s.slice(last, span.start));
    out.push(
      <span
        key={`ur-stat-${span.start}-${span.end}`}
        style={{ color: "var(--cyan-bright)", fontWeight: 600 }}
      >
        {span.text}
      </span>,
    );
    last = span.end;
  }
  out.push(s.slice(last));
  return out;
}

function stripMarkdownForUrTakeDisplay(text) {
  return String(text || "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1");
}

/** All-caps short section labels (e.g. WHAT TO WATCH); excludes stats lines with digits (H2H allowed). */
function isUrTakeAllCapsSectionLine(line) {
  const s = String(line).trim();
  if (!s || s.length >= 40) return false;
  if (/\d/.test(s.replace(/\bH2H\b/gi, ""))) return false;
  const letters = s.replace(/[^A-Za-z]/g, "");
  if (letters.length < 2) return false;
  return letters === letters.toUpperCase();
}

const UR_TAKE_BODY_MUTED = "rgba(255,255,255,0.75)";

const UR_TAKE_SECTION_LABEL_STYLE = {
  fontFamily: "var(--mono-font)",
  fontSize: 9,
  letterSpacing: 3,
  color: "var(--cyan-bright)",
  textTransform: "uppercase",
  marginTop: 18,
  marginBottom: 6,
  opacity: 0.7,
};

function parseUrTakeVisualParts(raw) {
  let text = stripMarkdownForUrTakeDisplay(stripLeadingUrTakeDisclaimersForDisplay(String(raw || "")));
  const game = peelGameStateHeaderLine(text);
  text = game.rest;

  let confidence = null;
  ({ rest: text, confidence } = peelConfidenceLine(text));

  let liveTrigger = null;
  ({ main: text, trigger: liveTrigger } = peelLiveTriggerSection(text));

  let closing = null;
  ({ rest: text, closing } = peelClosingFromMain(text));

  return {
    gameHeader: game.header,
    mainText: text.trim(),
    liveTrigger,
    closing,
    confidence,
  };
}

/**
 * Rich UR Take presentation: score header, headline sentence, stat highlights,
 * live trigger + closing cards, muted confidence. Same string content as input.
 */
export function renderUrTakeAiMessage(raw) {
  const parts = parseUrTakeVisualParts(raw);
  const nodes = [];

  if (parts.gameHeader) {
    nodes.push(
      <div
        key="ur-game-hdr"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "var(--mono-font)",
          fontSize: 11,
          color: "var(--cyan-bright)",
          letterSpacing: 1.5,
          textTransform: "uppercase",
          marginBottom: 12,
          paddingBottom: 10,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#22c55e",
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        {parts.gameHeader}
      </div>,
    );
  }

  const main = parts.mainText;
  if (main) {
    const { first, rest } = splitFirstSentenceHeadline(main);
    const headlineText = stripLeadingUrTakeHeadlineChevrons(first);
    if (headlineText) {
      nodes.push(
        <p
          key="ur-headline"
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "var(--text)",
            lineHeight: 1.4,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            paddingBottom: 14,
            marginBottom: 16,
          }}
        >
          {highlightStatsInText(headlineText)}
        </p>,
      );
    }
    if (rest) {
      rest.split(/\n{2,}/).forEach((para, i) => {
        const oddPara = i % 2 === 1;
        nodes.push(
          <div
            key={`ur-body-${i}`}
            style={{
              fontSize: 13,
              fontWeight: 400,
              color: UR_TAKE_BODY_MUTED,
              lineHeight: 1.65,
              marginBottom: 10,
              ...(oddPara
                ? {
                    background: "rgba(255,255,255,0.02)",
                    borderRadius: 6,
                    padding: "8px 10px",
                    margin: "4px -10px",
                    marginBottom: 10,
                  }
                : { background: "transparent" }),
            }}
          >
            {para.split("\n").map((line, j, arr) => {
              if (isUrTakeAllCapsSectionLine(line)) {
                const firstSection =
                  Boolean(headlineText) && i === 0 && j === 0;
                return (
                  <div
                    key={j}
                    style={{
                      ...UR_TAKE_SECTION_LABEL_STYLE,
                      marginTop: firstSection ? 8 : 18,
                    }}
                  >
                    {line.trim()}
                  </div>
                );
              }
              return (
                <div
                  key={j}
                  style={{ marginBottom: j === arr.length - 1 ? 0 : 6 }}
                >
                  {highlightStatsInText(line)}
                </div>
              );
            })}
          </div>,
        );
      });
    }
  }

  if (parts.liveTrigger) {
    nodes.push(
      <div
        key="ur-lt"
        style={{
          margin: "14px 0",
          padding: "10px 14px",
          background: "rgba(0,245,233,0.06)",
          borderLeft: "2px solid var(--cyan-bright)",
          borderRadius: "0 8px 8px 0",
          fontSize: 13,
          lineHeight: 1.5,
          color: "var(--text)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--mono-font)",
            fontSize: 9,
            color: "var(--cyan-bright)",
            letterSpacing: 2,
            textTransform: "uppercase",
            display: "block",
            marginBottom: 4,
          }}
        >
          Live Trigger
        </span>
        <div>{highlightStatsInText(parts.liveTrigger)}</div>
      </div>,
    );
  }

  if (parts.closing) {
    nodes.push(
      <div
        key="ur-close"
        style={{
          marginTop: 16,
          paddingLeft: 12,
          borderLeft: "2px solid var(--magenta, #FF2D6B)",
          fontSize: 14,
          fontWeight: 600,
          color: "var(--text)",
          lineHeight: 1.5,
        }}
      >
        {parts.closing}
      </div>,
    );
  }

  if (parts.confidence) {
    nodes.push(
      <p
        key="ur-conf"
        style={{
          fontSize: 11,
          color: "var(--muted)",
          fontFamily: "var(--body-font)",
          letterSpacing: 0.3,
          marginTop: 8,
        }}
      >
        {parts.confidence}
      </p>,
    );
  }

  if (nodes.length === 0) {
    return renderMessage(String(raw || ""), { styleUrTakeSectionLabels: true });
  }

  return <>{nodes}</>;
}

/** Same gradient fill as the main `>>` headline — reuse for UR Take section labels only. */
const UR_TAKE_HEADLINE_GRADIENT_STYLE = {
  background: "linear-gradient(90deg, #00F5E9 0%, #FF2D6B 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const UR_TAKE_SECTION_HEADING_STYLE = {
  fontFamily: "var(--display-font, 'Bebas Neue', sans-serif)",
  fontSize: 15,
  fontWeight: 700,
  lineHeight: 1.2,
  letterSpacing: "0.5px",
  textTransform: "uppercase",
  marginBottom: 6,
  ...UR_TAKE_HEADLINE_GRADIENT_STYLE,
};

/**
 * @param {{ styleUrTakeSectionLabels?: boolean }} [opts] — when true (UR Take AI bubbles), recognized section labels use the headline gradient.
 */
export function renderMessage(text, opts = {}) {
  if (!text) return null;

  const applySectionGradients = opts.styleUrTakeSectionLabels === true;

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

            const headStyle =
              applySectionGradients && isUrTakeSectionHeading(head)
                ? UR_TAKE_SECTION_HEADING_STYLE
                : { fontWeight: 600, color: "var(--text)", fontSize: 13, marginBottom: tail ? 4 : 0 };

            return (
              <div key={j} style={{ background: "rgba(8,145,178,.06)", border: "1px solid rgba(8,145,178,.12)", borderRadius: 10, padding: "10px 12px" }}>
                <div style={headStyle}>{head}</div>
                {tail && <div style={{ fontSize: 12, color: "var(--soft)", lineHeight: 1.55 }}>{tail}</div>}
              </div>
            );
          })}
        </div>
      );
    }

    const isLabelBlock = lines.length >= 2 && /^[A-Z][A-Z\s]+:?$/.test(lines[0]);
    if (isLabelBlock) {
      const labelKey = lines[0].replace(/:$/, "");
      const labelStyle =
        applySectionGradients && isUrTakeSectionHeading(labelKey)
        ? UR_TAKE_SECTION_HEADING_STYLE
        : {
            fontFamily: "var(--mono-font)",
            fontSize: 10,
            letterSpacing: 1.5,
            color: "var(--muted)",
            marginBottom: 6,
            textTransform: "uppercase",
          };

      return (
        <div key={i} style={{ marginBottom: 12, padding: "10px 12px", background: "rgba(255,255,255,.02)", border: "1px solid var(--border)", borderRadius: 10 }}>
          <div style={labelStyle}>{labelKey}</div>
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
            ...UR_TAKE_HEADLINE_GRADIENT_STYLE,
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
            {(() => {
              if (!applySectionGradients) return line;

              if (isUrTakeSectionHeading(line)) {
                return <div style={UR_TAKE_SECTION_HEADING_STYLE}>{line.replace(/:$/, "")}</div>;
              }

              const extracted = extractUrTakeSectionHeading(line);
              if (extracted) {
                return (
                  <div>
                    <span style={UR_TAKE_SECTION_HEADING_STYLE}>{extracted.label}</span>
                    <span style={{ color: "var(--soft)", fontSize: "inherit" }}>
                      {" — "}
                      {extracted.body}
                    </span>
                  </div>
                );
              }

              return line;
            })()}
          </div>
        ))}
      </div>
    );
  });
}

const SPORT_ACCENT = {
  nba: "#FF6B00",
  mlb: "#1DB954",
  nfl: "#4A90D9",
  f1: "#E10600",
  tennis: "#FFE600",
  golf: "#FFFFFF",
};

const SPORT_EMOJI = {
  nba: "🏀",
  nfl: "🏈",
  f1: "🏎️",
  tennis: "🎾",
  mlb: "⚾",
  golf: "⛳",
};

const LOADING_STAGES = [
  { atMs: 0, label: "Reading the board" },
  { atMs: 4000, label: "Running the matchup" },
  { atMs: 10000, label: "Sharpening the take" },
];

function resolveStageIndex(elapsedMs) {
  let idx = 0;
  for (let i = 0; i < LOADING_STAGES.length; i += 1) {
    if (elapsedMs >= LOADING_STAGES[i].atMs) idx = i;
  }
  return idx;
}

export function LoadingBubble({ sport }) {
  const sportKey = String(sport || "").toLowerCase();
  const accent = SPORT_ACCENT[sportKey] || "#FFFFFF";
  const emoji = SPORT_EMOJI[sportKey] || "⚡";
  const isF1 = sportKey === "f1";

  const [stage, setStage] = useState(0);
  useEffect(() => {
    const startedAt = Date.now();
    const tick = () => setStage(resolveStageIndex(Date.now() - startedAt));
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, []);

  const accentRgba = (alpha) => `${accent}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;

  return (
    <div
      className="bubble ai loading"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: 64,
        borderColor: accentRgba(0.28),
      }}
      aria-live="polite"
      aria-busy="true"
    >
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
        @keyframes ur-skel-shimmer {
          0%   {background-position: -180px 0;}
          100% {background-position: 220px 0;}
        }
        .ur-track{position:relative;width:72px;height:28px;flex-shrink:0;}
        .ur-emoji{position:absolute;top:50%;margin-top:-11px;font-size:20px;line-height:1;}
        .ur-emoji.driving{animation:ur-drive 1.4s ease-in-out infinite;}
        .ur-emoji.bouncing{animation:ur-bounce 0.9s ease-in-out infinite;left:0;}
        .ur-stage-row{display:flex;align-items:center;gap:12px;}
        .ur-stage-label{font-family:var(--mono-font);font-size:11px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;}
        .ur-stage-dots{display:inline-flex;gap:4px;margin-left:6px;}
        .ur-stage-dot{width:5px;height:5px;border-radius:999px;background:var(--border-2);}
        .ur-stage-dot.active{background:currentColor;}
        .ur-skeleton{height:8px;border-radius:6px;background:linear-gradient(90deg, var(--surface) 0%, var(--border) 50%, var(--surface) 100%);background-size:240px 100%;animation:ur-skel-shimmer 1.4s linear infinite;}
      `}</style>
      <div className="ur-stage-row">
        <div className="ur-track">
          <span className={`ur-emoji ${isF1 ? "driving" : "bouncing"}`}>{emoji}</span>
        </div>
        <span className="ur-stage-label" style={{ color: accent }}>
          {LOADING_STAGES[stage].label}
          <span className="ur-stage-dots" aria-hidden="true">
            {LOADING_STAGES.map((_, i) => (
              <span
                key={i}
                className={`ur-stage-dot${i <= stage ? " active" : ""}`}
                style={i <= stage ? { color: accent } : undefined}
              />
            ))}
          </span>
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div className="ur-skeleton" style={{ width: "92%" }} />
        <div className="ur-skeleton" style={{ width: "78%" }} />
        <div className="ur-skeleton" style={{ width: "60%" }} />
      </div>
    </div>
  );
}

function UrTakeTrustChips({ trust }) {
  if (!trust || typeof trust !== "object") return null;
  const show = trust.tier !== "standard" || trust.contextQuality === "low";
  if (!show) return null;

  const chipStyle = {
    fontFamily: "var(--mono-font)",
    fontSize: 10,
    letterSpacing: 0.5,
    color: "var(--muted)",
    border: "1px solid var(--border-2)",
    borderRadius: 8,
    padding: "4px 8px",
    lineHeight: 1.25,
  };

  const items = [`CTX·${trust.contextQuality}`];
  if (trust.sparseQuestion) items.push("Sparse Q");
  if (trust.thinEvidence) items.push("Thin evidence");

  return (
    <div
      role="group"
      aria-label="Take trust metadata"
      style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}
    >
      {items.map((label) => (
        <span key={label} style={chipStyle}>
          {label}
        </span>
      ))}
    </div>
  );
}

function UrTakeAiBubble({ m, trackPlay }) {
  const [deepOpen, setDeepOpen] = useState(false);
  const summaryText = stripLeadingUrTakeDisclaimersForDisplay(m.text);
  const combined = `${summaryText}\n${m.deepText || ""}`;
  const hasThePlay = /\bTHE\s+PLAY\b/i.test(combined);
  const tracked =
    Boolean(trackPlay?.trackedIds?.length) &&
    m.msgId &&
    trackPlay.trackedIds.includes(m.msgId);
  const showTrack =
    Boolean(trackPlay?.enabled) && Boolean(m.msgId) && hasThePlay && typeof trackPlay.onTrack === "function";

  return (
    <>
      {m.image && <img src={m.image} alt="" className="bubble-img" />}
      {renderUrTakeAiMessage(summaryText)}
      {m.takeMeta?.trust ? <UrTakeTrustChips trust={m.takeMeta.trust} /> : null}
      {showTrack ? (
        <button
          type="button"
          onClick={() => {
            if (!tracked) trackPlay.onTrack(m);
          }}
          disabled={tracked}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "1px solid rgba(0,245,233,0.2)",
            borderRadius: 6,
            padding: "5px 10px",
            cursor: tracked ? "default" : "pointer",
            marginTop: 8,
            fontFamily: "var(--mono-font)",
            fontSize: 9,
            letterSpacing: 1.5,
            color: tracked ? "rgba(0,245,233,0.35)" : "rgba(0,245,233,0.6)",
            textTransform: "uppercase",
          }}
        >
          {tracked ? "✓ Tracked" : "📌 Track this play"}
        </button>
      ) : null}
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
              {renderUrTakeAiMessage(stripLeadingUrTakeDisclaimersForDisplay(m.deepText))}
            </>
          )}
        </div>
      ) : null}
    </>
  );
}

export function ChatThread({ msgs, urTakeTrackPlay = null }) {
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
          <div key={m.msgId || i} className={`bubble ${m.role}`}>
            {m.role === "ai" ? (
              <UrTakeAiBubble m={m} trackPlay={urTakeTrackPlay} />
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
