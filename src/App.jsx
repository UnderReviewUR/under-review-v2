import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
  startTransition,
} from "react";
import { track } from "@vercel/analytics";
import {
  telemetryUrTakeLiveResponseGenerated,
  telemetryUrTakeFollowUpsAttached,
  telemetryUrTakeFollowUpSubmit,
  telemetryUrTakeFollowUpResponseCompleted,
} from "./lib/urTakeTelemetry.js";
import {
  FREE_QUESTION_LIMIT,
  freeTierApproachingLimit,
  incrementFreeTierUsedToday,
  isFreeTierQuotaAvailable,
  readFreeTierUsedToday,
} from "./lib/freeTierLimits.js";
import {
  UPGRADE_LIMIT_HIT_BODY,
  UPGRADE_LIMIT_HIT_HEADLINE,
  UPGRADE_MODAL_DAILY_TAGLINE,
} from "./lib/proUpgradeCopy.js";
import {
  formatLastLeanSportLabel,
  resolveMatchupLabelForLastLean,
  saveUrLastLean,
} from "./lib/urLastLean.js";
import { synthesizeLeanLine } from "./lib/urTakeLean.js";
import { PerformanceContext } from "./context/PerformanceContext.jsx";
import {
  THEMES,
  DEFAULT_THEME,
  resolveInitialTheme,
  validateThemeForTier,
  isProLightTheme,
  getDisplayModeChrome,
  canUseProThemes,
  getProMarketingTokens,
} from "./themes.js";
import AskBar from "./components/AskBar.jsx";
import ProCheckoutCTA from "./components/ProCheckoutCTA.jsx";
import StripeSubscriptionSync from "./components/StripeSubscriptionSync.jsx";
import { resolveF1RaceStart } from "./features/f1/raceStart.js";
import { buildHomeTrackerCards } from "./features/home/buildHomeTrackerCards.js";
import { buildDynamicHomeQuestions } from "./features/home/buildDynamicHomeQuestions.js";
import { buildDailyFeaturedAngleCard } from "./features/home/buildDailyFeaturedAngleCard.js";
import { buildPgaChampionshipOddsHomeCard } from "./features/home/buildPgaChampionshipOddsCard.js";
import { buildLiveEdgeAlerts } from "./features/home/buildLiveEdgeAlerts.js";
import { getGolfHomeValidity, isGolfEventFinished } from "./lib/golfEventStatus.js";
import {
  resolveGolfPrimaryEvent,
  stripMisalignedGolfCourseArtifacts,
} from "../shared/golfHomeEventSelection.js";
import {
  classifyMlbGame,
  classifyNbaGame,
  classifyTennisMatch,
  getDisplayableF1NextRace,
  isDisplayableValidity,
} from "../shared/eventValidity.js";
import {
  nbaEventKey,
  mlbEventKey,
  tennisEventKeyFromNormalized,
  f1EventKey,
} from "../shared/homeEventDedup.js";
import { golfKeyForLiveSnapshot } from "./lib/liveSnapshotEventKeys.js";
import {
  alignGolfBoardSnapshotForQuestion,
  extractGolfTournamentIntentFromQuestion,
  golfFeedUiMismatchesQuestionIntent,
} from "../shared/golfTournamentIntent.js";
import { buildHomeEventPipeline } from "../shared/homeEventPipeline/index.js";
import { trimToCompleteSentence } from "./lib/textUtils.js";
import { HOME_SURFACE_STACK_ORDER } from "../shared/homeEventPipeline/presentationOrder.js";
import { detectNflTeamHint, detectSportFromQuestion } from "./lib/detectSportFromQuestion.js";
import {
  inferSportFromChatHistory,
  inferSportFromQuestionText,
} from "../shared/urTakeSportRouting.js";
import { ensureUrTakeSportContext } from "./lib/ensureUrTakeSportContext.js";
import {
  alignMergedGamesToVerifiedSlate,
  augmentNbaRosterGroundingWithUi,
  filterNbaUiChipsForSlateAndInjuries,
  filterPlayerStatsToVerifiedTeams,
  filterPropLinesToVerifiedSlate,
  mergeNbaTodaysGames,
} from "./lib/nbaUiSurface.js";
import {
  collectPlayoffBracketTeamAbbrevs,
  slimNbaPlayerStatRowForUrTake,
} from "../shared/nbaUrTakeSlim.js";
import { getEtHour24 } from "./lib/nbaTime.js";
import {
  ChatThread,
  getLastAiFollowUpDockSource,
  buildNflContext,
  formatOverallStats,
  formatReturnStats,
  formatServeStats,
  formatAtpHomeSpotlightLine,
  golfScoreColor,
  isNflInSeason,
  chatHistoryForApi,
  normalizeText,
  preferredTournamentScore,
  buildContextualQuestion,
  inferUrTakeSportFromMessages,
} from "./features/app/helpers.jsx";

import { baseCss } from "./styles/appBaseCss.js";

/** Match api/ur-take resolveSportHint golf keywords — Home tab often has no sportHint; still send golfContext. */
function questionSuggestsGolf(text) {
  const q = String(text || "").toLowerCase();
  return (
    q.includes("golf") ||
    q.includes("outright") ||
    q.includes("harbour town") ||
    q.includes("rbc heritage") ||
    q.includes("masters") ||
    q.includes("pga")
  );
}
import { NFL_PLAYERS } from "./features/app/embedGolfNflData.js";
import { useTennisData } from "./hooks/useTennisData.js";
import { useF1Data } from "./hooks/useF1Data.js";
import { useNbaData } from "./hooks/useNbaData.js";
import { useMlbData } from "./hooks/useMlbData.js";
import { useGolfData } from "./hooks/useGolfData.js";
import { useWorldCupData } from "./hooks/useWorldCupData.js";
import { useNflData } from "./hooks/useNflData.js";
import { usePerformance } from "./hooks/usePerformance.js";
import { useTakeAuthHeaders } from "./hooks/useTakeAuthHeaders.js";
import DerbyHomeCard from "./components/DerbyHomeCard.jsx";
import { isDerbyActive } from "./data/derby2026.js";
import HomeScreen from "./screens/HomeScreen.jsx";
import TennisScreen from "./screens/TennisScreen.jsx";
import NflScreen from "./screens/NflScreen.jsx";
import NflPredictScreen from "./screens/NflPredictScreen.jsx";
import F1Screen from "./screens/F1Screen.jsx";
import NbaScreen from "./screens/NbaScreen.jsx";
import MlbScreen from "./screens/MlbScreen.jsx";
import GolfScreen from "./screens/GolfScreen.jsx";
import WorldCupScreen from "./screens/WorldCupScreen.jsx";
import AskScreen from "./screens/AskScreen.jsx";
import UrTakeDockedFollowUps from "./components/UrTakeDockedFollowUps.jsx";
import UrTakeProLedgerDashboard from "./components/UrTakeProLedgerDashboard.jsx";
import { readSavedTakes, pushSavedTake } from "./lib/savedTakes.js";
import { trackFunnelEvent } from "./lib/funnelAnalytics.js";
import { logUrTakeApiEnvelopeDev } from "./lib/urTakeRenderSafe.js";
import {
  buildUrTakeApiSuccessFallbackDebug,
  buildUrTakeClientFailureDebug,
} from "./lib/urTakeClientFailureDebug.js";
import {
  buildUrTakePreFetchLog,
  classifyUrTakeClientCatchPhase,
  fetchUrTakeWithNetworkRetry,
  userMessageForUrTakeClientFailure,
  UR_TAKE_PATH,
} from "./lib/urTakeFetch.js";

/** Renders follow-up pills above the docked Ask bar (single place for Ask + sport tabs). */
function UrTakeFollowUpDockStrip({ msgs, onPick }) {
  if (!Array.isArray(msgs) || msgs.length === 0 || typeof onPick !== "function") return null;
  const source = getLastAiFollowUpDockSource(msgs);
  if (!source?.followUps?.length) return null;
  return (
    <UrTakeDockedFollowUps
      source={source}
      onPick={onPick}
      panelClassName="ur-take-follow-up-panel--dock"
    />
  );
}

function formatHomeSlateKvUpdatedEt(iso) {
  const t = Date.parse(String(iso || ""));
  if (!Number.isFinite(t)) return "Last updated (saved slate)";
  return `Last updated ${new Date(t).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  })} ET`;
}

/** Home MLB cards only: treat missing / TBD / dash pitchers as absent (no probables line). */
function isConfirmedMlbProbablePitcher(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return false;
  return !/^(tbd|pitcher\s*tbd|probables\s*tbd|--?|—|n\/a)$/i.test(s);
}

