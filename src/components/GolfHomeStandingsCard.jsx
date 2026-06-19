import { useMemo } from "react";

import { golfScoreColor } from "../features/app/helpers.jsx";
import { getGolfHomeValidity, isGolfEventFinished } from "../lib/golfEventStatus.js";
import { resolveGolfPrimaryEvent } from "../../shared/golfHomeEventSelection.js";
import { buildGolfDailyAngles, buildGolfStandingsRows } from "../../shared/golfDailyAngles.js";

/**
 * Prominent live golf standings on Home — tap opens Golf tab.
 */
export default function GolfHomeStandingsCard({ golfData, golfLoading, onOpenGolf }) {
  const payload = useMemo(() => {
    if (!golfData || golfLoading || isGolfEventFinished(golfData)) return null;
    const validity = getGolfHomeValidity(golfData);
    if (!validity.isActive) return null;

    const event = resolveGolfPrimaryEvent(golfData) || golfData.currentEvent;
    const standings = buildGolfStandingsRows(golfData, 8);
    if (!standings.length) return null;

    const angles = buildGolfDailyAngles(golfData);
    const fetchedTs = Date.parse(String(golfData?.sourceMeta?.fetchedAt || ""));
    let freshness = "Updated recently";
    if (!Number.isNaN(fetchedTs)) {
      const ageMin = Math.max(0, Math.round((Date.now() - fetchedTs) / 60000));
      if (ageMin <= 1) freshness = "Updated just now";
      else if (ageMin < 60) freshness = `Updated ${ageMin}m ago`;
      else freshness = `Updated ${Math.round(ageMin / 60)}h ago`;
    }

    return {
      eventName: event?.shortName || event?.name || "PGA Tour",
      round: event?.round || "Live",
      course: event?.course || event?.courseName || null,
      standings,
      sleepers: angles.sleepers.slice(0, 2),
      faders: angles.faders.slice(0, 2),
      freshness,
    };
  }, [golfData, golfLoading]);

  if (!payload) return null;

  return (
    <section className="golf-home-standings" aria-label={`${payload.eventName} live standings`}>
      <button type="button" className="golf-home-standings-btn" onClick={onOpenGolf}>
        <div className="golf-home-standings-head">
          <div>
            <div className="golf-home-standings-kicker">Golf · Live</div>
            <div className="golf-home-standings-title">{payload.eventName}</div>
            {payload.course ? (
              <div className="golf-home-standings-meta">
                {payload.course} · {payload.round}
              </div>
            ) : (
              <div className="golf-home-standings-meta">{payload.round}</div>
            )}
          </div>
          <span className="golf-home-standings-chev" aria-hidden>
            ›
          </span>
        </div>

        <div className="golf-home-standings-table">
          {payload.standings.map((row) => (
            <div key={`${row.position}-${row.name}`} className="golf-home-standings-row">
              <span className="golf-home-standings-pos">{row.position}</span>
              <span className="golf-home-standings-name">
                {row.shortName || row.name}
                {row.thru && row.thru !== "—" && row.thru !== "-" && row.thru !== "F" ? (
                  <span className="golf-home-standings-thru"> ({row.thru})</span>
                ) : null}
              </span>
              <span
                className="golf-home-standings-score"
                style={{ color: golfScoreColor(row.score) }}
              >
                {row.score}
              </span>
            </div>
          ))}
        </div>

        {payload.sleepers.length > 0 || payload.faders.length > 0 ? (
          <div className="golf-home-standings-angles">
            {payload.sleepers.map((s) => (
              <div key={`s-${s.name}`} className="golf-home-standings-angle golf-home-standings-angle--sleeper">
                <span className="golf-home-standings-angle-label">Sleeper</span>
                <span className="golf-home-standings-angle-text">
                  {s.name} — {s.reason}
                </span>
              </div>
            ))}
            {payload.faders.map((f) => (
              <div key={`f-${f.name}`} className="golf-home-standings-angle golf-home-standings-angle--fader">
                <span className="golf-home-standings-angle-label">Fade</span>
                <span className="golf-home-standings-angle-text">
                  {f.name} — {f.reason}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="golf-home-standings-foot">
          <span>{payload.freshness}</span>
          <span className="golf-home-standings-open">Full board & tips →</span>
        </div>
      </button>
    </section>
  );
}
