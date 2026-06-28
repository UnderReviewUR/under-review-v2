import { buildWcTournamentEdgeStrip } from "../../../shared/wcMatchReadModel.js";
import { isKnockoutPhase } from "../../../shared/wcPhaseUtils.js";

/**
 * TNNS-style "today's edges" — top sim-vs-market group advancement deltas (group stage only).
 */
export default function WcTournamentEdgeStrip({ mispriceContext, tournamentPhase, onAskEdge }) {
  if (isKnockoutPhase(tournamentPhase)) return null;
  const rows = buildWcTournamentEdgeStrip(mispriceContext, 3, tournamentPhase);
  if (!rows.length) return null;

  return (
    <section className="wc-edge-strip" aria-label="Tournament edges">
      <div className="wc-edge-strip__head">
        <span className="wc-edge-strip__title">Group edges</span>
        <span className="wc-edge-strip__hint">UR sim vs BDL advance lines</span>
      </div>
      <div className="wc-edge-strip__chips">
        {rows.map((row) => (
          <button
            key={`${row.group}-${row.teamAbbr}`}
            type="button"
            className="wc-edge-strip__chip"
            title={row.detail}
            onClick={() =>
              onAskEdge?.(
                `Is Group ${row.group} ${row.teamAbbr} advance mispriced? Sim ${row.simPct.toFixed(0)}% vs market ${row.impliedPct.toFixed(0)}%.`,
              )
            }
          >
            {row.label}
          </button>
        ))}
      </div>
    </section>
  );
}
