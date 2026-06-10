import { telemetryUrTakeFollowUpClick } from "../lib/urTakeTelemetry.js";
import { textOrEmpty } from "../lib/urTakeRenderSafe.js";
import UrTakeFollowUpPanel from "./UrTakeFollowUpPanel.jsx";

/**
 * Follow-up suggestion chips — thread tail or docked Ask bar (via className modifier).
 */
export default function UrTakeDockedFollowUps({ source, onPick, panelClassName = "", focusSession = false, kicker, maxChips = 3 }) {
  const pills = Array.isArray(source?.followUps)
    ? source.followUps.slice(0, maxChips).map((q) => textOrEmpty(q, 320).trim()).filter(Boolean)
    : [];
  if (!pills.length) return null;

  return (
    <UrTakeFollowUpPanel
      className={panelClassName}
      kicker={kicker ?? (focusSession ? "Push back" : "Go deeper")}
      labels={pills}
      onPick={(q, idx) => {
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
    />
  );
}
