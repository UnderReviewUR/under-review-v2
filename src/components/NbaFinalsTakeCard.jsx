import UrTakeShareButton from "./UrTakeShareButton.jsx";
import { formatUrTakeSportTag } from "../lib/urTakeSportTag.js";

const ROWS = [
  ["context", "Context"],
  ["thePlay", "The Play"],
  ["watchFor", "Watch For"],
  ["oneThing", "One Thing"],
];

/**
 * Scannable NBA Finals take — shareable layout (not prose walls).
 */
export default function NbaFinalsTakeCard({
  headline,
  sections,
  confidence,
  sharePath = "",
  userQuestion = "",
}) {
  const sharp = String(sections?.sharpAngle || "").trim();
  const conf = String(confidence || sections?.confidence || "Medium").trim();
  const shareQ = String(userQuestion || sharp || headline || "").trim();

  return (
    <div className="ur-take-structured ur-take-response ur-v2-card nba-finals-take-card">
      <div className="ur-v2-sport-bar">
        <span className="ur-v2-sport-bar-tag">{formatUrTakeSportTag("nba")}</span>
        <span className="ur-v2-sport-bar-dot" aria-hidden>
          ·
        </span>
        <span className="ur-v2-sport-bar-ctx">NBA Finals</span>
      </div>

      {headline ? <h2 className="nba-finals-take-headline">{headline}</h2> : null}

      {sharp ? (
        <div className="nba-finals-sharp-angle">
          <span className="nba-finals-sharp-angle-label">Sharp angle</span>
          <span className="nba-finals-sharp-angle-value">{sharp}</span>
        </div>
      ) : null}

      {ROWS.map(([key, label]) => {
        const val = String(sections?.[key] || "").trim();
        if (!val) return null;
        return (
          <div key={key} className="nba-finals-take-row">
            <div className="nba-finals-take-row-label">{label}</div>
            <p className="nba-finals-take-row-body">{val}</p>
          </div>
        );
      })}

      <div className="nba-finals-take-footer">
        <span className="nba-finals-confidence-pill">Confidence: {conf}</span>
        <UrTakeShareButton
          headline={sharp || headline}
          bodyChunks={[sections?.context, sections?.thePlay].filter(Boolean)}
          sharePath={sharePath}
        />
      </div>
    </div>
  );
}
