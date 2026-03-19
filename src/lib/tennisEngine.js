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
  const rate =
    aceData?.ace_rate
      ? parseFloat(String(aceData.ace_rate).replace("%", ""))
      : p?.serveStats?.acePct;

  const holdPct = p?.serveStats?.holdPct;
  const note = aceData?.note || p?.miamiNote || p?.fullNote || "";

  const isBigServer =
    p?.strengths?.includes("ace_volume") ||
    p?.strengths?.includes("easy_holds") ||
    p?.style?.includes("big_server");

  if (lineInfo) {
    const numLine = lineInfo.value;

    // HIGH LINE
    if (numLine >= 14) {
  if (isBigServer || (rate && rate >= 16)) {
    return `That number is big, but with ${dbName} it always comes down to serve volume. If he’s landing first serves and holding cleanly, the path is obvious because ace production is the whole match lever for him. The caution is that ${numLine} is still a big number — in Miami that usually plays more like a ceiling script than a normal median unless the sets stay tight.`;
  }

    // LOW LINE
    if (numLine <= 6) {
      if (isBigServer || (rate && rate >= 10)) {
        return `${dbName} at ${numLine} is a number that can disappear quickly if the serve is on. For this type of profile, you do not need a marathon — just clean service games and enough first-serve volume.`;
      }

      if (avg && avg > numLine) {
        return `${dbName} clearing ${numLine} has a fair case if the match stays on serve. The loaded average is ${avg}, which puts that line in a reachable range rather than an extreme one.`;
      }

      return `${dbName} at ${numLine} feels reasonable, but it still depends on whether the match stays serve-led or turns into more return pressure than expected.`;
    }

    // MID RANGE
    if (isBigServer || (rate && rate >= 14)) {
      return `${dbName} around ${numLine} comes down to serve quality and hold comfort. If he is getting a lot of first serves in and protecting games cleanly, the over can build naturally. If the returner gets enough neutral balls, that same number starts to look heavy.`;
    }

    if (avg) {
      if (avg > numLine) {
        return `${dbName} has a live path over ${numLine}. His loaded hard-court average is ${avg}, so the number is asking for something close to his normal range, not an outlier.`;
      }

      if (avg < numLine) {
        return `${dbName} over ${numLine} is asking for more than his loaded hard-court baseline of ${avg}. That makes it more of an upside script than a standard expectation.`;
      }

      return `${dbName} at ${numLine} looks pretty fair. The line is sitting close to his loaded hard-court baseline, so match shape becomes the separator.`;
    }

    return `${dbName} at ${numLine} is mostly a serve-volume read. If he is holding comfortably and the sets stay competitive, the over stays live.`;
  }

  // NO LINE PROVIDED
  if (isBigServer || (rate && rate >= 14)) {
    if (rate && holdPct) {
      return `${dbName} is an ace-driven profile. The serve is the whole lever: ${rate}% ace rate with ${holdPct}% hold rate is exactly the kind of combination that creates big-volume ace matches when service games stay clean.`;
    }

    if (rate) {
      return `${dbName} is an ace-driven profile. A ${rate}% ace rate gives him real upside whenever the match stays on serve long enough for volume to build.`;
    }

    return `${dbName} is a serve-first player. When the first serve is landing, ace volume becomes the main story of the match.`;
  }

  if (avg) {
    return `${dbName} averages ${avg} aces on hard courts in the loaded data. That gives you a solid baseline, and then the real question becomes whether the matchup lets him hold cleanly enough to beat that number.`;
  }

  if (rate) {
    return `${dbName} has enough serve pop to matter in ace markets. The key question is whether the match gives him enough clean service volume to turn that into a big number.`;
  }

  return note || `${dbName} can generate aces when the serve is dictating, but the match script matters more than raw talent alone.`;
}

  function buildLiveUnknownAceTake(playerName, lineInfo, match) {
  const { p1, p2 } = getLiveMatchPlayers(match || {});
  const opponent = clean(playerName) === clean(p1) ? p2 : p1;
  const line = lineInfo?.value;

  const playerData =
    getPlayerData(playerName) ||
    getPlayerData(findPlayerInDatabase(playerName));

  const isBigServer =
    playerData?.strengths?.includes("ace_volume") ||
    playerData?.strengths?.includes("easy_holds") ||
    playerData?.style?.includes("big_server");

  const serveProfile = playerData?.serveStats;

  // --- HIGH LINE (14+) ---
  if (line && line >= 14) {
    if (isBigServer) {
      return `${playerName} at ${line} is always a serve-volume question, not a normal projection. If his first serve is landing and he’s holding cleanly, the ace count can stack quickly because that’s his entire match identity. The risk is Miami — it’s not the fastest hard court, so you get more neutral rallies than you would somewhere like the US Open. That turns ${line} into more of a ceiling outcome than a median one unless the match stays tight.`.trim();
    }

    return `${playerName} at ${line} is a high bar. For an over to get there cleanly, you usually need either a long match or extremely comfortable service games. Against ${opponent}, I would treat that number as more of a ceiling than a baseline unless the match script really stretches out.`.trim();
  }

  // --- LOW LINE (≤6) ---
  if (line && line <= 6) {
    if (isBigServer) {
      return `${playerName} at ${line} is a number that can go quickly if the serve is on. For this type of profile, you don’t need long rallies — just clean holds and first-strike points. The only real risk is if ${opponent} gets enough returns in play to flatten the ace curve.`.trim();
    }

    return `${playerName} at ${line} is a modest number. If the match stays on serve for stretches, that can clear naturally. The question is whether ${opponent} can apply enough return pressure to keep the ace count from building.`.trim();
  }

  // --- MID RANGE ---
  if (line) {
    if (isBigServer) {
      return `${playerName} around ${line} aces comes down to how clean his service games are. If he’s landing first serves and avoiding extended rallies, the path is there. If ${opponent} forces more second-ball exchanges, that number starts to look like a stretch instead of a baseline.`.trim();
    }

    return `${playerName} at ${line} is very matchup-dependent. This is more about match shape than raw serve ability — quick holds push it over, return pressure pulls it under.`.trim();
  }

  // --- NO LINE ---
  if (serveProfile?.acePct) {
    return `${playerName}'s serve profile suggests an ace-driven path when he’s holding comfortably. The question is less about raw ability and more about whether the match stays on serve long enough for that to show up.`.trim();
  }

  return `${playerName} ace outcomes here are driven by match flow — if the serve is dictating and games stay short, the number can climb quickly. If ${opponent} gets returns into play, it cools off fast.`.trim();
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
