import AskBar from "../components/AskBar.jsx";
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

            <TodaySlatePanel
              excludeEventKeys={liveSnapshotEventKeys}
              onDisplayedEventKeysChange={onTodaySlateDisplayedKeys}
            />

            {/* Spotlight cards — tight, sport-colored, edge-focused */}
            {homeCards.filter((m) => m.id !== "ur-home-tracker").map(m=>(
  <div
    key={m.id}
    className={`spotlight-card${m.isDraft ? " draft-gold-pulse" : ""}`}
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
                    {m.blurb}
                  </div>
                )}
              </div>
            ))}

            <div className="page-spacer"/>
          </main>
  );
}
