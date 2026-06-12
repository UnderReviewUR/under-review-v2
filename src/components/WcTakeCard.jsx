import { useState } from "react";
import UrTakeShareButton from "./UrTakeShareButton.jsx";
import { formatUrTakeSportTag } from "../lib/urTakeSportTag.js";
import { formatUrTakeTimestampEt } from "../lib/urTakeTimestampEt.js";
import { formatWcCardSectionLines } from "../lib/wcTakeCardUi.js";

function WcPlayHeadline({ text, focusLayout }) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const body = raw.replace(/^lean:\s*/i, "").trim();
  const isPass = /^pass/i.test(body);
  if (focusLayout) {
    return (
      <div className="wc-take-play-block">
        <span className={`wc-take-verdict-pill${isPass ? " wc-take-verdict-pill--pass" : ""}`}>
          {isPass ? "Pass" : "Lean"}
        </span>
        <h2 className="wc-take-headline">{body.replace(/^pass\s*[—-]\s*/i, "")}</h2>
      </div>
    );
  }
  return <h2 className="wc-take-headline">{raw}</h2>;
}

function splitWcLadderBreakdownLines(text) {
  const t = String(text || "").trim();
  if (!t) return [];
  if (t.includes("\n")) {
    return t
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
  }
  return t
    .split(/(?=Over \d+(?:\.\d+)? ·)/i)
    .map((l) => l.trim())
    .filter(Boolean);
}

function WcBreakdownBody({ text }) {
  const lines = splitWcLadderBreakdownLines(text);
  const isLadder = lines.some((l) => /^Over \d+ ·/i.test(l));
  if (!isLadder) {
    return <div className="wc-take-breakdown-body">{text}</div>;
  }
  return (
    <div className="wc-ladder-grid">
      {lines.map((line, i) => {
        if (/isn't posted/i.test(line)) {
          return (
            <p key={`${i}-note`} className="wc-ladder-note">
              {line}
            </p>
          );
        }
        if (/^Over \d+ ·/i.test(line)) {
          const hi = line.includes("✓");
          return (
            <div key={`${i}-row`} className={`wc-ladder-row${hi ? " wc-ladder-row--hi" : ""}`}>
              {line}
            </div>
          );
        }
        return (
          <p key={`${i}-ctx`} className="wc-ladder-context">
            {line}
          </p>
        );
      })}
    </div>
  );
}

function WcSectionBody({ text, stacked = false }) {
  const lines = formatWcCardSectionLines(text);
  if (!lines.length) return null;
  if (!stacked || lines.length === 1) {
    return <p className="wc-take-row-body">{lines[0]}</p>;
  }
  return (
    <div className="wc-take-row-body wc-take-row-body--stacked">
      {lines.map((line, i) => (
        <p key={`${i}-${line.slice(0, 24)}`} className="wc-take-row-line">
          {line}
        </p>
      ))}
    </div>
  );
}

const LABELED_ROWS = [
  ["why", "Why"],
  ["watchFor", "Watch For"],
  ["thePlay", "The Play"],
];

