import { useEffect, useState, useMemo } from "react";
import AskBar from "../components/AskBar.jsx";
import UrChatDockScrollSpacer from "../components/UrChatDockScrollSpacer.jsx";
import { ChatThread, golfScoreColor } from "../features/app/helpers.jsx";
import { buildGolfSessionBoardFromData } from "../lib/golfSessionBoard.js";
import { classifyGolfEvent, EVENT_VALIDITY } from "../../shared/eventValidity.js";
import { isGolfEventFinished } from "../lib/golfEventStatus.js";
import { resolveGolfPrimaryEvent } from "../../shared/golfHomeEventSelection.js";
import { deriveGolfEventState, getQuickPromptsForState } from "../lib/getQuickPromptsForState.js";
import { buildGolfDailyAngles, buildGolfStandingsRows } from "../../shared/golfDailyAngles.js";

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
      monoLabel: "FINAL",
    };
  }
  if (lastKnownSnapshot?.name || lastKnownSnapshot?.shortName) {
    const title = lastKnownSnapshot.shortName || lastKnownSnapshot.name;
    const crs = String(lastKnownSnapshot.course || "").trim();
    const v = lastKnownSnapshot.lastKnownValidity;
    if (v === EVENT_VALIDITY.FINISHED) {
      return { title, courseLine: crs ? `${crs} — Final` : null, monoLabel: "FINAL" };
    }
    if (v === EVENT_VALIDITY.ACTIVE) {
      return { title, courseLine: crs ? `${crs} — Live` : null, monoLabel: "LIVE" };
    }
    return { title, courseLine: crs ? `${crs} — Upcoming` : null, monoLabel: "UPCOMING" };
  }
  return null;
}

function GolfCourseOverviewSection({ overview }) {
  if (!overview) return null;
  return (
    <section className="golf-board-section">
      <div className="section-divider">Course</div>
      <div className="golf-board-card">
        {overview.courseName ? (
          <div className="golf-board-card-title">{overview.courseName}</div>
        ) : null}
        {overview.location ? (
          <div className="golf-board-card-sub">{overview.location}</div>
        ) : null}
        {overview.factsLine ? (
          <div className="golf-board-card-facts">{overview.factsLine}</div>
        ) : null}
        {overview.styleBlurb ? (
          <p className="golf-board-card-copy">{overview.styleBlurb}</p>
        ) : null}
        {overview.statsBlurb ? (
          <p className="golf-board-card-copy golf-board-card-copy--muted">{overview.statsBlurb}</p>
        ) : null}
        {overview.weatherLine ? (
          <p className="golf-board-card-copy golf-board-card-copy--muted">{overview.weatherLine}</p>
        ) : null}
        {overview.cutLineNote ? (
          <p className="golf-board-card-copy golf-board-card-copy--muted">{overview.cutLineNote}</p>
        ) : null}
      </div>
    </section>
  );
}

