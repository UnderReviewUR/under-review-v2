import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { FREE_QUESTION_LIMIT } from "../../lib/freeTierLimits.js";
import { normalizeText } from "../../lib/normalizeText.js";
import { extractUrTakeSectionHeading, isUrTakeSectionHeading } from "../../lib/urTakeSectionHeadings.js";
import { isSubstantiveClosing } from "../../lib/urTakeClosingSentence.js";
import {
  splitSentencesForUrTakeDisplay,
  takeFirstSentenceSpan,
} from "../../lib/urTakeSentenceBoundaries.js";
import URTakeResponse from "../../components/URTakeResponse.jsx";
import UrTakeShareButton from "../../components/UrTakeShareButton.jsx";
export { normalizeText };
export { isSubstantiveClosing };

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

/** Maps parsed confidence text to shared `.ur-conf-pill-*` tier classes in appBaseCss. */
function urTakeConfidenceTierFromParsedLine(line) {
  const s = String(line || "").toLowerCase();
  if (/high/.test(s)) return "High";
  if (/medium/.test(s)) return "Medium";
  if (/speculative/.test(s)) return "Speculative";
  return "Speculative";
}

function urTakeConfidencePillClass(tier) {
  const t = String(tier || "");
  if (t === "High") return "ur-conf-pill-high";
  if (t === "Medium") return "ur-conf-pill-medium";
  if (t === "Speculative") return "ur-conf-pill-speculative";
  return "ur-conf-pill-speculative";
}

function UrTakePlainTextPickLine({ text }) {
  const raw = String(text || "");
  const rest = raw.replace(/^\s*→\s*/, "");
  const hasArrow = /^\s*→/.test(raw);
  return (
    <div className="ur-pick-row">
      {hasArrow ? (
        <>
          <span className="text-[#6366f1]">→</span>
          {rest ? ` ${rest}` : ""}
        </>
      ) : (
        raw
      )}
    </div>
  );
}

