import { useMemo, useRef } from "react";
import AskBar from "../components/AskBar";
import MatchupCard from "../components/MatchupCard";
import {
  preferredTournamentScore,
  isNflInSeason,
  isNflRampMode,
  getDaypartLabel,
} from "../lib/tennis";

function buildHomeQuestions(
  activeTournamentMatches,
  tennisLiveMatches,
  tennisUpcomingMatches,
  nflSeasonMode,
  context
) {
  const prompts = [];
  const used = new Set();
  const daypart = getDaypartLabel();

  function push(item) {
    if (!item || used.has(item.text)) return;
    used.add(item.text);
    prompts.push(item);
  }

  const prefLive =
    activeTournamentMatches.find((m) => String(m?.raw?.live || "0") === "1") ||
    tennisLiveMatches[0];
  const prefUpcoming =
    activeTournamentMatches.find((m) => String(m?.raw?.live || "0") !== "1") ||
    tennisUpcomingMatches[0];

  if (prefLive) {
    const label = `${prefLive.raw?.home || ""} vs ${prefLive.raw?.away || ""}`;
    push({
      id: "q1",
      color: prefLive.league === "WTA" ? "#E11D48" : "#0891B2",
      text: `Best live angle for ${label}?`,
      prompt: `What is the best live betting angle for ${label} right now? Give me the strongest side, total, and any prop edge.`,
    });
  }

  if (prefUpcoming) {
    const label = `${prefUpcoming.raw?.home || ""} vs ${prefUpcoming.raw?.away || ""}`;
    push({
      id: "q2",
      color: prefUpcoming.league === "WTA" ? "#E11D48" : "#0891B2",
      text: `Best tennis bet in ${label} ${daypart}?`,
      prompt: `What is the best bet in ${label} ${daypart}? Cleanest angle and one sharper alternative.`,
    });
  }

  push({
    id: "q3",
    color: "#0891B2",
    text: context?.currentTournament?.name
      ? `Best futures angle around ${context.currentTournament.name}?`
      : "Which tennis future still has value right now?",
    prompt: context?.currentTournament?.name
      ? `What is the best current futures or tournament-value angle connected to ${context.currentTournament.name}?`
      : "Which tennis future still has value right now, and why has the market not fully priced it correctly?",
  });

  if (nflSeasonMode) {
    push({
      id: "q4",
      color: "#E11D48",
      text: "Which NFL weekly prop is most mispriced?",
      prompt:
        "Which NFL weekly player prop looks most mispriced right now based on current usage and the player database?",
    });
    push({
      id: "q5",
      color: "#E11D48",
      text: "Best NFL in-season edge on the board?",
      prompt: "What is the best NFL in-season betting edge on the board right now?",
    });
  } else {
    push({
      id: "q4",
      color: "#E11D48",
      text: "Which NFL future looks most mispriced?",
      prompt:
        "Which NFL future looks the most mispriced right now based on the player database and team context?",
    });
    push({
      id: "q5",
      color: "#E11D48",
      text: "Which RB scores the most TDs in 2026?",
      prompt:
        "Based on the NFL player database, which running back is most likely to lead the NFL in touchdowns in 2026?",
    });
  }

  return prompts.slice(0, 5);
}

