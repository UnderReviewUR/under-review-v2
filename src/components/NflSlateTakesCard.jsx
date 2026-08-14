import { useMemo } from "react";

import {
  NFL_SLATE_TAKES_PRO_CTA,
  NFL_SLATE_TAKES_PRO_HINT,
  buildNflSlateTakes,
} from "../../shared/nflSlateTakes.js";

/**
 * Free front door: three takes on the board. No THE PLAY stamp.
 * Extra board-backed takes stay behind Pro. Ask closer keeps THE PLAY.
 */
function LaneBody({ row }) {
  return (
    <>
      <div className="nfl-slate-takes__lane-top">
        <span className="nfl-slate-takes__matchup">{row.matchup}</span>
      </div>
      <div className="nfl-slate-takes__lean">{row.lean}</div>
      <p className="nfl-slate-takes__why">{row.why}</p>
    </>
  );
}

export default function NflSlateTakesCard({
  games = [],
  asOf = null,
  isUnlimited = false,
  askLive = false,
  onOpenUpgrade = null,
  onSelectLane = null,
  onSeeBoard = null,
}) {
  const card = useMemo(() => buildNflSlateTakes(games, { asOf }), [games, asOf]);
  if (!card) return null;

  const extras = card.extra || [];
  const showLocked = !isUnlimited && extras.length > 0;
  const showUnlocked = isUnlimited && extras.length > 0;
  const canAsk = askLive && typeof onSelectLane === "function";

  return (
    <section className="nfl-slate-takes" aria-label="On this board">
      <div className="nfl-slate-takes__kicker">{card.kicker}</div>
      <h2 className="nfl-slate-takes__title">{card.title}</h2>
      <p className="nfl-slate-takes__sub">{card.subtitle}</p>

      <ul className="nfl-slate-takes__lanes">
        {card.lanes.map((lane) => {
          const clickable = canAsk;
          const Tag = clickable ? "button" : "div";
          return (
            <li key={lane.kind}>
              <Tag
                type={clickable ? "button" : undefined}
                className={`nfl-slate-takes__lane nfl-slate-takes__lane--${lane.kind}${clickable ? " nfl-slate-takes__lane--btn" : ""}`}
                onClick={clickable ? () => onSelectLane(lane) : undefined}
              >
                <LaneBody row={lane} />
              </Tag>
            </li>
          );
        })}
      </ul>

      {showUnlocked
        ? extras.map((row) => (
            <div key={`${row.kind}-${row.gameKey}`} className="nfl-slate-takes__lane nfl-slate-takes__lane--extra">
              <LaneBody row={row} />
              {canAsk ? (
                <button
                  type="button"
                  className="nfl-slate-takes__ask"
                  onClick={() => onSelectLane(row)}
                >
                  Unpack this take →
                </button>
              ) : null}
            </div>
          ))
        : null}

      {showLocked ? (
        <div className="nfl-slate-takes__paywall">
          <div className="nfl-slate-takes__locked" aria-hidden="true">
            {extras.map((row) => (
              <div key={`${row.kind}-${row.gameKey}`} className="nfl-slate-takes__teaser">
                <span className="nfl-slate-takes__teaser-matchup">{row.matchup}</span>
                <span className="nfl-slate-takes__teaser-dots">•••</span>
              </div>
            ))}
          </div>
          <p className="nfl-slate-takes__hint">{NFL_SLATE_TAKES_PRO_HINT}</p>
          {typeof onOpenUpgrade === "function" ? (
            <button type="button" className="nfl-slate-takes__cta" onClick={onOpenUpgrade}>
              {NFL_SLATE_TAKES_PRO_CTA} →
            </button>
          ) : null}
        </div>
      ) : null}

      {typeof onSeeBoard === "function" ? (
        <button type="button" className="nfl-slate-takes__board" onClick={onSeeBoard}>
          See the live board →
        </button>
      ) : null}
    </section>
  );
}
