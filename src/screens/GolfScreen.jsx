import AskBar from "../components/AskBar.jsx";
import { ChatThread } from "../features/app/helpers.jsx";
import { isGolfEventFinished } from "../lib/golfEventStatus.js";
import { deriveGolfEventState, getQuickPromptsForState } from "../lib/getQuickPromptsForState.js";

const LIVE_QUICK_PRE = [
  ["Best outright value?", "Who has the best outright value at this week's PGA Tour event? Consider field strength, course fit, and SG profile."],
  ["Best top-10 play?", "Who is the best top-10 bet at this week's PGA Tour event? Give me the highest-confidence play with reasoning."],
  ["Safest make-cut?", "Who is the safest make-cut bet at this week's event? Prioritize players with 80%+ cut-making history and good current form."],
  ["Best matchup H2H?", "Build the sharpest head-to-head matchup play at this week's event. Consider SG splits and course fit."],
  ["Best FRL play?", "Who is the best first round leader bet? Consider power players, morning draws, and current form."],
  ["Who to fade?", "Who should I fade this week? Tell me the player overpriced relative to their SG profile and course fit."],
];

const LIVE_QUICK_LIVE = [
  ["Live top-5 angle?", "Who is the best live top-5 angle given the current leaderboard and volatility?"],
  ["Cut line watch?", "Who is on the cut bubble and what is the sharpest live make-cut or miss-cut read?"],
  ["Top underdog still in?", "Which longshot still in contention is the best live add for top-10 or outright?"],
  ["Round leader angle?", "Who is the best live bet for low round or back-nine charge based on the board?"],
  ["Live outright?", "Given current positions, who still offers the best live outright value?"],
  ["Fade the chalk?", "Who is the live fade among the leaders based on volatility and course fit?"],
];

function describeTournamentStyle(evt) {
  const course = String(evt?.courseName || evt?.course || "").toLowerCase();
  if (course.includes("links")) return "Links profile: wind, trajectory control, and scrambling usually decide it.";
  if (course.includes("harbour") || course.includes("harbor")) return "Positional profile: fairways and approach precision matter more than pure power.";
  if (course.includes("augusta")) return "Augusta profile: elite irons, touch around greens, and patience under Sunday pressure.";
  if (course.includes("bay hill") || course.includes("quail hollow")) return "Power-parkland profile: distance helps, but approach play still separates contenders.";
  return "Standard PGA profile: SG approach, fairway control, and putter variance are the main separators.";
}

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
  const golfPhase = deriveGolfEventState(golfData);
  const shellPrompts = getQuickPromptsForState("golf", eventFinished ? "final" : golfPhase);
  const quickAngles = !eventFinished && golfPhase === "live" ? LIVE_QUICK_LIVE : LIVE_QUICK_PRE;
  const scheduleRows = Array.isArray(golfData?.tourSchedule) ? golfData.tourSchedule : [];
  const fallbackEvent = scheduleRows[0] || null;
  const headerEventName = golfData?.currentEvent?.name || fallbackEvent?.name || "PGA TOUR";
  const headerCourseLine = golfLoading
    ? "Loading..."
    : golfData?.currentEvent?.course
      ? `${golfData.currentEvent.course} — ${eventFinished ? "Final" : golfData.currentEvent.round || "Live"}`
      : fallbackEvent?.courseName
        ? `${fallbackEvent.courseName} — Upcoming`
        : "Ask about any player, tournament, or prop";

  return (
          <main ref={golfScreenRef} className={`screen${hasDockedBar ? " has-msgs" : ""}`}>
            <div className="golf-banner">
              <div style={{fontFamily:"var(--display-font)",fontSize:28,letterSpacing:1,marginBottom:2}}>{headerEventName}</div>
              <div style={{fontFamily:"var(--mono-font)",fontSize:9,color:"var(--muted)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>{eventFinished ? "FINAL — RESULTS & RECAP" : "OUTRIGHTS / PROPS / MATCHUP EDGES"}</div>
              <div style={{fontSize:12,color:"var(--soft)"}}>
                {headerCourseLine}
              </div>
            </div>

            {golfMsgs.length===0&&(
              <div className="golf-ask-shell" ref={golfBarRef}>
                <div className="golf-ask-label">{eventFinished ? "Recap — Golf" : "Ask Anything — Golf"}</div>
                <AskBar inputRef={golfInputRef} value={golfInput} onChange={setGolfInput} onSubmit={()=>submitGolf()} placeholder={eventFinished ? "How did the tournament finish? Biggest surprise?" : "Scheffler top 5? Best make-cut play? Matchup angle?"} btnColor="#DCE6F2" {...askBarCommon}/>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  {(shellPrompts.length ? shellPrompts : [
                    "Best outright?",
                    "Top-10 value?",
                    "Course fit sleeper?",
                    "Fade favorites?",
                  ]).map((q) => (
                    <button key={q} className="quick-btn" onClick={() => submitGolf(q)} style={{ fontSize: 11 }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <ChatThread msgs={golfMsgs} />

            {scheduleRows.length > 0 && (
              <>
                <div className="section-divider">PGA Tour Schedule</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr",gap:6,marginBottom:10}}>
                  {scheduleRows.slice(0, 6).map((evt, idx) => (
                    <div
                      key={`${evt?.id || evt?.name || idx}`}
                      className="golf-odds-card"
                      onClick={() =>
                        submitGolf(
                          `Give me a brief tournament synopsis for ${evt?.name || "this event"}: course style, player profile that fits, and one market angle to watch this week.`,
                        )
                      }
                    >
                      <div style={{fontSize:13,color:"var(--text)",fontWeight:600}}>
                        {evt?.shortName || evt?.name || "PGA Tour Event"}
                      </div>
                      <div style={{fontSize:11,color:"var(--soft)",marginTop:2}}>
                        {(evt?.displayDate || "Upcoming")}{evt?.location ? ` · ${evt.location}` : ""}
                      </div>
                      <div style={{fontSize:11,color:"var(--muted)",marginTop:4}}>
                        {describeTournamentStyle(evt)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

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
              {quickAngles.map(([label, prompt]) => (
                <button key={label} className="quick-btn" onClick={() => submitGolf(prompt)} style={{ fontSize: 11 }}>
                  {label}
                </button>
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
