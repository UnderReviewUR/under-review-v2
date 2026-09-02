import { useMemo } from "react";

import { buildHomeEngageLanes } from "../features/home/buildHomeEngageLanes.js";

/**
 * Board-style team bet + prop lanes — first block after the Ask bar.
 */
export default function HomeEngageLanes({
  nflGames = [],
  laligaMatches = [],
  nflPropLines = [],
  laligaPropLines = [],
  nflUrTakeGated = true,
  laligaUrTakeGated = true,
  onPrompt = null,
  onOpenSport = null,
}) {
  const lanes = useMemo(
    () =>
      buildHomeEngageLanes({
        nflGames,
        laligaMatches,
        nflPropLines,
        laligaPropLines,
        nflUrTakeGated,
        laligaUrTakeGated,
      }),
    [nflGames, laligaMatches, nflPropLines, laligaPropLines, nflUrTakeGated, laligaUrTakeGated],
  );

  if (!lanes.length) return null;

  const canPrompt = typeof onPrompt === "function";
  const canOpen = typeof onOpenSport === "function";

  return (
    <section className="ur-home-board-lanes" aria-label="Team bets and player props">
      <div className="ur-home-board-lanes__head">
        <div className="ur-home-board-lanes__kicker">On the board</div>
        <h2 className="ur-home-board-lanes__title">Team bets &amp; player props</h2>
        <p className="ur-home-board-lanes__sub">Posted lines — tap for bet, fade, or pass</p>
      </div>

      <div className="ur-home-board-lanes__grid">
        {lanes.map((lane) => (
          <article
            key={lane.id}
            className={`ur-home-board-lane ur-home-board-lane--${lane.sport}`}
          >
            <button
              type="button"
              className="ur-home-board-lane__head"
              onClick={canOpen ? () => onOpenSport(lane.sport) : undefined}
              disabled={!canOpen}
            >
              <div className="ur-home-board-lane__head-top">
                <span className="ur-home-board-lane__league">{lane.leagueLabel}</span>
                <span className="ur-home-board-lane__meta">{lane.meta}</span>
              </div>
              {lane.featuredMatchup ? (
                <div className="ur-home-board-lane__matchup">{lane.featuredMatchup}</div>
              ) : null}
              {lane.boardLine ? (
                <div className="ur-home-board-lane__line">{lane.boardLine}</div>
              ) : null}
            </button>

            <ul className="ur-home-board-lane__asks">
              {lane.prompts.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="ur-home-board-lane__ask"
                    disabled={!canPrompt}
                    onClick={
                      canPrompt ? () => onPrompt(p.prompt, p.sportHint || lane.sport, p.id) : undefined
                    }
                  >
                    <span className={`ur-home-board-lane__kind ur-home-board-lane__kind--${String(p.kind || "PROP").toLowerCase()}`}>
                      {p.kind}
                    </span>
                    <span className="ur-home-board-lane__ask-text">{p.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
