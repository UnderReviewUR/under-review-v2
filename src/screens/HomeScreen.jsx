import AskBar from "../components/AskBar.jsx";
import LiveEdgeAlert from "../components/LiveEdgeAlert.jsx";
import TickerRail from "../components/TickerRail.jsx";
import TodaySlatePanel from "../components/TodaySlatePanel.jsx";

export default function HomeScreen({
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
}) {
  const homeNbaGames = Array.isArray(tickerNbaGames) ? tickerNbaGames : [];

  return (
          <main className={`screen home-surface-premium${hasDockedBar ? " has-msgs" : ""}`}>

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
                onClick={() => firePrompt(dailyFeaturedAngleCard.prompt, dailyFeaturedAngleCard.sportHint)}
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
                              onClick={() => firePrompt(q, "nfl")}
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
