import UrTakeShareButton from "./UrTakeShareButton.jsx";
import { formatUrTakeSportTag } from "../lib/urTakeSportTag.js";
import { formatUrTakeTimestampEt } from "../lib/urTakeTimestampEt.js";

const LABELED_ROWS = [
  ["why", "Why"],
  ["watchFor", "Watch For"],
  ["thePlay", "The Play"],
];

/**
 * World Cup structural card — NBA Finals-style labeled fold (Card Contract v1).
 */
export default function WcTakeCard({
  headline,
  statSlots = [],
  sections = {},
  confidence = "Medium",
  contextLine = "World Cup",
  modePill = null,
  cautionText = null,
  sharePath = "",
  userQuestion = "",
  timestamp = null,
}) {
  const conf = String(confidence || "Medium").trim();
  const formattedTimestamp = formatUrTakeTimestampEt(timestamp);
  const shareQ = String(userQuestion || headline || "").trim();

  return (
    <div className="ur-take-structured ur-take-response ur-v2-card wc-take-card">
      <div className="ur-v2-sport-bar">
        <span className="ur-v2-sport-bar-tag">{formatUrTakeSportTag("worldcup")}</span>
        <span className="ur-v2-sport-bar-dot" aria-hidden>
          ·
        </span>
        <span className="ur-v2-sport-bar-ctx">{contextLine}</span>
        <span className="ur-v2-sport-bar-spacer" />
        {modePill}
      </div>

      {cautionText ? (
        <div className="ur-v2-wc-caution" role="status">
          <span className="ur-v2-wc-caution-icon" aria-hidden>
            ◷
          </span>
          <span className="ur-v2-wc-caution-text">{cautionText}</span>
        </div>
      ) : null}

      {headline ? <h2 className="wc-take-headline">{headline}</h2> : null}

      {statSlots.length > 0 ? (
        <>
          <div className="ur-v2-stat-grid wc-take-stat-grid">
            {statSlots.map((slot) => (
              <div
                key={slot.key}
                className={`ur-v2-stat-cell${slot.highlight ? " ur-v2-stat-cell--hi" : ""}`}
              >
                <div className="ur-v2-stat-label">{String(slot.label ?? "")}</div>
                <div className="ur-v2-stat-value">{String(slot.value ?? "")}</div>
              </div>
            ))}
          </div>
          <div className="ur-v2-divider" />
        </>
      ) : null}

      {LABELED_ROWS.map(([key, label]) => {
        const val = String(sections?.[key] || "").trim();
        if (!val) return null;
        return (
          <div key={key} className="wc-take-row">
            <div className="wc-take-row-label">{label}</div>
            <p className="wc-take-row-body">{val}</p>
          </div>
        );
      })}

      <div className="wc-take-footer">
        <span className="wc-take-confidence-pill">Confidence: {conf}</span>
        <div className="wc-take-footer-actions">
          {formattedTimestamp ? <span className="ur-v2-ts">{formattedTimestamp}</span> : null}
          <UrTakeShareButton
            headline={headline}
            bodyChunks={[sections?.why, sections?.thePlay, sections?.watchFor].filter(Boolean)}
            sharePath={sharePath}
          />
        </div>
      </div>
    </div>
  );
}