/** Strip ``` / ```json fences — models often wrap JSON despite instructions. */
function stripResponseCodeFences(raw) {
  return String(raw ?? "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

/** When API omits `structured` but model returned raw JSON in `response`, recover stages 1–5 UI. */
function structuredPayloadFromApi(data) {
  if (data?.structured && typeof data.structured === "object") return data.structured;
  let raw = stripResponseCodeFences(String(data?.response ?? ""));
  if (!raw.startsWith("{")) {
    const brace = raw.indexOf("{");
    if (brace === -1) return null;
    raw = raw.slice(brace);
  }
  try {
    const o = JSON.parse(raw);
    if (!o || typeof o !== "object") return null;
    if (typeof o.call !== "string" || o.call.trim().length < 2) return null;
    const hasAnalysis =
      o.analysis &&
      typeof o.analysis === "object" &&
      (typeof o.analysis.matchupAnalysis === "string" ||
        typeof o.analysis.injuryContext === "string" ||
        typeof o.analysis.marketContext === "string");
    const hasCore =
      typeof o.whyNow === "string" ||
      typeof o.edge === "string" ||
      typeof o.confidence === "string" ||
      Array.isArray(o.caveats);
    if (hasAnalysis || hasCore) return o;
  } catch {
    return null;
  }
  return null;
}

/** Prevent React crashes / stringify failures from odd API `structured` shapes (common after golf reads). */
function sanitizeStructuredBubbleShape(raw) {
  if (!raw || typeof raw !== "object") return null;
  const clip = (v, max) => {
    if (v == null) return "";
    if (typeof v === "string") return v.slice(0, max).trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v).slice(0, max).trim();
    if (typeof v === "boolean") return String(v);
    return "";
  };

  const s = { ...raw };
  s.lean = clip(s.lean, 120);
  s.call = clip(s.call, 8000) || "—";
  s.whyNow = clip(s.whyNow, 8000);
  s.edge = clip(s.edge, 8000);
  s.confidence = clip(s.confidence, 120) || "Medium";
  s.sport = clip(s.sport, 80).toLowerCase() || "generic";
  s.callType = clip(s.callType, 48).toLowerCase() || "single";

  if (typeof s.timestamp === "symbol" || typeof s.timestamp === "bigint") {
    delete s.timestamp;
  } else if (s.timestamp != null && typeof s.timestamp !== "number" && typeof s.timestamp !== "string") {
    delete s.timestamp;
  }

  if (s.parlayTotalOdds != null && s.parlayTotalOdds !== "") {
    s.parlayTotalOdds = String(s.parlayTotalOdds).slice(0, 48);
  }

  if (Array.isArray(s.caveats)) {
    s.caveats = s.caveats
      .map((c) => {
        if (typeof c === "string" || typeof c === "number") return String(c).trim();
        return "";
      })
      .filter(Boolean);
  }
  if (Array.isArray(s.parlayLegs)) {
    s.parlayLegs = s.parlayLegs
      .filter((leg) => leg && typeof leg === "object")
      .map((leg) => ({
        play: String(leg.play ?? "").trim().slice(0, 240) || "Leg",
        rationale: typeof leg.rationale === "string" ? leg.rationale.slice(0, 1200) : "",
        odds: leg.odds != null && String(leg.odds).trim() !== "" ? String(leg.odds) : "TBD",
      }))
      .slice(0, 12);
  }
  s.lean = synthesizeLeanLine({ lean: s.lean, call: s.call, whyNow: s.whyNow });
  return s;
}

function normalizeUrTakeDisplay(data) {
  const parseMaybe = (raw) => {
    const s = String(raw || "").trim();
    if (!s) return null;
    try {
      return JSON.parse(s);
    } catch {
      const m = s.match(/\{[\s\S]*\}\s*$/);
      if (!m) return null;
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
  };

  let response = String(data?.response || "").trim();
  let responseDeep = typeof data?.responseDeep === "string" ? data.responseDeep.trim() : null;

  const nested = parseMaybe(response);
  if (nested && typeof nested.summary === "string" && nested.summary.trim()) {
    response = nested.summary.trim();
    if (!responseDeep && typeof nested.deep === "string" && nested.deep.trim()) {
      responseDeep = nested.deep.trim();
    }
  }

  return {
    response: response || "Couldn't get a response — try again.",
    responseDeep,
  };
}

/** Aligns with server-side thesis extraction for session memory fusion. */
function extractPlayThesisFields(playText) {
  const src = String(playText || "");
  const playerMatch = src.match(
    /([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(over|under|fade)/i,
  );
  const player = playerMatch ? String(playerMatch[1]).trim() : null;
  const directionMatch = src.match(/\b(over|under|fade|back)\b/i);
  const direction = directionMatch ? String(directionMatch[1]).toLowerCase() : null;
  const lineMatch = src.match(/\b(\d+\.?\d*)\b/);
  const line = lineMatch ? String(lineMatch[1]) : null;
  const marketMatch = src.match(
    /\b(points|rebounds|assists|steals|blocks|PRA|total|spread|moneyline)\b/i,
  );
  const market = marketMatch ? String(marketMatch[1]).toLowerCase() : null;
  const anchorMatch = src.match(/\d+\.?\d*\s+\w+[^\n]{0,60}/);
  const anchor = anchorMatch
    ? String(anchorMatch[0])
        .replace(/[·—\-]/g, "")
        .trim()
        .slice(0, 60)
    : null;
  return { player, market, direction, line, anchor };
}

// ── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTheme, setActiveTheme] = useState(resolveInitialTheme);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ur_theme", activeTheme);
    }
  }, [activeTheme]);

  const themeCss = THEMES[activeTheme]?.css || THEMES[DEFAULT_THEME].css;

  const css = `
${baseCss}
/* UR docked chat scroll inset: max(nav, bottom-offset+dock) from --ur-dock-measured-h / --ur-nav-measured-h (App.jsx) + --ur-vv-rise + buffer — appBaseCss.js */
${themeCss}
`;

  const [tab, setTab] = useState("home");
  const [screen, setScreen] = useState("home");
  /** NFL tab: UR Take chat vs 2026 predictor (?predictor=1, ?share=, ?picks=, /predict-nfl, or /nfl path opens predictor). */
  const [nflUrView, setNflUrView] = useState("take");
  /** Stack of { screen, tab } snapshots for header back + swipe-back. */
  const [navHistory, setNavHistory] = useState([]);
  const [selectedMatchup, setSelectedMatchup] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedNflPlayer, setSelectedNflPlayer] = useState(null);
  const [nflPosFilter, setNflPosFilter] = useState("ALL");

  // Per-screen inputs — never shared — prevents 1-char typing bug
  const [askInput, setAskInput]         = useState("");
  const [tennisInput, setTennisInput]   = useState("");
  const [wtaInput, setWtaInput]         = useState("");
  const [wtaSectionOpen, setWtaSectionOpen] = useState(false);
  const [nflInput, setNflInput]         = useState("");
  const [f1Input, setF1Input]           = useState("");
  const [nbaInput, setNbaInput]         = useState("");
  /** Canonical `nbaEventKey` for the Home NBA card the user last tapped — sorts UR Take `todaysGames` first. */
  const [nbaUrTakeFocusGameKey, setNbaUrTakeFocusGameKey] = useState(null);
  const [mlbInput, setMlbInput]         = useState("");
  const [matchupInput, setMatchupInput] = useState("");

  // Per-screen message threads
  const [askMsgs, setAskMsgs]         = useState([]);
  const [savedTakes, setSavedTakes]   = useState([]);
  const [tennisMsgs, setTennisMsgs]   = useState([]);
  const [nflMsgs, setNflMsgs]         = useState([]);
  const [f1Msgs, setF1Msgs]           = useState([]);
  const [nbaMsgs, setNbaMsgs]         = useState([]);
  const [mlbMsgs, setMlbMsgs]         = useState([]);
  const [matchupMsgs, setMatchupMsgs] = useState([]);

  const [isAsking, setIsAsking]         = useState(false);
  const [prefetchingUrTakeContext, setPrefetchingUrTakeContext] = useState(false);
  const [pastedImage, setPastedImage]   = useState(null);
  const [golfInput, setGolfInput]       = useState("");
  const [golfMsgs, setGolfMsgs]         = useState([]);
  const [wcInput, setWcInput]           = useState("");
  const [wcMsgs, setWcMsgs]             = useState([]);
  const [trackedPlays, setTrackedPlays] = useState([]);
  const [trackedUrTakeMessageIds, setTrackedUrTakeMessageIds] = useState([]);
  const [trackerLoaded, setTrackerLoaded] = useState(false);
  const [syncErrorPlayId, setSyncErrorPlayId] = useState(null);
  const swipeTouchStartRef = useRef(null);
  const lastAttemptedResult = useRef({});
  /** Synchronous guard so double-submit cannot overlap /api/ur-take before React re-renders isAsking. */
  const urTakeInFlightRef = useRef(false);

  // Separate inputRef per screen — critical for AskBar memo optimization
  const askInputRef       = useRef(null);
  /** Remember last resolved sport from UR TAKE so generic Ask follow-ups still send NBA/golf/etc. context. */
  const lastUrTakeSportRef = useRef(null);
  /** From daily preview CTA — UR Ask tab does not infer sport from `screen` once navigated from Home. */
  const pendingExplicitSportHintRef = useRef(null);
  const tennisInputRef    = useRef(null);
  const wtaInputRef       = useRef(null);
  const nflInputRef       = useRef(null);
  const f1InputRef        = useRef(null);
  const nbaInputRef       = useRef(null);
  const mlbInputRef       = useRef(null);
  const golfInputRef      = useRef(null);
  const wcInputRef        = useRef(null);
  const golfBarRef        = useRef(null);
  const wcBarRef          = useRef(null);
  const tennisBarRef      = useRef(null);
  const nflBarRef         = useRef(null);
  const f1BarRef          = useRef(null);
  const nbaBarRef         = useRef(null);
  const mlbBarRef         = useRef(null);
  const askScreenRef      = useRef(null);
  const tennisScreenRef   = useRef(null);
  const nflScreenRef      = useRef(null);
  const f1ScreenRef       = useRef(null);
  const nbaScreenRef      = useRef(null);
  const mlbScreenRef      = useRef(null);
  const golfScreenRef     = useRef(null);
  const wcScreenRef       = useRef(null);
  const matchupScreenRef  = useRef(null);
  const matchupInputRef   = useRef(null);
  const playerInputRef    = useRef(null);
  const nflPlayerInputRef = useRef(null);
  const fileInputRef      = useRef(null);
  /** Pending scroll scheduling timeouts — cleared on unmount */
  const pendingScrollTimeoutIdsRef = useRef([]);

  const nflSeasonMode = useMemo(() => isNflInSeason(), []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    let debounceId = 0;
    const syncKeyboardHeight = () => {
      if (debounceId) window.clearTimeout(debounceId);
      debounceId = window.setTimeout(() => {
        debounceId = 0;
        const keyboardHeight = Math.max(0, window.innerHeight - vv.height);
        document.documentElement.style.setProperty("--keyboard-height", `${keyboardHeight}px`);
      }, 32);
    };
    vv.addEventListener("resize", syncKeyboardHeight);
    window.addEventListener("orientationchange", syncKeyboardHeight);
    syncKeyboardHeight();
    return () => {
      if (debounceId) window.clearTimeout(debounceId);
      vv.removeEventListener("resize", syncKeyboardHeight);
      window.removeEventListener("orientationchange", syncKeyboardHeight);
    };
  }, []);

  // Detect Stripe redirect back to app (?pro=success&email=…)
  const [proCheckoutState] = useState(() => {
    if (typeof window === "undefined") return { success: false, email: "" };
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("pro") === "success") {
        const email = String(sp.get("email") || "").trim().toLowerCase();
        window.history.replaceState({}, "", window.location.pathname);
        return { success: true, email };
      }
    } catch {
      /* ignore */
    }
    return { success: false, email: "" };
  });
  const proSuccess = proCheckoutState.success;
  const proCheckoutEmail = proCheckoutState.email;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const sp = new URLSearchParams(window.location.search);
      const path = window.location.pathname || "";
      if (
        sp.has("predictor") ||
        sp.get("share") ||
        sp.get("picks") ||
        /\/predict-nfl/i.test(path) ||
        path.endsWith("/nfl")
      ) {
        /* eslint-disable react-hooks/set-state-in-effect -- NFL share/picks URL opens predictor on cold load */
        setTab("nfl");
        setScreen("nfl");
        setNflUrView("predict");
        /* eslint-enable react-hooks/set-state-in-effect */
      }
    } catch {
      /* ignore */
    }
  }, []);

  const [magicLinkError, setMagicLinkError] = useState("");

  // ── Access tier ─────────────────────────────────────────────────────────────
  // tier: "free" | "friend" | "owner" | "pro"
  const [accessTier, setAccessTier] = useState(() => {
    if (typeof window === "undefined") return "free";
    try {
      const token = localStorage.getItem("ur_access_token");
      if (token) {
        const b64 = token.split(".")[0];
        const payload = JSON.parse(atob(b64));
        if (!payload.expiresAt || new Date() < new Date(payload.expiresAt)) {
          return payload.tier || "free";
        }
      }
    } catch {
      /* malformed access token */
    }
    return "free";
  });
  const [, setAccessToken] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("ur_access_token") || "" : ""
  );

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const sp0 = new URLSearchParams(window.location.search);
    if (sp0.get("magic_link") === "invalid") {
      startTransition(() => {
        setMagicLinkError(
          "That login link is invalid, expired, or already used. Use Restore Pro access below to get a new link.",
        );
      });
      sp0.delete("magic_link");
      const q = sp0.toString();
      window.history.replaceState({}, "", q ? `${window.location.pathname}?${q}` : window.location.pathname);
    }

    const { hash, search, pathname } = window.location;
    if (!hash.startsWith("#ur_access_token=")) return;
    const m = /^#ur_access_token=([^&]+)/.exec(hash);
    if (!m) return;
    const token = decodeURIComponent(m[1]);
    try {
      localStorage.setItem("ur_access_token", token);
      const b64 = token.split(".")[0];
      const payload = JSON.parse(atob(b64));
      if (payload.email) {
        localStorage.setItem("ur_email", String(payload.email).trim().toLowerCase());
      }
      if (!payload.expiresAt || new Date(payload.expiresAt) >= new Date()) {
        startTransition(() => {
          setAccessTier(payload.tier || "pro");
          setAccessToken(token);
        });
      }
    } catch {
      /* malformed */
    }
    window.history.replaceState(null, "", pathname + (search || ""));
  }, []);

  // ── User email (Pro session / tracking; optional until user signs in or checks out) ──
  const [userEmail, setUserEmail] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("ur_email") || "" : ""
  );
  const [bettingStyle, setBettingStyle] = useState(() => {
    try {
      return localStorage.getItem("ur_betting_style") || "balanced";
    } catch {
      return "balanced";
    }
  });
  const [styleToast, setStyleToast] = useState("");

  const getTakeAuthHeaders = useTakeAuthHeaders();

  const {
    players,
    context,
    liveMatches,
    liveMatchesBoard,
    liveMatchesHome,
    tennisLoading,
    hasStaticTennisIntel,
    staticIntelFetchFailed,
  } = useTennisData();
  const { f1Data, f1Loading } = useF1Data();
  const { nbaData, nbaLoading, nbaGames, getSeriesLabel } = useNbaData();
  /** Latest verified NBA slate for UR Take — filled after `homePipeline` runs (see below). */
  const verifiedNbaSlateForTakeRef = useRef([]);
  const { mlbData, mlbLoading, mlbGames } = useMlbData();
  const { golfData, golfLoading } = useGolfData();
  const { wcLoading, groups, matches: wcMatches, liveMatches: wcLiveMatches, upcomingMatches: wcUpcomingMatches, teams: wcTeams } = useWorldCupData();
  const { nflContextData } = useNflData();
  const {
    performanceData,
    performanceLoading,
    performanceError,
    loadPerformanceSnapshot,
  } = usePerformance(userEmail, getTakeAuthHeaders);

  /** Public aggregate from GET /api/performance (no auth) — Pro ledger headline only. */
  const [publicStats, setPublicStats] = useState(null);
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch("/api/performance");
        if (cancel) return;
        if (res.status === 204) return;
        if (!res.ok) return;
        const data = await res.json();
        if (
          data &&
          typeof data.totalTakes === "number" &&
          typeof data.highConfidenceWinRate === "number"
        ) {
          setPublicStats(data);
        }
      } catch {
        /* fail silent — no chip */
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [freeUsedRevision, setFreeUsedRevision] = useState(0);
  const [lastLeanRevision, setLastLeanRevision] = useState(0);
  const [freeLimitChipDismissedSession, setFreeLimitChipDismissedSession] = useState(() => {
    try {
      return sessionStorage.getItem("ur_free_limit_chip_dismissed") === "1";
    } catch {
      return false;
    }
  });
  const [showRestoreAccessModal, setShowRestoreAccessModal] = useState(false);
  const [restoreAccessEmail, setRestoreAccessEmail] = useState("");
  const [restoreAccessError, setRestoreAccessError] = useState("");
  const [restoreAccessBusy, setRestoreAccessBusy] = useState(false);
  const [restoreAccessLinkSent, setRestoreAccessLinkSent] = useState(false);
  const [showCodeEntry, setShowCodeEntry] = useState(false);
  const [openingBillingPortal, setOpeningBillingPortal] = useState(false);
  const [codeInput, setCodeInput]         = useState("");
  const [codeError, setCodeError]         = useState("");
  const [codeLoading, setCodeLoading]     = useState(false);
  const isUnlimited = accessTier === "owner" || accessTier === "friend" || accessTier === "pro";
  const FREE_LIMIT = FREE_QUESTION_LIMIT;

  const freeUsedCount = useMemo(() => {
    void freeUsedRevision;
    return readFreeTierUsedToday();
  }, [freeUsedRevision]);

  const accessTierRef = useRef(accessTier);
  useEffect(() => {
    accessTierRef.current = accessTier;
  }, [accessTier]);

  /** Post–Stripe redirect (?pro=success): awaiting magic email → unlocked, or stuck after timeout */
  const [postCheckoutBanner, setPostCheckoutBanner] = useState(null);

  useLayoutEffect(() => {
    if (!proSuccess) return;
    const elite =
      accessTier === "pro" || accessTier === "owner" || accessTier === "friend";
    if (elite) {
      setPostCheckoutBanner("unlocked");
      return;
    }
    setPostCheckoutBanner((prev) => (prev === "stuck" ? "stuck" : "awaiting_email"));
  }, [proSuccess, accessTier]);

  useEffect(() => {
    if (!proSuccess) return;
    const id = window.setTimeout(() => {
      const t = accessTierRef.current;
      if (t !== "pro" && t !== "owner" && t !== "friend") {
        setPostCheckoutBanner("stuck");
      }
    }, 10_000);
    return () => window.clearTimeout(id);
  }, [proSuccess]);

  /** Hide success banner after unlock — awaiting/stuck stay visible */
  const UNLOCKED_BANNER_DISMISS_MS = 6000;
  useEffect(() => {
    if (postCheckoutBanner !== "unlocked") return;
    const id = window.setTimeout(() => {
      setPostCheckoutBanner(null);
    }, UNLOCKED_BANNER_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [postCheckoutBanner]);

  const openRestoreAccessModal = useCallback(() => {
    const pref =
      (typeof localStorage !== "undefined" && localStorage.getItem("ur_email")) ||
      userEmail ||
      "";
    setRestoreAccessEmail(pref);
    setRestoreAccessError("");
    setRestoreAccessLinkSent(false);
    setShowRestoreAccessModal(true);
  }, [userEmail]);

  const submitRestoreAccess = useCallback(async () => {
    const email = String(restoreAccessEmail || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setRestoreAccessError("Enter a valid email address.");
      return;
    }
    setRestoreAccessBusy(true);
    setRestoreAccessError("");
    try {
      try {
        localStorage.setItem("ur_email", email);
      } catch {
        /* ignore */
      }
      setUserEmail(email);
      const res = await fetch("/api/auth/request-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      await res.json().catch(() => ({}));
      if (res.ok) {
        setRestoreAccessLinkSent(true);
        setShowUpgradeModal(false);
        return;
      }
      setRestoreAccessError("Could not reach the server. Try again.");
    } catch {
      setRestoreAccessError("Could not reach the server. Try again.");
    } finally {
      setRestoreAccessBusy(false);
    }
  }, [restoreAccessEmail, setUserEmail]);

  /** Opens email modal (e.g. Pro checkout “already pro” or “Restore access” links). */
  const restoreProEntitlement = useCallback(async () => {
    openRestoreAccessModal();
  }, [openRestoreAccessModal]);

  const handleBettingStyleChange = useCallback((style) => {
    const next = style === "limits" ? "limits" : "balanced";
    try {
      localStorage.setItem("ur_betting_style", next);
    } catch {}
    setBettingStyle(next);
    setStyleToast(next === "limits"
      ? "🔥 UR Take will now give you bold, high-conviction calls."
      : "⚡ UR Take will now give you the full picture to decide."
    );
    setTimeout(() => setStyleToast(""), 2000);
  }, []);

  const handleMarkResult = useCallback(
    async (playId, result) => {
      const email =
        userEmail ||
        (typeof localStorage !== "undefined" ? localStorage.getItem("ur_email") : "") ||
        "";
      if (!email) return;

      const previousPlays = trackedPlays;
      lastAttemptedResult.current[playId] = result;

      setTrackedPlays((prev) =>
        prev.map((p) =>
          p.playId === playId ? { ...p, result, resultMarkedAt: Date.now() } : p,
        ),
      );

      try {
        const authHeaders = await getTakeAuthHeaders();
        const res = await fetch("/api/track-play", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({ action: "mark", email, playId, result }),
        });
        if (!res.ok) throw new Error("sync_failed");
        setSyncErrorPlayId((cur) => (cur === playId ? null : cur));
      } catch {
        setTrackedPlays(previousPlays);
        setSyncErrorPlayId(playId);
        setTimeout(() => setSyncErrorPlayId(null), 4000);
      }
    },
    [userEmail, getTakeAuthHeaders, trackedPlays],
  );

  const handleClearMemory = useCallback(
    async (clearType) => {
      const email =
        userEmail ||
        (typeof localStorage !== "undefined" ? localStorage.getItem("ur_email") : "") ||
        "";
      if (!email) return;

      const confirmed = window.confirm(
        clearType === "all"
          ? "Clear your session memory and play tracker? This cannot be undone."
          : `Clear your ${clearType}? This cannot be undone.`,
      );
      if (!confirmed) return;

      try {
        const authHeaders = await getTakeAuthHeaders();
        const res = await fetch("/api/clear-memory", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({ email, type: clearType }),
        });
        if (!res.ok) return;
        if (clearType === "tracker" || clearType === "all") {
          setTrackedPlays([]);
        }
      } catch {
        /* ignore */
      }
    },
    [userEmail, getTakeAuthHeaders],
  );

  const handleTrackPlay = useCallback(
    async (message) => {
      try {
        const email =
          userEmail ||
          (typeof localStorage !== "undefined" ? localStorage.getItem("ur_email") : "") ||
          "";
        if (!email) return;
        const content = `${message.text || ""}\n${message.deepText || ""}`;
        const playMatch = content.match(/THE PLAY[:\s]+([^\n]{10,300})/i);
        const play = playMatch
          ? String(playMatch[1]).trim()
          : String(message.text || "").slice(0, 200);
        if (!play || play.length < 10) return;
        const confFromMeta = String(message.takeMeta?.confidence || "");
        const confMatch = content.match(/confidence[:\s]+(High|Medium|Speculative)/i);
        const confidence = /\bHigh\b/i.test(confFromMeta)
          ? "High"
          : /\bSpeculative\b/i.test(confFromMeta)
            ? "Speculative"
            : /\bMedium\b/i.test(confFromMeta)
              ? "Medium"
              : confMatch
                ? confMatch[1]
                : "Medium";
        const sport = String(message.sport || screen || "unknown").trim() || "unknown";
        const authHeaders = await getTakeAuthHeaders();
        const res = await fetch("/api/track-play", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            action: "save",
            email,
            play,
            sport,
            confidence,
            takeText: String(message.text || "").slice(0, 500),
          }),
        });
        if (!res.ok) return;
        const savePayload = await res.json().catch(() => ({}));
        if (message.msgId) {
          setTrackedUrTakeMessageIds((prev) =>
            prev.includes(message.msgId) ? prev : [...prev, message.msgId],
          );
        }
        const thesis = extractPlayThesisFields(play);
        if (thesis.player) {
          void (async () => {
            try {
              const dateStr = new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
              await fetch("/api/save-memory", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders },
                body: JSON.stringify({
                  email,
                  take: {
                    v: 1,
                    sport,
                    play: play.slice(0, 200),
                    player: thesis.player,
                    market: thesis.market,
                    direction: thesis.direction,
                    line: thesis.line,
                    anchor: thesis.anchor,
                    confidence,
                    date: dateStr,
                  },
                }),
              });
            } catch {
              /* fire-and-forget */
            }
          })();
        }
        if (Array.isArray(savePayload?.plays)) {
          setTrackedPlays(savePayload.plays);
        } else {
          const r2 = await fetch(`/api/track-play?email=${encodeURIComponent(email)}`, {
            headers: { ...authHeaders },
          });
          const d2 = await r2.json().catch(() => null);
          if (d2?.plays) setTrackedPlays(d2.plays);
        }
      } catch {
        /* never surface */
      }
    },
    [userEmail, getTakeAuthHeaders, screen],
  );

  const urTakeTrackPlay = useMemo(
    () => ({
      enabled: isUnlimited,
      trackedIds: trackedUrTakeMessageIds,
      onTrack: handleTrackPlay,
    }),
    [isUnlimited, trackedUrTakeMessageIds, handleTrackPlay],
  );

  useEffect(() => {
    if (!isUnlimited) return;
    const email =
      userEmail ||
      (typeof localStorage !== "undefined" ? localStorage.getItem("ur_email") : "") ||
      "";
    let cancelled = false;
    if (!email) {
      startTransition(() => setTrackerLoaded(true));
      return () => {
        cancelled = true;
      };
    }
    void (async () => {
      try {
        const authHeaders = await getTakeAuthHeaders();
        const res = await fetch(`/api/track-play?email=${encodeURIComponent(email)}`, {
          headers: { ...authHeaders },
        });
        const data = await res.json().catch(() => null);
        if (!cancelled && data?.plays) startTransition(() => setTrackedPlays(data.plays));
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) startTransition(() => setTrackerLoaded(true));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isUnlimited, userEmail, getTakeAuthHeaders]);

  const proMarketing = useMemo(() => getProMarketingTokens(activeTheme), [activeTheme]);

  useEffect(() => {
    startTransition(() => {
      setActiveTheme((prev) => validateThemeForTier(prev, accessTier));
    });
  }, [accessTier]);

  // Redeem access code
  const redeemCode = useCallback(async () => {
    if (!codeInput.trim()) return;
    setCodeLoading(true); setCodeError("");
    try {
      const res  = await fetch("/api/access", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ code: codeInput.trim() }) });
      let data = {};
      try {
        data = await res.json();
      } catch {
        setCodeError("Invalid response from server.");
        setCodeLoading(false);
        return;
      }
      if (!res.ok) {
        setCodeError(data.message || data.error || "Could not verify code.");
        setCodeLoading(false);
        return;
      }
      if (data.valid) {
        localStorage.setItem("ur_access_token", data.token);
        setAccessToken(data.token);
        setAccessTier(data.tier);
        setShowCodeEntry(false);
        setCodeInput("");
      } else {
        setCodeError(data.error || "Invalid code. Check with whoever shared it.");
      }
    } catch {
      setCodeError("Something went wrong. Try again.");
    }
    setCodeLoading(false);
  }, [codeInput]);

  // Check if user can ask — called before every query
  const canAsk = useCallback(() => {
    if (isUnlimited) return true;

    if (!isFreeTierQuotaAvailable(readFreeTierUsedToday(), FREE_LIMIT)) {
      setShowUpgradeModal(true);
      return false;
    }

    return true;
  }, [isUnlimited, FREE_LIMIT]);

  // ── Image handling ─────────────────────────────────────────────────────────
  const processImageFile = useCallback(file => {
    if (!file||!file.type.startsWith("image/")) return;
    const reader=new FileReader();
    reader.onload=e => { const d=e.target.result; setPastedImage({base64:d.split(",")[1],mediaType:file.type,previewUrl:d}); };
    reader.readAsDataURL(file);
  }, []);

  const clearImage = useCallback(() => { setPastedImage(null); if(fileInputRef.current) fileInputRef.current.value=""; }, []);

  useEffect(() => {
    const handle=e => { const items=e.clipboardData?.items; if(!items)return; for(const item of items){ if(item.type.startsWith("image/")){ e.preventDefault(); const f=item.getAsFile(); if(f) processImageFile(f); break; } } };
    window.addEventListener("paste",handle);
    return ()=>window.removeEventListener("paste",handle);
  }, [processImageFile]);

  // ── Context builders ───────────────────────────────────────────────────────
  const buildF1Context = useCallback((f1SrcOverride = null) => {
  const f1Src = f1SrcOverride ?? f1Data;
  if (!f1Src) return null;

  return {
    standings: Array.isArray(f1Src.standings) ? f1Src.standings : [],
    schedule: f1Src.schedule || { races: [], upcoming: [], past: [], current: [], usingFallback: true },
    session: f1Src.session || null,
    sessions: Array.isArray(f1Src.sessions) ? f1Src.sessions : [],
    qualifyingGrid: Array.isArray(f1Src.qualifyingGrid) ? f1Src.qualifyingGrid.slice(0, 10) : [],
    qualifyingNote: f1Src.qualifyingNote || null,
    weather: f1Src.weather || null,
    usingFallback: !!f1Src.usingFallback,
    ...(f1Src.openf1TimingSource
      ? {
          openf1TimingSource: f1Src.openf1TimingSource,
          ...(f1Src.openf1TimingHost ? { openf1TimingHost: f1Src.openf1TimingHost } : {}),
        }
      : {}),
  };
}, [f1Data]);

  const buildNbaContext = useCallback(
    (
      questionText,
      nbaDataOverride = null,
      verifiedSlateGames = [],
      focusGameKey = null,
      playoffTeamAbbrevs = null,
    ) => {
      const src = nbaDataOverride ?? nbaData;
      const fromSrc = Array.isArray(src?.todaysGames) ? src.todaysGames : [];
      const fromLocal = Array.isArray(nbaGames) ? nbaGames : [];
      const mergedAll = mergeNbaTodaysGames(fromSrc, fromLocal);
      let mergedTodaysGames = alignMergedGamesToVerifiedSlate(mergedAll, verifiedSlateGames);

      if (focusGameKey && mergedTodaysGames.length > 0) {
        mergedTodaysGames = [...mergedTodaysGames].sort((a, b) => {
          const ak = nbaEventKey(a) === focusGameKey ? 1 : 0;
          const bk = nbaEventKey(b) === focusGameKey ? 1 : 0;
          return bk - ak;
        });
      }

      const slateMeta = src?.todaysGamesSlateMeta || null;
      const filteredProps = filterPropLinesToVerifiedSlate(src?.propLines, mergedTodaysGames);
      let filteredStats = filterPlayerStatsToVerifiedTeams(src?.playerStats, mergedTodaysGames);
      const seasonCtx = src?.seasonContext || {};
      const bracketTeams =
        playoffTeamAbbrevs != null
          ? new Set(
              (Array.isArray(playoffTeamAbbrevs) ? playoffTeamAbbrevs : []).map((a) =>
                String(a || "").toUpperCase(),
              ),
            )
          : collectPlayoffBracketTeamAbbrevs(src?.playoffSeries || []);
      const usePlayoffTeamScope =
        seasonCtx.postseason === true &&
        bracketTeams.size >= 4 &&
        Array.isArray(src?.playoffSeries) &&
        src.playoffSeries.length > 0;
      if (usePlayoffTeamScope) {
        filteredStats = filteredStats.filter((row) =>
          bracketTeams.has(String(row?.team || "").toUpperCase()),
        );
      }
      filteredStats = filteredStats.map(slimNbaPlayerStatRowForUrTake);
      const teamsTonight = new Set();
      for (const g of mergedTodaysGames) {
        const aa = String(g?.awayTeam?.abbr || "").toUpperCase();
        const ha = String(g?.homeTeam?.abbr || "").toUpperCase();
        if (aa) teamsTonight.add(aa);
        if (ha) teamsTonight.add(ha);
      }
      const filteredInjuries = (Array.isArray(src?.injuries) ? src.injuries : []).filter((row) =>
        teamsTonight.has(String(row?.team || "").toUpperCase()),
      );
      const uiChips = filterNbaUiChipsForSlateAndInjuries(mergedTodaysGames, filteredInjuries);
      const rosterGroundingMerged = augmentNbaRosterGroundingWithUi(
        src?.rosterGrounding || null,
        mergedTodaysGames,
      );
    return {
      seasonContext:   src?.seasonContext || {},
      todaysGames:     mergedTodaysGames,
      todaysGamesTrustNote:
        mergedTodaysGames.length === 0
          ? getEtHour24() < 12
            ? "Opening NBA slate loads here first — ask about props, matchups, or history and we'll use what's in the bundle."
            : "Opening NBA slate loads here first — try again shortly or ask about a specific player."
          : "todaysGames is restricted to the verified displayable slate (same gates as Home). Props/stats filtered to these games.",
      /** When the slate is empty but BDL responded OK — tells UR Take it is a real off day vs. pipeline failure */
      todaysGamesSlateMeta: slateMeta,
      todaysGamesSlateNote:
        mergedTodaysGames.length === 0 && slateMeta?.note ? slateMeta.note : null,
      lastNight:       src?.lastNight     || [],
      lastNightStats:  src?.lastNightStats|| [],
      liveStats:       src?.liveStats     || [],
      playerStats:     filteredStats,
      /** Pre-rendered lines for LLM — team sourced from game box when statsSource is game_box */
      playerStatsText: mergedTodaysGames.length === 0 ? "" : src?.playerStatsText || "",
      statsSource:     mergedTodaysGames.length === 0 ? "" : src?.statsSource || "",
      propLines:       filteredProps.slice(0, 120),
      propsOdds:       src?.propsOdds || null,
      propsOddsStale:  Boolean(src?.propsOddsStale ?? src?.propsOdds?.freshness?.isStale),
      propsOddsByGameId: src?.propsOddsByGameId || null,
      propsOddsMeta:   src?.sourceMeta
        ? {
            propsOdds: src.sourceMeta.propsOdds,
            propsOddsFetchedAt: src.sourceMeta.propsOddsFetchedAt,
            propsOddsStale: src.sourceMeta.propsOddsStale,
            propsOddsGameId: src.sourceMeta.propsOddsGameId,
          }
        : null,
      injuries:        filteredInjuries,
      recentForm:      src?.recentForm    || "",
      h2hSplits:       src?.h2hSplits     || [],
      gameTotals:      mergedTodaysGames.length === 0 ? {} : src?.gameTotals     || {},
      /** API roster + same featured names / teams as NBA tab UI chips */
      rosterGrounding: rosterGroundingMerged,
      /** Mirrors product UI — must stay aligned with src/lib/nbaUiSurface.js */
      clientUiSurface: {
        source: "verified_slate_ui_chips",
        featuredPlayersFullNames: uiChips.map((p) => p.fullName),
        chipToFullName: Object.fromEntries(
          uiChips.map((p) => [p.chip, p.fullName]),
        ),
        note:
          "Featured players mirror the NBA tab: only teams on the verified tonight slate; OUT/DNP injuries from the injuries feed are excluded.",
      },
      question:        questionText || "",
      };
    },
    [nbaData, nbaGames],
  );

  const buildMlbContext = useCallback((questionText, mlbDataOverride = null) => {
    const src = mlbDataOverride ?? mlbData;
    const fromSrc = Array.isArray(src?.games) ? src.games : [];
    const fromLocal = Array.isArray(mlbGames) ? mlbGames : [];
    const allGames = fromSrc.length > 0 ? fromSrc : fromLocal;
    // Trim each game to essentials only — avoid oversized payload
    const trimmedGames = allGames.map(g => ({
      id: g.id,
      state: g.state,
      status: g.status,
      inning: g.inning || null,
      inningHalf: g.inningHalf || null,
      homeTeam: { abbr: g.homeTeam?.abbr, name: g.homeTeam?.name, score: g.homeTeam?.score ?? null, pitcher: g.homeTeam?.pitcher || null },
      awayTeam: { abbr: g.awayTeam?.abbr, name: g.awayTeam?.name, score: g.awayTeam?.score ?? null, pitcher: g.awayTeam?.pitcher || null },
    }));
    const propLinesPool =
      src?.propLines?.length > 0
        ? src.propLines
        : mlbDataOverride?.propLines?.length > 0
          ? mlbDataOverride.propLines
          : mlbData?.propLines || [];
    const propLines = propLinesPool.slice(0, 12);
    if (trimmedGames.length > 0 && propLines.length === 0) {
      console.warn("[buildMlbContext] games present but propLines empty — client context degraded");
    }
    return {
      seasonContext: src?.seasonContext || {},
      games:         trimmedGames,
      propLines,
      gameTotals:    src?.gameTotals   || {},
      injuries:      (src?.injuries || []).slice(0, 24),
      primarySource: src?.primarySource || null,
      question:      questionText || "",
    };
  }, [mlbData, mlbGames]);


    const buildGolfContext = useCallback((questionText, golfDataOverride = null) => {
  const g = stripMisalignedGolfCourseArtifacts(
    alignGolfBoardSnapshotForQuestion(golfDataOverride ?? golfData, questionText),
  );
  const primary = resolveGolfPrimaryEvent(g);
  const lb = (rows) => (Array.isArray(rows) ? rows.slice(0, 48) : []);
  const slimTournament = (t) => {
    if (!t || typeof t !== "object") return null;
    return {
      name: t.name ?? null,
      shortName: t.shortName ?? null,
      state: t.state ?? null,
      round: t.round ?? null,
      venue: t.venue ?? null,
      leaderboard: lb(t.leaderboard),
    };
  };
  return {
    currentEvent: primary
      ? {
          name: primary.name || null,
          shortName: primary.shortName || null,
          course: primary.course || primary.courseName || null,
          location: primary.location || null,
          round: primary.round || null,
          state: primary.state || null,
          leaderboard: lb(primary.leaderboard || g?.currentEvent?.leaderboard),
        }
      : null,
    tournament: slimTournament(g?.tournament),
    course: g?.course || null,
    rankings: (g?.rankings || []).slice(0, 12),
    odds: {
      outrights: (g?.odds?.outrights || []).slice(0, g?.odds?.hasPostedLines ? 48 : 16),
      topFinish:
        g?.odds?.topFinish && typeof g.odds.topFinish === "object"
          ? Object.fromEntries(Object.entries(g.odds.topFinish).slice(0, 24))
          : {},
      makeCut:
        g?.odds?.makeCut && typeof g.odds.makeCut === "object"
          ? Object.fromEntries(Object.entries(g.odds.makeCut).slice(0, 24))
          : {},
      linesUnavailable: Boolean(g?.odds?.linesUnavailable),
      hasPostedLines: Boolean(
        g?.odds?.hasPostedLines ||
          (g?.odds?.outrights || []).some(
            (o) => o?.odds != null && Number.isFinite(Number(o.odds)),
          ),
      ),
      fetchedAt: g?.odds?.fetchedAt || null,
      freshness: g?.odds?.freshness || null,
      source: g?.odds?.source || null,
    },
    recentResults: (g?.recentResults || []).slice(0, 10),
    courseStats: (g?.courseStats || []).slice(0, 8),
    question: questionText || "",
    questionEventAlignment: g?.questionEventAlignment || null,
  };
}, [golfData]);

  const nflPlayersForUi = useMemo(() => {
    const remote = nflContextData?.uiPlayers;
    if (remote && Object.keys(remote).length) return remote;
    return NFL_PLAYERS;
  }, [nflContextData]);
  const nflDraftMeta = nflContextData?.draft || null;
  const userCityHint = useMemo(() => {
    if (typeof window === "undefined") return "";
    const fromStorage =
      localStorage.getItem("ur_user_city") || localStorage.getItem("ur_city") || "";
    if (fromStorage) return fromStorage;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    return tz.includes("Chicago") ? "Dallas" : "";
  }, []);

  // ── Core AI call ───────────────────────────────────────────────────────────
  const askUrTake = useCallback(async ({ text, matchup, setMsgs, sportHint, followUpTelemetry }) => {
  if (!text || isAsking || prefetchingUrTakeContext) return;
  if (!canAsk()) return;
  if (urTakeInFlightRef.current) return;
  const upstreamFailMsg = "Couldn't complete that read. Try again.";
  urTakeInFlightRef.current = true;
  setIsAsking(true);

  const imgToSend = pastedImage;

  const refHint =
    typeof pendingExplicitSportHintRef.current === "string"
      ? pendingExplicitSportHintRef.current.trim()
      : "";
  pendingExplicitSportHintRef.current = null;

  const explicitHint =
    typeof sportHint === "string" && sportHint.trim() !== ""
      ? sportHint.trim()
      : refHint || null;
  let detected = detectSportFromQuestion(text, tab);
  if (detected === "generic") detected = null;

  const scr = String(screen || "").toLowerCase();
  const screenSport =
    scr === "nfl" || scr === "nflplayer"
      ? "nfl"
      : scr === "mlb" ||
          scr === "nba" ||
          scr === "golf" ||
          scr === "tennis" ||
          scr === "f1" ||
          scr === "worldcup"
        ? scr === "nflplayer"
          ? "nfl"
          : scr
        : null;

  let priorSnapshot = [];
  /** Filled synchronously inside the `setMsgs` updater (same turn as user + loading rows). */
  let effectiveSportHint = null;
  let hintForEnsure = null;
  /** Populated in the `/api/ur-take` try path so the outer `catch` can attach client failure metadata. */
  let hasGolfContextForDebug = false;
  let serializedBodyLength = 0;
  let lastResponseContentType = null;
  let golfContextMetaForDebug = null;
  let activePageTournamentLabelForDebug = null;
  let golfContextMismatchForDebug = false;
  let urTakeFetchElapsedMs = null;

  const pendingMsgId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `pend_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  setMsgs((prev) => {
    priorSnapshot = [...prev];
    const historyForRoute = chatHistoryForApi(priorSnapshot);
    const fromQuestion = inferSportFromQuestionText(text, matchup || null, !!imgToSend);
    const fromHistory =
      priorSnapshot.length > 0 && historyForRoute.length > 1
        ? inferSportFromChatHistory(historyForRoute)
        : null;
    let eff =
      fromQuestion ??
      detected ??
      fromHistory ??
      explicitHint ??
      screenSport ??
      lastUrTakeSportRef.current ??
      inferUrTakeSportFromMessages(priorSnapshot) ??
      null;
    if (eff === "generic") eff = null;
    effectiveSportHint = eff;

    let hEnsure = effectiveSportHint;
    if (!hEnsure && detectSportFromQuestion(text, tab) === "golf") hEnsure = "golf";
    if (!hEnsure && questionSuggestsGolf(text)) hEnsure = "golf";
    if (!hEnsure && screenSport) hEnsure = screenSport;
    hintForEnsure = hEnsure;

    const loadingSport = eff === "tennis_wta_profile" ? "tennis" : eff;

    return [
      ...prev,
      { role: "user", text, image: imgToSend?.previewUrl || null },
      {
        role: "ai",
        text: "ANALYZING...",
        loading: true,
        sport: loadingSport,
        msgId: pendingMsgId,
      },
    ];
  });

  clearImage();

  /** Set before fetch when submitting a live follow-up chip (for round-trip + completion telemetry). */
  let fuTelemetryState = null;

  try {
    setPrefetchingUrTakeContext(true);
    const ensureStart = typeof performance !== "undefined" ? performance.now() : Date.now();
    const ensured = await ensureUrTakeSportContext(hintForEnsure || "generic", {
      nbaData,
      mlbData,
      golfData,
      f1Data,
      nflContextData,
      players,
      context,
      liveMatches,
    });
    const ensureMs = Math.round(
      (typeof performance !== "undefined" ? performance.now() : Date.now()) - ensureStart,
    );
    setPrefetchingUrTakeContext(false);

    if (hintForEnsure && hintForEnsure !== "generic") {
      console.log(
        JSON.stringify({
          event: "sport_context_auto_attached",
          sport: hintForEnsure,
          cacheHit: ensured.cacheHit,
          fetchMs: ensureMs,
        }),
      );
    }

    const historyPayload = chatHistoryForApi(priorSnapshot);

    const ov = ensured.overrides || {};
    const f1DataUse = ov.f1Data ?? f1Data;
    const nflBundle = ov.nflContextData ?? nflContextData;
    const playersUse = ov.tennisPlayers ?? players;
    const contextUse = ov.tennisContext ?? context;
    const liveMatchesUse = ov.tennisLiveMatches ?? liveMatches;

    const nflPlayersResolved =
      nflBundle?.uiPlayers && Object.keys(nflBundle.uiPlayers).length
        ? nflBundle.uiPlayers
        : nflPlayersForUi;

    const body = {
      question: buildContextualQuestion(text, { priorMessages: priorSnapshot }),
      userEmail: userEmail || null,
      history: historyPayload,
      sportHint: effectiveSportHint,
      bettingStyle: isUnlimited ? bettingStyle : "balanced",
      teamHint: detectNflTeamHint(text),
      matchupContext: matchup || null,
      image: null,
      /** Always ask for structured JSON; API defaults ON (set STRUCTURED_UR_TAKE_MODE=0 on server to disable). */
      structured: true,
    };

    if (effectiveSportHint === "tennis_wta_profile") {
      body.players = playersUse || null;
      body.context = contextUse || null;
    } else if (effectiveSportHint === "tennis") {
      body.players = playersUse || null;
      body.context = contextUse || null;
      body.liveMatches = (liveMatchesUse || []).slice(0, 12);
    }

    if (effectiveSportHint === "nfl") {
      body.nflContext =
        nflBundle?.promptContext || buildNflContext(nflPlayersResolved);
    }

    if (effectiveSportHint === "f1") {
      body.f1Context = buildF1Context(f1DataUse);
    }

    if (effectiveSportHint === "nba") {
      body.nbaContext = buildNbaContext(
        text,
        ov.nbaData ?? null,
        verifiedNbaSlateForTakeRef.current,
        nbaUrTakeFocusGameKey,
      );
    }

    if (effectiveSportHint === "mlb") {
      body.mlbContext = buildMlbContext(text, ov.mlbData ?? null);
    }

    activePageTournamentLabelForDebug =
      golfData?.currentEvent?.name ||
      golfData?.currentEvent?.shortName ||
      golfData?.tournament?.name ||
      null;
    golfContextMismatchForDebug = golfFeedUiMismatchesQuestionIntent(ov.golfData ?? golfData, text);

    if (
      effectiveSportHint === "golf" ||
      detectSportFromQuestion(text, tab) === "golf" ||
      questionSuggestsGolf(text)
    ) {
      body.golfContext = buildGolfContext(text, ov.golfData ?? null);
      const gc = body.golfContext;
      if (gc && typeof gc === "object") {
        golfContextMetaForDebug = {
          tournamentLabel:
            gc.currentEvent?.name ||
            gc.tournament?.name ||
            gc.questionEventAlignment?.requestedLabel ||
            null,
          questionIntent: extractGolfTournamentIntentFromQuestion(text)?.label || null,
          questionEventAlignment: gc.questionEventAlignment || null,
          contextScope: gc.questionEventAlignment?.contextScope || null,
          hasLeaderboard: Boolean(
            (gc.currentEvent?.leaderboard?.length || 0) > 0 ||
              (gc.tournament?.leaderboard?.length || 0) > 0,
          ),
        };
      }
    }

    if (!effectiveSportHint) {
      body.context = contextUse || null;
      body.liveMatches = (liveMatchesUse || []).slice(0, 8);
    }

    if (imgToSend) {
      body.image = {
        base64: imgToSend.base64,
        mediaType: imgToSend.mediaType,
      };
    }

    hasGolfContextForDebug = Boolean(body.golfContext);

    const sessionUserTurns = priorSnapshot.filter((m) => m.role === "user").length + 1;
    if (followUpTelemetry) {
      const roundStart = typeof performance !== "undefined" ? performance.now() : Date.now();
      fuTelemetryState = {
        tel: followUpTelemetry,
        sessionUserTurns,
        roundStart,
        sportResolved: String(followUpTelemetry.sport || effectiveSportHint || "generic").toLowerCase(),
      };
      telemetryUrTakeFollowUpSubmit({
        sport: fuTelemetryState.sportResolved,
        intent: String(followUpTelemetry.intent || ""),
        liveMode: Boolean(followUpTelemetry.liveMode),
        followUpText: String(followUpTelemetry.followUpText || text || "").slice(0, 160),
        sourceMsgId: String(followUpTelemetry.sourceMsgId || ""),
        sessionUserTurns,
        followUpIndex:
          typeof followUpTelemetry.followUpIndex === "number"
            ? followUpTelemetry.followUpIndex
            : -1,
        followUpCount:
          typeof followUpTelemetry.followUpCount === "number"
            ? followUpTelemetry.followUpCount
            : 0,
        msSinceResponseShown: Math.max(
          0,
          Number(followUpTelemetry.msSinceResponseShown) || 0,
        ),
      });
    }

    const ctrl = new AbortController();
    const abortTimer = window.setTimeout(() => ctrl.abort(), 75000);

    const authHeaders = await getTakeAuthHeaders();

    let serialized;
    try {
      serialized = JSON.stringify(body);
    } catch {
      const lean = { ...body, golfContext: { question: String(text || "").slice(0, 2000), boardTrimmed: true } };
      serialized = JSON.stringify(lean);
    }
    serializedBodyLength = typeof serialized === "string" ? serialized.length : 0;

    const requestUrl =
      typeof window !== "undefined"
        ? new URL(UR_TAKE_PATH, window.location.href).href
        : UR_TAKE_PATH;
    const fetchHeaders = {
      "Content-Type": "application/json",
      /** Redundant with body.structured — ensures API enables structured mode even if JSON body is narrowed en route. */
      "X-UR-Take-Structured": "1",
      ...authHeaders,
    };

    console.log(
      JSON.stringify(
        buildUrTakePreFetchLog({
          requestUrl,
          method: "POST",
          serializedBodyLength,
          sportHint: effectiveSportHint,
          golfContextMeta: golfContextMetaForDebug,
          activePageTournamentLabel: activePageTournamentLabelForDebug,
          abortController: ctrl,
        }),
      ),
    );

    let res;
    try {
      const fetched = await fetchUrTakeWithNetworkRetry({
        serialized,
        headers: fetchHeaders,
        signal: ctrl.signal,
        onAttemptFailed: ({ attempt, err, elapsedMs }) => {
          if (attempt === 1 && err) {
            console.warn(
              JSON.stringify({
                event: "ur_take_fetch_attempt_failed",
                attempt,
                phase: classifyUrTakeClientCatchPhase(err),
                errName: err?.name ?? null,
                errMessage: err?.message ?? null,
                elapsedMs,
                navigatorOnLine:
                  typeof navigator !== "undefined" ? navigator.onLine : null,
                visibilityState:
                  typeof document !== "undefined" ? document.visibilityState : null,
              }),
            );
          }
        },
      });
      res = fetched.res;
      urTakeFetchElapsedMs = fetched.elapsedMs;
    } finally {
      window.clearTimeout(abortTimer);
    }

    const raw = await res.text();
    lastResponseContentType = res.headers.get("content-type") || res.headers.get("Content-Type") || "";

    if (!res.ok) {
      let j = {};
      try {
        j = JSON.parse(raw);
      } catch {
        /* ignore */
      }
      const code = String(j.code || "");
      const fr = String(j.fallbackReason || "");
      const dbgFetchNonOk = buildUrTakeClientFailureDebug({
        phase: "fetch_non_ok",
        res,
        raw,
        parsedErrorJson: j && typeof j === "object" && Object.keys(j).length ? j : null,
        err: null,
        effectiveSportHint,
        hintForEnsure,
        hasGolfContext: hasGolfContextForDebug,
        serializedBodyLength,
        contentType: lastResponseContentType,
      });
      if (
        res.status === 503 &&
        (code === "upstream_unavailable" || fr === "upstream_rate_limit")
      ) {
        console.error("[urTakeClientFailure]", dbgFetchNonOk);
        setMsgs((prev) => [
          ...prev.filter((m) => !m.loading),
          { role: "ai", text: upstreamFailMsg, urTakeClientFailure: dbgFetchNonOk },
        ]);
        if (fuTelemetryState) {
          const end = typeof performance !== "undefined" ? performance.now() : Date.now();
          telemetryUrTakeFollowUpResponseCompleted({
            success: false,
            roundTripMs: Math.max(0, Math.round(end - fuTelemetryState.roundStart)),
            sport: fuTelemetryState.sportResolved,
            intent: String(fuTelemetryState.tel.intent || ""),
            liveMode: Boolean(fuTelemetryState.tel.liveMode),
            followUpText: String(fuTelemetryState.tel.followUpText || "").slice(0, 160),
            sourceMsgId: String(fuTelemetryState.tel.sourceMsgId || ""),
            sessionUserTurns: fuTelemetryState.sessionUserTurns,
            followUpIndex: fuTelemetryState.tel.followUpIndex ?? -1,
            followUpCount: fuTelemetryState.tel.followUpCount ?? 0,
            error: "upstream_503",
          });
        }
        return;
      }
      let msg = `/api/ur-take ${res.status}: ${raw.slice(0, 600)}`;
      try {
        const human = String(j.response || j.error || "").trim();
        const tag = j.code ? ` (${j.code})` : "";
        if (human) msg = `${human}${tag}`;
      } catch {
        /* keep msg */
      }
      const errOut = new Error(msg);
      errOut.urTakeClientFailure = dbgFetchNonOk;
      throw errOut;
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (parseErr) {
      const dbgInvalidJson = buildUrTakeClientFailureDebug({
        phase: "invalid_json",
        res,
        raw,
        parsedErrorJson: null,
        err: parseErr,
        effectiveSportHint,
        hintForEnsure,
        hasGolfContext: hasGolfContextForDebug,
        serializedBodyLength,
        contentType: lastResponseContentType,
      });
      const errOut = new Error(`Invalid JSON from /api/ur-take: ${raw.slice(0, 500)}`);
      errOut.urTakeClientFailure = dbgInvalidJson;
      errOut.cause = parseErr;
      throw errOut;
    }

    logUrTakeApiEnvelopeDev(data);

    if (data.fallbackReason === "upstream_rate_limit") {
      const dbgRate = buildUrTakeClientFailureDebug({
        phase: "api_fallback_reason",
        res,
        raw,
        parsedErrorJson: data && typeof data === "object" ? data : null,
        err: null,
        effectiveSportHint,
        hintForEnsure,
        hasGolfContext: hasGolfContextForDebug,
        serializedBodyLength,
        contentType: lastResponseContentType,
      });
      console.error("[urTakeClientFailure]", dbgRate);
      setMsgs((prev) => [
        ...prev.filter((m) => !m.loading),
        { role: "ai", text: upstreamFailMsg, urTakeClientFailure: dbgRate },
      ]);
      if (fuTelemetryState) {
        const end = typeof performance !== "undefined" ? performance.now() : Date.now();
        telemetryUrTakeFollowUpResponseCompleted({
          success: false,
          roundTripMs: Math.max(0, Math.round(end - fuTelemetryState.roundStart)),
          sport: fuTelemetryState.sportResolved,
          intent: String(fuTelemetryState.tel.intent || ""),
          liveMode: Boolean(fuTelemetryState.tel.liveMode),
          followUpText: String(fuTelemetryState.tel.followUpText || "").slice(0, 160),
          sourceMsgId: String(fuTelemetryState.tel.sourceMsgId || ""),
          sessionUserTurns: fuTelemetryState.sessionUserTurns,
          followUpIndex: fuTelemetryState.tel.followUpIndex ?? -1,
          followUpCount: fuTelemetryState.tel.followUpCount ?? 0,
          error: "upstream_rate_limit",
        });
      }
      return;
    }

    const resolvedSport = String(data.sport || "").trim();
    const sportForBubble =
      resolvedSport && resolvedSport !== "generic"
        ? resolvedSport
        : effectiveSportHint || null;
    const normalizedDisplay = normalizeUrTakeDisplay(data);
    const structuredRaw = structuredPayloadFromApi(data);
    const structuredForBubble = structuredRaw ? sanitizeStructuredBubbleShape(structuredRaw) : null;

    const snagPhrase = "The feed hit a snag on that one";
    const isApiSuccessFallback =
      data &&
      typeof data === "object" &&
      (data.fallback === true ||
        (data.fallbackReason != null && String(data.fallbackReason).trim() !== "") ||
        String(normalizedDisplay.response || "").includes(snagPhrase));

    let apiSuccessFallbackDbg = null;
    if (isApiSuccessFallback) {
      apiSuccessFallbackDbg = buildUrTakeApiSuccessFallbackDebug(data, effectiveSportHint, {
        effectiveSportHint,
        hintForEnsure,
        hasGolfContext: hasGolfContextForDebug,
        serializedBodyLength,
        status: res.status,
        contentType: lastResponseContentType,
        rawSlice: raw,
      });
      console.error("[urTakeClientFailure]", apiSuccessFallbackDbg);
    }

    try {
      const sportTracked = String(
        sportForBubble || resolvedSport || effectiveSportHint || "generic",
      ).toLowerCase();
      track("query_submitted", { sport: sportTracked });
      if (data.liveMode) {
        telemetryUrTakeLiveResponseGenerated({
          sport: sportTracked,
          intent: String(data.intent || ""),
          liveMode: true,
          followUpCount: Array.isArray(data.followUps) ? data.followUps.length : 0,
        });
      }
      if (Array.isArray(data.followUps) && data.followUps.length > 0) {
        const chips = data.followUps.slice(0, 3);
        telemetryUrTakeFollowUpsAttached({
          sport: sportTracked,
          intent: String(data.intent || ""),
          liveMode: Boolean(data.liveMode),
          followUpCount: data.followUps.length,
          followUpTexts: chips.map((t) => String(t).trim().slice(0, 80)),
        });
      }
    } catch {
      /* analytics optional */
    }

    if (!isUnlimited) {
      incrementFreeTierUsedToday();
      setFreeUsedRevision((n) => n + 1);
    }

    const sportTrackedForBubble = String(
      sportForBubble || resolvedSport || effectiveSportHint || "generic",
    ).toLowerCase();
    const completeBubble = {
      role: "ai",
      msgId: pendingMsgId,
      text: normalizedDisplay.response,
      sport: sportForBubble || undefined,
      takeMeta:
        data.take && typeof data.take === "object"
          ? {
              id: data.take.id,
              confidence: data.take.confidence,
              trust: data.take.trust ?? null,
              openingLineSnapshot: data.take.openingLineSnapshot ?? null,
              status: data.take.status,
              betSignal: data.take.betSignal,
              estimatedEdgeMeta: data.take.estimatedEdgeMeta,
            }
          : null,
      deepText: normalizedDisplay.responseDeep,
      ...(structuredForBubble ? { structured: structuredForBubble } : {}),
      ...(data.estimatedEdge && typeof data.estimatedEdge === "object"
        ? { estimatedEdge: data.estimatedEdge }
        : {}),
      followUps: Array.isArray(data.followUps) ? data.followUps : undefined,
      urTakeTelemetry: {
        intent: String(data.intent || ""),
        liveMode: Boolean(data.liveMode),
        sport: sportTrackedForBubble,
        shownAt: Date.now(),
      },
      ...(data.fallback === true
        ? {
            urTakeFeedSnagDiag: {
              requestId: String(data.requestId ?? "").trim().slice(0, 32),
              fallbackReason: String(data.fallbackReason ?? "").trim().slice(0, 160),
            },
          }
        : {}),
      ...(apiSuccessFallbackDbg ? { urTakeClientFailure: apiSuccessFallbackDbg } : {}),
    };
    setMsgs((prev) => {
      const idx = prev.findIndex(
        (m) => m.role === "ai" && m.loading && m.msgId === pendingMsgId,
      );
      if (idx === -1) return [...prev.filter((m) => !m.loading), completeBubble];
      const next = [...prev];
      next[idx] = completeBubble;
      return next;
    });

    if (!isUnlimited && structuredForBubble && !isApiSuccessFallback) {
      const leanLine = String(structuredForBubble.lean || "").trim();
      if (leanLine) {
        const sportLabel =
          formatLastLeanSportLabel(structuredForBubble.sport) ||
          formatLastLeanSportLabel(sportForBubble || resolvedSport || effectiveSportHint);
        const matchupLabel = resolveMatchupLabelForLastLean({
          matchupContext: matchup || null,
          sportHint: sportForBubble || resolvedSport || effectiveSportHint,
          question: text,
          nbaTodaysGames: nbaData?.todaysGames,
          nbaFocusGameKey: nbaUrTakeFocusGameKey,
        });
        if (saveUrLastLean({ lean: leanLine, sport: sportLabel, matchup: matchupLabel, question: text })) {
          setLastLeanRevision((n) => n + 1);
        }
      }
    }

    if (fuTelemetryState) {
      const end = typeof performance !== "undefined" ? performance.now() : Date.now();
      telemetryUrTakeFollowUpResponseCompleted({
        success: true,
        roundTripMs: Math.max(0, Math.round(end - fuTelemetryState.roundStart)),
        sport: sportTrackedForBubble,
        intent: String(data.intent || ""),
        liveMode: Boolean(data.liveMode),
        followUpText: String(fuTelemetryState.tel.followUpText || "").slice(0, 160),
        sourceMsgId: String(fuTelemetryState.tel.sourceMsgId || ""),
        sessionUserTurns: fuTelemetryState.sessionUserTurns,
        followUpIndex: fuTelemetryState.tel.followUpIndex ?? -1,
        followUpCount: fuTelemetryState.tel.followUpCount ?? 0,
      });
    }
    lastUrTakeSportRef.current = sportForBubble;
    if (userEmail) {
      loadPerformanceSnapshot().catch(() => {});
    }
  } catch (err) {
    setPrefetchingUrTakeContext(false);
    if (fuTelemetryState) {
      const end = typeof performance !== "undefined" ? performance.now() : Date.now();
      telemetryUrTakeFollowUpResponseCompleted({
        success: false,
        roundTripMs: Math.max(0, Math.round(end - fuTelemetryState.roundStart)),
        sport: fuTelemetryState.sportResolved,
        intent: String(fuTelemetryState.tel.intent || ""),
        liveMode: Boolean(fuTelemetryState.tel.liveMode),
        followUpText: String(fuTelemetryState.tel.followUpText || "").slice(0, 160),
        sourceMsgId: String(fuTelemetryState.tel.sourceMsgId || ""),
        sessionUserTurns: fuTelemetryState.sessionUserTurns,
        followUpIndex: fuTelemetryState.tel.followUpIndex ?? -1,
        followUpCount: fuTelemetryState.tel.followUpCount ?? 0,
        error: err?.name === "AbortError" ? "abort" : "client_error",
      });
    }
    const catchPhase = classifyUrTakeClientCatchPhase(err);
    const failureDbg =
      err?.urTakeClientFailure ??
      buildUrTakeClientFailureDebug({
        phase: catchPhase,
        res: null,
        raw: "",
        parsedErrorJson: null,
        err,
        effectiveSportHint,
        hintForEnsure,
        hasGolfContext: hasGolfContextForDebug,
        serializedBodyLength,
        contentType: lastResponseContentType,
        elapsedMs:
          typeof err?.elapsedMs === "number"
            ? err.elapsedMs
            : urTakeFetchElapsedMs,
        navigatorOnLine: typeof navigator !== "undefined" ? navigator.onLine : null,
        visibilityState: typeof document !== "undefined" ? document.visibilityState : null,
        requestUrl:
          typeof window !== "undefined"
            ? new URL(UR_TAKE_PATH, window.location.href).href
            : UR_TAKE_PATH,
        sameOrigin:
          typeof window !== "undefined"
            ? new URL(UR_TAKE_PATH, window.location.href).origin === window.location.origin
            : null,
        golfContextMeta: golfContextMetaForDebug,
        activePageTournamentLabel: activePageTournamentLabelForDebug,
        golfContextMismatch: golfContextMismatchForDebug,
      });
    console.error("[urTakeClientFailure]", failureDbg);
    const fallback =
      err?.userFacingMessage ||
      userMessageForUrTakeClientFailure(catchPhase, {
        golfContextMismatch: golfContextMismatchForDebug,
      });
    setMsgs((prev) => [
      ...prev.filter((m) => !m.loading),
      { role: "ai", text: fallback, urTakeClientFailure: failureDbg },
    ]);
  } finally {
    setIsAsking(false);
    urTakeInFlightRef.current = false;
  }
}, [
  clearImage,
  context,
  isAsking,
  prefetchingUrTakeContext,
  liveMatches,
  pastedImage,
  players,
  tab,
  nbaData,
  mlbData,
  golfData,
  f1Data,
  buildF1Context,
  buildNbaContext,
  buildMlbContext,
  buildGolfContext,
  nflPlayersForUi,
  nflContextData,
  canAsk,
  bettingStyle,
  isUnlimited,
  userEmail,
  loadPerformanceSnapshot,
  getTakeAuthHeaders,
  screen,
  nbaUrTakeFocusGameKey,
]);

  // ── Player lookups ─────────────────────────────────────────────────────────
  const getPlayerAny = useCallback(name => { if(!players)return null; return players.atp?.[name]||players.wta?.[name]||null; }, [players]);

  const pd    = screen==="player"    && selectedPlayer    ? getPlayerAny(selectedPlayer)   : null;
  const nflPd = screen==="nflplayer" && selectedNflPlayer ? nflPlayersForUi[selectedNflPlayer] : null;

  const filteredNflPlayers = useMemo(
    () =>
      Object.entries(nflPlayersForUi)
        .filter(([, p]) => nflPosFilter === "ALL" || p.pos === nflPosFilter)
        .sort((a, b) => Number(b[1].ydsPg || 0) - Number(a[1].ydsPg || 0)),
    [nflPosFilter, nflPlayersForUi]
  );

  // ── Tennis derived state ───────────────────────────────────────────────────
  const validTennisMatchesBoard = useMemo(
    () => liveMatchesBoard.filter((m) => isDisplayableValidity(classifyTennisMatch(m))),
    [liveMatchesBoard],
  );
  const validTennisMatchesHome = useMemo(
    () => liveMatchesHome.filter((m) => isDisplayableValidity(classifyTennisMatch(m))),
    [liveMatchesHome],
  );
  const tennisLiveMatches = useMemo(
    () => validTennisMatchesBoard.filter((m) => String(m?.raw?.live || "0") === "1"),
    [validTennisMatchesBoard],
  );
  const tennisUpcomingMatches = useMemo(
    () => validTennisMatchesBoard.filter((m) => String(m?.raw?.live || "0") !== "1"),
    [validTennisMatchesBoard],
  );
  const nbaGamesRaw = useMemo(
    () => (nbaGames.length > 0 ? nbaGames : nbaData?.todaysGames || []),
    [nbaGames, nbaData],
  );
  const mlbGamesRaw = useMemo(
    () => (mlbGames.length > 0 ? mlbGames : mlbData?.games || []),
    [mlbGames, mlbData],
  );
  const validNbaGames = useMemo(
    () => nbaGamesRaw.filter((g) => isDisplayableValidity(classifyNbaGame(g))),
    [nbaGamesRaw],
  );
  const displayableF1NextRace = useMemo(
    () => getDisplayableF1NextRace(f1Data),
    [f1Data],
  );
  const activeTournamentMatches = useMemo(
    () =>
      validTennisMatchesBoard.filter(
        (m) => m.league === "ATP" && preferredTournamentScore(m, context) > 0,
      ),
    [validTennisMatchesBoard, context],
  );

  const isNflSlateActive = useMemo(
    () => isNflInSeason() || nflDraftMeta?.phase === "during_draft",
    [nflDraftMeta?.phase],
  );

  /** Single home-screen pipeline: validity, times, priority, dedupe, Live Snapshot keys */
  const homePipeline = useMemo(
    () =>
      buildHomeEventPipeline({
        nbaGames: validNbaGames,
        nbaSeasonContext: nbaData?.seasonContext,
        mlbGames: mlbGamesRaw,
        tennisMatches: validTennisMatchesHome,
        f1Data,
        golfData,
        isNflSlateActive,
        mlbData,
        golfSnapshotKeyFn: () => golfKeyForLiveSnapshot(golfData),
      }),
    [
      validNbaGames,
      nbaData?.seasonContext,
      mlbGamesRaw,
      validTennisMatchesHome,
      f1Data,
      golfData,
      isNflSlateActive,
      mlbData,
    ],
  );

  const tickerNbaGames = homePipeline?.nbaGamesForHome;
  const liveSnapshotKeys = homePipeline?.liveSnapshotKeys;

  verifiedNbaSlateForTakeRef.current = homePipeline?.nbaGamesForHome;

  useEffect(() => {
    if (screen !== "nba") setNbaUrTakeFocusGameKey(null);
  }, [screen]);

  const tennisTickerMatches = useMemo(() => {
    const tier = (m) => {
      if (String(m?.raw?.live || "0") === "1") return 0;
      const st = normalizeText(m?.raw?.status || "");
      const sc = String(m?.raw?.score || "").trim();
      const hasScore = sc && sc !== "-";
      if (
        hasScore &&
        (st.includes("final") ||
          st.includes("finished") ||
          st.includes("walkover") ||
          st.includes("retired") ||
          st.includes("complete"))
      ) {
        return 1;
      }
      return 2;
    };
    const ts = (m) =>
      Number.isFinite(m.commenceTs) ? m.commenceTs : Number.MAX_SAFE_INTEGER;
    return [...homePipeline?.tennisMatchesForHome]
      .sort((a, b) => {
        const ta = tier(a);
        const tb = tier(b);
        if (ta !== tb) return ta - tb;
        if (ta === 1) return ts(b) - ts(a);
        return ts(a) - ts(b);
      })
      .slice(0, 4);
  }, [homePipeline?.tennisMatchesForHome]);

  const [slateDisplayedEventKeys, setSlateDisplayedEventKeys] = useState([]);

  const cardExcludeSet = useMemo(
    () => new Set([...liveSnapshotKeys, ...slateDisplayedEventKeys]),
    [liveSnapshotKeys, slateDisplayedEventKeys],
  );

  const tennisBoardHeadline = useMemo(() => {
    const n=context?.currentTournament?.name;
    if (activeTournamentMatches.length>0&&n) return `${n}`;
    return "ATP · Tennis Board";
  }, [activeTournamentMatches.length,context]);

  const tennisBoardSubline = useMemo(() => {
    const n=context?.currentTournament?.name;
    if (activeTournamentMatches.length>0&&n) return `${n.toUpperCase()} · ATP LIVE + UPCOMING`;
    return "ATP · Live & upcoming";
  }, [activeTournamentMatches.length,context]);

  const homeAtpSpotlightCards = useMemo(() => {
    const atpRaw = validTennisMatchesBoard.filter((m) => m.league === "ATP");
    const atpPipeline = homePipeline?.tennisMatchesForHome.filter((m) => m.league === "ATP");
    const atp = atpPipeline.filter((m) => {
      const k = tennisEventKeyFromNormalized(m);
      return !(k && cardExcludeSet.has(k));
    });
    if (tennisLoading && atpRaw.length === 0) {
      return [
        {
          id: "tennis-atp-feed-loading",
          league: "ATP",
          leagueColor: "#0891B2",
          homeCategory: "ATP",
          title: "Loading matchups…",
          time: "Schedule",
          network: context?.currentTournament?.name || "ATP",
          blurb: "",
          whatMatters: "Full draws and prices load on the Tennis tab first.",
          quickHitters: ["Open Tennis — full board & lines"],
          confirmed: true,
        },
      ];
    }
    if (!tennisLoading && !atp.length && atpRaw.length > 0) {
      return [];
    }
    if (!tennisLoading && !atp.length && atpPipeline.length > 0) {
      return [];
    }
    if (!tennisLoading && !atp.length && (hasStaticTennisIntel || staticIntelFetchFailed)) {
      return [
        {
          id: "tennis-atp-profile-backed",
          league: "ATP",
          leagueColor: "#0891B2",
          homeCategory: "ATP",
          title: "Live draws updating — confirmed ATP matchups below",
          time: "Profiles",
          network: context?.currentTournament?.name || "ATP Tour",
          blurb: "",
          whatMatters: "Use Tennis for live draws; bring one matchup back here to ask UR Take.",
          quickHitters: ["Open Tennis — draws & pricing"],
          confirmed: false,
          tennisSpotlightState: "profile_backed_tennis_available",
        },
      ];
    }
    if (!tennisLoading && !atp.length && !staticIntelFetchFailed) {
      return [
        {
          id: "tennis-atp-feed-empty",
          league: "ATP",
          leagueColor: "#0891B2",
          homeCategory: "ATP",
          title: "No matchups in this window",
          time: "Schedule",
          network: context?.currentTournament?.name || "ATP",
          blurb: "No confirmed Tennis matchups right now. Check the Tennis tab for the latest.",
          whatMatters: "Narrow with a named matchup ask once the board is back.",
          quickHitters: ["Open Tennis to refresh"],
          confirmed: true,
        },
      ];
    }
    const focus = atp.filter((m) => preferredTournamentScore(m, context) > 0);
    const pool = focus.length ? focus : atp;
    const previewCap = 8;
    const head = pool.slice(0, previewCap);
    const liveN = pool.filter((m) => String(m?.raw?.live || "0") === "1").length;
    const upcomingN = pool.length - liveN;
    const tName = context?.currentTournament?.name || "ATP Tour";
    const oddsBacked = homePipeline?.meta?.hasAtpFromOdds;
    return [
      {
        id: "tennis-atp-schedule-board",
        league: "ATP",
        leagueColor: "#0891B2",
        homeCategory: "ATP · SCHEDULE",
        title: `${tName} — next ATP matchups`,
        time: `${liveN} live · ${upcomingN} upcoming`,
        network: oddsBacked
          ? "Odds-backed rows — full detail on Tennis"
          : `${atp.length} matchup${atp.length === 1 ? "" : "s"} on the ATP board`,
        blurb: head.map((m) => formatAtpHomeSpotlightLine(m)).join(" · "),
        matchupLines: head.map((m) => formatAtpHomeSpotlightLine(m)),
        moreMatchupsCount: Math.max(0, pool.length - head.length),
        whatMatters: oddsBacked
          ? "Confirmed matchups here — open Tennis for pricing depth and alt markets."
          : "Preview only — Tennis tab carries draws, injuries, and posted numbers.",
        quickHitters: ["Best ATP misprice on this slate?", "Surface edge nobody is talking about?"],
        confirmed: true,
      },
    ];
  }, [
    validTennisMatchesBoard,
    homePipeline?.tennisMatchesForHome,
    homePipeline?.meta,
    tennisLoading,
    context,
    hasStaticTennisIntel,
    staticIntelFetchFailed,
    cardExcludeSet,
  ]);

  const homeF1Cards = useMemo(() => {
    const sessions = f1Data?.sessions || [];
    const buildCard = (race, id) => {
      if (!race || typeof race !== "object") return null;
      const fk = f1EventKey(race);
      if (fk && cardExcludeSet.has(fk)) return null;
      const raceStart = resolveF1RaceStart(race, sessions);
      const dt = raceStart ? new Date(raceStart) : null;
      const fallbackDate = race?.race_date ? new Date(race.race_date) : null;
      const hasConfirmedRaceStart = Boolean(dt && !Number.isNaN(dt.getTime()));
      const dateStr = dt
        ? dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" })
        : fallbackDate
          ? fallbackDate.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" })
          : "TBD";
      const fullDateStr = dt
        ? dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/Chicago" })
        : fallbackDate
          ? fallbackDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/Chicago" })
          : "Date TBD";
      const timeStr =
        hasConfirmedRaceStart
          ? dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago", timeZoneName: "short" })
          : "";
      const blurbCore = `${race.location || "Track TBD"} · ${fullDateStr}`;
      const blurb = hasConfirmedRaceStart && timeStr ? `${blurbCore} at ${timeStr}` : blurbCore;
      return {
        id,
        league: "F1",
        leagueColor: "#E10600",
        title: race.meeting_name || race.name || "Next Grand Prix",
        time: dateStr,
        network: race.circuit_short_name || race.location || "",
        blurb,
        whatMatters: "Race Sunday only — winner, podium structure, or head-to-head reads.",
        quickHitters: ["Race winner vs field?", "Podium stack you trust?", "Best driver H2H?"],
        confirmed: true,
      };
    };

    const nextRace = displayableF1NextRace;
    if (nextRace) {
      const card = buildCard(nextRace, "f1-next-1");
      return card ? [card] : [];
    }

    const races = Array.isArray(f1Data?.schedule?.races) ? f1Data.schedule.races : [];
    const loose = races.find((r) => r?.is_next) || races[0] || null;
    if (loose) {
      const card = buildCard(loose, "f1-next-preview");
      if (card) {
        return [
          {
            ...card,
            whatMatters: "Next GP on the calendar — open F1 for full weekend sessions and live timing.",
          },
        ];
      }
    }

    return [
      {
        id: "f1-default",
        league: "F1",
        leagueColor: "#E10600",
        title: "Formula 1",
        time: "Schedule pending",
        network: "Grand Prix Racing",
        blurb: "Opening schedule loads here first — open F1 for full weekend sessions and timing.",
        whatMatters: "When the next GP locks, ask for race-only edges (no practice markets).",
        quickHitters: ["Best WDC value right now?", "Next GP winner lean?", "Constructor vs driver gap?"],
        confirmed: true,
      },
    ];
  }, [f1Data, displayableF1NextRace, cardExcludeSet]);

  /** Standalone NBA PLAYOFFS spotlight — built for diagnostics; not mounted on home (slate + preview). */
  const homeNbaPlayoffsCards = useMemo(() => {
    const logHomeNbaCard = (branch, extra = {}) => {
      console.log(JSON.stringify({ event: "home_nba_card_branch", branch, ...extra }));
    };
    const toEtTipLabel = (startTimeUtc) => {
      const raw = String(startTimeUtc || "").trim();
      if (!raw) return "TBD ET";
      const dt = new Date(raw);
      if (Number.isNaN(dt.getTime())) return "TBD ET";
      return `${dt.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
      })} ET`;
    };
    const isHomeNbaCardState = (g) => {
      const s = String(g?.state || "").toLowerCase();
      return s === "pre" || s === "scheduled" || s === "in" || s === "post";
    };
    const sortByTip = (a, b) => {
      const ta = Number.isNaN(Date.parse(a?.startTimeUtc)) ? Number.MAX_SAFE_INTEGER : Date.parse(a?.startTimeUtc);
      const tb = Number.isNaN(Date.parse(b?.startTimeUtc)) ? Number.MAX_SAFE_INTEGER : Date.parse(b?.startTimeUtc);
      return ta - tb;
    };
    const notExcluded = (g) => {
      const k = nbaEventKey(g);
      return !(k && cardExcludeSet.has(k));
    };
    /** Pipeline-verified slate (classifyNbaGame + normalize). */
    const pipelineGames = (homePipeline?.nbaGamesForHome || [])
      .filter(isHomeNbaCardState)
      .filter(notExcluded)
      .sort(sortByTip);

    const rawApiTodaysGames = (nbaData?.todaysGames || [])
      .filter((g) => isDisplayableValidity(classifyNbaGame(g)))
      .filter(isHomeNbaCardState)
      .filter(notExcluded)
      .sort(sortByTip);

    let slateGames = pipelineGames.length > 0 ? pipelineGames : rawApiTodaysGames;

    logHomeNbaCard("inputs", {
      pipelineCount: homePipeline?.nbaGamesForHome?.length ?? 0,
      pipelineFilteredCount: pipelineGames.length,
      rawApiCount: (nbaData?.todaysGames || []).length,
      rawApiFilteredCount: rawApiTodaysGames.length,
      cardExcludeSize: cardExcludeSet.size,
    });

    if (!slateGames.length) {
      const looseApiGames = (nbaData?.todaysGames || [])
        .filter(isHomeNbaCardState)
        .filter(notExcluded)
        .sort(sortByTip);
      if (looseApiGames.length > 0) {
        const recoveryHint = nbaData?.slateRecovery?.fromLastKnownKv
          ? formatHomeSlateKvUpdatedEt(nbaData.slateRecovery.lastUpdated)
          : null;
        const rows = looseApiGames.map((g, i) => {
          const away = g.awayTeam?.abbr || g.awayTeam?.name || "Away";
          const home = g.homeTeam?.abbr || g.homeTeam?.name || "Home";
          const seriesNum = getSeriesLabel(away, home);
          const state = String(g?.state || "").toLowerCase();
          const series =
            state === "pre" || state === "scheduled"
              ? seriesNum
                ? `${seriesNum} tonight`
                : "Playoff game tonight"
              : seriesNum || "Playoff matchup";
          const evKey = nbaEventKey(g);
          const channel = String(g.channel || g.broadcast || "").trim();
          const tipEt = toEtTipLabel(g.startTimeUtc);
          return {
            id: evKey || `nba-card-row-fallback-${i + 1}`,
            nbaEventKey: evKey,
            away,
            home,
            tipEt,
            series,
            channel,
          };
        });
        logHomeNbaCard("loose_api_recovery", { rowCount: rows.length });
        return [
          {
            id: "nba-playoffs-rows",
            league: "NBA PLAYOFFS",
            leagueColor: "#FF6B00",
            title: "Tonight's games",
            time: `${rows.length} game${rows.length === 1 ? "" : "s"}`,
            network: recoveryHint || "Tap a matchup",
            blurb: recoveryHint || "",
            confirmed: true,
            isNbaRowsCard: true,
            nbaRows: rows,
          },
        ];
      }
      logHomeNbaCard("off_day_empty", {
        sampleApiGames: (nbaData?.todaysGames || []).slice(0, 3).map((g) => ({
          id: g?.id,
          state: g?.state,
          away: g?.awayTeam?.abbr,
          home: g?.homeTeam?.abbr,
          startTimeUtc: g?.startTimeUtc,
          validity: classifyNbaGame(g),
          displayable: isDisplayableValidity(classifyNbaGame(g)),
          eventKey: nbaEventKey(g),
          excluded: cardExcludeSet.has(nbaEventKey(g) || ""),
        })),
      });
      return [
        {
          id: "nba-default",
          league: "NBA PLAYOFFS",
          leagueColor: "#FF6B00",
          title: "No NBA games today",
          time: "Off-day",
          network: "Series board",
          blurb: "Quiet night on the hardwood — futures and series reads still move.",
          whatMatters: "Use the off night for futures, series prices, or tomorrow's prop board.",
          quickHitters: ["Playoff series price check?", "Tomorrow's prop board?", "Futures misprice watch?"],
          confirmed: true,
        },
      ];
    }

    const rows = slateGames.map((g, i) => {
      const away = g.awayTeam?.abbr || g.awayTeam?.name || "Away";
      const home = g.homeTeam?.abbr || g.homeTeam?.name || "Home";
      const seriesNum = getSeriesLabel(away, home);
      const state = String(g?.state || "").toLowerCase();
      const series =
        state === "pre" || state === "scheduled"
          ? seriesNum
            ? `${seriesNum} tonight`
            : "Playoff game tonight"
          : seriesNum || "Playoff matchup";
      const evKey = nbaEventKey(g);
      const channel = String(g.channel || g.broadcast || "").trim();
      const tipEt = toEtTipLabel(g.startTimeUtc);
      return {
        id: evKey || `nba-card-row-${i + 1}`,
        nbaEventKey: evKey,
        away,
        home,
        tipEt,
        series,
        channel,
      };
    });

    const preCount = slateGames.filter((g) => {
      const s = String(g?.state || "").toLowerCase();
      return s === "pre" || s === "scheduled";
    }).length;

    logHomeNbaCard("tonight_rows", { rowCount: rows.length, preCount });

    return [
      {
        id: "nba-playoffs-rows",
        league: "NBA PLAYOFFS",
        leagueColor: "#FF6B00",
        title: preCount > 0 ? "Tonight's games" : "NBA slate",
        time: `${rows.length} game${rows.length === 1 ? "" : "s"}`,
        network: "Tap a matchup",
        blurb: "",
        confirmed: true,
        isNbaRowsCard: true,
        nbaRows: rows,
      },
    ];
  }, [homePipeline?.nbaGamesForHome, getSeriesLabel, cardExcludeSet, nbaData?.todaysGames, nbaData?.slateRecovery]);

  const homeMlbCards = useMemo(() => {
    const live = homePipeline?.mlbGamesForHome.filter((g) => g.state === "in");
    const upcoming = homePipeline?.mlbGamesForHome.filter((g) => g.state === "pre");
    const poolRaw = [...live, ...upcoming].slice(0, 3);
    const tomorrowGames = Array.isArray(mlbData?.tomorrowGames) ? mlbData.tomorrowGames : [];
    const tomorrowGamesHorizon = tomorrowGames.filter((g) => isDisplayableValidity(classifyMlbGame(g)));
    const pool = poolRaw.filter((g) => {
      const k = mlbEventKey(g);
      return !(k && cardExcludeSet.has(k));
    });
    const rawApiMlbHorizon = (mlbData?.games || []).filter((g) => isDisplayableValidity(classifyMlbGame(g)));

    if (!pool.length && !homePipeline?.mlbGamesForHome.length) {
      if (rawApiMlbHorizon.length > 0) {
        const recoveryHint = mlbData?.slateRecovery?.fromLastKnownKv
          ? formatHomeSlateKvUpdatedEt(mlbData.slateRecovery.lastUpdated)
          : null;
        return rawApiMlbHorizon.slice(0, 3).map((g, i) => {
          const away = g.awayTeam?.abbr || g.awayTeam?.name || "Away";
          const home = g.homeTeam?.abbr || g.homeTeam?.name || "Home";
          const isLive = g.state === "in";
          const isFinal = g.state === "post";
          const awayScore = g.awayTeam?.score ?? null;
          const homeScore = g.homeTeam?.score ?? null;
          const hasScore = awayScore !== null && homeScore !== null;
          const inning = g.inning ? `${g.inningHalf === "top" ? "T" : "B"}${g.inning}` : "";
          const liveLabel = isLive ? `🔴 LIVE${inning ? ` · ${inning}` : ""}` : isFinal ? "FINAL" : g.status || "Today";
          const homeP = g.homeTeam?.pitcher;
          const awayP = g.awayTeam?.pitcher;
          const pitchers =
            isConfirmedMlbProbablePitcher(awayP) && isConfirmedMlbProbablePitcher(homeP)
              ? `${String(awayP).trim()} vs ${String(homeP).trim()}`
              : "";
          const blurb = hasScore
            ? `${away} ${awayScore} — ${home} ${homeScore}`
            : pitchers || `${away} @ ${home}`;
          return {
            id: `mlb-card-fallback-${i + 1}`,
            league: isLive ? "MLB LIVE" : isFinal ? "MLB · FINAL" : "MLB",
            leagueColor: isLive ? "#FF5252" : "#1DB954",
            title: `${away} @ ${home}`,
            time: liveLabel,
            network: recoveryHint || pitchers || "Daily slate",
            blurb,
            whatMatters: isLive
              ? "Live: totals that lag inning leverage, NRFI/YRFI swings, and bullpen bridges."
              : "Pre-game: starter K props, park-shaped totals, and platoon batter spots.",
            quickHitters: isLive
              ? ["Live total read?", "Best batter prop in this inning?", "Run line live?"]
              : ["Best K prop today?", "Total vs park?", "First-five lean?"],
            confirmed: true,
          };
        });
      }
      if (tomorrowGamesHorizon.length > 0) {
        const tomorrowLines = tomorrowGamesHorizon.slice(0, 3).map((g) => {
          const away = g.awayTeam?.abbr || g.awayTeam?.name || "Away";
          const home = g.homeTeam?.abbr || g.homeTeam?.name || "Home";
          const tip = String(g.status || "TBD");
          return `${away} @ ${home} (${tip})`;
        });
        return [
          {
            id: "mlb-tomorrow-fallback",
            league: "MLB",
            leagueColor: "#1DB954",
            title: "No games tonight — here's tomorrow's slate",
            time: "Tomorrow",
            network: "Daily board",
            blurb: tomorrowLines.join(" · "),
            whatMatters: "Prep tomorrow's K props, totals, and lineup-context edges before books tighten.",
            quickHitters: ["Best K prop tomorrow?", "Earliest total misprice?", "Best first-game angle?"],
            confirmed: true,
          },
        ];
      }
      return [
        {
          id: "mlb-default",
          league: "MLB",
          leagueColor: "#1DB954",
          title: "No MLB games today",
          time: "Off-day",
          network: "Daily board",
          blurb: "Off night — park factors and probables still set tomorrow's script.",
          whatMatters: "Prep tomorrow's K props, totals, and futures while lines are stale.",
          quickHitters: ["Tomorrow's ace K prop?", "Park/total setup?", "Futures value on a contender?"],
          confirmed: true,
        },
      ];
    }

    if (!pool.length) {
      return [];
    }

    return pool.map((g, i) => {
      const away = g.awayTeam?.abbr || g.awayTeam?.name || "Away";
      const home = g.homeTeam?.abbr || g.homeTeam?.name || "Home";
      const isLive = g.state === "in";
      const isFinal = g.state === "post";
      const awayScore = g.awayTeam?.score ?? null;
      const homeScore = g.homeTeam?.score ?? null;
      const hasScore = awayScore !== null && homeScore !== null;
      const inning = g.inning ? `${g.inningHalf === "top" ? "T" : "B"}${g.inning}` : "";

      const liveLabel = isLive ? `🔴 LIVE${inning ? ` · ${inning}` : ""}` : isFinal ? "FINAL" : g.status || "Today";

      const homeP = g.homeTeam?.pitcher;
      const awayP = g.awayTeam?.pitcher;
      const pitchers =
        isConfirmedMlbProbablePitcher(awayP) && isConfirmedMlbProbablePitcher(homeP)
          ? `${String(awayP).trim()} vs ${String(homeP).trim()}`
          : "";

      const blurb = hasScore ? `${away} ${awayScore} — ${home} ${homeScore}` : pitchers || `${away} @ ${home}`;

      return {
        id: `mlb-card-${i + 1}`,
        league: isLive ? "MLB LIVE" : isFinal ? "MLB · FINAL" : "MLB",
        leagueColor: isLive ? "#FF5252" : "#1DB954",
        title: `${away} @ ${home}`,
        time: liveLabel,
        network: pitchers || "Daily slate",
        blurb,
        whatMatters: isLive
          ? "Live: totals that lag inning leverage, NRFI/YRFI swings, and bullpen bridges."
          : "Pre-game: starter K props, park-shaped totals, and platoon batter spots.",
        quickHitters: isLive
          ? ["Live total read?", "Best batter prop in this inning?", "Run line live?"]
          : ["Best K prop on the card?", "YRFI vs wind?", "Undervalued batter spot?"],
        confirmed: true,
      };
    });
  }, [homePipeline?.mlbGamesForHome, cardExcludeSet, mlbData?.games, mlbData?.tomorrowGames, mlbData?.slateRecovery]);

  const homeGolfCards = useMemo(() => {
    if (golfData && !golfLoading && isGolfEventFinished(golfData)) {
      return [];
    }
    if (golfData && !golfLoading && !homePipeline?.golfVisibleOnHome) {
      return [];
    }
    if (golfData === null && golfLoading) {
      return [{
        id: "golf-home-loading",
        league: "GOLF",
        leagueColor: "#FFFFFF",
        title: "PGA Tour board",
        time: "Loading…",
        network: "Live data",
        blurb: "Fetching tournament, odds, and leaderboard context.",
        whatMatters:
          "Leaderboard and pricing hydrate here first — open Golf for the full field when it lands.",
        quickHitters: ["Best outright value?", "Best top-10 play?", "Who should I fade?"],
        confirmed: true,
      }];
    }

    const currentEvent = resolveGolfPrimaryEvent(golfData) || golfData?.currentEvent || null;
    const golfHomeValidity = getGolfHomeValidity(golfData);
    const upcomingEvent = golfHomeValidity.upcomingEvent || null;
    const readName = (entry) =>
      String(entry?.player || entry?.name || entry?.fullName || "").trim();

    const shortName = (fullName) => {
      const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
      return parts.length ? parts[parts.length - 1] : fullName;
    };

    const formatScore = (value) => {
      const raw = String(value ?? "").trim();
      if (!raw || raw === "—") return "E";
      if (raw === "E") return raw;
      if (/^[+-]/.test(raw)) return raw;
      const numeric = Number(raw);
      if (Number.isNaN(numeric)) return raw;
      if (numeric === 0) return "E";
      return numeric > 0 ? `+${numeric}` : `${numeric}`;
    };

    const topThree = Array.isArray(currentEvent?.leaderboard)
      ? currentEvent.leaderboard.slice(0, 3)
      : [];

    const eventState = String(currentEvent?.state || "").toLowerCase();
    const isGolfFinal = isGolfEventFinished(golfData);
    const roundLabel = String(currentEvent?.round || "");
    const looksLiveRound = /live|round|r\d/i.test(roundLabel);
    const looksInProgress = eventState === "in" || looksLiveRound;
    const boardSource = String(golfData?.sourceMeta?.board || "").toLowerCase();
    const espnLbSource = String(golfData?.sourceMeta?.espnLeaderboardSource || "").toLowerCase();

    const sourceLabel =
      boardSource === "balldontlie_live_standings"
        ? "Source: BallDontLie live standings"
        : espnLbSource === "espn_html"
        ? "Source: ESPN tournament leaderboard"
        : espnLbSource === "espn_api" || boardSource.includes("espn")
        ? "Source: ESPN scoreboard API"
        : boardSource === "odds_market_fallback"
        ? "Source: odds market proxy"
        : "Source: PGA feed";

    const fetchedTs = Date.parse(String(golfData?.sourceMeta?.fetchedAt || ""));
    let freshnessLabel = "Updated recently";
    if (!Number.isNaN(fetchedTs)) {
      /* eslint-disable react-hooks/purity -- label is wall-clock age vs server fetchedAt */
      const ageMin = Math.max(0, Math.round((Date.now() - fetchedTs) / 60000));
      /* eslint-enable react-hooks/purity */
      if (ageMin <= 1) freshnessLabel = "Updated just now";
      else if (ageMin < 60) freshnessLabel = `Updated ${ageMin}m ago`;
      else freshnessLabel = `Updated ${Math.round(ageMin / 60)}h ago`;
    }

    if (golfHomeValidity.isActive && topThree.length > 0) {
      const gkLb = golfKeyForLiveSnapshot(golfData);
      if (gkLb && cardExcludeSet.has(gkLb)) {
        /* Leaderboard tile already on Live Snapshot */
      } else {
      const leaderboardLine = topThree
        .map((p, i) => {
          const thru = String(p?.thru || "").trim();
          const thruLabel = thru && thru !== "—" && thru !== "-" ? ` (${thru})` : "";
          return `${i + 1}. ${shortName(readName(p))} ${formatScore(p?.score)}${thruLabel}`;
        })
        .join("\n");

      return [{
        id: "golf-home-leaderboard",
        league: isGolfFinal ? "GOLF · FINAL" : looksInProgress ? "GOLF LIVE" : "GOLF",
        leagueColor: "#FFFFFF",
        title: currentEvent?.shortName || currentEvent?.name || "PGA Tour",
        time: isGolfFinal ? "Final" : currentEvent?.round || (looksInProgress ? "Live" : "Leaderboard"),
        network: currentEvent?.course || "PGA Tour",
        blurb: `${leaderboardLine}\n${sourceLabel} · ${freshnessLabel}`,
        topThree: topThree.map((p, i) => ({
          rank: i + 1,
          name: shortName(readName(p)),
          score: formatScore(p?.score),
          thru: String(p?.thru || "").trim(),
        })),
        sourceLine: `${sourceLabel} · ${freshnessLabel}`,
        whatMatters: isGolfFinal
          ? "Tournament closed — recap angles and grading live on Golf."
          : looksInProgress
            ? "Live: ride form that matches the course card, fade volatility without a floor."
            : "Pre-wave: attack course-fit vs market chalk before the next leaderboard jump.",
        quickHitters: isGolfFinal
          ? []
          : looksInProgress
            ? ["Best live placement?", "Fade volatile chalk?", "Who has the cleanest ball-striking?"]
            : ["Leader mispriced vs field?", "Best top-10 before the move?", "Who is the live chaser?"],
        confirmed: true,
      }];
    }
    }

    const nextEventName =
      [upcomingEvent?.shortName, upcomingEvent?.name].find(
        (v) => String(v || "").trim().length > 0,
      ) || null;
    const hasValidEventIdentity = Boolean(nextEventName) && Boolean(upcomingEvent?.id);

    if (golfHomeValidity.isUpcoming && hasValidEventIdentity) {
      const gkUp = golfKeyForLiveSnapshot(golfData);
      if (gkUp && cardExcludeSet.has(gkUp)) {
        return [];
      }
      return [{
        id: "golf-home-next",
        league: "GOLF",
        leagueColor: "#FFFFFF",
        title: nextEventName,
        time: upcomingEvent?.displayDate || "Upcoming",
        network:
          upcomingEvent?.course ||
          golfData?.course?.name ||
          "PGA Tour",
        blurb: `Pricing loads closer to tee time.\n${sourceLabel} · ${freshnessLabel}`,
        whatMatters: "Pre-tourney: map course fit, weather, and ownership before numbers tighten.",
        quickHitters: [
          "When does live scoring start?",
          "Best pre-tourney outright?",
          "Top-10 before the crush?",
        ],
        confirmed: true,
      }];
    }

    return [];
  }, [golfData, golfLoading, cardExcludeSet, homePipeline?.golfVisibleOnHome]);

  const homeTrackerCards = useMemo(
    () =>
      buildHomeTrackerCards({
        performanceData,
        nbaGames: homePipeline?.nbaGamesForHome,
        mlbData: {
          ...(mlbData || {}),
          games: homePipeline?.mlbGamesForHome,
        },
        golfData,
        f1Data,
        nflDraftMeta,
        excludeEventKeys: cardExcludeSet,
      }),
    [performanceData, homePipeline?.nbaGamesForHome, homePipeline?.mlbGamesForHome, mlbData, golfData, f1Data, nflDraftMeta, cardExcludeSet]
  );

  const homeCards = useMemo(() => {
    const modules = {
      nba_cards: [],
      mlb_cards: homeMlbCards,
      tracker_and_nfl_major: homeTrackerCards,
      tennis_spotlight: homeAtpSpotlightCards,
      f1_cards: homeF1Cards,
      golf_cards: homeGolfCards,
    };
    return HOME_SURFACE_STACK_ORDER.flatMap((k) => modules[k] || []).filter(Boolean);
  }, [
    homeAtpSpotlightCards,
    homeTrackerCards,
    homeGolfCards,
    homeNbaPlayoffsCards,
    homeMlbCards,
    homeF1Cards,
  ]);

  const hourEt = useMemo(() => {
    const hourText = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      hour12: false,
    }).format(new Date());
    const h = Number(hourText);
    return Number.isFinite(h) ? h : null;
  }, []);

  const [promptRefreshTick, setPromptRefreshTick] = useState(0);

  // ── Dynamic home questions ─────────────────────────────────────────────────
  const dynamicHomeQuestions = useMemo(() => {
    const list = buildDynamicHomeQuestions({
      activeTournamentMatches,
      tennisLiveMatches,
      tennisUpcomingMatches,
      nflSeasonMode,
      nflDraftMeta,
      userCity: userCityHint,
      context,
      golfData,
      nbaGames: homePipeline?.nbaGamesForHome,
      mlbGames: homePipeline?.mlbGamesForHome,
      f1Data,
      hourEt: hourEt ?? 12,
    });
    return Array.isArray(list) ? list.slice(0, 3) : [];
  }, [
    activeTournamentMatches,
    tennisLiveMatches,
    tennisUpcomingMatches,
    nflSeasonMode,
    nflDraftMeta,
    userCityHint,
    context,
    golfData,
    homePipeline?.nbaGamesForHome,
    homePipeline?.mlbGamesForHome,
    f1Data,
    hourEt,
    promptRefreshTick,
  ]);

  const [liveEdgeAlerts, setLiveEdgeAlerts] = useState([]);
  const recomputeLiveEdgeAlerts = useCallback(() => {
    const next = buildLiveEdgeAlerts({
      nbaContext: nbaData,
      tennisLiveMatches,
      golfContext: golfData,
      hourEt,
    });
    setLiveEdgeAlerts(next);
  }, [nbaData, tennisLiveMatches, golfData, hourEt]);

  useEffect(() => {
    recomputeLiveEdgeAlerts();
    const id = window.setInterval(recomputeLiveEdgeAlerts, 60 * 60 * 1000);
    const idPrompt = window.setInterval(() => setPromptRefreshTick((t) => t + 1), 60 * 60 * 1000);
    return () => {
      window.clearInterval(id);
      window.clearInterval(idPrompt);
    };
  }, [recomputeLiveEdgeAlerts]);

  const [dailyFeaturedAngleCard, setDailyFeaturedAngleCard] = useState(null);
  const featuredCardFetchedRef = useRef(null);
  useEffect(() => {
    const featuredGame = homePipeline?.nbaGamesForHome?.[0];
    const featuredKey = featuredGame?.id ?? null;
    if (!featuredKey) return;
    if (featuredCardFetchedRef.current === featuredKey) return;
    featuredCardFetchedRef.current = featuredKey;

    let cancelled = false;
    (async () => {
      const card = await buildDailyFeaturedAngleCard({
        nbaGames: homePipeline?.nbaGamesForHome,
        nbaData,
      });
      if (!cancelled) setDailyFeaturedAngleCard(card);
    })();
    return () => {
      cancelled = true;
    };
  }, [homePipeline?.nbaGamesForHome, nbaData]);

  const pgaChampionshipOddsCard = useMemo(
    () => buildPgaChampionshipOddsHomeCard(golfData),
    [golfData],
  );

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goBack = useCallback(() => {
    setNavHistory((prevStack) => {
      if (prevStack.length === 0) return prevStack;
      const entry = prevStack[prevStack.length - 1];
      setTab(entry.tab);
      setScreen(entry.screen);
      setSelectedMatchup(null);
      setSelectedPlayer(null);
      setSelectedNflPlayer(null);
      return prevStack.slice(0, -1);
    });
  }, []);

  const goHome = useCallback(() => {
    setNavHistory([]);
    setTab("home");
    setScreen("home");
    setSelectedMatchup(null);
    setSelectedPlayer(null);
    setSelectedNflPlayer(null);
  }, []);

  const goTennis = useCallback(() => {
    if (screen !== "tennis" || tab !== "tennis") {
      setNavHistory((h) => [...h, { screen, tab }]);
    }
    setTab("tennis");
    setScreen("tennis");
    setSelectedMatchup(null);
    setSelectedPlayer(null);
    setSelectedNflPlayer(null);
  }, [screen, tab]);

  const goNfl = useCallback(() => {
    if (screen !== "nfl" || tab !== "nfl") {
      setNavHistory((h) => [...h, { screen, tab }]);
    }
    setTab("nfl");
    setScreen("nfl");
    setSelectedMatchup(null);
    setSelectedPlayer(null);
    setSelectedNflPlayer(null);
    let openPredict = false;
    try {
      if (typeof window !== "undefined") {
        const sp = new URLSearchParams(window.location.search);
        const path = window.location.pathname || "";
        openPredict =
          sp.has("predictor") ||
          Boolean(sp.get("share") || sp.get("picks")) ||
          /\/predict-nfl/i.test(path) ||
          path.endsWith("/nfl");
      }
    } catch {
      openPredict = false;
    }
    setNflUrView(openPredict ? "predict" : "take");
  }, [screen, tab]);

  const syncNflSubViewQuery = useCallback((view) => {
    if (typeof window === "undefined") return;
    try {
      const u = new URL(window.location.href);
      if (view === "predict") u.searchParams.set("predictor", "1");
      else u.searchParams.delete("predictor");
      const q = u.searchParams.toString();
      const path = u.pathname || "/";
      window.history.replaceState(null, "", q ? `${path}?${q}` : path);
    } catch {
      /* ignore */
    }
  }, []);

  const goF1 = useCallback(() => {
    if (screen !== "f1" || tab !== "f1") {
      setNavHistory((h) => [...h, { screen, tab }]);
    }
    setTab("f1");
    setScreen("f1");
    setSelectedMatchup(null);
    setSelectedPlayer(null);
    setSelectedNflPlayer(null);
  }, [screen, tab]);

  const goNba = useCallback(() => {
    if (screen !== "nba" || tab !== "nba") {
      setNavHistory((h) => [...h, { screen, tab }]);
    }
    setTab("nba");
    setScreen("nba");
    setSelectedMatchup(null);
    setSelectedPlayer(null);
    setSelectedNflPlayer(null);
  }, [screen, tab]);

  const goMlb = useCallback(() => {
    if (screen !== "mlb" || tab !== "mlb") {
      setNavHistory((h) => [...h, { screen, tab }]);
    }
    setTab("mlb");
    setScreen("mlb");
    setSelectedMatchup(null);
    setSelectedPlayer(null);
    setSelectedNflPlayer(null);
  }, [screen, tab]);

  const goPro = useCallback(() => {
    try {
      track("pro_tab_viewed");
    } catch {
      /* analytics optional */
    }
    if (screen !== "pro" || tab !== "pro") {
      setNavHistory((h) => [...h, { screen, tab }]);
    }
    setTab("pro");
    setScreen("pro");
    setSelectedMatchup(null);
    setSelectedPlayer(null);
    setSelectedNflPlayer(null);
  }, [screen, tab]);

  const openUpgradeModal = useCallback(() => {
    setShowUpgradeModal(true);
  }, []);

  const dismissFreeLimitChip = useCallback(() => {
    try {
      sessionStorage.setItem("ur_free_limit_chip_dismissed", "1");
    } catch {
      /* ignore */
    }
    setFreeLimitChipDismissedSession(true);
  }, []);

  const freeLimitChip = useMemo(() => {
    if (accessTier !== "free") return null;
    if (freeLimitChipDismissedSession) return null;
    if (!freeTierApproachingLimit(freeUsedCount, FREE_LIMIT)) return null;
    const remaining = Math.max(0, FREE_LIMIT - freeUsedCount);
    const qWord = remaining === 1 ? "question" : "questions";
    return (
      <div className="ur-free-limit-chip" role="status">
        <div className="ur-free-limit-chip-main">
          <span>
            {remaining} free {qWord} remaining today — unlock unlimited with Pro{" "}
            <button type="button" className="ur-free-limit-chip-unlock" onClick={openUpgradeModal}>
              Unlock
            </button>
          </span>
        </div>
        <button
          type="button"
          className="ur-free-limit-chip-dismiss"
          aria-label="Dismiss quota reminder"
          onClick={dismissFreeLimitChip}
        >
          ×
        </button>
      </div>
    );
  }, [
    accessTier,
    dismissFreeLimitChip,
    freeLimitChipDismissedSession,
    freeUsedCount,
    openUpgradeModal,
  ]);

  const goGolf = useCallback(() => {
    if (screen !== "golf" || tab !== "golf") {
      setNavHistory((h) => [...h, { screen, tab }]);
    }
    setTab("golf");
    setScreen("golf");
    setSelectedMatchup(null);
    setSelectedPlayer(null);
    setSelectedNflPlayer(null);
  }, [screen, tab]);

  const goWorldCup = useCallback(() => {
    if (screen !== "worldcup" || tab !== "worldcup") {
      setNavHistory((h) => [...h, { screen, tab }]);
    }
    setTab("worldcup");
    setScreen("worldcup");
    setSelectedMatchup(null);
    setSelectedPlayer(null);
    setSelectedNflPlayer(null);
  }, [screen, tab]);

  const goUrTakeTab = useCallback(() => {
    if (screen !== "ask" || tab !== "ask") {
      setNavHistory((h) => [...h, { screen, tab }]);
    }
    setTab("ask");
    setScreen("ask");
    setSelectedMatchup(null);
    setSelectedPlayer(null);
    setSelectedNflPlayer(null);
  }, [screen, tab]);

  const openMatchup = useCallback(
    (m) => {
      if (m?.isDraft) {
        const prompt = String(
          m?.defaultPrompt ||
            "Which team has the most interesting draft situation?",
        ).trim();
        if (!prompt || isAsking || prefetchingUrTakeContext) return;
        if (screen !== "ask" || tab !== "ask") {
          setNavHistory((h) => [...h, { screen, tab }]);
        }
        setTab("ask");
        setScreen("ask");
        setAskInput(prompt);
        askUrTake({ text: prompt, setMsgs: setAskMsgs, sportHint: "nfl" });
        return;
      }

      if (!m?.title || !m?.network) return;

      if (
        m?.id === "tennis-atp-schedule-board" ||
        m?.id === "tennis-atp-feed-loading" ||
        m?.id === "tennis-atp-feed-empty"
      ) {
        if (screen !== "tennis" || tab !== "tennis") {
          setNavHistory((h) => [...h, { screen, tab }]);
        }
        setTab("tennis");
        setScreen("tennis");
        setSelectedMatchup(null);
        return;
      }

      if (m?.id === "ur-home-tracker") {
        try {
          track("pro_tab_viewed");
        } catch {
          /* analytics optional */
        }
        if (screen !== "pro" || tab !== "pro") {
          setNavHistory((h) => [...h, { screen, tab }]);
        }
        setTab("pro");
        setScreen("pro");
        return;
      }

      if ((m.league || "").includes("GOLF")) {
        if (screen !== "golf" || tab !== "golf") {
          setNavHistory((h) => [...h, { screen, tab }]);
        }
        setTab("golf");
        setScreen("golf");
        return;
      }

      if ((m.league || "").includes("NBA")) {
        setNbaUrTakeFocusGameKey(m.nbaEventKey || null);
        if (screen !== "nba" || tab !== "nba") {
          setNavHistory((h) => [...h, { screen, tab }]);
        }
        setTab("nba");
        setScreen("nba");
        return;
      }

      if ((m.league || "").includes("MLB")) {
        if (screen !== "mlb" || tab !== "mlb") {
          setNavHistory((h) => [...h, { screen, tab }]);
        }
        setTab("mlb");
        setScreen("mlb");
        return;
      }

      if ((m.league || "").includes("F1")) {
        if (screen !== "f1" || tab !== "f1") {
          setNavHistory((h) => [...h, { screen, tab }]);
        }
        setTab("f1");
        setScreen("f1");
        return;
      }

      setNavHistory((h) => [...h, { screen, tab }]);
      setSelectedMatchup(m);
      setMatchupMsgs([]);
      setMatchupInput("");
      setScreen("matchup");
      setTab(m?.league?.includes("NFL") ? "nfl" : "tennis");
    },
    [screen, tab, askUrTake, isAsking, prefetchingUrTakeContext],
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const vv = window.visualViewport || {
      get height() {
        return window.innerHeight;
      },
      get offsetTop() {
        return 0;
      },
      addEventListener(ev, fn) {
        if (ev === "resize" || ev === "scroll") window.addEventListener("resize", fn);
      },
      removeEventListener(ev, fn) {
        if (ev === "resize" || ev === "scroll") window.removeEventListener("resize", fn);
      },
    };
    const setRise = () => {
      const h = typeof vv.height === "number" ? vv.height : window.innerHeight;
      const top = typeof vv.offsetTop === "number" ? vv.offsetTop : 0;
      const rise = Math.max(0, window.innerHeight - h - top);
      document.documentElement.style.setProperty("--ur-vv-rise", `${rise}px`);
    };
    setRise();
    vv.addEventListener("resize", setRise);
    vv.addEventListener("scroll", setRise);
    return () => {
      vv.removeEventListener("resize", setRise);
      vv.removeEventListener("scroll", setRise);
      document.documentElement.style.removeProperty("--ur-vv-rise");
    };
  }, []);

  useEffect(() => {
    return () => {
      pendingScrollTimeoutIdsRef.current.forEach((id) => clearTimeout(id));
      pendingScrollTimeoutIdsRef.current = [];
    };
  }, []);

  const scheduleChatScroll = useCallback((screenRef) => {
    const scroll = () => {
      const el = screenRef?.current;
      if (!el) return;
      const inner = typeof el.querySelector === "function" ? el.querySelector(".ur-chat-scroll") : null;
      /* Prefer scrollTop on the chat pane — scrollIntoView on nested overflow panes can scroll the wrong
       * ancestor on mobile Safari and leave the thread viewport blank (solid background). */
      if (inner && typeof inner.scrollHeight === "number") {
        inner.scrollTop = inner.scrollHeight;
        return;
      }
      const anchor =
        typeof el.querySelector === "function" ? el.querySelector(".ur-chat-thread-anchor") : null;
      if (anchor) {
        anchor.scrollIntoView({ behavior: "smooth", block: "end" });
        return;
      }
      const target = el;
      if (typeof target.scrollHeight === "number") target.scrollTop = target.scrollHeight;
    };
    scroll();
    requestAnimationFrame(() => {
      scroll();
      requestAnimationFrame(scroll);
    });
    const t48 = setTimeout(scroll, 48);
    const t240 = setTimeout(scroll, 240);
    const t720 = setTimeout(scroll, 720);
    pendingScrollTimeoutIdsRef.current.push(t48, t240, t720);
  }, []);

  const openPlayer = useCallback((name) => {
    setNavHistory((h) => [...h, { screen, tab }]);
    setSelectedPlayer(name);
    setScreen("player");
    setTab("tennis");
  }, [screen, tab]);

  const openNflPlayer = useCallback((name) => {
    setNavHistory((h) => [...h, { screen, tab }]);
    setSelectedNflPlayer(name);
    setScreen("nflplayer");
    setTab("nfl");
  }, [screen, tab]);

  const firePrompt = useCallback(
    (prompt, sportHint = null) => {
      if (isAsking || prefetchingUrTakeContext || urTakeInFlightRef.current) return;
      const text = String(prompt ?? "").trim();
      if (!text) return;
      if (!canAsk()) return;
      if (screen !== "ask" || tab !== "ask") {
        setNavHistory((h) => [...h, { screen, tab }]);
      }
      setTab("ask");
      setScreen("ask");
      setAskInput("");
      askUrTake({ text, setMsgs: setAskMsgs, sportHint });
      requestAnimationFrame(() => {
        scheduleChatScroll(askScreenRef);
        const t120 = setTimeout(() => scheduleChatScroll(askScreenRef), 120);
        pendingScrollTimeoutIdsRef.current.push(t120);
      });
    },
    [askUrTake, canAsk, scheduleChatScroll, screen, tab, isAsking, prefetchingUrTakeContext],
  );

  /** Navigate to UR Take with the question pre-filled (sport hint stored for submit). */
  const prefillUrTakeQuestion = useCallback(
    (prompt, sportHint = null) => {
      if (isAsking || prefetchingUrTakeContext) return;
      pendingExplicitSportHintRef.current =
        typeof sportHint === "string" && sportHint.trim() !== "" ? sportHint.trim() : null;
      if (screen !== "ask" || tab !== "ask") {
        setNavHistory((h) => [...h, { screen, tab }]);
      }
      setTab("ask");
      setScreen("ask");
      setAskInput(String(prompt || ""));
      requestAnimationFrame(() => {
        scheduleChatScroll(askScreenRef);
        askInputRef.current?.focus?.();
      });
    },
    [askInputRef, isAsking, prefetchingUrTakeContext, scheduleChatScroll, screen, tab],
  );

  // ── Submit handlers ────────────────────────────────────────────────────────
  const submitHome = useCallback(() => {
    const t = askInput.trim();
    if (!t || isAsking || prefetchingUrTakeContext || urTakeInFlightRef.current) return;
    if (!canAsk()) return;
    if (screen !== "ask" || tab !== "ask") {
      setNavHistory((h) => [...h, { screen, tab }]);
    }
    setAskInput("");
    setTab("ask");
    setScreen("ask");
    askUrTake({ text: t, setMsgs: setAskMsgs });
    requestAnimationFrame(() => {
      scheduleChatScroll(askScreenRef);
      const t120 = setTimeout(() => scheduleChatScroll(askScreenRef), 120);
      pendingScrollTimeoutIdsRef.current.push(t120);
    });
  }, [askUrTake, askInput, canAsk, isAsking, prefetchingUrTakeContext, scheduleChatScroll, screen, tab]);
  const submitAsk = useCallback(() => {
    const t = askInput.trim();
    if (!t || isAsking || prefetchingUrTakeContext) return;
    setAskInput("");
    askUrTake({ text: t, setMsgs: setAskMsgs });
    scheduleChatScroll(askScreenRef);
    requestAnimationFrame(() => {
      askInputRef.current?.focus({ preventScroll: true });
    });
  }, [askInput, askUrTake, isAsking, prefetchingUrTakeContext, scheduleChatScroll]);
  const submitTennis  = useCallback(forced=>{ const t=(forced??tennisInput).trim(); if(!t||isAsking||prefetchingUrTakeContext)return; if(!forced)setTennisInput(""); askUrTake({text:t,setMsgs:setTennisMsgs,sportHint:"tennis"}); scheduleChatScroll(tennisScreenRef); },[askUrTake,isAsking,prefetchingUrTakeContext,tennisInput,scheduleChatScroll]);
  const submitWta = useCallback(
    (forced) => {
      const t = (forced ?? wtaInput).trim();
      if (!t || isAsking || prefetchingUrTakeContext) return;
      if (!forced) setWtaInput("");
      askUrTake({ text: t, setMsgs: setTennisMsgs, sportHint: "tennis_wta_profile" });
      scheduleChatScroll(tennisScreenRef);
    },
    [askUrTake, isAsking, prefetchingUrTakeContext, wtaInput, scheduleChatScroll],
  );
  const submitNfl     = useCallback(forced=>{ const t=(forced??nflInput).trim();    if(!t||isAsking||prefetchingUrTakeContext)return; if(!forced)setNflInput("");   askUrTake({text:t,setMsgs:setNflMsgs,sportHint:"nfl"}); scheduleChatScroll(nflScreenRef); },[askUrTake,isAsking,prefetchingUrTakeContext,nflInput,scheduleChatScroll]);
  const submitF1      = useCallback(forced=>{ const t=(forced??f1Input).trim();     if(!t||isAsking||prefetchingUrTakeContext)return; if(!forced)setF1Input("");    askUrTake({text:t,setMsgs:setF1Msgs,sportHint:"f1"}); scheduleChatScroll(f1ScreenRef); },[askUrTake,isAsking,prefetchingUrTakeContext,f1Input,scheduleChatScroll]);
  const submitNba     = useCallback(forced=>{ const t=(forced??nbaInput).trim();    if(!t||isAsking||prefetchingUrTakeContext)return; if(!forced)setNbaInput("");   askUrTake({text:t,setMsgs:setNbaMsgs,sportHint:"nba"}); scheduleChatScroll(nbaScreenRef); },[askUrTake,isAsking,prefetchingUrTakeContext,nbaInput,scheduleChatScroll]);
  const submitMlb     = useCallback(forced=>{ const t=(forced??mlbInput).trim();    if(!t||isAsking||prefetchingUrTakeContext)return; if(!forced)setMlbInput("");   askUrTake({text:t,setMsgs:setMlbMsgs,sportHint:"mlb"}); scheduleChatScroll(mlbScreenRef); },[askUrTake,isAsking,prefetchingUrTakeContext,mlbInput,scheduleChatScroll]);

  const submitGolf = useCallback(forced=>{ const t=(forced??golfInput).trim(); if(!t||isAsking||prefetchingUrTakeContext)return; if(!forced)setGolfInput(""); askUrTake({text:t,setMsgs:setGolfMsgs,sportHint:"golf"}); scheduleChatScroll(golfScreenRef); },[askUrTake,isAsking,prefetchingUrTakeContext,golfInput,scheduleChatScroll]);
  const submitWc = useCallback(forced=>{ const t=(forced??wcInput).trim(); if(!t||isAsking||prefetchingUrTakeContext)return; if(!forced)setWcInput(""); askUrTake({text:t,setMsgs:setWcMsgs,sportHint:"worldcup"}); scheduleChatScroll(wcScreenRef); },[askUrTake,isAsking,prefetchingUrTakeContext,wcInput,scheduleChatScroll]);
  const submitMatchup = useCallback(forced=>{ const t=(forced??matchupInput).trim(); if(!t||isAsking||prefetchingUrTakeContext)return; if(!forced)setMatchupInput(""); const league=String(selectedMatchup?.league||"").toUpperCase(); const hint=league.includes("NFL")?"nfl":league.includes("NBA")?"nba":league.includes("MLB")?"mlb":league.includes("F1")?"f1":league.includes("GOLF")?"golf":"tennis"; askUrTake({text:t,matchup:selectedMatchup,setMsgs:setMatchupMsgs,sportHint:hint}); scheduleChatScroll(matchupScreenRef); },[askUrTake,isAsking,prefetchingUrTakeContext,matchupInput,selectedMatchup,scheduleChatScroll]);

  /** Insert suggested live follow-up from thread pills and submit (matches each sport's ask flow). */
  const urTakeFollowUpAsk = useCallback(
    (text, meta) => {
      const t = String(text || "").trim();
      if (!t || isAsking || prefetchingUrTakeContext) return;
      setAskInput("");
      askUrTake({
        text: t,
        setMsgs: setAskMsgs,
        followUpTelemetry: {
          followUpText: t,
          sourceMsgId: meta?.sourceMsgId,
          msSinceResponseShown: meta?.msSinceResponseShown,
          intent: meta?.intent,
          liveMode: meta?.liveMode,
          sport: meta?.sport || "generic",
          followUpIndex: meta?.followUpIndex,
          followUpCount: meta?.followUpCount,
        },
      });
      scheduleChatScroll(askScreenRef);
      requestAnimationFrame(() => {
        askInputRef.current?.focus({ preventScroll: true });
      });
    },
    [askUrTake, isAsking, prefetchingUrTakeContext, scheduleChatScroll],
  );

  const refreshSavedTakes = useCallback(() => {
    setSavedTakes(readSavedTakes());
  }, []);

  useEffect(() => {
    if (screen !== "ask") return;
    refreshSavedTakes();
  }, [screen, askMsgs.length, refreshSavedTakes]);

  const onSaveLastUrTake = useCallback(() => {
    const last = [...askMsgs].reverse().find(
      (m) => m.role === "ai" && !m.loading && String(m.text || "").trim() && m.text !== "ANALYZING...",
    );
    if (!last) return;
    let headlineSnippet = "";
    if (last.structured && typeof last.structured.call === "string" && last.structured.call.trim()) {
      headlineSnippet = last.structured.call.trim();
    } else {
      headlineSnippet =
        String(last.text || "")
          .split("\n")
          .map((l) => l.trim())
          .find(Boolean) || String(last.text || "");
    }
    headlineSnippet = trimToCompleteSentence(headlineSnippet, 120);
    const entry = pushSavedTake({
      headlineSnippet,
      sport: last.sport || last.urTakeTelemetry?.sport,
      msgId: last.msgId,
      takeId: last.takeMeta?.id,
    });
    if (entry) {
      refreshSavedTakes();
      trackFunnelEvent("saved_take_push", { sport: entry.sport || "unknown" });
    }
  }, [askMsgs, refreshSavedTakes]);

  const onOpenSavedTake = useCallback((t) => {
    trackFunnelEvent("saved_take_open", { id: String(t?.id || "") });
    const snippet = trimToCompleteSentence(String(t?.headlineSnippet || "").trim(), 120);
    if (snippet) setAskInput(`About my saved take: ${snippet} — `);
    requestAnimationFrame(() => {
      askInputRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const urTakeFollowUpTennis = useCallback(
    (text, meta) => {
      const t = String(text || "").trim();
      if (!t || isAsking || prefetchingUrTakeContext) return;
      setTennisInput("");
      askUrTake({
        text: t,
        setMsgs: setTennisMsgs,
        sportHint: "tennis",
        followUpTelemetry: {
          followUpText: t,
          sourceMsgId: meta?.sourceMsgId,
          msSinceResponseShown: meta?.msSinceResponseShown,
          intent: meta?.intent,
          liveMode: meta?.liveMode,
          sport: meta?.sport || "tennis",
          followUpIndex: meta?.followUpIndex,
          followUpCount: meta?.followUpCount,
        },
      });
      scheduleChatScroll(tennisScreenRef);
      requestAnimationFrame(() => {
        tennisInputRef.current?.focus({ preventScroll: true });
      });
    },
    [askUrTake, isAsking, prefetchingUrTakeContext, scheduleChatScroll],
  );
  const urTakeFollowUpNfl = useCallback(
    (text, meta) => {
      const t = String(text || "").trim();
      if (!t || isAsking || prefetchingUrTakeContext) return;
      setNflInput("");
      askUrTake({
        text: t,
        setMsgs: setNflMsgs,
        sportHint: "nfl",
        followUpTelemetry: {
          followUpText: t,
          sourceMsgId: meta?.sourceMsgId,
          msSinceResponseShown: meta?.msSinceResponseShown,
          intent: meta?.intent,
          liveMode: meta?.liveMode,
          sport: meta?.sport || "nfl",
          followUpIndex: meta?.followUpIndex,
          followUpCount: meta?.followUpCount,
        },
      });
      scheduleChatScroll(nflScreenRef);
      requestAnimationFrame(() => {
        nflInputRef.current?.focus({ preventScroll: true });
      });
    },
    [askUrTake, isAsking, prefetchingUrTakeContext, scheduleChatScroll],
  );
  const urTakeFollowUpF1 = useCallback(
    (text, meta) => {
      const t = String(text || "").trim();
      if (!t || isAsking || prefetchingUrTakeContext) return;
      setF1Input("");
      askUrTake({
        text: t,
        setMsgs: setF1Msgs,
        sportHint: "f1",
        followUpTelemetry: {
          followUpText: t,
          sourceMsgId: meta?.sourceMsgId,
          msSinceResponseShown: meta?.msSinceResponseShown,
          intent: meta?.intent,
          liveMode: meta?.liveMode,
          sport: meta?.sport || "f1",
          followUpIndex: meta?.followUpIndex,
          followUpCount: meta?.followUpCount,
        },
      });
      scheduleChatScroll(f1ScreenRef);
      requestAnimationFrame(() => {
        f1InputRef.current?.focus({ preventScroll: true });
      });
    },
    [askUrTake, isAsking, prefetchingUrTakeContext, scheduleChatScroll],
  );
  const urTakeFollowUpNba = useCallback(
    (text, meta) => {
      const t = String(text || "").trim();
      if (!t || isAsking || prefetchingUrTakeContext) return;
      setNbaInput("");
      askUrTake({
        text: t,
        setMsgs: setNbaMsgs,
        sportHint: "nba",
        followUpTelemetry: {
          followUpText: t,
          sourceMsgId: meta?.sourceMsgId,
          msSinceResponseShown: meta?.msSinceResponseShown,
          intent: meta?.intent,
          liveMode: meta?.liveMode,
          sport: meta?.sport || "nba",
          followUpIndex: meta?.followUpIndex,
          followUpCount: meta?.followUpCount,
        },
      });
      scheduleChatScroll(nbaScreenRef);
      requestAnimationFrame(() => {
        nbaInputRef.current?.focus({ preventScroll: true });
      });
    },
    [askUrTake, isAsking, prefetchingUrTakeContext, scheduleChatScroll],
  );
  const urTakeFollowUpMlb = useCallback(
    (text, meta) => {
      const t = String(text || "").trim();
      if (!t || isAsking || prefetchingUrTakeContext) return;
      setMlbInput("");
      askUrTake({
        text: t,
        setMsgs: setMlbMsgs,
        sportHint: "mlb",
        followUpTelemetry: {
          followUpText: t,
          sourceMsgId: meta?.sourceMsgId,
          msSinceResponseShown: meta?.msSinceResponseShown,
          intent: meta?.intent,
          liveMode: meta?.liveMode,
          sport: meta?.sport || "mlb",
          followUpIndex: meta?.followUpIndex,
          followUpCount: meta?.followUpCount,
        },
      });
      scheduleChatScroll(mlbScreenRef);
      requestAnimationFrame(() => {
        mlbInputRef.current?.focus({ preventScroll: true });
      });
    },
    [askUrTake, isAsking, prefetchingUrTakeContext, scheduleChatScroll],
  );
  const urTakeFollowUpGolf = useCallback(
    (text, meta) => {
      const t = String(text || "").trim();
      if (!t || isAsking || prefetchingUrTakeContext) return;
      setGolfInput("");
      askUrTake({
        text: t,
        setMsgs: setGolfMsgs,
        sportHint: "golf",
        followUpTelemetry: {
          followUpText: t,
          sourceMsgId: meta?.sourceMsgId,
          msSinceResponseShown: meta?.msSinceResponseShown,
          intent: meta?.intent,
          liveMode: meta?.liveMode,
          sport: meta?.sport || "golf",
          followUpIndex: meta?.followUpIndex,
          followUpCount: meta?.followUpCount,
        },
      });
      scheduleChatScroll(golfScreenRef);
      requestAnimationFrame(() => {
        golfInputRef.current?.focus({ preventScroll: true });
      });
    },
    [askUrTake, isAsking, prefetchingUrTakeContext, scheduleChatScroll],
  );
  const urTakeFollowUpMatchup = useCallback(
    (text, meta) => {
      const t = String(text || "").trim();
      if (!t || isAsking || prefetchingUrTakeContext) return;
      setMatchupInput("");
      const league = String(selectedMatchup?.league || "").toUpperCase();
      const hint = league.includes("NFL")
        ? "nfl"
        : league.includes("NBA")
          ? "nba"
          : league.includes("MLB")
            ? "mlb"
            : league.includes("F1")
              ? "f1"
              : league.includes("GOLF")
                ? "golf"
                : "tennis";
      askUrTake({
        text: t,
        matchup: selectedMatchup,
        setMsgs: setMatchupMsgs,
        sportHint: hint,
        followUpTelemetry: {
          followUpText: t,
          sourceMsgId: meta?.sourceMsgId,
          msSinceResponseShown: meta?.msSinceResponseShown,
          intent: meta?.intent,
          liveMode: meta?.liveMode,
          sport: meta?.sport || hint,
          followUpIndex: meta?.followUpIndex,
          followUpCount: meta?.followUpCount,
        },
      });
      scheduleChatScroll(matchupScreenRef);
      requestAnimationFrame(() => {
        matchupInputRef.current?.focus({ preventScroll: true });
      });
    },
    [askUrTake, isAsking, prefetchingUrTakeContext, selectedMatchup, scheduleChatScroll],
  );

  const askBarCommon = {
    fileInputRef,
    pastedImage,
    clearImage,
    isAsking,
    prefetchingContext: prefetchingUrTakeContext,
    processImageFile,
    bettingStyle,
    isUnlimited,
    freeLimitChip,
  };
  const hasDockedBar =
    (screen === "tennis" && tennisMsgs.length > 0) ||
    (screen === "nfl" && nflUrView === "take" && nflMsgs.length > 0) ||
    (screen === "f1" && f1Msgs.length > 0) ||
    (screen === "nba" && nbaMsgs.length > 0) ||
    (screen === "mlb" && mlbMsgs.length > 0) ||
    (screen === "golf" && golfMsgs.length > 0) ||
    (screen === "worldcup" && wcMsgs.length > 0) ||
    (screen === "ask" && askMsgs.length > 0);

  /** Dock + bottom nav real heights → `--ur-dock-measured-h` / `--ur-nav-measured-h` for `.ur-chat-scroll` padding (follow-up chips render after first paint; remeasure on DOM + resize). */
  useLayoutEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return undefined;
    const root = document.documentElement;
    if (!hasDockedBar) {
      root.style.removeProperty("--ur-dock-measured-h");
      root.style.removeProperty("--ur-nav-measured-h");
      return undefined;
    }
    const measure = () => {
      const dock = document.querySelector(".app .docked-bar.ur-docked-bar");
      const nav = document.querySelector(".app nav.bottom-nav");
      if (dock) {
        const h = dock.getBoundingClientRect().height;
        /* +28px: chip wrap / shadows / subpixel vs scroll-padding — avoids last board line sitting under the dock strip */
        root.style.setProperty("--ur-dock-measured-h", `${Math.ceil(h) + 28}px`);
      } else {
        root.style.removeProperty("--ur-dock-measured-h");
      }
      if (nav) {
        const h = nav.getBoundingClientRect().height;
        root.style.setProperty("--ur-nav-measured-h", `${Math.ceil(h)}px`);
      } else {
        root.style.removeProperty("--ur-nav-measured-h");
      }
    };
    measure();
    requestAnimationFrame(measure);
    requestAnimationFrame(() => {
      requestAnimationFrame(measure);
    });
    const t0 = window.setTimeout(measure, 0);
    const t50 = window.setTimeout(measure, 50);
    const t200 = window.setTimeout(measure, 200);
    const t600 = window.setTimeout(measure, 600);

    let roDock;
    let roNav;
    let moDock;
    const dock = document.querySelector(".app .docked-bar.ur-docked-bar");
    const nav = document.querySelector(".app nav.bottom-nav");
    if (typeof ResizeObserver !== "undefined") {
      roDock = dock ? new ResizeObserver(measure) : null;
      roNav = nav ? new ResizeObserver(measure) : null;
      if (roDock && dock) roDock.observe(dock);
      if (roNav && nav) roNav.observe(nav);
    }
    if (typeof MutationObserver !== "undefined" && dock) {
      moDock = new MutationObserver(measure);
      moDock.observe(dock, { subtree: true, childList: true, attributes: true, characterData: true });
    }
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t50);
      window.clearTimeout(t200);
      window.clearTimeout(t600);
      window.removeEventListener("resize", measure);
      try {
        const d = document.querySelector(".app .docked-bar.ur-docked-bar");
        const n = document.querySelector(".app nav.bottom-nav");
        if (roDock && d) roDock.unobserve(d);
        if (roNav && n) roNav.unobserve(n);
      } catch {
        /* ignore */
      }
      roDock?.disconnect();
      roNav?.disconnect();
      moDock?.disconnect();
      root.style.removeProperty("--ur-dock-measured-h");
      root.style.removeProperty("--ur-nav-measured-h");
    };
  }, [
    hasDockedBar,
    screen,
    askMsgs.length,
    tennisMsgs.length,
    nflMsgs.length,
    f1Msgs.length,
    nbaMsgs.length,
    mlbMsgs.length,
    golfMsgs.length,
  ]);

  // ── Header pill ────────────────────────────────────────────────────────────
  const headerPill = (
    <>
      {screen==="tennis"&&<span className="pill-tennis">{context?.currentTournament?.name?context.currentTournament.name.toUpperCase():"TENNIS"}</span>}
      {screen==="nfl"&&<span className="pill-nfl">{nflSeasonMode?"NFL IN-SEASON":"NFL FUTURES"}</span>}
      {screen==="nflplayer"&&nflPd&&<span className="pill-nfl">{selectedNflPlayer?.toUpperCase()}</span>}
      {screen==="f1"&&<span className="pill-f1">F1 2026</span>}
      {screen==="nba"&&<span className="pill-nba">NBA PROPS</span>}
      {screen==="player"&&<span className="pill-tag">{selectedPlayer?.toUpperCase()}</span>}
      {screen==="matchup"&&selectedMatchup&&(selectedMatchup.league?.includes("NFL")?<span className="pill-nfl">{selectedMatchup.league}</span>:<span className="pill-tag">{selectedMatchup.network?.toUpperCase()||selectedMatchup.league}</span>)}
      {screen==="ask"&&<span className="pill-tag">UR TAKE</span>}
      {screen==="pro"&&(
  <span
    className="pill-tag"
    style={{
      color:"#F5C842",
      border:"1px solid rgba(245,200,66,.35)",
      background:"rgba(245,200,66,.08)",
      fontSize:11,
      padding:"5px 11px",
      letterSpacing:1.5,
      fontWeight:700
    }}
  >
    PRO
  </span>
)}
      {screen==="mlb"&&<span className="pill-mlb">MLB PROPS</span>}
      {screen==="golf"&&<span style={{fontFamily:"var(--mono-font)",fontSize:9,padding:"3px 8px",borderRadius:999,color:"#FFFFFF",border:"1px solid rgba(255,255,255,.25)",background:"rgba(255,255,255,.06)",whiteSpace:"nowrap"}}>{golfData?.currentEvent?.shortName||"PGA TOUR"}</span>}
      {screen === "home" ? (
        <button
          type="button"
          className="ur-hdr-account-btn"
          onClick={() => openRestoreAccessModal()}
        >
          Account
        </button>
      ) : null}
    </>
  );

  const backNavTarget = navHistory.length > 0 ? navHistory[navHistory.length - 1] : null;
  const backNavLabel =
    backNavTarget &&
    `‹ ${
      backNavTarget.screen === "home"
        ? "HOME"
        : backNavTarget.screen === "player"
          ? "TENNIS"
          : backNavTarget.screen === "nflplayer"
            ? "NFL"
            : String(backNavTarget.screen || "").toUpperCase()
    }`;

  const onAppTouchStart = useCallback((e) => {
    const t = e.touches?.[0];
    if (!t) return;
    swipeTouchStartRef.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onAppTouchEnd = useCallback(
    (e) => {
      const start = swipeTouchStartRef.current;
      swipeTouchStartRef.current = null;
      if (!start) return;
      const t = e.changedTouches?.[0];
      if (!t) return;
      const dx = t.clientX - start.x;
      const dy = Math.abs(t.clientY - start.y);
      if (dx > 60 && dy < 40) goBack();
    },
    [goBack],
  );

  const performanceContextValue = useMemo(
    () => ({
      performanceData,
      performanceLoading,
      performanceError,
      loadPerformanceSnapshot,
    }),
    [performanceData, performanceLoading, performanceError, loadPerformanceSnapshot],
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <PerformanceContext.Provider value={performanceContextValue}>
    <>
  <StripeSubscriptionSync
    proSuccess={proSuccess}
    proCheckoutEmail={proCheckoutEmail}
    userEmail={userEmail}
    setUserEmail={setUserEmail}
    setAccessTier={setAccessTier}
    setAccessToken={setAccessToken}
    setShowUpgradeModal={setShowUpgradeModal}
    isUnlimited={isUnlimited}
    accessTier={accessTier}
  />
  <style>{css}</style>
  <div
    className={`app theme-${activeTheme}${hasDockedBar ? " has-docked" : ""}`}
    style={{
      background: THEMES[activeTheme]?.appBg || "var(--bg)",
      color:
        activeTheme === "broadsheet"
          ? "#1A1410"
          : activeTheme === "crisp"
            ? "#0F172A"
            : "var(--text)",
    }}
    onTouchStart={onAppTouchStart}
    onTouchEnd={onAppTouchEnd}
  >

        <header className="hdr">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flex: 1,
              minWidth: 0,
            }}
          >
            {navHistory.length > 0 && (
              <button
                type="button"
                onClick={goBack}
                style={{
                  flexShrink: 0,
                  border: "none",
                  background: "none",
                  padding: "4px 2px",
                  cursor: "pointer",
                  fontFamily: "var(--mono-font)",
                  fontSize: 11,
                  letterSpacing: 1,
                  color: "#00F5E9",
                }}
              >
                {backNavLabel}
              </button>
            )}
            <div className="wordmark" onClick={goHome}>
              <span className="logo-review">UnderReview</span>
            </div>
          </div>
          <div
            className="header-right"
            style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, minWidth: 0 }}
          >
            {headerPill}
          </div>
        </header>

        {/* Post-checkout entitlement (?pro=success) — global so it shows on any landing screen */}
        {proSuccess && postCheckoutBanner && (
          <div
            style={
              postCheckoutBanner === "unlocked"
                ? proMarketing.successBanner?.wrap ?? {
                    background:
                      "linear-gradient(135deg,rgba(0,230,118,.12),rgba(29,185,84,.06))",
                    border: "1px solid rgba(0,230,118,.3)",
                    borderRadius: 14,
                    padding: "16px 20px",
                    margin: "12px 16px 0",
                    textAlign: "center",
                  }
                : postCheckoutBanner === "awaiting_email"
                  ? {
                      background: "rgba(0,245,233,.06)",
                      border: "1px solid rgba(0,245,233,.22)",
                      borderRadius: 14,
                      padding: "16px 20px",
                      margin: "12px 16px 0",
                      textAlign: "center",
                    }
                  : {
                      background: "rgba(245,200,66,.08)",
                      border: "1px solid rgba(245,200,66,.28)",
                      borderRadius: 14,
                      padding: "16px 20px",
                      margin: "12px 16px 0",
                      textAlign: "center",
                    }
            }
          >
            {postCheckoutBanner === "unlocked" && (
              <div
                style={{
                  fontFamily: "var(--display-font)",
                  fontSize: 18,
                  letterSpacing: 0.5,
                  color: proMarketing.successBanner?.title ?? "#00E676",
                  lineHeight: 1.35,
                }}
              >
                Pro unlocked — you&apos;re all set.
              </div>
            )}
            {postCheckoutBanner === "awaiting_email" && (
              <div
                style={{
                  fontFamily: "var(--mono-font)",
                  fontSize: 13,
                  color: "var(--soft)",
                  letterSpacing: 0.3,
                  lineHeight: 1.45,
                }}
              >
                Payment successful — check your email for your secure login link.
              </div>
            )}
            {postCheckoutBanner === "stuck" && (
              <div
                style={{
                  fontSize: 13,
                  color: "var(--soft)",
                  lineHeight: 1.5,
                }}
              >
                Still waiting on the login email? Check spam, or request a new link.{" "}
                <button
                  type="button"
                  onClick={() => openRestoreAccessModal()}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "var(--cyan-bright)",
                    fontFamily: "inherit",
                    fontSize: "inherit",
                    textDecoration: "underline",
                    cursor: "pointer",
                    textUnderlineOffset: 3,
                  }}
                >
                  Restore access
                </button>{" "}
                or contact support.
              </div>
            )}
          </div>
        )}

        {magicLinkError ? (
          <div
            style={{
              background: "rgba(245,100,100,.1)",
              border: "1px solid rgba(245,100,100,.35)",
              borderRadius: 14,
              padding: "12px 16px",
              margin: "12px 16px 0",
              fontSize: 13,
              color: "var(--soft)",
              lineHeight: 1.45,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <span>{magicLinkError}</span>
            <button
              type="button"
              onClick={() => setMagicLinkError("")}
              style={{
                flexShrink: 0,
                border: "none",
                background: "none",
                color: "var(--cyan-bright)",
                cursor: "pointer",
                fontSize: 12,
                textDecoration: "underline",
              }}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {/* ══ HOME ══ */}
        {screen==="home"&&(
          <>
            <HomeScreen
            hasDockedBar={hasDockedBar}
            askInput={askInput}
            setAskInput={setAskInput}
            submitHome={submitHome}
            askInputRef={askInputRef}
            askBarCommon={askBarCommon}
            goTennis={goTennis}
            goNfl={goNfl}
            goF1={goF1}
            goNba={goNba}
            goMlb={goMlb}
            goGolf={goGolf}
            dynamicHomeQuestions={dynamicHomeQuestions}
            dailyFeaturedAngleCard={dailyFeaturedAngleCard}
            pgaChampionshipOddsCard={pgaChampionshipOddsCard}
            firePrompt={firePrompt}
            prefillUrTakeQuestion={prefillUrTakeQuestion}
            isUnlimited={isUnlimited}
            freeUsedCount={freeUsedCount}
            freeQuestionLimit={FREE_LIMIT}
            lastLeanRevision={lastLeanRevision}
            onOpenUpgrade={() => setShowUpgradeModal(true)}
            isNflSlateActive={isNflSlateActive}
            tickerNbaGames={tickerNbaGames}
            getSeriesLabel={getSeriesLabel}
            tennisTickerMatches={tennisTickerMatches}
            golfData={golfData}
            mlbGames={homePipeline?.mlbGamesForHome}
            mlbData={mlbData}
            f1Data={f1Data}
            homeCards={homeCards}
            openMatchup={openMatchup}
            golfScoreColor={golfScoreColor}
            liveSnapshotEventKeys={liveSnapshotKeys}
            onTodaySlateDisplayedKeys={setSlateDisplayedEventKeys}
            slateFallbackSports={[
              ...((f1Data?.usingFallback || f1Data?.schedule?.usingFallback) ? ["f1"] : []),
              "nfl",
            ]}
            nbaLiveEdgeAlerts={liveEdgeAlerts}
          />
          </>
        )}


        {/* ══ TENNIS ══ */}
        {screen==="tennis"&&(
          <TennisScreen
            tennisScreenRef={tennisScreenRef}
            hasDockedBar={hasDockedBar}
            tennisBoardHeadline={tennisBoardHeadline}
            tennisBoardSubline={tennisBoardSubline}
            liveMatches={liveMatches}
            tennisLiveMatches={tennisLiveMatches}
            tennisUpcomingMatches={tennisUpcomingMatches}
            activeTournamentMatches={activeTournamentMatches}
            tennisMsgs={tennisMsgs}
            tennisBarRef={tennisBarRef}
            tennisInputRef={tennisInputRef}
            tennisInput={tennisInput}
            setTennisInput={setTennisInput}
            submitTennis={submitTennis}
            askBarCommon={askBarCommon}
            context={context}
            tennisLoading={tennisLoading}
            openMatchup={openMatchup}
            players={players}
            wtaSectionOpen={wtaSectionOpen}
            setWtaSectionOpen={setWtaSectionOpen}
            wtaInputRef={wtaInputRef}
            wtaInput={wtaInput}
            setWtaInput={setWtaInput}
            submitWta={submitWta}
            openPlayer={openPlayer}
            urTakeTrackPlay={urTakeTrackPlay}
            accessTier={accessTier}
            onUrTakeFollowUpPick={urTakeFollowUpTennis}
            onUpgradePromptClick={openUpgradeModal}
          />
        )}


        {/* ══ NFL ══ */}
        {screen==="nfl"&&(
          <>
            <div
              className="nfl-ur-subtabs"
              style={{
                display: "flex",
                gap: 8,
                padding: "8px 14px 0",
                background: "var(--bg)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <button
                type="button"
                className={`nfl-ur-subtab${nflUrView === "take" ? " nfl-ur-subtab--active" : ""}`}
                onClick={() => {
                  setNflUrView("take");
                  syncNflSubViewQuery("take");
                }}
                style={{
                  flex: 1,
                  minHeight: 44,
                  borderRadius: 10,
                  border: nflUrView === "take" ? "1px solid rgba(74,144,217,.6)" : "1px solid var(--border)",
                  background: nflUrView === "take" ? "rgba(74,144,217,.12)" : "var(--surface)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                UR Take
              </button>
              <button
                type="button"
                className={`nfl-ur-subtab${nflUrView === "predict" ? " nfl-ur-subtab--active" : ""}`}
                onClick={() => {
                  setNflUrView("predict");
                  syncNflSubViewQuery("predict");
                }}
                style={{
                  flex: 1,
                  minHeight: 44,
                  borderRadius: 10,
                  border: nflUrView === "predict" ? "1px solid rgba(0,245,233,.55)" : "1px solid var(--border)",
                  background: nflUrView === "predict" ? "rgba(0,245,233,.1)" : "var(--surface)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                2026 Predictor
              </button>
            </div>
            {nflUrView === "take" ? (
              <NflScreen
                nflScreenRef={nflScreenRef}
                hasDockedBar={hasDockedBar}
                nflSeasonMode={nflSeasonMode}
                nflMsgs={nflMsgs}
                nflBarRef={nflBarRef}
                nflInputRef={nflInputRef}
                nflInput={nflInput}
                setNflInput={setNflInput}
                submitNfl={submitNfl}
                askBarCommon={askBarCommon}
                nflPosFilter={nflPosFilter}
                setNflPosFilter={setNflPosFilter}
                filteredNflPlayers={filteredNflPlayers}
                openNflPlayer={openNflPlayer}
                urTakeTrackPlay={urTakeTrackPlay}
                accessTier={accessTier}
                onUrTakeFollowUpPick={urTakeFollowUpNfl}
                onUpgradePromptClick={openUpgradeModal}
              />
            ) : (
              <NflPredictScreen
                isPro={isUnlimited}
                restoreProEntitlement={restoreProEntitlement}
                setUserEmail={setUserEmail}
                onSubscribePro={goPro}
              />
            )}
          </>
        )}


        {/* ══ NFL PLAYER DETAIL ══ */}
        {screen==="nflplayer"&&nflPd&&(
          <main className={`screen${hasDockedBar ? " has-msgs" : ""}`}>
            <button
              className="detail-back"
              type="button"
              onClick={() => {
                if (navHistory.length > 0) goBack();
                else {
                  setScreen("nfl");
                  setSelectedNflPlayer(null);
                }
              }}
            >
              ← BACK
            </button>
            <div className="detail-card">
              <div className="nfl-detail-head"><div className="nfl-detail-pos">{nflPd.pos} · {nflPd.team} · {nflPd.tier}</div><div className="nfl-detail-name">{selectedNflPlayer}</div><div className="nfl-detail-sub">{nflPd.ydsPg} yds/g · {nflPd.rec2025.g} games played</div></div>
              <div className="nfl-detail-grid">
                <div className="nfl-detail-stat"><div className="nfl-detail-label">YDS/G</div><div className="nfl-detail-value" style={{color:"var(--nfl)"}}>{nflPd.ydsPg}</div></div>
                <div className="nfl-detail-stat"><div className="nfl-detail-label">TDs</div><div className="nfl-detail-value" style={{color:"var(--gold)"}}>{nflPd.rec2025.td}</div></div>
                <div className="nfl-detail-stat"><div className="nfl-detail-label">YPR</div><div className="nfl-detail-value">{nflPd.rec2025.ypr}</div></div>
                {nflPd.rec2025.tgt&&<div className="nfl-detail-stat"><div className="nfl-detail-label">TARGETS</div><div className="nfl-detail-value">{nflPd.rec2025.tgt}</div></div>}
                {nflPd.rec2025.recPg&&<div className="nfl-detail-stat"><div className="nfl-detail-label">REC/G</div><div className="nfl-detail-value">{nflPd.rec2025.recPg}</div></div>}
                <div className="nfl-detail-stat"><div className="nfl-detail-label">GAMES</div><div className="nfl-detail-value">{nflPd.rec2025.g}</div></div>
              </div>
              <div className="nfl-detail-section">
                <div className="nfl-detail-section-label">Prop Breakdown</div>
                <div className="nfl-prop-block">
                  {nflPd.props.recYds&&(<><div className="nfl-prop-row"><span className="nfl-prop-name">REC YDS</span><span className="nfl-prop-val" style={{color:"var(--muted)"}}>Floor {nflPd.props.recYds.floor} / Ceil {nflPd.props.recYds.ceil}</span></div><div className="nfl-prop-row"><span className="nfl-prop-name">LEAN</span><span className={`nfl-prop-val ${nflPd.props.recYds.lean?.includes("OVER")?"lean-over":"lean-neutral"}`}>{nflPd.props.recYds.lean}</span></div></>)}
                  {nflPd.props.rec&&<div className="nfl-prop-row"><span className="nfl-prop-name">CATCHES</span><span className={`nfl-prop-val ${nflPd.props.rec.lean?.includes("OVER")?"lean-over":"lean-neutral"}`}>{nflPd.props.rec.lean}</span></div>}
                  {nflPd.props.td&&<div className="nfl-prop-row"><span className="nfl-prop-name">TD SCORER</span><span className={`nfl-prop-val ${nflPd.props.td.lean?.includes("OVER")?"lean-over":nflPd.props.td.lean?.includes("FADE")?"lean-fade":"lean-neutral"}`}>{nflPd.props.td.lean}</span></div>}
                </div>
              </div>
              <div className="nfl-detail-section"><div className="nfl-detail-section-label">Situation</div><div className="nfl-situation">{nflPd.situation}</div></div>
              <div className="nfl-detail-section"><div className="nfl-detail-section-label">Betting Angles</div><div className="nfl-betting-angles">{nflPd.bettingAngles.map((a,i)=><div key={i} className="nfl-angle-item"><div className="nfl-angle-dot"/><div>{a}</div></div>)}</div></div>
            </div>
            <AskBar inputRef={nflPlayerInputRef} value={nflInput} onChange={setNflInput} onSubmit={()=>submitNfl()} placeholder={`Ask about ${selectedNflPlayer}...`} btnColor="var(--nfl)" {...askBarCommon}/>
          </main>
        )}

        {/* ══ F1 ══ */}
        {screen==="f1"&&(
          <F1Screen
            f1ScreenRef={f1ScreenRef}
            hasDockedBar={hasDockedBar}
            f1Msgs={f1Msgs}
            f1BarRef={f1BarRef}
            f1InputRef={f1InputRef}
            f1Input={f1Input}
            setF1Input={setF1Input}
            submitF1={submitF1}
            askBarCommon={askBarCommon}
            f1Loading={f1Loading}
            f1Data={f1Data}
            urTakeTrackPlay={urTakeTrackPlay}
            accessTier={accessTier}
            onUrTakeFollowUpPick={urTakeFollowUpF1}
            onUpgradePromptClick={openUpgradeModal}
          />
        )}


        {/* ══ NBA ══ */}
        {screen==="nba"&&(
          <NbaScreen
            nbaScreenRef={nbaScreenRef}
            hasDockedBar={hasDockedBar}
            verifiedNbaGames={homePipeline?.nbaGamesForHome}
            nbaData={nbaData}
            nbaMsgs={nbaMsgs}
            nbaBarRef={nbaBarRef}
            nbaInputRef={nbaInputRef}
            nbaInput={nbaInput}
            setNbaInput={setNbaInput}
            submitNba={submitNba}
            askBarCommon={askBarCommon}
            nbaLoading={nbaLoading}
            urTakeTrackPlay={urTakeTrackPlay}
            accessTier={accessTier}
            onUrTakeFollowUpPick={urTakeFollowUpNba}
            onUpgradePromptClick={openUpgradeModal}
            getSeriesLabel={getSeriesLabel}
          />
        )}


        {/* ══ MLB ══ */}
        {screen==="mlb"&&(
          <MlbScreen
            mlbScreenRef={mlbScreenRef}
            hasDockedBar={hasDockedBar}
            mlbMsgs={mlbMsgs}
            mlbBarRef={mlbBarRef}
            mlbInputRef={mlbInputRef}
            mlbInput={mlbInput}
            setMlbInput={setMlbInput}
            submitMlb={submitMlb}
            askBarCommon={askBarCommon}
            mlbLoading={mlbLoading}
            mlbGames={mlbGames}
            mlbData={mlbData}
            urTakeTrackPlay={urTakeTrackPlay}
            accessTier={accessTier}
            onUrTakeFollowUpPick={urTakeFollowUpMlb}
            onUpgradePromptClick={openUpgradeModal}
          />
        )}



        {/* ══ WORLD CUP ══ */}
        {screen==="worldcup"&&(
          <WorldCupScreen
            wcScreenRef={wcScreenRef}
            hasDockedBar={hasDockedBar}
            wcLoading={wcLoading}
            groups={groups}
            matches={wcMatches}
            liveMatches={wcLiveMatches}
            upcomingMatches={wcUpcomingMatches}
            teams={wcTeams}
            wcMsgs={wcMsgs}
            wcBarRef={wcBarRef}
            wcInputRef={wcInputRef}
            wcInput={wcInput}
            setWcInput={setWcInput}
            submitWc={submitWc}
            askBarCommon={askBarCommon}
            accessTier={accessTier}
            onUpgradePromptClick={openUpgradeModal}
          />
        )}


        {/* ══ GOLF ══ */}
        {screen==="golf"&&(
          <GolfScreen
            golfScreenRef={golfScreenRef}
            hasDockedBar={hasDockedBar}
            golfData={golfData}
            golfLoading={golfLoading}
            golfMsgs={golfMsgs}
            golfBarRef={golfBarRef}
            golfInputRef={golfInputRef}
            golfInput={golfInput}
            setGolfInput={setGolfInput}
            submitGolf={submitGolf}
            askBarCommon={askBarCommon}
            urTakeTrackPlay={urTakeTrackPlay}
            accessTier={accessTier}
            onUrTakeFollowUpPick={urTakeFollowUpGolf}
            onUpgradePromptClick={openUpgradeModal}
          />
        )}


        {/* ══ PRO ══ */}
        {screen==="pro"&&(
  <main className={`screen${hasDockedBar ? " has-msgs" : ""}`} style={{padding:"0 0 calc(96px + env(safe-area-inset-bottom))"}}>

    {/* Already unlocked banner */}
    {(accessTier==="owner"||accessTier==="friend")&&!proSuccess&&(
      <div style={proMarketing.ownerBanner}>
        <div style={{fontSize:18}}>🔓</div>
        <div>
          <div style={{fontFamily:"var(--mono-font)",fontSize:10,color:proMarketing.ownerTitle ?? "var(--cyan-bright)",letterSpacing:2,marginBottom:2}}>{accessTier==="owner"?"OWNER ACCESS":"FRIEND ACCESS"}</div>
          <div style={{fontSize:12,color:proMarketing.ownerSub ?? "var(--muted)"}}>{accessTier==="owner"?"Full access. No limits.":"Unlocked via access code. Enjoy."}</div>
        </div>
      </div>
    )}
    {accessTier==="pro"&&(
      <div style={{margin:"8px 16px 0",textAlign:"left"}}>
        <button
          type="button"
          onClick={async()=>{
            if (openingBillingPortal) return;
            const billEmail = String(
              userEmail ||
                (typeof localStorage !== "undefined" ? localStorage.getItem("ur_email") : "") ||
                "",
            )
              .trim()
              .toLowerCase();
            if (!billEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billEmail)) {
              alert("Add the email you used for Pro (tap Subscribe on Pro tab first).");
              return;
            }
            setOpeningBillingPortal(true);
            try {
              const res = await fetch("/api/billing-portal", {
                method: "POST",
                headers: {
                  Accept: "application/json",
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ email: billEmail }),
              });
              const data = await res.json().catch(() => ({}));
              if (data.url) {
                window.location.href = data.url;
                return;
              }
              alert(data.error || "Could not open subscription settings. Try again.");
            } catch {
              alert("Could not open subscription settings. Try again.");
            } finally {
              setOpeningBillingPortal(false);
            }
          }}
          style={{
            fontFamily:"var(--body-font)",
            fontSize:11,
            color:proMarketing.ownerSub ?? "var(--muted)",
            textDecoration:"underline",
            textUnderlineOffset:3,
            opacity:openingBillingPortal ? 0.75 : 1,
            pointerEvents:openingBillingPortal ? "none" : "auto",
            background:"none",
            border:"none",
            cursor:"pointer",
            padding:0,
          }}
        >
          Manage subscription →
        </button>
      </div>
    )}

    <UrTakeProLedgerDashboard
      accessTier={accessTier}
      userEmail={userEmail}
      publicStats={publicStats}
      performanceData={performanceData}
      performanceLoading={performanceLoading}
      performanceError={performanceError}
      onRefresh={loadPerformanceSnapshot}
      onUpgrade={() => setShowUpgradeModal(true)}
    />

    {isUnlimited && trackerLoaded && (
      <div
        style={{
          margin: "8px 16px 0",
          padding: "14px 16px",
          background: "#0C0E14",
          border: "1px solid #141825",
          borderRadius: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono-font)",
              fontSize: 9,
              letterSpacing: 2,
              color: "rgba(0,245,233,0.4)",
              textTransform: "uppercase",
            }}
          >
            Your Play Tracker
          </div>
          <button
            type="button"
            onClick={() => handleClearMemory("all")}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.15)",
              fontSize: 9,
              fontFamily: "var(--mono-font)",
              letterSpacing: 1,
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 2,
            }}
          >
            Clear memory
          </button>
        </div>
        {trackedPlays.length === 0 ? (
          <div style={{ fontSize: 12, color: "#2A2D3A", lineHeight: 1.5 }}>
            Tap &quot;Track this play&quot; on any UR Take response to start your record.
          </div>
        ) : (
          <>
            {(() => {
              const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
              const recentPlays = trackedPlays.filter((p) => {
                const t = Number(p.savedAt);
                if (!Number.isFinite(t)) return true;
                return t > thirtyDaysAgo;
              });
              const ratedPlays = recentPlays.filter(
                (p) => p.result === "WIN" || p.result === "LOSS",
              );
              const wins = ratedPlays.filter((p) => p.result === "WIN").length;
              const losses = ratedPlays.filter((p) => p.result === "LOSS").length;
              const overallRate =
                ratedPlays.length >= 3 ? Math.round((wins / ratedPlays.length) * 100) : null;
              const highPlays = ratedPlays.filter((p) => p.confidence === "High");
              const highWins = highPlays.filter((p) => p.result === "WIN").length;
              const highRate =
                highPlays.length >= 3
                  ? Math.round((highWins / highPlays.length) * 100)
                  : null;

              if (overallRate == null) {
                return (
                  <div
                    style={{
                      fontFamily: "var(--mono-font)",
                      fontSize: 10,
                      color: "rgba(0,245,233,0.45)",
                      marginBottom: 10,
                      letterSpacing: 0.4,
                    }}
                  >
                    Track plays and mark results to see your record.
                  </div>
                );
              }

              return (
                <div style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      fontFamily: "var(--mono-font)",
                      fontSize: 10,
                      color: "rgba(0,245,233,0.55)",
                      letterSpacing: 0.4,
                    }}
                  >
                    W: {wins} · L: {losses} · {overallRate}% last 30 days
                  </div>
                  {highRate != null ? (
                    <div
                      style={{
                        fontFamily: "var(--mono-font)",
                        fontSize: 10,
                        color: "var(--cyan-bright)",
                        letterSpacing: 0.4,
                        marginTop: 4,
                      }}
                    >
                      High confidence: {highRate}% ({highPlays.length} plays)
                    </div>
                  ) : null}
                </div>
              );
            })()}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {trackedPlays.slice(0, 5).map((p) => {
                const s = String(p.sport || "").toLowerCase();
                const dot =
                  s === "nba"
                    ? "#FF6B00"
                    : s === "nfl"
                      ? "#4A90D9"
                      : s === "mlb"
                        ? "#1DB954"
                        : s === "tennis" || s === "tennis_wta_profile"
                          ? "#FFE600"
                          : s === "golf"
                            ? "#FFFFFF"
                            : s === "f1"
                              ? "#E10600"
                              : "var(--cyan-bright)";
                return (
                  <div
                    key={p.playId}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      paddingBottom: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: dot,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: "var(--mono-font)",
                          fontSize: 9,
                          letterSpacing: 1,
                          color: "rgba(0,245,233,0.45)",
                          textTransform: "uppercase",
                        }}
                      >
                        {String(p.sport || "").toUpperCase()}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--muted)", marginLeft: "auto" }}>
                        {p.date}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--soft)",
                        lineHeight: 1.45,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {p.play}
                    </div>
                    <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                      <span
                        style={{
                          fontFamily: "var(--mono-font)",
                          fontSize: 9,
                          padding: "2px 6px",
                          borderRadius: 4,
                          border: "1px solid rgba(255,255,255,0.12)",
                          color: "var(--muted)",
                        }}
                      >
                        {p.confidence}
                      </span>
                      {!p.result && syncErrorPlayId === p.playId ? (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            const r = lastAttemptedResult.current[p.playId];
                            if (r) void handleMarkResult(p.playId, r);
                          }}
                          onKeyDown={(ev) => {
                            if (ev.key === "Enter" || ev.key === " ") {
                              ev.preventDefault();
                              const r = lastAttemptedResult.current[p.playId];
                              if (r) void handleMarkResult(p.playId, r);
                            }
                          }}
                          style={{
                            fontSize: 10,
                            color: "#FF3D8F",
                            fontFamily: "var(--mono-font)",
                            letterSpacing: 1,
                            cursor: "pointer",
                          }}
                        >
                          Sync failed — tap to retry
                        </span>
                      ) : !p.result ? (
                        ["WIN", "LOSS", "PUSH", "VOID"].map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => handleMarkResult(p.playId, r)}
                            style={{
                              fontFamily: "var(--mono-font)",
                              fontSize: 8,
                              letterSpacing: 1,
                              padding: "4px 8px",
                              borderRadius: 4,
                              border: "1px solid rgba(255,255,255,0.12)",
                              background: "transparent",
                              color: "rgba(0,245,233,0.5)",
                              cursor: "pointer",
                              textTransform: "uppercase",
                            }}
                          >
                            {r}
                          </button>
                        ))
                      ) : (
                        <span
                          style={{
                            fontFamily: "var(--mono-font)",
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: 1,
                            color:
                              p.result === "WIN"
                                ? "#00E676"
                                : p.result === "LOSS"
                                  ? "#FF5252"
                                  : "var(--muted)",
                          }}
                        >
                          {p.result}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    )}

    {/* Pro header — same surface language as record panel (tool, not landing) */}
    <div style={proMarketing.subscriptionCard}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--mono-font)", fontSize: 9, letterSpacing: 2, color: proMarketing.subLabel ?? "var(--muted)", textTransform: "uppercase" }}>
          Subscription
        </div>
        <div
          style={{
            fontFamily: "var(--display-font)",
            fontSize: 22,
            letterSpacing: 0.5,
            color: proMarketing.subBody ?? "var(--text)",
            lineHeight: 1.25,
            maxWidth: 420,
          }}
        >
          Stop guessing. Read the edge.
        </div>
        <div
          style={{
            fontSize: 12,
            color: proMarketing.subBody ?? "var(--soft)",
            lineHeight: 1.5,
            maxWidth: 400,
            whiteSpace: "pre-line",
          }}
        >
          {`UR Take reads rotations,
