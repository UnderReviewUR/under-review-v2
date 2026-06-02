import {
  getF1NextRaceForHomePrompts,
  isF1GpRaceWeekendEt,
  isTennisMatchFinished,
  isTennisShowcaseWindow,
} from "../../lib/homePromptEligibility.js";
import { getGolfHomeValidity } from "../../lib/golfEventStatus.js";
import {
  classifyGolfEvent,
  classifyNbaGame,
  classifyTennisMatch,
  EVENT_VALIDITY,
  isDisplayableValidity,
} from "../../../shared/eventValidity.js";
import { resolveNflDraftPromoBand } from "../../../shared/nflDraftCalendarBand.js";
import { isWcHomePromoWindow } from "../../../shared/wc2026Constants.js";

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

function isLikelyDraftWindowEt(etNow) {
  const month = etNow.getMonth() + 1;
  const day = etNow.getDate();
  return month === 4 && day >= 18 && day <= 28;
}

/** Oct–Jun (0-index: Sep=9 … Jun=5); Jul/Aug/Sep off-season. */
function isNbaSeasonMonthEt(etNow) {
  const m = etNow.getMonth();
  return m >= 9 || m <= 5;
}

/** Sep–Jan NFL priority window (0-index: Aug–Dec + Jan). */
function isNflPriorityMonthsEt(etNow) {
  const m = etNow.getMonth();
  return m === 8 || m === 9 || m === 10 || m === 11 || m === 0;
}

/** Apr–Oct MLB window (0-index: Mar–Sep). */
function isMlbSeasonMonthEt(etNow) {
  const m = etNow.getMonth();
  return m >= 3 && m <= 9;
}

function isNbaPlayoffToneEt(etNow, nbaGames) {
  if (Array.isArray(nbaGames) && nbaGames.some((g) => g?.postseason)) return true;
  const m = etNow.getMonth();
  const d = etNow.getDate();
  if (m === 3 && d >= 14) return true;
  if (m === 4 || m === 5) return true;
  if (m === 6 && d <= 19) return true;
  return false;
}

/**
 * Sort ranks — lower first. When `nflTop`, NFL bumps above all else; golf stays in the top band after NFL blocks.
 */
function computeSortRanks(nflTop, { nbaFinalsCapOne = false } = {}) {
  if (nflTop) {
    return {
      nflA: 7,
      nflB: 8,
      nflC: 9,
      nflSolo: 8,
      golf: 9,
      golfLive: 8,
      nbaLive: nbaFinalsCapOne ? 18 : 14,
      nbaUp: nbaFinalsCapOne ? 19 : 15,
      nbaSeason: nbaFinalsCapOne ? 20 : 16,
      mlb: 28,
      f1: 9,
      tennisLive: 38,
      tennisUp: 39,
      tennisTourney: 40,
      fallback: 900,
    };
  }
  return {
    nflA: 20,
    nflB: 21,
    nflC: 22,
    nflSolo: 20,
    nbaLive: nbaFinalsCapOne ? 12 : 7,
    nbaUp: nbaFinalsCapOne ? 13 : 8,
    nbaSeason: nbaFinalsCapOne ? 14 : 9,
    golf: 6,
    golfLive: 5,
    mlb: 28,
    f1: 6,
    tennisLive: 38,
    tennisUp: 39,
    tennisTourney: 40,
    fallback: 900,
  };
}

