import { useMemo, useState } from "react";
import AskBar from "../components/AskBar.jsx";
import { ChatThread } from "../features/app/helpers.jsx";
import WcGroupTable from "../components/world-cup/WcGroupTable.jsx";
import WcMatchCard from "../components/world-cup/WcMatchCard.jsx";
import WcBracket from "../components/world-cup/WcBracket.jsx";
import { WC_2026_TEAMS } from "../data/wc2026Teams.js";

const GROUP_LETTERS = "ABCDEFGHIJKL".split("");
const CONFEDS = ["UEFA", "CONMEBOL", "CONCACAF", "CAF", "AFC", "OFC"];

function todayEt() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

function isFinished(status) {
  return String(status || "").toLowerCase() === "ft";
}

export default function WorldCupScreen({
  wcScreenRef,
  hasDockedBar,
  wcLoading,
  groups,
  matches,
  liveMatches,
  upcomingMatches,
  teams = WC_2026_TEAMS,
  wcMsgs,
  wcBarRef,
  wcInputRef,
  wcInput,
  setWcInput,
  submitWc,
  askBarCommon,
  accessTier,
  onUpgradePromptClick,
}) {
  const [mainTab, setMainTab] = useState("groups");
  const [matchSubTab, setMatchSubTab] = useState("live");
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [expandedGroup, setExpandedGroup] = useState(null);

  const today = todayEt();
  const todayMatches = useMemo(
    () => (matches || []).filter((m) => m.date === today),
    [matches, today],
  );
  const resultsMatches = useMemo(
    () => (matches || []).filter((m) => isFinished(m.status)).slice(-20).reverse(),
    [matches],
  );

  const urDockedChat = hasDockedBar && wcMsgs.length > 0;
  const chatThreadProps = {
    msgs: wcMsgs,
    accessTier,
    onUpgradePromptClick,
    hideFollowUpDock: true,
  };

  const handleAskMatch = (match) => {
    const prompt = `World Cup 2026: ${match.homeTeam} vs ${match.awayTeam}${match.group ? ` (Group ${match.group})` : ""} — give me your UR Take on angles, goals, and live betting value.`;
    submitWc(prompt);
  };

  const handleAskTeam = (team) => {
    const prompt = `World Cup 2026: ${team.name} (Group ${team.group}) — Elo ${team.eloRating}, outright ${team.outrightOdds}. What's your UR Take on their path and best bets?`;
    submitWc(prompt);
  };

  const renderMatchesList = (list, { fetchWeather = false } = {}) => {
    if (!list.length) {
      return <div className="wc-empty">No matches in this view yet.</div>;
    }
    return (
      <div className="wc-match-list">
        {list.map((m) => (
          <WcMatchCard
            key={m.id || `${m.homeTeam}-${m.awayTeam}-${m.date}`}
            match={m}
            teams={teams}
            onAskUrTake={handleAskMatch}
            fetchWeather={fetchWeather}
          />
        ))}
      </div>
    );
  };

  const matchSubContent = () => {
    if (matchSubTab === "live") {
      if (liveMatches.length === 0) {
        const next = upcomingMatches[0];
        return (
          <div className="wc-empty">
            <p>No matches in progress.</p>
            {next ? (
              <p className="wc-muted">
                Next: {next.homeTeam} vs {next.awayTeam} — {next.date} {next.time}
              </p>
            ) : null}
          </div>
        );
      }
      return renderMatchesList(liveMatches);
    }
    if (matchSubTab === "today") return renderMatchesList(todayMatches, { fetchWeather: true });
    if (matchSubTab === "upcoming") {
      return renderMatchesList(upcomingMatches, { fetchWeather: true });
    }
    return renderMatchesList(resultsMatches);
  };

  return (
    <main ref={wcScreenRef} className={`screen wc-screen${hasDockedBar ? " has-msgs" : ""}`}>
      <header className="wc-header">
        <h1 className="wc-title">WORLD CUP 2026</h1>
        <p className="wc-subtitle">🌍 USA · Mexico · Canada</p>
        <p className="wc-dates">June 11 — July 19, 2026</p>
      </header>

      <div className="wc-main-tabs" role="tablist">
        {[
          ["groups", "Groups"],
          ["matches", "Matches"],
          ["bracket", "Bracket"],
          ["teams", "Teams"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={mainTab === key}
            className={`wc-main-tab${mainTab === key ? " wc-main-tab--on" : ""}`}
            onClick={() => {
              setMainTab(key);
              setSelectedTeam(null);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {wcLoading ? (
        <div className="loading-state">
          <div className="loading-text">LOADING WORLD CUP DATA...</div>
        </div>
      ) : null}

      {!wcLoading && mainTab === "groups" ? (
        <div className="wc-groups-grid">
          {GROUP_LETTERS.map((letter) => (
            <div key={letter}>
              <WcGroupTable
                groupLetter={letter}
                standings={groups?.[letter]}
                onSelectTeam={(t) => {
                  setSelectedTeam(t);
                  setMainTab("teams");
                }}
              />
              <button
                type="button"
                className="wc-group-expand"
                onClick={() => setExpandedGroup(expandedGroup === letter ? null : letter)}
              >
                {expandedGroup === letter ? "Hide" : "Show"} group fixtures
              </button>
              {expandedGroup === letter ? (
                <div className="wc-group-fixtures">
                  {renderMatchesList(
                    (matches || []).filter((m) => m.group === letter),
                    { fetchWeather: false },
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {!wcLoading && mainTab === "matches" ? (
        <>
          <div className="wc-sub-tabs">
            {[
              ["live", "Live"],
              ["today", "Today"],
              ["upcoming", "Upcoming"],
              ["results", "Results"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`wc-sub-tab${matchSubTab === key ? " wc-sub-tab--on" : ""}`}
                onClick={() => setMatchSubTab(key)}
              >
                {label}
              </button>
            ))}
          </div>
          {matchSubContent()}
        </>
      ) : null}

      {!wcLoading && mainTab === "bracket" ? <WcBracket matches={matches} /> : null}

      {!wcLoading && mainTab === "teams" ? (
        selectedTeam ? (
          <div className="wc-team-detail">
            <button type="button" className="detail-back" onClick={() => setSelectedTeam(null)}>
              ← ALL TEAMS
            </button>
            <img
              src={selectedTeam.flagUrl}
              alt=""
              width={96}
              height={64}
              loading="lazy"
              className="wc-flag-lg"
            />
            <h2 className="wc-team-detail-name">{selectedTeam.name}</h2>
            <p className="wc-muted">
              {selectedTeam.confederation} · Group {selectedTeam.group}
              {selectedTeam.isHost ? " · Host" : ""}
            </p>
            <div className="wc-team-detail-stats">
              <div>
                <span className="wc-stat-label">Elo</span>
                <span className="wc-stat-val">{selectedTeam.eloRating}</span>
              </div>
              <div>
                <span className="wc-stat-label">Outright</span>
                <span className="wc-stat-val">{selectedTeam.outrightOdds}</span>
              </div>
            </div>
            <button type="button" className="wc-ask-btn" onClick={() => handleAskTeam(selectedTeam)}>
              Ask UR Take →
            </button>
          </div>
        ) : (
          CONFEDS.map((conf) => {
            const confTeams = teams.filter((t) => t.confederation === conf);
            if (!confTeams.length) return null;
            return (
              <section key={conf} className="wc-conf-section">
                <h3 className="wc-conf-title">{conf}</h3>
                <div className="wc-team-grid">
                  {confTeams.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="wc-team-card"
                      onClick={() => setSelectedTeam(t)}
                    >
                      <img src={t.flagUrl} alt="" width={48} height={32} loading="lazy" />
                      <div className="wc-team-card-body">
                        <span className="wc-team-card-name">{t.name}</span>
                        <span className="wc-team-card-meta">
                          Grp {t.group} · Elo {t.eloRating} · {t.outrightOdds}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            );
          })
        )
      ) : null}

      {urDockedChat ? (
        <div className="ur-chat-scroll wc-chat-scroll" ref={wcBarRef}>
          <ChatThread {...chatThreadProps} />
        </div>
      ) : null}

      <div className={urDockedChat ? "ur-docked-ask-shell" : "wc-ask-shell"}>
        {urDockedChat ? (
          <AskBar
            inputRef={wcInputRef}
            value={wcInput}
            onChange={setWcInput}
            onSubmit={() => submitWc()}
            placeholder="Ask anything about the World Cup →"
            btnColor="var(--wc-gold)"
            {...askBarCommon}
            dockedGradient
          />
        ) : (
          <AskBar
            inputRef={wcInputRef}
            value={wcInput}
            onChange={setWcInput}
            onSubmit={() => submitWc()}
            placeholder="Ask anything about the World Cup →"
            btnColor="var(--wc-gold)"
            {...askBarCommon}
          />
        )}
      </div>
    </main>
  );
}