/** Plain-text UR Take visual — Option C card (shared by message renderer + bubble). */
function UrTakePlainTextVisual({
  gameStateLine,
  headlineDisplay,
  bodyChunks,
  closingDisplay,
  confidence,
  compactBubble: _compactBubble,
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const confTier = confidence ? urTakeConfidenceTierFromParsedLine(confidence) : "";
  const confidencePillText = confidence
    ? String(confidence)
        .replace(/^\s*Confidence:\s*/i, "")
        .trim() || confTier
    : "";
  const pillCls = urTakeConfidencePillClass(confTier);

  const gameStateRibbon =
    gameStateLine ? (
      <div className="ur-card-header" style={{ paddingTop: "calc(14px + 4px)" }}>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#4ade80]" />
          <span className="font-mono text-[11px] text-[#4ade80]">{gameStateLine}</span>
        </div>
        <div />
      </div>
    ) : null;

  return (
    <div className="mt-1">
      <div className="ur-card-root">
        <div className="ur-card-accent-bar" />
        {gameStateRibbon}

        {headlineDisplay ? (
          <div
            className={
              mounted ? "ur-card-headline px-5 pt-5 ur-response-headline" : "ur-card-headline px-5 pt-5"
            }
            style={{ opacity: mounted ? undefined : 0 }}
          >
            {headlineDisplay}
          </div>
        ) : null}

        {bodyChunks.length > 0 ? (
          <div className="px-5 pb-1">
            {bodyChunks.map((chunk, i) => {
              const isPick = chunk && typeof chunk === "object" && chunk.type === "pick";
              const isLabel = chunk && typeof chunk === "object" && chunk.type === "label";
              const text =
                typeof chunk === "string"
                  ? chunk
                  : chunk && typeof chunk === "object"
                    ? chunk.text
                    : "";
              if (isLabel) {
                return (
                  <div
                    key={i}
                    className={`ur-labeled-block-label ${i === 0 ? "mt-0" : "mt-4"}`}
                    style={{ opacity: mounted ? undefined : 0 }}
                  >
                    {text}
                  </div>
                );
              }
              if (isPick) {
                return (
                  <div key={i} style={{ opacity: mounted ? undefined : 0 }}>
                    <UrTakePlainTextPickLine text={text} />
                  </div>
                );
              }
              return (
                <div
                  key={i}
                  className={mounted ? "ur-prose-chunk ur-response-chunk" : "ur-prose-chunk"}
                  style={{ opacity: mounted ? undefined : 0 }}
                >
                  {text}
                </div>
              );
            })}
          </div>
        ) : null}

        {closingDisplay ? (
          <div
            className={mounted ? "ur-closing-block mx-5 mt-4 ur-response-closing" : "ur-closing-block mx-5 mt-4"}
            style={{ opacity: mounted ? undefined : 0 }}
          >
            {closingDisplay}
          </div>
        ) : null}

        <div className="ur-card-footer mt-4">
          {confidence ? (
            <span className={pillCls} style={{ maxWidth: "62%" }}>
              {confidencePillText}
            </span>
          ) : (
            <span />
          )}
          <UrTakeShareButton headline={headlineDisplay || ""} bodyChunks={bodyChunks} />
        </div>
      </div>
    </div>
  );
}

/** ── UR Take AI bubble — simple line-based layout ── */

function splitBySentenceCluster(text, targetClusters = 3) {
  const source = String(text || "").trim();
  if (!source) return [""];
  const sentences = splitSentencesForUrTakeDisplay(source);
  if (sentences.length <= 2) return [source];

  const itemsPerCluster = Math.ceil(sentences.length / targetClusters);
  const clusters = [];
  for (let i = 0; i < sentences.length; i += itemsPerCluster) {
    const cluster = sentences
      .slice(i, i + itemsPerCluster)
      .join(" ")
      .trim();
    if (cluster) clusters.push(cluster);
  }
  return clusters.length > 1 ? clusters : [source];
}

function stripUrTakeInlineMarkdown(s) {
  return String(s || "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

/**
 * First line is only the live/final ribbon when it is short (model often emits one long line
 * containing “Live” — that must not become the green pill or it eats the whole answer).
 */
function firstLineIsUrTakeGameRibbon(line) {
  const s = String(line || "").trim();
  if (!s) return false;
  if (s.length > 120) return false;
  return /\b(Q[1-4]|OT|Live|Final)\b/i.test(s);
}

function trimLeadingOrphanDots(text) {
  return String(text || "")
    .replace(/^(?:\s*\.{1,3}\s*\n)+/m, "")
    .replace(/^\s*\.{1,3}\s*$/m, "")
    .trim();
}

/** Inline structural labels emitted by the model — split into styled section headers in the UI. */
const STRUCTURAL_LABELS = [
  "WHAT THE MARKET SEES",
  "THE FRAGILE ASSUMPTION",
  "THE STRUCTURAL EDGE",
  "THE CALL",
  "MARKET READ",
  "WHY NOW",
  "THE EDGE",
  "CAVEATS",
  "PARLAY LEGS",
];

const STRUCTURAL_LABEL_CANONICAL = new Map(
  STRUCTURAL_LABELS.map((l) => [l.replace(/\s+/g, " ").trim().toUpperCase(), l]),
);

function structuralLabelAlternationPattern() {
  return STRUCTURAL_LABELS.map((l) => l.replace(/\s+/g, "\\s+")).join("|");
}

/**
 * Split prose into labeled sections only when a structural label is anchored:
 * start of text, start after a newline, or after sentence-ending . ! ? plus whitespace.
 * Avoids mid-sentence splits like "floor, THE EDGE narrows".
 */
function splitStructuralLabelsInText(text) {
  const t = String(text || "");
  if (!t.trim()) return [];
  const parts = [];
  let lastIndex = 0;
  let m;
  const alt = structuralLabelAlternationPattern();
  const anchoredRe = new RegExp(`(?:^|[\\r\\n]+|[.!?]\\s+)(${alt})`, "gi");
  while ((m = anchoredRe.exec(t)) !== null) {
    const matchStart = m.index;
    const before = t.slice(lastIndex, matchStart).trim();
    if (before) parts.push({ type: "prose", text: before });
    const raw = String(m[1] || "").replace(/\s+/g, " ").trim().toUpperCase();
    const labelText = STRUCTURAL_LABEL_CANONICAL.get(raw) || String(m[1] || "").trim();
    parts.push({ type: "label", text: labelText });
    lastIndex = matchStart + m[0].length;
  }
  const rest = t.slice(lastIndex).trim();
  if (rest) parts.push({ type: "prose", text: rest });
  return parts;
}

function splitStructuralLabelsFromChunks(chunks) {
  const out = [];
  for (const item of chunks) {
    if (!item || typeof item !== "object") continue;
    if (item.type === "pick") {
      out.push(item);
      continue;
    }
    if (item.type === "prose") {
      const pieces = splitStructuralLabelsInText(item.text);
      for (const p of pieces) {
        if (p.text && String(p.text).trim()) out.push(p);
      }
      continue;
    }
  }
  return out;
}

/** Split lines beginning with → into separate pick rows (never merged into prose). */
function splitArrowPickLinesFromChunks(chunks) {
  const out = [];
  for (const chunk of chunks) {
    const raw = String(chunk || "").trim();
    if (!raw) continue;
    const lines = raw.split("\n");
    let proseLines = [];
    const flushProse = () => {
      if (!proseLines.length) return;
      const text = proseLines.join("\n").trim();
      proseLines = [];
      if (text) out.push({ type: "prose", text });
    };
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("→")) {
        flushProse();
        out.push({ type: "pick", text: trimmed });
      } else {
        proseLines.push(line);
      }
    }
    flushProse();
  }
  return out;
}

/**
 * Parsed UR Take prose (same rules as the visual card).
 * @returns {{ gameState: string, headline: string, bodyChunks: Array<string | { type: 'prose' | 'pick' | 'label', text: string }>, closing: string, confidence: string, hasVisual: boolean }}
 */
export function parseUrTakeResponse(raw) {
  const text = String(raw || "");
  const lines = text.split("\n");

  let gameState = "";
  let bodyStart = 0;
  if (lines[0] && firstLineIsUrTakeGameRibbon(lines[0])) {
    gameState = lines[0].trim();
    bodyStart = 1;
  }

  const remaining = lines.slice(bodyStart).join("\n");
  const { first: headline, rest: bodyAfterHeadline } = takeFirstSentenceSpan(remaining);
  let bodyText = trimLeadingOrphanDots(bodyAfterHeadline);

  let confidence = "";
  const lastLine = lines.length > 0 ? lines[lines.length - 1].trim() : "";
  if (/^Confidence:/.test(lastLine)) {
    confidence = lines[lines.length - 1];
  }

  const textForClosingScan = confidence ? lines.slice(0, -1).join("\n") : text;
  const allSentences = textForClosingScan.match(/[^.!?]+[.!?]+/g) || [];
  const lastSentence = allSentences[allSentences.length - 1]?.trim() ?? "";

  let closing = "";
  if (lastSentence && lastSentence.length < 120) {
    const headlineNorm = headline
      ? stripUrTakeInlineMarkdown(String(headline).replace(/^>>\s*/, "").replace(/\*\*/g, "")).trim()
      : "";
    const lastNorm = stripUrTakeInlineMarkdown(lastSentence).trim();
    if (lastNorm !== headlineNorm) {
      closing = lastSentence;
      bodyText = bodyText.replace(lastSentence, "").trim();
    }
  }
  if (closing) {
    closing = closing.replace(/\*\*/g, "").trim();
    closing = closing.replace(/^\d+\)\s*[-–]\s*/, "").trim();
    const cl = closing.trim();
    bodyText = bodyText.split("\n").filter((ln) => ln.trim() !== cl).join("\n").trim();
  }
  if (confidence) {
    const cf = confidence.trim();
    bodyText = bodyText.split("\n").filter((ln) => ln.trim() !== cf).join("\n").trim();
  }

  const paras = bodyText.split(/\n{2,}/);
  let bodyChunks = paras.length > 1 ? paras : splitBySentenceCluster(bodyText, 3);
  bodyChunks = bodyChunks
    .map((c) => stripUrTakeInlineMarkdown(String(c).trim()))
    .filter((c) => c.length >= 2 && !/^[\s.•]+$/u.test(c));
  bodyChunks = bodyChunks
    .map((c) => c.replace(/\*\*Confidence:.*$/im, "").trim())
    .filter(Boolean);
  bodyChunks = bodyChunks
    .map((c) =>
      String(c)
        .replace(/\*\*/g, "")
        .replace(/^#+\s*/gm, "")
        .replace(/^---+/gm, "")
        .replace(/^\d+\.\s+/gm, "")
        .replace(/\bTHE CALL:\s*/g, "")
        .trim(),
    )
    .filter(Boolean);

  bodyChunks = splitArrowPickLinesFromChunks(bodyChunks);
  bodyChunks = splitStructuralLabelsFromChunks(bodyChunks);

  if (
    closing &&
    closing.split(" ").filter(Boolean).length < 15
  ) {
    const lastChunk = bodyChunks.pop();
    const lastStr =
      typeof lastChunk === "string"
        ? lastChunk
        : lastChunk && typeof lastChunk === "object"
          ? String(lastChunk.text || "").trim()
          : "";
    closing = lastStr || closing;
  }

  const headlineDisplay = headline
    ? stripUrTakeInlineMarkdown(
        String(headline)
          .replace(/^>>\s*/, "")
          .replace(/^#+\s*/, "")
          .replace(/^---+/, "")
          .replace(/\*\*/g, "")
          .replace(/:\s*\d+\.?\s*$/, "")
          .trim(),
      )
    : "";
  const closingDisplay = closing
    ? stripUrTakeInlineMarkdown(
        String(closing)
          .replace(/^---+\s*/, "")
          .replace(/\*\*/g, ""),
      )
    : "";

  const hasVisual = Boolean(
    gameState || headlineDisplay || bodyChunks.length > 0 || closingDisplay || confidence,
  );

  return {
    gameState,
    headline: headlineDisplay,
    bodyChunks,
    closing: closingDisplay,
    confidence,
    hasVisual,
  };
}

/** Legacy loose match (any characters after leg marker — avoids missing lowercase picks). */
const PARLAY_LEG_PATTERN = /(?:leg\s*\d+|→)\s*:?\s*([^\n—]+)/gi;

function matchParlayLegLineBody(trimmedLine) {
  const t = String(trimmedLine || "").trim();
  const m =
    t.match(/^→\s*(.+)$/) ||
    t.match(/^Leg\s*\d+\s*[:\-–]\s*(.+)$/i) ||
    t.match(/^\d+[\).\]]\s+(.+)$/);
  if (!m || !m[1]) return null;
  const play = m[1].replace(/\*\*/g, "").trim();
  if (play.length < 3 || /^parlay\s+leg/i.test(play)) return null;
  return play.slice(0, 160);
}

