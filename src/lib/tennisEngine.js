export function generateTennisTake({
  input,
  selectedMatchup,
  liveMatches = [],
  players = null,
  context = null,
  tour = "atp",
}) {
  const raw = input || "";
  const q = raw.toLowerCase();

  const allPlayers = {
    ...(players?.atp || {}),
    ...(players?.wta || {}),
  };

  const playerNames = Object.keys(allPlayers);

  function findPlayerInQuestion(question) {
    return playerNames.find((name) =>
      question.includes(name.toLowerCase())
    );
  }

  function findMatchFromQuestion(question) {
    if (!Array.isArray(liveMatches)) return null;

    return liveMatches.find((match) => {
      const p1 =
        match.home_team ||
        match.event_first_player ||
        "Player 1";
      const p2 =
        match.away_team ||
        match.event_second_player ||
        "Player 2";

      return (
        question.includes(String(p1).toLowerCase()) ||
        question.includes(String(p2).toLowerCase())
      );
    });
  }

  function getLiveMatchPlayers(match) {
    return {
      p1: match?.home_team || match?.event_first_player || "Player 1",
      p2: match?.away_team || match?.event_second_player || "Player 2",
    };
  }

  function getPlayerData(name) {
    return allPlayers?.[name] || null;
  }

  function getContextMatchup(p1, p2) {
    if (!context?.matchups) return null;

    const keys = Object.keys(context.matchups);

    const direct = keys.find((key) => {
      const lower = key.toLowerCase();
      return (
        lower.includes(String(p1).toLowerCase()) &&
        lower.includes(String(p2).toLowerCase())
      );
    });

    return direct ? context.matchups[direct] : null;
  }

  function oddsText(match) {
    const outcomes =
      match?.bookmakers?.[0]?.markets?.[0]?.outcomes || [];

    if (!outcomes.length) return "";

    const formatted = outcomes
      .map((o) => `${o.name} ${o.price}`)
      .join(" · ");

    return formatted ? ` Market is showing ${formatted}.` : "";
  }

  function buildMatchupTake(match) {
    const { p1, p2 } = getLiveMatchPlayers(match);
    const p1Data = getPlayerData(p1);
    const p2Data = getPlayerData(p2);
    const matchupContext = getContextMatchup(p1, p2);

    let answer = `${p1} vs ${p2} is live on the board for Miami.`;

    if (matchupContext?.note) {
      answer += ` ${matchupContext.note}`;
    } else {
      answer += ` This is the kind of matchup where serve quality, return pressure, and surface fit matter more than raw name value.`;
    }

    if (matchupContext?.angle) {
      answer += ` ${matchupContext.angle}`;
    }

    if (p1Data?.overallStats || p2Data?.overallStats) {
      const p1Tb = p1Data?.overallStats?.match(/Tiebreak\s*([\d.]+)/)?.[1];
      const p2Tb = p2Data?.overallStats?.match(/Tiebreak\s*([\d.]+)/)?.[1];

      if (p1Tb && p2Tb) {
        answer += ` In tight sets, ${p1} tiebreak win rate is ${p1Tb}% versus ${p2}'s ${p2Tb}%.`;
      }
    }

    answer += oddsText(match);

    return answer.trim();
  }

  function buildPlayerTake(playerName) {
    const p = getPlayerData(playerName);
    if (!p) {
      return `I know the name ${playerName}, but I do not have a clean player profile loaded for them yet.`;
    }

    let answer = `${playerName} profiles as a ${p.style || "top player"} with Elo ${p.elo || "unknown"}.`;

    if (p.record2026) {
      answer += ` ${p.record2026}.`;
    }

    if (p.miamiNote) {
      answer += ` ${p.miamiNote}`;
    } else if (p.fullNote) {
      answer += ` ${p.fullNote}`;
    }

    return answer.trim();
  }

  function buildAcesTake(playerName, line) {
    const aceData = context?.ace_props?.[playerName];
    const p = getPlayerData(playerName);

    if (!aceData && !p) {
      return `I do not have ace-specific data loaded for ${playerName} yet, so I would not pretend to give you a sharp read.`;
    }

    const avg = aceData?.avg_aces_hard;
    const rate = aceData?.ace_rate;
    const note = aceData?.note || "";

    if (line && avg) {
      const numLine = Number(line);

      if (!Number.isNaN(numLine)) {
        let lean = "close";
        if (avg >= numLine + 1) lean = "over";
        if (avg <= numLine - 1) lean = "under";

        if (lean === "over") {
          return `${playerName} over ${numLine} aces has a real case. His hard-court average in the data is ${avg}, with an ace rate of ${rate || "N/A"}. ${note}`.trim();
        }

        if (lean === "under") {
          return `${playerName} over ${numLine} aces looks a little rich to me. His hard-court average in the data is ${avg}, and that makes ${numLine} more of a ceiling outcome than a median one. ${note}`.trim();
        }

        return `${playerName} at ${numLine} aces is pretty sharp. His hard-court average is ${avg} and his ace rate is ${rate || "N/A"}, so this feels close rather than obvious. ${note}`.trim();
      }
    }

    if (avg) {
      return `${playerName} averages ${avg} aces on hard courts in the data I have loaded, with an ace rate of ${rate || "N/A"}. ${note}`.trim();
    }

    if (p?.serveStats) {
      return `${playerName}'s serve profile says ${p.serveStats}. I would frame any ace prop off that rather than guessing.`;
    }

    return `I do not have enough ace-specific context on ${playerName} yet to make that sharp.`;
  }

  function parseAceLine(question) {
    const overMatch = question.match(/over\s+(\d+(\.\d+)?)/i);
    const underMatch = question.match(/under\s+(\d+(\.\d+)?)/i);

    if (overMatch) return overMatch[1];
    if (underMatch) return underMatch[1];

    const plainMatch = question.match(/(\d+(\.\d+)?)\s*aces?/i);
    if (plainMatch) return plainMatch[1];

    return null;
  }

  const playerInQuestion = findPlayerInQuestion(q);
  const liveMatch = findMatchFromQuestion(q);

  if (
    q.includes("ace") ||
    q.includes("aces")
  ) {
    const acePlayer =
      playerInQuestion ||
      (liveMatch ? getLiveMatchPlayers(liveMatch).p1 : null);

    if (acePlayer) {
      return buildAcesTake(acePlayer, parseAceLine(raw));
    }
  }

  if (
    q.includes("who wins") ||
    q.includes("winner") ||
    q.includes("wins") ||
    q.includes("advance") ||
    q.includes("beat")
  ) {
    if (liveMatch) {
      const { p1, p2 } = getLiveMatchPlayers(liveMatch);
      const p1Data = getPlayerData(p1);
      const p2Data = getPlayerData(p2);

      let lean = `${p1} vs ${p2} is not a coin flip to me.`;
      if ((p1Data?.elo || 0) > (p2Data?.elo || 0)) {
        lean += ` I lean ${p1} because the stronger profile in the data sits with him right now.`;
      } else if ((p2Data?.elo || 0) > (p1Data?.elo || 0)) {
        lean += ` I lean ${p2} because the stronger profile in the data sits with him right now.`;
      } else {
        lean += ` I see this as pretty tight on paper.`;
      }

      const matchupContext = getContextMatchup(p1, p2);
      if (matchupContext?.angle) {
        lean += ` ${matchupContext.angle}`;
      }

      lean += oddsText(liveMatch);
      return lean.trim();
    }

    if (selectedMatchup?.title) {
      return `On ${selectedMatchup.title}, the right answer depends on serve control, surface fit, and who is more trustworthy late. Ask me the specific matchup and I can get sharper.`;
    }
  }

  if (
    q.includes("tell me about") ||
    q.includes("matchup") ||
    q.includes("what matters") ||
    q.includes("break down")
  ) {
    if (liveMatch) {
      return buildMatchupTake(liveMatch);
    }

    if (selectedMatchup?.title) {
      return `On ${selectedMatchup.title}: ${selectedMatchup.whatMatters}`;
    }
  }

  if (playerInQuestion) {
    return buildPlayerTake(playerInQuestion);
  }

  if (liveMatch) {
    return buildMatchupTake(liveMatch);
  }

  if (tour === "wta") {
    return `Ask me about a WTA Miami matchup, a player like Sabalenka or Swiatek, or an ace question and I will answer from the tennis layer.`;
  }

  return `Ask me about an ATP Miami matchup, a player like Sinner or Alcaraz, or an ace line and I will answer from the tennis layer.`;
}
