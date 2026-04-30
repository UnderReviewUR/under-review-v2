import AskBar from "../components/AskBar.jsx";
import { ChatThread } from "../features/app/helpers.jsx";
import { deriveDominantGameState, getQuickPromptsForState } from "../lib/getQuickPromptsForState.js";

export default function MlbScreen({
  mlbScreenRef,
  hasDockedBar,
  mlbMsgs,
  mlbBarRef,
  mlbInputRef,
  mlbInput,
  setMlbInput,
  submitMlb,
  askBarCommon,
  mlbLoading,
  mlbGames,
  mlbData,
  urTakeTrackPlay = null,
}) {
  const gamesForState =
    Array.isArray(mlbGames) && mlbGames.length > 0
      ? mlbGames
      : Array.isArray(mlbData?.games)
        ? mlbData.games
        : [];
  const mlbQuickPrompts = getQuickPromptsForState("mlb", deriveDominantGameState(gamesForState));

  return (
          <main ref={mlbScreenRef} className={`screen${hasDockedBar ? " has-msgs" : ""}`}>
            <div style={{borderRadius:16,padding:16,marginBottom:16,border:"1px solid rgba(29,185,84,.2)",background:"linear-gradient(135deg,rgba(29,185,84,.08),rgba(0,100,40,.04))"}}>
              <div style={{fontFamily:"var(--display-font)",fontSize:28,letterSpacing:1,marginBottom:2}}>MLB</div>
              <div style={{fontFamily:"var(--mono-font)",fontSize:9,color:"var(--muted)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>PROPS / GAME TOTALS / PITCHER ANGLES</div>
              <div style={{fontSize:12,color:"var(--soft)"}}>
                {mlbLoading ? "Loading..." : mlbGames.length > 0 ? `${mlbGames.length} games today` : (mlbData?.games?.length > 0) ? `${mlbData.games.length} games today` : "MLB Season Active — Ask about any game or player"}
              </div>
            </div>

            {mlbMsgs.length===0&&(
              <div style={{background:"var(--surface)",border:"1px solid rgba(29,185,84,.2)",borderRadius:14,padding:14,marginBottom:16}} ref={mlbBarRef}>
                <div style={{fontFamily:"var(--mono-font)",fontSize:10,color:"#1DB954",letterSpacing:2,marginBottom:8,textTransform:"uppercase"}}>Ask Anything -- MLB</div>
                <AskBar inputRef={mlbInputRef} value={mlbInput} onChange={setMlbInput} onSubmit={()=>submitMlb()} placeholder="Best K prop tonight? Park factor angle? Best game total?" btnColor="#1DB954" {...askBarCommon}/>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
                  {(mlbQuickPrompts.length ? mlbQuickPrompts : [
                    "Best pitcher K prop?",
                    "Best batter hits prop?",
                    "Best game total?",
                    "Best home run prop?",
                  ]).map((q) => (
                    <button key={q} className="quick-btn" onClick={()=>submitMlb(q)} style={{fontSize:11}}>{q}</button>
                  ))}
                </div>
              </div>
            )}

            <ChatThread msgs={mlbMsgs} urTakeTrackPlay={urTakeTrackPlay} />

            {mlbLoading && mlbGames.length === 0 ? (
              <div className="loading-state"><div className="loading-text">LOADING MLB DATA...</div></div>
            ) : (
              <>
                {(mlbGames.length > 0 || mlbData?.games?.length > 0) && (
                  <>
                    {(()=>{
                      const src = mlbGames.length > 0 ? mlbGames : (mlbData?.games||[]);
                      const liveCount = src.filter(g=>g.state==="in").length;
                      const finalCount = src.filter(g=>g.state==="post").length;
                      const preCount = src.filter(g=>g.state==="pre").length;
                      return <div className="section-divider">{liveCount>0?`${liveCount} Live`:""}{liveCount>0&&(finalCount+preCount>0)?" · ":""}{finalCount>0?`${finalCount} Final`:""}{preCount>0&&(liveCount+finalCount>0)?" · ":""}{preCount>0?`${preCount} Upcoming`:""}</div>;
                    })()}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:4}}>
                    {(mlbGames.length > 0 ? mlbGames : (mlbData?.games || [])).map((g,i) => {
                      const away = g.awayTeam;
                      const home = g.homeTeam;
                      const isLive = g.state === "in";
                      const isFinal = g.state === "post";
                      const matchupStr = `${away.abbr||away.name} @ ${home.abbr||home.name}`;
                      return (
                        <div key={g.id||i} style={{
                          background:"var(--surface)",
                          border:`1px solid ${isLive?"rgba(0,230,118,.3)":"var(--border)"}`,
                          borderRadius:10,padding:"9px 10px",cursor:"pointer",transition:"border-color .15s",
                        }} onClick={()=>submitMlb(`Best prop angle for ${matchupStr} today? Give me the sharpest K prop, game total lean, and best batter play.`)}>
                          <div style={{fontFamily:"var(--mono-font)",fontSize:7,letterSpacing:1.5,marginBottom:4,
                            color:isLive?"#00E676":isFinal?"var(--muted)":"#1DB954"}}>
                            {isLive?"● LIVE":isFinal?"FINAL":g.status?.replace(" ET","ET")||""}
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                            <div>
                              <div style={{fontSize:13,fontWeight:700,color:"var(--text)",lineHeight:1.15}}>{away.abbr||away.name}</div>
                              <div style={{fontSize:11,color:"var(--muted)",lineHeight:1.15}}>@ {home.abbr||home.name}</div>
                            </div>
                            {(isLive||isFinal) && away.score!=null ? (
                              <div style={{fontFamily:"var(--mono-font)",textAlign:"right"}}>
                                <div style={{fontSize:14,fontWeight:700,color:isLive?"var(--text)":"var(--soft)",lineHeight:1.15}}>{away.score}</div>
                                <div style={{fontSize:14,fontWeight:700,color:isLive?"var(--text)":"var(--soft)",lineHeight:1.15}}>{home.score}</div>
                              </div>
                            ) : (
                              <div style={{fontSize:9,fontFamily:"var(--mono-font)",color:"var(--muted)",textAlign:"right",lineHeight:1.4}}>
                                TAP<br/>ANGLE
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </>
                )}
                <div className="section-divider">Quick Prop Angles</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"0 0 12px"}}>
                  {[
                    ["Best K prop?","Who is the best pitcher strikeout OVER tonight? K/9, opposing lineup, confidence."],
                    ["Best hits prop?","Best batter hits OVER tonight? Batting average, pitcher ERA, park factor."],
                    ["Best game total?","Which MLB game total has the sharpest angle tonight? Run environment and lean."],
                    ["Best HR prop?","Best home run prop tonight? Barrel rate, launch angle, pitcher HR/FB rate."],
                    ["Park factor edge?","Which game tonight has the biggest park factor edge? Coors, Petco, extreme parks."],
                    ["Best SGP?","Build the sharpest MLB same game parlay tonight. Pitcher K over + batter prop."],
                  ].map(([label,q]) => (
                    <button key={label} className="quick-btn" onClick={()=>submitMlb(q)} style={{fontSize:11}}>{label}</button>
                  ))}
                </div>
                <div className="section-divider">Ask About Any Player</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"0 0 8px"}}>
                  {["Ohtani","Judge","Freeman","Betts","Acuna","Lindor","Seager","Harper","Guerrero","Ramirez","J. Rodriguez","Carroll","Henderson","Pete Alonso","Corbin Burnes","Zack Wheeler","Paul Skenes","Hunter Greene"].map(name => (
                    <button key={name} className="quick-btn" onClick={()=>submitMlb(`Best prop angle for ${name} today? Line, floor, ceiling, and lean.`)} style={{fontSize:11}}>{name}</button>
                  ))}
                </div>
              </>
            )}
            <div className="page-spacer"/>
          </main>
  );
}