/**
 * When the API omits `structured`, promote plain-text parlays to the premium card if we can find
 * ≥2 legs (PARLAY LEGS section, arrows, or numbered rows). Gated on "parlay" so random numbered lists don't promote.
 */
function extractParlayLegsFromLines(raw) {
  if (!/\bparlay\b/i.test(raw)) return null;
  const lines = raw.split("\n");

  let inLegSection = false;
  const sectionLegs = [];
  for (const line of lines) {
    const t = line.trim();
    if (/^PARLAY\s+LEG/i.test(t)) {
      inLegSection = true;
      continue;
    }
    if (
      inLegSection &&
      /^(CONFIDENCE|EDGE|THE\s+EDGE|CAVEATS|WHY\s+NOW|MARKET\s+READ)(\s|:|$)/i.test(t)
    ) {
      inLegSection = false;
      continue;
    }
    if (!inLegSection) continue;
    const play = matchParlayLegLineBody(t);
    if (play) sectionLegs.push({ play, rationale: "", odds: "TBD" });
  }
  if (sectionLegs.length >= 2) return sectionLegs;

  const loose = [];
  for (const line of lines) {
    const play = matchParlayLegLineBody(line.trim());
    if (play) loose.push({ play, rationale: "", odds: "TBD" });
  }
  return loose.length >= 2 ? loose : null;
}