function buildHomeCards(activeTournamentMatches, liveMatches, context, nflSeasonMode, nflRampMode) {
  const tennisSource = activeTournamentMatches.length > 0 ? activeTournamentMatches : liveMatches;
  const liveCards = tennisSource.filter((m) => String(m?.raw?.live || "0") === "1");
  const upcomingCards = tennisSource.filter((m) => String(m?.raw?.live || "0") !== "1");

  const tennis = [];
  if (liveCards[0]) tennis.push({ ...liveCards[0], homeCategory: "Live Tennis" });
  if (upcomingCards[0]) tennis.push({ ...upcomingCards[0], homeCategory: "Upcoming Tennis" });
  if (!tennis.length && liveMatches[0]) {
    tennis.push({
      ...liveMatches[0],
      homeCategory: String(liveMatches[0]?.raw?.live || "0") === "1" ? "Live Tennis" : "Upcoming Tennis",
    });
  }
  if (!tennis.length) {
    tennis.push({
      id: "tennis-ctx-1",
      league: "TENNIS",
      leagueColor: "#0891B2",
      title: context?.currentTournament?.name
        ? `Best angle at ${context.currentTournament.name}`
        : "Tennis Futures — Value Plays",
      time: "Current Market",
      network: context?.currentTournament?.surface || "Tour Futures",
      blurb:
        context?.currentTournament?.context ||
        "Player database, surface Elo, and futures context are loaded.",
      whatMatters: "Ask for the best current tennis future, matchup angle, or surface edge.",
      quickHitters: [
        "Best tennis future right now?",
        "Best clay angle?",
        "Who has the best current value?",
      ],
      confirmed: true,
    });
  }

  const nfl = nflSeasonMode
    ? [
        {
          id: "nfl-season-1",
          league: "NFL IN-SEASON",
          leagueColor: "#D97706",
          title: "Best weekly NFL prop board",
          time: "Weekly Market",
          network: "Weekly Props",
          blurb: "Usage, role changes, and current market mispricing.",
          whatMatters: "Ask for the best current weekly NFL edge.",
          quickHitters: ["Best prop this week?", "Biggest role shift?", "Best TD angle?"],
          confirmed: true,
        },
        {
          id: "nfl-season-2",
          league: "NFL IN-SEASON",
          leagueColor: "#D97706",
          title: "Most mispriced in-season usage spot",
          time: "Weekly Market",
          network: "Role + Volume",
          blurb: "Where the market is lagging behind current role and usage.",
          whatMatters: "Ask for the cleanest role-driven edge.",
          quickHitters: ["Which line is stale?", "Best volume play?", "Best role-based edge?"],
          confirmed: true,
        },
      ]
    : [
        {
          id: "nfl-future-1",
          league: "NFL FUTURE",
          leagueColor: "#D97706",
          title: "Puka Nacua 2026 outlook",
          time: nflRampMode ? "Season Approaching" : "Futures Window",
          network: "Season Futures",
          blurb: "Led NFL in receptions 2025 with 129 catches. Zero TDs. Elite volume profile for futures.",
          whatMatters: "Yards and catches props are the play. TD regression is the variable.",
          quickHitters: ["Best Puka future?", "Yards or catches?", "Is price fair yet?"],
          confirmed: true,
        },
        {
          id: "nfl-future-2",
          league: "NFL FUTURE",
          leagueColor: "#D97706",
          title: "Derrick Henry TD future",
          time: nflRampMode ? "Season Approaching" : "Futures Window",
          network: "Season Futures",
          blurb: "15 TDs in 2025 at 0.94 per game. Most reliable TD-scorer profile in football.",
          whatMatters: "Ask whether the price still has value.",
          quickHitters: ["Henry TD over?", "Best RB TD future?", "Most reliable scorer profile?"],
          confirmed: true,
        },
      ];

  return [...tennis.slice(0, 2), ...nfl].filter(Boolean);
}

export default function HomeScreen({
  liveMatches,
  context,
  homeInput,
  setHomeInput,
  pastedImage,
  clearImage,
  isAsking,
  processImageFile,
  fileInputRef,
  onSubmitHome,
  onFirePrompt,
  onOpenMatchup,
  goTennis,
  goNfl,
}) {
  const inputRef = useRef(null);
  const nflSeasonMode = useMemo(() => isNflInSeason(), []);
  const nflRampMode = useMemo(() => isNflRampMode(), []);

  const tennisLiveMatches = useMemo(
    () => liveMatches.filter((m) => String(m?.raw?.live || "0") === "1"),
    [liveMatches]
  );
  const tennisUpcomingMatches = useMemo(
    () => liveMatches.filter((m) => String(m?.raw?.live || "0") !== "1"),
    [liveMatches]
  );
  const activeTournamentMatches = useMemo(
    () => liveMatches.filter((m) => preferredTournamentScore(m, context) > 0),
    [liveMatches, context]
  );

  const questions = useMemo(
    () =>
      buildHomeQuestions(
        activeTournamentMatches,
        tennisLiveMatches,
        tennisUpcomingMatches,
        nflSeasonMode,
        context
      ),
    [activeTournamentMatches, tennisLiveMatches, tennisUpcomingMatches, nflSeasonMode, context]
  );
  const cards = useMemo(
    () => buildHomeCards(activeTournamentMatches, liveMatches, context, nflSeasonMode, nflRampMode),
    [activeTournamentMatches, liveMatches, context, nflSeasonMode, nflRampMode]
  );

  return (
    <main className="screen">
      <section className="hero">
        <div className="hero-title">What do you want to know?</div>
        <div className="hero-sub">
          Live tennis first, futures where needed, and weekly NFL once the season flips.
        </div>
      </section>

      <AskBar
        inputRef={inputRef}
        fileInputRef={fileInputRef}
        value={homeInput}
        onChange={setHomeInput}
        onSubmit={onSubmitHome}
        placeholder="Ask UR TAKE anything..."
        pastedImage={pastedImage}
        clearImage={clearImage}
        isAsking={isAsking}
        processImageFile={processImageFile}
      />

      <section className="section">
        <div className="section-label">TRENDING ASKS</div>
        <div className="q-list">
          {questions.map((q) => (
            <button key={q.id} className="q-card" onClick={() => onFirePrompt(q.prompt)}>
              <div className="q-top">
                <div className="q-accent" style={{ background: q.color }} />
                <div className="q-text">{q.text}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-label">MATCHUPS TO TAP INTO</div>
        <div className="matchup-list">
          {cards.map((m) => (
            <MatchupCard key={m.id} m={m} onOpen={onOpenMatchup} showCategory />
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-label">SPORTS</div>
        <div className="sport-chips">
          <button className="sport-chip active" onClick={goTennis}>
            TENNIS
          </button>
          <button className="sport-chip nfl-chip active" onClick={goNfl}>
            {nflSeasonMode ? "NFL IN-SEASON" : "NFL"}
          </button>
        </div>
      </section>
      <div className="page-spacer" />
    </main>
  );
}
