import { useEffect, useState, useCallback } from "react";
import AskBar from "../components/AskBar.jsx";
import { ChatThread } from "../features/app/helpers.jsx";
import { classifyGolfEvent, EVENT_VALIDITY } from "../../shared/eventValidity.js";
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
  const course = String(evt?.courseName || evt?.course || evt?.tournament?.courseName || "").toLowerCase();
  const name = String(evt?.name || evt?.tournament?.name || "").toLowerCase();

  // Match by course name
  if (course.includes("augusta")) return "Augusta profile: elite irons, touch around greens, and patience under Sunday pressure.";
  if (course.includes("harbour") || course.includes("harbor")) return "Positional profile: fairways and approach precision matter more than pure power.";
  if (course.includes("pebble beach")) return "Links-adjacent profile: wind exposure, cliff edges, and scrambling define scoring windows.";
  if (course.includes("sawgrass") || course.includes("tpc sawgrass")) return "Precision profile: accuracy off the tee and iron precision matter more than raw distance.";
  if (course.includes("doral") || course.includes("blue monster")) return "Power-water profile: aggressive lines reward distance, but water punishes mistakes on every hole.";
  if (course.includes("torrey pines")) return "West Coast parkland: length and approach play dominate, coastal wind adds variance.";
  if (course.includes("bay hill")) return "Power-parkland profile: distance helps, but approach play still separates contenders.";
  if (course.includes("quail hollow")) return "Power-parkland profile: long hitters thrive, but the Creek Holes demand precision late.";
  if (course.includes("riviera")) return "Classic parkland: versatility rewarded — power matters less than precision and course management.";
  if (course.includes("muirfield")) return "Links profile: wind, trajectory control, and scrambling usually decide it.";
  if (course.includes("valhalla")) return "Power-parkland profile: long off the tee with elite approach play separates contenders.";
  if (course.includes("colonial") || course.includes("hogan")) return "Shotmaker profile: accuracy and iron play dominate — power is secondary here.";
  if (course.includes("kiawah")) return "Ocean links: wind exposure is the primary factor — trajectory control and patience win.";
  if (course.includes("bethpage")) return "Public-style monster: length and rough avoidance are prerequisites, not advantages.";
  if (course.includes("southern hills")) return "Classic parkland: ball-striking and patience win — scrambling separates weekend rounds.";
  if (course.includes("oakmont")) return "Brutal classic: speed and slope demand flawless ball-striking — no room for error.";
  if (course.includes("winged foot")) return "Penal rough profile: fairways or bogey — course demands precision above all else.";
  if (course.includes("medinah")) return "Water-parkland profile: length and iron precision, water hazards punish aggression.";
  if (course.includes("east lake")) return "Tour Championship profile: short field, FedEx points determine strategy as much as course.";
  if (course.includes("links")) return "Links profile: wind, trajectory control, and scrambling usually decide it.";

  // Match by tournament name when course name is missing
  if (name.includes("players championship") || name.includes("the players")) return "Precision profile: accuracy off the tee and iron precision matter more than raw distance.";
  if (name.includes("masters")) return "Augusta profile: elite irons, touch around greens, and patience under Sunday pressure.";
  if (name.includes("us open")) return "Penal rough profile: fairways or bogey — course demands precision above all else.";
  if (name.includes("open championship") || name.includes("british open")) return "Links profile: wind, trajectory control, and scrambling usually decide it.";
  if (name.includes("pga championship")) return "Power-parkland profile: varies by venue but length and approach play typically dominate.";
  if (name.includes("cadillac") || name.includes("doral")) return "Power-water profile: aggressive lines reward distance, but water punishes mistakes on every hole.";
  if (name.includes("byron nelson")) return "Low-scoring parkland: birdies come in bunches — scoring separates more than par-saving.";
  if (name.includes("charles schwab") || name.includes("colonial")) return "Shotmaker profile: accuracy and iron play dominate — power is secondary here.";
  if (name.includes("truist")) return "Power-parkland profile: distance helps, but approach play still separates contenders.";
  if (name.includes("myrtle beach")) return "Resort parkland: scoring-friendly conditions reward aggressive play and birdie runs.";

  return "Standard PGA profile: SG approach, fairway control, and putter variance are the main separators.";
}

