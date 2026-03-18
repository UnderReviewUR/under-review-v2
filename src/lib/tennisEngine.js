export function generateTennisTake({
  input,
  selectedMatchup,
  liveMatches = [],
  players = null,
  context = null,
  tour = "atp",
}) {
  const raw = input || "";
  const q = raw.toLowerCase().trim();

  const allPlayers = {
    ...(players?.atp || {}),
    ...(players?.wta || {}),
  };

  const playerNames = Object.keys(allPlayers);

  function clean(str) {
    return String(str || "")
      .toLowerCase()
      .replace(/[.\-']/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getNameParts(name) {
    return clean(name).split(" ").filter(Boolean);
  }

  function getSurname(name) {
    const parts = getNameParts(name);
    return parts.length ? parts[parts.length - 1] : "";
  }

  function getLiveMatchPlayers(match) {
    return {
      p1: match?.home_team || match?.event_first_player || "Player 1",
      p2: match?.away_team || match?.event_second_player || "Player 2",
    };
  }

  function getPlayerData(name) {
    if (!name) return null;
    return allPlayers?.[name] || null;
  }

  function findPlayerInDatabase(question) {
    const cq = clean(question);

    return playerNames.find((name) => {
      const lowerName = clean(name);
      const surname = getSurname(name);

      return (
        cq.includes(lowerName) ||
        (surname && cq.includes(surname))
      );
    }) || null;
  }

  function findLiveMatchFromQuestion(question) {
    if (!Array.isArray(liveMatches)) return null;

    const cq = clean(question);

    return liveMatches.find((match) => {
      const { p1, p2 } = getLiveMatchPlayers(match);

      const p1Full = clean(p1);
      const p2Full = clean(p2);
      const p1Surname = getSurname(p1);
      const p2Surname = getSurname(p2);

      const mentionsP1 = cq.includes(p1Full) || (p1Surname && cq.includes(p1Surname));
      const mentionsP2 = cq.includes(p2Full) || (p2Surname && cq.includes(p2Surname));

      return mentionsP1 || mentionsP2;
    }) || null;
  }

  function getQuestionPlayerFromLiveMatch(question, match) {
    if (!match) return null;

    const cq = clean(question);
    const { p1, p2 } = getLiveMatchPlayers(match);

    const p1Full = clean(p1);
    const p2Full = clean(p2);
    const p1Surname = getSurname(p1);
    const p2Surname = getSurname(p2);

    if (cq.includes(p1Full) || (p1Surname && cq.includes(p1Surname))) return p1;
    if (cq.includes(p2Full) || (p2Surname && cq.includes(p2Surname))) return p2;

    return null;
  }

  function getContextMatchup(p1, p2) {
    if (!context?.matchups) return null;

    const cp1 = clean(p1);
    const cp2 = clean(p2);

    const keys = Object.keys(context.matchups);

    const direct = keys.find((key) => {
      const lower = clean(key.replace(/_/g, " "));
      return lower.includes(cp1) && lower.includes(cp2);
    });

    if (direct) return context.matchups[direct];

    const surname1 = getSurname(p1);
    const surname2 = getSurname(p2);

    const loose = keys.find((key) => {
      const lower = clean(key.replace(/_/g, " "));
      return lower.includes(surname1) && lower.includes(surname2);
    });

    return loose ? context.matchups[loose] : null;
  }

  function parseAceLine(question) {
    const overMatch = question.match(/over\s+(\d+(\.\d+)?)/i);
    const underMatch = question.match(/under\s+(\d+(\.\d+)?)/i);

    if (overMatch) return { value: Number(overMatch[1]), side: "over" };
    if (underMatch) return { value: Number(underMatch[1]), side: "under" };

    const plainMatch = question.match(/(\d+(\.\d+)?)\s*aces?/i);
    if (plainMatch) return { value: Number(plainMatch[1]), side: null };

    return null;
  }

  function oddsText(match) {
    const outcomes = match?.bookmakers?.[0]?.markets?.[0]?.outcomes || [];

    const usable = outcomes.filter(
      (o) =>
        o &&
        o.name &&
        o.price !== undefined &&
        o.price !== null &&
        String(o.price).trim() !== "" &&
        String(o.price).toUpperCase() !== "N/A"
    );

    if (!usable.length) return "";

    const formatted = usable.map((o) => `${o.name} ${o.price}`).join(" · ");
    return formatted ? ` Market is showing ${formatted}.` : "";
  }

  function tiebreakText(playerData, playerName) {
    const tb = playerData?.overallStats?.match(/Tiebreak\s*([\d.]+)/)?.[1];
    if (!tb) return "";
    return `${playerName} is winning ${tb}% of tiebreaks in the loaded data.`;
  }

  function buildMatchupTake(match) {
    const { p1, p2 } = getLiveMatchPlayers(match);
    const p1Data = getPlayerData(p1) || getPlayerData(findPlayerInDatabase(p1));
    const p2Data = getPlayerData(p2) || getPlayerData(findPlayerInDatabase(p2));
    const matchupContext = getContextMatchup(p1, p2);

    let answer = `${p1} vs ${p2} is on the board for Miami.`;

    if (matchupContext?.note) {
      answer += ` ${matchupContext.note}`;
    } else {
      answer += ` This is the kind of matchup where serve quality, return pressure, and whether the match stays on serve matter more than raw name value.`;
    }

    if (matchupContext?.angle) {
      answer += ` ${matchupContext.angle}`;
    } else if (p1Data && p2Data) {
      const p1Tb = p1Data?.overallStats?.match(/Tiebreak\s*([\d.]+)/)?.[1];
      const p2Tb = p2Data?.overallStats?.match(/Tiebreak\s*([\d.]+)/)?.[1];

      if (p1Tb && p2Tb) {
        answer += ` If this gets tight late, ${p1}'s tiebreak rate is ${p1Tb}% versus ${p2}'s ${p2Tb}%.`;
      }
    } else {
      answer += ` The first question is whether one player can control the match with serve and shorten points.`;
    }

    const market = oddsText(match);
    if (market) {
      answer += market;
    } else {
      answer += ` No clean price is loaded on my side right now, so I would frame this off match style rather than pretend I have a number I do not.`;
    }

    return answer.trim();
  }

  function buildPlayerTake(playerName) {
    const dbName = findPlayerInDatabase(playerName) || playerName;
    const p = getPlayerData(dbName);

    if (!p) {
      return `${playerName} is in the live feed, but I do not have a full long-form player card loaded for that name yet. I can still break down the matchup angle if you ask it that way.`;
    }

    let answer = `${dbName} profiles as a ${p.style || "top player"} with Elo ${p.elo || "unknown"}.`;

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

  function buildKnownAceTake(playerName, lineInfo) {
    const dbName = findPlayerInDatabase(playerName) || playerName;
    const aceData = context?.ace_props?.[dbName];
    const p = getPlayerData(dbName);

    if (!aceData && !p) return null;

    const avg = aceData?.avg_aces_hard;
    const rate = aceData?.ace_rate;
    const note = aceData?.note || "";

    if (lineInfo && avg) {
      const numLine = lineInfo.value;

      let lean = "close";
      if (avg >= numLine + 1) lean = "over";
      if (avg <= numLine - 1) lean = "under";

      if (lean === "over") {
        return `${dbName} ${lineInfo.side === "under" ? `under ${numLine}` : `over ${numLine}`} aces has a real case the other way around — the loaded hard-court average is ${avg}, with an ace rate of ${rate || "unknown"}. ${note}`.trim();
      }

      if (lean === "under") {
        return `${dbName} ${lineInfo.side === "over" ? `over ${numLine}` : `under ${numLine}`} aces looks a little rich to me. The loaded hard-court average is ${avg}, which makes ${numLine} more of a ceiling outcome than a median one. ${note}`.trim();
      }

      return `${dbName} at ${numLine} aces is pretty sharp. The loaded hard-court average is ${avg} and the ace rate is ${rate || "unknown"}, so this feels close rather than obvious. ${note}`.trim();
    }

    if (avg) {
      return `${dbName} averages ${avg} aces on hard courts in the loaded data, with an ace rate of ${rate || "unknown"}. ${note}`.trim();
    }

    if (p?.serveStats) {
      return `${dbName}'s serve profile says ${p.serveStats}. I would frame any ace prop off that rather than guess.`;
    }

    return null;
  }

  function buildLiveUnknownAceTake(playerName, lineInfo, match) {
    const { p1, p2 } = getLiveMatchPlayers(match || {});
    const opponent = clean(playerName) === clean(p1) ? p2 : p1;
    const line = lineInfo?.value;

    if (line) {
      if (line >= 14) {
        return `${playerName} ${lineInfo.side === "under" ? `under ${line}` : `over ${line}`} aces is a high bar. For that over to cash cleanly, you usually need either total serve control for long stretches or a match that runs long enough to create volume. Against ${opponent}, the over case is obvious if ${playerName} dominates first-serve points and keeps sets tight. The under case is that ${line} is a real number, not a casual one — one loose return game or a shorter match can kill it fast.`.trim();
      }

      if (line <= 6) {
        return `${playerName} at ${line} aces is a modest line. If the serve is landing and the match stays on serve for stretches, that number can go quickly. The real question is whether ${opponent} forces enough return pressure to keep the ace count ordinary rather than spiky.`.trim();
      }

      return `${playerName} at ${line} aces feels live but matchup-dependent. The right read is whether this match projects as quick holds and tight service games or whether ${opponent} can drag return points into play and cut down the free ones.`.trim();
    }

    return `${playerName} ace questions come down to match shape more than anything else: if the serve is dictating and the sets stay tight, the ace total can climb quickly. If ${opponent} gets enough returns in play, the number cools off just as fast.`.trim();
  }

  function buildWhoWinsTake(match) {
    const { p1, p2 } = getLiveMatchPlayers(match);
    const p1Name = findPlayerInDatabase(p1) || p1;
    const p2Name = findPlayerInDatabase(p2) || p2;
    const p1Data = getPlayerData(p1Name);
    const p2Data = getPlayerData(p2Name);
    const matchupContext = getContextMatchup(p1, p2);

    let answer = `${p1} vs ${p2} is not a coin flip to me.`;

    if (p1Data?.elo && p2Data?.elo) {
      if (p1Data.elo > p2Data.elo) {
        answer += ` I lean ${p1} because the stronger loaded profile sits with that side right now.`;
      } else if (p2Data.elo > p1Data.elo) {
        answer += ` I lean ${p2} because the stronger loaded profile sits with that side right now.`;
      } else {
        answer += ` On the numbers I have, this is pretty tight.`;
      }
    } else {
      answer += ` I would frame it through serve control, surface fit, and who is more trustworthy late in sets.`;
    }

    if (matchupContext?.angle) {
      answer += ` ${matchupContext.angle}`;
    }

    const market = oddsText(match);
    if (market) {
      answer += market;
    }

    return answer.trim();
  }

  const liveMatch = findLiveMatchFromQuestion(q);
  const dbPlayerInQuestion = findPlayerInDatabase(q);
  const livePlayerInQuestion = liveMatch ? getQuestionPlayerFromLiveMatch(q, liveMatch) : null;
  const lineInfo = parseAceLine(raw);

  if (q.includes("ace") || q.includes("aces")) {
    const acePlayer = dbPlayerInQuestion || livePlayerInQuestion;

    if (acePlayer) {
      const knownAceAnswer = buildKnownAceTake(acePlayer, lineInfo);
      if (knownAceAnswer) return knownAceAnswer;

      if (liveMatch) {
        return buildLiveUnknownAceTake(acePlayer, lineInfo, liveMatch);
      }

      return `${acePlayer} ace props depend on whether the match projects as quick holds or return-heavy games. I do not have a loaded ace card for that name yet, so I would treat any big line cautiously rather than call it obvious.`;
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
      return buildWhoWinsTake(liveMatch);
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

  if (dbPlayerInQuestion) {
    return buildPlayerTake(dbPlayerInQuestion);
  }

  if (livePlayerInQuestion) {
    return `${livePlayerInQuestion} is in the live Miami board right now. I do not have a full deep profile loaded for that exact name yet, but I can still break down the matchup angle, the ace line, or who I trust more in the match.`;
  }

  if (liveMatch) {
    return buildMatchupTake(liveMatch);
  }

  if (tour === "wta") {
    return `Ask me about a WTA Miami matchup, a player like Sabalenka or Swiatek, or an ace question and I will answer from the tennis layer.`;
  }

  return `Ask me about an ATP Miami matchup, a player like Sinner or Alcaraz, or an ace line and I will answer from the tennis layer.`;
}