function GolfDailyTipsSection({ tips }) {
  if (!Array.isArray(tips) || tips.length === 0) return null;
  return (
    <section className="golf-board-section">
      <div className="section-divider">Today&apos;s tips</div>
      <ul className="golf-board-tips">
        {tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </section>
  );
}

function GolfSleepersFadersSection({ sleepers, faders, onAsk }) {
  if (!sleepers?.length && !faders?.length) return null;
  return (
    <section className="golf-board-section">
      <div className="section-divider">Sleepers &amp; faders</div>
      <div className="golf-board-picks">
        {sleepers?.length ? (
          <div className="golf-board-picks-col">
            <div className="golf-board-picks-label">Sleepers</div>
            {sleepers.map((s) => (
              <button
                key={s.name}
                type="button"
                className="golf-board-pick golf-board-pick--sleeper"
                onClick={() => onAsk(`Why is ${s.name} a sleeper this week — course fit, form, and the best market to capture it?`)}
              >
                <span className="golf-board-pick-name">{s.name}</span>
                <span className="golf-board-pick-reason">{s.reason}</span>
              </button>
            ))}
          </div>
        ) : null}
        {faders?.length ? (
          <div className="golf-board-picks-col">
            <div className="golf-board-picks-label">Faders</div>
            {faders.map((f) => (
              <button
                key={f.name}
                type="button"
                className="golf-board-pick golf-board-pick--fader"
                onClick={() => onAsk(`Why fade ${f.name} this week — where is the board too bullish?`)}
              >
                <span className="golf-board-pick-name">{f.name}</span>
                <span className="golf-board-pick-reason">{f.reason}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function GolfStandingsSection({ standings, eventLabel, eventFinished, onAskPlayer }) {
  if (!standings?.length) return null;
  return (
    <section className="golf-board-section">
      <div className="section-divider">
        {eventLabel}
        <span className="golf-board-count">{standings.length} shown</span>
      </div>
      <div className="golf-board-standings">
        {standings.map((row, i) => (
          <button
            key={`${row.position}-${row.name}-${i}`}
            type="button"
            className="golf-leaderboard-card"
            onClick={() =>
              onAskPlayer(
                eventFinished
                  ? `How did ${row.name} finish this event — final position and what the board says about their week?`
                  : `Best betting angle on ${row.name} right now? Outright, top-10, or matchup?`,
              )
            }
          >
            <div className="golf-pos">{row.position}</div>
            <div className="golf-player-info">
              <div className="golf-player-name">{row.name}</div>
              {row.country ? <div className="golf-player-country">{row.country}</div> : null}
            </div>
            <div className="golf-score">
              <span className="golf-score-num" style={{ color: golfScoreColor(row.score) }}>
                {row.score}
              </span>
              {row.thru && row.thru !== "—" ? (
                <span className="golf-score-label">{row.thru === "F" ? "FINAL" : `THRU ${row.thru}`}</span>
              ) : null}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
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
  onUrTakeFollowUpPick = null,
  onUpgradePromptClick = null,
}) {
  const [lastKnownEventSnapshot, setLastKnownEventSnapshot] = useState(null);

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

  const featuredEvent = golfData ? resolveGolfPrimaryEvent(golfData) : null;
  const eventFinished = isGolfEventFinished(golfData);
  const golfPhase = deriveGolfEventState(golfData);
  const shellPrompts = getQuickPromptsForState("golf", eventFinished ? "final" : golfPhase);
  const scheduleRows = Array.isArray(golfData?.tourSchedule) ? golfData.tourSchedule : [];
  const fallbackEvent = scheduleRows[0] || null;
  const ce = featuredEvent || golfData?.currentEvent;
  const validity = classifyGolfEvent(ce || null);
  const hasNamedFeatured =
    Boolean(ce && (ce.name || ce.shortName)) &&
    (validity === EVENT_VALIDITY.ACTIVE || validity === EVENT_VALIDITY.UPCOMING);
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
    headerMonoLabel = eventFinished ? "FINAL" : "LIVE";
  } else if (showNextUp) {
    const nm = fallbackEvent.shortName || fallbackEvent.name || "PGA Tour Event";
    headerEventName = `Next up: ${nm}`;
    const crs = String(fallbackEvent.courseName || "").trim();
    const loc = String(fallbackEvent.location || "").trim();
    const placeOrVenue = crs || loc;
    const dt = fallbackEvent.displayDate || "Upcoming";
    headerCourseLine = placeOrVenue ? `${placeOrVenue} · ${dt}` : dt;
    headerMonoLabel = "UPCOMING";
  } else if (hasNamedFeatured) {
    headerEventName = ce?.name || fallbackEvent?.name || "PGA TOUR";
    const featuredCourse = ce?.course || ce?.courseName || null;
    const featuredRound =
      ce?.round || (classifyGolfEvent(ce) === EVENT_VALIDITY.UPCOMING ? "Pre-Market" : "Live");
    headerCourseLine = featuredCourse
      ? `${featuredCourse} — ${featuredRound}`
      : fallbackEvent?.courseName
        ? `${fallbackEvent.courseName} — Upcoming`
        : "Ask about any player or market";
    headerMonoLabel = eventFinished ? "FINAL" : "LIVE";
  } else if (identityFallback) {
    headerEventName = identityFallback.title;
    headerCourseLine = identityFallback.courseLine || "Ask about any player or market";
    headerMonoLabel = identityFallback.monoLabel;
  } else {
    headerEventName = ce?.name || fallbackEvent?.name || "PGA TOUR";
    headerCourseLine = golfData?.currentEvent?.course
      ? `${golfData.currentEvent.course} — ${eventFinished ? "Final" : golfData.currentEvent.round || "Live"}`
      : fallbackEvent?.courseName
        ? `${fallbackEvent.courseName} — Upcoming`
        : "Ask about any player or market";
    headerMonoLabel = eventFinished ? "FINAL" : "LIVE";
  }

  const dailyAngles = useMemo(() => buildGolfDailyAngles(golfData), [golfData]);
  const standings = useMemo(() => buildGolfStandingsRows(golfData, 25), [golfData]);
  const standingsLabel = `${ce?.name || golfData?.currentEvent?.name || "Leaderboard"} — ${
    eventFinished ? "Final" : ce?.round || golfData?.currentEvent?.round || "Live"
  }`;

  const urDockedChat = hasDockedBar && golfMsgs.length > 0;
  const golfSessionBoard = useMemo(() => buildGolfSessionBoardFromData(golfData), [golfData]);
  const chatThreadProps = {
    msgs: golfMsgs,
    urTakeTrackPlay,
    accessTier,
    onUrTakeFollowUpPick,
    onUpgradePromptClick,
    hideFollowUpDock: true,
    golfSessionBoard,
  };

  const golfBoardBelow = (
    <>
      <GolfCourseOverviewSection overview={dailyAngles.overview} />
      <GolfDailyTipsSection tips={dailyAngles.tips} />
      <GolfSleepersFadersSection sleepers={dailyAngles.sleepers} faders={dailyAngles.faders} onAsk={submitGolf} />
      <GolfStandingsSection
        standings={standings}
        eventLabel={standingsLabel}
        eventFinished={eventFinished}
        onAskPlayer={submitGolf}
      />
    </>
  );

  return (
    <main ref={golfScreenRef} className={`screen${urDockedChat ? " has-msgs screen--ur-chat" : hasDockedBar ? " has-msgs" : ""}`}>
      <div className="golf-banner">
        <div style={{ fontFamily: "var(--display-font)", fontSize: 28, letterSpacing: 1, marginBottom: 2 }}>
          {headerEventName}
        </div>
        <div
          style={{
            fontFamily: "var(--mono-font)",
            fontSize: 11,
            color: "var(--muted)",
            letterSpacing: 2,
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          {headerMonoLabel}
        </div>
        <div style={{ fontSize: 12, color: "var(--soft)" }}>{headerCourseLine}</div>
      </div>

      {golfMsgs.length === 0 && (
        <div className="golf-ask-shell" ref={golfBarRef}>
          <div className="golf-ask-label">{eventFinished ? "Recap — Golf" : "Ask Anything — Golf"}</div>
          <AskBar
            inputRef={golfInputRef}
            value={golfInput}
            onChange={setGolfInput}
            onSubmit={() => submitGolf()}
            placeholder={
              eventFinished
                ? "How did the tournament finish? Biggest surprise?"
                : "Best U.S. Open angle? Sleeper? Fade the leader?"
            }
            btnColor="#DCE6F2"
            {...askBarCommon}
          />
          <div className="golf-quick-btn-grid">
            {(shellPrompts.length
              ? shellPrompts
              : ["Best outright?", "Top-10 value?", "Course fit sleeper?", "Fade favorites?"]
            ).map((q) => (
              <button key={q} type="button" className="quick-btn golf-quick-btn-tap" onClick={() => submitGolf(q)}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {urDockedChat ? (
        <div className="ur-chat-scroll">
          <ChatThread {...chatThreadProps} variant="urChatDocked" />
          {golfBoardBelow}
          <UrChatDockScrollSpacer />
        </div>
      ) : (
        <>
          <ChatThread {...chatThreadProps} />
          {golfBoardBelow}
          <div className="page-spacer" />
        </>
      )}
    </main>
  );
}
