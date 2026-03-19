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

  function noDash(text) {
    return String(text || "")
      .replace(/—/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function clean(str) {
    return String(str || "")
      .toLowerCase()
      .replace(/[.\-']/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function pick(arr) {
    if (!Array.isArray(arr) || !arr.length) return "";
    return arr[Math.floor(Math.random() * arr.length)];
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

    return (
      playerNames.find((name) => {
        const lowerName = clean(name);
        const surname = getSurname(name);
        return cq.includes(lowerName) || (surname && cq.includes(surname));
      }) || null
    );
  }

  function findLiveMatchFromQuestion(question) {
    if (!Array.isArray(liveMatches)) return null;

    const cq = clean(question);

    return (
      liveMatches.find((match) => {
        const { p1, p2 } = getLiveMatchPlayers(match);

        const p1Full = clean(p1);
        const p2Full = clean(p2);
        const p1Surname = getSurname(p1);
        const p2Surname = getSurname(p2);

        const mentionsP1 = cq.includes(p1Full) || (p1Surname && cq.includes(p1Surname));
        const mentionsP2 = cq.includes(p2Full) || (p2Surname && cq.includes(p2Surname));

        return mentionsP1 || mentionsP2;
      }) || null
    );
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

  function parseLine(question, keywordPattern) {
    if (keywordPattern && !keywordPattern.test(question)) return null;

    const overMatch = question.match(/over\s+(\d+(\.\d+)?)/i);
    const underMatch = question.match(/under\s+(\d+(\.\d+)?)/i);

    if (overMatch) return { value: Number(overMatch[1]), side: "over" };
    if (underMatch) return { value: Number(underMatch[1]), side: "under" };

    const plainMatch = question.match(/(\d+(\.\d+)?)/);
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

    const formatted = usable.map((o) => `${o.name} ${o.price}`).join(" | ");
    return formatted ? `Market is showing ${formatted}.` : "";
  }

  function formatStyle(style) {
    if (!style) return "";
    if (Array.isArray(style)) return style.join(", ").replaceAll("_", " ");
    return String(style).replaceAll("_", " ");
  }

  function getAcePct(player) {
    if (player?.serveStats?.acePct !== undefined) return Number(player.serveStats.acePct);
    return null;
  }

  function getHoldPct(player) {
    if (player?.serveStats?.holdPct !== undefined) return Number(player.serveStats.holdPct);
    return null;
  }

  function getDfPct(player) {
    if (player?.serveStats?.dfPct !== undefined) return Number(player.serveStats.dfPct);
    return null;
  }

  function getBreakPct(player) {
    if (player?.returnStats?.breakPct !== undefined) return Number(player.returnStats.breakPct);
    return null;
  }

  function getTbPct(player) {
    if (player?.overallStats?.tiebreakPct !== undefined) return Number(player.overallStats.tiebreakPct);
    return null;
  }

  function isBigServerProfile(player) {
    return Boolean(
      player?.strengths?.includes("ace_volume") ||
        player?.strengths?.includes("easy_holds") ||
        player?.style?.includes("big_server")
    );
  }

  function isReturnPressureProfile(player) {
    const breakPct = getBreakPct(player);
    return Boolean(
      (breakPct && breakPct >= 27) ||
        player?.strengths?.includes("return_game") ||
        player?.strengths?.includes("consistency")
    );
  }

  function extractMentionedPlayers(question) {
    const cq = clean(question);
    const found = [];

    for (const name of playerNames) {
      const lowerName = clean(name);
      const surname = getSurname(name);

      if (cq.includes(lowerName) || (surname && cq.includes(surname))) {
        if (!found.includes(name)) {
          found.push(name);
        }
      }
    }

    if (found.length >= 2) return found.slice(0, 2);

    if (Array.isArray(liveMatches)) {
      for (const match of liveMatches) {
        const { p1, p2 } = getLiveMatchPlayers(match);
        const p1Surname = getSurname(p1);
        const p2Surname = getSurname(p2);

        const hasP1 = cq.includes(clean(p1)) || (p1Surname && cq.includes(p1Surname));
        const hasP2 = cq.includes(clean(p2)) || (p2Surname && cq.includes(p2Surname));

        if (hasP1 && hasP2) {
          const a = findPlayerInDatabase(p1) || p1;
          const b = findPlayerInDatabase(p2) || p2;
          return [a, b];
        }
      }
    }

    return found.slice(0, 2);
  }

  const aceHighOpeners = [
    (name, line) => `${line} is not a neutral number.`,
    (name, line) => `That is a big line for a serve-driven profile.`,
    (name, line) => `${line} asks for more than just upside.`,
  ];

  const aceHighMiddle = [
    (name) =>
      `With ${name}, this is really a question about sustained control on serve.`,
    (name) =>
      `With ${name}, the path exists because the match runs through service games.`,
    (name) =>
      `${name} can get there, but only if the serve dictates the shape of the match.`,
  ];

  const aceHighFriction = [
    (line) =>
      `Miami adds just enough resistance that you need that control for longer than usual.`,
    (line) =>
      `The court gives returners a little more life, so ${line} becomes something you reach, not something you assume.`,
    (line) =>
      `Miami takes a little off the free-point edge, which makes a line like this less forgiving.`,
  ];

  const aceHighClosers = [
    () => `That is the pressure point in the number.`,
    () => `That is the part that matters.`,
    () => `That is what decides whether it gets there or not.`,
  ];

  const aceLeanOvers = [
    () => `I lean over, but the path is narrow.`,
    () => `I lean over, though it is not a casual over.`,
    () => `I lean over, but only because the serve gives him a real route.`,
  ];

  const aceLeanUnders = [
    () => `I lean under because the line is pricing a cleaner script than I want to assume.`,
    () => `I lean under because the number asks for too much control.`,
    () => `I lean under because the path exists, but it is thinner than the line suggests.`,
  ];

  const matchupServeVsResistance = [
    (server, grinder) =>
      `This is a style clash. ${server} wants the match compressed around service games, while ${grinder} wants time in points and return pressure.`,
    (server, grinder) =>
      `This matchup pulls in opposite directions. ${server} is trying to keep points short and hold cleanly, while ${grinder} needs rallies to show up.`,
    (server, grinder) =>
      `${server} is trying to turn this into a short-point match. ${grinder} needs to drag it the other way.`,
  ];

  const matchupBaseline = [
    (p1, p2) =>
      `This looks more like a baseline match where control comes from who can create pressure first.`,
    (p1, p2) =>
      `This feels less about serve dominance and more about who can impose patterns from the baseline.`,
    (p1, p2) =>
      `This is more of a rally match, so the edge comes from who gets into preferred patterns first.`,
  ];

  const matchupFollow = [
    () => `Once that balance shifts, the match usually goes with it.`,
    () => `If one player settles into a preferred pattern, the match usually follows it.`,
    () => `Once one side gets the tempo it wants, the rest of the match tends to lean with it.`,
  ];

  const winnerOpeners = [
    (p1, p2) => `This is not really about who is better on paper.`,
    (p1, p2) => `${p1} vs ${p2} is more about match control than name value.`,
    (p1, p2) => `This is a control question more than a talent question.`,
  ];

  const winnerClosers = [
    () => `That is the steadier path.`,
    () => `That is the cleaner route through the match.`,
    () => `That is what gives one side a more stable script.`,
  ];

  const genericClosers = [
    () => `That is the real hinge in the spot.`,
    () => `That is where the match turns.`,
    () => `That is the part worth paying attention to.`,
  ];

  const liveMatch = findLiveMatchFromQuestion(q);
  const dbPlayerInQuestion = findPlayerInDatabase(q);
  const livePlayerInQuestion = liveMatch ? getQuestionPlayerFromLiveMatch(q, liveMatch) : null;
  const mentionedPlayers = extractMentionedPlayers(q);

  const aceLineInfo = parseLine(raw, /ace|aces/i);
  const dfLineInfo = parseLine(raw, /double fault|double faults|\bdf\b/i);

  const isAceQuestion = /ace|aces/i.test(q);
  const isDoubleFaultQuestion = /double fault|double faults|\bdf\b/i.test(q);

  const isLeanQuestion =
    q.includes("lean") ||
    q.includes("yes or no") ||
    q.includes("over or under") ||
    q.includes("should i") ||
    q.includes("play it") ||
    q.includes("worth it");

  const isWinnerQuestion =
    q.includes("who wins") ||
    q.includes("winner") ||
    q.includes("wins") ||
    q.includes("winning") ||
    q.includes("advance") ||
    q.includes("beat") ||
    q.includes("who is") ||
    q === "who wins?" ||
    q === "who wins" ||
    (isLeanQuestion && (q.includes("winning") || q.includes("winner")));

  const activePlayer = dbPlayerInQuestion || livePlayerInQuestion;

  function buildPlayerTake(playerName) {
    const dbName = findPlayerInDatabase(playerName) || playerName;
    const p = getPlayerData(dbName);

    if (!p) {
      return noDash(
        `${dbName} is on the board, but I do not have a finished player card for him yet. Ask through the matchup or the prop angle and I can still frame the match in useful terms.`
      );
    }

    const style = formatStyle(p.style);
    const strengths = Array.isArray(p.strengths)
      ? p.strengths.slice(0, 3).join(", ").replaceAll("_", " ")
      : "";

    let answer = `${dbName} profiles as ${style || "a dangerous player"} with Elo ${p.elo || "unknown"}.`;

    if (p.record2026) {
      answer += ` ${p.record2026}.`;
    }

    if (strengths) {
      answer += ` The core strengths are ${strengths}.`;
    }

    if (p.miamiNote) {
      answer += ` ${p.miamiNote}`;
    } else if (p.fullNote) {
      answer += ` ${p.fullNote}`;
    }

    return noDash(answer);
  }

  function buildKnownAceTake(playerName, lineInfo) {
    const dbName = findPlayerInDatabase(playerName) || playerName;
    const aceData = context?.ace_props?.[dbName];
    const p = getPlayerData(dbName);

    if (!aceData && !p) return null;

    const avg = aceData?.avg_aces_hard;
    const rate = aceData?.ace_rate
      ? parseFloat(String(aceData.ace_rate).replace("%", ""))
      : getAcePct(p);
    const holdPct = getHoldPct(p);
    const isBigServer = isBigServerProfile(p);

    if (lineInfo) {
      const numLine = lineInfo.value;

      if (numLine >= 14) {
        if (isLeanQuestion) {
          if ((holdPct && holdPct >= 86) || (rate && rate >= 16)) {
            return noDash(
              `${pick(aceLeanOvers)()} The number still needs clean holds for most of the match. Miami makes that a little harder to maintain.`
            );
          }

          return noDash(
            `${pick(aceLeanUnders)()} It can get there, but it needs a cleaner serve script than I want to price in automatically.`
          );
        }

        if (isBigServer || (rate && rate >= 14)) {
          return noDash(
            `${pick(aceHighOpeners)(dbName, numLine)} ${pick(aceHighMiddle)(dbName)} If his service games stay clean, the count builds quickly without needing long rallies. ${pick(aceHighFriction)(numLine)} ${pick(aceHighClosers)()}`
          );
        }

        if (avg && avg < numLine) {
          return noDash(
            `${numLine} is asking for more than the loaded hard-court baseline of ${avg}. That makes it an upside script, not a routine one.`
          );
        }

        return noDash(
          `${numLine} is a high line. The over needs either very comfortable service games or enough match length for the volume to pile up.`
        );
      }

      if (numLine <= 6) {
        if (isLeanQuestion) {
          if ((holdPct && holdPct >= 84) || (rate && rate >= 10)) {
            return noDash(
              `I lean over because the line is light enough to clear if the serve shows up early. The risk is that return pressure gets into the match faster than expected.`
            );
          }

          return noDash(
            `I would be more careful on the over here. A smaller line still needs the serve to show up before the match gets messy.`
          );
        }

        if (isBigServer || (rate && rate >= 10)) {
          return noDash(
            `${numLine} is a lighter line, so it comes down to whether the serve shows up early. If the service games are clean, it can clear without asking for much match length.`
          );
        }

        if (avg && avg > numLine) {
          return noDash(
            `${dbName} clearing ${numLine} has a fair path if the match stays on serve. The loaded average is ${avg}, so the number is reachable without asking for something extreme.`
          );
        }

        return noDash(
          `${numLine} feels reasonable, but it still depends on whether the match stays serve-led or turns into more return pressure than expected.`
        );
      }

      if (isLeanQuestion) {
        if ((holdPct && holdPct >= 85) || (rate && rate >= 13)) {
          return noDash(
            `I lean over, but this is more about match shape than raw serve talent. If the holds are clean, the path is there.`
          );
        }

        return noDash(
          `I am more cautious than bullish here. The number is playable only if the serve controls the shape of the match.`
        );
      }

      if (isBigServer || (rate && rate >= 13)) {
        return noDash(
          `${numLine} is really a market translation of service control. If the holds are clean and the points stay short, the path is there. If the returner gets enough neutral balls, the same number starts to feel heavy.`
        );
      }

      if (avg) {
        if (avg > numLine) {
          return noDash(
            `${dbName} has a live path over ${numLine}. The loaded hard-court average is ${avg}, so the line is asking for something close to normal range, not a true outlier.`
          );
        }

        if (avg < numLine) {
          return noDash(
            `${dbName} over ${numLine} is asking for more than the loaded hard-court baseline of ${avg}. That makes it more of an upside script than a standard expectation.`
          );
        }

        return noDash(
          `${dbName} at ${numLine} looks pretty fair. The line sits close to baseline, so match shape decides the rest.`
        );
      }

      return noDash(
        `${dbName} at ${numLine} is mostly a serve-volume read. If he is holding comfortably and the sets stay competitive, the over stays live.`
      );
    }

    if (isBigServer || (rate && rate >= 14)) {
      if (rate && holdPct) {
        return noDash(
          `${dbName} is an ace-driven profile. A ${rate}% ace rate with a ${holdPct}% hold rate is exactly the kind of combination that creates big-volume ace matches when service games stay clean.`
        );
      }

      if (rate) {
        return noDash(
          `${dbName} is an ace-driven profile. A ${rate}% ace rate gives him real upside any time the match stays on serve long enough for volume to build.`
        );
      }

      return noDash(
        `${dbName} is a serve-first player. When the first serve is landing, ace volume becomes the main story.`
      );
    }

    if (avg) {
      return noDash(
        `${dbName} averages ${avg} aces on hard courts in the loaded data. That gives you a solid baseline, and then the real question is whether the matchup lets him hold cleanly enough to beat it.`
      );
    }

    return null;
  }

  function buildLiveUnknownAceTake(playerName, lineInfo, match) {
    const { p1, p2 } = getLiveMatchPlayers(match || {});
    const opponent = clean(playerName) === clean(p1) ? p2 : p1;

    const playerData =
      getPlayerData(playerName) || getPlayerData(findPlayerInDatabase(playerName));
    const isBigServer = isBigServerProfile(playerData);
    const line = lineInfo?.value;

    if (line && line >= 14) {
      if (isLeanQuestion) {
        if (isBigServer) {
          return noDash(
            `I lean over, but only if you believe the serve stays in charge. A number this high needs sustained control, not just a hot stretch.`
          );
        }

        return noDash(
          `I would be careful on the over. A line this high needs a cleaner service script than I want to assume.`
        );
      }

      if (isBigServer) {
        return noDash(
          `${line} is not a neutral number. With ${playerName}, the path exists because the match runs through service games. If the holds are clean, the count can stack quickly. The problem is that Miami gives returners just enough traction to make a line like this less forgiving.`
        );
      }

      return noDash(
        `${line} is a high bar. For the over to get there cleanly, you usually need either a long match or extremely comfortable service games. Against ${opponent}, I would treat that more as a ceiling than a baseline unless the match really stretches.`
      );
    }

    if (line && line <= 6) {
      if (isLeanQuestion) {
        if (isBigServer) {
          return noDash(
            `I lean over because the line is modest enough to clear if the serve shows up early. The risk is that return pressure gets into the match before the count has time to build.`
          );
        }

        return noDash(
          `I would be more cautious here. A smaller line still needs the serve to show up before the match gets dragged into rallies.`
        );
      }

      if (isBigServer) {
        return noDash(
          `${line} is a number that can go quickly if the serve is on. For this kind of profile, you do not need long rallies. You need clean holds and enough first-strike points.`
        );
      }

      return noDash(
        `${line} is modest. If the match stays on serve for stretches, that can clear naturally. The real question is whether ${opponent} applies enough return pressure to keep the ace count from building.`
      );
    }

    if (line) {
      if (isLeanQuestion) {
        if (isBigServer) {
          return noDash(
            `I lean slightly over, but the path still depends on service comfort more than raw upside. If the holds are clean, it stays live.`
          );
        }

        return noDash(
          `I am more cautious than bullish here. This looks more match-dependent than the number suggests.`
        );
      }

      if (isBigServer) {
        return noDash(
          `${line} is really a question about how clean the service games are. If the first serve is landing and the points stay short, the path is there. If ${opponent} forces more second-ball exchanges, the number starts to feel heavy.`
        );
      }

      return noDash(
        `${line} is very matchup-dependent. This is more about match flow than raw serve talent. Quick holds push it over. Return pressure pulls it back.`
      );
    }

    return noDash(
      `${playerName} ace outcomes here are driven by match flow. If the serve is dictating and the games stay short, the number can climb quickly. If ${opponent} gets returns into play, it cools off fast.`
    );
  }

  function buildDoubleFaultTake(playerName, lineInfo) {
    const dbName = findPlayerInDatabase(playerName) || playerName;
    const p = getPlayerData(dbName);
    const dfPct = getDfPct(p);

    if (lineInfo?.value !== undefined && lineInfo?.value !== null) {
      const numLine = lineInfo.value;

      if (isLeanQuestion) {
        if (dfPct && dfPct >= 5) {
          return noDash(
            `I lean over. A line like ${numLine} becomes reachable when the second serve is the stress point in the match.`
          );
        }

        return noDash(
          `I would be more careful on the over. Double-fault numbers usually need visible scoreboard pressure before they build.`
        );
      }

      if (dfPct && dfPct >= 5) {
        return noDash(
          `${numLine} is really asking whether the second serve becomes part of the match. If it does, the over has a path. If the service games stay calm, it can sit below the line for a long time.`
        );
      }

      return noDash(
        `${numLine} is less about raw serve quality and more about pressure. Double-fault numbers usually build when service games start to tighten.`
      );
    }

    if (dfPct) {
      return noDash(
        `${dbName} has enough second-serve volatility to matter in this market. The real question is whether the match creates enough pressure for it to show up.`
      );
    }

    return noDash(
      `${dbName} double-fault props are mostly pressure props. They build when service games stop feeling comfortable.`
    );
  }

  function buildMatchupTakeFromNames(p1Name, p2Name, match = null) {
    const p1Data = getPlayerData(p1Name);
    const p2Data = getPlayerData(p2Name);

    const matchupContext = getContextMatchup(p1Name, p2Name);

    const p1BigServe = isBigServerProfile(p1Data);
    const p2BigServe = isBigServerProfile(p2Data);

    const p1Return = isReturnPressureProfile(p1Data);
    const p2Return = isReturnPressureProfile(p2Data);

    let answer = "";

    if (p1BigServe && !p2BigServe) {
      answer += `${pick(matchupServeVsResistance)(p1Name, p2Name)}`;
    } else if (!p1BigServe && p2BigServe) {
      answer += `${pick(matchupServeVsResistance)(p2Name, p1Name)}`;
    } else {
      answer += `${pick(matchupBaseline)(p1Name, p2Name)}`;
    }

    if (p1Return && !p2Return) {
      answer += ` ${p1Name}'s return profile gives ${p1Name} the cleaner way to disrupt service rhythm.`;
    } else if (!p1Return && p2Return) {
      answer += ` ${p2Name}'s return profile gives ${p2Name} the cleaner way to disrupt service rhythm.`;
    }

    if (matchupContext?.note) {
      answer += ` ${matchupContext.note}`;
    }

    if (matchupContext?.angle) {
      answer += ` ${matchupContext.angle}`;
    }

    answer += ` ${pick(matchupFollow)()} ${pick(genericClosers)()}`;

    const market = match ? oddsText(match) : "";
    if (market) {
      answer += ` ${market}`;
    }

    return noDash(answer);
  }

  function buildWhoWinsTakeFromNames(p1Name, p2Name, match = null) {
    const p1Data = getPlayerData(p1Name);
    const p2Data = getPlayerData(p2Name);

    const matchupContext = getContextMatchup(p1Name, p2Name);

    let answer = `${pick(winnerOpeners)(p1Name, p2Name)}`;

    if (p1Data?.elo && p2Data?.elo) {
      if (p1Data.elo > p2Data.elo + 25) {
        answer += ` The stronger overall profile sits with ${p1Name}.`;
      } else if (p2Data.elo > p1Data.elo + 25) {
        answer += ` The stronger overall profile sits with ${p2Name}.`;
      } else {
        answer += ` On raw profile, it is fairly tight.`;
      }
    }

    if (matchupContext?.surface_edge) {
      answer += ` Surface context points toward ${matchupContext.surface_edge}.`;
    }

    if (p1Data && p2Data) {
      const p1Serve = getHoldPct(p1Data);
      const p2Serve = getHoldPct(p2Data);

      if (p1Serve && p2Serve) {
        if (p1Serve > p2Serve + 3) {
          answer += ` ${p1Name} has the cleaner hold profile, which gives ${p1Name} the more stable path if the match stays on serve. ${pick(winnerClosers)()}`;
        } else if (p2Serve > p1Serve + 3) {
          answer += ` ${p2Name} has the cleaner hold profile, which gives ${p2Name} the more stable path if the match stays on serve. ${pick(winnerClosers)()}`;
        } else {
          answer += ` Both players can hold, so this likely comes down to who creates the first real return pressure.`;
        }
      }
    }

    if (matchupContext?.note) {
      answer += ` ${matchupContext.note}`;
    } else {
      answer += ` This looks more like a match where the player who gets into preferred patterns first takes control.`;
    }

    if (matchupContext?.angle) {
      answer += ` ${matchupContext.angle}`;
    }

    const market = match ? oddsText(match) : "";
    if (market) {
      answer += ` ${market}`;
    }

    return noDash(answer);
  }

  if (isAceQuestion) {
    const acePlayer = activePlayer;

    if (acePlayer) {
      const knownAceAnswer = buildKnownAceTake(acePlayer, aceLineInfo);
      if (knownAceAnswer) return knownAceAnswer;

      if (liveMatch) {
        return buildLiveUnknownAceTake(acePlayer, aceLineInfo, liveMatch);
      }

      return noDash(
        `${acePlayer} ace props come down to whether the match projects as quick holds or return-heavy games. If the serve is the main lever, the number stays live. If not, it gets harder fast.`
      );
    }
  }

  if (isDoubleFaultQuestion) {
    const dfPlayer = activePlayer;
    if (dfPlayer) {
      return buildDoubleFaultTake(dfPlayer, dfLineInfo);
    }
  }

  if (isWinnerQuestion) {
    if (liveMatch) {
      const { p1, p2 } = getLiveMatchPlayers(liveMatch);
      return buildWhoWinsTakeFromNames(findPlayerInDatabase(p1) || p1, findPlayerInDatabase(p2) || p2, liveMatch);
    }

    if (mentionedPlayers.length >= 2) {
      return buildWhoWinsTakeFromNames(mentionedPlayers[0], mentionedPlayers[1]);
    }

    if (selectedMatchup?.title) {
      return noDash(
        `On ${selectedMatchup.title}, the answer comes down to serve control, surface fit, and who is more comfortable late in sets.`
      );
    }
  }

  if (
    q.includes("tell me about") ||
    q.includes("matchup") ||
    q.includes("what matters") ||
    q.includes("break down") ||
    q.includes("vs")
  ) {
    if (liveMatch) {
      const { p1, p2 } = getLiveMatchPlayers(liveMatch);
      return buildMatchupTakeFromNames(findPlayerInDatabase(p1) || p1, findPlayerInDatabase(p2) || p2, liveMatch);
    }

    if (mentionedPlayers.length >= 2) {
      return buildMatchupTakeFromNames(mentionedPlayers[0], mentionedPlayers[1]);
    }

    if (selectedMatchup?.title) {
      return noDash(`On ${selectedMatchup.title}: ${selectedMatchup.whatMatters}`);
    }
  }

  if (dbPlayerInQuestion) {
    return buildPlayerTake(dbPlayerInQuestion);
  }

  if (livePlayerInQuestion) {
    return noDash(
      `${livePlayerInQuestion} is on the live Miami board right now. I do not have a finished deep profile for that exact name yet, but I can still break down the matchup angle, the prop angle, or who I trust more in the match.`
    );
  }

  if (liveMatch) {
    const { p1, p2 } = getLiveMatchPlayers(liveMatch);
    return buildMatchupTakeFromNames(findPlayerInDatabase(p1) || p1, findPlayerInDatabase(p2) || p2, liveMatch);
  }

  if (tour === "wta") {
    return noDash(
      `Ask me about a WTA Miami matchup, a player like Sabalenka or Swiatek, or a prop question and I will answer from the tennis layer.`
    );
  }

  return noDash(
    `Ask me about an ATP Miami matchup, a player like Sinner or Alcaraz, or a prop question and I will answer from the tennis layer.`
  );
}