export const HOME_PROMPT_FALLBACKS = [
  {
    id: "fb1",
    color: "var(--magenta)",
    sportHint: "generic",
    text: "Talk me out of a bad bet",
    prompt:
      "I want you to pressure-test a bet I'm considering. Ask me what it is, then give me the honest case against it — what the data says, what I'm probably missing, and whether there's a smarter play.",
  },
  {
    id: "fb2",
    color: "var(--cyan-bright)",
    sportHint: "generic",
    text: "Which line is the book getting wrong tonight?",
    prompt:
      "Across tonight's verified boards, identify the single market where the posted line is most out of step with the underlying data — and explain exactly why.",
  },
  {
    id: "fb3",
    color: "var(--gold)",
    sportHint: "generic",
    text: "Build me a parlay worth actually making",
    prompt:
      "I want a parlay, but I want one that's actually built on correlated logic, not just stacked odds. Walk me through which legs make structural sense together and name the one thing that kills the ticket.",
  },
  {
    id: "fb4",
    color: "var(--muted)",
    sportHint: "generic",
    text: "What would a sharp bettor do differently than me?",
    prompt:
      "Walk me through how a sharp bettor approaches tonight's slate differently than the public — what they're looking at, what they're avoiding, and why the popular picks are probably wrong.",
  },
];

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
  hourEt: _hourEt = 12,
  promoNowMs = Date.now(),
}) {
  const prompts = [];
  const usedCardText = new Set();
  const usedPromptKeys = new Set();

  const etNow = new Date(
    new Date(promoNowMs).toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
  const daypart = getDaypartLabel();
  const daySeed = Number(
    `${etNow.getFullYear()}${String(etNow.getMonth() + 1).padStart(2, "0")}${String(
      etNow.getDate(),
    ).padStart(2, "0")}`,
  );

  const rotate = (arr, offset = 0) =>
    Array.isArray(arr) && arr.length > 0 ? arr[(daySeed + offset) % arr.length] : null;

  const draftPhase = String(nflDraftMeta?.phase || "").toLowerCase();
  const isDraftMode =
    draftPhase === "pre_draft" ||
    draftPhase === "during_draft" ||
    (!draftPhase && isLikelyDraftWindowEt(etNow));

  const nflTop = isNflPriorityMonthsEt(etNow);
  const wcPromo = isWcHomePromoWindow(promoNowMs);

  const teamNeeds =
    nflDraftMeta?.teamNeeds && typeof nflDraftMeta.teamNeeds === "object"
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

  if (wcPromo) {
    push({
      id: "q-wc-promo",
      color: "#00F5E9",
      sportHint: "worldcup",
      sortRank: 5,
      text: "Best group stage value bet right now?",
      prompt:
        "Before the 2026 FIFA World Cup kicks off, what is the best group-stage value bet on the board — group winner, advancement, or a specific fixture — and which mispriced longshot (e.g. Norway, Paraguay) has the cleanest path?",
    });
  }

  const validNbaGames = (nbaGames || []).filter((g) =>
    isDisplayableValidity(classifyNbaGame(g, promoNowMs)),
  );
  const nbaLive = validNbaGames.filter((g) => g?.state === "in");
  const nbaUpcoming = validNbaGames.filter((g) => g?.state === "pre");
  const nbaLiveGame = nbaLive[0] || null;
  const nbaUpcomingGame = nbaUpcoming[0] || null;
  const hasNbaSlateToday = Boolean(nbaLiveGame || nbaUpcomingGame);
  const nbaPlayoffTone = isNbaPlayoffToneEt(etNow, nbaGames);
  const nbaSeason = isNbaSeasonMonthEt(etNow);
  const nbaFinalsCapOne = nbaPlayoffTone && etNow.getMonth() === 5;
  const ranks = computeSortRanks(nflTop, { nbaFinalsCapOne });

  let nbaPromptPushed = false;
  const pushNba = (item) => {
    if (nbaFinalsCapOne && nbaPromptPushed) return;
    push(item);
    if (nbaFinalsCapOne) nbaPromptPushed = true;
  };

  const golfValidity = getGolfHomeValidity(golfData, promoNowMs);
  const golfEventName =
    golfData?.currentEvent?.shortName ||
    golfData?.currentEvent?.name ||
    golfData?.tournament?.shortName ||
    golfData?.tournament?.name ||
    golfValidity.upcomingEvent?.shortName ||
    golfValidity.upcomingEvent?.name ||
    null;
  const golfActive = Boolean(golfValidity.valid && golfEventName);
  const golfPrimary = golfData?.currentEvent || golfData?.tournament || null;
  const golfState = classifyGolfEvent(golfPrimary, promoNowMs);
  const golfLeaders = golfPrimary?.leaderboard || [];
  const golfLeader = golfLeaders[0];

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
    ) ||
    livePool.find(isActiveTennis) ||
    null;

  const prefUpcoming =
    tournamentActionable.find(
      (m) => String(m?.raw?.live || "0") !== "1" && isUpcomingTennis(m),
    ) ||
    upcomingPool.find(isUpcomingTennis) ||
    null;

  const tennisShowcase = isTennisShowcaseWindow(context, activeTournamentMatches);
  const tennisBoardOk = tennisShowcase || Boolean(prefLive || prefUpcoming);

  if (tennisBoardOk && prefLive) {
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
      1,
    );
    push({
      id: "q1",
      color: prefLive.league === "WTA" ? "#E11D48" : "#0891B2",
      sportHint: "tennis",
      sortRank: ranks.tennisLive,
      ...tennisLivePrompt,
    });
  }

  if (tennisBoardOk && prefUpcoming) {
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
      2,
    );
    push({
      id: "q2",
      color: prefUpcoming.league === "WTA" ? "#E11D48" : "#0891B2",
      sportHint: "tennis",
      sortRank: ranks.tennisUp,
      ...tennisUpcomingPrompt,
    });
  } else if (tennisShowcase && context?.currentTournament?.name) {
    push({
      id: "q2b",
      color: "#0891B2",
      sportHint: "tennis",
      sortRank: ranks.tennisTourney,
      text: `Tournament value — ${context.currentTournament.name}?`,
      prompt: `Around ${context.currentTournament.name}, where is the best futures or outright value on the board right now?`,
    });
  } else if (tennisShowcase && !prefLive && !prefUpcoming) {
    push({
      id: "q2c",
      color: "#0891B2",
      sportHint: "tennis",
      sortRank: ranks.tennisTourney,
      text: "What's the sharpest ATP angle on the board?",
      prompt:
        "What is the single sharpest ATP angle on the board right now? Give me one best lean, one reason, and one thing that could flip it.",
    });
  }

  if (golfActive) {
    const label = String(golfEventName).trim();
    const golfTourneyPrompt = rotate(
      [
        {
          text: `Best betting angle for ${label}?`,
          prompt: `For ${label} this week, what is the single best betting angle — outright, placement, or matchup — and what stat or weather hook backs it?`,
        },
        {
          text: `Course fit sleeper at ${label}?`,
          prompt: `At ${label}, who is the best course-fit sleeper the board is still sleeping on, and what market type captures it?`,
        },
      ],
      3,
    );
    push({
      id: "q3field",
      color: "#FFFFFF",
      sportHint: "golf",
      sortRank: golfActive ? 3 : ranks.golf,
      ...golfTourneyPrompt,
    });
  }

  if (
    golfActive &&
    isDisplayableValidity(golfState) &&
    golfState !== EVENT_VALIDITY.UPCOMING &&
    (golfLeader || golfEventName)
  ) {
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
      31,
    );
    push({
      id: "q3live",
      color: "#FFFFFF",
      sportHint: "golf",
      sortRank: golfActive ? 2 : ranks.golfLive,
      ...golfPrompt,
    });
  }

  if (nbaSeason && !hasNbaSlateToday) {
    const playoff = nbaPlayoffTone;
    pushNba({
      id: "q4season",
      color: "#FF6B00",
      sportHint: "nba",
      sortRank: ranks.nbaSeason,
      text: playoff ? "Best angle in tonight's playoff game?" : "Misprice before tip tonight?",
      prompt: playoff
        ? "NBA playoff night: what is the best angle on tonight's playoff slate — one series or game read backed by matchup data?"
        : "NBA regular-season night: where is the clearest pre-tip misprice on tonight's likely slate — side, total, or prop — and what injury or rotation note flips it?",
    });
  }

  if (nbaLiveGame) {
    const away = nbaLiveGame.awayTeam?.abbr || nbaLiveGame.awayTeam?.name || "Away";
    const home = nbaLiveGame.homeTeam?.abbr || nbaLiveGame.homeTeam?.name || "Home";
    const playoff = nbaPlayoffTone;
    const nbaLivePrompt = playoff
      ? rotate(
          [
            {
              text: "Best angle in tonight's playoff game?",
              prompt: `In ${away} vs ${home} live, what is the best playoff-game angle — side, total, or prop — and what script kills it?`,
            },
            {
              text: `Market wrong spot — ${away} @ ${home}?`,
              prompt: `Where is the book most off in ${away} @ ${home} live — side, total, or prop — and what are you watching next?`,
            },
          ],
          5,
        )
      : rotate(
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
          5,
        );
    if (nbaLivePrompt) {
      pushNba({
        id: "q4a",
        color: "#FF6B00",
        sportHint: "nba",
        sortRank: ranks.nbaLive,
        ...nbaLivePrompt,
      });
    }
  }

  if (nbaUpcomingGame) {
    const away =
      nbaUpcomingGame.awayTeam?.abbr || nbaUpcomingGame.awayTeam?.name || "Away";
    const home =
      nbaUpcomingGame.homeTeam?.abbr || nbaUpcomingGame.homeTeam?.name || "Home";
    const playoff = nbaPlayoffTone;
    const nbaPrePrompt = playoff
      ? rotate(
          [
            {
              text: "Best angle in tonight's playoff game?",
              prompt: `Before tip in ${away} @ ${home}, what is the sharpest playoff read — spread, total, or key prop — and what matchup lever backs it?`,
            },
            {
              text: `Pre-tip edge — ${away} @ ${home}?`,
              prompt: `Before tip between ${away} and ${home}, what is the strongest pre-game edge on side, total, or prop — and what injury or line move flips it?`,
            },
          ],
          54,
        )
      : rotate(
          [
            {
              text: "Misprice before tip tonight?",
              prompt: `Pre-tip for ${away} vs ${home}, where is pricing laziest vs rotation and pace reality?`,
            },
            {
              text: `Pre-tip edge — ${away} @ ${home}?`,
              prompt: `Before tip between ${away} and ${home}, what is the strongest pre-game edge on side, total, or prop — and what injury or line move flips it?`,
            },
          ],
          54,
        );
    if (nbaPrePrompt) {
      pushNba({
        id: "q4b",
        color: "#FF6B00",
        sportHint: "nba",
        sortRank: ranks.nbaUp,
        ...nbaPrePrompt,
      });
    }
  }

  if (isMlbSeasonMonthEt(etNow) && Array.isArray(mlbGames) && mlbGames.length > 0) {
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
  const f1RaceWeek = Boolean(nextRace && isF1GpRaceWeekendEt(f1Data, promoNowMs));
  if (f1RaceWeek) {
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
      6,
    );
    push({
      id: "q5",
      color: "#E10600",
      sportHint: "f1",
      sortRank: f1RaceWeek ? 3 : ranks.f1,
      ...f1Prompt,
    });
  }

  const nflRankA = ranks.nflA;
  const nflRankB = ranks.nflB;
  const nflRankC = ranks.nflC;

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
        sortRank: nflRankA,
        text: `${bandHead} — best Day 2 fits?`,
        prompt: `It is ${band.roundsLabel}. ${roundHint} Name three best scheme fits for Rounds 2–3 and one trade-up candidate.`,
      });
      push({
        id: "q6b",
        color: "#E11D48",
        sportHint: "nfl",
        sortRank: nflRankB,
        text: `Simulate Rounds 2–3 for the ${featuredTeam} (${featuredHeadline}).`,
        prompt: `Simulate Rounds 2–3 only for the ${featuredTeam} (${featuredHeadline}). Stay inside verified capital + needs; label any hypothetical trade as simulation.`,
      });
      push({
        id: "q6c",
        color: "#E11D48",
        sportHint: "nfl",
        sortRank: nflRankC,
        text: "Where does the board bend in Rounds 2–3?",
        prompt: `During ${band.roundsLabel}, where is the class thin vs deep, and which team is most likely to reach or trade back? ${roundHint}`,
      });
    } else if (band.band === "rounds4_7") {
      push({
        id: "q6a",
        color: "#E11D48",
        sportHint: "nfl",
        sortRank: nflRankA,
        text: `${bandHead} — best Day 3 steals?`,
        prompt: `It is ${band.roundsLabel}. ${roundHint} Identify three Day 3 profiles (Rounds 4–7) with NFL-ready traits vs upside lotto tickets.`,
      });
      push({
        id: "q6b",
        color: "#E11D48",
        sportHint: "nfl",
        sortRank: nflRankB,
        text: `Comp picks & specials for ${featuredTeam}?`,
        prompt: `For ${featuredTeam} (${featuredHeadline}), map realistic Rounds 4–7 targets: specials, swing OL, rotational pass rush. ${roundHint}`,
      });
      push({
        id: "q6c",
        color: "#E11D48",
        sportHint: "nfl",
        sortRank: nflRankC,
        text: "Which traits overperform on Day 3?",
        prompt: `During ${band.roundsLabel}, which positions historically return value late in this class archetype? ${roundHint}`,
      });
    } else {
      push({
        id: "q6a",
        color: "#E11D48",
        sportHint: "nfl",
        sortRank: nflRankA,
        text: "2026 draft — biggest sleepers vs the board?",
        prompt: `Context: ${band.roundsLabel} (${bandHead}). Who are the biggest sleepers in the 2026 draft class relative to consensus? ${roundHint} Tie answers to team needs and realistic round ranges.`,
      });
      push({
        id: "q6b",
        color: "#E11D48",
        sportHint: "nfl",
        sortRank: nflRankB,
        text: `Simulate the first 3 rounds for the ${featuredTeam} (${featuredHeadline}).`,
        prompt: `Simulate the first 3 rounds for the ${featuredTeam} based on their needs (${featuredHeadline}). Use realistic board flow and one contingency branch. ${roundHint}`,
      });
      push({
        id: "q6c",
        color: "#E11D48",
        sportHint: "nfl",
        sortRank: nflRankC,
        text: "Which teams are most likely to trade up into the Top 5?",
        prompt: `Which teams are most likely to trade up into the Top 5? Anchor to current need pressure and capital context for: ${topNeedTeams.join("; ") || "Raiders, Jets, Cardinals, Titans, Giants"}. ${roundHint}`,
      });
    }
  } else if (nflSeasonMode && !golfActive) {
    const nflSeasonPrompt = rotate(
      [
        {
          text: "Which weekly prop is the clearest misprice?",
          prompt:
            "Which NFL weekly player prop is most mispriced vs current usage, role, and opponent tendency?",
        },
        {
          text: "Biggest role-shift edge this week?",
          prompt:
            "Where is the biggest NFL role or snap-shift not yet priced into the weekly markets?",
        },
      ],
      7,
    );
    push({
      id: "q6",
      color: "#E11D48",
      sportHint: "nfl",
      sortRank: ranks.nflSolo,
      ...nflSeasonPrompt,
    });
  } else if (!golfActive) {
    const nflFuturePrompt = rotate(
      [
        {
          text: "Which NFL future is still sleeping?",
          prompt:
            "Which NFL futures market looks most mispriced today when you weigh roster path and schedule leverage?",
        },
        {
          text: "Best futures value on the board now?",
          prompt:
            "What is the best NFL futures value on the board right now, and why is public money still wrong?",
        },
      ],
      8,
    );
    push({
      id: "q6",
      color: "#E11D48",
      sportHint: "nfl",
      sortRank: ranks.nflSolo,
      ...nflFuturePrompt,
    });
  }

  prompts.sort((a, b) => (a.sortRank ?? 999) - (b.sortRank ?? 999));

  let out = prompts.slice(0, 7);
  let fb = 0;
  while (out.length < 4 && fb < HOME_PROMPT_FALLBACKS.length) {
    const row = { ...HOME_PROMPT_FALLBACKS[fb], sortRank: ranks.fallback + fb };
    fb += 1;
    if (usedCardText.has(row.text)) continue;
    const pk = promptDedupeKey(row.prompt);
    if (pk && usedPromptKeys.has(pk)) continue;
    usedCardText.add(row.text);
    if (pk) usedPromptKeys.add(pk);
    out.push(row);
  }

  return out;
}
