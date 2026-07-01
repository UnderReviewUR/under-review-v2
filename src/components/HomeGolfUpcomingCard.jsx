import { golfEventStartMs } from "../../shared/golfHomeEventSelection.js";

function formatUpcomingStart(event, nowMs = Date.now()) {
  const ms = golfEventStartMs(event, nowMs);
  if (!Number.isFinite(ms)) {
    return String(event?.displayDate || event?.startDate || "Soon").trim();
  }
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "America/New_York",
    }).format(new Date(ms));
  } catch {
    return "Soon";
  }
}

/**
 * Upcoming PGA week — shown when live leaderboard is unavailable.
 */
export default function HomeGolfUpcomingCard({ event, onOpenGolf, onAsk }) {
  if (!event) return null;
  const name = event.shortName || event.name || "PGA Tour";
  const course =
    event.courseName ||
    (typeof event.course === "string" ? event.course : event.course?.name) ||
    null;
  const starts = formatUpcomingStart(event);

  return (
    <section className="home-golf-upcoming-card" aria-label={`${name} upcoming`}>
      <button type="button" className="home-golf-upcoming-card__btn" onClick={onOpenGolf}>
        <div className="home-golf-upcoming-card__kicker">Golf · Upcoming</div>
        <div className="home-golf-upcoming-card__title">{name}</div>
        <div className="home-golf-upcoming-card__meta">
          {course ? `${course} · ` : ""}
          Starts {starts}
        </div>
        {onAsk ? (
          <button
            type="button"
            className="home-golf-upcoming-card__ask"
            onClick={(e) => {
              e.stopPropagation();
              onAsk(`Who's mispriced at ${name} before the week starts?`);
            }}
          >
            Ask who&apos;s mispriced →
          </button>
        ) : null}
      </button>
    </section>
  );
}
