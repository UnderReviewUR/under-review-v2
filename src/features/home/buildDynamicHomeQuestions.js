import {
  getF1NextRaceForHomePrompts,
  isTennisMatchFinished,
} from "../../lib/homePromptEligibility.js";
import {
  classifyGolfEvent,
  classifyNbaGame,
  EVENT_VALIDITY,
  isDisplayableValidity,
} from "../../../shared/eventValidity.js";

function getDaypartLabel() {
  const h = new Date().getHours();
  if (h < 12) return "this morning";
  if (h < 18) return "this afternoon";
  return "tonight";
}

function promptDedupeKey(prompt) {
  return String(prompt || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 96);
}

function isLikelyDraftWindow(now = new Date()) {
  const month = now.getMonth() + 1;
  const day = now.getDate();
  return month === 4 && day >= 18 && day <= 28;
}

export function buildDynamicHomeQuestions({
  activeTournamentMatches,
  tennisLiveMatches,
  tennisUpcomingMatches,
  nflSeasonMode,
  nflDraftMeta,
  userCity,
  context,
  golfData,
  nbaGames,
  f1Data,
}) {
  const prompts = [];
  const usedCardText = new Set();
  const usedPromptKeys = new Set();
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
  const draftPhase = String(nflDraftMeta?.phase || "").toLowerCase();
  const isDraftMode =
    draftPhase === "pre_draft" ||
    draftPhase === "during_draft" ||
    (!draftPhase && isLikelyDraftWindow(etNow));
  const teamNeeds = nflDraftMeta?.teamNeeds && typeof nflDraftMeta.teamNeeds === "object"
    ? nflDraftMeta.teamNeeds
    : {};
  const teamEntries = Object.entries(teamNeeds).filter(([, v]) => v?.headline);
  const cityHint = String(userCity || "").toLowerCase();
  const dallasPriority = cityHint.includes("dallas");

  const push = (item) => {
    if (!item || !item.text || !item.prompt) return;
    if (usedCardText.has(item.text)) return;
    const pk = promptDedupeKey(item.prompt);
    if (pk && usedPromptKeys.has(pk)) return;
    usedCardText.add(item.text);
    if (pk) usedPromptKeys.add(pk);
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
          text: `Live edge — ${label}?`,
          prompt: `For ${label} in-play, what is the single sharpest live angle right now? Name one edge and the main way it dies.`,
        },
        {
          text: `Where is ${label} mispriced live?`,
          prompt: `For ${label} live, where is the book most wrong on side or total — and what score or script flips your read?`,
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
          text: `Pre-match lean — ${label} (${daypart})?`,
          prompt: `Before ${label} goes live ${daypart}, what is the strongest pre-match edge — one play to back and one market to avoid?`,
        },
        {
          text: `Misprice watch: ${label}?`,
          prompt: `For ${label} pre-match, where is pricing still stale vs what the matchup shape implies?`,
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
      text: `Tournament value — ${context.currentTournament.name}?`,
      prompt: `Around ${context.currentTournament.name}, where is the best futures or outright value on the board right now?`,
    });
  }

  const golfState = classifyGolfEvent(golfData?.currentEvent || null);
  const golfLeaders = golfData?.currentEvent?.leaderboard || [];
  const golfLeader = golfLeaders[0];
  const golfEventName =
    golfData?.currentEvent?.shortName ||
    golfData?.currentEvent?.name ||
    golfData?.tournament?.shortName ||
    golfData?.tournament?.name ||
    null;
  /** No live/pre-market golf prompts once the event is final — avoids bad model behavior without live markets. */
  if (isDisplayableValidity(golfState) && golfState !== EVENT_VALIDITY.UPCOMING && (golfLeader || golfEventName)) {
    const leaderName = String(golfLeader?.name || "the current leader").trim();
    const label = golfEventName || "PGA Tour board";
    const golfPrompt = rotate(
      [
        {
          text: `Live board — best angle on ${label}?`,
          prompt: `On ${label} with live scoring moving, what is the one best live golf angle and what stat would make you bail?`,
        },
        {
          text: `Is ${leaderName} priced right?`,
          prompt: `Against the live ${label} board, is ${leaderName} still mispriced in placement or matchup markets?`,
        },
      ],
      3
    );
    push({ id: "q3", color: "#FFFFFF", sportHint: "golf", ...golfPrompt });
  }

  const validNbaGames = (nbaGames || []).filter((g) =>
    isDisplayableValidity(classifyNbaGame(g)),
  );
  const nbaLive = validNbaGames.filter((g) => g?.state === "in");
  const nbaUpcoming = validNbaGames.filter((g) => g?.state === "pre");
  const nbaLiveGame = nbaLive[0] || null;
  const nbaUpcomingGame = nbaUpcoming[0] || null;

  if (nbaLiveGame) {
    const away = nbaLiveGame.awayTeam?.abbr || nbaLiveGame.awayTeam?.name || "Away";
    const home = nbaLiveGame.homeTeam?.abbr || nbaLiveGame.homeTeam?.name || "Home";
    const nbaLivePrompt = rotate(
      [
        {
          text: `Best prop live — ${away} vs ${home}?`,
          prompt: `In ${away} vs ${home} right now, what is the strongest in-game player prop edge and what script kills it?`,
        },
        {
          text: `Market wrong spot — ${away} @ ${home}?`,
          prompt: `Where is the book most off in ${away} @ ${home} live — side, total, or prop — and what are you watching next?`,
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
          text: `Pre-tip edge — ${away} @ ${home}?`,
          prompt: `Before tip between ${away} and ${home}, what is the strongest pre-game edge on side, total, or prop — and what injury or line move flips it?`,
        },
        {
          text: `Misprice before tip — ${away} vs ${home}?`,
          prompt: `Pre-tip for ${away} vs ${home}, where is pricing laziest vs rotation and pace reality?`,
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
          text: `Race-day sharp play — ${raceName}?`,
          prompt: `For ${raceName} on Sunday, what is the best race-only betting angle (no quali or practice markets)?`,
        },
        {
          text: `Podium or H2H — ${raceName}?`,
          prompt: `At ${raceName}, is the cleaner edge on podium structure or a driver H2H — and where is the market too confident?`,
        },
      ],
      6
    );
    push({ id: "q5", color: "#E10600", sportHint: "f1", ...f1Prompt });
  }

  if (isDraftMode) {
    const featuredTeam = dallasPriority
      ? "Dallas Cowboys"
      : rotate(teamEntries.map(([team]) => team), 9) || "Dallas Cowboys";
    const featuredHeadline = teamNeeds?.[featuredTeam]?.headline || "OL, EDGE, secondary";
    const topNeedTeams = teamEntries.slice(0, 5).map(([team, needs]) => {
      const short = team.replace("New York ", "NY ").replace("Los Angeles ", "LA ");
      return `${short} (${needs.headline})`;
    });

    push({
      id: "q6a",
      color: "#E11D48",
      sportHint: "nfl",
      text: "2026 draft — biggest sleepers vs the board?",
      prompt:
        "Who are the biggest sleepers in the 2026 draft class relative to consensus? Tie answers to team needs and realistic round ranges.",
    });
    push({
      id: "q6b",
      color: "#E11D48",
      sportHint: "nfl",
      text: `Simulate the first 3 rounds for the ${featuredTeam} (${featuredHeadline}).`,
      prompt: `Simulate the first 3 rounds for the ${featuredTeam} based on their needs (${featuredHeadline}). Use realistic board flow and one contingency branch.`,
    });
    push({
      id: "q6c",
      color: "#E11D48",
      sportHint: "nfl",
      text: "Which teams are most likely to trade up into the Top 5?",
      prompt: `Which teams are most likely to trade up into the Top 5? Anchor to current need pressure and capital context for: ${topNeedTeams.join("; ") || "Raiders, Jets, Cardinals, Titans, Giants"}.`,
    });
  } else if (nflSeasonMode) {
    const nflSeasonPrompt = rotate(
      [
        {
          text: "Which weekly prop is the clearest misprice?",
          prompt: "Which NFL weekly player prop is most mispriced vs current usage, role, and opponent tendency?",
        },
        {
          text: "Biggest role-shift edge this week?",
          prompt: "Where is the biggest NFL role or snap-shift not yet priced into the weekly markets?",
        },
      ],
      7
    );
    push({ id: "q6", color: "#E11D48", sportHint: "nfl", ...nflSeasonPrompt });
  } else {
    const nflFuturePrompt = rotate(
      [
        {
          text: "Which NFL future is still sleeping?",
          prompt: "Which NFL futures market looks most mispriced today when you weigh roster path and schedule leverage?",
        },
        {
          text: "Best futures value on the board now?",
          prompt: "What is the best NFL futures value on the board right now, and why is public money still wrong?",
        },
      ],
      8
    );
    push({ id: "q6", color: "#E11D48", sportHint: "nfl", ...nflFuturePrompt });
  }

  return prompts.slice(0, 7);
}