/** Compact wind/rain line from provider payload only (no raw JSON). */
function formatGolfWeatherRow(golfData) {
  const snap = golfData?.course?.weatherSnapshot;
  const alert =
    golfData?.weatherAlert ||
    golfData?.course?.weatherAlert ||
    null;
  const parts = [];
  if (snap?.windSpeedMph != null && Number.isFinite(Number(snap.windSpeedMph))) {
    parts.push(`Wind: ${Math.round(Number(snap.windSpeedMph))} mph`);
  }
  if (snap?.precipProbability != null && Number.isFinite(Number(snap.precipProbability))) {
    parts.push(`Rain risk: ${Math.round(Number(snap.precipProbability))}%`);
  }
  const hasAlert = alert != null && typeof alert === "object";
  if (parts.length === 0 && !hasAlert) return null;
  const base = parts.join(" · ");
  if (hasAlert) {
    return base ? `${base} · Weather alert active` : "Weather alert active";
  }
  return base || null;
}

/**
 * One-line course character from hole-difficulty aggregates in courseStats only.
 * Returns null if the sample is too thin to support a credible line.
 */
function buildCourseStatsBlurb(courseStats) {
  if (!Array.isArray(courseStats) || courseStats.length < 2) return null;
  const rows = courseStats.filter((r) => r && typeof r === "object");
  if (rows.length < 2) return null;

  let sumDiff = 0;
  let nDiff = 0;
  let birdies = 0;
  let pars = 0;
  let bogeys = 0;
  let doubles = 0;
  for (const r of rows) {
    const d = Number(r.scoringDiff);
    if (Number.isFinite(d)) {
      sumDiff += d;
      nDiff++;
    }
    birdies += Number(r.birdies) || 0;
    pars += Number(r.pars) || 0;
    bogeys += Number(r.bogeys) || 0;
    doubles += Number(r.doubles) || 0;
  }
  if (nDiff < 2) return null;
  const avgDiff = sumDiff / nDiff;
  const scoringEvents = birdies + bogeys + doubles;
  if (scoringEvents < 4) return null;

  const bogeyHeavy = bogeys >= birdies * 1.25 && avgDiff > 0.08;
  const birdieHeavy = birdies >= bogeys * 1.15 && avgDiff < -0.02;
  const tough = avgDiff > 0.12;

  if (bogeyHeavy && tough) {
    return "This course punishes mistakes — bogey avoidance matters more than raw birdie rate on the hardest holes.";
  }
  if (birdieHeavy) {
    return "Birdie chances matter here — scoring separation shows up on gettable holes.";
  }
  if (tough) {
    return "Tougher scoring setup — clean approach play and avoiding blow-up holes matter most.";
  }
  if (avgDiff < -0.05) {
    return "Relative scoring ease on key holes — pars stay on the card but birdies move you up.";
  }
  return null;
}

/** Status-only completion hints (feeds may omit endTs). */
function scheduleRowLooksCompleted(row, nowMs) {
  const endTs = Number(row?.endTs ?? NaN);
  if (Number.isFinite(endTs) && endTs < nowMs) return true;
  const raw = String(row?.rawStatus || row?.status || row?.raw?.status || "").toLowerCase();
  if (!raw.trim()) return false;
  return (
    raw.includes("final") ||
    raw.includes("complete") ||
    raw.includes("completed") ||
    raw.includes("ended") ||
    raw.includes("closed")
  );
}

function scheduleRowSortKey(row) {
  const endTs = Number(row?.endTs ?? NaN);
  if (Number.isFinite(endTs)) return endTs;
  const startTs = Number(row?.startTs ?? NaN);
  return Number.isFinite(startTs) ? startTs : 0;
}

/** Most recent finished row from schedule (provider usually sends upcoming-only; kept for API evolution). */
function pickMostRecentPastScheduleRow(rows, nowMs) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  let best = null;
  let bestKey = -Infinity;
  for (const row of rows) {
    if (!scheduleRowLooksCompleted(row, nowMs)) continue;
    const key = scheduleRowSortKey(row);
    if (key >= bestKey) {
      bestKey = key;
      best = row;
    }
  }
  return best;
}

