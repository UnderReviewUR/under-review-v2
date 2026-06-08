import { useEffect, useMemo, useState } from "react";
import AskBar from "../components/AskBar.jsx";
import { ChatThread } from "../features/app/helpers.jsx";
import WcGroupTable from "../components/world-cup/WcGroupTable.jsx";
import WcMatchCard from "../components/world-cup/WcMatchCard.jsx";
import WcMatchDetailDrawer from "../components/world-cup/WcMatchDetailDrawer.jsx";
import WcBracket from "../components/world-cup/WcBracket.jsx";
import { WC_2026_TEAMS, getWcTeamsByGroup } from "../data/wc2026Teams.js";
import { formatWcOutrightOdds } from "../../shared/wc2026OutrightOdds.js";
import {
  WC_EMPTY_LIVE,
  WC_EMPTY_VIEW,
  WC_LOADING_LABEL,
} from "../../shared/wcProductVoice.js";
import { wcStrengthTagForRank } from "../../shared/wc2026Strength.js";
import { getWcQuickPrompts } from "../../shared/wcQuickPrompts.js";
import { formatWcKickoffDisplay } from "../../shared/wcKickoffDisplay.js";
import WcXiConfirmedHomeBanner from "../components/WcXiConfirmedHomeBanner.jsx";
import AskUrTakeRetentionStrip from "../components/AskUrTakeRetentionStrip.jsx";

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
  outrightsMeta = null,
  retryWcLoad = null,
  wcMsgs,
  wcBarRef,
  wcInputRef,
  wcInput,
  setWcInput,
  submitWc,
  askBarCommon,
  accessTier,
  onUpgradePromptClick,
  wcScreenNav = null,
  onWcScreenNavConsumed,
  onUrTakeRetry = null,
  onViewWcMatch = null,
  onUrTakeFollowUpPick = null,
  urTakeTrackPlay = null,
  onSaveLastUrTake = null,
  savedTakes = [],
  onOpenSavedTake = null,
  wcXiConfirmedNotice = null,
  onDismissWcXiNotice = null,
  onOpenWcXiNotice = null,
}) {
  const [mainTab, setMainTab] = useState("groups");
  const [matchSubTab, setMatchSubTab] = useState("live");
  const [highlightEventId, setHighlightEventId] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [detailMatch, setDetailMatch] = useState(null);

  useEffect(() => {
    if (!wcScreenNav) return;
    if (wcScreenNav.mainTab) setMainTab(wcScreenNav.mainTab);
    if (wcScreenNav.matchSubTab) setMatchSubTab(wcScreenNav.matchSubTab);
    if (wcScreenNav.highlightEventId) setHighlightEventId(String(wcScreenNav.highlightEventId));
    onWcScreenNavConsumed?.();
  }, [wcScreenNav, onWcScreenNavConsumed]);

  useEffect(() => {
    if (!highlightEventId || wcLoading) return;
    const id = `wc-match-${highlightEventId}`;
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => setHighlightEventId(null), 4000);
    }, 120);
    return () => window.clearTimeout(t);
  }, [highlightEventId, wcLoading, mainTab, matchSubTab]);

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
    onUrTakeRetry,
    onViewWcMatch,
    onUrTakeFollowUpPick,
    urTakeTrackPlay,
  };

  const marketsChipLabel = outrightsMeta?.marketsChip || null;

  const handleAskMatch = (match) => {
    const groupBit = match.group ? ` (Group ${match.group})` : "";
    const prompt = `Who wins ${match.homeTeam} vs ${match.awayTeam}${groupBit}?`;
    submitWc(prompt, { eventId: match?.id });
  };

  const handleAskTeam = (team) => {
    const outrightLabel = formatWcOutrightOdds(team.outrightOdds);
    const prompt = `Is ${team.name} mispriced at ${outrightLabel} to win the World Cup?`;
    submitWc(prompt);
  };

  const wcQuickPrompts = useMemo(
    () =>
      getWcQuickPrompts({
        liveCount: liveMatches.length,
        todayCount: todayMatches.length,
        xiConfirmed: Boolean(wcXiConfirmedNotice),
      }),
    [liveMatches.length, todayMatches.length, wcXiConfirmedNotice],
  );

  const renderMatchesList = (list, { fetchWeather = false } = {}) => {
    if (!list.length) {
      return <div className="wc-empty">{WC_EMPTY_VIEW}</div>;
    }
    return (
      <div className="wc-match-list">
        {list.map((m) => (
          <WcMatchCard
            key={m.id || `${m.homeTeam}-${m.awayTeam}-${m.date}`}
            match={m}
            teams={teams}
            onAskUrTake={handleAskMatch}
            onViewDetails={(m) => {
              setDetailMatch(m);
              onViewWcMatch?.(m);
            }}
            fetchWeather={fetchWeather}
            highlight={highlightEventId != null && String(m.id) === String(highlightEventId)}
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
            <p>{WC_EMPTY_LIVE}</p>
            {next ? (
              <>
                <p className="wc-muted">
                  Next: {next.homeTeam} vs {next.awayTeam} — {formatWcKickoffDisplay(next)}
                </p>
                <button type="button" className="wc-ask-btn wc-empty-cta" onClick={() => handleAskMatch(next)}>
                  Ask about next match →
                </button>
              </>
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

  const wcBrowseBelow = (
    <>
      {wcLoading ? (
        <div className="loading-state">
          <div className="loading-text">{WC_LOADING_LABEL}</div>
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
                <span className="wc-stat-label">Tier</span>
                <span className="wc-stat-val">
                  {wcStrengthTagForRank(
                    getWcTeamsByGroup(selectedTeam.group).findIndex((t) => t.id === selectedTeam.id),
                  )}
                </span>
              </div>
              <div>
                <span className="wc-stat-label">Outright</span>
                <span className="wc-stat-val">
                  {formatWcOutrightOdds(selectedTeam.outrightOdds)}
                  {selectedTeam.outrightOddsSource === "static" && selectedTeam.outrightOdds ? (
                    <span className="wc-outright-fallback"> (static fallback)</span>
                  ) : null}
                </span>
              </div>
            </div>
            <button type="button" className="wc-ask-btn" onClick={() => handleAskTeam(selectedTeam)}>
              Ask UR Take →
            </button>
          </div>
        ) : (
          <>
            {marketsChipLabel ? (
              <p className="wc-markets-chip">{marketsChipLabel}</p>
            ) : null}
            {CONFEDS.map((conf) => {
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
                            Grp {t.group} ·{" "}
                            {wcStrengthTagForRank(
                              getWcTeamsByGroup(t.group).findIndex((x) => x.id === t.id),
                            )}{" "}
                            ·                             {formatWcOutrightOdds(t.outrightOdds)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        )
      ) : null}

      {urDockedChat ? <div className="page-spacer" /> : null}
    </>
  );

  return (
    <main
      ref={wcScreenRef}
      className={`screen wc-screen${urDockedChat ? " has-msgs screen--ur-chat" : hasDockedBar ? " has-msgs" : ""}`}
    >
      <header className="wc-header">
        <h1 className="wc-title">WORLD CUP 2026</h1>
        <p className="wc-subtitle">🌍 USA · Mexico · Canada</p>
        <p className="wc-dates">June 11 — July 19, 2026</p>
      </header>

      {wcXiConfirmedNotice ? (
        <WcXiConfirmedHomeBanner
          notice={wcXiConfirmedNotice}
          onOpenMatch={onOpenWcXiNotice}
          onDismiss={onDismissWcXiNotice}
        />
      ) : null}

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

      {wcMsgs.length === 0 ? (
        <div className="wc-ask-shell" ref={wcBarRef}>
            <div className="wc-ask-label">Ask Anything — World Cup</div>
            <p className="wc-ask-hint">
              Plain question in — verdict first out. Player props when XIs are confirmed.
            </p>
            <AskBar
              inputRef={wcInputRef}
              value={wcInput}
              onChange={setWcInput}
              onSubmit={() => submitWc()}
              placeholder="Ask about groups, teams, or matches →"
            btnColor="var(--wc-gold)"
            {...askBarCommon}
          />
          <div className="wc-quick-prompts">
            {wcQuickPrompts.map((q) => (
              <button key={q} type="button" className="quick-btn" onClick={() => submitWc(q)}>
                {q}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {urDockedChat ? (
        <div className="ur-chat-scroll wc-chat-scroll" ref={wcBarRef}>
          <ChatThread {...chatThreadProps} variant="urChatDocked" />
          {onSaveLastUrTake ? (
            <AskUrTakeRetentionStrip
              askMsgs={wcMsgs}
              onSaveTake={onSaveLastUrTake}
              savedTakes={savedTakes}
              onOpenSavedTake={onOpenSavedTake}
            />
          ) : null}
          {wcBrowseBelow}
        </div>
      ) : (
        wcBrowseBelow
      )}

      {detailMatch ? (
        <WcMatchDetailDrawer match={detailMatch} onClose={() => setDetailMatch(null)} />
      ) : null}
    </main>
  );
}
