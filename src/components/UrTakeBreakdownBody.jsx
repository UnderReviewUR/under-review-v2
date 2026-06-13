import { parseWcBreakdownSections, groupWcBreakdownSectionsIntoBlocks, splitWcBreakdownPreambleBlocks } from "../../shared/wcBreakdownParse.js";
import { sanitizeUrTakeUserFacingProse } from "../../shared/wcUserFacingCopy.js";

function splitPropLadderBreakdownLines(text) {
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

/**
 * Labeled Full breakdown body — WC, NBA, and other structured UR Takes.
 */
export default function UrTakeBreakdownBody({ text }) {
  const clean = sanitizeUrTakeUserFacingProse(text);
  const lines = splitPropLadderBreakdownLines(clean);
  const isLadder = lines.some((l) => /^Over \d+ ·/i.test(l));
  if (!isLadder) {
    const { preamble, sections } = parseWcBreakdownSections(clean);
    if (sections.length || preamble) {
      const preambleBlocks = splitWcBreakdownPreambleBlocks(preamble);
      const sectionBlocks = groupWcBreakdownSectionsIntoBlocks(sections);
      return (
        <div className="wc-take-breakdown-body wc-take-breakdown-body--stacked">
          {preambleBlocks.map((block) => (
            <p key={block.slice(0, 48)} className="wc-take-breakdown-block">
              {block}
            </p>
          ))}
          {sectionBlocks.map((group) => {
            const isMatchBlock = group[0]?.key === "match";
            return (
              <div
                key={`${group[0]?.key}-${group[0]?.body.slice(0, 32)}`}
                className={isMatchBlock ? "wc-take-slate-match-block" : "wc-take-breakdown-section-group"}
              >
                {group.map((section) => (
                  <div
                    key={`${section.key}-${section.body.slice(0, 32)}`}
                    className={`wc-take-breakdown-section${section.key === "match" ? " wc-take-breakdown-section--match" : ""}${section.key === "kickoff" ? " wc-take-breakdown-section--kickoff" : ""}`}
                  >
                    <div className="wc-take-row-label">{section.label}</div>
                    <p className="wc-take-row-body">{section.body}</p>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      );
    }
    const blocks = splitWcBreakdownPreambleBlocks(clean);
    if (blocks.length > 1) {
      return (
        <div className="wc-take-breakdown-body wc-take-breakdown-body--stacked">
          {blocks.map((block) => (
            <p key={block.slice(0, 48)} className="wc-take-breakdown-block">
              {block}
            </p>
          ))}
        </div>
      );
    }
    return <div className="wc-take-breakdown-body">{clean}</div>;
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