function attemptParlayConversion(text) {
  const raw = String(text || "");
  const re = new RegExp(PARLAY_LEG_PATTERN.source, PARLAY_LEG_PATTERN.flags);
  const legs = [...raw.matchAll(re)];
  if (legs.length >= 2) {
    return legs.map((match) => ({
      play: match[1].trim(),
      rationale: "",
      odds: "TBD",
    }));
  }
  return extractParlayLegsFromLines(raw);
}

function buildPromotedParlayStructured(summaryText, sportHint, legs) {
  const parsed = parseUrTakeResponse(summaryText);
  const firstLine = summaryText.split("\n").find((ln) => String(ln).trim()) || "";
  const callRaw =
    parsed.headline ||
    String(firstLine)
      .replace(/^>>\s*/, "")
      .trim()
      .slice(0, 100) ||
    "Parlay card";
  const call = callRaw.length >= 3 ? callRaw : "Parlay card";
  return {
    sport: String(sportHint || "generic"),
    call,
    confidence: "Medium",
    whyNow:
      "Legs below are shown in the structured card for scanning; your full write-up stays in the thread.",
    edge:
      "Confirm legs, prices, and correlation on the board before placing — layout is extracted from plain text.",
    callType: "parlay",
    analysis: null,
    caveats: [],
    parlayLegs: legs.map((leg) => ({
      play: String(leg.play || "Leg").slice(0, 50),
      rationale:
        typeof leg.rationale === "string" && leg.rationale.trim().length > 0
          ? leg.rationale.trim()
          : "",
      odds: leg.odds || "TBD",
    })),
    parlayTotalOdds: "TBD",
    timestamp: null,
  };
}

