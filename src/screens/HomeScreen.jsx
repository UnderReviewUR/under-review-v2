import AskBar from "../components/AskBar.jsx";
import TickerRail from "../components/TickerRail.jsx";
import UrTakeRecordPanel from "../components/UrTakeRecordPanel.jsx";

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
  isNflInSeason,
  tickerNbaGames,
  getSeriesLabel,
  liveTickerTennisCards,
  golfData,
  mlbGames,
  mlbData,
  f1Data,
  homeCards,
  openMatchup,
  golfScoreColor,
  userEmail,
  performanceData,
  performanceLoading,
  performanceError,
  loadPerformanceSnapshot,
}) {
  return (
          <main className={`screen${hasDockedBar ? " has-msgs" : ""}`} style={{padding:"8px 12px calc(96px + env(safe-area-inset-bottom))"}}>

            {/* Same UR TAKE input as Ask tab — one bar, shared state */}
            <AskBar inputRef={askInputRef} value={askInput} onChange={setAskInput} onSubmit={submitHome} placeholder="Ask about any player, game, or bet..." {...askBarCommon} />

            {/* Sport pill rail — horizontal scroll, feels like tabs */}
            <div className="sport-rail">
              <button className="sport-pill sport-pill-tennis" onClick={goTennis}>TENNIS</button>
              <button className="sport-pill sport-pill-nfl" onClick={goNfl}>NFL</button>
              <button className="sport-pill sport-pill-f1" onClick={goF1}>F1</button>
              <button className="sport-pill sport-pill-nba" onClick={goNba}>NBA</button>
              <button className="sport-pill sport-pill-mlb" onClick={goMlb}>MLB</button>
              <button className="sport-pill" style={{color:"#FFFFFF",borderColor:"rgba(255,255,255,.5)"}} onClick={goGolf}>GOLF</button>
            </div>

            <UrTakeRecordPanel
              userEmail={userEmail}
              performanceData={performanceData}
              performanceLoading={performanceLoading}
              performanceError={performanceError}
              onRefresh={loadPerformanceSnapshot}
            />

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
              isNflInSeason={isNflInSeason}
              goNfl={goNfl}
              goNba={goNba}
              goGolf={goGolf}
              goMlb={goMlb}
              goF1={goF1}
              tickerNbaGames={tickerNbaGames}
              getSeriesLabel={getSeriesLabel}
              liveTickerTennisCards={liveTickerTennisCards}
              golfData={golfData}
              mlbGames={mlbGames}
              mlbData={mlbData}
              f1Data={f1Data}
            />

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
  );
}
