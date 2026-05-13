import { telemetryUrTakeFollowUpClick } from "../lib/urTakeTelemetry.js";

/**
 * Follow-up suggestion chips — parent places this above the Ask bar (fixed docked bar or matchup input).
 */
export default function UrTakeDockedFollowUps({ source, onPick }) {
  const pills = Array.isArray(source?.followUps) ? source.followUps.slice(0, 3) : [];
  if (!pills.length) return null;
  return (
    <div className="ur-docked-follow-ups" role="group" aria-label="Suggested follow-ups">
      {pills.map((q, idx) => (
        <button
          key={`${q}-${idx}`}
          type="button"
          className="ur-take-follow-up-pill"
          onMouseDown={(e) => {
            if (e.button === 0) e.preventDefault();
          }}
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
