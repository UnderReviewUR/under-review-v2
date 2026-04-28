import { useState, useEffect, useRef, useCallback, useMemo, startTransition } from "react";
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
import { resolveF1RaceStart } from "./features/f1/raceStart.js";
import { buildHomeTrackerCards } from "./features/home/buildHomeTrackerCards.js";
import { buildDynamicHomeQuestions } from "./features/home/buildDynamicHomeQuestions.js";
import { buildDailyFeaturedAngleCard } from "./features/home/buildDailyFeaturedAngleCard.js";
import { getGolfHomeValidity, isGolfEventFinished } from "./lib/golfEventStatus.js";
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
import { buildHomeEventPipeline } from "../shared/homeEventPipeline/index.js";
import { HOME_SURFACE_STACK_ORDER } from "../shared/homeEventPipeline/presentationOrder.js";
import { detectNflTeamHint, detectSportFromQuestion } from "./lib/detectSportFromQuestion.js";
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
  ChatThread,
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
import { useNflData } from "./hooks/useNflData.js";
import { usePerformance } from "./hooks/usePerformance.js";
import { useTakeAuthHeaders } from "./hooks/useTakeAuthHeaders.js";
import HomeScreen from "./screens/HomeScreen.jsx";
import TennisScreen from "./screens/TennisScreen.jsx";
import NflScreen from "./screens/NflScreen.jsx";
import F1Screen from "./screens/F1Screen.jsx";
import NbaScreen from "./screens/NbaScreen.jsx";
import MlbScreen from "./screens/MlbScreen.jsx";
import GolfScreen from "./screens/GolfScreen.jsx";
import AskScreen from "./screens/AskScreen.jsx";

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
${themeCss}
`;

  const [tab, setTab] = useState("home");
  const [screen, setScreen] = useState("home");
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
  const swipeTouchStartRef = useRef(null);

  // Separate inputRef per screen — critical for AskBar memo optimization
  const askInputRef       = useRef(null);
  /** Remember last resolved sport from UR TAKE so generic Ask follow-ups still send NBA/golf/etc. context. */
  const lastUrTakeSportRef = useRef(null);
  const tennisInputRef    = useRef(null);
  const wtaInputRef       = useRef(null);
  const nflInputRef       = useRef(null);
  const f1InputRef        = useRef(null);
  const nbaInputRef       = useRef(null);
  const mlbInputRef       = useRef(null);
  const golfInputRef      = useRef(null);
  const golfBarRef        = useRef(null);
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
  const matchupScreenRef  = useRef(null);
  const matchupInputRef   = useRef(null);
  const playerInputRef    = useRef(null);
  const nflPlayerInputRef = useRef(null);
  const fileInputRef      = useRef(null);

  const nflSeasonMode = useMemo(() => isNflInSeason(), []);

  // Detect Stripe redirect back to app
  const [proSuccess] = useState(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("pro");
      if (p === "success") {
        window.history.replaceState({}, "", window.location.pathname);
        return true;
      }
    }
    return false;
  });

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

  // ── Email gate ──────────────────────────────────────────────────────────────
  const [userEmail, setUserEmail] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("ur_email") || "" : ""
  );

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
  const { nflContextData } = useNflData();
  const {
    performanceData,
    performanceLoading,
    performanceError,
    loadPerformanceSnapshot,
  } = usePerformance(userEmail, getTakeAuthHeaders);

  const [weeklyUsed, setWeeklyUsed]     = useState(0);
  const [showEmailGate, setShowEmailGate] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCodeEntry, setShowCodeEntry] = useState(false);
  const [openingBillingPortal, setOpeningBillingPortal] = useState(false);
  const [gateEmail, setGateEmail]         = useState("");
  const [codeInput, setCodeInput]         = useState("");
  const [codeError, setCodeError]         = useState("");
  const [codeLoading, setCodeLoading]     = useState(false);
  const isUnlimited = accessTier === "owner" || accessTier === "friend" || accessTier === "pro";
  const FREE_LIMIT  = 5;

  const proMarketing = useMemo(() => getProMarketingTokens(activeTheme), [activeTheme]);

  useEffect(() => {
    startTransition(() => {
      setActiveTheme((prev) => validateThemeForTier(prev, accessTier));
    });
  }, [accessTier]);

  // Load weekly usage on mount
  useEffect(() => {
    if (isUnlimited) return;
    startTransition(() => {
      const used = JSON.parse(localStorage.getItem("ur_queries") || "[]");
      const now = Date.now();
      const week = 7 * 24 * 60 * 60 * 1000;
      const recent = used.filter((t) => now - t < week);
      setWeeklyUsed(recent.length);
      localStorage.setItem("ur_queries", JSON.stringify(recent));
    });
  }, [isUnlimited]);

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
    if (!userEmail) { setShowEmailGate(true); return false; }
    if (weeklyUsed >= FREE_LIMIT) { setShowUpgradeModal(true); return false; }
    return true;
  }, [isUnlimited, userEmail, weeklyUsed]);

  // Record a query use
  const recordQuery = useCallback(() => {
    if (isUnlimited) return;
    const used = JSON.parse(localStorage.getItem("ur_queries") || "[]");
    used.push(Date.now());
    localStorage.setItem("ur_queries", JSON.stringify(used));
    setWeeklyUsed(prev => prev + 1);
    // Fire-and-forget server record
    if (userEmail) {
      fetch("/api/gate", { method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ action:"consume", email:userEmail }) }).catch(()=>{});
    }
  }, [isUnlimited, userEmail]);

  useEffect(() => {
    if (userEmail && !isUnlimited) {
      fetch(`/api/pro-status?email=${encodeURIComponent(userEmail)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.pro && data.token) {
            localStorage.setItem("ur_access_token", data.token);
            setAccessToken(data.token);
            setAccessTier("pro");
          }
        })
        .catch(() => {});
    }
  }, [userEmail, isUnlimited]);

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
    usingFallback: !!f1Src.usingFallback,
  };
}, [f1Data]);

  const buildNbaContext = useCallback(
    (questionText, nbaDataOverride = null, verifiedSlateGames = [], focusGameKey = null) => {
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
      const filteredStats = filterPlayerStatsToVerifiedTeams(src?.playerStats, mergedTodaysGames);
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
          ? "Verified Home/NBA pipeline slate is empty — do not invent tonight matchups or props."
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
    return {
      seasonContext: src?.seasonContext || {},
      games:         trimmedGames,
      propLines:     (src?.propLines || []).slice(0, 12),
      gameTotals:    src?.gameTotals   || {},
      question:      questionText || "",
    };
  }, [mlbData, mlbGames]);


    const buildGolfContext = useCallback((questionText, golfDataOverride = null) => {
  const g = golfDataOverride ?? golfData;
  return {
    currentEvent: g?.currentEvent
      ? {
          name: g.currentEvent.name || null,
          shortName: g.currentEvent.shortName || null,
          course: g.currentEvent.course || null,
          location: g.currentEvent.location || null,
          round: g.currentEvent.round || null,
          state: g.currentEvent.state || null,
          leaderboard: g.currentEvent.leaderboard || [],
        }
      : null,
    tournament: g?.tournament || null,
    course: g?.course || null,
    rankings: (g?.rankings || []).slice(0, 12),
    odds: {
      outrights: (g?.odds?.outrights || []).slice(0, 16),
      topFinish: g?.odds?.topFinish || {},
      makeCut: g?.odds?.makeCut || {},
    },
    recentResults: (g?.recentResults || []).slice(0, 10),
    courseStats: (g?.courseStats || []).slice(0, 8),
    question: questionText || "",
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
  const askUrTake = useCallback(async ({ text, matchup, setMsgs, sportHint }) => {
  if (!text || isAsking || prefetchingUrTakeContext) return;
  if (!canAsk()) return;

  const imgToSend = pastedImage;

  let priorSnapshot = [];
  setMsgs((prev) => {
    priorSnapshot = [...prev];
    return [
      ...prev,
      { role: "user", text, image: imgToSend?.previewUrl || null },
    ];
  });

  clearImage();

  try {
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });

    const explicitHint =
      typeof sportHint === "string" && sportHint.trim() !== "" ? sportHint.trim() : null;
    let detected = detectSportFromQuestion(text, tab);
    if (detected === "generic") detected = null;

    const scr = String(screen || "").toLowerCase();
    const screenSport =
      scr === "nfl" || scr === "nflplayer"
        ? "nfl"
        : scr === "mlb" || scr === "nba" || scr === "golf" || scr === "tennis" || scr === "f1"
          ? scr
          : null;

    let effectiveSportHint =
      explicitHint ??
      detected ??
      screenSport ??
      lastUrTakeSportRef.current ??
      inferUrTakeSportFromMessages(priorSnapshot) ??
      null;

    if (effectiveSportHint === "generic") effectiveSportHint = null;

    let hintForEnsure = effectiveSportHint;
    if (!hintForEnsure && questionSuggestsGolf(text)) hintForEnsure = "golf";
    if (!hintForEnsure && screenSport) hintForEnsure = screenSport;

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

    setIsAsking(true);

    const loadingSport =
      effectiveSportHint === "tennis_wta_profile" ? "tennis" : effectiveSportHint;

    setMsgs((prev) => [
      ...prev,
      {
        role: "ai",
        text: "ANALYZING...",
        loading: true,
        sport: loadingSport,
      },
    ]);

    const body = {
      question: buildContextualQuestion(text, { priorMessages: priorSnapshot }),
      userEmail: userEmail || null,
      history: historyPayload,
      sportHint: effectiveSportHint,
      teamHint: detectNflTeamHint(text),
      matchupContext: matchup || null,
      image: null,
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

    if (effectiveSportHint === "golf" || questionSuggestsGolf(text)) {
      body.golfContext = buildGolfContext(text, ov.golfData ?? null);
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

    const ctrl = new AbortController();
    const abortTimer = window.setTimeout(() => ctrl.abort(), 75000);

    const authHeaders = await getTakeAuthHeaders();

    let res;
    try {
      res = await fetch("/api/ur-take", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
    } finally {
      window.clearTimeout(abortTimer);
    }

    const raw = await res.text();

    if (!res.ok) {
      let msg = `/api/ur-take ${res.status}: ${raw.slice(0, 600)}`;
      try {
        const j = JSON.parse(raw);
        const human = String(j.response || j.error || "").trim();
        const tag = j.code ? ` (${j.code})` : "";
        if (human) msg = `${human}${tag}`;
      } catch {
        /* keep msg */
      }
      throw new Error(msg);
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(`Invalid JSON from /api/ur-take: ${raw.slice(0, 500)}`);
    }

    const resolvedSport = String(data.sport || "").trim();
    const sportForBubble =
      resolvedSport && resolvedSport !== "generic"
        ? resolvedSport
        : effectiveSportHint || null;
    const normalizedDisplay = normalizeUrTakeDisplay(data);
    recordQuery();

    setMsgs((prev) => [
      ...prev.filter((m) => !m.loading),
      {
        role: "ai",
        text: normalizedDisplay.response,
        sport: sportForBubble || undefined,
        takeMeta: data.take
          ? { confidence: data.take.confidence, trust: data.take.trust ?? null }
          : null,
        deepText: normalizedDisplay.responseDeep,
      },
    ]);
    lastUrTakeSportRef.current = sportForBubble;
    if (userEmail) {
      loadPerformanceSnapshot().catch(() => {});
    }
  } catch (err) {
    setPrefetchingUrTakeContext(false);
    const fallback =
      err?.name === "AbortError"
        ? "Request timed out — try again."
        : err?.message || "Something went wrong — try again.";
    setMsgs((prev) => [...prev.filter((m) => !m.loading), { role: "ai", text: fallback }]);
  } finally {
    setIsAsking(false);
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
  recordQuery,
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
  const validMlbGames = useMemo(
    () => mlbGamesRaw.filter((g) => isDisplayableValidity(classifyMlbGame(g))),
    [mlbGamesRaw],
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

  const tickerNbaGames = homePipeline.nbaGamesForHome;
  const liveSnapshotKeys = homePipeline.liveSnapshotKeys;

  verifiedNbaSlateForTakeRef.current = homePipeline.nbaGamesForHome;

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
    return [...homePipeline.tennisMatchesForHome]
      .sort((a, b) => {
        const ta = tier(a);
        const tb = tier(b);
        if (ta !== tb) return ta - tb;
        if (ta === 1) return ts(b) - ts(a);
        return ts(a) - ts(b);
      })
      .slice(0, 4);
  }, [homePipeline.tennisMatchesForHome]);

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
    const atpPipeline = homePipeline.tennisMatchesForHome.filter((m) => m.league === "ATP");
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
          blurb:
            hasStaticTennisIntel
              ? "Surface and player intel is on Tennis — wire it to a matchup ask."
              : "Open Tennis to hydrate the board before pricing.",
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
          blurb: "Nothing confirmed in this Home window — refresh Tennis to pull the latest BDL-backed rows.",
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
    const oddsBacked = homePipeline.meta.hasAtpFromOdds;
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
    homePipeline.tennisMatchesForHome,
    homePipeline.meta,
    tennisLoading,
    context,
    hasStaticTennisIntel,
    staticIntelFetchFailed,
    cardExcludeSet,
  ]);

  const homeF1Cards = useMemo(() => {
    const nextRace = displayableF1NextRace;
    if (nextRace) {
      const fk = f1EventKey(nextRace);
      if (fk && cardExcludeSet.has(fk)) {
        return [];
      }
      const raceStart = resolveF1RaceStart(nextRace, f1Data?.sessions || []);
      const dt = raceStart ? new Date(raceStart) : null;
      const fallbackDate = nextRace?.race_date ? new Date(nextRace.race_date) : null;
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
      const blurbCore = `${nextRace.location || "Track TBD"} · ${fullDateStr}`;
      const blurb =
        hasConfirmedRaceStart && timeStr ? `${blurbCore} at ${timeStr}` : blurbCore;
      return [{
        id: "f1-next-1",
        league: "F1",
        leagueColor: "#E10600",
        title: nextRace.meeting_name || "Next Grand Prix",
        time: dateStr,
        network: nextRace.circuit_short_name || nextRace.location || "",
        blurb,
        whatMatters: "Race Sunday only — winner, podium structure, or head-to-head reads.",
        quickHitters: ["Race winner vs field?", "Podium stack you trust?", "Best driver H2H?"],
        confirmed: true
      }];
    }
    return [{
      id: "f1-default",
      league: "F1",
      leagueColor: "#E10600",
      title: "Formula 1",
      time: "Schedule pending",
      network: "Grand Prix Racing",
      blurb: "Next race card is still wiring — check back after schedule publish.",
      whatMatters: "When the next GP locks, ask for race-only edges (no practice markets).",
      quickHitters: ["Best WDC value right now?", "Next GP winner lean?", "Constructor vs driver gap?"],
      confirmed: true
    }];
  }, [f1Data, displayableF1NextRace, cardExcludeSet]);

  const homeNbaCards = useMemo(() => {
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
    /** Rolling 24h slate from `homePipeline` (same gates as classifyNbaGame + normalize). */
    const slateGames = homePipeline.nbaGamesForHome
      .filter((g) => g?.state === "pre" || g?.state === "in" || g?.state === "post")
      .filter((g) => {
        const k = nbaEventKey(g);
        return !(k && cardExcludeSet.has(k));
      })
      .sort((a, b) => {
        const ta = Number.isNaN(Date.parse(a?.startTimeUtc)) ? Number.MAX_SAFE_INTEGER : Date.parse(a?.startTimeUtc);
        const tb = Number.isNaN(Date.parse(b?.startTimeUtc)) ? Number.MAX_SAFE_INTEGER : Date.parse(b?.startTimeUtc);
        return ta - tb;
      });

    const rawApiTodaysGames = (nbaData?.todaysGames || [])
      .filter((g) => isDisplayableValidity(classifyNbaGame(g)))
      .filter((g) => g?.state === "pre" || g?.state === "in" || g?.state === "post")
      .filter((g) => {
        const k = nbaEventKey(g);
        return !(k && cardExcludeSet.has(k));
      })
      .sort((a, b) => {
        const ta = Number.isNaN(Date.parse(a?.startTimeUtc)) ? Number.MAX_SAFE_INTEGER : Date.parse(a?.startTimeUtc);
        const tb = Number.isNaN(Date.parse(b?.startTimeUtc)) ? Number.MAX_SAFE_INTEGER : Date.parse(b?.startTimeUtc);
        return ta - tb;
      });

    if (!slateGames.length && !homePipeline.nbaGamesForHome.length) {
      if (rawApiTodaysGames.length > 0) {
        const recoveryHint = nbaData?.slateRecovery?.fromLastKnownKv
          ? formatHomeSlateKvUpdatedEt(nbaData.slateRecovery.lastUpdated)
          : null;
        const rows = rawApiTodaysGames.map((g, i) => {
          const away = g.awayTeam?.abbr || g.awayTeam?.name || "Away";
          const home = g.homeTeam?.abbr || g.homeTeam?.name || "Home";
          const series = getSeriesLabel(away, home);
          const evKey = nbaEventKey(g);
          const channel = String(g.channel || g.broadcast || "").trim();
          const tipEt = toEtTipLabel(g.startTimeUtc);
          return {
            id: evKey || `nba-card-row-fallback-${i + 1}`,
            nbaEventKey: evKey,
            away,
            home,
            tipEt,
            series: series || "Playoff matchup",
            channel,
          };
        });
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

    if (!slateGames.length) {
      return [];
    }

    const rows = slateGames.map((g, i) => {
      const away = g.awayTeam?.abbr || g.awayTeam?.name || "Away";
      const home = g.homeTeam?.abbr || g.homeTeam?.name || "Home";
      const series = getSeriesLabel(away, home);
      const evKey = nbaEventKey(g);
      const channel = String(g.channel || g.broadcast || "").trim();
      const tipEt = toEtTipLabel(g.startTimeUtc);
      return {
        id: evKey || `nba-card-row-${i + 1}`,
        nbaEventKey: evKey,
        away,
        home,
        tipEt,
        series: series || "Playoff matchup",
        channel,
      };
    });

    return [
      {
        id: "nba-playoffs-rows",
        league: "NBA PLAYOFFS",
        leagueColor: "#FF6B00",
        title: "Tonight's games",
        time: `${rows.length} game${rows.length === 1 ? "" : "s"}`,
        network: "Tap a matchup",
        blurb: "",
        confirmed: true,
        isNbaRowsCard: true,
        nbaRows: rows,
      },
    ];
  }, [homePipeline.nbaGamesForHome, getSeriesLabel, cardExcludeSet, nbaData?.todaysGames, nbaData?.slateRecovery]);

  const homeMlbCards = useMemo(() => {
    const live = homePipeline.mlbGamesForHome.filter((g) => g.state === "in");
    const upcoming = homePipeline.mlbGamesForHome.filter((g) => g.state === "pre");
    const poolRaw = [...live, ...upcoming].slice(0, 3);
    const tomorrowGames = Array.isArray(mlbData?.tomorrowGames) ? mlbData.tomorrowGames : [];
    const tomorrowGamesHorizon = tomorrowGames.filter((g) => isDisplayableValidity(classifyMlbGame(g)));
    const pool = poolRaw.filter((g) => {
      const k = mlbEventKey(g);
      return !(k && cardExcludeSet.has(k));
    });
    const rawApiMlbHorizon = (mlbData?.games || []).filter((g) => isDisplayableValidity(classifyMlbGame(g)));

    if (!pool.length && !homePipeline.mlbGamesForHome.length) {
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
  }, [homePipeline.mlbGamesForHome, cardExcludeSet, mlbData?.games, mlbData?.tomorrowGames, mlbData?.slateRecovery]);

  const homeGolfCards = useMemo(() => {
    if (golfData && !golfLoading && isGolfEventFinished(golfData)) {
      return [];
    }
    if (golfData && !golfLoading && !homePipeline.golfVisibleOnHome) {
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

    const currentEvent = golfData?.currentEvent || null;
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
        blurb: `Tee sheet is staged — live scoring opens closer to gun.\n${sourceLabel} · ${freshnessLabel}`,
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
  }, [golfData, golfLoading, cardExcludeSet, homePipeline.golfVisibleOnHome]);

  const homeTrackerCards = useMemo(
    () =>
      buildHomeTrackerCards({
        performanceData,
        nbaGames: homePipeline.nbaGamesForHome,
        mlbData: {
          ...(mlbData || {}),
          games: homePipeline.mlbGamesForHome,
        },
        golfData,
        f1Data,
        nflDraftMeta,
        excludeEventKeys: cardExcludeSet,
      }),
    [performanceData, homePipeline.nbaGamesForHome, homePipeline.mlbGamesForHome, mlbData, golfData, f1Data, nflDraftMeta, cardExcludeSet]
  );

  const homeCards = useMemo(() => {
    const modules = {
      nba_cards: homeNbaCards,
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
    homeNbaCards,
    homeMlbCards,
    homeF1Cards,
  ]);
  
  // ── Dynamic home questions ─────────────────────────────────────────────────
  const dynamicHomeQuestions = useMemo(
    () =>
      buildDynamicHomeQuestions({
        activeTournamentMatches,
        tennisLiveMatches,
        tennisUpcomingMatches,
        nflSeasonMode,
        nflDraftMeta,
        userCity: userCityHint,
        context,
        golfData,
        nbaGames: homePipeline.nbaGamesForHome,
        f1Data,
      }),
    [
      activeTournamentMatches,
      tennisLiveMatches,
      tennisUpcomingMatches,
      nflSeasonMode,
      nflDraftMeta,
      userCityHint,
      context,
      golfData,
      homePipeline.nbaGamesForHome,
      f1Data,
    ]
  );

  const [dailyFeaturedAngleCard, setDailyFeaturedAngleCard] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const card = await buildDailyFeaturedAngleCard({
        nbaGames: homePipeline.nbaGamesForHome,
        nbaData,
      });
      if (!cancelled) setDailyFeaturedAngleCard(card);
    })();
    return () => {
      cancelled = true;
    };
  }, [homePipeline.nbaGamesForHome, nbaData]);

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
  }, [screen, tab]);

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
    if (screen !== "pro" || tab !== "pro") {
      setNavHistory((h) => [...h, { screen, tab }]);
    }
    setTab("pro");
    setScreen("pro");
    setSelectedMatchup(null);
    setSelectedPlayer(null);
    setSelectedNflPlayer(null);
  }, [screen, tab]);

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

  const scheduleChatScroll = useCallback((screenRef) => {
    const scroll = () => {
      const el = screenRef?.current;
      if (el) el.scrollTop = el.scrollHeight;
    };
    scroll();
    requestAnimationFrame(() => {
      scroll();
      requestAnimationFrame(scroll);
    });
    setTimeout(scroll, 48);
    setTimeout(scroll, 240);
    setTimeout(scroll, 720);
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
      if (isAsking || prefetchingUrTakeContext) return;
      if (screen !== "ask" || tab !== "ask") {
        setNavHistory((h) => [...h, { screen, tab }]);
      }
      setTab("ask");
      setScreen("ask");
      setAskInput("");
      askUrTake({ text: prompt, setMsgs: setAskMsgs, sportHint });
      requestAnimationFrame(() => {
        scheduleChatScroll(askScreenRef);
        setTimeout(() => scheduleChatScroll(askScreenRef), 120);
      });
    },
    [askUrTake, scheduleChatScroll, screen, tab, isAsking, prefetchingUrTakeContext],
  );

  // ── Submit handlers ────────────────────────────────────────────────────────
  const submitHome = useCallback(() => {
    const t = askInput.trim();
    if (!t || isAsking || prefetchingUrTakeContext) return;
    if (screen !== "ask" || tab !== "ask") {
      setNavHistory((h) => [...h, { screen, tab }]);
    }
    setAskInput("");
    setTab("ask");
    setScreen("ask");
    askUrTake({ text: t, setMsgs: setAskMsgs });
    requestAnimationFrame(() => {
      scheduleChatScroll(askScreenRef);
      setTimeout(() => scheduleChatScroll(askScreenRef), 120);
    });
  }, [askUrTake, askInput, isAsking, prefetchingUrTakeContext, scheduleChatScroll, screen, tab]);
  const submitAsk     = useCallback(()=>{ const t=askInput.trim();     if(!t||isAsking||prefetchingUrTakeContext)return; setAskInput(""); askUrTake({text:t,setMsgs:setAskMsgs}); scheduleChatScroll(askScreenRef); },[askInput,askUrTake,isAsking,prefetchingUrTakeContext,scheduleChatScroll]);
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
  const submitMatchup = useCallback(forced=>{ const t=(forced??matchupInput).trim(); if(!t||isAsking||prefetchingUrTakeContext)return; if(!forced)setMatchupInput(""); const league=String(selectedMatchup?.league||"").toUpperCase(); const hint=league.includes("NFL")?"nfl":league.includes("NBA")?"nba":league.includes("MLB")?"mlb":league.includes("F1")?"f1":league.includes("GOLF")?"golf":"tennis"; askUrTake({text:t,matchup:selectedMatchup,setMsgs:setMatchupMsgs,sportHint:hint}); scheduleChatScroll(matchupScreenRef); },[askUrTake,isAsking,prefetchingUrTakeContext,matchupInput,selectedMatchup,scheduleChatScroll]);

  const askBarCommon = {
    fileInputRef,
    pastedImage,
    clearImage,
    isAsking,
    prefetchingContext: prefetchingUrTakeContext,
    processImageFile,
  };
  const hasDockedBar =
    (screen === "tennis" && tennisMsgs.length > 0) ||
    (screen === "nfl" && nflMsgs.length > 0) ||
    (screen === "f1" && f1Msgs.length > 0) ||
    (screen === "nba" && nbaMsgs.length > 0) ||
    (screen === "mlb" && mlbMsgs.length > 0) ||
    (screen === "golf" && golfMsgs.length > 0) ||
    (screen === "ask" && askMsgs.length > 0);

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
      {screen==="home"&&<span className="hdr-tagline">Sharp takes. Real data.</span>}
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
          <div className="header-right">{headerPill}</div>
        </header>

        {/* ══ HOME ══ */}
        {screen==="home"&&(
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
            firePrompt={firePrompt}
            isNflSlateActive={isNflSlateActive}
            tickerNbaGames={tickerNbaGames}
            getSeriesLabel={getSeriesLabel}
            tennisTickerMatches={tennisTickerMatches}
            golfData={golfData}
            mlbGames={homePipeline.mlbGamesForHome}
            mlbData={mlbData}
            f1Data={f1Data}
            homeCards={homeCards}
            openMatchup={openMatchup}
            golfScoreColor={golfScoreColor}
            userEmail={userEmail}
            performanceData={performanceData}
            performanceLoading={performanceLoading}
            performanceError={performanceError}
            loadPerformanceSnapshot={loadPerformanceSnapshot}
            liveSnapshotEventKeys={liveSnapshotKeys}
            onTodaySlateDisplayedKeys={setSlateDisplayedEventKeys}
            slateFallbackSports={[
              ...((f1Data?.usingFallback || f1Data?.schedule?.usingFallback) ? ["f1"] : []),
              "nfl",
            ]}
            nbaLiveEdgeAlerts={nbaData?.liveEdgeAlerts ?? []}
          />
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
          />
        )}


        {/* ══ NFL ══ */}
        {screen==="nfl"&&(
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
          />
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
          />
        )}


        {/* ══ NBA ══ */}
        {screen==="nba"&&(
          <NbaScreen
            nbaScreenRef={nbaScreenRef}
            hasDockedBar={hasDockedBar}
            verifiedNbaGames={homePipeline.nbaGamesForHome}
            nbaData={nbaData}
            nbaMsgs={nbaMsgs}
            nbaBarRef={nbaBarRef}
            nbaInputRef={nbaInputRef}
            nbaInput={nbaInput}
            setNbaInput={setNbaInput}
            submitNba={submitNba}
            askBarCommon={askBarCommon}
            nbaLoading={nbaLoading}
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
        <a
          href="/api/billing-portal"
          onClick={async(e)=>{
            e.preventDefault();
            if (openingBillingPortal) return;
            setOpeningBillingPortal(true);
            try {
              const portalEmail = userEmail || gateEmail || localStorage.getItem("ur_email") || "";
              const query = portalEmail ? `?email=${encodeURIComponent(portalEmail)}` : "";
              window.location.assign(`/api/billing-portal${query}`);
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
          }}
        >
          Manage subscription →
        </a>
      </div>
    )}

    {/* Success banner */}
    {proSuccess&&(
      <div style={
        proMarketing.successBanner?.wrap ?? {
          background:"linear-gradient(135deg,rgba(0,230,118,.12),rgba(29,185,84,.06))",
          border:"1px solid rgba(0,230,118,.3)",
          borderRadius:14,
          padding:"16px 20px",
          margin:"12px 16px 0",
          textAlign:"center",
        }
      }>
        <div style={{fontSize:20,marginBottom:4}}>🎉</div>
        <div style={{
          fontFamily:"var(--display-font)",
          fontSize:22,
          letterSpacing:1,
          color: proMarketing.successBanner?.title ?? "#00E676",
          marginBottom:4,
        }}>YOU&apos;RE IN</div>
        <div style={{fontSize:13,color: proMarketing.successBanner?.sub ?? "var(--soft)"}}>Welcome to Under Review Pro. Every edge is unlocked.</div>
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
          UR Take, Sharpened.
        </div>
        <div style={{ fontSize: 12, color: proMarketing.subBody ?? "var(--soft)", lineHeight: 1.5, maxWidth: 400 }}>
          Pro unlocks deeper reasoning, explicit verdicts, and session continuity — a betting brain that builds on itself, not a pick service.
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
        $9.99/mo · 3-day trial
        <br />
        <span style={{ color: proMarketing.priceAsideMuted ?? "var(--muted)" }}>Cancel anytime</span>
      </div>
    </div>

    {/* Value bar */}
    <div style={proMarketing.valueGrid}>
      {[
        ["FULL-DEPTH ANALYSIS", "Complete five-step breakdowns, never truncated"],
        ["VERDICT CLOSE", "THE PLAY, confidence tier, one sharp read"],
        ["SESSION CONTINUITY", "Pro carries the thread across your queries"],
        ["UNLIMITED ASKS", "No weekly ceiling, no mid-session walls"],
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
          }}>{descriptor}</div>
        </div>
      ))}
    </div>

    {/* Price + CTA */}
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
      <div style={{display:"flex",alignItems:"baseline",justifyContent:"center",gap:0,marginBottom:4}}>
        <span style={{fontSize:32,fontWeight:800,color:"var(--cyan-bright)",lineHeight:1}}>$</span>
        <span style={{fontSize:64,fontWeight:800,color:"var(--cyan-bright)",letterSpacing:-2,lineHeight:1}}>9</span>
        <span style={{fontSize:64,fontWeight:800,color:"var(--cyan-bright)",letterSpacing:-2,lineHeight:1}}>.99</span>
        <span style={{fontSize:12,color:"var(--muted)",alignSelf:"flex-end",paddingBottom:8,marginLeft:4}}>/month</span>
      </div>
      <div style={{fontFamily:"var(--mono-font)",fontSize:10,letterSpacing:2,color:proMarketing.trialLine ?? "rgba(0,245,233,.35)",textTransform:"uppercase",marginBottom:18}}>Try free for 3 days</div>
      <button className="pro-cta-btn" onClick={async()=>{
        try{
          const checkoutEmail = userEmail || gateEmail || localStorage.getItem("ur_email") || "";
          const res=await fetch("/api/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ email: checkoutEmail || undefined })});
          const data=await res.json();
          if(data.url) window.location.href=data.url;
          else if (data.retryAfterSeconds) alert(`Checkout is busy. Try again in ${data.retryAfterSeconds}s.`);
          else alert("Could not start checkout. Try again.");
        }catch{alert("Something went wrong. Try again.");}
      }}>START FREE TRIAL</button>
      <div style={{fontFamily:"var(--mono-font)",fontSize:10,color:proMarketing.checkoutFoot ?? "rgba(255,255,255,.15)",letterSpacing:1,textTransform:"uppercase"}}>Secure checkout · cancel anytime</div>
    </div>

    {/* Features */}
    <div style={{fontFamily:"var(--mono-font)",fontSize:9,letterSpacing:3,color:proMarketing.whatsInc ?? "#3A4050",textTransform:"uppercase",padding:"22px 20px 12px",display:"flex",alignItems:"center",gap:8}}>
      What&apos;s included<span style={{flex:1,height:1,background:proMarketing.whatsIncRule ?? "rgba(255,255,255,.05)",display:"block"}}/>
    </div>

    <div style={{display:"flex",flexDirection:"column",gap:1,margin:"0 20px"}}>
      {[
        {color:"#FFE600",name:"Tennis — Elo + Surface Edges",desc:"ATP/WTA rally profiles, serve baselines, draw-path value across every surface."},
        {color:"#1DB954",name:"MLB — Pitcher K Props",desc:"Park-adjusted, platoon-split, barrel rate. Know before the line moves."},
        {color:"#FF6B00",name:"NBA — PRA Calibration",desc:"Pace-adjusted floors and ceilings. Live injury replacement plays in real time."},
        {color:"#4A90D9",name:"NFL — QB, RB, WR & TE Database",desc:"TD rates, prop floors + ceilings for every QB, RB, WR, and TE that matters."},
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
      <div style={{fontSize:13,color:proMarketing.quoteText ?? "#8A95A3",lineHeight:1.75,marginBottom:6}}>125 active injury reports tracked.</div>
      <div style={{fontSize:13,color:proMarketing.quoteText ?? "#8A95A3",lineHeight:1.75,marginBottom:6}}>16 playoff rosters. 280 player profiles.</div>
      <div style={{fontSize:13,color:proMarketing.quoteText ?? "#8A95A3",lineHeight:1.75}}>Updated every 30 minutes.</div>
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
            <ChatThread msgs={matchupMsgs} />
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
          />
        )}


        {/* ══ DOCKED INPUT BARS ══ */}
        {screen==="tennis"&&tennisMsgs.length>0&&(
          <div className="docked-bar" style={{borderTopColor:"rgba(255,230,0,.25)"}}>
            <div className="docked-bar-label" style={{color:"#FFE600"}}>Tennis · Ask another</div>
            <AskBar inputRef={tennisInputRef} value={tennisInput} onChange={setTennisInput} onSubmit={()=>submitTennis()} placeholder="Ask another..." {...askBarCommon}/>
          </div>
        )}
        {screen==="nfl"&&nflMsgs.length>0&&(
          <div className="docked-bar" style={{borderTopColor:"rgba(74,144,217,.25)"}}>
            <div className="docked-bar-label" style={{color:"#4A90D9"}}>NFL · Ask another</div>
            <AskBar inputRef={nflInputRef} value={nflInput} onChange={setNflInput} onSubmit={()=>submitNfl()} placeholder="Ask another..." btnColor="#4A90D9" {...askBarCommon}/>
          </div>
        )}
        {screen==="f1"&&f1Msgs.length>0&&(
          <div className="docked-bar" style={{borderTopColor:"rgba(225,6,0,.25)"}}>
            <div className="docked-bar-label" style={{color:"var(--f1)"}}>F1 · Ask another</div>
            <AskBar inputRef={f1InputRef} value={f1Input} onChange={setF1Input} onSubmit={()=>submitF1()} placeholder="Ask another..." btnColor="var(--f1)" {...askBarCommon}/>
          </div>
        )}
        {screen==="nba"&&nbaMsgs.length>0&&(
          <div className="docked-bar" style={{borderTopColor:"rgba(255,107,0,.25)"}}>
            <div className="docked-bar-label" style={{color:"var(--nba)"}}>NBA · Ask another</div>
            <AskBar inputRef={nbaInputRef} value={nbaInput} onChange={setNbaInput} onSubmit={()=>submitNba()} placeholder="Ask another..." btnColor="var(--nba)" {...askBarCommon}/>
          </div>
        )}
        {screen==="mlb"&&mlbMsgs.length>0&&(
          <div className="docked-bar" style={{borderTopColor:"rgba(29,185,84,.25)"}}>
            <div className="docked-bar-label" style={{color:"var(--mlb)"}}>MLB · Ask another</div>
            <AskBar inputRef={mlbInputRef} value={mlbInput} onChange={setMlbInput} onSubmit={()=>submitMlb()} placeholder="Ask another..." btnColor="var(--mlb)" {...askBarCommon}/>
          </div>
        )}
        {screen==="golf"&&golfMsgs.length>0&&(
          <div className="docked-bar" style={{borderTopColor:"rgba(255,255,255,.2)"}}>
            <div className="docked-bar-label" style={{color:"#FFFFFF"}}>Golf · Ask another</div>
            <AskBar inputRef={golfInputRef} value={golfInput} onChange={setGolfInput} onSubmit={()=>submitGolf()} placeholder="Ask another..." btnColor="#DCE6F2" {...askBarCommon}/>
          </div>
        )}
        {screen==="ask"&&askMsgs.length>0&&(
          <div className="docked-bar">
            <AskBar inputRef={askInputRef} value={askInput} onChange={setAskInput} onSubmit={submitAsk} placeholder="Ask another..." {...askBarCommon}/>
          </div>
        )}

        {/* ══ EMAIL GATE MODAL ══ */}
        {showEmailGate&&(
          <div style={{position:"fixed",inset:0,background:"rgba(8,10,12,.92)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
            <div style={{background:"var(--surface)",border:"1px solid var(--border-2)",borderRadius:20,padding:28,maxWidth:360,width:"100%",textAlign:"center"}}>
              <div style={{fontSize:28,marginBottom:8}}>⚡</div>
              <div style={{fontFamily:"var(--display-font)",fontSize:26,letterSpacing:1,marginBottom:6}}>FREE ACCESS</div>
              <div style={{fontSize:13,color:"var(--muted)",lineHeight:1.6,marginBottom:20}}>
                Enter your email to get <strong style={{color:"var(--text)"}}>{FREE_LIMIT} free questions per week</strong>. No password. No spam.
              </div>
              <input
                type="email"
                placeholder="your@email.com"
                value={gateEmail}
                onChange={e=>setGateEmail(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter"&&gateEmail.includes("@")){ localStorage.setItem("ur_email",gateEmail); setUserEmail(gateEmail); setShowEmailGate(false); fetch("/api/gate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"register",email:gateEmail})}).catch(()=>{}); } }}
                style={{width:"100%",background:"var(--surface-2)",border:"1px solid var(--border-2)",borderRadius:10,padding:"12px 14px",color:"var(--text)",fontSize:16,fontFamily:"var(--body-font)",outline:"none",marginBottom:12}}
                autoFocus
              />
              <button
                disabled={!gateEmail.includes("@")}
                onClick={()=>{ localStorage.setItem("ur_email",gateEmail); setUserEmail(gateEmail); setShowEmailGate(false); fetch("/api/gate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"register",email:gateEmail})}).catch(()=>{}); }}
                style={{width:"100%",padding:"13px",border:"none",borderRadius:10,background:gateEmail.includes("@")?"var(--cyan-bright)":"var(--border)",color:"#080A0C",fontFamily:"var(--display-font)",fontSize:18,letterSpacing:2,cursor:gateEmail.includes("@")?"pointer":"not-allowed",marginBottom:12}}
              >UNLOCK FREE ACCESS</button>
              <div style={{fontSize:11,color:"var(--muted)"}}>Already have a code? <button onClick={()=>{setShowEmailGate(false);setShowCodeEntry(true);}} style={{background:"none",border:"none",color:"var(--cyan-bright)",cursor:"pointer",fontSize:11,fontFamily:"var(--body-font)"}}>Enter it here →</button></div>
            </div>
          </div>
        )}

        {/* ══ UPGRADE MODAL (LIMIT HIT) ══ */}
        {showUpgradeModal&&(
          <div style={{position:"fixed",inset:0,background:"rgba(8,10,12,.92)",zIndex:101,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
            <div style={{background:"var(--surface)",border:"1px solid var(--border-2)",borderRadius:20,padding:24,maxWidth:380,width:"100%",textAlign:"center"}}>
              <div style={{fontSize:28,marginBottom:8}}>🔒</div>
              <div style={{fontFamily:"var(--display-font)",fontSize:26,letterSpacing:1,marginBottom:6}}>FREE LIMIT REACHED</div>
              <div style={{fontSize:13,color:"var(--muted)",lineHeight:1.6,marginBottom:18}}>
                You&apos;ve hit the free limit. Pro removes the ceiling — and unlocks deeper analysis, verdict closes, and session continuity on every query.
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

        {/* ══ QUERY COUNTER — shows when not unlimited ══ */}
        {!isUnlimited&&userEmail&&weeklyUsed>0&&(
          <div style={{position:"fixed",top:52,right:10,zIndex:20,background:"rgba(8,10,12,.85)",border:"1px solid var(--border)",borderRadius:999,padding:"3px 10px",fontFamily:"var(--mono-font)",fontSize:9,color:weeklyUsed>=FREE_LIMIT?"var(--red)":weeklyUsed>=FREE_LIMIT-1?"var(--gold)":"var(--muted)",letterSpacing:1,backdropFilter:"blur(8px)",cursor:"pointer"}} onClick={weeklyUsed>=FREE_LIMIT?()=>setShowUpgradeModal(true):undefined}>
            {weeklyUsed>=FREE_LIMIT?"LIMIT REACHED — GO PRO":`${FREE_LIMIT-weeklyUsed} FREE LEFT THIS WEEK`}
          </div>
        )}

        {/* ══ NAV ══ */}
        <nav className="bottom-nav">
          <button className={`nav-btn${tab==="home"&&screen==="home"?" active":""}`} onClick={goHome}><span>Home</span></button>
          <button className={`nav-btn${tab==="tennis"?" tennis-active":""}`} onClick={goTennis}><span>Tennis</span></button>
          <button className={`nav-btn${tab==="nfl"?" nfl-active":""}`} onClick={goNfl}><span>NFL</span></button>
          <button className={`nav-btn${tab==="f1"?" f1-active":""}`} onClick={goF1}><span>F1</span></button>
          <button className={`nav-btn${tab==="nba"?" nba-active":""}`} onClick={goNba}><span>NBA</span></button>
          <button className={`nav-btn${tab==="mlb"?" mlb-active":""}`} onClick={goMlb}><span>MLB</span></button>
          <button className={`nav-btn${tab==="golf"?" golf-active":""}`} onClick={goGolf}><span>Golf</span></button>
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