/** Prefer API followUps when present; otherwise derive three chips from answer text (parlay / O-U / slate / default). */
export function getFollowUpSuggestions(message) {
  const api = Array.isArray(message?.followUps) ? message.followUps : [];
  if (api.length >= 1) return api.slice(0, 3);

  const contentStr =
    typeof message?.content === "string"
      ? message.content
      : typeof message?.text === "string"
        ? message.text
        : "";
  const structuredCall =
    message?.structured && typeof message.structured === "object" && typeof message.structured.call === "string"
      ? message.structured.call
      : "";
  const deepTextStr = typeof message?.deepText === "string" ? message.deepText : "";
  const text = [contentStr, structuredCall, deepTextStr].filter(Boolean).join("\n");

  if (/parlay/i.test(text)) {
    return ["What breaks this parlay?", "Best single leg from this", "Adjust to 2 legs"];
  }
  if (/over|under/i.test(text)) {
    return [
      "Build a parlay around this",
      "What's the risk here?",
      "Show me the opposing view",
    ];
  }
  if (/slate|top \d|best \d/i.test(text)) {
    return ["Which is the single safest?", "Rank these by confidence", "Build a parlay from these"];
  }
  return ["Give me a specific bet", "What's the strongest edge?", "What kills this take?"];
}

/** Last AI bubble + suggestions for docked follow-up chips (Ask + sport surfaces). */
export function getLastAiFollowUpDockSource(msgs) {
  if (!Array.isArray(msgs)) return null;
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    if (!m || m.loading || m.role !== "ai") continue;
    const followUps = getFollowUpSuggestions(m);
    return {
      msgId: m.msgId,
      followUps,
      shownAt: m.urTakeTelemetry?.shownAt ?? Date.now(),
      intent: String(m.urTakeTelemetry?.intent ?? ""),
      liveMode: Boolean(m.urTakeTelemetry?.liveMode),
      sport: String(m.sport || m.urTakeTelemetry?.sport || "generic"),
      followUpCount: followUps.length,
    };
  }
  return null;
}

/**
 * Remove API `followUps` lines duplicated inside assistant prose so chips only appear in the docked bar.
 */
export function stripEmbeddedFollowUpQuestions(text, followUps) {
  if (!Array.isArray(followUps) || followUps.length === 0) return String(text || "");
  let t = String(text || "");
  for (const fu of followUps) {
    const q = String(fu || "").trim();
    if (q.length < 4) continue;
    const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    t = t.replace(new RegExp(`^\\s*[-•*\\d.)]*\\s*${esc}\\s*$`, "gim"), "");
    t = t.replace(new RegExp(`\\n\\s*[-•*\\d.)]*\\s*${esc}\\s*(?=\\n|$)`, "gim"), "\n");
  }
  return t.replace(/\n{3,}/g, "\n\n").trimEnd();
}

