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

  function displayName(name) {
    return name || "Player";
  }

  function formatStyle(style) {
    if (!style) return "";
    if (Array.isArray(style)) {
      return style.join(", ").replaceAll("_", " ");
    }
    return String(style).replaceAll("_", " ");
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

    const formatted = usable.map((o) => `${o.name} ${o.price}`).join(" | ");
    return formatted ? `Market is showing ${formatted}.` : "";
  }

  function getAcePct(player) {
    if (player?.serveStats?.acePct !== undefined) return Number(player.serveStats.acePct);
    return null;
  }

  function getHoldPct(player) {
    if (player?.serveStats?.holdPct !== undefined) return Number(player.serveStats.holdPct);
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

  const aceOpeners = [
    (name) => `That number is high, but with ${name} this is not a normal profile.`,
    (name) => `With ${name}, this always starts with the serve.`,
    (name) => `This is a very specific kind of ace bet with ${name}.`,
  ];

  const aceLevers = [
    (name) => `${name} wins or loses this on service-game comfort.`,
    (name) => `This comes down to how comfortable ${name}'s service games are.`,
    (name) => `If ${name} is landing first serves, the count can build quickly.`,
  ];

  const aceFriction = [
    () => `Miami makes that a little less automatic than the fastest hard courts.`,
    () => `The court gives returners a few more looks than a pure serve track would.`,
    () => `You do not get quite as many free points here as you would on a faster hard court.`,
  ];

  const aceClosers = [
    () => `That is the real hinge on this number.`,
    () => `That is where this either gets there or comes up short.`,
    () => `That is the read that matters more than the headline line itself.`,
  ];

  const matchupClosers = [
    () => `That is the part of the match worth paying attention to.`,
    () => `That is where the match turns.`,
    () => `That is the real pressure point in this matchup.`,
  ];

  function buildPlayerTake(playerName) {
    const dbName = findPlayerInDatabase(playerName) || playerName;
    const p = getPlayerData(dbName);

    if (!p) {
      return noDash(
        `${dbName} is on the board, but I do not have a finished player card for him yet. If you ask through the matchup or the ace angle, I can still give you something useful.`
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
    const note = aceData?.note || p?.miamiNote || p?.fullNote || "";

    if (lineInfo) {
      const numLine = lineInfo.value;

      if (numLine >= 14) {
        if (isBigServer || (rate && rate >= 16)) {
          return noDash(
            `${pick(aceOpeners)(dbName)} ${pick(aceLevers)(dbName)} If his service games stay clean, the count builds quickly without needing long rallies. ${pick(aceFriction)()} That turns ${numLine} into something you reach when the match stays tight, not something you expect automatically. ${pick(aceClosers)()}`
          );
        }

        if (avg && avg < numLine) {
          return noDash(
            `${dbName} over ${numLine} looks rich. The loaded hard-court average is ${avg}, so you are asking for an upside script, not a routine one. A number like this needs either extra match length or unusually clean service games.`
          );
        }

        return noDash(
          `${dbName} at ${numLine} is a high bar. The over needs either very comfortable holds or enough match length for the volume to pile up.`
        );
      }

      if (numLine <= 6) {
        if (isBigServer || (rate && rate >= 10)) {
          return noDash(
            `${dbName} at ${numLine} can go quickly if the serve is on. You do not need a marathon. You need clean service games and enough first serves to keep the board moving.`
          );
        }

        if (avg && avg > numLine) {
          return noDash(
            `${dbName} clearing ${numLine} has a fair path if the match stays on serve. The loaded average is ${avg}, so the number is reachable without asking for something extreme.`
          );
        }

        return noDash(
          `${dbName} at ${numLine} feels reasonable, but it still depends on whether the match stays serve-led or turns into more return pressure than expected.`
        );
      }

      if (isBigServer || (rate && rate >= 14)) {
        return noDash(
          `${dbName} around ${numLine} comes down to serve quality and hold comfort. If he is getting plenty of first serves in and protecting games cleanly, the path is there. If the returner gets enough neutral balls, the number starts to feel heavier than it looks.`
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

    if (rate) {
      return noDash(
        `${dbName} has enough serve pop to matter in ace markets. The key question is whether the match gives him enough clean service volume to turn that into a bigger number.`
      );
    }

    return noDash(note || `${dbName} can generate aces when the serve is dictating, but the match script matters more than raw talent alone.`);
  }

  function buildLiveUnknownAceTake(playerName, lineInfo, match) {
    const { p1, p2 } = getLiveMatchPlayers(match || {});
    const opponent = clean(playerName) === clean(p1) ? p2 : p1;
    const line = lineInfo?.value;

    const playerData = getPlayerData(playerName) || getPlayerData(findPlayerInDatabase(playerName));
    const isBigServer = isBigServerProfile(playerData);
    const serveProfile = playerData?.serveStats;

    if (line && line >= 14) {
      if (isBigServer) {
        return noDash(
          `That number is high, but with ${playerName} it always comes down to serve volume. If the first serve is landing and the holds are clean, the count can stack quickly because that is the whole match lever for him. Miami gives returners a little more traction, so ${line} plays more like a ceiling script than something you expect by default.`
        );
      }

      return noDash(
        `${playerName} at ${line} is a high bar. For the over to get there cleanly, you usually need either a long match or extremely comfortable service games. Against ${opponent}, I would treat that more as a ceiling than a baseline unless the match really stretches.`
      );
    }

    if (line && line <= 6) {
      if (isBigServer) {
        return noDash(
          `${playerName} at ${line} is a number that can go quickly if the serve is on. For this kind of profile, you do not need long rallies. You need clean holds and enough first-strike points.`
        );
      }

      return noDash(
        `${playerName} at ${line} is modest. If the match stays on serve for stretches, that can clear naturally. The real question is whether ${opponent} applies enough return pressure to keep the ace count from building.`
      );
    }

    if (line) {
      if (isBigServer) {
        return noDash(
          `${playerName} around ${line} aces comes down to how clean the service games are. If the first serve is landing and the points stay short, the path is there. If ${opponent} forces more second-ball exchanges, the number starts to feel heavy.`
        );
      }

      return noDash(
        `${playerName} at ${line} is very matchup-dependent. This is more about match flow than raw serve talent. Quick holds push it over. Return pressure pulls it back.`
      );
    }

    if (serveProfile?.acePct) {
      return noDash(
        `${playerName}'s profile still points to an ace-driven path when the holds are comfortable. The real question is whether the match stays on serve long enough for that to show up.`
      );
    }

    return noDash(
      `${playerName} ace outcomes here are driven by match flow. If the serve is dictating and the games stay short, the number can climb quickly. If ${opponent} gets returns into play, it cools off fast.`
    );
  }

  function buildMatchupTake(match) {
    const { p1, p2 } = getLiveMatchPlayers(match);

    const p1Name = findPlayerInDatabase(p1) || p1;
    const p2Name = findPlayerInDatabase(p2) || p2;

    const p1Data = getPlayerData(p1Name);
    const p2Data = getPlayerData(p2Name);

    const matchupContext = getContextMatchup(p1, p2);

    const p1BigServe = isBigServerProfile(p1Data);
    const p2BigServe = isBigServerProfile(p2Data);

    const p1ReturnEdge = getBreakPct(p1Data);
    const p2ReturnEdge = getBreakPct(p2Data);

    const p1Tb = getTbPct(p1Data);
    const p2Tb = getTbPct(p2Data);

    let answer = "";

    if (p1BigServe && !p2BigServe) {
      answer += `This is a serve vs resistance matchup. ${p1Name} wants short points and clean holds. ${p2Name} wants returns in play and longer exchanges.`;
    } else if (!p1BigServe && p2BigServe) {
      answer += `This is a serve vs resistance matchup. ${p2Name} wants short points and clean holds. ${p1Name} wants returns in play and longer exchanges.`;
    } else if (p1BigServe && p2BigServe) {
      answer += `This could turn into a serve-led match. If both players are holding comfortably, sets can move quickly and small margins take over.`;
    } else {
      answer += `This is more of a baseline matchup. The edge comes from who controls rallies and creates the cleaner break chances.`;
    }

    if (p1ReturnEdge && p2ReturnEdge) {
      if (p1ReturnEdge > p2ReturnEdge + 3) {
        answer += ` ${p1Name}'s return profile is the cleaner weapon here. If he is getting looks on second serves, the match can tilt quickly.`;
      } else if (p2ReturnEdge > p1ReturnEdge + 3) {
        answer += ` ${p2Name}'s return profile is the cleaner weapon here. If he is getting looks on second serves, the match can tilt quickly.`;
      }
    }

    if (!matchupContext?.note && p1Tb && p2Tb) {
      if (p1Tb > p2Tb + 8) {
        answer += ` If this gets tight late, ${p1Name} is the calmer tie-break profile.`;
      } else if (p2Tb > p1Tb + 8) {
        answer += ` If this gets tight late, ${p2Name} is the calmer tie-break profile.`;
      }
    }

    if (matchupContext?.note) {
      answer += ` ${matchupContext.note}`;
    }

    if (matchupContext?.angle) {
      answer += ` ${matchupContext.angle}`;
    }

    answer += ` In Miami, pure serve dominance is a little less automatic than on the fastest hard courts. ${pick(matchupClosers)()}`;

    const market = oddsText(match);
    if (market) {
      answer += ` ${market}`;
    }

    return noDash(answer);
  }

  function buildWhoWinsTake(match) {
  const { p1, p2 } = getLiveMatchPlayers(match);

  const p1Name = findPlayerInDatabase(p1) || p1;
  const p2Name = findPlayerInDatabase(p2) || p2;

  const p1Data = getPlayerData(p1Name);
  const p2Data = getPlayerData(p2Name);

  const matchupContext = getContextMatchup(p1, p2);

  let answer = `${p1Name} vs ${p2Name} comes down to match control more than raw talent.`;

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
        answer += ` ${p1Name} has the cleaner hold profile, which gives him the more stable path if the match stays on serve.`;
      } else if (p2Serve > p1Serve + 3) {
        answer += ` ${p2Name} has the cleaner hold profile, which gives him the more stable path if the match stays on serve.`;
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

  const market = oddsText(match);
  if (market) {
    answer += ` ${market}`;
  }

  return noDash(answer);
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

      return noDash(
        `${acePlayer} ace props come down to whether the match projects as quick holds or return-heavy games. If the serve is the main lever, the number stays live. If not, it gets harder fast.`
      );
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
      return noDash(
        `On ${selectedMatchup.title}, the answer comes down to serve control, surface fit, and who is more comfortable late in sets.`
      );
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
      return noDash(`On ${selectedMatchup.title}: ${selectedMatchup.whatMatters}`);
    }
  }

  if (dbPlayerInQuestion) {
    return buildPlayerTake(dbPlayerInQuestion);
  }

  if (livePlayerInQuestion) {
    return noDash(
      `${livePlayerInQuestion} is on the live Miami board right now. I do not have a finished deep profile for that exact name yet, but I can still break down the matchup angle, the ace angle, or who I trust more in the match.`
    );
  }

  if (liveMatch) {
    return buildMatchupTake(liveMatch);
  }

  if (tour === "wta") {
    return noDash(
      `Ask me about a WTA Miami matchup, a player like Sabalenka or Swiatek, or an ace question and I will answer from the tennis layer.`
    );
  }

  return noDash(
    `Ask me about an ATP Miami matchup, a player like Sinner or Alcaraz, or an ace line and I will answer from the tennis layer.`
  );
}
