import {
  getF1NextRaceForHomePrompts,
  isTennisMatchFinished,
} from "../../lib/homePromptEligibility.js";
import {
  classifyGolfEvent,
  classifyNbaGame,
  classifyTennisMatch,
  EVENT_VALIDITY,
  isDisplayableValidity,
} from "../../../shared/eventValidity.js";
import { resolveNflDraftPromoBand } from "../../../shared/nflDraftCalendarBand.js";
import { isDerbyActive } from "../../data/derby2026.js";

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

function getWindowRanks(hourEt) {
  const isDay = hourEt >= 12;
  return isDay
    ? {
        nbaLive: 10,
        nbaUpcoming: 15,
        nfl: 25,
        mlb: 30,
        golf: 40,
        f1: 45,
        tennisLive: 65,
        tennisUpcoming: 70,
        tennisFallback: 75,
      }
    : {
        nbaLive: 12,
        nbaUpcoming: 20,
        nfl: 25,
        mlb: 30,
        golf: 50,
        f1: 55,
        tennisLive: 10,
        tennisUpcoming: 15,
        tennisFallback: 22,
      };
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
  mlbGames = [],
  f1Data,
  hourEt = 12,
  promoNowMs = Date.now(),
}) {
  const ranks = getWindowRanks(hourEt);
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

  const referenceMs =
    typeof promoNowMs === "number" && Number.isFinite(promoNowMs) ? promoNowMs : Date.now();
  const derbyHomePromptsActive = isDerbyActive(new Date(referenceMs));

  if (derbyHomePromptsActive) {
    push({
      id: "derby-home-a",
      color: "#22d3ee",
      sportHint: "derby",
      sortRank: 1,
      text: "Strongest play in the Kentucky Derby tonight?",
      prompt: "Strongest play in the Kentucky Derby tonight?",
    });
    push({
      id: "derby-home-b",
      color: "#22d3ee",
      sportHint: "derby",
      sortRank: 2,
      text: "Best longshot in the Derby — who's the overlay?",
      prompt: "Best longshot in the Derby — who's the overlay?",
    });
  }

  const tournamentActionable = (activeTournamentMatches || []).filter(
    (m) => !isTennisMatchFinished(m),
  );
  const livePool = (tennisLiveMatches || []).filter((m) => !isTennisMatchFinished(m));
  const upcomingPool = (tennisUpcomingMatches || []).filter(
    (m) => !isTennisMatchFinished(m),
  );

  const isActiveTennis = (m) =>
    classifyTennisMatch(m, promoNowMs) === EVENT_VALIDITY.ACTIVE;
  const isUpcomingTennis = (m) =>
    classifyTennisMatch(m, promoNowMs) === EVENT_VALIDITY.UPCOMING;

  const prefLive =
    tournamentActionable.find(
      (m) => String(m?.raw?.live || "0") === "1" && isActiveTennis(m),
    ) || livePool.find(isActiveTennis) || null;

  const prefUpcoming =
    tournamentActionable.find(
      (m) => String(m?.raw?.live || "0") !== "1" && isUpcomingTennis(m),
    ) || upcomingPool.find(isUpcomingTennis) || null;

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
      sortRank: ranks.tennisLive,
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
      sortRank: ranks.tennisUpcoming,
      ...tennisUpcomingPrompt,
    });
  } else if (context?.currentTournament?.name) {
    push({
      id: "q2b",
      color: "#0891B2",
      sportHint: "tennis",
      sortRank: ranks.tennisFallback,
      text: `Tournament value — ${context.currentTournament.name}?`,
      prompt: `Around ${context.currentTournament.name}, where is the best futures or outright value on the board right now?`,
    });
  } else if (!prefLive && !prefUpcoming) {
    push({
      id: "q2c",
      color: "#0891B2",
      sportHint: "tennis",
      sortRank: ranks.tennisFallback,
      text: "What's the sharpest ATP angle on the board?",
      prompt:
        "What is the single sharpest ATP angle on the board right now? Give me one best lean, one reason, and one thing that could flip it.",
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
    push({
      id: "q3",
      color: "#FFFFFF",
      sportHint: "golf",
      sortRank: ranks.golf,
      ...golfPrompt,
    });
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
    push({
      id: "q4a",
      color: "#FF6B00",
      sportHint: "nba",
      sortRank: ranks.nbaLive,
      ...nbaLivePrompt,
    });
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
    push({
      id: "q4b",
      color: "#FF6B00",
      sportHint: "nba",
      sortRank: ranks.nbaUpcoming,
      ...nbaPrePrompt,
    });
  }

  if (Array.isArray(mlbGames) && mlbGames.length > 0) {
    const mlbPrompt = rotate(
      [
        {
          text: "Best pitcher prop on tonight's MLB slate?",
          prompt:
            "On tonight's MLB slate, which pitcher strikeout or workload prop is the clearest misprice vs recent form and matchup?",
        },
        {
          text: "Which MLB total is mispriced tonight?",
          prompt:
            "Which MLB game total on tonight's slate looks mispriced vs starter quality, bullpen leverage, and park factors?",
        },
      ],
      4,
    );
    if (mlbPrompt) {
      push({
        id: "q4mlb",
        color: "#1DB954",
        sportHint: "mlb",
        sortRank: ranks.mlb,
        ...mlbPrompt,
      });
    }
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
    push({
      id: "q5",
      color: "#E10600",
      sportHint: "f1",
      sortRank: ranks.f1,
      ...f1Prompt,
    });
  }

  if (isDraftMode) {
    const band = resolveNflDraftPromoBand(promoNowMs, nflDraftMeta);
    const featuredTeam = dallasPriority
      ? "Dallas Cowboys"
      : rotate(teamEntries.map(([team]) => team), 9) || "Dallas Cowboys";
    const featuredHeadline = teamNeeds?.[featuredTeam]?.headline || "OL, EDGE, secondary";
    const topNeedTeams = teamEntries.slice(0, 5).map(([team, needs]) => {
      const short = team.replace("New York ", "NY ").replace("Los Angeles ", "LA ");
      return `${short} (${needs.headline})`;
    });

    const bandHead = band.headline;
    const roundHint = band.promptHint;

    if (band.band === "rounds2_3") {
      push({
        id: "q6a",
        color: "#E11D48",
        sportHint: "nfl",
        sortRank: ranks.nfl,
        text: `${bandHead} — best Day 2 fits?`,
        prompt: `It is ${band.roundsLabel}. ${roundHint} Name three best scheme fits for Rounds 2–3 and one trade-up candidate.`,
      });
      push({
        id: "q6b",
        color: "#E11D48",
        sportHint: "nfl",
        sortRank: ranks.nfl,
        text: `Simulate Rounds 2–3 for the ${featuredTeam} (${featuredHeadline}).`,
        prompt: `Simulate Rounds 2–3 only for the ${featuredTeam} (${featuredHeadline}). Stay inside verified capital + needs; label any hypothetical trade as simulation.`,
      });
      push({
        id: "q6c",
        color: "#E11D48",
        sportHint: "nfl",
        sortRank: ranks.nfl,
        text: "Where does the board bend in Rounds 2–3?",
        prompt: `During ${band.roundsLabel}, where is the class thin vs deep, and which team is most likely to reach or trade back? ${roundHint}`,
      });
    } else if (band.band === "rounds4_7") {
      push({
        id: "q6a",
        color: "#E11D48",
        sportHint: "nfl",
        sortRank: ranks.nfl,
        text: `${bandHead} — best Day 3 steals?`,
        prompt: `It is ${band.roundsLabel}. ${roundHint} Identify three Day 3 profiles (Rounds 4–7) with NFL-ready traits vs upside lotto tickets.`,
      });
      push({
        id: "q6b",
        color: "#E11D48",
        sportHint: "nfl",
        sortRank: ranks.nfl,
        text: `Comp picks & specials for ${featuredTeam}?`,
        prompt: `For ${featuredTeam} (${featuredHeadline}), map realistic Rounds 4–7 targets: specials, swing OL, rotational pass rush. ${roundHint}`,
      });
      push({
        id: "q6c",
        color: "#E11D48",
        sportHint: "nfl",
        sortRank: ranks.nfl,
        text: "Which traits overperform on Day 3?",
        prompt: `During ${band.roundsLabel}, which positions historically return value late in this class archetype? ${roundHint}`,
      });
    } else {
      push({
        id: "q6a",
        color: "#E11D48",
        sportHint: "nfl",
        sortRank: ranks.nfl,
        text: "2026 draft — biggest sleepers vs the board?",
        prompt: `Context: ${band.roundsLabel} (${bandHead}). Who are the biggest sleepers in the 2026 draft class relative to consensus? ${roundHint} Tie answers to team needs and realistic round ranges.`,
      });
      push({
        id: "q6b",
        color: "#E11D48",
        sportHint: "nfl",
        sortRank: ranks.nfl,
        text: `Simulate the first 3 rounds for the ${featuredTeam} (${featuredHeadline}).`,
        prompt: `Simulate the first 3 rounds for the ${featuredTeam} based on their needs (${featuredHeadline}). Use realistic board flow and one contingency branch. ${roundHint}`,
      });
      push({
        id: "q6c",
        color: "#E11D48",
        sportHint: "nfl",
        sortRank: ranks.nfl,
        text: "Which teams are most likely to trade up into the Top 5?",
        prompt: `Which teams are most likely to trade up into the Top 5? Anchor to current need pressure and capital context for: ${topNeedTeams.join("; ") || "Raiders, Jets, Cardinals, Titans, Giants"}. ${roundHint}`,
      });
    }
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
    push({
      id: "q6",
      color: "#E11D48",
      sportHint: "nfl",
      sortRank: ranks.nfl,
      ...nflSeasonPrompt,
    });
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
    push({
      id: "q6",
      color: "#E11D48",
      sportHint: "nfl",
      sortRank: ranks.nfl,
      ...nflFuturePrompt,
    });
  }

  prompts.sort((a, b) => (a.sortRank ?? 999) - (b.sortRank ?? 999));
  return prompts.slice(0, 7);
}
