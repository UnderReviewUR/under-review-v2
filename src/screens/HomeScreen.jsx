import { useEffect, useLayoutEffect, useState } from "react";

import AskBar from "../components/AskBar.jsx";
import { trackFunnelEvent } from "../lib/funnelAnalytics.js";
import LiveEdgeAlert from "../components/LiveEdgeAlert.jsx";
import TickerRail from "../components/TickerRail.jsx";
import TodaySlatePanel from "../components/TodaySlatePanel.jsx";
import { HOME_PROMPT_FALLBACKS } from "../features/home/buildDynamicHomeQuestions.js";

const FIRST_SESSION_PROMPTS = HOME_PROMPT_FALLBACKS.filter((q) =>
  ["fb1", "fb2", "fb3"].includes(q.id),
);

export default function HomeScreen({
  strippedHomeSession = false,
  strippedSessionBusy = false,
  hasDockedBar,
  askInput,
  setAskInput,
  submitHome,
  askInputRef,
  askBarCommon,
  goTennis,
  goNfl,
  goF1,
  goNba,
  goMlb,
  goGolf,
  dynamicHomeQuestions,
  dailyFeaturedAngleCard,
  firePrompt,
  prefillUrTakeQuestion,
  isNflSlateActive,
  tickerNbaGames,
  getSeriesLabel,
  tennisTickerMatches,
  golfData,
  mlbGames,
  mlbData,
  f1Data,
  homeCards,
  openMatchup,
  golfScoreColor,
  liveSnapshotEventKeys,
  onTodaySlateDisplayedKeys,
  slateFallbackSports,
  nbaLiveEdgeAlerts,
  publicStats = null,
}) {
  const homeNbaGames = Array.isArray(tickerNbaGames) ? tickerNbaGames : [];

  const [dailyPreview, setDailyPreview] = useState(null);
  const [homeCenterTipMode, setHomeCenterTipMode] = useState("off");

  useLayoutEffect(() => {
    if (!strippedHomeSession) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    const t = window.setTimeout(() => askInputRef?.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [strippedHomeSession, askInputRef]);

  useEffect(() => {
    if (!strippedHomeSession) return;
    try {
      if (sessionStorage.getItem("ur_first_session_home_viewed") === "1") return;
      sessionStorage.setItem("ur_first_session_home_viewed", "1");
    } catch {
      /* ignore */
    }
    trackFunnelEvent("first_session_home_view", { surface: "stripped_home" });
  }, [strippedHomeSession]);

  useEffect(() => {
    if (strippedHomeSession) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/daily-take");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.ok && data?.headline) setDailyPreview(data);
      } catch {
        /* ignore — preview is optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [strippedHomeSession]);

  useEffect(() => {
    if (strippedHomeSession) {
      setHomeCenterTipMode("off");
      return;
    }
    try {
      if (localStorage.getItem("ur_home_center_tip_seen") === "1") return;
    } catch {
      return;
    }
    setHomeCenterTipMode("on");
    const fadeT = window.setTimeout(() => setHomeCenterTipMode("fade"), 3500);
    const doneT = window.setTimeout(() => {
      setHomeCenterTipMode("off");
      try {
        localStorage.setItem("ur_home_center_tip_seen", "1");
      } catch {
        /* ignore */
      }
    }, 4000);
    return () => {
      window.clearTimeout(fadeT);
      window.clearTimeout(doneT);
    };
  }, [strippedHomeSession]);

  if (strippedHomeSession) {
    return (
      <main className="screen ur-first-session-home">
        <div className="ur-first-session-stack">
          <h1 className="ur-first-session-headline">What do you want to know before you bet?</h1>
          <AskBar
            inputRef={askInputRef}
            value={askInput}
            onChange={setAskInput}
            onSubmit={submitHome}
            placeholder="One sharp line — player, game, or price you care about…"
            {...askBarCommon}
          />
          {strippedSessionBusy ? (
            <p className="ur-first-session-wait" aria-live="polite">
              Working on your answer…
            </p>
          ) : null}
          <div className="ur-first-session-prompts">
            {FIRST_SESSION_PROMPTS.map((q) => (
              <button
                key={q.id}
                type="button"
                disabled={strippedSessionBusy}
                className={`ur-first-session-pill ur-first-session-pill--${q.id}`}
                onClick={() => firePrompt(q.prompt, q.sportHint || null, q.id)}
              >
                <span className="ur-first-session-pill-text" style={{ color: q.color }}>
                  {q.text}
                </span>
                <span className="ur-first-session-pill-arrow" style={{ color: q.color }} aria-hidden>
                  →
                </span>
              </button>
            ))}
          </div>
          <p className="ur-first-session-foot">2 questions free · No card · No signup</p>
        </div>
      </main>
    );
  }

  return (
          <main className={`screen home-surface-premium${hasDockedBar ? " has-msgs" : ""}`}>

            {homeCenterTipMode !== "off" ? (
              <p
                className={
                  homeCenterTipMode === "fade"
                    ? "ur-home-center-tip ur-home-center-tip--fade"
                    : "ur-home-center-tip"
                }
                role="status"
              >
                This is your command center.
              </p>
            ) : null}

            {publicStats ? (
              <div className="ur-public-stats">
                {publicStats.totalTakes.toLocaleString()} edges analyzed ·{" "}
                {Math.round(publicStats.highConfidenceWinRate * 100)}% win rate on high confidence calls
              </div>
            ) : null}

            {/* Same UR TAKE input as Ask tab — one bar, shared state */}
            <AskBar
              inputRef={askInputRef}
              value={askInput}
              onChange={setAskInput}
              onSubmit={submitHome}
              placeholder="One sharp line — player, game, or price you care about…"
              {...askBarCommon}
            />
            <p className="home-micro-hint">Tap a sport to lock context, or fire a starter prompt below.</p>

            {/* Sport pill rail — horizontal scroll, feels like tabs */}
            <div className="sport-rail">
              <button className="sport-pill sport-pill-tennis" onClick={goTennis}>TENNIS</button>
              <button className="sport-pill sport-pill-nfl" onClick={goNfl}>NFL</button>
              <button className="sport-pill sport-pill-f1" onClick={goF1}>F1</button>
              <button className="sport-pill sport-pill-nba" onClick={goNba}>NBA</button>
              <button className="sport-pill sport-pill-mlb" onClick={goMlb}>MLB</button>
              <button className="sport-pill" style={{color:"#FFFFFF",borderColor:"rgba(255,255,255,.5)"}} onClick={goGolf}>GOLF</button>
            </div>

            {dailyPreview && prefillUrTakeQuestion ? (
              <section
                className="daily-edge-preview"
                style={{
                  margin: "12px 16px 14px",
                  padding: "14px 14px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "linear-gradient(180deg, rgba(0,212,168,0.06), rgba(255,255,255,0.02))",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--mono-font)",
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    color: "#00d4a8",
                    marginBottom: 10,
                    textTransform: "uppercase",
                  }}
                >
                  TODAY&apos;S EDGE — FREE PREVIEW
                </div>
                {dailyPreview.matchupLabel ? (
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
                    {dailyPreview.matchupLabel}
                  </div>
                ) : null}
                <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", lineHeight: 1.35, marginBottom: 8 }}>
                  {dailyPreview.headline}
                </div>
                {dailyPreview.bodyChunk ? (
                  <div style={{ fontSize: 13, color: "var(--soft)", lineHeight: 1.45, marginBottom: 8 }}>
                    {dailyPreview.bodyChunk}
                  </div>
                ) : null}
                {dailyPreview.closing ? (
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--cyan-bright)", lineHeight: 1.4 }}>
                    {dailyPreview.closing}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    prefillUrTakeQuestion(dailyPreview.question, dailyPreview.sportHint || null)
                  }
                  style={{
                    marginTop: 12,
                    width: "100%",
                    textAlign: "left",
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    fontFamily: "var(--mono-font)",
                    fontSize: 12,
                    letterSpacing: "0.06em",
                    color: "#00d4a8",
                    cursor: "pointer",
                    textDecoration: "underline",
                    textUnderlineOffset: 3,
                  }}
                >
                  Get the full take →
                </button>
              </section>
            ) : null}

            {/* Prompts first — actionable before the live snapshot strip */}
            <div className="ask-cards">
              {dynamicHomeQuestions.map((q) => (
                <div key={q.id} className="ask-card" onClick={() => firePrompt(q.prompt, q.sportHint || null, q.id)}>
                  <div className="ask-card-bar" style={{ background: q.color }} />
                  <div className="ask-card-text">{q.text}</div>
                  <div style={{ color: "var(--muted)", fontSize: 16, flexShrink: 0 }}>›</div>
                </div>
              ))}
            </div>

            <LiveEdgeAlert alerts={nbaLiveEdgeAlerts || []} />

            <TickerRail
              isNflSlateActive={isNflSlateActive}
              goNfl={goNfl}
              goNba={goNba}
              goGolf={goGolf}
              goMlb={goMlb}
              goF1={goF1}
              goTennis={goTennis}
              tickerNbaGames={homeNbaGames}
              getSeriesLabel={getSeriesLabel}
              tennisTickerMatches={tennisTickerMatches}
              golfData={golfData}
              mlbGames={mlbGames}
              mlbData={mlbData}
              f1Data={f1Data}
            />

            {dailyFeaturedAngleCard ? (
              <button
                type="button"
                onClick={() =>
                    firePrompt(
                      dailyFeaturedAngleCard.prompt,
                      dailyFeaturedAngleCard.sportHint,
                      "daily_featured_angle",
                    )
                  }
                style={{
                  width: "100%",
                  marginTop: 6,
                  marginBottom: 10,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderLeft: `4px solid ${dailyFeaturedAngleCard.accentColor || "#FF6B00"}`,
                  background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
                  padding: "14px 14px 12px",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--mono-font)",
                      fontSize: 10,
                      letterSpacing: 1.2,
                      textTransform: "uppercase",
                      color: dailyFeaturedAngleCard.accentColor || "#FF6B00",
                    }}
                  >
                    {dailyFeaturedAngleCard.sportBadge || "NBA"}
                  </span>
                  <span style={{ fontFamily: "var(--mono-font)", fontSize: 10, color: "var(--muted)" }}>
                    {dailyFeaturedAngleCard.timestamp}
                  </span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                  {dailyFeaturedAngleCard.matchup}
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 5 }}>
                  {dailyFeaturedAngleCard.lean}
                </div>
                <div style={{ fontSize: 12, color: "var(--soft)", lineHeight: 1.4 }}>
                  {dailyFeaturedAngleCard.reason}
                </div>
              </button>
            ) : null}

            <TodaySlatePanel
              excludeEventKeys={liveSnapshotEventKeys}
              onDisplayedEventKeysChange={onTodaySlateDisplayedKeys}
              fallbackSports={slateFallbackSports}
            />

            {/* Spotlight cards — tight, sport-colored, edge-focused */}
            {homeCards.filter((m) => m.id !== "ur-home-tracker").map(m=>(
  <div
    key={m.id}
    className={`spotlight-card${m.isDraft ? " draft-gold-pulse" : ""}`}
    onClick={() => {
      if (m.isNbaRowsCard) return;
      openMatchup(m);
    }}
  >
                <div className="spotlight-top">
                  <span className="spotlight-sport" style={{color:m.leagueColor}}>{m.homeCategory||m.league}</span>
                  <span className="spotlight-time">{m.time}</span>
                </div>
                <div className="spotlight-title">{m.title}</div>
                {m.isNbaRowsCard && Array.isArray(m.nbaRows) && m.nbaRows.length > 0 ? (
                  <div className="spotlight-edge" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {m.nbaRows.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        className="quick-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMatchup({
                            id: row.id,
                            league: "NBA PLAYOFFS",
                            leagueColor: m.leagueColor,
                            title: `${row.away} vs ${row.home}`,
                            time: row.tipEt,
                            network: row.channel || row.series || "Playoff matchup",
                            nbaEventKey: row.nbaEventKey || null,
                          });
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          border: "1px solid rgba(255, 107, 0, 0.35)",
                          borderRadius: 10,
                          background: "rgba(255, 107, 0, 0.08)",
                          padding: "8px 10px",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                            {row.away} @ {row.home}
                          </div>
                          <div style={{ fontFamily: "var(--mono-font)", fontSize: 11, color: "#FF6B00" }}>
                            {row.tipEt}
                          </div>
                        </div>
                        <div style={{ marginTop: 3, fontSize: 11, color: "var(--muted)" }}>
                          {[row.series, row.channel].filter(Boolean).join(" · ")}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}
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
                ) : m.id === "tennis-atp-schedule-board" &&
                  Array.isArray(m.matchupLines) &&
                  m.matchupLines.length > 0 ? (
                  <div className="spotlight-edge">
                    <div className="spotlight-atp-matchups-wrap">
                      <ul className="spotlight-atp-matchups">
                        {m.matchupLines.map((line, i) => (
                          <li key={`${m.id}-m-${i}`}>{line}</li>
                        ))}
                      </ul>
                    </div>
                    {m.moreMatchupsCount > 0 ? (
                      <div className="spotlight-atp-foot">
                        +{m.moreMatchupsCount} more matchup
                        {m.moreMatchupsCount === 1 ? "" : "s"} on the board
                      </div>
                    ) : null}
                    <div className="spotlight-atp-foot">{m.network}</div>
                  </div>
                ) : m.isDraft ? (
                  <>
                    <div className="spotlight-edge">{m.blurb}</div>
                    {Array.isArray(m.quickHitters) && m.quickHitters.length > 1 ? (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{ marginTop: 10, paddingLeft: 2 }}
                      >
                        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>
                          More angles
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {m.quickHitters.slice(1).map((q) => (
                            <button
                              key={q}
                              type="button"
                              className="quick-btn"
                              onClick={() => firePrompt(q, "nfl", "nfl_home_quick")}
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div
                    className="spotlight-edge"
                    style={
                      m.id?.startsWith("golf-home-leaderboard") || m.id === "ur-home-tracker"
                        ? { whiteSpace: "pre-line" }
                        : undefined
                    }
                  >
                    {!m.isNbaRowsCard ? m.blurb : null}
                  </div>
                )}
              </div>
            ))}

            <div className="page-spacer"/>
          </main>
  );
}
