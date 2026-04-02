import { useState, useCallback, useMemo } from "react";
import useTennisBoard from "./hooks/useTennisBoard";
import useImagePaste from "./hooks/useImagePaste";
import useAskEngine from "./hooks/useAskEngine";

import HomeScreen    from "./screens/HomeScreen";
import TennisScreen  from "./screens/TennisScreen";
import NflScreen     from "./screens/NflScreen";
import AskScreen     from "./screens/AskScreen";
import MatchupScreen from "./screens/MatchupScreen";
import PlayerScreen  from "./screens/PlayerScreen";
import NflPlayerScreen from "./screens/NflPlayerScreen";
import ProScreen     from "./screens/ProScreen";

import NavIcon from "./components/NavIcon";
import { preferredTournamentScore, getDaypartLabel, isNflInSeason } from "./lib/tennis";

export default function App() {

  // ── Navigation ───────────────────────────────────────────────────────────
  const [tab,    setTab]    = useState("home");
  const [screen, setScreen] = useState("home");
  const [selectedMatchup,        setSelectedMatchup]        = useState(null);
  const [selectedPlayerName,     setSelectedPlayerName]     = useState(null);
  const [selectedNflPlayerName,  setSelectedNflPlayerName]  = useState(null);

  // ── Per-screen inputs — never shared, prevents the 1-char typing bug ─────
  const [homeInput,    setHomeInput]    = useState("");
  const [askInput,     setAskInput]     = useState("");
  const [tennisInput,  setTennisInput]  = useState("");
  const [nflInput,     setNflInput]     = useState("");
  const [matchupInput, setMatchupInput] = useState("");
  const [nflPosFilter, setNflPosFilter] = useState("ALL");

  // ── Per-screen message threads ───────────────────────────────────────────
  const [askMsgs,     setAskMsgs]     = useState([]);
  const [tennisMsgs,  setTennisMsgs]  = useState([]);
  const [nflMsgs,     setNflMsgs]     = useState([]);
  const [matchupMsgs, setMatchupMsgs] = useState([]);

  // ── Data hooks ───────────────────────────────────────────────────────────
  const tennis = useTennisBoard();
  const image  = useImagePaste();
  const { isAsking, askUrTake } = useAskEngine({
    players:     tennis.players,
    context:     tennis.context,
    liveMatches: tennis.liveMatches,
    clearImage:  image.clearImage,
  });

  // Spread once — passed to every screen that has an AskBar
  const imageProps = {
    pastedImage:      image.pastedImage,
    clearImage:       image.clearImage,
    processImageFile: image.processImageFile,
    fileInputRef:     image.fileInputRef,
    isAsking,
  };

  // ── Nav helpers ──────────────────────────────────────────────────────────
  const goHome   = useCallback(() => { setTab("home");   setScreen("home");   setSelectedMatchup(null); }, []);
  const goTennis = useCallback(() => { setTab("tennis"); setScreen("tennis"); }, []);
  const goNfl    = useCallback(() => { setTab("nfl");    setScreen("nfl");    }, []);
  const goAsk    = useCallback(() => { setTab("ask");    setScreen("ask");    }, []);
  const goPro    = useCallback(() => { setTab("pro");    setScreen("pro");    }, []);

  const openMatchup = useCallback((m) => {
    if (!m?.title) return;
    setSelectedMatchup(m);
    setMatchupMsgs([]);
    setMatchupInput("");
    setScreen("matchup");
    setTab(m?.league?.includes("NFL") ? "nfl" : "tennis");
  }, []);

  const openPlayer = useCallback((name) => {
    setSelectedPlayerName(name);
    setScreen("player");
    setTab("tennis");
  }, []);

  const openNflPlayer = useCallback((name) => {
    setSelectedNflPlayerName(name);
    setScreen("nflplayer");
    setTab("nfl");
  }, []);

  // ── Submit handlers ──────────────────────────────────────────────────────
  const submitHome = useCallback(() => {
    const t = homeInput.trim();
    if (!t || isAsking) return;
    setHomeInput(""); setAskInput("");
    setTab("ask"); setScreen("ask");
    askUrTake({ text: t, setMsgs: setAskMsgs, pastedImage: image.pastedImage });
  }, [askUrTake, homeInput, image.pastedImage, isAsking]);

  const submitAsk = useCallback(() => {
    const t = askInput.trim();
    if (!t || isAsking) return;
    setAskInput("");
    askUrTake({ text: t, setMsgs: setAskMsgs, pastedImage: image.pastedImage });
  }, [askInput, askUrTake, image.pastedImage, isAsking]);

  const submitTennis = useCallback((forced) => {
    const t = (forced ?? tennisInput).trim();
    if (!t || isAsking) return;
    if (!forced) setTennisInput("");
    askUrTake({ text: t, setMsgs: setTennisMsgs, sportHint: "tennis", pastedImage: image.pastedImage });
  }, [askUrTake, image.pastedImage, isAsking, tennisInput]);

  const submitNfl = useCallback((forced) => {
    const t = (forced ?? nflInput).trim();
    if (!t || isAsking) return;
    if (!forced) setNflInput("");
    askUrTake({ text: t, setMsgs: setNflMsgs, sportHint: "nfl", pastedImage: image.pastedImage });
  }, [askUrTake, image.pastedImage, isAsking, nflInput]);

  const submitMatchup = useCallback((forced) => {
    const t = (forced ?? matchupInput).trim();
    if (!t || isAsking) return;
    if (!forced) setMatchupInput("");
    const hint = selectedMatchup?.league?.includes("NFL") ? "nfl" : "tennis";
    askUrTake({ text: t, matchup: selectedMatchup, setMsgs: setMatchupMsgs, sportHint: hint, pastedImage: image.pastedImage });
  }, [askUrTake, image.pastedImage, isAsking, matchupInput, selectedMatchup]);

  const firePrompt = useCallback((prompt) => {
    setTab("ask"); setScreen("ask"); setAskInput("");
    askUrTake({ text: prompt, setMsgs: setAskMsgs, pastedImage: image.pastedImage });
  }, [askUrTake, image.pastedImage]);

  // ── Dynamic trending questions (used by Home + Ask screens) ─────────────
  const dynamicQuestions = useMemo(() => {
    const { liveMatches, context } = tennis;
    const prompts = []; const used = new Set();
    const daypart = getDaypartLabel();
    const push = (item) => { if (!item || used.has(item.text)) return; used.add(item.text); prompts.push(item); };

    const active   = liveMatches.filter(m => preferredTournamentScore(m, context) > 0);
    const live     = liveMatches.filter(m => String(m?.raw?.live || "0") === "1");
    const upcoming = liveMatches.filter(m => String(m?.raw?.live || "0") !== "1");
    const prefLive     = active.find(m => String(m?.raw?.live || "0") === "1") || live[0];
    const prefUpcoming = active.find(m => String(m?.raw?.live || "0") !== "1") || upcoming[0];

    if (prefLive) {
      const label = `${prefLive.raw?.home || ""} vs ${prefLive.raw?.away || ""}`;
      push({ id:"q1", color: prefLive.league === "WTA" ? "#E11D48" : "#0891B2",
        text: `Best live angle for ${label}?`,
        prompt: `What is the best live betting angle for ${label} right now? Give me the strongest side, total, and any prop edge.` });
    }
    if (prefUpcoming) {
      const label = `${prefUpcoming.raw?.home || ""} vs ${prefUpcoming.raw?.away || ""}`;
      push({ id:"q2", color: prefUpcoming.league === "WTA" ? "#E11D48" : "#0891B2",
        text: `Best tennis bet in ${label} ${daypart}?`,
        prompt: `What is the best bet in ${label} ${daypart}? Cleanest angle and one alternative.` });
    }
    const tourneyName = context?.currentTournament?.name;
    push({ id:"q3", color:"#0891B2",
      text: tourneyName ? `Best futures angle around ${tourneyName}?` : "Which tennis future still has value right now?",
      prompt: tourneyName
        ? `What is the best current futures or tournament-value angle connected to ${tourneyName}?`
        : "Which tennis future still has value right now, and why has the market not fully priced it correctly?" });

    const nflInSeason = isNflInSeason();
    if (nflInSeason) {
      push({ id:"q4", color:"#E11D48", text:"Which NFL weekly prop is most mispriced?", prompt:"Which NFL weekly player prop looks most mispriced right now based on current usage and the player database?" });
      push({ id:"q5", color:"#E11D48", text:"Best NFL in-season edge on the board?",   prompt:"What is the best NFL in-season betting edge on the board right now?" });
    } else {
      push({ id:"q4", color:"#E11D48", text:"Which NFL future looks most mispriced?",   prompt:"Which NFL future looks the most mispriced right now based on the player database and team context?" });
      push({ id:"q5", color:"#E11D48", text:"Which RB scores the most TDs in 2026?",    prompt:"Based on the NFL player database, which running back is most likely to lead the NFL in touchdowns in 2026?" });
    }
    return prompts.slice(0, 5);
  }, [tennis]);

  // ── Header pill — changes based on current screen ────────────────────────
  const nflSeasonMode = isNflInSeason();
  const headerPill = (
    <>
      {screen === "tennis"    && <span className="pill-live">{tennis.context?.currentTournament?.name ? tennis.context.currentTournament.name.toUpperCase() : "TENNIS"}</span>}
      {screen === "nfl"       && <span className="pill-nfl">{nflSeasonMode ? "NFL IN-SEASON" : "NFL FUTURES"}</span>}
      {screen === "nflplayer" && <span className="pill-nfl">{selectedNflPlayerName?.toUpperCase()}</span>}
      {screen === "player"    && <span className="pill-tag">{selectedPlayerName?.toUpperCase()}</span>}
      {screen === "matchup"   && selectedMatchup && (
        selectedMatchup.league?.includes("NFL")
          ? <span className="pill-nfl">{selectedMatchup.league}</span>
          : <span className="pill-tag">{selectedMatchup.network?.toUpperCase() || selectedMatchup.league}</span>
      )}
      {screen === "ask"  && <span className="pill-tag">UR TAKE</span>}
      {(screen === "home" || screen === "pro") && <span className="pill-live">LIVE</span>}
    </>
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="app">

      <header className="hdr">
        <div className="wordmark">
          <span className="logo-under">Under</span>
          <span className="logo-review">Review</span>
        </div>
        <div className="header-right">{headerPill}</div>
      </header>

      {screen === "home" && (
        <HomeScreen
          liveMatches={tennis.liveMatches}
          context={tennis.context}
          homeInput={homeInput} setHomeInput={setHomeInput}
          onSubmitHome={submitHome}
          onFirePrompt={firePrompt}
          onOpenMatchup={openMatchup}
          goTennis={goTennis}
          goNfl={goNfl}
          dynamicQuestions={dynamicQuestions}
          {...imageProps}
        />
      )}

      {screen === "tennis" && (
        <TennisScreen
          players={tennis.players}
          context={tennis.context}
          liveMatches={tennis.liveMatches}
          tennisLoading={tennis.tennisLoading}
          tennisMsgs={tennisMsgs}
          tennisInput={tennisInput} setTennisInput={setTennisInput}
          onSubmitTennis={submitTennis}
          onOpenMatchup={openMatchup}
          onOpenPlayer={openPlayer}
          {...imageProps}
        />
      )}

      {screen === "nfl" && (
        <NflScreen
          nflMsgs={nflMsgs}
          nflInput={nflInput} setNflInput={setNflInput}
          nflPosFilter={nflPosFilter} setNflPosFilter={setNflPosFilter}
          onSubmitNfl={submitNfl}
          onOpenNflPlayer={openNflPlayer}
          {...imageProps}
        />
      )}

      {screen === "ask" && (
        <AskScreen
          askMsgs={askMsgs}
          askInput={askInput} setAskInput={setAskInput}
          onSubmitAsk={submitAsk}
          onFirePrompt={firePrompt}
          dynamicQuestions={dynamicQuestions}
          {...imageProps}
        />
      )}

      {screen === "matchup" && (
        <MatchupScreen
          selectedMatchup={selectedMatchup}
          matchupMsgs={matchupMsgs}
          matchupInput={matchupInput} setMatchupInput={setMatchupInput}
          onSubmitMatchup={submitMatchup}
          onBack={() => { setSelectedMatchup(null); setScreen(selectedMatchup?.league?.includes("NFL") ? "nfl" : "tennis"); }}
          {...imageProps}
        />
      )}

      {screen === "player" && (
        <PlayerScreen
          selectedPlayerName={selectedPlayerName}
          players={tennis.players}
          tennisInput={tennisInput} setTennisInput={setTennisInput}
          onSubmitTennis={submitTennis}
          onBack={() => setScreen("tennis")}
          {...imageProps}
        />
      )}

      {screen === "nflplayer" && (
        <NflPlayerScreen
          selectedNflPlayerName={selectedNflPlayerName}
          nflInput={nflInput} setNflInput={setNflInput}
          onSubmitNfl={submitNfl}
          onBack={() => setScreen("nfl")}
          {...imageProps}
        />
      )}

      {screen === "pro" && <ProScreen />}

      <nav className="bottom-nav">
        {[
          { key:"home",   label:"Home",   icon:"home" },
          { key:"tennis", label:"Tennis", icon:"tennis" },
          { key:"nfl",    label:"NFL",    icon:"nfl" },
          { key:"ask",    label:"Ask",    icon:"ask" },
          { key:"pro",    label:"Pro",    icon:"pro" },
        ].map(({ key, label, icon }) => {
          const active = tab === key && (key !== "home" || screen === "home");
          const cls = key === "tennis" ? "tennis-active" : key === "nfl" ? "nfl-active" : "active";
          const go  = { home:goHome, tennis:goTennis, nfl:goNfl, ask:goAsk, pro:goPro }[key];
          return (
            <button key={key} className={`nav-btn${active ? ` ${cls}` : ""}`} onClick={go}>
              <NavIcon type={icon} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

    </div>
  );
}
