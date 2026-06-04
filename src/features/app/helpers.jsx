import { Component, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { stripUrTakeDeadEndCopy } from "../../../shared/urTakeSportRouting.js";

import { useTakeAuthHeaders } from "../../hooks/useTakeAuthHeaders.js";

import { FREE_QUESTION_LIMIT, readFreeTierUsedToday } from "../../lib/freeTierLimits.js";
import { synthesizeLeanLine } from "../../lib/urTakeLean.js";
import { THREAD_UPGRADE_NUDGE_TEXT } from "../../lib/proUpgradeCopy.js";
import { normalizeText } from "../../lib/normalizeText.js";
import { polishUrTakeFollowUpPhrase } from "../../lib/polishUrTakeFollowUpPhrase.js";
import { CHASE_CALM_COPY } from "../../lib/chaseSignals.js";
import { extractUrTakeSectionHeading, isUrTakeSectionHeading } from "../../lib/urTakeSectionHeadings.js";
import { isSubstantiveClosing } from "../../lib/urTakeClosingSentence.js";
import {
  splitSentencesForUrTakeDisplay,
  takeFirstSentenceSpan,
} from "../../lib/urTakeSentenceBoundaries.js";
import URTakeResponse from "../../components/URTakeResponse.jsx";
import { resolveStructuralEdgeChipForMessage } from "../../lib/urTakeStructuralEdgeChip.js";
import UrTakeDockedFollowUps from "../../components/UrTakeDockedFollowUps.jsx";
import UrTakeShareButton from "../../components/UrTakeShareButton.jsx";
import { formatUrTakeSportTag } from "../../lib/urTakeSportTag.js";
import {
  wcDataConfidenceChipLabel,
  wcDataConfidenceNeedsCaution,
} from "../../../shared/wcDataConfidence.js";
import {
  classifyWcVerdictForUi,
  getVerdictFollowUpChips,
  getVerdictNextLine,
  resolveWcIntentFromMessage,
  resolveWcVerdictFromQuestion,
} from "../../../shared/wcUrTakeVerdict.js";
import {
  filterNbaFollowUpsForVerdict,
  getNbaVerdictFollowUpChips,
  getNbaVerdictNextLine,
  resolveNbaVerdictFromQuestion,
} from "../../../shared/nbaUrTakeVerdict.js";
import { WC_INTENT, classifyWcQuestionIntent, isWcRulesQuestion } from "../../../shared/wcUrTakeIntent.js";
import { shouldShowUrTakeClientFailureDebug } from "../../lib/urTakeClientFailureDebug.js";
import { buildNbaUrTakeContextBar } from "../../lib/nbaUrTakeContextBar.js";
export { normalizeText };
export { isSubstantiveClosing };
export { formatUrTakeSportTag };

/**
 * Isolates premium UR Take UI so a single bad payload cannot trip the whole Ask thread
 * (`UrTakeChatErrorBoundary` / DISPLAY SAFE MODE). Falls back to the same prose the model sent.
 */
class UrTakeSectionErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError() {
    return { error: true };
  }

  componentDidCatch(err, info) {
    console.error(`[UrTakeSectionErrorBoundary:${this.props.label || "section"}]`, err, info?.componentStack);
  }

  render() {
    if (this.state.error) return this.props.fallback ?? null;
    return this.props.children;
  }
}

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
    s = s.replace(/^This is a .*? confidence take\.[^\n]*\n?/i, "");
    return stripUrTakeDeadEndCopy(s);
  };
  const cleaned = [];
  for (const m of msgs) {
    if (!m || m.loading) continue;
    const role = m.role === "ai" ? "assistant" : m.role === "user" ? "user" : null;
    const content = sanitizeForModel(m.text ?? m.content ?? "");
    if (!role || !content || /^ANALYZING/i.test(content)) continue;
    const row = { role, content: content.slice(0, 3500) };
    const sport = String(m.sport || "").trim().toLowerCase();
    if (sport) row.sport = sport;
    if (m.structured && typeof m.structured === "object") {
      const s = m.structured;
      row.structured = {
        call: s.call != null ? String(s.call).slice(0, 400) : undefined,
        whyNow: s.whyNow != null ? String(s.whyNow).slice(0, 600) : undefined,
        edge: s.edge != null ? String(s.edge).slice(0, 600) : undefined,
        callType: s.callType != null ? String(s.callType).slice(0, 64) : undefined,
        confidence: s.confidence != null ? String(s.confidence).slice(0, 32) : undefined,
      };
    }
    cleaned.push(row);
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
    s = s.replace(/^This is a .*? confidence take\.[^\n]*\n?/i, "");
    return stripUrTakeDeadEndCopy(s);
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
  const s = String(raw || "")
    .replace(/^This is a .*? confidence take\.[^\n]*\n+/i, "")
    .replace(/^This is a .*? confidence take\.[^\n]*$/im, "");
  return stripUrTakeDeadEndCopy(s);
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
  sport = "generic",
  callType,
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

  const liveRibbon = String(gameStateLine || "").trim();
  const showLiveHeader = liveRibbon.length > 0;
  const sportTag = formatUrTakeSportTag(sport, callType);

  const metaRight = showLiveHeader ? (
    <div className="flex items-center gap-1.5 shrink-0">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#4ade80]" />
      <span className="font-mono text-[11px] text-[#4ade80]">{liveRibbon}</span>
    </div>
  ) : confidence ? (
    <span className={pillCls}>{confidencePillText}</span>
  ) : (
    <span />
  );

  const shareBtn = (
    <UrTakeShareButton headline={headlineDisplay || ""} bodyChunks={bodyChunks} />
  );

  return (
    <div className="mt-1">
      <div className="ur-card-root">
        <div className="ur-card-accent-bar" />
        <div className="ur-card-body">
          <div className="ur-card-meta-row">
            <span className="ur-card-sport-tag">{sportTag}</span>
            {metaRight}
          </div>

          {headlineDisplay ? (
            <div
              className={
                mounted ? "ur-card-headline ur-response-headline" : "ur-card-headline"
              }
              style={{ opacity: mounted ? undefined : 0 }}
            >
              {String(headlineDisplay)}
            </div>
          ) : null}

            {bodyChunks.length > 0 ? (
          <div className="pb-1">
            {bodyChunks.map((chunk, i) => {
              const isPick = chunk && typeof chunk === "object" && chunk.type === "pick";
              const isLabel = chunk && typeof chunk === "object" && chunk.type === "label";
              const raw =
                typeof chunk === "string"
                  ? chunk
                  : chunk && typeof chunk === "object"
                    ? chunk.text
                    : "";
              const text =
                typeof raw === "string" || typeof raw === "number" ? String(raw) : "";
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
            <div className="ur-closing-share-row" style={{ opacity: mounted ? undefined : 0 }}>
              <div className="ur-closing-block ur-response-closing">{String(closingDisplay)}</div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {showLiveHeader && confidencePillText ? (
                  <span className={pillCls}>{confidencePillText}</span>
                ) : null}
                {shareBtn}
              </div>
            </div>
          ) : (
            <div className="ur-card-bottom-row" style={{ opacity: mounted ? undefined : 0 }}>
              <span>
                {showLiveHeader && confidencePillText ? (
                  <span className={pillCls}>{confidencePillText}</span>
                ) : null}
              </span>
              {shareBtn}
            </div>
          )}
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

/** After a structural label, the model often emits ": — -" before the section body — strip so it does not lead the next prose chunk. */
function stripLeadingAfterStructuralLabel(text) {
  return String(text || "")
    .replace(/^[\s:—\-]+/, "")
    .trim();
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
  let stripNextProse = false;
  let m;
  const alt = structuralLabelAlternationPattern();
  const anchoredRe = new RegExp(`(?:^|[\\r\\n]+|[.!?]\\s+)(${alt})`, "gi");
  while ((m = anchoredRe.exec(t)) !== null) {
    const matchStart = m.index;
    const rawBefore = t.slice(lastIndex, matchStart);
    const before = stripNextProse ? stripLeadingAfterStructuralLabel(rawBefore) : rawBefore.trim();
    if (before) parts.push({ type: "prose", text: before });
    const raw = String(m[1] || "").replace(/\s+/g, " ").trim().toUpperCase();
    const labelText = STRUCTURAL_LABEL_CANONICAL.get(raw) || String(m[1] || "").trim();
    parts.push({ type: "label", text: labelText });
    lastIndex = matchStart + m[0].length;
    stripNextProse = true;
  }
  let rest = t.slice(lastIndex);
  if (stripNextProse) rest = stripLeadingAfterStructuralLabel(rest);
  else rest = rest.trim();
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

function safeParseUrTakeResponse(raw) {
  try {
    return parseUrTakeResponse(raw);
  } catch (err) {
    console.error("[parseUrTakeResponse]", err);
    return {
      gameState: "",
      headline: "",
      bodyChunks: [],
      closing: "",
      confidence: "",
      hasVisual: false,
    };
  }
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
  if (sectionLegs.length >= 2) return sectionLegs.slice(0, 12);

  const loose = [];
  for (const line of lines) {
    const play = matchParlayLegLineBody(line.trim());
    if (play) loose.push({ play, rationale: "", odds: "TBD" });
  }
  return loose.length >= 2 ? loose.slice(0, 12) : null;
}

function attemptParlayConversion(text) {
  const raw = String(text || "");
  const re = new RegExp(PARLAY_LEG_PATTERN.source, PARLAY_LEG_PATTERN.flags);
  const legs = [...raw.matchAll(re)];
  /*
   * Golf (and other sports) often use "→" for single picks or leaderboard rows. Without the word
   * "parlay", those must not become synthetic parlay cards — dozens of false legs can freeze the
   * thread and look like a black / blank screen.
   */
  if (legs.length >= 2 && /\bparlay\b/i.test(raw)) {
    const trimmed = legs
      .map((match) => ({
        play: String(match[1] ?? "").trim(),
        rationale: "",
        odds: "TBD",
      }))
      .filter((leg) => leg.play.length >= 2);
    if (trimmed.length >= 2) return trimmed.slice(0, 12);
  }
  return extractParlayLegsFromLines(raw);
}

/** Prose-only chunks from parse (skip headline machinery, arrow legs, section labels). */
function extractPromotedParlayNarrativeChunks(parsed) {
  const out = [];
  for (const c of parsed?.bodyChunks || []) {
    if (typeof c === "string") {
      const t = String(c).trim();
      if (t) out.push(t);
      continue;
    }
    if (!c || typeof c !== "object") continue;
    if (c.type === "label" || c.type === "pick") continue;
    const t = String(c.text || "").trim();
    if (t) out.push(t);
  }
  return out;
}

function buildPromotedParlayWhyEdge(parsed, summaryText) {
  const prose = extractPromotedParlayNarrativeChunks(parsed);
  const clip = (s, n) => String(s || "").trim().slice(0, n);
  if (prose.length >= 2) {
    return { whyNow: String(prose[0] || "").trim(), edge: clip(prose[1], 520) };
  }
  if (prose.length === 1) {
    const paras = prose[0].split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    if (paras.length >= 2) {
      return { whyNow: String(paras[0] || "").trim(), edge: clip(paras[1], 520) };
    }
    const one = prose[0];
    const mid = Math.min(280, Math.floor(one.length / 2));
    if (one.length > 120) {
      return {
        whyNow: String(one || "").trim(),
        edge: clip(one.slice(mid), 520) || clip(one, 520),
      };
    }
  }
  const tail = String(summaryText || "")
    .split(/\n/)
    .map((ln) => ln.trim())
    .filter((ln) => ln && !/^>>/.test(ln) && !/^PARLAY\s+LEG/i.test(ln) && !/^→\s/.test(ln) && !/^Confidence:/i.test(ln))
    .slice(0, 4)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (tail.length >= 40) {
    const half = Math.min(240, Math.floor(tail.length / 2));
    return { whyNow: tail, edge: clip(tail.slice(half), 520) };
  }
  return {
    whyNow:
      "These legs cluster angles from tonight's slate — each one below is its own play.",
    edge:
      "Correlation still matters: if two legs need the same game script, size the ticket like one hinge, not two independent edges.",
  };
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
  const { whyNow, edge } = buildPromotedParlayWhyEdge(parsed, summaryText);
  return {
    sport: String(sportHint || "generic"),
    call,
    confidence: "Medium",
    whyNow,
    edge,
    callType: "parlay",
    analysis: null,
    caveats: [],
    parlayLegs: legs.slice(0, 12).map((leg) => ({
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

/** Merge API follow-ups with heuristics so we always surface 3 distinct chips when possible. */
function mergeFollowUpChips(primary, fallback) {
  const seen = new Set();
  const out = [];
  for (const list of [primary, fallback]) {
    if (!Array.isArray(list)) continue;
    for (const raw of list) {
      const q = String(raw || "").trim();
      if (q.length < 4) continue;
      const key = q.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(q);
      if (out.length >= 3) return out;
    }
  }
  return out;
}

/** Cap and polish follow-up chip labels for dock + thread. */
function polishFollowUpList(list) {
  if (!Array.isArray(list)) return [];
  return list.map((t) => polishUrTakeFollowUpPhrase(String(t || "").trim())).filter(Boolean).slice(0, 3);
}

/** Prefer API followUps when present; otherwise derive three chips from answer text (parlay / O-U / slate / default). */
export function getFollowUpSuggestions(message, userQuestion = "") {
  const apiRaw = Array.isArray(message?.followUps) ? message.followUps : [];
  const api = apiRaw.map((t) => String(t).trim()).filter(Boolean);

  const sport = String(message?.sport || message?.urTakeTelemetry?.sport || "").toLowerCase();
  if (sport === "worldcup") {
    const q = String(userQuestion || message?.userQuestion || "").trim();
    const verdict = resolveWcVerdictFromQuestion(q, message);
    return polishFollowUpList(getVerdictFollowUpChips(verdict));
  }

  if (sport === "nba") {
    const q = String(userQuestion || message?.userQuestion || "").trim();
    const nbaIntent =
      message?.nbaRelevance?.nbaIntent || message?.urTakeTelemetry?.nbaIntent || null;
    const verdict = resolveNbaVerdictFromQuestion(q, message);
    const chips = filterNbaFollowUpsForVerdict(
      getNbaVerdictFollowUpChips(verdict, nbaIntent),
      verdict,
    );
    if (api.length >= 3) {
      return polishFollowUpList(
        filterNbaFollowUpsForVerdict(mergeFollowUpChips(api, chips), verdict).slice(0, 3),
      );
    }
    if (api.length > 0) {
      return polishFollowUpList(
        filterNbaFollowUpsForVerdict(mergeFollowUpChips(api, chips), verdict),
      );
    }
    return polishFollowUpList(chips);
  }

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

  let fallback;
  if (/parlay/i.test(text)) {
    fallback = ["What breaks this parlay?", "What's the best single leg?", "Sharpen this to 2 legs."];
  } else if (/over|under/i.test(text)) {
    fallback = [
      "Build a parlay around this.",
      "What kills this edge?",
      "What's the other side of this?",
    ];
  } else if (/slate|top \d|best \d/i.test(text)) {
    fallback = [
      "Which is the safest single bet?",
      "Rank these by confidence.",
      "Build a parlay from these.",
    ];
  } else {
    fallback = [
      "Give me a specific number to target.",
      "What's the strongest edge here?",
      "What kills this take?",
    ];
  }

  if (api.length >= 3) return polishFollowUpList(api.slice(0, 3));
  if (api.length === 0) return polishFollowUpList(fallback);
  return polishFollowUpList(mergeFollowUpChips(api, fallback));
}

/** @param {object[]} msgs @param {number} aiIndex */
function resolvePriorUserQuestionForAi(msgs, aiIndex) {
  if (!Array.isArray(msgs)) return "";
  for (let j = aiIndex - 1; j >= 0; j -= 1) {
    const row = msgs[j];
    if (row?.role === "user") return String(row.text || "").trim();
  }
  return "";
}

/** Last AI bubble + suggestions for docked follow-up chips (Ask + sport surfaces). */
export function getLastAiFollowUpDockSource(msgs) {
  if (!Array.isArray(msgs)) return null;
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    if (!m || m.loading || m.role !== "ai") continue;
    const followUps = getFollowUpSuggestions(m, resolvePriorUserQuestionForAi(msgs, i));
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
  try {
    for (const fu of followUps) {
      const q = String(fu ?? "").trim();
      if (q.length < 4) continue;
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (esc.length > 800) continue;
      t = t.replace(new RegExp(`^\\s*[-•*\\d.)]*\\s*${esc}\\s*$`, "gim"), "");
      t = t.replace(new RegExp(`\\n\\s*[-•*\\d.)]*\\s*${esc}\\s*(?=\\n|$)`, "gim"), "\n");
    }
  } catch {
    return t;
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
        sport="generic"
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
  nba: "#f97316",
  mlb: "#1DB954",
  nfl: "#4A90D9",
  f1: "#E10600",
  tennis: "#FFE600",
  golf: "#FFFFFF",
};

/** Phased copy for UR Take loading — cycling text + progress bar (no dot animation). */
const UR_TAKE_LOADING_PHASES = [
  { delay: 0, text: "Pulling live data..." },
  { delay: 2500, text: "Pulling tonight's board..." },
  { delay: 5000, text: "Checking the line movement..." },
  { delay: 7500, text: "Building the take..." },
  { delay: 9500, text: "Almost there..." },
];

export function LoadingBubble({ sport, variant = "default", onLayoutTick }) {
  const sportKey = String(sport || "").toLowerCase();
  const accent = SPORT_ACCENT[sportKey] || "#FFFFFF";
  const imessage = variant === "urChatDocked";

  const [phaseText, setPhaseText] = useState(UR_TAKE_LOADING_PHASES[0].text);
  const [progressPhase, setProgressPhase] = useState("");

  useEffect(() => {
    const timers = UR_TAKE_LOADING_PHASES.slice(1).map(({ delay, text }) =>
      window.setTimeout(() => setPhaseText(text), delay),
    );
    let raf2;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => setProgressPhase("ur-loading-progress--active"));
    });
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.cancelAnimationFrame(raf1);
      if (raf2 != null) window.cancelAnimationFrame(raf2);
    };
  }, []);

  useEffect(() => {
    if (typeof onLayoutTick === "function") onLayoutTick();
  }, [phaseText, onLayoutTick]);

  const progressClassName = `ur-loading-progress${progressPhase ? ` ${progressPhase}` : ""}`;

  if (imessage) {
    return (
      <div className="ur-take-loading-phases ur-take-loading-phases--dock" aria-live="polite" aria-busy="true">
        <p className="ur-take-loading-phase-text">{phaseText}</p>
        <div className={progressClassName} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div
      className="bubble ai loading"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minHeight: 64,
        opacity: 1,
        border: `1px solid ${accent}`,
        boxShadow: `0 0 0 1px ${accent}`,
      }}
      aria-live="polite"
      aria-busy="true"
    >
      <div className="ur-take-loading-phases ur-take-loading-phases--bubble">
        <p className="ur-take-loading-phase-text">{phaseText}</p>
        <div className={progressClassName} aria-hidden="true" />
      </div>
    </div>
  );
}

function UrTakeTrustChips({ trust }) {
  if (!trust || typeof trust !== "object") return null;
  const cq = String(trust.contextQuality || "").toLowerCase();
  const drivers = Array.isArray(trust.confidenceDrivers) ? trust.confidenceDrivers.filter(Boolean) : [];
  /** Hide routine metadata during normal reads — surface caution signals or confidence rationale. */
  const show = cq === "low" || cq === "full" || Boolean(trust.thinEvidence) || drivers.length > 0;
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

  const items = [`CTX·${String(trust.contextQuality ?? "")}`];
  if (trust.sparseQuestion) items.push("Sparse Q");

  const driverLine = drivers
    .slice(0, 4)
    .map((d) => String(d ?? "").trim())
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      role="group"
      aria-label="Take trust metadata"
      style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((label) => (
          <span key={label} style={chipStyle}>
            {label}
          </span>
        ))}
      </div>
      {driverLine ? (
        <div
          className="ur-take-trust-drivers"
          style={{
            fontSize: 11,
            lineHeight: 1.35,
            color: "var(--muted)",
            maxWidth: "100%",
          }}
        >
          {driverLine}
        </div>
      ) : null}
    </div>
  );
}

function UrTakeBetSignalPrompt({ takeId, takeMeta, getTakeAuthHeaders, enabled }) {
  const [busy, setBusy] = useState(false);
  const [localRecorded, setLocalRecorded] = useState(false);
  const serverRecorded = Boolean(takeMeta?.betSignal);
  const done = serverRecorded || localRecorded;

  if (!enabled || !takeId || typeof getTakeAuthHeaders !== "function") return null;

  const email =
    typeof localStorage !== "undefined" ? String(localStorage.getItem("ur_email") || "").trim() : "";
  if (!email.includes("@")) return null;

  const post = async (betYes) => {
    if (busy || done) return;
    setBusy(true);
    try {
      const authHeaders = await getTakeAuthHeaders();
      const ts = new Date().toISOString();
      const r = await fetch("/api/take-bet-signal", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ takeId, betYes, timestamp: ts, email }),
      });
      if (r.ok || r.status === 409) setLocalRecorded(true);
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div
        className="ur-take-bet-signal ur-take-bet-signal--done"
        style={{ marginTop: 10, fontSize: 11, color: "var(--muted)" }}
      >
        Thanks — saved.
      </div>
    );
  }

  return (
    <div
      className="ur-take-bet-signal"
      style={{
        marginTop: 10,
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: 11, color: "var(--muted)" }}>Did you bet this?</span>
      <button
        type="button"
        disabled={busy}
        onClick={() => void post(true)}
        style={{
          background: "rgba(0,245,233,0.12)",
          color: "#00F5E9",
          border: "1px solid rgba(0,245,233,0.35)",
          borderRadius: 6,
          padding: "4px 12px",
          fontSize: 11,
          cursor: busy ? "default" : "pointer",
          fontFamily: "var(--body-font)",
          opacity: busy ? 0.5 : 1,
        }}
      >
        Yes
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void post(false)}
        style={{
          background: "transparent",
          color: "var(--muted)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 6,
          padding: "4px 12px",
          fontSize: 11,
          cursor: busy ? "default" : "pointer",
          fontFamily: "var(--body-font)",
          opacity: busy ? 0.5 : 1,
        }}
      >
        No
      </button>
    </div>
  );
}

function UrTakeChaseCalmInset() {
  return (
    <p className="ur-chase-calm-inset" role="note">
      {CHASE_CALM_COPY}
    </p>
  );
}

/** Inline continuation nudge after a completed UR Take (all answer shapes). */
function UrTakeNextContinuationLine({ message = null, userQuestion = "" }) {
  const sport = String(message?.sport || message?.urTakeTelemetry?.sport || "").toLowerCase();
  const q = String(userQuestion || message?.userQuestion || "").trim();
  const line =
    sport === "worldcup"
      ? getVerdictNextLine(resolveWcVerdictFromQuestion(q, message))
      : sport === "nba"
        ? getNbaVerdictNextLine(resolveNbaVerdictFromQuestion(q, message))
        : "Next: what's one thing that could break this?";
  return <p className="ur-take-next-line">{line}</p>;
}

/** Coerce API / promoted `structured` into primitives URTakeResponse can always render. */
function coerceStructuredForUrTakeCard(raw) {
  if (!raw || typeof raw !== "object") return null;
  const toStr = (v) => {
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    return "";
  };
  const caveats = Array.isArray(raw.caveats)
    ? raw.caveats
        .map((c) => (typeof c === "string" || typeof c === "number" ? String(c).trim() : ""))
        .filter(Boolean)
    : [];
  const parlayLegs = Array.isArray(raw.parlayLegs)
    ? raw.parlayLegs
        .filter((leg) => leg && typeof leg === "object")
        .map((leg) => ({
          play: String(leg.play ?? "").trim().slice(0, 240) || "Leg",
          rationale:
            typeof leg.rationale === "string"
              ? leg.rationale
              : leg.rationale != null && typeof leg.rationale !== "object"
                ? String(leg.rationale)
                : "",
          odds: leg.odds != null && String(leg.odds).trim() !== "" ? String(leg.odds) : "TBD",
        }))
        .slice(0, 12)
    : [];

  const pto =
    raw.parlayTotalOdds != null && raw.parlayTotalOdds !== ""
      ? String(raw.parlayTotalOdds).slice(0, 48)
      : null;

  const call = toStr(raw.call).trim() || "—";
  const whyNow = toStr(raw.whyNow);
  const lean = synthesizeLeanLine({
    lean: toStr(raw.lean),
    call,
    whyNow,
  });

  return {
    sport: String(raw.sport ?? "generic"),
    lean,
    call,
    confidence: String(raw.confidence ?? "Medium"),
    whyNow,
    edge: toStr(raw.edge),
    callType: String(raw.callType ?? "single"),
    caveats,
    parlayLegs,
    parlayTotalOdds: pto,
    timestamp:
      typeof raw.timestamp === "number" && Number.isFinite(raw.timestamp)
        ? raw.timestamp
        : typeof raw.timestamp === "string"
          ? raw.timestamp
          : null,
  };
}

/** Coerce WC structured card shape from question intent when API/card shape drifts. */
function coerceWcStructuredForIntent(structured, userQuestion = "", message = null) {
  if (!structured || typeof structured !== "object") return structured;
  const q = String(userQuestion || message?.userQuestion || message?.question || "").trim();
  const intent =
    resolveWcIntentFromMessage(message, q) ||
    (isWcRulesQuestion(q) ? WC_INTENT.RULES : classifyWcQuestionIntent(q));

  if (intent === WC_INTENT.RULES || isWcRulesQuestion(q)) {
    return {
      ...structured,
      sport: "worldcup",
      callType: "rules",
      edge: structured.edge || "Factual tournament rules — not a betting pick.",
    };
  }
  if (intent === WC_INTENT.MATCHUP || /\b(vs\.?|versus|who advances)\b/i.test(q)) {
    return {
      ...structured,
      sport: "worldcup",
      callType: "matchup",
    };
  }
  if (intent === WC_INTENT.ENTITY_PRICING) {
    return {
      ...structured,
      sport: "worldcup",
      callType: "analysis",
    };
  }
  return structured;
}

/** Same structured / promoted-parlay resolution as the `URTakeResponse` path inside `UrTakeAiBubble`. */
function resolveEffectiveUrTakeStructuredFromSummary(m, summaryText, userQuestion = "") {
  const plainParlayLegs =
    m.structured && typeof m.structured === "object" ? null : attemptParlayConversion(summaryText);
  const promotedParlayStructured = plainParlayLegs
    ? buildPromotedParlayStructured(summaryText, m.sport, plainParlayLegs)
    : null;
  const effectiveStructured =
    m.structured && typeof m.structured === "object" ? m.structured : promotedParlayStructured;
  return coerceWcStructuredForIntent(
    effectiveStructured && typeof effectiveStructured === "object" ? effectiveStructured : null,
    userQuestion,
    m,
  );
}

function UrTakeFailSoftActions({ m, onUrTakeRetry, onUpgradePromptClick }) {
  const fail = m?.urTakeFailSoft;
  if (!fail || m.loading) return null;
  return (
    <div className="ur-take-fail-soft-actions">
      {fail.retryable && m.urTakeRetryPrompt && typeof onUrTakeRetry === "function" ? (
        <button
          type="button"
          className="ur-take-fail-soft-chip"
          onClick={() => onUrTakeRetry(m.urTakeRetryPrompt)}
        >
          Try again
        </button>
      ) : null}
      {fail.showUpgrade && typeof onUpgradePromptClick === "function" ? (
        <button type="button" className="ur-take-fail-soft-chip ur-take-fail-soft-chip--upgrade" onClick={onUpgradePromptClick}>
          See Pro
        </button>
      ) : null}
    </div>
  );
}

function WcUrTakePendingNudge({ dataConfidence, wcEventId, onViewWcMatch, message = null }) {
  if (resolveWcIntentFromMessage(message) === WC_INTENT.RULES) return null;
  if (!wcDataConfidenceNeedsCaution(dataConfidence)) return null;
  const id = wcEventId != null ? String(wcEventId).trim() : "";
  return (
    <p className="wc-ur-take-pending-nudge">
      Lineups still pending — check the match card before you bet.{" "}
      {id && typeof onViewWcMatch === "function" ? (
        <button type="button" className="wc-ur-take-pending-link" onClick={() => onViewWcMatch(id)}>
          View match
        </button>
      ) : null}
    </p>
  );
}

function UrTakeAiBubble({
  m,
  trackPlay,
  userQuestion = "",
  getTakeAuthHeaders,
  msgs = [],
  msgIndex = 0,
  golfSessionBoard = null,
  onUrTakeRetry = null,
  onUpgradePromptClick = null,
  onViewWcMatch = null,
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const dockFollowUps = getFollowUpSuggestions(m, userQuestion);
  const summaryText = stripEmbeddedFollowUpQuestions(
    stripLeadingUrTakeDisclaimersForDisplay(m.text),
    dockFollowUps,
  );
  const combined = `${summaryText}\n${m.deepText || ""}`;
  const hasThePlay = /\bTHE\s+PLAY\b/i.test(combined);
  const tracked =
    Boolean(trackPlay?.trackedIds?.length) &&
    m.msgId &&
    trackPlay.trackedIds.includes(m.msgId);
  const showTrack =
    Boolean(trackPlay?.enabled) && Boolean(m.msgId) && hasThePlay && typeof trackPlay.onTrack === "function";
  const takeId = String(m.takeMeta?.id || "").trim();
  const showBetSignal = Boolean(takeId && hasThePlay);
  const trustChips = m.takeMeta?.trust ? <UrTakeTrustChips trust={m.takeMeta.trust} /> : null;
  const wcConfidenceChip =
    String(m.sport || "").toLowerCase() === "worldcup" && m.dataConfidence ? (
      <span
        style={{
          display: "inline-block",
          marginTop: 8,
          marginRight: 8,
          padding: "4px 8px",
          borderRadius: 6,
          border: "1px solid rgba(0,245,233,0.25)",
          fontFamily: "var(--mono-font)",
          fontSize: 9,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: "rgba(0,245,233,0.75)",
        }}
      >
        {wcDataConfidenceChipLabel(m.dataConfidence)}
      </span>
    ) : null;
  const betSignalRow = (
    <UrTakeBetSignalPrompt
      takeId={takeId}
      takeMeta={m.takeMeta}
      getTakeAuthHeaders={getTakeAuthHeaders}
      enabled={showBetSignal}
    />
  );

  /**
   * Bubble rendering paths:
   * 1. `m.structured` from the API → `URTakeResponse` premium card.
   * 2. Else plain text matches parlay leg heuristics (`attemptParlayConversion`) → synthetic structured
   *    object (`callType: "parlay"`) and the same card (covers answers that never received structured JSON).
   * 3. Else `parseUrTakeResponse(summaryText).hasVisual` → `UrTakePlainTextVisual` (gradient + chunks).
   * 4. Else legacy `renderMessage` typography.
   * Breakdown toggles `renderUrTakeAiMessage` on `deepText` when present.
   */
  const effectiveStructured = resolveEffectiveUrTakeStructuredFromSummary(m, summaryText, userQuestion);

  if (effectiveStructured) {
    const parsedLiveRibbon = safeParseUrTakeResponse(summaryText);
    const structuredGameStateLine = parsedLiveRibbon.gameState
      ? stripUrTakeInlineMarkdown(parsedLiveRibbon.gameState)
      : "";

    const s = coerceStructuredForUrTakeCard(effectiveStructured);
    const structuralEdgeChip = resolveStructuralEdgeChipForMessage({
      msgs,
      msgIndex,
      sport: s.sport || m.sport,
      golfSessionBoard,
    });
    const structuredFallback = (
      <div
        className="ur-take-section-fallback"
        style={{
          padding: "14px 12px",
          borderRadius: 12,
          border: "1px solid rgba(0,245,233,0.18)",
          background: "rgba(8,12,16,0.92)",
          marginBottom: 4,
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono-font)",
            fontSize: 10,
            letterSpacing: 1.1,
            color: "#00F5E9",
            marginBottom: 10,
            opacity: 0.85,
          }}
        >
          CARD LAYOUT FALLBACK · PLAIN TEXT
        </div>
        {renderMessage(summaryText, { styleUrTakeSectionLabels: true })}
      </div>
    );
    return (
      <>
        {m.image && <img src={m.image} alt="" className="bubble-img" />}
        <UrTakeSectionErrorBoundary
          label="ur_take_structured_card"
          key={String(m.msgId || `struct-${summaryText.slice(0, 48)}`)}
          fallback={structuredFallback}
        >
          <URTakeResponse
            sport={s.sport}
            question={userQuestion}
            lean={s.lean}
            call={s.call}
            confidence={s.confidence}
            whyNow={s.whyNow}
            edge={s.edge}
            callType={s.callType}
            caveats={s.caveats}
            parlayLegs={s.parlayLegs}
            parlayTotalOdds={s.parlayTotalOdds}
            timestamp={s.timestamp}
            gameStateLine={structuredGameStateLine}
            liveScore={String(m.liveScore || "").trim()}
            estimatedEdge={m.estimatedEdge}
            takeMeta={m.takeMeta}
            structuralEdgeChip={structuralEdgeChip}
            dataConfidence={m.dataConfidence}
            nbaRelevance={m.nbaRelevance ?? null}
            nbaContextBar={buildNbaUrTakeContextBar({
              sport: s.sport,
              call: s.call,
              callType: s.callType,
              showLiveRibbon: Boolean(structuredGameStateLine || m.liveScore),
              gameStateLine: structuredGameStateLine,
              liveScore: String(m.liveScore || "").trim(),
              nbaRelevance: m.nbaRelevance ?? null,
              userQuestion,
              message: m,
            })}
          />
        </UrTakeSectionErrorBoundary>
        <WcUrTakePendingNudge
          dataConfidence={m.dataConfidence}
          wcEventId={m.wcEventId}
          onViewWcMatch={onViewWcMatch}
          message={m}
        />
        <UrTakeNextContinuationLine message={m} userQuestion={userQuestion} />
        {wcConfidenceChip}
        {trustChips}
        {betSignalRow}
        {m.chaseCalmFooter ? <UrTakeChaseCalmInset /> : null}
      </>
    );
  }

  if (m.urTakeFailSoft) {
    return (
      <>
        {m.image && <img src={m.image} alt="" className="bubble-img" />}
        <div className="bubble ai">
          {renderMessage(summaryText)}
          <UrTakeFailSoftActions
            m={m}
            onUrTakeRetry={onUrTakeRetry}
            onUpgradePromptClick={onUpgradePromptClick}
          />
        </div>
      </>
    );
  }

  const parsed = safeParseUrTakeResponse(summaryText);

  if (showBreakdown && m.deepText) {
    return (
      <>
        {m.image && <img src={m.image} alt="" className="bubble-img" />}
        <div className="ur-take-ai-panel ur-take-ai-panel--breakdown">
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
        <UrTakeNextContinuationLine message={m} userQuestion={userQuestion} />
        {wcConfidenceChip}
        {trustChips}
        {betSignalRow}
        {m.chaseCalmFooter ? <UrTakeChaseCalmInset /> : null}
      </>
    );
  }

  if (!parsed.hasVisual) {
    console.error("[SharpBrief] plain-text fallback (no structured + no visual parser match)", {
      hasStructuredField: Boolean(m.structured),
      textHead: summaryText.slice(0, 200),
    });
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
        <UrTakeNextContinuationLine message={m} userQuestion={userQuestion} />
        {wcConfidenceChip}
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
              Full Breakdown
            </button>
          </div>
        ) : null}
        {betSignalRow}
        {m.chaseCalmFooter ? <UrTakeChaseCalmInset /> : null}
      </>
    );
  }

  console.error("[SharpBrief] UrTakePlainTextVisual path (structured JSON missing)", {
    hasStructuredField: Boolean(m.structured),
    textHead: summaryText.slice(0, 200),
  });

  return (
    <>
      {m.image && <img src={m.image} alt="" className="bubble-img" />}
      <UrTakeSectionErrorBoundary
        label="ur_take_plain_visual"
        key={String(m.msgId || `visual-${summaryText.slice(0, 48)}`)}
        fallback={
          <div style={{ position: "relative", paddingBottom: 12 }}>
            <div
              style={{
                fontFamily: "var(--mono-font)",
                fontSize: 10,
                letterSpacing: 1.1,
                color: "#00F5E9",
                marginBottom: 10,
                opacity: 0.85,
              }}
            >
              VISUAL LAYOUT FALLBACK · PLAIN TEXT
            </div>
            {renderMessage(summaryText, { styleUrTakeSectionLabels: true })}
          </div>
        }
      >
        <div className="ur-take-ai-panel ur-take-ai-panel--visual">
          <UrTakePlainTextVisual
            sport={m.sport || "generic"}
            callType={typeof m.structured?.callType === "string" ? m.structured.callType : undefined}
            gameStateLine={parsed.gameState ? stripUrTakeInlineMarkdown(parsed.gameState) : ""}
            headlineDisplay={parsed.headline}
            bodyChunks={parsed.bodyChunks}
            closingDisplay={parsed.closing}
            confidence={parsed.confidence}
            compactBubble={true}
          />
          <UrTakeNextContinuationLine message={m} userQuestion={userQuestion} />

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
                  Full Breakdown
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
      </UrTakeSectionErrorBoundary>
      {wcConfidenceChip}
      {trustChips}
      {betSignalRow}
      {m.chaseCalmFooter ? <UrTakeChaseCalmInset /> : null}
    </>
  );
}

