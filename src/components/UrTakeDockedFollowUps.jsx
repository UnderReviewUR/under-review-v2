import { telemetryUrTakeFollowUpClick } from "../lib/urTakeTelemetry.js";

/**
 * Follow-up suggestion chips — rendered inline below the chat thread (and historically above the Ask bar).
 */
export default function UrTakeDockedFollowUps({ source, onPick }) {
  if (!source?.followUps?.length) return null;
  return (
    <div className="ur-docked-follow-ups" role="group" aria-label="Suggested follow-ups">
      {source.followUps.map((q, idx) => (
        <button
          key={`${q}-${idx}`}
          type="button"
          className="ur-take-follow-up-pill"
          onClick={() => {
            const shownAt = source.shownAt;
            const meta = {
              sourceMsgId: source.msgId,
              followUpIndex: idx,
              followUpCount: source.followUpCount,
              msSinceResponseShown: Math.max(0, Date.now() - shownAt),
              intent: source.intent,
              liveMode: source.liveMode,
              sport: source.sport,
              followUpText: q,
            };
            telemetryUrTakeFollowUpClick(meta);
            if (typeof onPick === "function") onPick(q, meta);
          }}
        >
          {q}
        </button>
      ))}
    </div>
  );
}
