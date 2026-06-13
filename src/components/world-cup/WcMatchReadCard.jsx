import { buildWcMatchReadDisplay } from "../../../shared/wcMatchReadModel.js";
import { wcXiStatusChipLabel } from "../../../shared/wcXiStatus.js";

function WinBar({ winBar }) {
  if (!winBar) return null;
  const total = winBar.teamA.winPct + winBar.draw + winBar.teamB.winPct || 1;
  const aW = (winBar.teamA.winPct / total) * 100;
  const dW = (winBar.draw / total) * 100;
  const bW = (winBar.teamB.winPct / total) * 100;
  return (
    <div className="wc-match-read__bar-block">
      {winBar.sourceLabel ? (
        <p className="wc-match-read__bar-label">{winBar.sourceLabel}</p>
      ) : null}
      <div className="wc-odds-labels">
        <span>
          {winBar.teamA.abbr} {winBar.teamA.winPct}%
        </span>
        <span>Draw {winBar.draw}%</span>
        <span>
          {winBar.teamB.abbr} {winBar.teamB.winPct}%
        </span>
      </div>
      <div className="wc-odds-bar">
        <span style={{ width: `${aW}%`, background: "var(--wc-blue)" }} />
        <span style={{ width: `${dW}%`, background: "var(--muted)" }} />
        <span style={{ width: `${bW}%`, background: "var(--wc-gold)" }} />
      </div>
    </div>
  );
}

function MomentumBlock({ momentum }) {
  if (!momentum) return null;
  return (
    <div className="wc-match-read__momentum">
      <div className="wc-match-read__momentum-bars">
        <div className="wc-match-read__momentum-row">
          <span className="wc-match-read__momentum-abbr">{momentum.home.abbr}</span>
          <div className="wc-match-read__momentum-track">
            <span
              className="wc-match-read__momentum-fill wc-match-read__momentum-fill--home"
              style={{ width: `${momentum.home.sharePct}%` }}
            />
          </div>
          <span className="wc-match-read__momentum-val">
            {momentum.home.index != null ? momentum.home.index.toFixed(2) : "—"}
          </span>
        </div>
        <div className="wc-match-read__momentum-row">
          <span className="wc-match-read__momentum-abbr">{momentum.away.abbr}</span>
          <div className="wc-match-read__momentum-track">
            <span
              className="wc-match-read__momentum-fill wc-match-read__momentum-fill--away"
              style={{ width: `${momentum.away.sharePct}%` }}
            />
          </div>
          <span className="wc-match-read__momentum-val">
            {momentum.away.index != null ? momentum.away.index.toFixed(2) : "—"}
          </span>
        </div>
      </div>
      {momentum.players?.length ? (
        <ul className="wc-match-read__players">
          {momentum.players.map((p) => (
            <li key={`${p.abbr}-${p.name}`}>
              <span>{p.name}</span>
              <span>
                {p.index != null ? p.index.toFixed(2) : "—"}
                {p.shotsOnTarget ? ` · ${p.shotsOnTarget} SOT` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * TNNS-style instant match read — deterministic, no LLM.
 */
export default function WcMatchReadCard({
  match,
  teams,
  detail = null,
  mispriceContext = null,
  compact = false,
  onGoDeeper = null,
  showGoDeeper = true,
}) {
  const display = buildWcMatchReadDisplay({ match, teams, detail, mispriceContext });
  if (!display) return null;

  const xiChip =
    display.xiStatus && display.mode === "pre"
      ? wcXiStatusChipLabel(display.xiStatus)
      : "";

  return (
    <section
      className={`wc-match-read${compact ? " wc-match-read--compact" : ""} wc-match-read--${display.mode}`}
      aria-label="Match read"
    >
      <div className="wc-match-read__head">
        <span className="wc-match-read__badge">{display.badge}</span>
        {xiChip ? <span className="wc-match-read__xi">{xiChip}</span> : null}
      </div>
      {display.headline ? <p className="wc-match-read__headline">{display.headline}</p> : null}
      {display.subline && !compact ? (
        <p className="wc-match-read__subline">{display.subline}</p>
      ) : null}

      {display.mode === "live" ? <MomentumBlock momentum={display.momentum} /> : null}

      {display.winBar && display.mode !== "live" ? <WinBar winBar={display.winBar} /> : null}
      {display.winBar && display.mode === "live" && !display.momentum ? (
        <WinBar winBar={display.winBar} />
      ) : null}

      {display.groupEdge ? (
        <div className="wc-match-read__edge-chip" title={display.groupEdge.detail}>
          <span className="wc-match-read__edge-label">{display.groupEdge.label}</span>
        </div>
      ) : null}

      {showGoDeeper && onGoDeeper ? (
        <button
          type="button"
          className="wc-match-read__deeper-btn"
          onClick={() => onGoDeeper(match, display.askPrompt)}
        >
          Go deeper →
        </button>
      ) : null}
    </section>
  );
}