/** Owner / dev / staging hosts only — see `App.jsx` `urTakeClientFailure` on failed `/api/ur-take` turns. */
function UrTakeClientFailureDebugPre({ accessTier, payload }) {
  if (!payload || !shouldShowUrTakeClientFailureDebug(accessTier)) return null;
  return (
    <pre
      className="ur-take-client-failure-debug"
      style={{
        marginTop: 8,
        padding: 8,
        fontSize: 10,
        fontFamily: "var(--mono-font)",
        color: "var(--muted)",
        background: "rgba(0,0,0,0.35)",
        borderRadius: 8,
        maxHeight: 220,
        overflow: "auto",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {JSON.stringify(payload, null, 2)}
    </pre>
  );
}

/** Product-visible correlation for `fallback: true` feed-snag style responses (no DevTools). */
function UrTakeFeedSnagProductDiag({ diag }) {
  if (!diag || typeof diag !== "object") return null;
  const rid = String(diag.requestId || "").trim().slice(0, 32);
  const reason = String(diag.fallbackReason || "").trim().slice(0, 160);
  if (!rid && !reason) return null;
  return (
    <p
      className="ur-take-feed-snag-product-diag"
      style={{
        marginTop: 10,
        marginBottom: 0,
        fontFamily: "var(--mono-font)",
        fontSize: 10,
        lineHeight: 1.4,
        color: "rgba(0,245,233,0.5)",
        wordBreak: "break-all",
      }}
    >
      Debug: requestId={rid || "—"} reason={reason || "—"}
    </p>
  );
}

/** Free tier: after 2nd–3rd completed answer, eligible for one subtle Pro nudge (see ChatThread). */
function computeProUpgradeNudgeQualifies(msgs, accessTier, onUpgradeClick) {
  if (typeof onUpgradeClick !== "function") return false;
  if (accessTier !== "free") return false;
  if (!Array.isArray(msgs) || msgs.length === 0) return false;
  const userTurns = msgs.filter((m) => m && m.role === "user").length;
  const completedAi = msgs.filter((m) => m && m.role === "ai" && !m.loading).length;
  const last = msgs[msgs.length - 1];
  if (userTurns < 2 || userTurns > 3) return false;
  if (completedAi < 2 || completedAi !== userTurns) return false;
  if (!last || last.role !== "ai" || last.loading) return false;
  return true;
}

export function ChatThread({
  msgs,
  urTakeTrackPlay = null,
  accessTier = null,
  onUrTakeFollowUpPick = null,
  onUpgradePromptClick = null,
  onUrTakeRetry = null,
  onViewWcMatch = null,
  hideFollowUpDock = false,
  /** Live golf board for structural-edge chip (leaderboard + outrights). */
  golfSessionBoard = null,
  /** When "urChatDocked", thread fills Ask screen above fixed dock (flex layout). */
  variant = "default",
}) {
  const getTakeAuthHeaders = useTakeAuthHeaders();
  const chatThreadRef = useRef(null);
  const bottomAnchorRef = useRef(null);
  const dockScrollAnchorRef = useRef(null);
  const prevDockScrollSigRef = useRef("");
  /** Skip first effect — no auto-scroll on initial mount / restored thread. */
  const skipInitialScrollRef = useRef(true);
  const prevScrollSigRef = useRef("");
  /** Avoid double localStorage writes under React Strict Mode — keep nudge visible once committed on this mount. */
  const proUpgradeNudgeCommittedRef = useRef(false);
  const [proUpgradeNudgeVisible, setProUpgradeNudgeVisible] = useState(false);

  const bumpScrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      bottomAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, []);

  useLayoutEffect(() => {
    if (variant !== "urChatDocked") {
      prevDockScrollSigRef.current = "";
      return;
    }
    if (!msgs?.length) {
      prevDockScrollSigRef.current = "";
      return;
    }
    const last = msgs[msgs.length - 1];
    const sig = `${msgs.length}:${last?.loading ? "L" : "R"}:${last?.msgId || ""}`;
    if (sig === prevDockScrollSigRef.current) return;
    prevDockScrollSigRef.current = sig;

    requestAnimationFrame(() => {
      const node = dockScrollAnchorRef.current;
      if (!node) return;
      const pane = node.closest(".ur-chat-scroll");
      if (pane && typeof pane.scrollHeight === "number") {
        if (last?.loading) {
          pane.scrollTop = pane.scrollHeight;
        } else if (last?.role === "ai" && !last?.loading) {
          const nodeRect = node.getBoundingClientRect();
          const paneRect = pane.getBoundingClientRect();
          const delta = nodeRect.top - paneRect.top;
          pane.scrollTop = Math.max(0, pane.scrollTop + delta - 12);
        }
        return;
      }
      if (last?.loading) {
        node.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      } else if (last?.role === "ai" && !last?.loading) {
        node.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
      }
    });
  }, [msgs, variant]);

  useEffect(() => {
    if (variant === "urChatDocked") return;
    if (!msgs?.length) return;
    const last = msgs[msgs.length - 1];
    const streaming = Boolean(last?.loading);
    const sig = `${msgs.length}:${streaming ? 1 : 0}:${String(last?.text || "").length}:${last?.msgId || ""}`;

    const scrollBottom = () => {
      bumpScrollToBottom();
    };

    if (skipInitialScrollRef.current) {
      skipInitialScrollRef.current = false;
      prevScrollSigRef.current = sig;
      return;
    }
    if (sig === prevScrollSigRef.current) return;
    prevScrollSigRef.current = sig;
    scrollBottom();
  }, [msgs, variant, bumpScrollToBottom]);

  const dailyUsed = readFreeTierUsedToday();

  const followUpDockSource =
    !hideFollowUpDock &&
    variant !== "urChatDocked" &&
    typeof onUrTakeFollowUpPick === "function"
      ? getLastAiFollowUpDockSource(msgs)
      : null;

  useEffect(() => {
    const qualifies = computeProUpgradeNudgeQualifies(msgs, accessTier, onUpgradePromptClick);
    if (!qualifies) {
      setProUpgradeNudgeVisible(false);
      return;
    }
    if (proUpgradeNudgeCommittedRef.current) {
      setProUpgradeNudgeVisible(true);
      return;
    }
    try {
      if (typeof localStorage !== "undefined" && localStorage.getItem("ur_upgrade_nudge_shown") === "1") {
        setProUpgradeNudgeVisible(false);
        return;
      }
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("ur_upgrade_nudge_shown", "1");
      }
    } catch {
      setProUpgradeNudgeVisible(false);
      return;
    }
    proUpgradeNudgeCommittedRef.current = true;
    setProUpgradeNudgeVisible(true);
  }, [msgs, accessTier, onUpgradePromptClick]);

  const last = msgs?.length ? msgs[msgs.length - 1] : null;
  const showFreeFollowUpCue =
    accessTier === "free" &&
    dailyUsed === FREE_QUESTION_LIMIT - 1 &&
    last &&
    last.role === "ai" &&
    !last.loading;

  const docked = variant === "urChatDocked";
  const rowKey = (m, i) => m.msgId || `${m.role}-${i}-${m.loading ? "l" : "x"}`;

  if (!msgs || msgs.length === 0) return null;
  return (
    <div
      ref={chatThreadRef}
      className={`chat-thread${docked ? " chat-thread--ur-chat-dock" : ""}`}
      style={docked ? undefined : { marginBottom: 20 }}
    >
      {msgs.map((m, i) => {
        if (!m || typeof m !== "object") {
          return <div key={`invalid-row-${i}`} style={{ display: "none" }} aria-hidden />;
        }
        if (m.loading) {
          if (!docked) {
            return <LoadingBubble key={rowKey(m, i)} sport={m.sport} variant="default" />;
          }
          const anchorLast = docked && i === msgs.length - 1;
          return (
            <div
              key={rowKey(m, i)}
              ref={anchorLast ? dockScrollAnchorRef : undefined}
              className="ur-imessage-assistant-row"
            >
              <LoadingBubble sport={m.sport} variant={variant} />
            </div>
          );
        }

        let showUrTakeResponseBubbleHost = false;
        if (m.role === "ai" && !m.loading) {
          const priorUserQuestion = resolvePriorUserQuestionForAi(msgs, i);
          const hostSummary = stripEmbeddedFollowUpQuestions(
            stripLeadingUrTakeDisclaimersForDisplay(m.text),
            getFollowUpSuggestions(m, priorUserQuestion),
          );
          showUrTakeResponseBubbleHost = Boolean(
            resolveEffectiveUrTakeStructuredFromSummary(m, hostSummary, priorUserQuestion),
          );
        }

        const bubbleInner =
          m.role === "ai" ? (
            <>
              <UrTakeAiBubble
                m={m}
                msgs={msgs}
                msgIndex={i}
                golfSessionBoard={golfSessionBoard}
                trackPlay={urTakeTrackPlay}
                userQuestion={String(
                  [...msgs.slice(0, i)].reverse().find((x) => x.role === "user")?.text || "",
                )}
                getTakeAuthHeaders={getTakeAuthHeaders}
                onUrTakeRetry={onUrTakeRetry}
                onUpgradePromptClick={onUpgradePromptClick}
                onViewWcMatch={onViewWcMatch}
              />
              {m.urTakeFeedSnagDiag ? <UrTakeFeedSnagProductDiag diag={m.urTakeFeedSnagDiag} /> : null}
              <UrTakeClientFailureDebugPre accessTier={accessTier} payload={m.urTakeClientFailure} />
            </>
          ) : (
            <>
              {m.image && <img src={m.image} alt="" className="bubble-img" />}
              {renderMessage(m.text)}
            </>
          );

        const aiBubbleHostClass = showUrTakeResponseBubbleHost ? " ur-take-response-bubble-host" : "";

        if (m.role === "user") {
          return (
            <div
              key={rowKey(m, i)}
              className={`ur-imessage-user-row${docked ? " ur-imessage-user-row--dock" : ""}`}
            >
              <div
                className={`bubble user bubble--imessage-user${docked ? " bubble--imessage-user--caption" : ""}`}
                data-role="user"
              >
                {docked ? (
                  <>
                    <span className="ur-user-ask-kicker">You asked</span>
                    <span className="ur-user-ask-sep" aria-hidden>
                      {" "}
                      ·{" "}
                    </span>
                    <span className="ur-user-ask-body">
                      {m.image && <img src={m.image} alt="" className="bubble-img" />}
                      {renderMessage(m.text)}
                    </span>
                  </>
                ) : (
                  bubbleInner
                )}
              </div>
            </div>
          );
        }
        if (docked && m.role === "ai") {
          const anchorLast = i === msgs.length - 1;
          return (
            <div
              key={rowKey(m, i)}
              ref={anchorLast ? dockScrollAnchorRef : undefined}
              className="ur-imessage-assistant-row"
              data-msg-id={m.msgId || undefined}
            >
              <div
                className={`bubble ai bubble--imessage-ai${aiBubbleHostClass}`}
                data-role="assistant"
              >
                {bubbleInner}
              </div>
            </div>
          );
        }

        return (
          <div
            key={rowKey(m, i)}
            className={`bubble ai${aiBubbleHostClass}`}
            data-role="assistant"
          >
            {bubbleInner}
          </div>
        );
      })}
      {followUpDockSource?.followUps?.length ? (
        <div className="ur-thread-follow-ups">
          <UrTakeDockedFollowUps
            source={followUpDockSource}
            onPick={onUrTakeFollowUpPick}
            panelClassName="ur-take-follow-up-panel--thread"
          />
        </div>
      ) : null}
      {proUpgradeNudgeVisible ? (
        <div className="ur-thread-upgrade-nudge" aria-live="polite">
          <span className="ur-thread-upgrade-nudge-text">
            {THREAD_UPGRADE_NUDGE_TEXT}
          </span>
          <button
            type="button"
            className="ur-thread-upgrade-nudge-btn"
            onClick={() => onUpgradePromptClick?.()}
          >
            Upgrade
          </button>
        </div>
      ) : null}
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
          ⚡ One free take left — Pro gives the full read with THE PLAY
        </div>
      ) : null}
      <div ref={bottomAnchorRef} className="ur-chat-thread-anchor" aria-hidden="true" />
    </div>
  );
}