injuries, pace, and live game scripts —
then gives you a direct call.
Not picks. A real-time betting edge.`}
        </div>
      </div>
      <div
        style={{
          fontFamily: "var(--mono-font)",
          fontSize: 10,
          color: proMarketing.priceAside ?? "rgba(0,245,233,.5)",
          letterSpacing: 1.2,
          lineHeight: 1.5,
          textAlign: "right",
          maxWidth: 200,
        }}
      >
        $9.99/month · cancel anytime
      </div>
    </div>

    {/* Value bar */}
    <div style={proMarketing.valueGrid}>
      {[
        [
          "KNOW BEFORE THE LINE MOVES",
          `Rotation gaps, injury context,
pace math — before the market
adjusts.`,
        ],
        [
          "THE PLAY. EVERY TIME.",
          `Every response closes with a
direct call. No hedging.
No 'on the other hand.'`,
        ],
        [
          "IT REMEMBERS. YOU BUILD.",
          `UR Take carries the thread
across sessions. Your angles
compound.`,
        ],
        [
          "ASK EVERYTHING. PAY NOTHING EXTRA.",
          `No weekly ceiling. No per-query
fees. One price, unlimited reads.`,
        ],
      ].map(([title, descriptor])=>(
        <div key={title} style={proMarketing.valueCell}>
          <div style={{
            fontFamily: "var(--mono-font)",
            fontSize: 9,
            letterSpacing: 2,
            textTransform: "uppercase",
            marginBottom: 6,
            background: "linear-gradient(90deg, #C0A060, #E8C87A, #F0D890, #E8C87A, #C0A060)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>{title}</div>
          <div style={{
            fontSize: 11,
            color: "var(--soft)",
            lineHeight: 1.45,
            fontWeight: 400,
            fontFamily: "var(--body-font)",
            whiteSpace: "pre-line",
          }}>{descriptor}</div>
        </div>
      ))}
    </div>

{isUnlimited && (() => {
  const lightChrome = isProLightTheme(activeTheme);
  const isDark = !lightChrome;
  return (
    <div style={{
      margin: "24px 20px 0",
      paddingTop: 18,
      borderTop: lightChrome
        ? (activeTheme === "crisp"
          ? "1px solid #94A3B8"
          : "1px solid rgba(26,20,16,.15)")
        : "1px solid rgba(255,255,255,.07)",
    }}>
      <div style={{
        fontFamily: "var(--mono-font)",
        fontSize: 9,
        letterSpacing: 3,
        color: isDark
          ? "rgba(255,255,255,.35)"
          : "#64748B",
        textTransform: "uppercase",
        marginBottom: 4,
      }}>
        Betting Style
      </div>
      <div style={{
        fontSize: 10,
        color: isDark
          ? "rgba(255,255,255,.25)"
          : "#94A3B8",
        fontFamily: "var(--mono-font)",
        letterSpacing: 0.4,
        marginBottom: 12,
        lineHeight: 1.45,
      }}>
        Select how you approach your bets
        so UR Take can optimize its takes
        for you.
      </div>
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}>
        {[
          {
            id: "balanced",
            label: "⚡ I Like a Bit of Risk",
            desc: "Balanced reads. Full picture. " +
              "You decide how hard to lean.",
          },
          {
            id: "limits",
            label: "🔥 I Push the Limits",
            desc: "Bold angles. Max conviction. " +
              "UR Take commits when the edge is real.",
          },
        ].map((option) => {
          const isActive =
            bettingStyle === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() =>
                handleBettingStyleChange(
                  option.id
                )
              }
              style={{
                background: isActive
                  ? isDark
                    ? "rgba(0,245,233,0.08)"
                    : "rgba(0,196,184,0.08)"
                  : isDark
                    ? "#0C0E14"
                    : "#F8FAFC",
                border: `1px solid ${
                  isActive
                    ? isDark
                      ? "rgba(0,245,233,0.35)"
                      : "rgba(0,196,184,0.35)"
                    : isDark
                      ? "#141820"
                      : "#E2E8F0"
                }`,
                borderRadius: 12,
                padding: "12px 14px",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
              }}
            >
              <div>
                <div style={{
                  fontFamily: "var(--body-font)",
                  fontSize: 13,
                  fontWeight: 700,
                  color: lightChrome
                    ? "#1E293B"
                    : isActive
                      ? "var(--cyan-bright)"
                      : "var(--text)",
                  marginBottom: 2,
                }}>
                  {option.label}
                </div>
                <div style={{
                  fontSize: 10,
                  color: isDark
                    ? "rgba(255,255,255,.3)"
                    : "#94A3B8",
                  fontFamily: "var(--mono-font)",
                  letterSpacing: 0.5,
                  lineHeight: 1.4,
                }}>
                  {option.desc}
                </div>
              </div>
              {isActive && (
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--cyan-bright)",
                  flexShrink: 0,
                  marginLeft: 12,
                }}/>
              )}
            </button>
          );
        })}
      </div>
      {styleToast && (
        <div style={{
          fontFamily: "var(--mono-font)",
          fontSize: 10,
          color: "var(--muted)",
          marginTop: 8,
          letterSpacing: 0.4,
          lineHeight: 1.4,
        }}>
          {styleToast}
        </div>
      )}
    </div>
  );
})()}

    {/* Price + subscribe CTA — hidden once user has Pro / owner / friend */}
    {!isUnlimited && (
    <div style={{padding:"24px 20px 0",textAlign:"center"}}>
      <style>{`
        @keyframes gleam{0%{background-position:200% center;}100%{background-position:-200% center;}}
        .theme-epilogue .pro-cta-btn{
          display:block;width:100%;padding:18px;
          border:2px solid #FFFFFF;border-radius:16px;
          background:transparent;color:#FFFFFF;
          font-family:var(--display-font);font-size:22px;letter-spacing:2px;
          cursor:pointer;transition:background .2s,color .2s;
          margin-bottom:8px;
        }
        .theme-epilogue .pro-cta-btn:hover{background:#FFFFFF;color:#080A0C;}
      `}</style>
      <div
        style={{
          fontFamily: "var(--mono-font)",
          fontSize: 10,
          letterSpacing: 2,
          color: "var(--cyan-bright)",
          textTransform: "uppercase",
          marginBottom: 12,
          textAlign: "center",
        }}
      >
        ✓ Lines move — you move first
        <br />
        ✓ Real-time edges, not yesterday&apos;s picks
        <br />
        ✓ Built to beat the market
      </div>
      <div style={{display:"flex",alignItems:"baseline",justifyContent:"center",gap:0,marginBottom:4}}>
        <span style={{fontSize:32,fontWeight:800,color:"var(--cyan-bright)",lineHeight:1}}>$</span>
        <span style={{fontSize:64,fontWeight:800,color:"var(--cyan-bright)",letterSpacing:-2,lineHeight:1}}>9</span>
        <span style={{fontSize:64,fontWeight:800,color:"var(--cyan-bright)",letterSpacing:-2,lineHeight:1}}>.99</span>
        <span style={{fontSize:12,color:"var(--muted)",alignSelf:"flex-end",paddingBottom:8,marginLeft:4}}>/month</span>
      </div>
      <div style={{fontFamily:"var(--mono-font)",fontSize:10,letterSpacing:2,color:proMarketing.trialLine ?? "rgba(0,245,233,.35)",textTransform:"uppercase",marginBottom:18}}>$9.99/month · cancel anytime</div>
      <ProCheckoutCTA
        className="pro-cta-btn"
        restoreProEntitlement={restoreProEntitlement}
        setUserEmail={setUserEmail}
      >
        Unlock Live Edges →
      </ProCheckoutCTA>
      <div style={{fontFamily:"var(--mono-font)",fontSize:10,color:proMarketing.checkoutFoot ?? "rgba(255,255,255,.15)",letterSpacing:1,textTransform:"uppercase"}}>$9.99/month · cancel anytime · one question free to start</div>
    </div>
    )}

    {/* Features */}
    <div style={{fontFamily:"var(--mono-font)",fontSize:9,letterSpacing:3,color:proMarketing.whatsInc ?? "#3A4050",textTransform:"uppercase",padding:"22px 20px 12px",display:"flex",alignItems:"center",gap:8}}>
      What you&apos;re actually getting<span style={{flex:1,height:1,background:proMarketing.whatsIncRule ?? "rgba(255,255,255,.05)",display:"block"}}/>
    </div>

    <div style={{display:"flex",flexDirection:"column",gap:1,margin:"0 20px"}}>
      {[
        {color:"var(--cyan-bright)",name:"Betting Style Personalization",desc:"Tell UR Take how you approach your bets. Bold and committed, or full picture to decide. Toggle anytime."},
        {color:"#FFE600",name:"Tennis — Elo + Surface Edges",desc:"ATP/WTA rally profiles, serve baselines, draw-path value across every surface."},
        {color:"#1DB954",name:"MLB — Pitcher K Props",desc:"Park-adjusted, platoon-split, barrel rate. Know before the line moves."},
        {color:"#FF6B00",name:"NBA — PRA Calibration",desc:"Pace-adjusted floors and ceilings. Live injury replacement plays in real time."},
        {color:"#4A90D9",name:"NFL — QB, RB, WR & TE Database",desc:"TD rates, prop floors and ceilings for every QB, RB, WR, and TE. Scheme and matchup angles. Full live props arriving with the 2026 season."},
        {color:"#E10600",name:"F1 — Race-Day Angles",desc:"Full 2026 driver grid. Race-day edges the market hasn't priced yet."},
        {color:"#FFFFFF",name:"Golf — Course Fit & Matchup H2Hs",desc:"PGA SG profiles, make-cut plays, and outright value the market underprices weekly."},
      ].map((f,i,arr)=>(
        <div key={f.name} style={proMarketing.featureRow(i, arr.length)}>
          <div style={{width:8,height:8,borderRadius:"50%",background:f.color === "#FFFFFF" && isProLightTheme(activeTheme) ? "#475569" : f.color,flexShrink:0}}/>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700,color:proMarketing.featureTitle ?? "var(--text)",marginBottom:1}}>{f.name}</div>
            <div style={{fontSize:11,color:proMarketing.featureDesc ?? "#4A5568",lineHeight:1.5}}>{f.desc}</div>
          </div>
          <div style={{fontSize:14,color:proMarketing.featureChev ?? "#2A3040"}}>›</div>
        </div>
      ))}
    </div>

    {/* Proof points */}
    <div style={proMarketing.quoteBox}>
      <div style={{fontSize:13,color:proMarketing.quoteText ?? "#8A95A3",lineHeight:1.75,marginBottom:6,whiteSpace:"pre-line"}}>{`125+ injuries tracked —
 market reacts slower than this.`}</div>
      <div style={{fontSize:13,color:proMarketing.quoteText ?? "#8A95A3",lineHeight:1.75,marginBottom:6,whiteSpace:"pre-line"}}>{`280 player profiles across 6 sports —
 updated every 30 minutes.`}</div>
      <div style={{fontSize:13,color:proMarketing.quoteText ?? "#8A95A3",lineHeight:1.75,whiteSpace:"pre-line"}}>{`Live game scripts adjust in real time —
 you know before the line moves.`}</div>
    </div>
{isUnlimited && (() => {
      const dm = getDisplayModeChrome(activeTheme);
      const lightChrome = isProLightTheme(activeTheme);
      return (
  <div style={{
    margin:"24px 20px 0",
    paddingTop:18,
    borderTop: lightChrome
      ? (activeTheme === "crisp" ? "1px solid #94A3B8" : "1px solid rgba(26,20,16,.15)")
      : "1px solid rgba(255,255,255,.07)",
  }}>
    <div
      style={{
        fontFamily:"var(--mono-font)",
        fontSize:9,
        letterSpacing:3,
        color: dm.sectionLabel,
        textTransform:"uppercase",
        marginBottom:4
      }}
    >
      Display mode
    </div>
    <div style={{ fontSize:10, color: dm.subtitle, fontFamily:"var(--mono-font)", letterSpacing:0.4, marginBottom:12, lineHeight:1.45 }}>
      {canUseProThemes(accessTier)
        ? accessTier === "owner"
          ? "Choose your look. Pro unlocks two additional themes."
          : "Pro: Broadsheet (newsprint) or Crisp Sport (slate). Everyone else stays on Authority dark."
        : "Light editions unlock with Pro or an owner access code."}
    </div>

    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {Object.values(THEMES)
        .filter((theme) => !theme.proOnly || canUseProThemes(accessTier))
        .map((theme) => {
          const isActive = activeTheme === theme.id;

          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => setActiveTheme(theme.id)}
              style={{
                background: isActive ? dm.activeBg : dm.inactiveBg,
                border: `1px solid ${isActive ? dm.activeBorder : dm.inactiveBorder}`,
                borderRadius: 12,
                padding: "12px 14px",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                color: dm.rowText,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily:"var(--body-font)",
                    fontSize:13,
                    fontWeight:700,
                    color: lightChrome ? dm.rowText : (isActive ? dm.titleActive : dm.titleInactive),
                    marginBottom:2
                  }}
                >
                  {theme.name}
                  {theme.proOnly && (
                    <span
                      style={{
                        marginLeft:8,
                        fontSize:9,
                        color:"#F5C842",
                        fontFamily:"var(--mono-font)",
                        letterSpacing:1
                      }}
                    >
                      PRO
                    </span>
                  )}
                </div>

                <div
                  style={{
                    fontSize:10,
                    color: dm.subtitle,
                    fontFamily:"var(--mono-font)",
                    letterSpacing:.5
                  }}
                >
                  {theme.label}
                </div>
              </div>

              {isActive && (
                <div
                  style={{
                    width:8,
                    height:8,
                    borderRadius:"50%",
                    background: dm.dot,
                    flexShrink:0,
                    marginLeft:12
                  }}
                />
              )}
            </button>
          );
        })}
    </div>
  </div>
      );
    })()}
    {/* Bottom */}
    <div style={{padding:"18px 20px 0",textAlign:"center",display:"flex",flexDirection:"column",gap:10,alignItems:"center"}}>
      <button onClick={()=>setShowCodeEntry(true)} style={{background:"none",border:"none",color:proMarketing.bottomMuted ?? "var(--muted)",cursor:"pointer",fontSize:11,fontFamily:"var(--body-font)",textDecoration:"underline",textUnderlineOffset:3}}>Have an access code? Enter it here →</button>
      {accessTier === "free" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--muted)",
              fontFamily: "var(--body-font)",
              letterSpacing: 0.3,
            }}
          >
            Already subscribed?
          </div>
          <button
            type="button"
            onClick={() => openRestoreAccessModal()}
            style={{
              background: "none",
              border: "none",
              color: "var(--cyan-bright)",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: "var(--mono-font)",
              letterSpacing: 1,
              fontWeight: 700,
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            Restore access →
          </button>
        </div>
      ) : null}
      <div style={{fontFamily:"var(--mono-font)",fontSize:9,color:proMarketing.stripeFoot ?? "#1E242E",letterSpacing:1}}>Powered by Stripe · Secure checkout</div>
    </div>

    <div className="page-spacer"/>
  </main>
)}

    {/* ══ MATCHUP DETAIL ══ */}
        {screen==="matchup"&&selectedMatchup&&(
          <main ref={matchupScreenRef} className={`screen${hasDockedBar ? " has-msgs" : ""}`}>
            <button
              className="detail-back"
              type="button"
              onClick={() => {
                if (navHistory.length > 0) goBack();
                else {
                  setSelectedMatchup(null);
                  setScreen(selectedMatchup?.league?.includes("NFL") ? "nfl" : "tennis");
                }
              }}
            >
              ← BACK
            </button>
            <div className="detail-card">
              <div className="detail-head"><div className="detail-league" style={{color:selectedMatchup.leagueColor}}>{selectedMatchup.league}</div><div className="detail-title">{selectedMatchup.title}</div><div className="detail-sub">{selectedMatchup.time} · {selectedMatchup.network}</div></div>
              <div className="what-matters"><div className="wm-label">Match Snapshot</div><div className="wm-text">{selectedMatchup.whatMatters||"Ask for the side, total, props, or live angle."}</div></div>
              {selectedMatchup.stats&&<div className="mini-grid">{selectedMatchup.stats.map(s=><div key={s.label} className="mini-stat"><div className="mini-label">{s.label}</div><div className="mini-value">{s.value}</div></div>)}</div>}
              {selectedMatchup.quickHitters&&<div className="quick-hitters">{selectedMatchup.quickHitters.map(q=><button key={q} className="quick-btn" onClick={()=>submitMatchup(q)}>{q}</button>)}</div>}
            </div>
            <ChatThread
              msgs={matchupMsgs}
              urTakeTrackPlay={urTakeTrackPlay}
              accessTier={accessTier}
              onUrTakeFollowUpPick={urTakeFollowUpMatchup}
              onUpgradePromptClick={openUpgradeModal}
              hideFollowUpDock
            />
            <UrTakeFollowUpDockStrip msgs={matchupMsgs} onPick={urTakeFollowUpMatchup} />
            <AskBar inputRef={matchupInputRef} value={matchupInput} onChange={setMatchupInput} onSubmit={()=>submitMatchup()} placeholder={`Ask about ${selectedMatchup.title}...`} {...askBarCommon}/>
          </main>
        )}

        {/* ══ TENNIS PLAYER DETAIL ══ */}
        {screen==="player"&&pd&&(
          <main className={`screen${hasDockedBar ? " has-msgs" : ""}`}>
            <button
              className="detail-back"
              type="button"
              onClick={() => {
                if (navHistory.length > 0) goBack();
                else setScreen("tennis");
              }}
            >
              ← BACK
            </button>
            <div className="detail-card">
              <div className="detail-head"><div className="detail-league" style={{color:"var(--cyan-bright)"}}>TENNIS PLAYER PROFILE</div><div className="detail-title">{selectedPlayer}</div><div className="detail-sub">{Array.isArray(pd.style)?pd.style.join(", ").replaceAll("_"," "):pd.style} · Elo {pd.elo}</div></div>
              <div className="what-matters"><div className="wm-label">Surface Notes</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:8}}><div className="mini-stat"><div className="mini-label">HARD</div><div className="mini-value" style={{color:"var(--cyan-bright)"}}>•</div><div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>{pd.surfaceNote?.hard||"—"}</div></div><div className="mini-stat"><div className="mini-label">CLAY</div><div className="mini-value" style={{color:"var(--gold)"}}>•</div><div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>{pd.surfaceNote?.clay||"—"}</div></div><div className="mini-stat"><div className="mini-label">GRASS</div><div className="mini-value" style={{color:"var(--green)"}}>•</div><div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>{pd.surfaceNote?.grass||"—"}</div></div></div></div>
              <div style={{padding:"0 14px 14px"}}><div className="wm-label" style={{marginBottom:8}}>2026 Form</div><div style={{background:"var(--surface-2)",borderRadius:10,padding:10,fontSize:13,color:"var(--soft)",lineHeight:1.5}}>{pd.record2026||"—"}</div></div>
              <div className="what-matters" style={{paddingTop:0}}><div className="wm-label">Serve</div><div style={{fontSize:13,color:"var(--soft)",lineHeight:1.5}}>{formatServeStats(pd.serveStats)}</div></div>
              <div className="what-matters" style={{paddingTop:0}}><div className="wm-label">Return</div><div style={{fontSize:13,color:"var(--soft)",lineHeight:1.5}}>{formatReturnStats(pd.returnStats)}</div></div>
              <div className="what-matters" style={{paddingTop:0}}><div className="wm-label">Overall</div><div style={{fontSize:13,color:"var(--soft)",lineHeight:1.5}}>{formatOverallStats(pd.overallStats)}</div></div>
              {pd.miamiNote&&<div className="what-matters" style={{paddingTop:0}}><div className="wm-label" style={{color:"var(--mag)"}}>Tournament Note</div><div style={{fontSize:13,color:"var(--soft)",lineHeight:1.55}}>{pd.miamiNote}</div></div>}
              {pd.fullNote&&<div className="what-matters" style={{paddingTop:0}}><div className="wm-label">UR Take</div><div style={{fontSize:13,color:"var(--soft)",lineHeight:1.55}}>{pd.fullNote}</div></div>}
            </div>
            <AskBar inputRef={playerInputRef} value={tennisInput} onChange={setTennisInput} onSubmit={()=>submitTennis()} placeholder={`Ask about ${selectedPlayer}...`} {...askBarCommon}/>
          </main>
        )}

        {/* ══ ASK ══ */}
        {screen==="ask"&&(
          <AskScreen
            askScreenRef={askScreenRef}
            hasDockedBar={hasDockedBar}
            askMsgs={askMsgs}
            askInputRef={askInputRef}
            askInput={askInput}
            setAskInput={setAskInput}
            submitAsk={submitAsk}
            askBarCommon={askBarCommon}
            dynamicHomeQuestions={dynamicHomeQuestions}
            firePrompt={firePrompt}
            urTakeTrackPlay={urTakeTrackPlay}
            accessTier={accessTier}
            onUrTakeFollowUpPick={urTakeFollowUpAsk}
            onUpgradePromptClick={openUpgradeModal}
            fileInputRef={fileInputRef}
            savedTakes={savedTakes}
            onSaveLastUrTake={onSaveLastUrTake}
            onOpenSavedTake={onOpenSavedTake}
          />
        )}


        {/* ══ DOCKED INPUT BARS ══ */}
        {screen==="tennis"&&tennisMsgs.length>0&&(
          <div className="docked-bar ur-docked-bar">
            <div className="docked-interaction-zone" style={{ "--dock-accent": "rgba(255,230,0,.25)" }}>
              <div className="docked-bar-label" style={{color:"#FFE600"}}>Tennis · Ask another</div>
              <UrTakeFollowUpDockStrip msgs={tennisMsgs} onPick={urTakeFollowUpTennis} />
              <AskBar inputRef={tennisInputRef} value={tennisInput} onChange={setTennisInput} onSubmit={()=>submitTennis()} placeholder="Ask another..." {...askBarCommon} dockedGradient />
            </div>
          </div>
        )}
        {screen==="nfl"&&nflUrView==="take"&&nflMsgs.length>0&&(
          <div className="docked-bar ur-docked-bar">
            <div className="docked-interaction-zone" style={{ "--dock-accent": "rgba(74,144,217,.25)" }}>
              <div className="docked-bar-label" style={{color:"#4A90D9"}}>NFL · Ask another</div>
              <UrTakeFollowUpDockStrip msgs={nflMsgs} onPick={urTakeFollowUpNfl} />
              <AskBar inputRef={nflInputRef} value={nflInput} onChange={setNflInput} onSubmit={()=>submitNfl()} placeholder="Ask another..." btnColor="#4A90D9" {...askBarCommon} dockedGradient />
            </div>
          </div>
        )}
        {screen==="f1"&&f1Msgs.length>0&&(
          <div className="docked-bar ur-docked-bar">
            <div className="docked-interaction-zone" style={{ "--dock-accent": "rgba(225,6,0,.25)" }}>
              <div className="docked-bar-label" style={{color:"var(--f1)"}}>F1 · Ask another</div>
              <UrTakeFollowUpDockStrip msgs={f1Msgs} onPick={urTakeFollowUpF1} />
              <AskBar inputRef={f1InputRef} value={f1Input} onChange={setF1Input} onSubmit={()=>submitF1()} placeholder="Ask another..." btnColor="var(--f1)" {...askBarCommon} dockedGradient />
            </div>
          </div>
        )}
        {screen==="nba"&&nbaMsgs.length>0&&(
          <div className="docked-bar ur-docked-bar">
            <div className="docked-interaction-zone" style={{ "--dock-accent": "rgba(255,107,0,.25)" }}>
              <div className="docked-bar-label" style={{color:"var(--nba)"}}>NBA · Ask another</div>
              <UrTakeFollowUpDockStrip msgs={nbaMsgs} onPick={urTakeFollowUpNba} />
              <AskBar inputRef={nbaInputRef} value={nbaInput} onChange={setNbaInput} onSubmit={()=>submitNba()} placeholder="Ask another..." btnColor="var(--nba)" {...askBarCommon} dockedGradient />
            </div>
          </div>
        )}
        {screen==="mlb"&&mlbMsgs.length>0&&(
          <div className="docked-bar ur-docked-bar">
            <div className="docked-interaction-zone" style={{ "--dock-accent": "rgba(29,185,84,.25)" }}>
              <div className="docked-bar-label" style={{color:"var(--mlb)"}}>MLB · Ask another</div>
              <UrTakeFollowUpDockStrip msgs={mlbMsgs} onPick={urTakeFollowUpMlb} />
              <AskBar inputRef={mlbInputRef} value={mlbInput} onChange={setMlbInput} onSubmit={()=>submitMlb()} placeholder="Ask another..." btnColor="var(--mlb)" {...askBarCommon} dockedGradient />
            </div>
          </div>
        )}
        {screen==="golf"&&golfMsgs.length>0&&(
          <div className="docked-bar ur-docked-bar">
            <div className="docked-interaction-zone" style={{ "--dock-accent": "rgba(255,255,255,.2)" }}>
              <div className="docked-bar-label" style={{color:"#FFFFFF"}}>Golf · Ask another</div>
              <UrTakeFollowUpDockStrip msgs={golfMsgs} onPick={urTakeFollowUpGolf} />
              <AskBar inputRef={golfInputRef} value={golfInput} onChange={setGolfInput} onSubmit={()=>submitGolf()} placeholder="Ask another..." btnColor="#DCE6F2" {...askBarCommon} dockedGradient />
            </div>
          </div>
        )}
        {screen==="ask"&&askMsgs.length>0&&(
          <div className="docked-bar ur-docked-bar">
            <div className="docked-interaction-zone">
              <UrTakeFollowUpDockStrip msgs={askMsgs} onPick={urTakeFollowUpAsk} />
              <AskBar inputRef={askInputRef} value={askInput} onChange={setAskInput} onSubmit={submitAsk} placeholder="Go deeper..." {...askBarCommon} dockedGradient />
            </div>
          </div>
        )}

        {/* ══ UPGRADE MODAL (LIMIT HIT) ══ */}
        {showUpgradeModal&&(
          <div style={{position:"fixed",inset:0,background:"rgba(8,10,12,.92)",zIndex:101,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
            <div style={{background:"var(--surface)",border:"1px solid var(--border-2)",borderRadius:20,padding:24,maxWidth:380,width:"100%",textAlign:"center"}}>
              <div style={{fontSize:13,color:"var(--muted)",lineHeight:1.6,marginBottom:16,whiteSpace:"pre-line"}}>
                {`${UPGRADE_LIMIT_HIT_HEADLINE}

${UPGRADE_MODAL_DAILY_TAGLINE}

${UPGRADE_LIMIT_HIT_BODY}`}
              </div>
              <div style={{ marginBottom: 18, paddingBottom: 16, borderBottom: "1px solid var(--border-2)" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8, fontFamily: "var(--body-font)" }}>
                  Already subscribed?
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowUpgradeModal(false);
                    openRestoreAccessModal();
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--cyan-bright)",
                    cursor: "pointer",
                    fontSize: 14,
                    fontFamily: "var(--mono-font)",
                    letterSpacing: 1,
                    fontWeight: 700,
                    textDecoration: "underline",
                    textUnderlineOffset: 3,
                  }}
                >
                  Restore access →
                </button>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 10, lineHeight: 1.45 }}>
                  New phone or browser? Enter the email from your Stripe receipt — we&apos;ll email you a secure login link.
                </div>
              </div>
              <button
                onClick={() => { setShowUpgradeModal(false); goPro(); }}
                style={{width:"100%",padding:"13px",border:"none",borderRadius:10,background:"var(--cyan-bright)",color:"#080A0C",fontFamily:"var(--display-font)",fontSize:18,letterSpacing:2,cursor:"pointer",marginBottom:10}}
              >
                Unlock Pro — $9.99/mo
              </button>
              <button
                onClick={() => setShowUpgradeModal(false)}
                style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:12,fontFamily:"var(--body-font)"}}
              >
                Not now
              </button>
            </div>
          </div>
        )}

        {showRestoreAccessModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(8,10,12,.94)",
              zIndex: 102,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border-2)",
                borderRadius: 20,
                padding: 24,
                maxWidth: 400,
                width: "100%",
                textAlign: "left",
              }}
            >
              <div style={{ fontFamily: "var(--display-font)", fontSize: 22, letterSpacing: 0.5, marginBottom: 8, color: "var(--text)" }}>
                Restore Pro access
              </div>
              {restoreAccessLinkSent ? (
                <>
                  <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.55, marginBottom: 16 }}>
                    Check your email for your secure login link. It expires in 15 minutes and works once.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRestoreAccessModal(false);
                      setRestoreAccessLinkSent(false);
                      setRestoreAccessError("");
                    }}
                    style={{
                      width: "100%",
                      padding: "13px",
                      border: "none",
                      borderRadius: 10,
                      background: "var(--cyan-bright)",
                      color: "#080A0C",
                      fontFamily: "var(--display-font)",
                      fontSize: 16,
                      letterSpacing: 1,
                      cursor: "pointer",
                    }}
                  >
                    Close
                  </button>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55, marginBottom: 16 }}>
                    Enter the email you used at Stripe checkout. If it has active Pro, you&apos;ll receive a secure login link.
                  </p>
                  <label htmlFor="restore-access-email" style={{ fontSize: 11, fontFamily: "var(--mono-font)", color: "var(--muted)", letterSpacing: 1, display: "block", marginBottom: 6 }}>
                    EMAIL
                  </label>
                  <input
                    id="restore-access-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="go"
                    placeholder="you@example.com"
                    value={restoreAccessEmail}
                    onChange={(e) => {
                      setRestoreAccessEmail(e.target.value);
                      setRestoreAccessError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void submitRestoreAccess();
                    }}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "var(--surface-2)",
                      border: `1px solid ${restoreAccessError ? "var(--red)" : "var(--border-2)"}`,
                      borderRadius: 10,
                      padding: "12px 14px",
                      color: "var(--text)",
                      fontSize: 16,
                      fontFamily: "var(--body-font)",
                      outline: "none",
                      marginBottom: restoreAccessError ? 8 : 14,
                    }}
                  />
                  {restoreAccessError ? (
                    <div style={{ fontSize: 12, color: "var(--red)", lineHeight: 1.45, marginBottom: 14 }}>{restoreAccessError}</div>
                  ) : null}
                  <button
                    type="button"
                    disabled={restoreAccessBusy}
                    onClick={() => void submitRestoreAccess()}
                    style={{
                      width: "100%",
                      padding: "13px",
                      border: "none",
                      borderRadius: 10,
                      background: "var(--cyan-bright)",
                      color: "#080A0C",
                      fontFamily: "var(--display-font)",
                      fontSize: 16,
                      letterSpacing: 1,
                      cursor: restoreAccessBusy ? "wait" : "pointer",
                      opacity: restoreAccessBusy ? 0.85 : 1,
                      marginBottom: 10,
                    }}
                  >
                    {restoreAccessBusy ? "Sending…" : "Email me a login link"}
                  </button>
                </>
              )}
              {!restoreAccessLinkSent ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowRestoreAccessModal(false);
                    setRestoreAccessError("");
                    setRestoreAccessLinkSent(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "none",
                    borderRadius: 10,
                    background: "transparent",
                    color: "var(--muted)",
                    fontFamily: "var(--body-font)",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        )}

        {/* ══ CODE ENTRY MODAL ══ */}
        {showCodeEntry&&(
          <div style={{position:"fixed",inset:0,background:"rgba(8,10,12,.92)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
            <div style={{background:"var(--surface)",border:"1px solid var(--border-2)",borderRadius:20,padding:28,maxWidth:360,width:"100%",textAlign:"center"}}>
              <div style={{fontFamily:"var(--display-font)",fontSize:24,letterSpacing:1,marginBottom:6}}>ENTER ACCESS CODE</div>
              <div style={{fontSize:13,color:"var(--muted)",lineHeight:1.6,marginBottom:20}}>Got a code from someone? Enter it below for unlocked access.</div>
              <input
                type="text"
                placeholder="Access code"
                value={codeInput}
                onChange={e=>{setCodeInput(e.target.value);setCodeError("");}}
                onKeyDown={e=>{ if(e.key==="Enter") redeemCode(); }}
                style={{width:"100%",background:"var(--surface-2)",border:`1px solid ${codeError?"var(--red)":"var(--border-2)"}`,borderRadius:10,padding:"12px 14px",color:"var(--text)",fontSize:16,fontFamily:"var(--mono-font)",letterSpacing:2,outline:"none",marginBottom:codeError?6:12,textTransform:"uppercase"}}
                autoFocus
              />
              {codeError&&<div style={{fontSize:11,color:"var(--red)",marginBottom:12,textAlign:"left"}}>{codeError}</div>}
              <button
                disabled={!codeInput.trim()||codeLoading}
                onClick={redeemCode}
                style={{width:"100%",padding:"13px",border:"none",borderRadius:10,background:codeInput.trim()?"var(--cyan-bright)":"var(--border)",color:"#080A0C",fontFamily:"var(--display-font)",fontSize:18,letterSpacing:2,cursor:codeInput.trim()?"pointer":"not-allowed",marginBottom:12}}
              >{codeLoading?"CHECKING...":"UNLOCK"}</button>
              <button onClick={()=>{setShowCodeEntry(false);setCodeInput("");setCodeError("");}} style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:12,fontFamily:"var(--body-font)"}}>Cancel</button>
            </div>
          </div>
        )}

        {/* ══ NAV ══ */}
        <nav className="bottom-nav" aria-label="Primary">
          <button className={`nav-btn${tab==="home"&&screen==="home"?" active":""}`} onClick={goHome}><span>Home</span></button>
          <button className={`nav-btn${tab==="tennis"?" tennis-active":""}`} onClick={goTennis}><span>Tennis</span></button>
          <button className={`nav-btn${tab==="nfl"?" nfl-active":""}`} onClick={goNfl}><span>NFL</span></button>
          <button className={`nav-btn${tab==="f1"?" f1-active":""}`} onClick={goF1}><span>F1</span></button>
          <button className={`nav-btn${tab==="nba"?" nba-active":""}`} onClick={goNba}><span>NBA</span></button>
          <button className={`nav-btn${tab==="mlb"?" mlb-active":""}`} onClick={goMlb}><span>MLB</span></button>
          <button className={`nav-btn${tab==="golf"?" golf-active":""}`} onClick={goGolf}><span>Golf</span></button>
          <button className={`nav-btn${tab==="worldcup"?" wc-active":""}`} onClick={goWorldCup}><span>World Cup</span></button>
          <button
            className={`nav-btn nav-btn--ur-take${tab === "ask" && screen === "ask" ? " active" : ""}`}
            onClick={goUrTakeTab}
          >
            <span>UR Take</span>
          </button>
          <button
            className={`nav-btn pro-active${tab === "pro" ? " nav-pro-on" : ""}`}
            onClick={goPro}
          >
            <span>Pro</span>
          </button>
        </nav>

      </div>
    </>
    </PerformanceContext.Provider>
  );
}