/**
 * World Cup structural card — scannable card face + optional full breakdown.
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
  breakdownText = "",
  breakdownAvailable = false,
  predictionSlots = [],
  focusLayout = false,
  collapsed = false,
  modelAttribution = null,
}) {
  const [breakdownExpanded, setBreakdownExpanded] = useState(false);
  const [expandedFromCollapse, setExpandedFromCollapse] = useState(false);
  const showCollapsed = Boolean(collapsed && !expandedFromCollapse);
  const effectiveFocusLayout = focusLayout || (collapsed && expandedFromCollapse);
  const conf = String(confidence || "Medium").trim();
  const formattedTimestamp = formatUrTakeTimestampEt(timestamp);
  const shareQ = String(userQuestion || headline || "").trim();
  const deep = String(breakdownText || "").trim();
  const showBreakdownToggle = Boolean(breakdownAvailable && deep);
  const slots = Array.isArray(predictionSlots)
    ? predictionSlots.filter((s) => s && String(s.value || "").trim())
    : [];
  const statGridHasConfidence = statSlots.some(
    (slot) => String(slot.label || "").toLowerCase() === "confidence",
  );

  if (showCollapsed) {
    const collapsedWhy = String(sections?.why || "").trim();
    return (
      <button
        type="button"
        className="ur-take-structured ur-take-response ur-v2-card wc-take-card wc-take-card--collapsed"
        onClick={() => setExpandedFromCollapse(true)}
        aria-expanded={false}
      >
        {headline ? (
          <span className="wc-take-collapsed-headline">{headline.replace(/^lean:\s*/i, "")}</span>
        ) : null}
        {collapsedWhy ? <span className="wc-take-collapsed-why">{collapsedWhy}</span> : null}
        <span className="wc-take-collapsed-hint">Tap to expand</span>
      </button>
    );
  }

  return (
    <div className={`ur-take-structured ur-take-response ur-v2-card wc-take-card${effectiveFocusLayout ? " wc-take-card--focus" : ""}`}>
      {!effectiveFocusLayout ? (
        <div className="ur-v2-sport-bar">
          <span className="ur-v2-sport-bar-tag">{formatUrTakeSportTag("worldcup")}</span>
          <span className="ur-v2-sport-bar-dot" aria-hidden>
            ·
          </span>
          <span className="ur-v2-sport-bar-ctx">{contextLine}</span>
          <span className="ur-v2-sport-bar-spacer" />
          {modePill}
        </div>
      ) : null}

      {!effectiveFocusLayout && cautionText ? (
        <div className="ur-v2-wc-caution" role="status">
          <span className="ur-v2-wc-caution-icon" aria-hidden>
            ◷
          </span>
          <span className="ur-v2-wc-caution-text">{cautionText}</span>
        </div>
      ) : null}

      {headline ? <WcPlayHeadline text={headline} focusLayout={effectiveFocusLayout} /> : null}

      {effectiveFocusLayout && sections?.why ? (
        <p className="wc-take-context-line">{sections.why}</p>
      ) : null}

      {!effectiveFocusLayout && statSlots.length > 0 ? (
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

      {slots.length > 0 ? (
        <>
          {slots.map((slot) => (
            <div key={slot.key || slot.label} className="wc-take-row wc-take-prediction-slot">
              <div className="wc-take-row-label">{String(slot.label ?? "")}</div>
              <p className="wc-take-row-body">{String(slot.value ?? "")}</p>
            </div>
          ))}
          <div className="ur-v2-divider" />
        </>
      ) : null}

      {!effectiveFocusLayout
        ? LABELED_ROWS.map(([key, label]) => {
            const val = String(sections?.[key] || "").trim();
            if (!val) return null;
            return (
              <div key={key} className="wc-take-row">
                <div className="wc-take-row-label">{label}</div>
                <WcSectionBody text={val} stacked={key === "why"} />
              </div>
            );
          })
        : null}

      {showBreakdownToggle && !breakdownExpanded ? (
        <button
          type="button"
          className={`ur-v2-body-expand wc-take-breakdown-toggle${effectiveFocusLayout ? " wc-take-breakdown-toggle--focus" : ""}`}
          onClick={() => setBreakdownExpanded(true)}
        >
          Full breakdown
        </button>
      ) : null}

      {showBreakdownToggle && breakdownExpanded ? (
        <div className="wc-take-breakdown-panel">
          <div className="wc-take-breakdown-label">Full breakdown</div>
          <WcBreakdownBody text={deep} />
          <button
            type="button"
            className="ur-v2-body-expand wc-take-breakdown-toggle"
            onClick={() => setBreakdownExpanded(false)}
          >
            Show less
          </button>
        </div>
      ) : null}

      {!effectiveFocusLayout ? (
        <div className="wc-take-footer">
          {!statGridHasConfidence ? (
            <span className="wc-take-confidence-pill">Confidence: {conf}</span>
          ) : (
            <span />
          )}
          <div className="wc-take-footer-actions">
            {modelAttribution ? (
              <span className="wc-take-model-attribution">{modelAttribution}</span>
            ) : null}
            {formattedTimestamp ? <span className="ur-v2-ts">{formattedTimestamp}</span> : null}
            <UrTakeShareButton
              headline={headline}
              bodyChunks={[sections?.why, sections?.thePlay, sections?.watchFor].filter(Boolean)}
              sharePath={sharePath}
              predictionSlots={predictionSlots}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
