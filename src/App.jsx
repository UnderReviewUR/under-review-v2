import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
import { NBA_PLAYERS } from "./components/data/nba/players.js";
import AskBar from "./components/AskBar.jsx";
import { resolveF1RaceStart } from "./features/f1/raceStart.js";
import { buildHomeTrackerCards } from "./features/home/buildHomeTrackerCards.js";
import { buildDynamicHomeQuestions } from "./features/home/buildDynamicHomeQuestions.js";
import NflPropGuideSection from "./features/nfl/NflPropGuideSection.jsx";
import {
  ChatThread,
  buildNflContext,
  formatOverallStats,
  formatReturnStats,
  formatServeStats,
  golfScoreColor,
  getDrValue,
  getHoldValue,
  getTbValue,
  getTournamentFetchParam,
  isNflInSeason,
  isNflRampMode,
  normalizeTennisMatch,
  normalizeText,
  preferredTournamentScore,
  slugify,
} from "./features/app/helpers.jsx";
import { ATP_PLAYERS, NFL_POSITIONS, NFL_PROP_GUIDE, WTA_PLAYERS } from "./features/app/constants.js";

import { baseCss } from "./styles/appBaseCss.js";
import { NFL_PLAYERS } from "./features/app/embedGolfNflData.js";


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
  const [selectedMatchup, setSelectedMatchup] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedNflPlayer, setSelectedNflPlayer] = useState(null);
  const [nflPosFilter, setNflPosFilter] = useState("ALL");

  // Per-screen inputs — never shared — prevents 1-char typing bug
  const [homeInput, setHomeInput]       = useState("");
  const [askInput, setAskInput]         = useState("");
  const [tennisInput, setTennisInput]   = useState("");
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
  const [players, setPlayers]           = useState(null);
  const [context, setContext]           = useState(null);
  const [liveMatches, setLiveMatches]   = useState([]);
  const [tennisLoading, setTennisLoading] = useState(false);
  const [pastedImage, setPastedImage]   = useState(null);
  const [f1Data, setF1Data]             = useState(null);
  const [f1Loading, setF1Loading]       = useState(false);
  const [nflContextData, setNflContextData] = useState(null);
  const [nbaData, setNbaData]           = useState(null);
  const [nbaLoading, setNbaLoading]     = useState(false);
  const [mlbData, setMlbData]           = useState(null);
  const [mlbLoading, setMlbLoading]     = useState(false);
  const [golfData, setGolfData]         = useState(null);
  const [golfLoading, setGolfLoading]   = useState(false);
  const [golfInput, setGolfInput]       = useState("");
  const [golfMsgs, setGolfMsgs]         = useState([]);

  // Separate inputRef per screen — critical for AskBar memo optimization
  const homeInputRef      = useRef(null);
  const askInputRef       = useRef(null);
  const askBarBottomRef   = useRef(null);
  const tennisInputRef    = useRef(null);
  const nflInputRef       = useRef(null);
  const f1InputRef        = useRef(null);
  const nbaInputRef       = useRef(null);
  const mlbInputRef       = useRef(null);
  const golfInputRef      = useRef(null);
  const golfBarRef        = useRef(null);
  const matchupInputRef   = useRef(null);
  const playerInputRef    = useRef(null);
  const nflPlayerInputRef = useRef(null);
  const fileInputRef      = useRef(null);

  const nflRampMode   = useMemo(() => isNflRampMode(), []);
  const nflSeasonMode = useMemo(() => isNflInSeason(), []);

  // Detect Stripe redirect back to app
  const [proSuccess, setProSuccess] = useState(() => {
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
  const [accessToken, setAccessToken] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("ur_access_token") || "" : ""
  );

  // ── Email gate ──────────────────────────────────────────────────────────────
  const [userEmail, setUserEmail] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("ur_email") || "" : ""
  );
  const [weeklyUsed, setWeeklyUsed]     = useState(0);
  const [showEmailGate, setShowEmailGate] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCodeEntry, setShowCodeEntry] = useState(false);
  const [gateEmail, setGateEmail]         = useState("");
  const [codeInput, setCodeInput]         = useState("");
  const [codeError, setCodeError]         = useState("");
  const [codeLoading, setCodeLoading]     = useState(false);
  const [performanceData, setPerformanceData] = useState(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performanceError, setPerformanceError] = useState("");

  const isUnlimited = accessTier === "owner" || accessTier === "friend" || accessTier === "pro";
  const FREE_LIMIT  = 5;

  const proMarketing = useMemo(() => getProMarketingTokens(activeTheme), [activeTheme]);

  useEffect(() => {
    setActiveTheme((prev) => validateThemeForTier(prev, accessTier));
  }, [accessTier]);

  // Load weekly usage on mount
  useEffect(() => {
    if (isUnlimited) return;
    const used = JSON.parse(localStorage.getItem("ur_queries") || "[]");
    const now  = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    const recent = used.filter(t => now - t < week);
    setWeeklyUsed(recent.length);
    localStorage.setItem("ur_queries", JSON.stringify(recent));
  }, [isUnlimited]);

  // Redeem access code
  const redeemCode = useCallback(async () => {
    if (!codeInput.trim()) return;
    setCodeLoading(true); setCodeError("");
    try {
      const res  = await fetch("/api/access", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ code: codeInput.trim() }) });
      const data = await res.json();
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

  // ── Tennis fetch ───────────────────────────────────────────────────────────
  const fetchTennisBoard = useCallback(async (activeContext=null) => {
    const tournamentParam = getTournamentFetchParam(activeContext);
    const [atpRes, wtaRes] = await Promise.all([
      fetch(`/api/tennis?tour=atp&activeTournament=${encodeURIComponent(tournamentParam)}`),
      fetch(`/api/tennis?tour=wta&activeTournament=${encodeURIComponent(tournamentParam)}`),
    ]);
    const [atpData, wtaData] = await Promise.all([atpRes.json(), wtaRes.json()]);
    const merged = [
      ...(Array.isArray(atpData)?atpData.map(m=>normalizeTennisMatch(m,"ATP",activeContext)):[]),
      ...(Array.isArray(wtaData)?wtaData.map(m=>normalizeTennisMatch(m,"WTA",activeContext)):[]),
    ].filter(Boolean);
    const seen=new Set(); const deduped=[];
    for (const m of merged) {
      const key=[normalizeText(m.league),normalizeText(m.raw?.home),normalizeText(m.raw?.away),normalizeText(m.network),normalizeText(m.raw?.round),normalizeText(m.raw?.event_date)].join("|");
      if (!seen.has(key)) { seen.add(key); deduped.push(m); }
    }
    return deduped.sort((a,b) => {
      const aLive=String(a?.raw?.live||"0")==="1"?1:0;
      const bLive=String(b?.raw?.live||"0")==="1"?1:0;
      if (aLive!==bLive) return bLive-aLive;
      const aPref=preferredTournamentScore(a,activeContext);
      const bPref=preferredTournamentScore(b,activeContext);
      if (aPref!==bPref) return bPref-aPref;
      const aTime=Number.isFinite(a.commenceTs)?a.commenceTs:Number.MAX_SAFE_INTEGER;
      const bTime=Number.isFinite(b.commenceTs)?b.commenceTs:Number.MAX_SAFE_INTEGER;
      return aTime-bTime;
    });
  }, []);

  useEffect(() => {
    let active=true; let pollId=null;
    async function loadAll() {
      setTennisLoading(true);
      try {
        const [pRes,cRes] = await Promise.all([fetch("/api/tennis-players"),fetch("/api/tennis-context")]);
        const [p,c] = await Promise.all([pRes.json(),cRes.json()]);
        if (!active) return;
        setPlayers(p); setContext(c);
        const board = await fetchTennisBoard(c);
        if (!active) return;
        setLiveMatches(board);
      } catch { if(active) setLiveMatches([]); }
      finally { if(active) setTennisLoading(false); }
    }
    loadAll();
    pollId = window.setInterval(() => {
      fetchTennisBoard(context).then(b=>{ if(active) setLiveMatches(b); }).catch(()=>{});
    }, 60000);
    return () => { active=false; if(pollId) window.clearInterval(pollId); };
  }, [fetchTennisBoard]);

  useEffect(() => {
  if (userEmail && !isUnlimited) {
    fetch(`/api/pro-status?email=${encodeURIComponent(userEmail)}`)
      .then(r => r.json())
      .then(data => {
        if (data.pro && data.token) {
          localStorage.setItem("ur_access_token", data.token);
          setAccessToken(data.token);
          setAccessTier("pro");
        }
      })
      .catch(() => {});
  }
}, [userEmail]);

  const loadPerformanceSnapshot = useCallback(async () => {
    const email = String(userEmail || "").trim();
    if (!email) {
      setPerformanceData(null);
      return;
    }
    setPerformanceLoading(true);
    setPerformanceError("");
    try {
      const res = await fetch(`/api/performance?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load performance");
      setPerformanceData(data);
    } catch (err) {
      setPerformanceError(err?.message || "Failed to load performance");
    } finally {
      setPerformanceLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail) return;
    loadPerformanceSnapshot();
  }, [loadPerformanceSnapshot, userEmail]);

  useEffect(() => {
    if (!context) return;
    let cancelled=false;
    fetchTennisBoard(context).then(b=>{ if(!cancelled) setLiveMatches(b); }).catch(()=>{});
    return () => { cancelled=true; };
  }, [context, fetchTennisBoard]);

  // ── F1 data fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    let active=true;
    async function loadF1() {
      setF1Loading(true);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch("/api/f1", { signal: controller.signal });
        clearTimeout(timeout);
        const data = await res.json();
        if (active) setF1Data(data);
      } catch { if (active) setF1Data(null); }
      finally { if (active) setF1Loading(false); }
    }
    loadF1();
    const poll = window.setInterval(() => {
      fetch("/api/f1").then(r=>r.json()).then(d=>{ if(active) setF1Data(d); }).catch(()=>{});
    }, 120000);
    return () => { active=false; window.clearInterval(poll); };
  }, []);

  // ── Canonical NFL context fetch (RB/WR-TE/QB merged) ──────────────────────
  useEffect(() => {
    let active = true;
    async function loadNflContext() {
      try {
        const res = await fetch("/api/nfl-context");
        if (!res.ok) throw new Error(`NFL context ${res.status}`);
        const data = await res.json();
        if (active) setNflContextData(data);
      } catch {
        if (active) setNflContextData(null);
      }
    }
    loadNflContext();
    const poll = window.setInterval(loadNflContext, 15 * 60 * 1000);
    return () => { active = false; window.clearInterval(poll); };
  }, []);

  // ── NBA data fetch ─────────────────────────────────────────────────────────
  const [nbaGames, setNbaGames] = useState([]);

  // NBA Playoff series tracker — update manually each round or wire to API
  const NBA_PLAYOFF_SERIES = {
    // Format: "AWAY_ABBR vs HOME_ABBR" or "HOME_ABBR vs AWAY_ABBR" → series state
    // Update after each game. gameNum = total games played in series.
    // leader = abbr of team leading, or null if tied
  };

  function getSeriesLabel(awayAbbr, homeAbbr) {
    const key1 = `${awayAbbr} vs ${homeAbbr}`;
    const key2 = `${homeAbbr} vs ${awayAbbr}`;
    const series = NBA_PLAYOFF_SERIES[key1] || NBA_PLAYOFF_SERIES[key2];
    if (!series) return null;
    const { gameNum, leader, awayWins, homeWins } = series;
    if (gameNum === 0 || !gameNum) return "Game 1";
    if (!leader) return `Game ${gameNum + 1} · Series tied ${awayWins}-${homeWins}`;
    return `Game ${gameNum + 1} · ${leader} lead ${Math.max(awayWins,homeWins)}-${Math.min(awayWins,homeWins)}`;
  }

  useEffect(() => {
    let active = true;
    async function loadNba() {
      setNbaLoading(true);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch("/api/nba?view=board", { signal: controller.signal });
        clearTimeout(timeout);
        const data = await res.json();
        if (active) setNbaData(data);
      } catch { if (active) setNbaData(null); }
      finally { if (active) setNbaLoading(false); }
    }
    loadNba();
    const poll = window.setInterval(() => {
      fetch("/api/nba?view=board").then(r=>r.json()).then(d=>{ if(active) setNbaData(d); }).catch(()=>{});
    }, 300000);
    return () => { active=false; window.clearInterval(poll); };
  }, []);

  // Fetch NBA games — browser-side ESPN fetch, no auth needed
  useEffect(() => {
    let active = true;
    async function loadGames() {
      try {
        const res = await fetch(
          "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error("ESPN " + res.status);
        const data = await res.json();
        const events = data?.events || [];

        // Get today's date in ET
        const nowET = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
        const todayStr = `${nowET.getFullYear()}-${String(nowET.getMonth()+1).padStart(2,"0")}-${String(nowET.getDate()).padStart(2,"0")}`;

        const games = events
          .filter(e => {
            // ESPN date is UTC — convert to ET date for comparison
            const gET = new Date(new Date(e.date).toLocaleString("en-US", { timeZone: "America/New_York" }));
            const gStr = `${gET.getFullYear()}-${String(gET.getMonth()+1).padStart(2,"0")}-${String(gET.getDate()).padStart(2,"0")}`;
            return gStr === todayStr;
          })
          .map(e => {
            const comp = e.competitions?.[0];
            const home = comp?.competitors?.find(c => c.homeAway === "home");
            const away = comp?.competitors?.find(c => c.homeAway === "away");
            const status = e.status?.type;
            return {
              id: e.id,
              status: status?.shortDetail || status?.description || "Scheduled",
              state: status?.state || "pre",
              period: e.status?.period || 0,
              homeTeam: { name: home?.team?.shortDisplayName, abbr: home?.team?.abbreviation, score: parseInt(home?.score || "0") },
              awayTeam: { name: away?.team?.shortDisplayName, abbr: away?.team?.abbreviation, score: parseInt(away?.score || "0") },
            };
          });

        if (active && games.length > 0) {
          setNbaGames(games);
          return;
        }

        // If ESPN returned nothing for today, try NBA CDN
        const cdn = await fetch("https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json", { cache: "no-store" });
        if (!cdn.ok) throw new Error("CDN " + cdn.status);
        const cdnData = await cdn.json();
        const cdnGames = (cdnData?.scoreboard?.games || []).map(g => ({
          id: g.gameId,
          status: g.gameStatusText,
          state: g.gameStatus === 2 ? "in" : g.gameStatus === 3 ? "post" : "pre",
          period: g.period,
          homeTeam: { name: g.homeTeam?.teamName, abbr: g.homeTeam?.teamTricode, score: g.homeTeam?.score },
          awayTeam: { name: g.awayTeam?.teamName, abbr: g.awayTeam?.teamTricode, score: g.awayTeam?.score },
        }));
        if (active && cdnGames.length > 0) setNbaGames(cdnGames);

      } catch(err) {
        console.log("Games fetch failed:", err.message);
      }
    }
    loadGames();
    const poll = window.setInterval(loadGames, 60000);
    return () => { active=false; window.clearInterval(poll); };
  }, []);

  // ── MLB data fetch ────────────────────────────────────────────────────────
  const [mlbGames, setMlbGames] = useState([]);

  useEffect(() => {
    let active = true;
    async function loadMlb() {
      setMlbLoading(true);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch("/api/mlb?view=board", { signal: controller.signal });
        clearTimeout(timeout);
        const data = await res.json();
        if (active) setMlbData(data);
      } catch { if (active) setMlbData(null); }
      finally { if (active) setMlbLoading(false); }
    }
    loadMlb();
    const poll = window.setInterval(() => {
      fetch("/api/mlb?view=board").then(r=>r.json()).then(d=>{ if(active) setMlbData(d); }).catch(()=>{});
    }, 180000);
    return () => { active=false; window.clearInterval(poll); };
  }, []);

  // ── MLB games — browser-side ESPN fetch (bypasses server cache) ────────────
  useEffect(() => {
    let active = true;
    async function loadMlbGames() {
      try {
        const res = await fetch(
          "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard",
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error("ESPN MLB " + res.status);
        const data = await res.json();
        const events = data?.events || [];
        const nowET = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
        const todayStr = `${nowET.getFullYear()}-${String(nowET.getMonth()+1).padStart(2,"0")}-${String(nowET.getDate()).padStart(2,"0")}`;
        const games = events
          .filter(e => {
            const gET = new Date(new Date(e.date).toLocaleString("en-US", { timeZone: "America/New_York" }));
            const gStr = `${gET.getFullYear()}-${String(gET.getMonth()+1).padStart(2,"0")}-${String(gET.getDate()).padStart(2,"0")}`;
            return gStr === todayStr;
          })
          .map(e => {
            const comp   = e.competitions?.[0];
            const home   = comp?.competitors?.find(c => c.homeAway === "home");
            const away   = comp?.competitors?.find(c => c.homeAway === "away");
            const status = e.status?.type;
            const isLive = status?.state === "in";
            const isFinal = status?.state === "post";
            const gameTime = e.date
              ? new Date(e.date).toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit", timeZone:"America/New_York" }) + " ET"
              : "TBD";
            return {
              id:       e.id,
              status:   isFinal ? "Final" : isLive ? (status?.detail || "Live") : gameTime,
              state:    isFinal ? "post" : isLive ? "in" : "pre",
              homeTeam: { name: home?.team?.displayName, abbr: home?.team?.abbreviation, score: isFinal||isLive ? parseInt(home?.score||"0") : null },
              awayTeam: { name: away?.team?.displayName, abbr: away?.team?.abbreviation, score: isFinal||isLive ? parseInt(away?.score||"0") : null },
            };
          });
        if (active && games.length > 0) setMlbGames(games);
      } catch(err) { console.log("MLB ESPN fetch failed:", err.message); }
    }
    loadMlbGames();
    const poll = window.setInterval(loadMlbGames, 60000);
    return () => { active=false; window.clearInterval(poll); };
  }, []);


  // ── Golf data fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    async function loadGolf() {
      setGolfLoading(true);
      try {
        const res = await fetch("/api/golf?view=board");
        if (!res.ok) throw new Error("Golf " + res.status);
        const data = await res.json();
        if (active) setGolfData(data);
      } catch { if (active) setGolfData(null); }
      finally { if (active) setGolfLoading(false); }
    }
    loadGolf();
    const poll = window.setInterval(() => {
      fetch("/api/golf?view=board").then(r=>r.json()).then(d=>{ if(active) setGolfData(d); }).catch(()=>{});
    }, 8 * 60 * 1000);
    return () => { active=false; window.clearInterval(poll); };
  }, []);

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
  const buildF1Context = useCallback(() => {
  if (!f1Data) return null;

  return {
    standings: Array.isArray(f1Data.standings) ? f1Data.standings : [],
    schedule: f1Data.schedule || { races: [], upcoming: [], past: [], current: [], usingFallback: true },
    session: f1Data.session || null,
    sessions: Array.isArray(f1Data.sessions) ? f1Data.sessions : [],
    usingFallback: !!f1Data.usingFallback,
  };
}, [f1Data]);

  const buildNbaContext = useCallback((questionText) => {
    return {
      seasonContext:   nbaData?.seasonContext || {},
      todaysGames:     nbaGames.length > 0 ? nbaGames : (nbaData?.todaysGames || []),
      lastNight:       nbaData?.lastNight     || [],
      lastNightStats:  nbaData?.lastNightStats|| [],
      liveStats:       nbaData?.liveStats     || [],
      playerStats:     nbaData?.playerStats   || [],
      propLines:       nbaData?.propLines     || [],
      injuries:        nbaData?.injuries      || [],
      recentForm:      nbaData?.recentForm    || "",
      h2hSplits:       nbaData?.h2hSplits     || [],
      gameTotals:      nbaData?.gameTotals     || {},
      playerDb: NBA_PLAYERS,
      question:        questionText || "",
    };
  }, [nbaData, nbaGames]);

  const buildMlbContext = useCallback((questionText) => {
    const allGames = mlbGames.length > 0 ? mlbGames : (mlbData?.games || []);
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
      seasonContext: mlbData?.seasonContext || {},
      games:         trimmedGames,
      propLines:     (mlbData?.propLines || []).slice(0, 12),
      gameTotals:    mlbData?.gameTotals   || {},
      question:      questionText || "",
    };
  }, [mlbData, mlbGames]);


    const buildGolfContext = useCallback((questionText) => {
  return {
    currentEvent: golfData?.currentEvent
      ? {
          name: golfData.currentEvent.name || null,
          shortName: golfData.currentEvent.shortName || null,
          course: golfData.currentEvent.course || null,
          location: golfData.currentEvent.location || null,
          round: golfData.currentEvent.round || null,
          state: golfData.currentEvent.state || null,
          leaderboard: golfData.currentEvent.leaderboard || [],
        }
      : null,
    tournament: golfData?.tournament || null,
    course: golfData?.course || null,
    rankings: (golfData?.rankings || []).slice(0, 12),
    odds: {
      outrights: (golfData?.odds?.outrights || []).slice(0, 16),
      topFinish: golfData?.odds?.topFinish || {},
      makeCut: golfData?.odds?.makeCut || {},
    },
    recentResults: (golfData?.recentResults || []).slice(0, 10),
    courseStats: (golfData?.courseStats || []).slice(0, 8),
    question: questionText || "",
  };
}, [golfData]);

  const nflPlayersForUi = useMemo(() => {
    const remote = nflContextData?.uiPlayers;
    if (remote && Object.keys(remote).length) return remote;
    return NFL_PLAYERS;
  }, [nflContextData]);

  // ── Core AI call ───────────────────────────────────────────────────────────
  const askUrTake = useCallback(async ({ text, matchup, setMsgs, sportHint }) => {
  if (!text || isAsking) return;
  if (!canAsk()) return;
  recordQuery();

  setIsAsking(true);
  const imgToSend = pastedImage;

  setMsgs(prev => [
    ...prev,
    { role: "user", text, image: imgToSend?.previewUrl || null },
    { role: "ai", text: "ANALYZING...", loading: true, sport: sportHint }
  ]);

    clearImage();

  try {
    const body = {
      question: text,
      userEmail: userEmail || null,
      history: [],
      sportHint: sportHint || null,
      matchupContext: matchup || null,
      image: null,
    };

    if (sportHint === "tennis") {
      body.players = players || null;
      body.context = context || null;
      body.liveMatches = (liveMatches || []).slice(0, 12);
    }

    if (sportHint === "nfl") {
      body.nflContext = nflContextData?.promptContext || buildNflContext(nflPlayersForUi);
    }

    if (sportHint === "f1") {
      body.f1Context = buildF1Context();
    }

    if (sportHint === "nba") {
      body.nbaContext = buildNbaContext(text);
    }

    if (sportHint === "mlb") {
      body.mlbContext = buildMlbContext(text);
    }

    if (sportHint === "golf") {
      body.golfContext = buildGolfContext(text);
    }

    if (!sportHint) {
      body.context = context || null;
      body.liveMatches = (liveMatches || []).slice(0, 8);
    }

    if (imgToSend) {
      body.image = {
        base64: imgToSend.base64,
        mediaType: imgToSend.mediaType,
      };
    }

    const res = await fetch("/api/ur-take", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const raw = await res.text();

    if (!res.ok) {
      throw new Error(`/api/ur-take ${res.status}: ${raw}`);
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(`Invalid JSON from /api/ur-take: ${raw.slice(0, 500)}`);
    }

    setMsgs(prev => [
      ...prev.filter(m => !m.loading),
      { role: "ai", text: data.response || "Couldn't get a response — try again." }
    ]);
    if (userEmail) {
      loadPerformanceSnapshot().catch(() => {});
    }
  } catch (err) {
    setMsgs(prev => [
      ...prev.filter(m => !m.loading),
      { role: "ai", text: err?.message || "Something went wrong — try again." }
    ]);
  } finally {
    setIsAsking(false);
  }
}, [
  clearImage,
  context,
  isAsking,
  liveMatches,
  pastedImage,
  players,
  buildF1Context,
  buildNbaContext,
  buildMlbContext,
  buildGolfContext,
  nflPlayersForUi,
  nflContextData,
  canAsk,
  recordQuery,
  userEmail,
  loadPerformanceSnapshot
]);

  // ── Player lookups ─────────────────────────────────────────────────────────
  const getPlayer    = useCallback((name,tour="atp") => { if(!players)return null; return(tour==="atp"?players.atp:players.wta)?.[name]||null; }, [players]);
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
  const activeTournamentMatches = useMemo(()=>liveMatches.filter(m=>preferredTournamentScore(m,context)>0),[liveMatches,context]);

  const tennisBoardHeadline = useMemo(() => {
    const n=context?.currentTournament?.name;
    if (activeTournamentMatches.length>0&&n) return n;
    return "Tennis Board";
  }, [activeTournamentMatches.length,context]);

  const tennisBoardSubline = useMemo(() => {
    const n=context?.currentTournament?.name;
    if (activeTournamentMatches.length>0&&n) return `${n.toUpperCase()} · LIVE + UPCOMING`;
    return "CURRENT + UPCOMING TOUR MATCHES";
  }, [activeTournamentMatches.length,context]);

  // ── Home cards ─────────────────────────────────────────────────────────────
  const homeTennisCards = useMemo(() => {
    const source = activeTournamentMatches.length>0 ? activeTournamentMatches : liveMatches;
    const liveCards = source.filter(m=>String(m?.raw?.live||"0")==="1");
    const upcomingCards = source.filter(m=>String(m?.raw?.live||"0")!=="1");
    const cards=[];
    if(liveCards[0]) cards.push({...liveCards[0],homeCategory:"Live Tennis"});
    if(upcomingCards[0]) cards.push({...upcomingCards[0],homeCategory:"Upcoming Tennis"});
    if(!cards.length&&liveMatches[0]) cards.push({...liveMatches[0],homeCategory:String(liveMatches[0]?.raw?.live||"0")==="1"?"Live Tennis":"Upcoming Tennis"});
    if(!cards.length) {
      cards.push({
        id:"tennis-ctx-1", league:"TENNIS", leagueColor:"#0891B2",
        title:context?.currentTournament?.name?`Best angle at ${context.currentTournament.name}`:"Tennis Futures — Value Plays",
        time:"Current Market", network:context?.currentTournament?.surface||"Tour Futures",
        blurb:context?.currentTournament?.context?context.currentTournament.context:"Player database, surface Elo, and futures context are loaded.",
        whatMatters:"Ask for the best current tennis future, matchup angle, or surface edge.",
        quickHitters:["Best tennis future right now?","Best clay angle?","Who has the best current value?"],
        confirmed:true,
      });
    }
    return cards.slice(0,2);
  }, [activeTournamentMatches,liveMatches,context]);

  const homeNflCards = useMemo(() => {
    if (nflSeasonMode) return [
      {id:"nfl-season-1",league:"NFL IN-SEASON",leagueColor:"#D97706",title:"Best weekly NFL prop board",time:"Weekly Market",network:"Weekly Props",blurb:"Usage, role changes, and current mispricing.",whatMatters:"Ask for the best current weekly NFL edge.",quickHitters:["Best prop this week?","Biggest role shift?","Best TD angle?"],confirmed:true},
      {id:"nfl-season-2",league:"NFL IN-SEASON",leagueColor:"#D97706",title:"Most mispriced in-season usage spot",time:"Weekly Market",network:"Role + Volume",blurb:"Where the market is lagging behind current role and usage.",whatMatters:"Ask for the cleanest role-driven edge.",quickHitters:["Which line is stale?","Best volume play?","Best role-based edge?"],confirmed:true},
    ];
    return [
      {id:"nfl-future-1",league:"NFL FUTURE",leagueColor:"#D97706",title:"Puka Nacua 2026 outlook",time:nflRampMode?"Season Approaching":"Futures Window",network:"Season Futures",blurb:"Led NFL in receptions 2025 with 129 catches. Zero TDs. Elite volume profile for futures.",whatMatters:"Yards and catches props are the play. TD regression is the variable.",quickHitters:["Best Puka future?","Yards or catches?","Is price fair yet?"],confirmed:true},
      {id:"nfl-future-2",league:"NFL FUTURE",leagueColor:"#D97706",title:"Derrick Henry TD future",time:nflRampMode?"Season Approaching":"Futures Window",network:"Season Futures",blurb:"15 TDs in 2025 at 0.94 per game. Most reliable TD-scorer profile in football.",whatMatters:"Ask whether the price still has value.",quickHitters:["Henry TD over?","Best RB TD future?","Most reliable scorer profile?"],confirmed:true},
    ];
  }, [nflSeasonMode, nflRampMode]);

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
    const upcoming = games.filter(g => g.state === "pre").slice(0, 2);
    const cards = upcoming.map((g, i) => {
      const away = g.awayTeam?.abbr || g.awayTeam?.name || "Away";
      const home = g.homeTeam?.abbr || g.homeTeam?.name || "Home";
      const series = getSeriesLabel(away, home);
      return {
        id: `nba-upcoming-${i + 1}`,
        league: "NBA PLAYOFFS",
        leagueColor: "#FF6B00",
        title: `${away} vs ${home}`,
        time: g.status || "Upcoming",
        network: series || "Playoff matchup",
        blurb: `${series || "Series info pending"} · Tipoff ${g.status || "TBD"}`,
        whatMatters: "Ask for matchup edge, game total, and series leverage spots.",
        quickHitters: ["Best playoff prop?", "Who covers this game?", "Best total angle?"],
        confirmed: true
      };
    });
    if (cards.length) return cards;
    return [{
      id: "nba-default",
      league: "NBA PLAYOFFS",
      leagueColor: "#FF6B00",
      title: "Upcoming playoff games",
      time: "Loading slate",
      network: "Series board",
      blurb: "Loading upcoming playoff matchups and series state.",
      whatMatters: "Ask for playoff props and spread edges.",
      quickHitters: ["Best playoff prop?", "Best spread tonight?", "Best game total?"],
      confirmed: true
    }];
  }, [nbaData, nbaGames]);

  const homeMlbCards = useMemo(() => {
    const games = mlbData?.games || [];
    const pool = games.filter((g) => g.state === "in" || g.state === "pre").slice(0, 3);
    if (!pool.length) {
      return [{
        id: "mlb-default",
        league: "MLB",
        leagueColor: "#1DB954",
        title: "MLB slate loading",
        time: "Active",
        network: "Daily board",
        blurb: "Loading up to three MLB games.",
        whatMatters: "Ask for pitcher props, totals, and batter value.",
        quickHitters: ["Best K prop?", "Best batter prop?", "Best game total?"],
        confirmed: true
      }];
    }

    const cards = pool.map((g, i) => {
      const away = g.awayTeam?.abbr || g.awayTeam?.name || "Away";
      const home = g.homeTeam?.abbr || g.homeTeam?.name || "Home";
      const isLive = g.state === "in";
      return {
        id: `mlb-home-${i + 1}`,
        league: isLive ? "MLB LIVE" : "MLB",
        leagueColor: "#1DB954",
        title: `${away} @ ${home}`,
        time: isLive ? "LIVE" : (g.status || "Upcoming"),
        network: isLive
          ? `${g.awayTeam?.score || 0} — ${g.homeTeam?.score || 0}`
          : "Today's slate",
        blurb: isLive
          ? "Live board — ask for in-game angle."
          : "Upcoming matchup — ask for best total/prop.",
        whatMatters: "Pitcher props, game totals, and matchup context.",
        quickHitters: ["Best K prop?", "Best game total?", "Best batter play?"],
        confirmed: true
      };
    });
    cards.push({
      id: "mlb-home-more",
      league: "MLB",
      leagueColor: "#1DB954",
      title: "Click here for more MLB",
      time: "Open full tab",
      network: "More games",
      blurb: "View full MLB board and all matchups.",
      whatMatters: "Tap to open MLB tab.",
      quickHitters: ["Open MLB tab"],
      confirmed: true
    });
    return cards;
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
    const freshnessLabel = Number.isNaN(fetchedTs)
      ? "Updated recently"
      : (() => {
          const ageMin = Math.max(0, Math.round((Date.now() - fetchedTs) / 60000));
          if (ageMin <= 1) return "Updated just now";
          if (ageMin < 60) return `Updated ${ageMin}m ago`;
          const ageHours = Math.round(ageMin / 60);
          return `Updated ${ageHours}h ago`;
        })();

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
        league: looksInProgress ? "GOLF LIVE" : "GOLF",
        leagueColor: "#FFFFFF",
        title: currentEvent?.shortName || currentEvent?.name || "PGA Tour",
        time: currentEvent?.round || (looksInProgress ? "Live" : "Leaderboard"),
        network: currentEvent?.course || "PGA Tour",
        blurb: `${leaderboardLine}\n${sourceLabel} · ${freshnessLabel}`,
        topThree: topThree.map((p, i) => ({
          rank: i + 1,
          name: shortName(readName(p)),
          score: formatScore(p?.score),
          thru: String(p?.thru || "").trim(),
        })),
        sourceLine: `${sourceLabel} · ${freshnessLabel}`,
        whatMatters: looksInProgress
          ? "Back current form or fade players with unstable scoring splits."
          : "Top of the board right now — ask for course-fit leans before the next wave.",
        quickHitters: looksInProgress
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
      }),
    [performanceData, nbaGames, mlbData, golfData, f1Data]
  );

  const homeCards = useMemo(
    () =>
      [
        ...homeTrackerCards,
        ...homeGolfCards,
        ...homeNbaCards,
        ...homeMlbCards,
        ...homeF1Cards,
      ].filter(Boolean),
    [
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
        context,
        golfData,
        nbaGames,
        f1Data,
      }),
    [activeTournamentMatches, tennisLiveMatches, tennisUpcomingMatches, nflSeasonMode, context, golfData, nbaGames, f1Data]
  );

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goHome   = useCallback(()=>{ setTab("home");  setScreen("home");  setSelectedMatchup(null); setSelectedPlayer(null); setSelectedNflPlayer(null); },[]);
  const goTennis = useCallback(()=>{ setTab("tennis");setScreen("tennis");setSelectedMatchup(null); setSelectedPlayer(null); setSelectedNflPlayer(null); },[]);
  const goNfl    = useCallback(()=>{ setTab("nfl");   setScreen("nfl");   setSelectedMatchup(null); setSelectedPlayer(null); setSelectedNflPlayer(null); },[]);
  const goF1     = useCallback(()=>{ setTab("f1");    setScreen("f1");    setSelectedMatchup(null); setSelectedPlayer(null); setSelectedNflPlayer(null); },[]);
  const goNba    = useCallback(()=>{ setTab("nba");   setScreen("nba");   setSelectedMatchup(null); setSelectedPlayer(null); setSelectedNflPlayer(null); },[]);
  const goMlb    = useCallback(()=>{ setTab("mlb");   setScreen("mlb");   setSelectedMatchup(null); setSelectedPlayer(null); setSelectedNflPlayer(null); },[]);
  const goAsk    = useCallback(()=>{ setTab("ask");   setScreen("ask");   setSelectedMatchup(null); },[]);
  const goPro    = useCallback(()=>{ setTab("pro");   setScreen("pro");   setSelectedMatchup(null); setSelectedPlayer(null); setSelectedNflPlayer(null); },[]);

  const goGolf   = useCallback(()=>{ setTab("golf");  setScreen("golf"); setSelectedMatchup(null); setSelectedPlayer(null); setSelectedNflPlayer(null); },[]);
 const openMatchup = useCallback((m) => {
  if (!m?.title || !m?.network) return;

  if (m?.id === "mlb-home-more") {
    setTab("mlb");
    setScreen("mlb");
    return;
  }

  if (m?.id === "ur-home-tracker") {
    setTab("pro");
    setScreen("pro");
    return;
  }

  if ((m.league || "").includes("GOLF")) {
    setTab("golf");
    setScreen("golf");
    return;
  }

  if ((m.league || "").includes("NBA")) {
    setTab("nba");
    setScreen("nba");
    return;
  }

  if ((m.league || "").includes("MLB")) {
    setTab("mlb");
    setScreen("mlb");
    return;
  }

  if ((m.league || "").includes("F1")) {
    setTab("f1");
    setScreen("f1");
    return;
  }

  setSelectedMatchup(m);
  setMatchupMsgs([]);
  setMatchupInput("");
  setScreen("matchup");
  setTab(m?.league?.includes("NFL") ? "nfl" : "tennis");
}, []);
  const openPlayer    = useCallback(name=>{ setSelectedPlayer(name); setScreen("player"); setTab("tennis"); },[]);
  const openNflPlayer = useCallback(name=>{ setSelectedNflPlayer(name); setScreen("nflplayer"); setTab("nfl"); },[]);
  const firePrompt = useCallback((prompt, sportHint = null) => {
  setTab("ask");
  setScreen("ask");
  setAskInput("");
  askUrTake({ text: prompt, setMsgs: setAskMsgs, sportHint });
}, [askUrTake]);

  // ── Submit handlers ────────────────────────────────────────────────────────
  const submitHome    = useCallback(()=>{ const t=homeInput.trim();    if(!t||isAsking)return; setHomeInput(""); setAskInput(""); setTab("ask"); setScreen("ask"); askUrTake({text:t,setMsgs:setAskMsgs}); },[askUrTake,homeInput,isAsking]);
  const submitAsk     = useCallback(()=>{ const t=askInput.trim();     if(!t||isAsking)return; setAskInput(""); askUrTake({text:t,setMsgs:setAskMsgs}); setTimeout(()=>{ askBarBottomRef.current?.scrollIntoView({behavior:"smooth",block:"end"}); },100); },[askInput,askUrTake,isAsking,askBarBottomRef]);
  const tennisBarRef  = useRef(null);
  const submitTennis  = useCallback(forced=>{ const t=(forced??tennisInput).trim(); if(!t||isAsking)return; if(!forced)setTennisInput(""); askUrTake({text:t,setMsgs:setTennisMsgs,sportHint:"tennis"}); setTimeout(()=>{ tennisBarRef.current?.scrollIntoView({behavior:"smooth",block:"end"}); },100); },[askUrTake,isAsking,tennisInput]);
  const nflBarRef     = useRef(null);
  const submitNfl     = useCallback(forced=>{ const t=(forced??nflInput).trim();    if(!t||isAsking)return; if(!forced)setNflInput("");   askUrTake({text:t,setMsgs:setNflMsgs,sportHint:"nfl"}); setTimeout(()=>{ nflBarRef.current?.scrollIntoView({behavior:"smooth",block:"end"}); },100); },[askUrTake,isAsking,nflInput]);
  const f1BarRef      = useRef(null);
  const submitF1      = useCallback(forced=>{ const t=(forced??f1Input).trim();     if(!t||isAsking)return; if(!forced)setF1Input("");    askUrTake({text:t,setMsgs:setF1Msgs,sportHint:"f1"}); setTimeout(()=>{ f1BarRef.current?.scrollIntoView({behavior:"smooth",block:"end"}); },100); },[askUrTake,isAsking,f1Input]);
  const nbaBarRef     = useRef(null);
  const submitNba     = useCallback(forced=>{ const t=(forced??nbaInput).trim();    if(!t||isAsking)return; if(!forced)setNbaInput("");   askUrTake({text:t,setMsgs:setNbaMsgs,sportHint:"nba"}); setTimeout(()=>{ nbaBarRef.current?.scrollIntoView({behavior:"smooth",block:"end"}); },100); },[askUrTake,isAsking,nbaInput]);
  const mlbBarRef     = useRef(null);
  const submitMlb     = useCallback(forced=>{ const t=(forced??mlbInput).trim();    if(!t||isAsking)return; if(!forced)setMlbInput("");   askUrTake({text:t,setMsgs:setMlbMsgs,sportHint:"mlb"}); setTimeout(()=>{ mlbBarRef.current?.scrollIntoView({behavior:"smooth",block:"end"}); },100); },[askUrTake,isAsking,mlbInput]);

  const golfBarRefLocal = golfBarRef;
  const submitGolf = useCallback(forced=>{ const t=(forced??golfInput).trim(); if(!t||isAsking)return; if(!forced)setGolfInput(""); askUrTake({text:t,setMsgs:setGolfMsgs,sportHint:"golf"}); setTimeout(()=>{ golfBarRefLocal.current?.scrollIntoView({behavior:"smooth",block:"end"}); },100); },[askUrTake,isAsking,golfInput,golfBarRefLocal]);
const submitMatchup = useCallback(forced=>{ const t=(forced??matchupInput).trim(); if(!t||isAsking)return; if(!forced)setMatchupInput(""); const league=String(selectedMatchup?.league||"").toUpperCase(); const hint=league.includes("NFL")?"nfl":league.includes("NBA")?"nba":league.includes("MLB")?"mlb":league.includes("F1")?"f1":league.includes("GOLF")?"golf":"tennis"; askUrTake({text:t,matchup:selectedMatchup,setMsgs:setMatchupMsgs,sportHint:hint}); },[askUrTake,isAsking,matchupInput,selectedMatchup]);

  // ── Sub-components ─────────────────────────────────────────────────────────
  function TennisPlayerCard({ name, idx, tour }) {
    const p=getPlayer(name,tour); if(!p)return null;
    return (
      <div className="player-card" onClick={()=>openPlayer(name)}>
        <div className="player-top">
          <div className="player-rank">#{idx+1}</div>
          <div className="player-info">
            <div className="player-name">{name}</div>
            <div className="player-style">{Array.isArray(p.style)?p.style.join(", ").replaceAll("_"," "):p.style}</div>
            <div className="surface-pills">{p.surfaceNote?.hard&&<span className="surface-pill surface-hard">HARD</span>}{p.surfaceNote?.clay&&<span className="surface-pill surface-clay">CLAY</span>}{p.surfaceNote?.grass&&<span className="surface-pill surface-grass">GRASS</span>}</div>
          </div>
          <div className="player-elo"><span className="player-elo-num">{p.elo}</span><span className="player-elo-label">ELO</span>{p.record2026&&<div className="form-badge" style={{marginTop:4}}>2026</div>}</div>
        </div>
        <div className="player-stats">
          <div className="pstat"><div className="pstat-label">HOLD</div><div className="pstat-value">{getHoldValue(p)}</div></div>
          <div className="pstat"><div className="pstat-label">DR</div><div className="pstat-value" style={{color:"var(--cyan-bright)"}}>{getDrValue(p)}</div></div>
          <div className="pstat"><div className="pstat-label">TB%</div><div className="pstat-value">{getTbValue(p)}</div></div>
        </div>
      </div>
    );
  }

  function NflPlayerCard({ name, player }) {
    return (
      <div className="nfl-player-card" onClick={()=>openNflPlayer(name)}>
        <div className="nfl-player-top">
          <div className="nfl-player-left"><div className="nfl-rank">{player.pos}</div><div className="nfl-player-info"><div className="nfl-player-name">{name}</div><div className="nfl-player-meta">{player.team} · {player.tier}</div></div></div>
          <div className="nfl-player-right"><span className="nfl-yds-pg">{player.ydsPg}</span><span className="nfl-yds-label">YDS/G</span></div>
        </div>
        <div className="nfl-player-stats">
          <div className="nfl-stat"><div className="nfl-stat-label">GAMES</div><div className="nfl-stat-value">{player.rec2025.g}</div></div>
          <div className="nfl-stat"><div className="nfl-stat-label">TDs</div><div className="nfl-stat-value" style={{color:"var(--nfl)"}}>{player.rec2025.td}</div></div>
          {player.rec2025.tgt?<div className="nfl-stat"><div className="nfl-stat-label">TGT</div><div className="nfl-stat-value">{player.rec2025.tgt}</div></div>:<div className="nfl-stat"><div className="nfl-stat-label">REC/G</div><div className="nfl-stat-value">{player.rec2025.recPg??"—"}</div></div>}
          <div className="nfl-stat"><div className="nfl-stat-label">YPR</div><div className="nfl-stat-value">{player.rec2025.ypr}</div></div>
        </div>
      </div>
    );
  }

  const askBarCommon = { fileInputRef, pastedImage, clearImage, isAsking, processImageFile };
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

  // ── NBA top players from live stats (sorted by pts) ────────────────────────
  const nbaTopPlayers = useMemo(() => {
    const stats = nbaData?.playerStats || [];
    return stats.slice(0, 20);
  }, [nbaData]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
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
  >

        <header className="hdr">
  <div className="wordmark" onClick={goHome}>
    <span className="logo-review">UnderReview</span>
  </div>
  <div className="header-right">{headerPill}</div>
</header>

        {/* ══ HOME ══ */}
        {screen==="home"&&(
          <main className={`screen${hasDockedBar ? " has-msgs" : ""}`} style={{padding:"8px 12px calc(96px + env(safe-area-inset-bottom))"}}>

            {/* Ask bar — leads immediately, no hero copy */}
            <AskBar inputRef={homeInputRef} value={homeInput} onChange={setHomeInput} onSubmit={submitHome} placeholder="Ask about any player, game, or bet..." {...askBarCommon} />

            {/* Sport pill rail — horizontal scroll, feels like tabs */}
            <div className="sport-rail">
              <button className="sport-pill sport-pill-tennis" onClick={goTennis}>TENNIS</button>
              <button className="sport-pill sport-pill-nfl" onClick={goNfl}>NFL</button>
              <button className="sport-pill sport-pill-f1" onClick={goF1}>F1</button>
              <button className="sport-pill sport-pill-nba" onClick={goNba}>NBA</button>
              <button className="sport-pill sport-pill-mlb" onClick={goMlb}>MLB</button>
              <button className="sport-pill" style={{color:"#FFFFFF",borderColor:"rgba(255,255,255,.5)"}} onClick={goGolf}>GOLF</button>
            </div>

            {/* Prompts first — actionable before the live snapshot strip */}
            <div className="ask-cards">
              {dynamicHomeQuestions.map((q) => (
                <div key={q.id} className="ask-card" onClick={() => firePrompt(q.prompt, q.sportHint || null)}>
                  <div className="ask-card-bar" style={{ background: q.color }} />
                  <div className="ask-card-text">{q.text}</div>
                  <div style={{ color: "var(--muted)", fontSize: 16, flexShrink: 0 }}>›</div>
                </div>
              ))}
            </div>

            <div className="home-live-label">Live snapshot</div>
{/* Top ticker rail */}
<div
  style={{
    display: "flex",
    gap: 8,
    overflowX: "auto",
    scrollbarWidth: "none",
    marginBottom: 12,
    alignItems: "stretch",
  }}
>
  {(isNflInSeason()
    ? [
        <div
          key="nfl-live"
          onClick={goNfl}
          style={{
            flexShrink: 0,
            background: "rgba(74,144,217,.08)",
            border: "1px solid rgba(74,144,217,.25)",
            borderRadius: 10,
            padding: "8px 11px",
            cursor: "pointer",
            minWidth: 120,
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono-font)",
              fontSize: 7,
              letterSpacing: 1.5,
              color: "#4A90D9",
              marginBottom: 3,
            }}
          >
            🏈 NFL
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
            Weekly Props
          </div>
          <div style={{ fontSize: 10, color: "var(--muted)" }}>Live board →</div>
        </div>,

        ...nbaGames
          .filter((g) => g.state === "in")
          .slice(0, 2)
          .map((g, i) => {
            const away = g.awayTeam?.abbr || g.awayTeam?.name || "AWAY";
            const home = g.homeTeam?.abbr || g.homeTeam?.name || "HOME";
            const isLive = g.state === "in";
            const seriesLabel = getSeriesLabel(away, home);

            return (
              <div
                key={`nba-${i}`}
                onClick={goNba}
                style={{
                  flexShrink: 0,
                  background: "var(--surface)",
                  border: `1px solid ${isLive ? "rgba(0,230,118,.3)" : "var(--border)"}`,
                  borderRadius: 10,
                  padding: "8px 11px",
                  cursor: "pointer",
                  minWidth: 110,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--mono-font)",
                    fontSize: 7,
                    letterSpacing: 1.5,
                    color: isLive ? "#00E676" : "#FF6B00",
                    marginBottom: 3,
                    textTransform: "uppercase",
                  }}
                >
                  🏀 {isLive ? "● LIVE" : g.status}
                </div>

                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}>
                  {away}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>@ {home}</div>

                {isLive && g.awayTeam?.score != null && (
                  <div
                    style={{
                      fontFamily: "var(--mono-font)",
                      fontSize: 11,
                      color: "var(--soft)",
                      marginTop: 2,
                    }}
                  >
                    {g.awayTeam.score}-{g.homeTeam.score}
                  </div>
                )}

                {seriesLabel && (
                  <div
                    style={{
                      fontFamily: "var(--mono-font)",
                      fontSize: 8,
                      color: "#FF6B00",
                      marginTop: 3,
                      letterSpacing: 0.5,
                    }}
                  >
                    {seriesLabel}
                  </div>
                )}
              </div>
            );
          }),

        ...(golfData?.currentEvent?.leaderboard?.length
          ? [
              <div
                key="golf-ticker"
                onClick={goGolf}
                style={{
                  flexShrink: 0,
                  background: "var(--surface)",
                  border: "1px solid rgba(255,255,255,.12)",
                  borderRadius: 10,
                  padding: "8px 11px",
                  cursor: "pointer",
                  minWidth: 165,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--mono-font)",
                    fontSize: 7,
                    letterSpacing: 1.5,
                    color: "rgba(255,255,255,.7)",
                    marginBottom: 4,
                    textTransform: "uppercase",
                  }}
                >
                  ⛳ {golfData.currentEvent.shortName || golfData.currentEvent.name || "PGA TOUR"}
                </div>

                <div
                  style={{
                    fontFamily: "var(--mono-font)",
                    fontSize: 8,
                    color: "var(--muted)",
                    marginBottom: 5,
                    letterSpacing: 1,
                  }}
                >
                  {golfData.currentEvent.round || "IN PROGRESS"}
                </div>

                {golfData.currentEvent.leaderboard.slice(0, 3).map((p, i) => (
                  <div
                    key={`${p.name}-${i}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 11,
                      lineHeight: 1.5,
                      color: i === 0 ? "var(--text)" : "var(--muted)",
                    }}
                  >
                    <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <span
                        style={{
                          fontFamily: "var(--mono-font)",
                          fontSize: 9,
                          color: "var(--muted)",
                          minWidth: 14,
                        }}
                      >
                        {p.position || i + 1}
                      </span>
                      <span style={{ fontWeight: i === 0 ? 700 : 500 }}>
                        {String(p.name || "").split(" ").pop()}
                      </span>
                    </span>

                    <span
                      style={{
                        fontFamily: "var(--mono-font)",
                        color:
                          p.score && String(p.score).startsWith("-")
                            ? "#00E676"
                            : p.score === "E"
                            ? "var(--text)"
                            : "#FF4444",
                      }}
                    >
                      {p.score || "—"}
                    </span>
                  </div>
                ))}
              </div>,
            ]
          : golfData?.currentEvent
          ? [
              <div
                key="golf-ticker"
                onClick={goGolf}
                style={{
                  flexShrink: 0,
                  background: "var(--surface)",
                  border: "1px solid rgba(255,255,255,.12)",
                  borderRadius: 10,
                  padding: "8px 11px",
                  cursor: "pointer",
                  minWidth: 170,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--mono-font)",
                    fontSize: 7,
                    letterSpacing: 1.5,
                    color: "rgba(255,255,255,.7)",
                    marginBottom: 4,
                    textTransform: "uppercase",
                  }}
                >
                  ⛳ {golfData.currentEvent.shortName || golfData.currentEvent.name || "PGA TOUR"}
                </div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>
                  {golfData.currentEvent.course || "Course TBD"}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 9,
                    fontFamily: "var(--mono-font)",
                    color: "rgba(255,255,255,.75)",
                    lineHeight: 1.35,
                    whiteSpace: "pre-line",
                  }}
                >
                  {"Top 3 live scores pending\nFeed has not posted leaderboard yet"}
                </div>
              </div>,
            ]
          : []),

        ...(mlbGames.length > 0 ? mlbGames : (mlbData?.games || []))
          .filter((g) => g.state === "in")
          .slice(0, 1)
          .map((g, i) => {
            const away = g.awayTeam?.abbr || g.awayTeam?.name || "AWAY";
            const home = g.homeTeam?.abbr || g.homeTeam?.name || "HOME";
            const isLive = g.state === "in";

            return (
              <div
                key={`mlb-${i}`}
                onClick={goMlb}
                style={{
                  flexShrink: 0,
                  background: "var(--surface)",
                  border: `1px solid ${isLive ? "rgba(0,230,118,.3)" : "var(--border)"}`,
                  borderRadius: 10,
                  padding: "8px 11px",
                  cursor: "pointer",
                  minWidth: 110,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--mono-font)",
                    fontSize: 7,
                    letterSpacing: 1.5,
                    color: isLive ? "#00E676" : "#1DB954",
                    marginBottom: 3,
                    textTransform: "uppercase",
                  }}
                >
                  ⚾ {isLive ? "● LIVE" : g.status}
                </div>

                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}>
                  {away}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>@ {home}</div>

                {isLive && g.awayTeam?.score != null && (
                  <div
                    style={{
                      fontFamily: "var(--mono-font)",
                      fontSize: 11,
                      color: "var(--soft)",
                      marginTop: 2,
                    }}
                  >
                    {g.awayTeam.score}-{g.homeTeam.score}
                  </div>
                )}
              </div>
            );
          })
      ]
    : [
        ...[...nbaGames.filter((g) => g.state === "in"), ...nbaGames.filter((g) => g.state === "pre").slice(0, 2)]
          .slice(0, 3)
          .map((g, i) => {
            const away = g.awayTeam?.abbr || g.awayTeam?.name || "AWAY";
            const home = g.homeTeam?.abbr || g.homeTeam?.name || "HOME";
            const isLive = g.state === "in";
            const seriesLabel = getSeriesLabel(away, home);

            return (
              <div
                key={`nba-${i}`}
                onClick={goNba}
                style={{
                  flexShrink: 0,
                  background: "var(--surface)",
                  border: `1px solid ${isLive ? "rgba(0,230,118,.3)" : "var(--border)"}`,
                  borderRadius: 10,
                  padding: "8px 11px",
                  cursor: "pointer",
                  minWidth: 110,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--mono-font)",
                    fontSize: 7,
                    letterSpacing: 1.5,
                    color: isLive ? "#00E676" : "#FF6B00",
                    marginBottom: 3,
                    textTransform: "uppercase",
                  }}
                >
                  🏀 {isLive ? "● LIVE" : g.status}
                </div>

                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}>
                  {away}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>@ {home}</div>

                {isLive && g.awayTeam?.score != null && (
                  <div
                    style={{
                      fontFamily: "var(--mono-font)",
                      fontSize: 11,
                      color: "var(--soft)",
                      marginTop: 2,
                    }}
                  >
                    {g.awayTeam.score}-{g.homeTeam.score}
                  </div>
                )}

                {seriesLabel && (
                  <div
                    style={{
                      fontFamily: "var(--mono-font)",
                      fontSize: 8,
                      color: "#FF6B00",
                      marginTop: 3,
                      letterSpacing: 0.5,
                    }}
                  >
                    {seriesLabel}
                  </div>
                )}
              </div>
            );
          }),

        ...(golfData?.currentEvent?.leaderboard?.length
          ? [
              <div
                key="golf-ticker"
                onClick={goGolf}
                style={{
                  flexShrink: 0,
                  background: "var(--surface)",
                  border: "1px solid rgba(255,255,255,.12)",
                  borderRadius: 10,
                  padding: "8px 11px",
                  cursor: "pointer",
                  minWidth: 165,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--mono-font)",
                    fontSize: 7,
                    letterSpacing: 1.5,
                    color: "rgba(255,255,255,.7)",
                    marginBottom: 4,
                    textTransform: "uppercase",
                  }}
                >
                  ⛳ {golfData.currentEvent.shortName || golfData.currentEvent.name || "PGA TOUR"}
                </div>

                <div
                  style={{
                    fontFamily: "var(--mono-font)",
                    fontSize: 8,
                    color: "var(--muted)",
                    marginBottom: 5,
                    letterSpacing: 1,
                  }}
                >
                  {golfData.currentEvent.round || "IN PROGRESS"}
                </div>

                {golfData.currentEvent.leaderboard.slice(0, 3).map((p, i) => (
                  <div
                    key={`${p.name}-${i}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 11,
                      lineHeight: 1.5,
                      color: i === 0 ? "var(--text)" : "var(--muted)",
                    }}
                  >
                    <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <span
                        style={{
                          fontFamily: "var(--mono-font)",
                          fontSize: 9,
                          color: "var(--muted)",
                          minWidth: 14,
                        }}
                      >
                        {p.position || i + 1}
                      </span>
                      <span style={{ fontWeight: i === 0 ? 700 : 500 }}>
                        {String(p.name || "").split(" ").pop()}
                      </span>
                    </span>

                    <span
                      style={{
                        fontFamily: "var(--mono-font)",
                        color:
                          p.score && String(p.score).startsWith("-")
                            ? "#00E676"
                            : p.score === "E"
                            ? "var(--text)"
                            : "#FF4444",
                      }}
                    >
                      {p.score || "—"}
                    </span>
                  </div>
                ))}
              </div>,
            ]
          : golfData?.currentEvent
          ? [
              <div
                key="golf-ticker"
                onClick={goGolf}
                style={{
                  flexShrink: 0,
                  background: "var(--surface)",
                  border: "1px solid rgba(255,255,255,.12)",
                  borderRadius: 10,
                  padding: "8px 11px",
                  cursor: "pointer",
                  minWidth: 170,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--mono-font)",
                    fontSize: 7,
                    letterSpacing: 1.5,
                    color: "rgba(255,255,255,.7)",
                    marginBottom: 4,
                    textTransform: "uppercase",
                  }}
                >
                  ⛳ {golfData.currentEvent.shortName || golfData.currentEvent.name || "PGA TOUR"}
                </div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>
                  {golfData.currentEvent.course || "Course TBD"}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 9,
                    fontFamily: "var(--mono-font)",
                    color: "rgba(255,255,255,.75)",
                    lineHeight: 1.35,
                    whiteSpace: "pre-line",
                  }}
                >
                  {"Top 3 live scores pending\nFeed has not posted leaderboard yet"}
                </div>
              </div>,
            ]
          : []),

        ...(mlbGames.length > 0 ? mlbGames : (mlbData?.games || []))
          .filter((g) => g.state === "in" || g.state === "pre")
          .slice(0, 2)
          .map((g, i) => {
            const away = g.awayTeam?.abbr || g.awayTeam?.name || "AWAY";
            const home = g.homeTeam?.abbr || g.homeTeam?.name || "HOME";
            const isLive = g.state === "in";

            return (
              <div
                key={`mlb-${i}`}
                onClick={goMlb}
                style={{
                  flexShrink: 0,
                  background: "var(--surface)",
                  border: `1px solid ${isLive ? "rgba(0,230,118,.3)" : "var(--border)"}`,
                  borderRadius: 10,
                  padding: "8px 11px",
                  cursor: "pointer",
                  minWidth: 110,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--mono-font)",
                    fontSize: 7,
                    letterSpacing: 1.5,
                    color: isLive ? "#00E676" : "#1DB954",
                    marginBottom: 3,
                    textTransform: "uppercase",
                  }}
                >
                  ⚾ {isLive ? "● LIVE" : g.status}
                </div>

                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}>
                  {away}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>@ {home}</div>

                {isLive && g.awayTeam?.score != null && (
                  <div
                    style={{
                      fontFamily: "var(--mono-font)",
                      fontSize: 11,
                      color: "var(--soft)",
                      marginTop: 2,
                    }}
                  >
                    {g.awayTeam.score}-{g.homeTeam.score}
                  </div>
                )}
              </div>
            );
          }),

                                ...(f1Data?.schedule?.races?.find((r) => r.is_next)
          ? [
              <div
                key="f1-ticker"
                onClick={goF1}
                style={{
                  flexShrink: 0,
                  background: "rgba(225,6,0,.06)",
                  border: "1px solid rgba(225,6,0,.2)",
                  borderRadius: 10,
                  padding: "8px 11px",
                  cursor: "pointer",
                  minWidth: 110,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--mono-font)",
                    fontSize: 7,
                    letterSpacing: 1.5,
                    color: "#E10600",
                    marginBottom: 3,
                  }}
                >
                  🏎️ F1 NEXT
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", lineHeight: 1.3 }}>
                  {f1Data.schedule.races.find((r) => r.is_next).meeting_name}
                </div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>
                  {(() => {
                    const nextRace = f1Data.schedule.races.find((r) => r.is_next);
                    const raceStart = resolveF1RaceStart(nextRace, f1Data?.sessions || []);
                    const dt = raceStart ? new Date(raceStart) : null;
                    const when = dt
                      ? `${dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" })} ${dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago", timeZoneName: "short" })}`
                      : "Date/Time TBD";
                    return when;
                  })()}
                </div>
              </div>,
                      ]
                                    : [])])}
</div>

            {/* Spotlight cards — tight, sport-colored, edge-focused */}
            {homeCards.map(m=>(
  <div
    key={m.id}
    className="spotlight-card"
    onClick={() => openMatchup(m)}
  >
                <div className="spotlight-top">
                  <span className="spotlight-sport" style={{color:m.leagueColor}}>{m.homeCategory||m.league}</span>
                  <span className="spotlight-time">{m.time}</span>
                </div>
                <div className="spotlight-title">{m.title}</div>
                {m.id?.startsWith("golf-home-leaderboard") && Array.isArray(m.topThree) && m.topThree.length > 0 ? (
                  <div className="spotlight-edge">
                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                      {m.topThree.map((row) => (
                        <div key={`${m.id}-${row.rank}-${row.name}`} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
                          <span style={{fontSize:12,color:"var(--soft)"}}>
                            {row.rank}. {row.name}
                            {row.thru && row.thru !== "—" && row.thru !== "-" ? ` (${row.thru})` : ""}
                          </span>
                          <span style={{fontFamily:"var(--mono-font)",fontSize:12,color:golfScoreColor(row.score)}}>
                            {row.score}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div style={{marginTop:8,fontSize:11,color:"var(--muted)"}}>
                      {m.sourceLine || m.blurb}
                    </div>
                  </div>
                ) : (
                  <div
                    className="spotlight-edge"
                    style={
                      m.id?.startsWith("golf-home-leaderboard") || m.id === "ur-home-tracker"
                        ? { whiteSpace: "pre-line" }
                        : undefined
                    }
                  >
                    {m.blurb}
                  </div>
                )}
              </div>
            ))}

            <div className="page-spacer"/>
          </main>
        )}

        {/* ══ TENNIS ══ */}
        {screen==="tennis"&&(
          <main className={`screen${hasDockedBar ? " has-msgs" : ""}`}>
            <div className="tour-banner">
              <div className="banner-title">{tennisBoardHeadline}</div>
              <div className="banner-sub">{tennisBoardSubline}</div>
              <div className="banner-note">{liveMatches.length>0?`${tennisLiveMatches.length} live · ${tennisUpcomingMatches.length} upcoming${activeTournamentMatches.length?` · ${activeTournamentMatches.length} in active tournament focus`:""}`:"No current matches loaded right now."}</div>
            </div>

            {tennisMsgs.length===0&&(
              <div ref={tennisBarRef} style={{background:"var(--surface)",border:"1px solid rgba(255,230,0,.2)",borderRadius:14,padding:14,marginBottom:16}}>
                <div style={{fontSize:10,color:"#FFE600",fontFamily:"var(--mono-font)",letterSpacing:2,marginBottom:8,textTransform:"uppercase"}}>Ask Anything — Tennis</div>
                <AskBar inputRef={tennisInputRef} value={tennisInput} onChange={setTennisInput} onSubmit={()=>submitTennis()} placeholder="Best tennis bet? Which match is mispriced?" {...askBarCommon} />
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {["Best tennis bet tonight?","Which match is mispriced?","Best live angle?","Best futures value?"].map(q=>(
                    <button key={q} className="quick-btn" onClick={()=>submitTennis(q)} style={{fontSize:11}}>{q}</button>
                  ))}
                </div>
              </div>
            )}

            <ChatThread msgs={tennisMsgs}/>

            <div className="section-divider">{activeTournamentMatches.length>0&&context?.currentTournament?.name?`${context.currentTournament.name} Board`:"Live + Upcoming Matches"}</div>

            {tennisLoading?(
              <div className="loading-state"><div className="loading-text">LOADING TENNIS BOARD...</div></div>
            ):liveMatches.length>0?(
              <div className="matchup-list">
                {(activeTournamentMatches.length>0?activeTournamentMatches:liveMatches).map(m=>(
                  <div key={m.id} className="matchup-card" onClick={()=>openMatchup(m)}>
                    <div className="matchup-top"><div className="matchup-league" style={{color:m.leagueColor}}>{m.league}</div><div className="matchup-time">{String(m?.raw?.live||"0")==="1"?"LIVE":(m.raw?.status||m.time)}</div></div>
                    <div className="matchup-body"><div className="matchup-title">{m.title}</div><div className="matchup-meta">{m.network}{m.raw?.round?` · ${m.raw.round}`:""}</div><div className="matchup-blurb">{m.raw?.score&&m.raw.score!=="-"?`Score: ${m.raw.score}. `:""}{m.blurb}</div></div>
                  </div>
                ))}
                {activeTournamentMatches.length>0&&liveMatches.length>activeTournamentMatches.length&&(
                  <>
                    <div className="section-divider">Other Tour Matches</div>
                    {liveMatches.filter(m=>!activeTournamentMatches.some(x=>x.id===m.id)).map(m=>(
                      <div key={m.id} className="matchup-card" onClick={()=>openMatchup(m)}>
                        <div className="matchup-top"><div className="matchup-league" style={{color:m.leagueColor}}>{m.league}</div><div className="matchup-time">{String(m?.raw?.live||"0")==="1"?"LIVE":(m.raw?.status||m.time)}</div></div>
                        <div className="matchup-body"><div className="matchup-title">{m.title}</div><div className="matchup-meta">{m.network}{m.raw?.round?` · ${m.raw.round}`:""}</div><div className="matchup-blurb">{m.raw?.score&&m.raw.score!=="-"?`Score: ${m.raw.score}. `:""}{m.blurb}</div></div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            ):(
              <div className="loading-state"><div className="loading-text">NO CONFIRMED TENNIS MATCHES FOUND</div></div>
            )}

            {context?.ace_props&&(
              <>
                <div className="section-divider">Prop Guide</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  {Object.entries(context.ace_props).map(([name,data])=>(
                    <div key={name} className="matchup-card" onClick={()=>submitTennis(`Tell me about ${name} ace props right now`)}>
                      <div className="matchup-body"><div className="matchup-title" style={{fontSize:15}}>{name}</div><div className="matchup-meta">ACES</div><div className="matchup-blurb">{data.avg_aces_hard} avg · {data.ace_rate}</div><div className="matchup-blurb" style={{marginTop:6}}>{data.note||""}</div></div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {players&&(
              <>
                <div className="section-divider">ATP Top 25</div>
                {ATP_PLAYERS.map((name,idx)=><TennisPlayerCard key={name} name={name} idx={idx} tour="atp"/>)}
                <div className="section-divider">WTA Top 24</div>
                {WTA_PLAYERS.map((name,idx)=><TennisPlayerCard key={name} name={name} idx={idx} tour="wta"/>)}
              </>
            )}
            <div className="page-spacer"/>
          </main>
        )}

        {/* ══ NFL ══ */}
        {screen==="nfl"&&(
          <main className={`screen${hasDockedBar ? " has-msgs" : ""}`}>
            <div className="nfl-banner">
              <div className="banner-title">{nflSeasonMode?"NFL In-Season Board":"NFL Futures Board"}</div>
              <div className="banner-sub">{nflSeasonMode?"WEEKLY PROPS · USAGE · PLAYER ANGLES":"FUTURES · PLAYER STATS · BETTING ANGLES"}</div>
              <div className="banner-note">{nflSeasonMode?"Current weekly props, role changes, usage shifts, and market edges.":"Skill positions database with per-game stats, TD rates, prop floors and ceilings."}</div>
            </div>
            {nflMsgs.length===0&&(
              <div className="nfl-ask-shell" ref={nflBarRef}>
              <AskBar inputRef={nflInputRef} value={nflInput} onChange={setNflInput} onSubmit={()=>submitNfl()} placeholder={nflSeasonMode?"Best WR prop this week? Biggest role change?":"Which RB leads TDs in 2026? Best future?"} btnColor="#4A90D9" {...askBarCommon} />
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {(nflSeasonMode?["Best WR props this week?","Biggest usage jump?","Best TD scorer angle?","Which line is stale?"]:["Best WR future?","Top TE by volume?","Fade or take Kelce?","Best RB rushing future?"]).map(q=>(
                  <button key={q} className="quick-btn" onClick={()=>submitNfl(q)} style={{fontSize:11}}>{q}</button>
                ))}
              </div>
              </div>
            )}
            <ChatThread msgs={nflMsgs}/>
            <div className="section-divider">{nflSeasonMode?"Top Weekly Leans":"Top Future Leans"}</div>
            <NflPropGuideSection
              guide={NFL_PROP_GUIDE}
              onSelectProp={(prop) =>
                submitNfl(`Tell me about ${prop.player} ${prop.propType} prop — line is ${prop.line}`)
              }
            />
            <div className="section-divider">Player Database</div>
            <div className="pos-tabs">{NFL_POSITIONS.map(pos=><button key={pos} className={`pos-tab${nflPosFilter===pos?" active":""}`} onClick={()=>setNflPosFilter(pos)}>{pos}</button>)}</div>
            {filteredNflPlayers.map(([name,player])=><NflPlayerCard key={name} name={name} player={player}/>)}
            <div className="page-spacer"/>
          </main>
        )}

        {/* ══ NFL PLAYER DETAIL ══ */}
        {screen==="nflplayer"&&nflPd&&(
          <main className={`screen${hasDockedBar ? " has-msgs" : ""}`}>
            <button className="detail-back" onClick={()=>{setScreen("nfl");setSelectedNflPlayer(null);}}>← BACK</button>
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
          <main className={`screen${hasDockedBar ? " has-msgs" : ""}`}>
            <div className="f1-banner">
              <div className="banner-title">Formula 1 — 2026</div>
              <div className="banner-sub">DRIVER STANDINGS · RACE CALENDAR · BETTING ANGLES</div>
              <div className="banner-note">{f1Data?.standings?.length ? `${f1Data.standings.length} drivers · ${f1Data.schedule?.races?.length||0} races` : "Loading F1 data..."}</div>
            </div>

            {f1Msgs.length===0&&(
              <div className="f1-ask-shell" ref={f1BarRef}>
                <div className="f1-ask-label">Ask Anything — F1</div>
                <AskBar inputRef={f1InputRef} value={f1Input} onChange={setF1Input} onSubmit={()=>submitF1()} placeholder="Who wins the next Grand Prix? Best F1 future?" btnColor="var(--f1)" {...askBarCommon} />
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {["Who wins the next Grand Prix?","Best F1 future right now?","Is Antonelli for real?","Hamilton podium value?"].map(q=>(
                    <button key={q} className="quick-btn" onClick={()=>submitF1(q)} style={{fontSize:11}}>{q}</button>
                  ))}
                </div>
              </div>
            )}
            <ChatThread msgs={f1Msgs}/>

            {f1Loading ? (
              <div className="loading-state"><div className="loading-text">LOADING F1 DATA...</div></div>
            ) : (
              <>
                {f1Data?.standings?.length > 0 && (
                  <>
                    <div className="section-divider">Driver Standings</div>
                    {f1Data.standings.map((d,i) => (
                      <div key={d.driver_number||i} className="f1-standing-card" onClick={()=>submitF1(`Tell me about ${d.full_name||d.name_acronym} — form, pace, and best betting angle`)}>
                        <div className="f1-pos">P{d.position||i+1}</div>
                        <div style={{width:4,height:30,borderRadius:2,background:`#${d.team_colour||'666'}`,flexShrink:0}}/>
                        <div className="f1-driver-info">
                          <div className="f1-driver-name">{d.full_name||d.name_acronym||`#${d.driver_number}`}</div>
                          <div className="f1-driver-team">{d.team_name||"—"}</div>
                        </div>
                        <div className="f1-pts"><span className="f1-pts-num">{d.points ?? "—"}</span><span className="f1-pts-label">PTS</span></div>
                      </div>
                    ))}
                  </>
                )}

                {f1Data?.schedule?.races?.length > 0 && (
                  <>
                    <div className="section-divider">Race Calendar</div>
                    {f1Data.schedule.races.filter(r => r.is_next || new Date(r.race_date || r.date_end) >= new Date(Date.now() - 7*86400000)).slice(0,10).map(race => {
                      const raceStart = resolveF1RaceStart(race, f1Data?.sessions || []);
                      const d = raceStart ? new Date(raceStart) : null;
                      const dateStr = d ? d.toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "";
                      return (
                        <div key={race.meeting_key} className={`f1-race-card${race.is_next?" next-race":""}`}>
                          <div className="f1-race-top">
                            <div className="f1-race-name">{race.meeting_name}</div>
                            <div>{race.is_next && <span className="f1-race-badge">NEXT</span>}</div>
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <div className="f1-race-location">{race.location} · {race.circuit_short_name}</div>
                            <div className="f1-race-date">{dateStr}</div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
            <div className="page-spacer"/>
          </main>
        )}

        {/* ══ NBA ══ */}
        {screen==="nba"&&(
          <main className={`screen${hasDockedBar ? " has-msgs" : ""}`}>
            <div className="nba-banner">
              <div className="banner-title">NBA</div>
              <div className="banner-sub">PLAYER PROPS · GAME TOTALS · BETTING ANGLES</div>
              <div className="banner-note">
                {nbaGames.length > 0
                  ? `${nbaGames.filter(g=>g.state==="in").length > 0 ? nbaGames.filter(g=>g.state==="in").length + " live · " : ""}${nbaGames.length} games today`
                  : nbaLoading ? "Loading..." : "Ask anything about NBA props"}
              </div>
            </div>

            {nbaMsgs.length===0&&(
              <div className="nba-ask-shell" ref={nbaBarRef}>
              <AskBar inputRef={nbaInputRef} value={nbaInput} onChange={setNbaInput} onSubmit={()=>submitNba()} placeholder="Jokic PRA over tonight? Best prop this slate?" btnColor="var(--nba)" {...askBarCommon} />
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {["Best prop on tonight's slate?","Safest PRA bet tonight?","Who has a usage spike today?","Best game total play?"].map(q=>(
                  <button key={q} className="quick-btn" onClick={()=>submitNba(q)} style={{fontSize:11}}>{q}</button>
                ))}
              </div>
              </div>
            )}

            <ChatThread msgs={nbaMsgs}/>

            {nbaLoading ? (
              <div className="loading-state"><div className="loading-text">LOADING NBA DATA...</div></div>
            ) : (
              <>
                {nbaGames.length > 0 && (
                  <>
                    <div className="section-divider">
                      {nbaGames.filter(g=>g.state==="in").length > 0 ? "🔴 Live Games" : "Today's Games"}
                    </div>
                    {nbaGames.map((g,i) => {
                      const away = g.awayTeam?.abbr || g.awayTeam?.name || "Away";
                      const home = g.homeTeam?.abbr || g.homeTeam?.name || "Home";
                      const isLive = g.state === "in";
                      const isFinal = g.state === "post";
                      return (
                        <div key={g.id||i} className="nba-game-card" onClick={()=>submitNba(`Best prop angle for ${away} vs ${home} tonight?`)}>
                          <div className="nba-game-top">
                            <div className="nba-game-teams">{away} vs {home}</div>
                            <div>{isLive ? <span className="nba-live-badge">● LIVE</span> : <span className="nba-game-status">{isFinal ? "FINAL" : g.status}</span>}</div>
                          </div>
                          {(isLive || isFinal) && g.awayTeam?.score != null && (
                            <div className="nba-game-score">{g.awayTeam.score} — {g.homeTeam.score}</div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}

                <div className="section-divider">Quick Prop Angles</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"0 0 12px"}}>
                  {[
                    ["Best PRA bet tonight?", "Who has the highest floor PRA on tonight's slate? Give me floor, ceiling, and lean."],
                    ["Best 3PM prop?", "Who should I bet OVER on 3-pointers made tonight? Give me the play with volume and efficiency context."],
                    ["Injury replacement edge?", "Who has a usage spike tonight due to injury? Find the replacement play with the best prop value."],
                    ["Best game total?", "Which game total on tonight's slate has the sharpest OVER or UNDER? Give me the pace matchup and lean."],
                    ["Safest prop tonight?", "What is the single safest, highest-confidence NBA prop on tonight's slate? One play, full reasoning."],
                    ["Best points prop?", "Who has the best points OVER tonight? Give me the matchup, defensive ranking they're facing, and lean."],
                  ].map(([label, q]) => (
                    <button key={label} className="quick-btn" onClick={()=>submitNba(q)} style={{fontSize:11}}>{label}</button>
                  ))}
                </div>

                <div className="section-divider">Ask About Any Player</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"0 0 8px"}}>
                  {["Jokic","SGA","Luka","Tatum","Giannis","Wembanyama","Brunson","Edwards","KAT","Curry","Haliburton","Mitchell","KD","Booker","Ja Morant"].map(name => (
                    <button key={name} className="quick-btn" onClick={()=>submitNba(`Best prop angle for ${name} tonight? PRA line, floor, ceiling, and lean.`)} style={{fontSize:11}}>{name}</button>
                  ))}
                </div>
              </>
            )}
            <div className="page-spacer"/>
          </main>
        )}

        {/* ══ MLB ══ */}
        {screen==="mlb"&&(
          <main className={`screen${hasDockedBar ? " has-msgs" : ""}`}>
            <div style={{borderRadius:16,padding:16,marginBottom:16,border:"1px solid rgba(29,185,84,.2)",background:"linear-gradient(135deg,rgba(29,185,84,.08),rgba(0,100,40,.04))"}}>
              <div style={{fontFamily:"var(--display-font)",fontSize:28,letterSpacing:1,marginBottom:2}}>MLB</div>
              <div style={{fontFamily:"var(--mono-font)",fontSize:9,color:"var(--muted)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>PROPS / GAME TOTALS / PITCHER ANGLES</div>
              <div style={{fontSize:12,color:"var(--soft)"}}>
                {mlbLoading ? "Loading..." : mlbGames.length > 0 ? `${mlbGames.length} games today` : (mlbData?.games?.length > 0) ? `${mlbData.games.length} games today` : "MLB Season Active — Ask about any game or player"}
              </div>
            </div>

            {mlbMsgs.length===0&&(
              <div style={{background:"var(--surface)",border:"1px solid rgba(29,185,84,.2)",borderRadius:14,padding:14,marginBottom:16}} ref={mlbBarRef}>
                <div style={{fontFamily:"var(--mono-font)",fontSize:10,color:"#1DB954",letterSpacing:2,marginBottom:8,textTransform:"uppercase"}}>Ask Anything -- MLB</div>
                <AskBar inputRef={mlbInputRef} value={mlbInput} onChange={setMlbInput} onSubmit={()=>submitMlb()} placeholder="Best K prop tonight? Park factor angle? Best game total?" btnColor="#1DB954" {...askBarCommon}/>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
                  {["Best pitcher K prop?","Best batter hits prop?","Best game total?","Best home run prop?"].map(q=>(
                    <button key={q} className="quick-btn" onClick={()=>submitMlb(q)} style={{fontSize:11}}>{q}</button>
                  ))}
                </div>
              </div>
            )}

            <ChatThread msgs={mlbMsgs}/>

            {mlbLoading && mlbGames.length === 0 ? (
              <div className="loading-state"><div className="loading-text">LOADING MLB DATA...</div></div>
            ) : (
              <>
                {(mlbGames.length > 0 || mlbData?.games?.length > 0) && (
                  <>
                    {(()=>{
                      const src = mlbGames.length > 0 ? mlbGames : (mlbData?.games||[]);
                      const liveCount = src.filter(g=>g.state==="in").length;
                      const finalCount = src.filter(g=>g.state==="post").length;
                      const preCount = src.filter(g=>g.state==="pre").length;
                      return <div className="section-divider">{liveCount>0?`${liveCount} Live`:""}{liveCount>0&&(finalCount+preCount>0)?" · ":""}{finalCount>0?`${finalCount} Final`:""}{preCount>0&&(liveCount+finalCount>0)?" · ":""}{preCount>0?`${preCount} Upcoming`:""}</div>;
                    })()}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:4}}>
                    {(mlbGames.length > 0 ? mlbGames : (mlbData?.games || [])).map((g,i) => {
                      const away = g.awayTeam;
                      const home = g.homeTeam;
                      const isLive = g.state === "in";
                      const isFinal = g.state === "post";
                      const isPre = g.state === "pre";
                      const matchupStr = `${away.abbr||away.name} @ ${home.abbr||home.name}`;
                      return (
                        <div key={g.id||i} style={{
                          background:"var(--surface)",
                          border:`1px solid ${isLive?"rgba(0,230,118,.3)":"var(--border)"}`,
                          borderRadius:10,padding:"9px 10px",cursor:"pointer",transition:"border-color .15s",
                        }} onClick={()=>submitMlb(`Best prop angle for ${matchupStr} today? Give me the sharpest K prop, game total lean, and best batter play.`)}>
                          <div style={{fontFamily:"var(--mono-font)",fontSize:7,letterSpacing:1.5,marginBottom:4,
                            color:isLive?"#00E676":isFinal?"var(--muted)":"#1DB954"}}>
                            {isLive?"● LIVE":isFinal?"FINAL":g.status?.replace(" ET","ET")||""}
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                            <div>
                              <div style={{fontSize:13,fontWeight:700,color:"var(--text)",lineHeight:1.15}}>{away.abbr||away.name}</div>
                              <div style={{fontSize:11,color:"var(--muted)",lineHeight:1.15}}>@ {home.abbr||home.name}</div>
                            </div>
                            {(isLive||isFinal) && away.score!=null ? (
                              <div style={{fontFamily:"var(--mono-font)",textAlign:"right"}}>
                                <div style={{fontSize:14,fontWeight:700,color:isLive?"var(--text)":"var(--soft)",lineHeight:1.15}}>{away.score}</div>
                                <div style={{fontSize:14,fontWeight:700,color:isLive?"var(--text)":"var(--soft)",lineHeight:1.15}}>{home.score}</div>
                              </div>
                            ) : (
                              <div style={{fontSize:9,fontFamily:"var(--mono-font)",color:"var(--muted)",textAlign:"right",lineHeight:1.4}}>
                                TAP<br/>ANGLE
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </>
                )}
                <div className="section-divider">Quick Prop Angles</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"0 0 12px"}}>
                  {[
                    ["Best K prop?","Who is the best pitcher strikeout OVER tonight? K/9, opposing lineup, confidence."],
                    ["Best hits prop?","Best batter hits OVER tonight? Batting average, pitcher ERA, park factor."],
                    ["Best game total?","Which MLB game total has the sharpest angle tonight? Run environment and lean."],
                    ["Best HR prop?","Best home run prop tonight? Barrel rate, launch angle, pitcher HR/FB rate."],
                    ["Park factor edge?","Which game tonight has the biggest park factor edge? Coors, Petco, extreme parks."],
                    ["Best SGP?","Build the sharpest MLB same game parlay tonight. Pitcher K over + batter prop."],
                  ].map(([label,q]) => (
                    <button key={label} className="quick-btn" onClick={()=>submitMlb(q)} style={{fontSize:11}}>{label}</button>
                  ))}
                </div>
                <div className="section-divider">Ask About Any Player</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"0 0 8px"}}>
                  {["Ohtani","Judge","Freeman","Betts","Acuna","Lindor","Seager","Harper","Guerrero","Ramirez","J. Rodriguez","Carroll","Henderson","Pete Alonso","Corbin Burnes","Zack Wheeler","Paul Skenes","Hunter Greene"].map(name => (
                    <button key={name} className="quick-btn" onClick={()=>submitMlb(`Best prop angle for ${name} today? Line, floor, ceiling, and lean.`)} style={{fontSize:11}}>{name}</button>
                  ))}
                </div>
              </>
            )}
            <div className="page-spacer"/>
          </main>
        )}


        {/* ══ GOLF ══ */}
        {screen==="golf"&&(
          <main className={`screen${hasDockedBar ? " has-msgs" : ""}`}>
            <div className="golf-banner">
              <div style={{fontFamily:"var(--display-font)",fontSize:28,letterSpacing:1,marginBottom:2}}>{golfData?.currentEvent?.name||"PGA TOUR"}</div>
              <div style={{fontFamily:"var(--mono-font)",fontSize:9,color:"var(--muted)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>OUTRIGHTS / PROPS / MATCHUP EDGES</div>
              <div style={{fontSize:12,color:"var(--soft)"}}>
                {golfLoading
  ? "Loading..."
  : golfData?.currentEvent?.course
    ? `${golfData.currentEvent.course} — ${golfData.currentEvent.round || "Live"}`
    : "Ask about any player, tournament, or prop"}
              </div>
            </div>

            {golfMsgs.length===0&&(
              <div className="golf-ask-shell" ref={golfBarRef}>
                <div className="golf-ask-label">Ask Anything — Golf</div>
                <AskBar inputRef={golfInputRef} value={golfInput} onChange={setGolfInput} onSubmit={()=>submitGolf()} placeholder="Scheffler top 5? Best make-cut play? Matchup angle?" btnColor="#DCE6F2" {...askBarCommon}/>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
                  {["Best outright value?","Safest make-cut play?","Best top-10 play?","Best matchup H2H?"].map(q=>(
                    <button key={q} className="quick-btn" onClick={()=>submitGolf(q)} style={{fontSize:11}}>{q}</button>
                  ))}
                </div>
              </div>
            )}

            <ChatThread msgs={golfMsgs}/>

            {/* Live leaderboard — full field (scroll); same list is sent to /api/ur-take as golfContext */}
            {golfData?.currentEvent?.leaderboard?.length > 0 && (
              <>
                <div className="section-divider">
                  {golfData.currentEvent.name} — {golfData.currentEvent.round}
                  <span style={{ fontFamily: "var(--mono-font)", fontSize: 9, color: "var(--muted)", marginLeft: 8 }}>
                    {golfData.currentEvent.leaderboard.length} players
                  </span>
                </div>
                <div style={{ maxHeight: "min(70vh, 520px)", overflowY: "auto", WebkitOverflowScrolling: "touch", paddingRight: 4 }}>
                  {golfData.currentEvent.leaderboard.map((player, i) => (
                    <div key={`${player.name}-${i}`} className="golf-leaderboard-card" onClick={()=>submitGolf(`Best betting angle on ${player.name} right now? Outright, top-10, or matchup?`)}>
                      <div className="golf-pos">{player.position||i+1}</div>
                      <div className="golf-player-info">
                        <div className="golf-player-name">{player.name}</div>
                        <div className="golf-player-country">{player.country}</div>
                      </div>
                      <div className="golf-score">
                        <span className="golf-score-num" style={{color:player.score&&player.score.startsWith("-")?"#00E676":player.score==="E"?"var(--text)":"#FF4444"}}>{player.score||"—"}</span>
                        <span className="golf-score-label">{player.thru&&player.thru!=="—"?`THRU ${player.thru}`:""}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Outright odds */}
            {golfData?.odds?.outrights?.length > 0 && (
              <>
                <div className="section-divider">Outright Odds — This Week</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
                  {golfData.odds.outrights.slice(0,20).map((o,i)=>(
                    <div key={i} className="golf-odds-card" onClick={()=>submitGolf(`Best angle on ${o.player}? Outright, top 10, or matchup — give me the sharpest play.`)}>
                      <div style={{fontSize:13,color:"var(--text)",fontWeight:600}}>{o.player}</div>
                      <div className="golf-player-odds">{o.odds>0?"+":""}{o.odds}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="section-divider">Quick Angles</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"0 0 12px"}}>
              {[
                ["Best outright value?","Who has the best outright value at this week's PGA Tour event? Consider field strength, course fit, and SG profile."],
                ["Best top-10 play?","Who is the best top-10 bet at this week's PGA Tour event? Give me the highest-confidence play with reasoning."],
                ["Safest make-cut?","Who is the safest make-cut bet at this week's event? Prioritize players with 80%+ cut-making history and good current form."],
                ["Best matchup H2H?","Build the sharpest head-to-head matchup play at this week's event. Consider SG splits and course fit."],
                ["Best FRL play?","Who is the best first round leader bet? Consider power players, morning draws, and current form."],
                ["Who to fade?","Who should I fade this week? Tell me the player overpriced relative to their SG profile and course fit."],
              ].map(([label,prompt])=>(
                <button key={label} className="quick-btn" onClick={()=>submitGolf(prompt)} style={{fontSize:11}}>{label}</button>
              ))}
            </div>

            <div className="section-divider">Ask About Any Player</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"0 0 8px"}}>
              {["Scheffler","Rory","Schauffele","Morikawa","Hovland","Cantlay","Rahm","Ludvig Aberg","Tom Kim","Spieth","JT","Fleetwood","Fitzpatrick","Hatton","Lowry","Matsuyama","Brian Harman","Cameron Young","Wyndham Clark","Sahith Theegala"].map(name=>(
                <button key={name} className="quick-btn" onClick={()=>submitGolf(`Best betting angle for ${name} this week? Top 10, matchup, outright, or make cut?`)} style={{fontSize:11}}>{name}</button>
              ))}
            </div>

            <div className="page-spacer"/>
          </main>
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

    {/* Performance panel */}
    <div style={proMarketing.perfPanel}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,gap:10}}>
        <div>
          <div style={{fontFamily:"var(--mono-font)",fontSize:10,color:"var(--cyan-bright)",letterSpacing:2,textTransform:"uppercase"}}>Under Review Record</div>
          <div style={{fontSize:12,color:"var(--muted)",lineHeight:1.45}}>
            What UR TAKE told you — and how it aged. Takes are saved from each answer&apos;s THE PLAY line; no manual logging.
          </div>
          <div style={{fontSize:11,color:"var(--muted)",lineHeight:1.45,marginTop:6,opacity:.93}}>
            <strong style={{fontWeight:600,color:"var(--soft)"}}>Waiting</strong> = saved play, waiting for a result we can grade.&nbsp;
            <strong style={{fontWeight:600,color:"var(--soft)"}}>Tracked</strong> = saved for your history; auto-grading isn&apos;t wired for that market yet.&nbsp;
            NBA/MLB team ML and tennis match winners (parsed from THE PLAY) settle automatically when finals data is available.
          </div>
        </div>
        <button
          className="quick-btn"
          onClick={()=>loadPerformanceSnapshot()}
          style={{fontSize:10,padding:"7px 10px"}}
          disabled={performanceLoading}
        >
          {performanceLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {!userEmail ? (
        <div style={{fontSize:12,color:"var(--muted)"}}>Set your email to enable tracked performance history.</div>
      ) : performanceError ? (
        <div style={{fontSize:12,color:"#FF6B6B"}}>{performanceError}</div>
      ) : !performanceData ? (
        <div style={{fontSize:12,color:"var(--muted)"}}>{performanceLoading ? "Loading performance..." : "No performance data yet."}</div>
      ) : (
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,minmax(0,1fr))",gap:6,marginBottom:10}}>
            <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,padding:"8px 6px"}}>
              <div style={{fontFamily:"var(--mono-font)",fontSize:7,color:"var(--muted)",letterSpacing:0.5,textTransform:"uppercase"}}>Settled</div>
              <div style={{fontSize:15,fontWeight:700,color:"var(--text)"}}>{performanceData.summary?.settled || 0}</div>
            </div>
            <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,padding:"8px 6px"}}>
              <div style={{fontFamily:"var(--mono-font)",fontSize:7,color:"var(--muted)",letterSpacing:0.5,textTransform:"uppercase"}}>Waiting</div>
              <div style={{fontSize:15,fontWeight:700,color:"var(--text)"}}>{performanceData.summary?.pending || 0}</div>
            </div>
            <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,padding:"8px 6px"}}>
              <div style={{fontFamily:"var(--mono-font)",fontSize:7,color:"var(--muted)",letterSpacing:0.5,textTransform:"uppercase"}}>Tracked</div>
              <div style={{fontSize:15,fontWeight:700,color:"var(--text)"}}>{performanceData.summary?.tracked ?? performanceData.summary?.ungraded ?? 0}</div>
            </div>
            <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,padding:"8px 6px"}}>
              <div style={{fontFamily:"var(--mono-font)",fontSize:7,color:"var(--muted)",letterSpacing:0.5,textTransform:"uppercase"}}>Win %</div>
              <div style={{fontSize:15,fontWeight:700,color:"var(--text)"}}>{Math.round((performanceData.summary?.winRate || 0) * 100)}%</div>
            </div>
            <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,padding:"8px 6px"}}>
              <div style={{fontFamily:"var(--mono-font)",fontSize:7,color:"var(--muted)",letterSpacing:0.5,textTransform:"uppercase"}}>ROI</div>
              <div style={{fontSize:15,fontWeight:700,color:(performanceData.summary?.roiUnits || 0) >= 0 ? "#00E676" : "#FF6B6B"}}>
                {(performanceData.summary?.roiUnits || 0) > 0 ? "+" : ""}{performanceData.summary?.roiUnits || 0}u
              </div>
            </div>
            <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,padding:"8px 6px"}}>
              <div style={{fontFamily:"var(--mono-font)",fontSize:7,color:"var(--muted)",letterSpacing:0.5,textTransform:"uppercase"}}>Wins</div>
              <div style={{fontSize:15,fontWeight:700,color:"var(--text)"}}>{performanceData.summary?.wins || 0}</div>
            </div>
            <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,padding:"8px 6px"}}>
              <div style={{fontFamily:"var(--mono-font)",fontSize:7,color:"var(--muted)",letterSpacing:0.5,textTransform:"uppercase"}}>Losses</div>
              <div style={{fontSize:15,fontWeight:700,color:"var(--text)"}}>{performanceData.summary?.losses || 0}</div>
            </div>
          </div>

          <div style={{fontFamily:"var(--mono-font)",fontSize:9,letterSpacing:1,color:"var(--muted)",marginBottom:6,textTransform:"uppercase"}}>
            Recent Takes
          </div>
          <div style={{display:"grid",gap:6}}>
            {(performanceData.recent || []).slice(0, 6).map((take) => {
              const st = take.status === "ungraded" ? "tracked" : take.status;
              const badge =
                st === "settled"
                  ? String(take.result || "settled").toUpperCase()
                  : st === "pending"
                    ? "WAITING"
                    : "TRACKED";
              const badgeColor =
                st === "settled"
                  ? take.result === "win"
                    ? "#00E676"
                    : take.result === "loss"
                      ? "#FF6B6B"
                      : "#FFD166"
                  : st === "pending"
                    ? "var(--cyan-bright)"
                    : "var(--muted)";
              const metaLine =
                st === "settled"
                  ? [take.gradingNote].filter(Boolean).join("")
                  : st === "pending"
                    ? "Waiting for final result."
                    : take.gradingNote || "Saved — grading not enabled for this market yet.";
              return (
              <div key={take.id} style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,padding:"8px 10px"}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}>
                  <div style={{fontSize:12,color:"var(--text)",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{take.playLine || "Take recorded"}</div>
                  <div style={{fontFamily:"var(--mono-font)",fontSize:9,color:badgeColor,letterSpacing:1,textTransform:"uppercase",flexShrink:0}}>
                    {badge}
                  </div>
                </div>
                <div style={{fontSize:10,color:"var(--muted)",marginTop:3,lineHeight:1.35}}>
                  {(take.sport || "GENERIC").toUpperCase()} · {take.confidence || "Unspecified"}
                  {metaLine ? ` · ${metaLine}` : ""}
                </div>
              </div>
            );
            })}
            {(!performanceData.recent || performanceData.recent.length === 0) && (
              <div style={{fontSize:12,color:"var(--muted)"}}>No takes logged yet. Ask for a play and it will appear here.</div>
            )}
          </div>
        </>
      )}
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
          <main className={`screen${hasDockedBar ? " has-msgs" : ""}`}>
            <button className="detail-back" onClick={()=>{setSelectedMatchup(null);setScreen(selectedMatchup?.league?.includes("NFL")?"nfl":"tennis");}}>← BACK</button>
            <div className="detail-card">
              <div className="detail-head"><div className="detail-league" style={{color:selectedMatchup.leagueColor}}>{selectedMatchup.league}</div><div className="detail-title">{selectedMatchup.title}</div><div className="detail-sub">{selectedMatchup.time} · {selectedMatchup.network}</div></div>
              <div className="what-matters"><div className="wm-label">Match Snapshot</div><div className="wm-text">{selectedMatchup.whatMatters||"Ask for the side, total, props, or live angle."}</div></div>
              {selectedMatchup.stats&&<div className="mini-grid">{selectedMatchup.stats.map(s=><div key={s.label} className="mini-stat"><div className="mini-label">{s.label}</div><div className="mini-value">{s.value}</div></div>)}</div>}
              {selectedMatchup.quickHitters&&<div className="quick-hitters">{selectedMatchup.quickHitters.map(q=><button key={q} className="quick-btn" onClick={()=>submitMatchup(q)}>{q}</button>)}</div>}
            </div>
            <ChatThread msgs={matchupMsgs}/>
            <AskBar inputRef={matchupInputRef} value={matchupInput} onChange={setMatchupInput} onSubmit={()=>submitMatchup()} placeholder={`Ask about ${selectedMatchup.title}...`} {...askBarCommon}/>
          </main>
        )}

        {/* ══ TENNIS PLAYER DETAIL ══ */}
        {screen==="player"&&pd&&(
          <main className={`screen${hasDockedBar ? " has-msgs" : ""}`}>
            <button className="detail-back" onClick={()=>setScreen("tennis")}>← BACK</button>
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
          <main className={`screen${hasDockedBar ? " has-msgs" : ""}`}>
            <section className="hero" style={{paddingTop:4}}><div className="hero-title">UR TAKE</div><div className="hero-sub">Ask in plain English. Paste a screenshot. Get weirdly specific.</div></section>
            <AskBar inputRef={askInputRef} value={askInput} onChange={setAskInput} onSubmit={submitAsk} placeholder="What do you want to know?" {...askBarCommon}/>
            <div ref={askBarBottomRef} style={{height:1}}/>
            {askMsgs.length===0?(
              <section className="section"><div className="section-label">TRY ONE</div><div className="q-list">{dynamicHomeQuestions.map(q=><button key={q.id} className="q-card" onClick={()=>firePrompt(q.prompt, q.sportHint || null)}><div className="q-top"><div className="q-accent" style={{background:q.color}}/><div className="q-text">{q.text}</div></div></button>)}</div></section>
            ):(
              <ChatThread msgs={askMsgs}/>
            )}
          </main>
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
          <button className={`nav-btn pro-active`} onClick={goPro}><span>Pro</span></button>
        </nav>

      </div>
    </>
  );
}
