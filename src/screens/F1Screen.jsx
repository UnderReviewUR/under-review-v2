import { useMemo, useState } from "react";
import AskBar from "../components/AskBar.jsx";
import { ChatThread } from "../features/app/helpers.jsx";
import { resolveF1RaceStart } from "../features/f1/raceStart.js";
import { deriveF1EventState, getQuickPromptsForState } from "../lib/getQuickPromptsForState.js";

export default function F1Screen({
  f1ScreenRef,
  hasDockedBar,
  f1Msgs,
  f1BarRef,
  f1InputRef,
  f1Input,
  setF1Input,
  submitF1,
  askBarCommon,
  f1Loading,
  f1Data,
  urTakeTrackPlay = null,
  accessTier,
  onUrTakeFollowUpPick = null,
  onUpgradePromptClick = null,
}) {
  const [weekAgoMs] = useState(() => Date.now() - 7 * 86400000);

  const calendarRaces = useMemo(() => {
    const races = f1Data?.schedule?.races;
    if (!races?.length) return [];
    return races
      .filter(
        (r) =>
          r.is_next ||
          new Date(r.race_date || r.date_end).getTime() >= weekAgoMs,
      )
      .slice(0, 10);
  }, [f1Data?.schedule?.races, weekAgoMs]);

  const f1QuickPrompts = getQuickPromptsForState("f1", deriveF1EventState(f1Data));

  return (
          <main ref={f1ScreenRef} className={`screen${hasDockedBar ? " has-msgs" : ""}`}>
            <div className="f1-banner">
              <div className="banner-title">Formula 1 — 2026</div>
              <div className="banner-sub">DRIVER STANDINGS · RACE CALENDAR · BETTING ANGLES</div>
              <div className="banner-note">
                {f1Data?.standings?.length
                  ? `${f1Data.standings.length} drivers · ${f1Data.schedule?.races?.length||0} races`
                  : f1Loading
                    ? "Loading F1 data..."
                    : "F1 data unavailable right now. Check back closer to race week."}
                {(f1Data?.usingFallback || f1Data?.schedule?.usingFallback) ? (
                  <span style={{marginLeft:8,fontFamily:"var(--mono-font)",fontSize:9,letterSpacing:1,color:"var(--muted)"}} title="Using cached standings — live feed unavailable">Est.</span>
                ) : null}
                {f1Data?.openf1TimingSource === "custom" ? (
                  <span
                    style={{
                      marginLeft: 8,
                      fontFamily: "var(--mono-font)",
                      fontSize: 9,
                      letterSpacing: 1,
                      color: "var(--f1)",
                      opacity: 0.95,
                    }}
                    title={
                      f1Data?.openf1TimingHost
                        ? `Timing data from ${f1Data.openf1TimingHost} (self-hosted OpenF1)`
                        : "Timing data from your configured OpenF1 backend"
                    }
                  >
                    Live timing
                  </span>
                ) : null}
              </div>
            </div>

            {f1Msgs.length===0&&(
              <div className="f1-ask-shell" ref={f1BarRef}>
                <div className="f1-ask-label">Ask Anything — F1</div>
                <AskBar inputRef={f1InputRef} value={f1Input} onChange={setF1Input} onSubmit={()=>submitF1()} placeholder="Who wins the next Grand Prix? Best F1 future?" btnColor="var(--f1)" {...askBarCommon} />
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {(f1QuickPrompts.length ? f1QuickPrompts : [
                    "Who wins the next Grand Prix?",
                    "Best F1 future right now?",
                    "Is Antonelli for real?",
                    "Hamilton podium value?",
                  ]).map((q) => (
                    <button key={q} className="quick-btn" onClick={() => submitF1(q)} style={{ fontSize: 11 }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <ChatThread
              msgs={f1Msgs}
              urTakeTrackPlay={urTakeTrackPlay}
              accessTier={accessTier}
              onUrTakeFollowUpPick={onUrTakeFollowUpPick}
              onUpgradePromptClick={onUpgradePromptClick}
            />

            {f1Loading ? (
              <div className="loading-state"><div className="loading-text">LOADING F1 DATA...</div></div>
            ) : (
              <>
                {f1Data?.standings?.length > 0 && (
                  <>
                    <div className="section-divider">Driver Standings</div>
                    {f1Data.standings.map((d,i) => (
                      <div key={d.driver_number||i} className="f1-standing-card" onClick={()=>submitF1(`Tell me about ${d.full_name||d.name_acronym} — form, pace, and best betting angle`)}>
                        <div className="f1-pos">P{d.position||i+1}</div>
                        <div style={{width:4,height:30,borderRadius:2,background:`#${d.team_colour||'666'}`,flexShrink:0}}/>
                        <div className="f1-driver-info">
                          <div className="f1-driver-name">{d.full_name||d.name_acronym||`#${d.driver_number}`}</div>
                          <div className="f1-driver-team">{d.team_name||"—"}</div>
                        </div>
                        <div className="f1-pts"><span className="f1-pts-num">{d.points ?? "—"}</span><span className="f1-pts-label">PTS</span></div>
                      </div>
                    ))}
                  </>
                )}

                {calendarRaces.length > 0 && (
                  <>
                    <div className="section-divider">Race Calendar</div>
                    {calendarRaces.map((race) => {
                      const raceStart = resolveF1RaceStart(race, f1Data?.sessions || []);
                      const dtSession = raceStart ? new Date(raceStart) : null;
                      const sessionOk = dtSession && !Number.isNaN(dtSession.getTime());
                      const fallbackDate = race.race_date ? new Date(race.race_date) : null;
                      const fallbackOk = fallbackDate && !Number.isNaN(fallbackDate.getTime());
                      const dateBasis = sessionOk ? dtSession : fallbackOk ? fallbackDate : null;
                      const dateStr = dateBasis
                        ? dateBasis.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                        : "";
                      const timeStr = sessionOk
                        ? dtSession.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            timeZoneName: "short",
                          })
                        : "";
                      return (
                        <div key={race.meeting_key} className={`f1-race-card${race.is_next?" next-race":""}`}>
                          <div className="f1-race-top">
                            <div className="f1-race-name">{race.meeting_name}</div>
                            <div>{race.is_next && <span className="f1-race-badge">NEXT</span>}</div>
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                            <div className="f1-race-location">{race.location} · {race.circuit_short_name}</div>
                            <div className="f1-race-date" style={{ textAlign: "right" }}>
                              {dateStr}
                              {timeStr ? (
                                <div style={{ fontFamily: "var(--mono-font)", fontSize: 11, marginTop: 4, opacity: 0.85 }}>
                                  {timeStr}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
            <div className="page-spacer"/>
          </main>
  );
}
