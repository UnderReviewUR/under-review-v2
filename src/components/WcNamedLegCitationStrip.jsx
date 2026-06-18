import { buildWcNamedLegCitationStripModel } from "../../shared/wcNamedLegOutputContract.js";

/**
 * Validated named-leg line — player, price, legId (Phase 4 Slice 2).
 */
export default function WcNamedLegCitationStrip({ namedLegCitation }) {
  const model = buildWcNamedLegCitationStripModel(namedLegCitation);
  if (!model) return null;

  return (
    <div className="wc-named-leg-citation" role="status" aria-label="Validated player prop line">
      <p className="wc-named-leg-citation-line wc-named-leg-citation-line--player">{model.playerLine}</p>
      <p className="wc-named-leg-citation-line wc-named-leg-citation-line--legid">{model.legIdLine}</p>
      {model.noteLine ? (
        <p className="wc-named-leg-citation-line wc-named-leg-citation-line--note">{model.noteLine}</p>
      ) : null}
    </div>
  );
}
