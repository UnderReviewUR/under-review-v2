import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { NFL_2026_SCHEDULE } from "../data/nfl2026Schedule.js";
import { NFL_2026_TEAMS } from "../data/nfl2026Teams.js";
import { getTeamSchedule } from "../lib/nflPredictDerived.js";
import {
  clearAllPicks,
  clearTeamPicks,
  decodePicks,
  loadPicks,
  loadPicksFromUrl,
} from "../lib/nflPredictState.js";

import DivisionStandings from "../components/nfl-predict/DivisionStandings.jsx";
import GameCard from "../components/nfl-predict/GameCard.jsx";
import PlayoffPicture from "../components/nfl-predict/PlayoffPicture.jsx";
import SeasonCompleteOverlay from "../components/nfl-predict/SeasonCompleteOverlay.jsx";
import ShareModal from "../components/nfl-predict/ShareModal.jsx";
import TeamSelector from "../components/nfl-predict/TeamSelector.jsx";
import UrCtaPanel from "../components/nfl-predict/UrCtaPanel.jsx";

const LS_KEY = "ur_nfl_2026_picks";

export default function NflPredictScreen() {
  const schedule = NFL_2026_SCHEDULE;
  const teams = NFL_2026_TEAMS;

  const [picks, setPicks] = useState(() => loadPicks());
  const [isViewingShared, setIsViewingShared] = useState(false);
  const [activeView, setActiveView] = useState("teams");
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedConference, setSelectedConference] = useState("AFC");
  const [showShareModal, setShowShareModal] = useState(false);
  const [completionOverlayTeam, setCompletionOverlayTeam] = useState(null);
  const [showClearToast, setShowClearToast] = useState(false);
  const [resetPressed, setResetPressed] = useState(false);
  const [resetHover, setResetHover] = useState(false);
  const initRef = useRef(false);
  const mainRef = useRef(null);
  const completionShownRef = useRef(new Set());
  const completionTimerRef = useRef(null);
  const clearToastTimerRef = useRef(null);

  const goToView = useCallback((view) => {
    setActiveView(view);
    queueMicrotask(() => {
      mainRef.current?.scrollTo({ top: 0, behavior: "instant" });
    });
  }, []);

  const onViewPlayoffs = useCallback(() => goToView("playoffs"), [goToView]);

  const pickedCount = useMemo(
    () => Object.keys(picks || {}).filter((id) => picks[id]?.winner).length,
    [picks],
  );

  const syncFromStorage = useCallback(() => {
    setPicks(loadPicks());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPick = () => syncFromStorage();
    window.addEventListener("nfl-pick-updated", onPick);
    return () => window.removeEventListener("nfl-pick-updated", onPick);
  }, [syncFromStorage]);

  useEffect(() => {
    if (typeof window === "undefined" || initRef.current) return;
    initRef.current = true;
    let cancelled = false;
    (async () => {
      const sp = new URLSearchParams(window.location.search);
      const shareId = sp.get("share");
      if (shareId && /^[A-Z0-9]{6}$/i.test(shareId)) {
        try {
          const res = await fetch(`/api/nfl-predict-share?id=${encodeURIComponent(shareId.toUpperCase())}`);
          const data = await res.json().catch(() => ({}));
          if (!cancelled && res.ok && data?.picksEncoded) {
            const decoded = decodePicks(data.picksEncoded, schedule);
            try {
              window.localStorage.setItem(LS_KEY, JSON.stringify(decoded));
            } catch {
              /* ignore */
            }
            setPicks(decoded);
            setIsViewingShared(true);
            return;
          }
        } catch {
          /* fall through */
        }
      }
      const fromUrl = loadPicksFromUrl(schedule);
      if (fromUrl != null) {
        try {
          window.localStorage.setItem(LS_KEY, JSON.stringify(fromUrl));
        } catch {
          /* ignore */
        }
        setPicks(fromUrl);
        setIsViewingShared(true);
      } else {
        setPicks(loadPicks());
        setIsViewingShared(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schedule]);

  const teamSchedule = useMemo(
    () => (selectedTeam ? getTeamSchedule(selectedTeam, schedule) : []),
    [selectedTeam, schedule],
  );

  const handleGamePicked = useCallback(() => {
    const current = loadPicks();
    setPicks(current);
    if (!selectedTeam || activeView !== "schedule") return;
    const sched = getTeamSchedule(selectedTeam, schedule);
    const count = sched.filter((g) => current[g.id]?.winner).length;
    if (count < 17) return;
    if (completionShownRef.current.has(selectedTeam)) return;
    completionShownRef.current.add(selectedTeam);
    if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
    completionTimerRef.current = setTimeout(() => {
      setCompletionOverlayTeam(selectedTeam);
    }, 600);
  }, [selectedTeam, schedule, activeView]);

  useEffect(() => {
    return () => {
      if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
      if (clearToastTimerRef.current) clearTimeout(clearToastTimerRef.current);
    };
  }, []);

  const showPicksClearedToast = useCallback(() => {
    setShowClearToast(true);
    if (clearToastTimerRef.current) clearTimeout(clearToastTimerRef.current);
    clearToastTimerRef.current = setTimeout(() => setShowClearToast(false), 1500);
  }, []);

  const handleResetAll = useCallback(() => {
    clearAllPicks();
    setPicks({});
    setIsViewingShared(false);
    setSelectedTeam(null);
    setCompletionOverlayTeam(null);
    completionShownRef.current.clear();
    goToView("teams");
    showPicksClearedToast();
  }, [goToView, showPicksClearedToast]);

  const handleClearTeamPicks = useCallback(() => {
    if (!selectedTeam) return;
    const newPicks = clearTeamPicks(selectedTeam, picks, schedule);
    setPicks(newPicks);
    completionShownRef.current.delete(selectedTeam);
    if (completionOverlayTeam === selectedTeam) setCompletionOverlayTeam(null);
  }, [selectedTeam, picks, schedule, completionOverlayTeam]);

  const handleCompletionViewPlayoffs = useCallback(() => {
    setCompletionOverlayTeam(null);
    goToView("playoffs");
  }, [goToView]);

  const handleCompletionContinue = useCallback(() => {
    setCompletionOverlayTeam(null);
    setSelectedTeam(null);
    goToView("teams");
  }, [goToView]);

  const makeOwn = useCallback(() => {
    clearAllPicks();
    setPicks({});
    setIsViewingShared(false);
  }, []);

  const tabs = [
    { id: "teams", label: "Teams" },
    { id: "schedule", label: "Schedule" },
    { id: "standings", label: "Standings" },
    { id: "playoffs", label: "Playoffs" },
  ];

  const playoffNavBtnStyle = {
    width: "100%",
    minHeight: 48,
    borderRadius: 12,
    border: "1px solid var(--nfl-predict-accent)",
    background: "rgba(0,245,233,.08)",
    color: "var(--nfl-predict-accent)",
    fontWeight: 800,
    fontSize: 14,
    cursor: "pointer",
    marginBottom: 12,
  };

  return (
    <main
      ref={mainRef}
      className="screen nfl-predict-screen"
      style={{
        background: "var(--nfl-predict-bg)",
        color: "var(--nfl-predict-text)",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid var(--nfl-predict-border)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <button
            type="button"
            onClick={handleResetAll}
            onMouseEnter={() => setResetHover(true)}
            onMouseLeave={() => {
              setResetHover(false);
              setResetPressed(false);
            }}
            onMouseDown={() => setResetPressed(true)}
            onMouseUp={() => setResetPressed(false)}
            onTouchStart={() => setResetPressed(true)}
            onTouchEnd={() => setResetPressed(false)}
            style={{
              flexShrink: 0,
              fontSize: 12,
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #333",
              background: "transparent",
              color: resetPressed || resetHover ? "#FF2D6B" : "#666",
              cursor: "pointer",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            ↺ Reset
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--mono-font)", fontSize: 10, letterSpacing: "0.14em", color: "var(--nfl-predict-muted)" }}>
              PREDICTOR
            </div>
            <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.02em" }}>NFL 2026</div>
          </div>
          <div style={{ fontSize: 13, color: "var(--nfl-predict-muted)", flexShrink: 0 }}>
            {pickedCount}/272
          </div>
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            style={{
              flexShrink: 0,
              minHeight: 44,
              padding: "0 14px",
              borderRadius: 10,
              border: "1px solid var(--nfl-predict-accent)",
              background: "transparent",
              color: "var(--nfl-predict-accent)",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Share
          </button>
        </div>
        {isViewingShared ? (
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(255,45,107,.08)",
              border: "1px solid rgba(255,45,107,.35)",
              fontSize: 14,
            }}
          >
            Viewing shared picks —{" "}
            <button
              type="button"
              onClick={makeOwn}
              style={{
                background: "none",
                border: "none",
                color: "var(--nfl-predict-accent)",
                fontWeight: 800,
                cursor: "pointer",
                padding: 0,
              }}
            >
              Make your own
            </button>
          </div>
        ) : null}
        <UrCtaPanel dismissible />
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "nowrap",
            marginTop: 12,
            padding: 4,
            borderRadius: 12,
            background: "#101010",
            border: "1px solid var(--nfl-predict-border)",
            gap: 4,
            overflowX: "auto",
            overflowY: "hidden",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "thin",
            maxWidth: "100%",
          }}
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => goToView(t.id)}
              style={{
                flex: "1 0 auto",
                minWidth: 76,
                minHeight: 44,
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 12,
                padding: "0 6px",
                whiteSpace: "nowrap",
                background: activeView === t.id ? "rgba(0,245,233,.15)" : "transparent",
                color: activeView === t.id ? "var(--nfl-predict-accent)" : "var(--nfl-predict-muted)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ overflowX: "hidden", willChange: "auto" }}>
      {activeView === "teams" ? (
        <TeamSelector
          picks={picks}
          schedule={schedule}
          teams={teams}
          onViewPlayoffs={onViewPlayoffs}
          onSelectTeam={(abbr) => {
            setSelectedTeam(abbr);
            goToView("schedule");
          }}
        />
      ) : null}

      {activeView === "schedule" ? (
        <div style={{ padding: "0 0 20px" }}>
          {selectedTeam ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTeam(null);
                    goToView("teams");
                  }}
                  style={{
                    minHeight: 44,
                    padding: "0 12px",
                    borderRadius: 10,
                    border: "1px solid #333",
                    background: "#141414",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  ← Back
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>
                    {teams.find((t) => t.abbr === selectedTeam)?.fullName || selectedTeam}
                  </div>
                  <button
                    type="button"
                    onClick={handleClearTeamPicks}
                    style={{
                      marginTop: 4,
                      padding: 0,
                      border: "none",
                      background: "none",
                      fontSize: 11,
                      color: "#666",
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                  >
                    Clear team picks
                  </button>
                </div>
              </div>
              {teamSchedule.map((g) => (
                <div key={g.id} style={{ padding: "0 12px" }}>
                  <GameCard
                    game={g}
                    picks={picks}
                    schedule={schedule}
                    teams={teams}
                    focusTeam={selectedTeam}
                    onPick={syncFromStorage}
                    onPicked={handleGamePicked}
                  />
                </div>
              ))}
              <div style={{ padding: "0 12px" }}>
                <button type="button" onClick={onViewPlayoffs} style={playoffNavBtnStyle}>
                  See Playoff Picture →
                </button>
                <UrCtaPanel dismissible={false} />
              </div>
            </>
          ) : (
            <div style={{ padding: "12px 14px" }}>
              <p style={{ fontSize: 14, color: "var(--nfl-predict-muted)", marginBottom: 12 }}>
                Select a team to view their schedule
              </p>
              <TeamSelector
                picks={picks}
                schedule={schedule}
                teams={teams}
                onViewPlayoffs={onViewPlayoffs}
                onSelectTeam={(abbr) => {
                  setSelectedTeam(abbr);
                }}
              />
            </div>
          )}
        </div>
      ) : null}

      {activeView === "standings" ? (
        <div>
          <div style={{ display: "flex", gap: 8, padding: "12px 14px" }}>
            {["AFC", "NFC"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedConference(c)}
                style={{
                  flex: 1,
                  minHeight: 44,
                  borderRadius: 10,
                  border: selectedConference === c ? "2px solid var(--nfl-predict-accent)" : "1px solid #333",
                  background: selectedConference === c ? "rgba(0,245,233,.1)" : "#141414",
                  color: "#fff",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <DivisionStandings picks={picks} schedule={schedule} teams={teams} conference={selectedConference} />
        </div>
      ) : null}

      {activeView === "playoffs" ? (
        <div style={{ padding: "4px 0 24px" }}>
          <p style={{ fontSize: 13, color: "var(--nfl-predict-muted)", padding: "0 14px 10px", margin: 0, lineHeight: 1.45 }}>
            Projected 14-team field from your picks and Vegas win totals. Pick games to override projections and move teams
            in or out of the bracket.
          </p>
          <PlayoffPicture picks={picks} schedule={schedule} teams={teams} />
        </div>
      ) : null}
      </div>

      <div className="page-spacer" />

      {showShareModal ? (
        <ShareModal
          picks={picks}
          isViewingShared={isViewingShared}
          onMakeOwn={makeOwn}
          onClose={() => setShowShareModal(false)}
        />
      ) : null}

      {completionOverlayTeam ? (
        <SeasonCompleteOverlay
          teamAbbr={completionOverlayTeam}
          picks={picks}
          schedule={schedule}
          teams={teams}
          onViewPlayoffs={handleCompletionViewPlayoffs}
          onContinue={handleCompletionContinue}
        />
      ) : null}

      {showClearToast ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            top: 72,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            background: "#1a1a1a",
            border: "1px solid #333",
            color: "#fff",
            fontSize: 13,
            padding: "8px 16px",
            borderRadius: 20,
            pointerEvents: "none",
            opacity: 1,
            transition: "opacity 200ms ease",
          }}
        >
          Picks cleared
        </div>
      ) : null}
    </main>
  );
}
