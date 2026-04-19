import AskBar from "../components/AskBar.jsx";
import { ChatThread } from "../features/app/helpers.jsx";
import { isGolfEventFinished } from "../lib/golfEventStatus.js";

const LIVE_SHELL_QUICKS = ["Best outright value?", "Safest make-cut play?", "Best top-10 play?", "Best matchup H2H?"];
const FINAL_SHELL_QUICKS = ["Summarize final results", "Who won and why?", "Biggest surprises on the board?"];

const LIVE_QUICK_ANGLES = [
  ["Best outright value?", "Who has the best outright value at this week's PGA Tour event? Consider field strength, course fit, and SG profile."],
  ["Best top-10 play?", "Who is the best top-10 bet at this week's PGA Tour event? Give me the highest-confidence play with reasoning."],
  ["Safest make-cut?", "Who is the safest make-cut bet at this week's event? Prioritize players with 80%+ cut-making history and good current form."],
  ["Best matchup H2H?", "Build the sharpest head-to-head matchup play at this week's event. Consider SG splits and course fit."],
  ["Best FRL play?", "Who is the best first round leader bet? Consider power players, morning draws, and current form."],
  ["Who to fade?", "Who should I fade this week? Tell me the player overpriced relative to their SG profile and course fit."],
];

export default function GolfScreen({
  golfScreenRef,
  hasDockedBar,
  golfData,
  golfLoading,
  golfMsgs,
  golfBarRef,
  golfInputRef,
  golfInput,
  setGolfInput,
  submitGolf,
  askBarCommon,
}) {
  const eventFinished = isGolfEventFinished(golfData);

  return (
          <main ref={golfScreenRef} className={`screen${hasDockedBar ? " has-msgs" : ""}`}>
            <div className="golf-banner">
              <div style={{fontFamily:"var(--display-font)",fontSize:28,letterSpacing:1,marginBottom:2}}>{golfData?.currentEvent?.name||"PGA TOUR"}</div>
              <div style={{fontFamily:"var(--mono-font)",fontSize:9,color:"var(--muted)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>{eventFinished ? "FINAL — RESULTS & RECAP" : "OUTRIGHTS / PROPS / MATCHUP EDGES"}</div>
              <div style={{fontSize:12,color:"var(--soft)"}}>
                {golfLoading
  ? "Loading..."
  : golfData?.currentEvent?.course
    ? `${golfData.currentEvent.course} — ${eventFinished ? "Final" : golfData.currentEvent.round || "Live"}`
    : "Ask about any player, tournament, or prop"}
              </div>
            </div>

            {golfMsgs.length===0&&(
              <div className="golf-ask-shell" ref={golfBarRef}>
                <div className="golf-ask-label">{eventFinished ? "Recap — Golf" : "Ask Anything — Golf"}</div>
                <AskBar inputRef={golfInputRef} value={golfInput} onChange={setGolfInput} onSubmit={()=>submitGolf()} placeholder={eventFinished ? "How did the tournament finish? Biggest surprise?" : "Scheffler top 5? Best make-cut play? Matchup angle?"} btnColor="#DCE6F2" {...askBarCommon}/>
                {!eventFinished && (
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
                  {LIVE_SHELL_QUICKS.map(q=>(
                    <button key={q} className="quick-btn" onClick={()=>submitGolf(q)} style={{fontSize:11}}>{q}</button>
                  ))}
                </div>
                )}
                {eventFinished && (
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
                  {FINAL_SHELL_QUICKS.map((q) => (
                    <button
                      key={q}
                      className="quick-btn"
                      onClick={() =>
                        submitGolf(
                          q === "Summarize final results"
                            ? "Summarize the final tournament results from the leaderboard: winner, winning score, and one narrative line on how they got it done."
                            : q === "Who won and why?"
                              ? "Who won this tournament and why did their game fit the course — cite the leaderboard in context."
                              : "What were the biggest surprises versus the pre-tournament narrative? Use the final board only."
                        )
                      }
                      style={{fontSize:11}}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                )}
              </div>
            )}

            <ChatThread msgs={golfMsgs} scrollContainerRef={golfScreenRef}/>

            {/* Leaderboard — full field (scroll); same list is sent to /api/ur-take as golfContext */}
            {golfData?.currentEvent?.leaderboard?.length > 0 && (
              <>
                <div className="section-divider">
                  {golfData.currentEvent.name} — {eventFinished ? "Final" : golfData.currentEvent.round}
                  <span style={{ fontFamily: "var(--mono-font)", fontSize: 9, color: "var(--muted)", marginLeft: 8 }}>
                    {golfData.currentEvent.leaderboard.length} players
                  </span>
                </div>
                <div style={{ maxHeight: "min(70vh, 520px)", overflowY: "auto", WebkitOverflowScrolling: "touch", paddingRight: 4 }}>
                  {golfData.currentEvent.leaderboard.map((player, i) => (
                    <div key={`${player.name}-${i}`} className="golf-leaderboard-card" onClick={()=>submitGolf(eventFinished ? `How did ${player.name} finish this event — final position and what the board says about their week?` : `Best betting angle on ${player.name} right now? Outright, top-10, or matchup?`)}>
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

            {/* Outright odds — stale after the event ends; hide for final */}
            {!eventFinished && golfData?.odds?.outrights?.length > 0 && (
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

            {!eventFinished && (
            <>
            <div className="section-divider">Quick Angles</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"0 0 12px"}}>
              {LIVE_QUICK_ANGLES.map(([label,prompt])=>(
                <button key={label} className="quick-btn" onClick={()=>submitGolf(prompt)} style={{fontSize:11}}>{label}</button>
              ))}
            </div>

            <div className="section-divider">Ask About Any Player</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"0 0 8px"}}>
              {["Scheffler","Rory","Schauffele","Morikawa","Hovland","Cantlay","Rahm","Ludvig Aberg","Tom Kim","Spieth","JT","Fleetwood","Fitzpatrick","Hatton","Lowry","Matsuyama","Brian Harman","Cameron Young","Wyndham Clark","Sahith Theegala"].map(name=>(
                <button key={name} className="quick-btn" onClick={()=>submitGolf(`Best betting angle for ${name} this week? Top 10, matchup, outright, or make cut?`)} style={{fontSize:11}}>{name}</button>
              ))}
            </div>
            </>
            )}

            <div className="page-spacer"/>
          </main>
  );
}
