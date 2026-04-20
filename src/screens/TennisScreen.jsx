import AskBar from "../components/AskBar.jsx";
import { ChatThread } from "../features/app/helpers.jsx";
import { deriveTennisBoardState, getQuickPromptsForState } from "../lib/getQuickPromptsForState.js";
import { ATP_PLAYERS, WTA_PLAYERS } from "../features/app/constants.js";
import { AtpMatchupCard } from "../components/cards/AtpMatchupCard.jsx";
import { TennisPlayerCard } from "../components/cards/TennisPlayerCard.jsx";

export default function TennisScreen({
  tennisScreenRef,
  hasDockedBar,
  tennisBoardHeadline,
  tennisBoardSubline,
  liveMatches,
  tennisLiveMatches,
  tennisUpcomingMatches,
  activeTournamentMatches,
  tennisMsgs,
  tennisBarRef,
  tennisInputRef,
  tennisInput,
  setTennisInput,
  submitTennis,
  askBarCommon,
  context,
  tennisLoading,
  openMatchup,
  players,
  wtaSectionOpen,
  setWtaSectionOpen,
  wtaInputRef,
  wtaInput,
  setWtaInput,
  submitWta,
  openPlayer,
}) {
  const tennisQuickPrompts = getQuickPromptsForState("tennis", deriveTennisBoardState(liveMatches));

  return (
          <main ref={tennisScreenRef} className={`screen${hasDockedBar ? " has-msgs" : ""}`}>
            <div className="tour-banner">
              <div className="banner-title">{tennisBoardHeadline}</div>
              <div className="banner-sub">{tennisBoardSubline}</div>
              <div className="banner-note">{liveMatches.length>0?`ATP · ${tennisLiveMatches.length} live · ${tennisUpcomingMatches.length} upcoming${activeTournamentMatches.length?` · ${activeTournamentMatches.length} in tournament focus`:""}`:"No ATP matches loaded right now."}</div>
            </div>

            {tennisMsgs.length===0&&(
              <div ref={tennisBarRef} style={{background:"var(--surface)",border:"1px solid rgba(255,230,0,.2)",borderRadius:14,padding:14,marginBottom:16}}>
                <div style={{fontSize:10,color:"#FFE600",fontFamily:"var(--mono-font)",letterSpacing:2,marginBottom:8,textTransform:"uppercase"}}>Ask Anything — Tennis</div>
                <AskBar inputRef={tennisInputRef} value={tennisInput} onChange={setTennisInput} onSubmit={()=>submitTennis()} placeholder="Best tennis bet? Which match is mispriced?" {...askBarCommon} />
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {(tennisQuickPrompts.length ? tennisQuickPrompts : [
                    "Best tennis bet tonight?",
                    "Which match is mispriced?",
                    "Best live angle?",
                    "Best futures value?",
                  ]).map((q) => (
                    <button key={q} className="quick-btn" onClick={() => submitTennis(q)} style={{ fontSize: 11 }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <ChatThread msgs={tennisMsgs} />

            <div className="section-divider">{activeTournamentMatches.length>0&&context?.currentTournament?.name?`${context.currentTournament.name} · ATP Board`:"ATP · Live + Upcoming"}</div>

            {tennisLoading?(
              <div className="loading-state"><div className="loading-text">LOADING TENNIS BOARD...</div></div>
            ):liveMatches.length>0?(
              <div className="matchup-list">
                {(activeTournamentMatches.length > 0 ? activeTournamentMatches : liveMatches).map((m) => (
                  <AtpMatchupCard key={m.id} m={m} onOpen={openMatchup} />
                ))}
                {activeTournamentMatches.length > 0 && liveMatches.length > activeTournamentMatches.length && (
                  <>
                    <div className="section-divider">Other ATP Tour Matches</div>
                    {liveMatches
                      .filter((m) => !activeTournamentMatches.some((x) => x.id === m.id))
                      .map((m) => (
                        <AtpMatchupCard key={m.id} m={m} onOpen={openMatchup} />
                      ))}
                  </>
                )}
              </div>
            ):(
              <div className="loading-state"><div className="loading-text">NO CONFIRMED ATP MATCHUPS LOADED</div></div>
            )}

            {context?.ace_props&&(
              <>
                <div className="section-divider">Prop Guide</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  {Object.entries(context.ace_props).map(([name,data])=> {
                    const claySurface = /clay/i.test(String(context?.currentTournament?.surface || ""));
                    const clayAces =
                      claySurface &&
                      data?.avg_aces_clay != null &&
                      data?.avg_aces_clay !== "" &&
                      Number.isFinite(Number(data.avg_aces_clay));
                    const aceLine = clayAces
                      ? `${data.avg_aces_clay} clay avg · ${data.ace_rate} · ${data.avg_aces_hard} hard avg`
                      : `${data.avg_aces_hard} avg · ${data.ace_rate}`;
                    return (
                    <div key={name} className="matchup-card" onClick={()=>submitTennis(`Tell me about ${name} ace props right now`)}>
                      <div className="matchup-body"><div className="matchup-title" style={{fontSize:15}}>{name}</div><div className="matchup-meta">ACES</div><div className="matchup-blurb">{aceLine}</div><div className="matchup-blurb" style={{marginTop:6}}>{data.note||""}</div></div>
                    </div>
                    );
                  })}
                </div>
              </>
            )}

            {players && (
              <>
                <div className="section-divider">ATP Top 25</div>
                {ATP_PLAYERS.map((name, idx) => (
                  <TennisPlayerCard key={name} name={name} idx={idx} tour="atp" players={players} onOpen={openPlayer} />
                ))}

                <div
                  className="section-divider"
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 24,
                  }}
                  onClick={() => setWtaSectionOpen((o) => !o)}
                >
                  <span>WTA · Profile-Based Analysis</span>
                  <span
                    style={{
                      fontFamily: "var(--mono-font)",
                      fontSize: 10,
                      color: "var(--muted)",
                      letterSpacing: 1,
                    }}
                  >
                    {wtaSectionOpen ? "▼ HIDE" : "▶ SHOW"}
                  </span>
                </div>

                {wtaSectionOpen && (
                  <>
                    <div
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "10px 12px",
                        marginBottom: 10,
                        fontSize: 11,
                        color: "var(--muted)",
                        lineHeight: 1.5,
                      }}
                    >
                      No live WTA fixtures feed — answers are powered by the Under Review WTA player database
                      (rally profiles, surface splits, serve/return stats, tiebreak rates). Best for player
                      breakdowns and head-to-head matchup questions.
                    </div>

                    <AskBar
                      inputRef={wtaInputRef}
                      value={wtaInput}
                      onChange={setWtaInput}
                      onSubmit={() => submitWta()}
                      placeholder="Sabalenka vs Gauff on clay? Best matchup angle?"
                      btnColor="#FF2D6B"
                      {...askBarCommon}
                    />

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        marginTop: 8,
                        marginBottom: 12,
                      }}
                    >
                      {[
                        "Sabalenka vs Gauff on clay?",
                        "Muchova vs Rybakina — who wins?",
                        "Best WTA tiebreak fade?",
                        "Most underrated WTA on clay?",
                      ].map((q) => (
                        <button key={q} type="button" className="quick-btn" onClick={() => submitWta(q)} style={{ fontSize: 11 }}>
                          {q}
                        </button>
                      ))}
                    </div>

                    <div className="section-divider">WTA Top 24</div>
                    {WTA_PLAYERS.map((name, idx) => (
                      <TennisPlayerCard key={name} name={name} idx={idx} tour="wta" players={players} onOpen={openPlayer} />
                    ))}
                  </>
                )}
              </>
            )}
            <div className="page-spacer"/>
          </main>
  );
}