/**
 * When feed drops currentEvent and schedule is empty, avoid generic "PGA TOUR" via schedule past row or session memory.
 * Only used if there is no named currentEvent and no named schedule[0] (caller gates).
 */
function computeIdentityFallback(ce, fallbackEvent, scheduleRows, lastKnownSnapshot, nowMs) {
  if (ce?.name || ce?.shortName) return null;
  if (fallbackEvent?.name || fallbackEvent?.shortName) return null;
  const past = pickMostRecentPastScheduleRow(scheduleRows, nowMs);
  if (past?.name || past?.shortName) {
    const title = past.shortName || past.name;
    const crs = String(past.courseName || "").trim();
    return {
      title,
      courseLine: crs ? `${crs} — Final` : null,
      monoLabel: "FINAL — RESULTS & RECAP",
    };
  }
  if (lastKnownSnapshot?.name || lastKnownSnapshot?.shortName) {
    const title = lastKnownSnapshot.shortName || lastKnownSnapshot.name;
    const crs = String(lastKnownSnapshot.course || "").trim();
    const v = lastKnownSnapshot.lastKnownValidity;
    if (v === EVENT_VALIDITY.FINISHED) {
      return {
        title,
        courseLine: crs ? `${crs} — Final` : null,
        monoLabel: "FINAL — RESULTS & RECAP",
      };
    }
    if (v === EVENT_VALIDITY.ACTIVE) {
      return {
        title,
        courseLine: crs ? `${crs} — Live` : "Ask about any player, tournament, or prop",
        monoLabel: "OUTRIGHTS / PROPS / MATCHUP EDGES",
      };
    }
    return {
      title,
      courseLine: crs ? `${crs} — Upcoming` : "Ask about any player, tournament, or prop",
      monoLabel: "OUTRIGHTS / PROPS / MATCHUP EDGES",
    };
  }
  return null;
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
  urTakeTrackPlay = null,
  accessTier,
}) {
  const [lastKnownEventSnapshot, setLastKnownEventSnapshot] = useState(null);
  /** Which PGA Tour schedule row (id/name + index) is expanded to show course-profile blurb. */
  const [expandedScheduleKey, setExpandedScheduleKey] = useState(null);

  const toggleScheduleCard = useCallback((key) => {
    setExpandedScheduleKey((prev) => (prev === key ? null : key));
  }, []);

  useEffect(() => {
    const ev = golfData?.currentEvent || golfData?.tournament;
    if (ev && (ev.name || ev.shortName)) {
      setLastKnownEventSnapshot({
        name: ev.name || ev.shortName,
        shortName: ev.shortName || ev.name,
        course: ev.course ?? ev.courseName ?? null,
        lastKnownValidity: classifyGolfEvent(ev, Date.now()),
      });
    }
  }, [golfData?.currentEvent, golfData?.tournament]);

  const eventFinished = isGolfEventFinished(golfData);
  const golfPhase = deriveGolfEventState(golfData);
  const shellPrompts = getQuickPromptsForState("golf", eventFinished ? "final" : golfPhase);
  const quickAngles = !eventFinished && golfPhase === "live" ? LIVE_QUICK_LIVE : LIVE_QUICK_PRE;
  const scheduleRows = Array.isArray(golfData?.tourSchedule) ? golfData.tourSchedule : [];
  const fallbackEvent = scheduleRows[0] || null;
  const ce = golfData?.currentEvent;
  const validity = classifyGolfEvent(ce || null);
  const hasNamedFeatured =
    Boolean(ce && (ce.name || ce.shortName)) &&
    (validity === EVENT_VALIDITY.ACTIVE ||
      validity === EVENT_VALIDITY.UPCOMING);
  const showNextUp =
    !golfLoading &&
    Boolean(fallbackEvent && (fallbackEvent.name || fallbackEvent.shortName)) &&
    !hasNamedFeatured;

  const identityFallback = computeIdentityFallback(
    ce,
    fallbackEvent,
    scheduleRows,
    lastKnownEventSnapshot,
    Date.now(),
  );

  let headerEventName;
  let headerCourseLine;
  let headerMonoLabel;

  if (golfLoading) {
    headerEventName = ce?.name || fallbackEvent?.name || identityFallback?.title || "PGA TOUR";
    headerCourseLine = "Loading...";
    headerMonoLabel = eventFinished ? "FINAL — RESULTS & RECAP" : "OUTRIGHTS / PROPS / MATCHUP EDGES";
  } else if (showNextUp) {
    const nm = fallbackEvent.shortName || fallbackEvent.name || "PGA Tour Event";
    headerEventName = `Next up: ${nm}`;
    const crs = String(fallbackEvent.courseName || "").trim();
    const loc = String(fallbackEvent.location || "").trim();
    const placeOrVenue = crs || loc;
    const dt = fallbackEvent.displayDate || "Upcoming";
    headerCourseLine = placeOrVenue ? `${placeOrVenue} • ${dt}` : dt;
    headerMonoLabel = "NEXT ON TOUR";
  } else if (hasNamedFeatured) {
    headerEventName = ce?.name || fallbackEvent?.name || "PGA TOUR";
    headerCourseLine = golfData?.currentEvent?.course
      ? `${golfData.currentEvent.course} — ${golfData.currentEvent.round || "Live"}`
      : fallbackEvent?.courseName
        ? `${fallbackEvent.courseName} — Upcoming`
        : "Ask about any player, tournament, or prop";
    headerMonoLabel = "OUTRIGHTS / PROPS / MATCHUP EDGES";
  } else if (eventFinished && !fallbackEvent) {
    headerEventName = ce?.name || identityFallback?.title || "PGA TOUR";
    headerCourseLine = golfData?.currentEvent?.course
      ? `${golfData.currentEvent.course} — Final`
      : identityFallback?.courseLine || "Ask about any player, tournament, or prop";
    headerMonoLabel = "FINAL — RESULTS & RECAP";
  } else if (identityFallback) {
    headerEventName = identityFallback.title;
    headerCourseLine = identityFallback.courseLine || "Ask about any player, tournament, or prop";
    headerMonoLabel = identityFallback.monoLabel;
  } else {
    headerEventName = ce?.name || fallbackEvent?.name || "PGA TOUR";
    headerCourseLine = golfData?.currentEvent?.course
      ? `${golfData.currentEvent.course} — ${eventFinished ? "Final" : golfData.currentEvent.round || "Live"}`
      : fallbackEvent?.courseName
        ? `${fallbackEvent.courseName} — Upcoming`
        : "Ask about any player, tournament, or prop";
    headerMonoLabel = eventFinished ? "FINAL — RESULTS & RECAP" : "OUTRIGHTS / PROPS / MATCHUP EDGES";
  }

  const weatherRow = formatGolfWeatherRow(golfData);
  const courseProfileLine = buildCourseStatsBlurb(golfData?.courseStats);

  return (
          <main ref={golfScreenRef} className={`screen${hasDockedBar ? " has-msgs" : ""}`}>
            <div className="golf-banner">
              <div style={{fontFamily:"var(--display-font)",fontSize:28,letterSpacing:1,marginBottom:2}}>{headerEventName}</div>
              <div style={{fontFamily:"var(--mono-font)",fontSize:11,color:"var(--muted)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>{headerMonoLabel}</div>
              <div style={{fontSize:12,color:"var(--soft)"}}>
                {headerCourseLine}
              </div>
              {weatherRow && (
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6, lineHeight: 1.4 }}>
                  {weatherRow}
                </div>
              )}
              {courseProfileLine && (
                <div style={{ fontSize: 13, color: "var(--soft)", marginTop: 4, lineHeight: 1.45, fontStyle: "italic" }}>
                  {courseProfileLine}
                </div>
              )}
            </div>

            {golfMsgs.length===0&&(
              <div className="golf-ask-shell" ref={golfBarRef}>
                <div className="golf-ask-label">{eventFinished ? "Recap — Golf" : "Ask Anything — Golf"}</div>
                <AskBar inputRef={golfInputRef} value={golfInput} onChange={setGolfInput} onSubmit={()=>submitGolf()} placeholder={eventFinished ? "How did the tournament finish? Biggest surprise?" : "Scheffler top 5? Best make-cut play? Matchup angle?"} btnColor="#DCE6F2" {...askBarCommon}/>
                <div className="golf-quick-btn-grid">
                  {(shellPrompts.length ? shellPrompts : [
                    "Best outright?",
                    "Top-10 value?",
                    "Course fit sleeper?",
                    "Fade favorites?",
                  ]).map((q) => (
                    <button key={q} type="button" className="quick-btn golf-quick-btn-tap" onClick={() => submitGolf(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <ChatThread
              msgs={golfMsgs}
              urTakeTrackPlay={urTakeTrackPlay}
              accessTier={accessTier}
            />

            {scheduleRows.length > 0 && (
              <>
                <div className="section-divider">PGA Tour Schedule</div>
                <div className="golf-schedule-list">
                  {scheduleRows.slice(0, 8).map((evt, idx) => {
                    const scheduleKey = `${evt?.id ?? ""}-${evt?.name ?? ""}-${idx}`;
                    const expanded = expandedScheduleKey === scheduleKey;
                    return (
                    <div
                      key={scheduleKey}
                      role="button"
                      tabIndex={0}
                      aria-expanded={expanded}
                      className="golf-odds-card golf-schedule-card"
                      onClick={() => toggleScheduleCard(scheduleKey)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleScheduleCard(scheduleKey);
                        }
                      }}
                    >
                      <div style={{fontSize:13,color:"var(--text)",fontWeight:600}}>
                        {evt?.shortName || evt?.name || "PGA Tour Event"}
                      </div>
                      <div style={{fontSize:13,color:"var(--soft)",marginTop:2}}>
                        {(evt?.displayDate || "Upcoming")}{evt?.location ? ` · ${evt.location}` : ""}
                      </div>
                      {expanded && (
                        <>
                          <div className="golf-schedule-blurb">
                            {describeTournamentStyle(evt)}
                          </div>
                          <button
                            type="button"
                            className="golf-schedule-synopsis-link"
                            onClick={(e) => {
                              e.stopPropagation();
                              submitGolf(
                                `Give me a brief tournament synopsis for ${evt?.name || "this event"}: course style, player profile that fits, and one market angle to watch this week.`,
                              );
                            }}
                          >
                            UR synopsis
                          </button>
                        </>
                      )}
                    </div>
                  );
                  })}
                </div>
              </>
            )}

            {/* Leaderboard — full field (scroll); same list is sent to /api/ur-take as golfContext */}
            {golfData?.currentEvent?.leaderboard?.length > 0 && (
              <>
                <div className="section-divider">
                  {golfData.currentEvent.name} — {eventFinished ? "Final" : golfData.currentEvent.round}
                  <span style={{ fontFamily: "var(--mono-font)", fontSize: 11, color: "var(--muted)", marginLeft: 8 }}>
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
            <div className="golf-quick-btn-grid" style={{ padding: "0 0 12px" }}>
              {quickAngles.map(([label, prompt]) => (
                <button key={label} type="button" className="quick-btn golf-quick-btn-tap" onClick={() => submitGolf(prompt)}>
                  {label}
                </button>
              ))}
            </div>

            <div className="section-divider">Ask About Any Player</div>
            <div className="golf-quick-btn-grid" style={{ padding: "0 0 8px" }}>
              {["Scheffler","Rory","Schauffele","Morikawa","Hovland","Cantlay","Rahm","Ludvig Aberg","Tom Kim","Spieth","JT","Fleetwood","Fitzpatrick","Hatton","Lowry","Matsuyama","Brian Harman","Cameron Young","Wyndham Clark","Sahith Theegala"].map(name=>(
                <button key={name} type="button" className="quick-btn golf-quick-btn-tap" onClick={()=>submitGolf(`Best betting angle for ${name} this week? Top 10, matchup, outright, or make cut?`)}>{name}</button>
              ))}
            </div>
            </>
            )}

            <div className="page-spacer"/>
          </main>
  );
}
