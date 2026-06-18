import { buildWcGroundingStripModel } from "../../shared/wcGroundingCardUi.js";

/**
 * Pin banner + inventory strip above WC player-props card face (Phase 1).
 */
export default function WcGroundingStrip({ pinBanner, inventoryStrip }) {
  const model = buildWcGroundingStripModel({ pinBanner, inventoryStrip });
  if (!model) return null;

  return (
    <div className="wc-grounding-strip" role="status" aria-label="Fixture grounding">
      {model.pinnedLine ? <p className="wc-grounding-strip-line wc-grounding-strip-line--pinned">{model.pinnedLine}</p> : null}
      {model.statusLine ? <p className="wc-grounding-strip-line wc-grounding-strip-line--status">{model.statusLine}</p> : null}
      {model.postedLine ? <p className="wc-grounding-strip-line wc-grounding-strip-line--posted">{model.postedLine}</p> : null}
      {model.notPostedLine ? (
        <p className="wc-grounding-strip-line wc-grounding-strip-line--not-posted">{model.notPostedLine}</p>
      ) : null}
    </div>
  );
}