export function renderUrTakeAiMessage(raw) {
  const text = String(raw || "");
  const parsed = parseUrTakeResponse(text);

  if (!parsed.hasVisual) {
    return renderMessage(text, { styleUrTakeSectionLabels: true });
  }

  const { gameState, headline: headlineDisplay, bodyChunks, closing: closingDisplay, confidence } = parsed;

  return (
    <div style={{ padding: "0 4px" }}>
      <UrTakePlainTextVisual
        gameStateLine={gameState ? stripUrTakeInlineMarkdown(gameState) : ""}
        headlineDisplay={headlineDisplay}
        bodyChunks={bodyChunks}
        closingDisplay={closingDisplay}
        confidence={confidence}
        compactBubble={false}
      />
    </div>
  );
}

/** Cyan → magenta gradient for legacy `>>` opener and emphasis (not section labels). */
const UR_TAKE_HEADLINE_GRADIENT_STYLE = {
  background: "linear-gradient(90deg, #00F5E9 0%, #FF2D6B 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

/** Metallic gold section labels (aligned with Pro value grid titles). */
const UR_TAKE_SECTION_HEADING_STYLE = {
  fontFamily: "var(--mono-font)",
  fontSize: 9,
  fontWeight: 400,
  lineHeight: 1.3,
  letterSpacing: "2px",
  textTransform: "uppercase",
  marginBottom: 6,
  background: "linear-gradient(90deg, #C0A060, #F0D890, #C0A060)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

/**
 * @param {{ styleUrTakeSectionLabels?: boolean }} [opts] — when true (UR Take AI bubbles), recognized section labels use metallic gold gradient text.
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

/** UR Take loading skeleton — ~10s is normal for complex reads; only optimize if median exceeds ~15s (feels broken). */
const LOADING_STAGES = [
  { atMs: 0, label: "Reading the board" },
  { atMs: 4000, label: "Running the matchup" },
  { atMs: 10000, label: "Sharpening the take" },
  { atMs: 15000, label: "Heavy slate — almost there" },
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
  const cq = String(trust.contextQuality || "").toLowerCase();
  /** Hide routine metadata during normal reads — only surface real caution signals. */
  const show = cq === "low" || Boolean(trust.thinEvidence);
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

function UrTakeAiBubble({ m, trackPlay, userQuestion = "" }) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const summaryText = stripEmbeddedFollowUpQuestions(
    stripLeadingUrTakeDisclaimersForDisplay(m.text),
    m.followUps,
  );
  const combined = `${summaryText}\n${m.deepText || ""}`;
  const hasThePlay = /\bTHE\s+PLAY\b/i.test(combined);
  const tracked =
    Boolean(trackPlay?.trackedIds?.length) &&
    m.msgId &&
    trackPlay.trackedIds.includes(m.msgId);
  const showTrack =
    Boolean(trackPlay?.enabled) && Boolean(m.msgId) && hasThePlay && typeof trackPlay.onTrack === "function";
  const trustChips = m.takeMeta?.trust ? <UrTakeTrustChips trust={m.takeMeta.trust} /> : null;

  /**
   * Bubble rendering paths:
   * 1. `m.structured` from the API → `URTakeResponse` premium card.
   * 2. Else plain text matches parlay leg heuristics (`attemptParlayConversion`) → synthetic structured
   *    object (`callType: "parlay"`) and the same card (covers answers that never received structured JSON).
   * 3. Else `parseUrTakeResponse(summaryText).hasVisual` → `UrTakePlainTextVisual` (gradient + chunks).
   * 4. Else legacy `renderMessage` typography.
   * Breakdown toggles `renderUrTakeAiMessage` on `deepText` when present.
   */
  const plainParlayLegs =
    m.structured && typeof m.structured === "object" ? null : attemptParlayConversion(summaryText);
  const promotedParlayStructured = plainParlayLegs
    ? buildPromotedParlayStructured(summaryText, m.sport, plainParlayLegs)
    : null;
  const effectiveStructured =
    m.structured && typeof m.structured === "object" ? m.structured : promotedParlayStructured;

  if (effectiveStructured && typeof effectiveStructured === "object") {
    const parsedLiveRibbon = parseUrTakeResponse(summaryText);
    const structuredGameStateLine = parsedLiveRibbon.gameState
      ? stripUrTakeInlineMarkdown(parsedLiveRibbon.gameState)
      : "";

    const s = effectiveStructured;
    return (
      <>
        {m.image && <img src={m.image} alt="" className="bubble-img" />}
        <URTakeResponse
          sport={s.sport}
          question={userQuestion}
          call={s.call}
          confidence={s.confidence}
          whyNow={s.whyNow}
          edge={s.edge}
          callType={s.callType}
          analysis={s.analysis}
          caveats={s.caveats}
          parlayLegs={s.parlayLegs}
          parlayTotalOdds={s.parlayTotalOdds}
          timestamp={s.timestamp}
          gameStateLine={structuredGameStateLine}
          liveScore={String(m.liveScore || "").trim()}
        />
        {trustChips}
      </>
    );
  }

  const parsed = parseUrTakeResponse(summaryText);

  if (showBreakdown && m.deepText) {
    return (
      <>
        {m.image && <img src={m.image} alt="" className="bubble-img" />}
        <div
          style={{
            background: "rgba(0,0,0,0.3)",
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <button
            type="button"
            onClick={() => setShowBreakdown(false)}
            style={{
              color: "#00F5E9",
              cursor: "pointer",
              marginBottom: 12,
              background: "none",
              border: "none",
              fontFamily: "var(--body-font)",
              fontSize: 13,
            }}
          >
            ← Back
          </button>
          <div>{renderUrTakeAiMessage(stripLeadingUrTakeDisclaimersForDisplay(m.deepText))}</div>
        </div>
        {trustChips}
      </>
    );
  }

  if (!parsed.hasVisual) {
    const plainHeadline =
      summaryText
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.length > 0) || summaryText;
    return (
      <>
        {m.image && <img src={m.image} alt="" className="bubble-img" />}
        <div style={{ position: "relative", paddingBottom: 36 }}>
          {renderMessage(summaryText, { styleUrTakeSectionLabels: true })}
          <div className="ur-take-share-anchor">
            <UrTakeShareButton headline={plainHeadline} bodyChunks={[summaryText]} />
          </div>
        </div>
        {trustChips}
        {showTrack ? (
          <button
            type="button"
            onClick={async () => {
              if (tracked || isTracking || typeof trackPlay.onTrack !== "function") return;
              setIsTracking(true);
              try {
                await Promise.resolve(trackPlay.onTrack(m));
              } finally {
                setIsTracking(false);
              }
            }}
            disabled={tracked || isTracking}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "1px solid rgba(0,245,233,0.2)",
              borderRadius: 6,
              padding: "5px 10px",
              cursor: tracked || isTracking ? "default" : "pointer",
              marginTop: 8,
              fontFamily: "var(--mono-font)",
              fontSize: 9,
              letterSpacing: 1.5,
              color: tracked ? "rgba(0,245,233,0.35)" : "rgba(0,245,233,0.6)",
              textTransform: "uppercase",
              opacity: isTracking ? 0.5 : 1,
            }}
          >
            {tracked ? "✓ Tracked" : isTracking ? "Tracking..." : "Track this play"}
          </button>
        ) : null}
        {m.deepText ? (
          <div style={{ marginTop: 12 }}>
            <button type="button" className="quick-btn" onClick={() => setShowBreakdown(true)} style={{ fontSize: 11 }}>
              See full breakdown
            </button>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <>
      {m.image && <img src={m.image} alt="" className="bubble-img" />}
      <div
        style={{
          background: "rgba(0,0,0,0.2)",
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
        }}
      >
        <UrTakePlainTextVisual
          gameStateLine={parsed.gameState ? stripUrTakeInlineMarkdown(parsed.gameState) : ""}
          headlineDisplay={parsed.headline}
          bodyChunks={parsed.bodyChunks}
          closingDisplay={parsed.closing}
          confidence={parsed.confidence}
          compactBubble={true}
        />

        {(m.deepText || showTrack) && (
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 12,
              justifyContent: "flex-end",
              flexWrap: "wrap",
            }}
          >
            {m.deepText ? (
              <button
                type="button"
                onClick={() => setShowBreakdown(true)}
                style={{
                  background: "transparent",
                  color: "#00F5E9",
                  border: "1px solid #00F5E9",
                  padding: "8px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: "var(--body-font)",
                }}
              >
                See full breakdown
              </button>
            ) : null}
            {showTrack ? (
              <button
                type="button"
                onClick={async () => {
                  if (tracked || isTracking || typeof trackPlay.onTrack !== "function") return;
                  setIsTracking(true);
                  try {
                    await Promise.resolve(trackPlay.onTrack(m));
                  } finally {
                    setIsTracking(false);
                  }
                }}
                disabled={tracked || isTracking}
                style={{
                  background: "transparent",
                  color: "#FF3D8F",
                  border: "1px solid #FF3D8F",
                  padding: "8px 12px",
                  borderRadius: 6,
                  cursor: tracked || isTracking ? "default" : "pointer",
                  fontSize: 12,
                  textTransform: "uppercase",
                  fontFamily: "var(--body-font)",
                  opacity: isTracking ? 0.5 : 1,
                }}
              >
                {tracked ? "✓ TRACKED" : isTracking ? "TRACKING..." : "TRACK THIS PLAY"}
              </button>
            ) : null}
          </div>
        )}
      </div>
      {trustChips}
    </>
  );
}

export function ChatThread({
  msgs,
  urTakeTrackPlay = null,
  accessTier = null,
}) {
  const chatThreadRef = useRef(null);

  /** Scroll so the top of the latest assistant reply is visible — headline first, not the tail of a long answer. */
  useLayoutEffect(() => {
    if (!msgs?.length) return;
    const nodes = chatThreadRef.current?.querySelectorAll('[data-role="assistant"]');
    const target = nodes?.[nodes.length - 1];
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [msgs]);

  let weeklyUsed = 0;
  try {
    weeklyUsed = parseInt(
      typeof localStorage !== "undefined" ? localStorage.getItem("ur_free_used") || "0" : "0",
      10,
    );
  } catch {
    weeklyUsed = 0;
  }

  const last = msgs?.length ? msgs[msgs.length - 1] : null;
  const showFreeFollowUpCue =
    accessTier === "free" &&
    weeklyUsed === 1 &&
    FREE_QUESTION_LIMIT === 2 &&
    last &&
    last.role === "ai" &&
    !last.loading;

  if (!msgs || msgs.length === 0) return null;
  return (
    <div ref={chatThreadRef} className="chat-thread" style={{ marginBottom: 20 }}>
      {msgs.map((m, i) =>
        m.loading ? (
          <LoadingBubble key={i} sport={m.sport} />
        ) : (
          <div
            key={m.msgId || i}
            className={`bubble ${m.role}`}
            {...(m.role === "ai" ? { "data-role": "assistant" } : { "data-role": "user" })}
          >
            {m.role === "ai" ? (
              <UrTakeAiBubble
                m={m}
                trackPlay={urTakeTrackPlay}
                userQuestion={String(
                  [...msgs.slice(0, i)].reverse().find((x) => x.role === "user")?.text || "",
                )}
              />
            ) : (
              <>
                {m.image && <img src={m.image} alt="" className="bubble-img" />}
                {renderMessage(m.text)}
              </>
            )}
          </div>
        )
      )}
      {showFreeFollowUpCue ? (
        <div
          style={{
            fontFamily: "var(--mono-font)",
            fontSize: 10,
            letterSpacing: 1.5,
            color: "rgba(0,245,233,0.5)",
            textTransform: "uppercase",
            textAlign: "center",
            marginTop: 12,
            padding: "8px 16px",
          }}
        >
          ⚡ One follow-up left free — go deeper or ask another angle
        </div>
      ) : null}
    </div>
  );
}
