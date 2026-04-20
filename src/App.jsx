import { useState, useEffect, useRef, useCallback, useMemo, startTransition } from "react";
import { PerformanceContext } from "./context/PerformanceContext.jsx";
import UrTakeRecordPanel from "./components/UrTakeRecordPanel.jsx";
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
import { isGolfEventFinished } from "./lib/golfEventStatus.js";
import { detectNflTeamHint, detectSportFromQuestion } from "./lib/detectSportFromQuestion.js";
import { ensureUrTakeSportContext } from "./lib/ensureUrTakeSportContext.js";
import {
  augmentNbaRosterGroundingWithUi,
  mergeNbaTodaysGames,
  NBA_UI_PLAYER_CHIPS,
} from "./lib/nbaUiSurface.js";
import {
  ChatThread,
  buildNflContext,
  formatOverallStats,
  formatReturnStats,
  formatServeStats,
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
import { formatTennisScore } from "./features/tennis/tennisFormatters.js";
import HomeScreen from "./screens/HomeScreen.jsx";
import TennisScreen from "./screens/TennisScreen.jsx";
import NflScreen from "./screens/NflScreen.jsx";
import F1Screen from "./screens/F1Screen.jsx";
import NbaScreen from "./screens/NbaScreen.jsx";
import MlbScreen from "./screens/MlbScreen.jsx";
import GolfScreen from "./screens/GolfScreen.jsx";
import AskScreen from "./screens/AskScreen.jsx";

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

  const { players, context, liveMatches, tennisLoading } = useTennisData();
  const { f1Data, f1Loading } = useF1Data();
  const { nbaData, nbaLoading, nbaGames, getSeriesLabel } = useNbaData();
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

  const buildNbaContext = useCallback((questionText, nbaDataOverride = null) => {
    const src = nbaDataOverride ?? nbaData;
    const fromSrc = Array.isArray(src?.todaysGames) ? src.todaysGames : [];
    const fromLocal = Array.isArray(nbaGames) ? nbaGames : [];
    const mergedTodaysGames = mergeNbaTodaysGames(fromSrc, fromLocal);
    const slateMeta = src?.todaysGamesSlateMeta || null;
    const rosterGroundingMerged = augmentNbaRosterGroundingWithUi(
      src?.rosterGrounding || null,
      mergedTodaysGames,
    );
    return {
      seasonContext:   src?.seasonContext || {},
      todaysGames:     mergedTodaysGames,
      /** When the slate is empty but BDL responded OK — tells UR Take it is a real off day vs. pipeline failure */
      todaysGamesSlateMeta: slateMeta,
      todaysGamesSlateNote:
        mergedTodaysGames.length === 0 && slateMeta?.note ? slateMeta.note : null,
      lastNight:       src?.lastNight     || [],
      lastNightStats:  src?.lastNightStats|| [],
      liveStats:       src?.liveStats     || [],
      playerStats:     src?.playerStats   || [],
      /** Pre-rendered lines for LLM — team sourced from game box when statsSource is game_box */
      playerStatsText: src?.playerStatsText || "",
      statsSource:     src?.statsSource || "",
      propLines:       src?.propLines     || [],
      injuries:        src?.injuries      || [],
      recentForm:      src?.recentForm    || "",
      h2hSplits:       src?.h2hSplits     || [],
      gameTotals:      src?.gameTotals     || {},
      /** API roster + same featured names / teams as NBA tab UI chips */
      rosterGrounding: rosterGroundingMerged,
      /** Mirrors product UI — must stay aligned with src/lib/nbaUiSurface.js */
      clientUiSurface: {
        source: "nba_tab_chips_and_scoreboard",
        featuredPlayersFullNames: NBA_UI_PLAYER_CHIPS.map((p) => p.fullName),
        chipToFullName: Object.fromEntries(
          NBA_UI_PLAYER_CHIPS.map((p) => [p.chip, p.fullName]),
        ),
        note:
          "These names match the 'Ask About Any Player' chips on the NBA screen. todaysGames merges /api/nba board games with the live scoreboard feed used for Today’s Games cards.",
      },
      question:        questionText || "",
    };
  }, [nbaData, nbaGames]);

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
  recordQuery();

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
      body.nbaContext = buildNbaContext(text, ov.nbaData ?? null);
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

    setMsgs((prev) => [
      ...prev.filter((m) => !m.loading),
      {
        role: "ai",
        text: normalizedDisplay.response,
        sport: sportForBubble || undefined,
        takeMeta: data.take ? { confidence: data.take.confidence } : null,
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
  const tennisLiveMatches     = useMemo(()=>liveMatches.filter(m=>String(m?.raw?.live||"0")==="1"),[liveMatches]);
  const tennisUpcomingMatches = useMemo(()=>liveMatches.filter(m=>String(m?.raw?.live||"0")!=="1"),[liveMatches]);
  const activeTournamentMatches = useMemo(
    () =>
      liveMatches.filter(
        (m) => m.league === "ATP" && preferredTournamentScore(m, context) > 0,
      ),
    [liveMatches, context],
  );

  const tennisBoardHeadline = useMemo(() => {
    const n=context?.currentTournament?.name;
    if (activeTournamentMatches.length>0&&n) return `${n}`;
    return "ATP · Tennis Board";
  }, [activeTournamentMatches.length,context]);

  const tennisBoardSubline = useMemo(() => {
    const n=context?.currentTournament?.name;
    if (activeTournamentMatches.length>0&&n) return `${n.toUpperCase()} · ATP LIVE + UPCOMING`;
    return "ATP · LIVE + UPCOMING (CONFIRMED FEED)";
  }, [activeTournamentMatches.length,context]);

  const homeAtpSpotlightCards = useMemo(() => {
    const atp = liveMatches.filter((m) => m.league === "ATP");
    if (tennisLoading && atp.length === 0) {
      return [
        {
          id: "tennis-atp-feed-loading",
          league: "ATP",
          leagueColor: "#0891B2",
          homeCategory: "ATP",
          title: "ATP matchups loading…",
          time: "Feed",
          network: context?.currentTournament?.name || "Ball Dont Lie",
          blurb: "Pulling confirmed ATP draws from Ball Dont Lie.",
          whatMatters: "Open Tennis for the full ATP board.",
          quickHitters: ["Open Tennis tab"],
          confirmed: true,
        },
      ];
    }
    if (!tennisLoading && !atp.length) {
      return [
        {
          id: "tennis-atp-feed-empty",
          league: "ATP",
          leagueColor: "#0891B2",
          homeCategory: "ATP",
          title: "No confirmed ATP matchups in feed",
          time: "Ball Dont Lie",
          network: context?.currentTournament?.name || "ATP",
          blurb:
            "The API returned no ATP fixtures for this window. Confirm BALLDONTLIE_API_KEY and plan include tennis, then refresh.",
          whatMatters: "Open Tennis to retry the full board pull.",
          quickHitters: ["Open Tennis tab"],
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
    return [
      {
        id: "tennis-atp-schedule-board",
        league: "ATP",
        leagueColor: "#0891B2",
        homeCategory: "ATP · SCHEDULE",
        title: `${tName} — next ATP matchups`,
        time: `${liveN} live · ${upcomingN} upcoming`,
        network: `${atp.length} confirmed on ATP board`,
        blurb: head.map((m) => m.title).join(" · "),
        matchupLines: head.map((m) => m.title),
        moreMatchupsCount: Math.max(0, pool.length - head.length),
        whatMatters: "Tap to open Tennis — confirmed ATP draws from Ball Dont Lie.",
        quickHitters: ["Best ATP misprice today?", "Who benefits on this surface?"],
        confirmed: true,
      },
    ];
  }, [liveMatches, tennisLoading, context]);

  const homeF1Cards = useMemo(() => {
    const nextRace = f1Data?.schedule?.races?.find(r => r.is_next);
    if (nextRace) {
      const raceStart = resolveF1RaceStart(nextRace, f1Data?.sessions || []);
      const dt = raceStart ? new Date(raceStart) : null;
      const dateStr = dt
        ? dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" })
        : "TBD";
      const fullDateStr = dt
        ? dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/Chicago" })
        : "Date TBD";
      const timeStr = dt
        ? dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago", timeZoneName: "short" })
        : "";
      return [{
        id: "f1-next-1",
        league: "F1",
        leagueColor: "#E10600",
        title: nextRace.meeting_name || "Next Grand Prix",
        time: dateStr,
        network: nextRace.circuit_short_name || nextRace.location || "",
        blurb: `${nextRace.location || "Track TBD"} · ${fullDateStr}${timeStr ? ` at ${timeStr}` : ""}`,
        whatMatters: "Ask for race winner, podium, or race-day matchup edges.",
        quickHitters: ["Best F1 race-day bet?", "Best podium value?", "Best race matchup?"],
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
      blurb: "Next race details are loading.",
      whatMatters: "Ask about race winners, championship futures, or driver matchups.",
      quickHitters: ["Best F1 future?", "Who wins the WDC?", "Best value bet?"],
      confirmed: true
    }];
  }, [f1Data]);

  const homeNbaCards = useMemo(() => {
    const games = nbaGames.length > 0 ? nbaGames : (nbaData?.todaysGames || []);

    const live = games.filter((g) => g.state === "in");
    const upcoming = games.filter((g) => g.state === "pre");
    const recent = games.filter((g) => g.state === "post").slice(0, 1);

    const pool = [...live, ...upcoming, ...recent].slice(0, 2);

    if (!pool.length) {
      return [
        {
          id: "nba-default",
          league: "NBA PLAYOFFS",
          leagueColor: "#FF6B00",
          title: "No NBA games today",
          time: "Off-day",
          network: "Series board",
          blurb: "Check back tomorrow for the next playoff slate.",
          whatMatters: "Ask for series leverage, futures, or matchup angles.",
          quickHitters: ["Best playoff future?", "Series leverage spot?", "Best player prop tomorrow?"],
          confirmed: true,
        },
      ];
    }

    return pool.map((g, i) => {
      const away = g.awayTeam?.abbr || g.awayTeam?.name || "Away";
      const home = g.homeTeam?.abbr || g.homeTeam?.name || "Home";
      const series = getSeriesLabel(away, home);
      const isLive = g.state === "in";
      const isFinal = g.state === "post";
      const awayScore = g.awayTeam?.score ?? null;
      const homeScore = g.homeTeam?.score ?? null;
      const hasScore = awayScore !== null && homeScore !== null;

      const liveLabel = isLive ? "🔴 LIVE" : isFinal ? "FINAL" : g.status || "Tonight";
      const blurb = hasScore
        ? `${away} ${awayScore} — ${home} ${homeScore}${isLive && g.period ? ` · Q${g.period}` : ""}`
        : `${series || "Playoff matchup"} · Tipoff ${g.status || "TBD"}`;

      return {
        id: `nba-card-${i + 1}`,
        league: isLive ? "NBA LIVE" : "NBA PLAYOFFS",
        leagueColor: isLive ? "#FF5252" : "#FF6B00",
        title: `${away} vs ${home}`,
        time: liveLabel,
        network: series || "Playoff matchup",
        blurb,
        whatMatters: isLive
          ? "Ask for live edge, second-half props, or in-game adjustment angles."
          : "Ask for matchup edge, game total, and series leverage spots.",
        quickHitters: isLive
          ? ["Best live prop?", "Second-half edge?", "Game total angle?"]
          : ["Best playoff prop?", "Who covers?", "Best total angle?"],
        confirmed: true,
      };
    });
  }, [nbaData, nbaGames, getSeriesLabel]);

  const homeMlbCards = useMemo(() => {
    const games = mlbGames.length > 0 ? mlbGames : (mlbData?.games || []);

    const live = games.filter((g) => g.state === "in");
    const upcoming = games.filter((g) => g.state === "pre");
    const recent = games.filter((g) => g.state === "post").slice(0, 1);

    const pool = [...live, ...upcoming, ...recent].slice(0, 3);

    if (!pool.length) {
      return [
        {
          id: "mlb-default",
          league: "MLB",
          leagueColor: "#1DB954",
          title: "No MLB games today",
          time: "Off-day",
          network: "Daily board",
          blurb: "Check back tomorrow for the next slate.",
          whatMatters: "Ask for tomorrow's pitcher props or futures angles.",
          quickHitters: ["Best K prop tomorrow?", "Best futures angle?", "Top pitcher edge?"],
          confirmed: true,
        },
      ];
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
      const pitchers = homeP && awayP ? `${awayP} vs ${homeP}` : "";

      const blurb = hasScore ? `${away} ${awayScore} — ${home} ${homeScore}` : pitchers || `${away} @ ${home} · Probables TBD`;

      return {
        id: `mlb-card-${i + 1}`,
        league: isLive ? "MLB LIVE" : isFinal ? "MLB · FINAL" : "MLB",
        leagueColor: isLive ? "#FF5252" : "#1DB954",
        title: `${away} @ ${home}`,
        time: liveLabel,
        network: pitchers || "Daily slate",
        blurb,
        whatMatters: isLive
          ? "Ask for live total, run-line live, or batter NRFI props."
          : "Ask for K props, totals, and best batter value.",
        quickHitters: isLive ? ["Live total angle?", "Best live prop?", "Run-line live?"] : ["Best K prop?", "Best batter prop?", "Best game total?"],
        confirmed: true,
      };
    });
  }, [mlbData, mlbGames]);

  const homeGolfCards = useMemo(() => {
    if (golfData === null && golfLoading) {
      return [{
        id: "golf-home-loading",
        league: "GOLF",
        leagueColor: "#FFFFFF",
        title: "PGA Tour board",
        time: "Loading…",
        network: "Live data",
        blurb: "Fetching tournament, odds, and leaderboard context.",
        whatMatters: "Run npm run dev:local so /api/golf can load (Vite proxies to the local API server).",
        quickHitters: ["Best outright value?", "Best top-10 play?", "Who should I fade?"],
        confirmed: true,
      }];
    }

    const currentEvent = golfData?.currentEvent || null;
    const tournament = golfData?.tournament || null;
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

    if (topThree.length > 0) {
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
          ? "Event complete — live betting prompts are turned off. Open Golf for results recap."
          : looksInProgress
            ? "Back current form or fade players with unstable scoring splits."
            : "Top of the board right now — ask for course-fit leans before the next wave.",
        quickHitters: isGolfFinal
          ? []
          : looksInProgress
            ? ["Best live golf angle?", "Who to back from top 3?", "Who should I fade live?"]
            : ["Best angle on the leader?", "Who chases from the pack?", "Best top-10 play?"],
        confirmed: true,
      }];
    }

    const nextEventName =
      tournament?.shortName ||
      tournament?.name ||
      currentEvent?.shortName ||
      currentEvent?.name ||
      "Next PGA Tour Event";

    if (nextEventName) {
      return [{
        id: "golf-home-next",
        league: "GOLF",
        leagueColor: "#FFFFFF",
        title: nextEventName,
        time: tournament?.displayDate || currentEvent?.displayDate || "Upcoming",
        network:
          tournament?.course ||
          currentEvent?.course ||
          golfData?.course?.name ||
          "PGA Tour",
        blurb: `Live top-3 scoring is not posted yet. Check back as soon as tee times go live.\n${sourceLabel} · ${freshnessLabel}`,
        whatMatters: "Target course-fit winners and fade overpriced names before tee-off.",
        quickHitters: [
          "When does live scoring start?",
          "Best pre-tourney value?",
          "Best top-10 before tee-off?",
        ],
        confirmed: true,
      }];
    }

    return [{
      id: "golf-home-unavailable",
      league: "GOLF",
      leagueColor: "#FFFFFF",
      title: "PGA Tour board",
      time: "Temporarily unavailable",
      network: "Live data offline",
      blurb: "Golf card is still pinned on Home. Live leaderboard/odds feed is not reachable right now.",
      whatMatters: "Start the local API server with npm run dev:local so /api/golf can hydrate this card.",
      quickHitters: ["Open Golf tab", "Best pre-tourney value?", "Who to fade this week?"],
      confirmed: true,
    }];
  }, [golfData, golfLoading]);

  const homeTrackerCards = useMemo(
    () =>
      buildHomeTrackerCards({
        performanceData,
        nbaGames,
        mlbData,
        golfData,
        f1Data,
        nflDraftMeta,
        nflSeasonMode,
      }),
    [performanceData, nbaGames, mlbData, golfData, f1Data, nflDraftMeta, nflSeasonMode]
  );

  const homeCards = useMemo(
    () =>
      [
        ...homeAtpSpotlightCards,
        ...homeTrackerCards,
        ...homeGolfCards,
        ...homeNbaCards,
        ...homeMlbCards,
        ...homeF1Cards,
      ].filter(Boolean),
    [
      homeAtpSpotlightCards,
      homeTrackerCards,
      homeGolfCards,
      homeNbaCards,
      homeMlbCards,
      homeF1Cards,
    ]
  );
  
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
        nbaGames,
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
      nbaGames,
      f1Data,
    ]
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

  const tickerNbaGames = useMemo(
    () => (nbaGames.length > 0 ? nbaGames : nbaData?.todaysGames || []),
    [nbaGames, nbaData],
  );

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
    return [...liveMatches]
      .sort((a, b) => {
        const ta = tier(a);
        const tb = tier(b);
        if (ta !== tb) return ta - tb;
        if (ta === 1) return ts(b) - ts(a);
        return ts(a) - ts(b);
      })
      .slice(0, 4);
  }, [liveMatches]);

  const liveTickerTennisCards = useMemo(
    () =>
      tennisTickerMatches.map((m, i) => {
        const awayFull = String(m.raw?.away || (m.title || "").split(" vs ")[0] || "").trim() || "Away";
        const homeFull = String(m.raw?.home || (m.title || "").split(" vs ")[1] || "").trim() || "Home";
        const away = awayFull.split(" ").pop();
        const home = homeFull.split(" ").pop();
        const scoreLine = formatTennisScore(m.raw?.score);
        const isLiveCard = String(m?.raw?.live || "0") === "1";
        const st = normalizeText(m?.raw?.status || "");
        const hasFinalScore =
          scoreLine &&
          (st.includes("final") ||
            st.includes("finished") ||
            st.includes("walkover") ||
            st.includes("retired") ||
            st.includes("complete"));
        const pillLabel = isLiveCard ? "● LIVE" : hasFinalScore ? "FINAL" : "NEXT";
        const pillColor = isLiveCard ? "#22D3EE" : hasFinalScore ? "#A78BFA" : "#94A3B8";
        return (
          <div
            key={`tennis-ticker-${m.id || i}`}
            onClick={goTennis}
            style={{
              flexShrink: 0,
              background: "var(--surface)",
              border: "1px solid rgba(34,211,238,.28)",
              borderRadius: 10,
              padding: "8px 11px",
              cursor: "pointer",
              minWidth: 112,
            }}
          >
            <div
              style={{
                fontFamily: "var(--mono-font)",
                fontSize: 7,
                letterSpacing: 1.5,
                color: pillColor,
                marginBottom: 3,
                textTransform: "uppercase",
              }}
            >
              🎾 {pillLabel}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#ffffff", lineHeight: 1.2 }}>{away}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>@ {home}</div>
            {scoreLine ? (
              <div
                style={{
                  fontFamily: "var(--mono-font)",
                  fontSize: 11,
                  color: "#ffffff",
                  fontWeight: 600,
                  marginTop: 2,
                }}
              >
                {scoreLine}
              </div>
            ) : null}
          </div>
        );
      }),
    [tennisTickerMatches, goTennis],
  );

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
            firePrompt={firePrompt}
            isNflInSeason={isNflInSeason}
            tickerNbaGames={tickerNbaGames}
            getSeriesLabel={getSeriesLabel}
            liveTickerTennisCards={liveTickerTennisCards}
            golfData={golfData}
            mlbGames={mlbGames}
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
            nbaGames={nbaGames}
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

    {/* Performance panel — shared layout with Home */}
    <div style={proMarketing.perfPanel}>
      <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.45, marginBottom: 10 }}>
        What UR TAKE told you — and how it aged. Takes are saved from each answer&apos;s THE PLAY line; no manual logging.
        {" "}
        <strong style={{ fontWeight: 600, color: "var(--soft)" }}>Waiting</strong> = awaiting a gradable result;{" "}
        <strong style={{ fontWeight: 600, color: "var(--soft)" }}>Tracked</strong> = saved; auto-grading where wired (NBA/MLB ML, tennis match winners).
      </div>
      <UrTakeRecordPanel
        userEmail={userEmail}
        performanceData={performanceData}
        performanceLoading={performanceLoading}
        performanceError={performanceError}
        onRefresh={loadPerformanceSnapshot}
      />
    </div>

    {/* Pro header — same surface language as record panel (tool, not landing) */}
    <div style={proMarketing.subscriptionCard}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--mono-font)", fontSize: 9, letterSpacing: 2, color: proMarketing.subLabel ?? "var(--muted)", textTransform: "uppercase" }}>
          Subscription
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span className="logo-review" style={{ fontSize: 17, letterSpacing: 0 }}>
            UnderReview
          </span>
          <span
            style={{
              fontFamily: "var(--display-font)",
              fontSize: 22,
              letterSpacing: 4,
              background: "linear-gradient(90deg,#BF8C00,#F5C842,#FFE680,#F5C842,#BF8C00)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "gleam 3s linear infinite",
            }}
          >
            PRO
          </span>
        </div>
        <div style={{ fontSize: 12, color: proMarketing.subBody ?? "var(--soft)", lineHeight: 1.5, maxWidth: 400 }}>
          Full database access, every sport, same data-dense take style as the rest of the app.
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

    {/* Value bar */}
    <div style={proMarketing.valueGrid}>
      {[["6","Sports"],["Live","Data"],["AI","Powered"],["$9.99","vs $100+ picks"]].map(([val,label])=>(
        <div key={label} style={proMarketing.valueCell}>
          <div style={{fontSize:13,fontWeight:700,color:"var(--text)",marginBottom:2}}>{val}</div>
          <div style={{fontFamily:"var(--mono-font)",fontSize:8,color:proMarketing.valueLabel ?? "#3A4050",letterSpacing:1,textTransform:"uppercase"}}>{label}</div>
        </div>
      ))}
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

    {/* Quote */}
    <div style={proMarketing.quoteBox}>
      <div style={{fontSize:13,color:proMarketing.quoteText ?? "#8A95A3",lineHeight:1.75,fontStyle:"italic",marginBottom:6}}>&quot;Feels like having a sharp friend who actually does the homework. I finally stopped throwing money at expensive pick services.&quot;</div>
      <div style={{fontFamily:"var(--mono-font)",fontSize:9,letterSpacing:2,color:proMarketing.quoteAttrib ?? "#3A4050",textTransform:"uppercase"}}>Under Review Pro Member</div>
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
          ? "Owner access: Broadsheet or Crisp Sport light themes. Authority dark stays default."
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
                You used your {FREE_LIMIT} free questions for this week. Upgrade now for unlimited asks and full Pro access.
              </div>
              <button
                onClick={() => { setShowUpgradeModal(false); goPro(); }}
                style={{width:"100%",padding:"13px",border:"none",borderRadius:10,background:"var(--cyan-bright)",color:"#080A0C",fontFamily:"var(--display-font)",fontSize:18,letterSpacing:2,cursor:"pointer",marginBottom:10}}
              >
                GO PRO
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
