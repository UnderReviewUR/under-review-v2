import { isGolfEventFinished } from "../../lib/golfEventStatus.js";
import {
  getF1NextRaceForHomePrompts,
  isTennisMatchFinished,
} from "../../lib/homePromptEligibility.js";

function getDaypartLabel() {
  const h = new Date().getHours();
  if (h < 12) return "today";
  if (h < 18) return "this afternoon";
  return "tonight";
}

export function buildDynamicHomeQuestions({
  activeTournamentMatches,
  tennisLiveMatches,
  tennisUpcomingMatches,
  nflSeasonMode,
  context,
  golfData,
  nbaGames,
  f1Data,
}) {
  const prompts = [];
  const used = new Set();
  const daypart = getDaypartLabel();
  const etNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  const daySeed = Number(
    `${etNow.getFullYear()}${String(etNow.getMonth() + 1).padStart(2, "0")}${String(
      etNow.getDate()
    ).padStart(2, "0")}`
  );

  const rotate = (arr, offset = 0) =>
    Array.isArray(arr) && arr.length > 0 ? arr[(daySeed + offset) % arr.length] : null;

  const push = (item) => {
    if (!item || used.has(item.text)) return;
    used.add(item.text);
    prompts.push(item);
  };

  const tournamentActionable = (activeTournamentMatches || []).filter(
    (m) => !isTennisMatchFinished(m),
  );
  const livePool = (tennisLiveMatches || []).filter((m) => !isTennisMatchFinished(m));
  const upcomingPool = (tennisUpcomingMatches || []).filter(
    (m) => !isTennisMatchFinished(m),
  );

  const prefLive =
    tournamentActionable.find((m) => String(m?.raw?.live || "0") === "1") ||
    livePool[0];
  const prefUpcoming =
    tournamentActionable.find((m) => String(m?.raw?.live || "0") !== "1") ||
    upcomingPool[0];

  if (prefLive) {
    const label = `${prefLive.raw?.home || ""} vs ${prefLive.raw?.away || ""}`;
    const tennisLivePrompt = rotate(
      [
        {
          text: `Best live angle for ${label}?`,
          prompt: `What is the sharpest live betting angle for ${label} right now? Give me one edge plus the biggest risk.`,
        },
        {
          text: `Live read on ${label}?`,
          prompt: `For ${label} live, where is the market most wrong right now? Give me side/total and timing.`,
        },
      ],
      1
    );
    push({
      id: "q1",
      color: prefLive.league === "WTA" ? "#E11D48" : "#0891B2",
      sportHint: "tennis",
      ...tennisLivePrompt,
    });
  }

  if (prefUpcoming) {
    const label = `${prefUpcoming.raw?.home || ""} vs ${prefUpcoming.raw?.away || ""}`;
    const tennisUpcomingPrompt = rotate(
      [
        {
          text: `Best pre-match edge in ${label} ${daypart}?`,
          prompt: `What is the best pre-match edge in ${label} ${daypart}? One strongest play and one pass/fade.`,
        },
        {
          text: `Best futures/read for ${label}?`,
          prompt: `For ${label}, what is the cleanest pre-match inefficiency right now and why has it not corrected yet?`,
        },
      ],
      2
    );
    push({
      id: "q2",
      color: prefUpcoming.league === "WTA" ? "#E11D48" : "#0891B2",
      sportHint: "tennis",
      ...tennisUpcomingPrompt,
    });
  } else if (context?.currentTournament?.name) {
    push({
      id: "q2b",
      color: "#0891B2",
      sportHint: "tennis",
      text: `Best future around ${context.currentTournament.name} today?`,
      prompt: `What is the best current futures or tournament-value angle connected to ${context.currentTournament.name}?`,
    });
  }

  const golfLeaders = golfData?.currentEvent?.leaderboard || [];
  const golfLeader = golfLeaders[0];
  const golfEventName =
    golfData?.currentEvent?.shortName ||
    golfData?.currentEvent?.name ||
    golfData?.tournament?.shortName ||
    golfData?.tournament?.name ||
    null;
  /** No live/pre-market golf prompts once the event is final — avoids bad model behavior without live markets. */
  if (!isGolfEventFinished(golfData) && (golfLeader || golfEventName)) {
    const leaderName = String(golfLeader?.name || "the current leader").trim();
    const label = golfEventName || "PGA Tour board";
    const golfPrompt = rotate(
      [
        {
          text: `Best live golf angle for ${label}?`,
          prompt: `For ${label}, what is the sharpest live golf betting angle right now? One best play and one avoid.`,
        },
        {
          text: `How should I price ${leaderName} right now?`,
          prompt: `Given current leaderboard context, is ${leaderName} over- or under-priced in live golf markets?`,
        },
      ],
      3
    );
    push({ id: "q3", color: "#FFFFFF", sportHint: "golf", ...golfPrompt });
  }

  const nbaLive = (nbaGames || []).filter((g) => g?.state === "in");
  const nbaUpcoming = (nbaGames || []).filter((g) => g?.state === "pre");
  const nbaLiveGame = nbaLive[0] || null;
  const nbaUpcomingGame = nbaUpcoming[0] || null;

  if (nbaLiveGame) {
    const away = nbaLiveGame.awayTeam?.abbr || nbaLiveGame.awayTeam?.name || "Away";
    const home = nbaLiveGame.homeTeam?.abbr || nbaLiveGame.homeTeam?.name || "Home";
    const nbaLivePrompt = rotate(
      [
        {
          text: `Best NBA prop for ${away} vs ${home}?`,
          prompt: `For ${away} vs ${home}, what is the strongest NBA player-prop edge on the current slate?`,
        },
        {
          text: `Top NBA edge in ${away} @ ${home}?`,
          prompt: `Where is the cleanest NBA market inefficiency in ${away} @ ${home} right now?`,
        },
      ],
      5
    );
    push({ id: "q4a", color: "#FF6B00", sportHint: "nba", ...nbaLivePrompt });
  }

  if (nbaUpcomingGame) {
    const away =
      nbaUpcomingGame.awayTeam?.abbr || nbaUpcomingGame.awayTeam?.name || "Away";
    const home =
      nbaUpcomingGame.homeTeam?.abbr || nbaUpcomingGame.homeTeam?.name || "Home";
    const nbaPrePrompt = rotate(
      [
        {
          text: `Best pre-game edge: ${away} @ ${home}?`,
          prompt: `Before tip for ${away} @ ${home}, what is the strongest pre-game edge (side, total, or prop) and what would change it live?`,
        },
        {
          text: `Top matchup read: ${away} vs ${home}?`,
          prompt: `For the upcoming ${away} vs ${home} game, where is the market most likely wrong pre-tip — and what stat would you watch first?`,
        },
      ],
      54
    );
    push({ id: "q4b", color: "#FF6B00", sportHint: "nba", ...nbaPrePrompt });
  }

  const nextRace = getF1NextRaceForHomePrompts(f1Data);
  if (nextRace) {
    const raceName = nextRace.meeting_name || "next Grand Prix";
    const f1Prompt = rotate(
      [
        {
          text: `Best F1 edge for ${raceName}?`,
          prompt: `For ${raceName}, what is the best race-day betting angle (race market only, no quali/practice)?`,
        },
        {
          text: `Best race-day play for ${raceName}?`,
          prompt: `What is the sharpest race-day edge for ${raceName}? Include price sensitivity and timing.`,
        },
      ],
      6
    );
    push({ id: "q5", color: "#E10600", sportHint: "f1", ...f1Prompt });
  }

  if (nflSeasonMode) {
    const nflSeasonPrompt = rotate(
      [
        {
          text: "Which NFL weekly prop is most mispriced?",
          prompt: "Which NFL weekly player prop looks most mispriced right now based on current usage and role?",
        },
        {
          text: "Best NFL role-shift edge this week?",
          prompt: "Where is the biggest NFL role-shift mismatch vs market pricing this week?",
        },
      ],
      7
    );
    push({ id: "q6", color: "#E11D48", sportHint: "nfl", ...nflSeasonPrompt });
  } else {
    const nflFuturePrompt = rotate(
      [
        {
          text: "Which NFL future looks most mispriced?",
          prompt: "Which NFL future is most mispriced right now based on player profile and team context?",
        },
        {
          text: "Best NFL future value spot today?",
          prompt: "What is the best NFL futures value spot today, and why is market sentiment lagging?",
        },
      ],
      8
    );
    push({ id: "q6", color: "#E11D48", sportHint: "nfl", ...nflFuturePrompt });
  }

  return prompts.slice(0, 7);
}
