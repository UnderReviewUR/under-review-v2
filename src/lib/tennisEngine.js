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
    return String(str || "").toLowerCase().replace(/[.\-']/g, " ").replace(/\s+/g, " ").trim();
  }

  function getSurname(name) {
    const parts = clean(name).split(" ").filter(Boolean);
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
      return cq.includes(lowerName) || (surname && cq.includes(surname));
    }) || null;
  }

  function findAllPlayersInQuestion(question) {
    const cq = clean(question);
    const found = [];
    for (const name of playerNames) {
      const lowerName = clean(name);
      const surname = getSurname(name);
      if (cq.includes(lowerName) || (surname && cq.includes(surname))) {
        if (!found.includes(name)) found.push(name);
      }
    }
    return found;
  }

  function findLiveMatchFromQuestion(question) {
    if (!Array.isArray(liveMatches)) return null;
    const cq = clean(question);
    return liveMatches.find((match) => {
      const { p1, p2 } = getLiveMatchPlayers(match);
      const p1s = getSurname(p1);
      const p2s = getSurname(p2);
      return cq.includes(clean(p1)) || cq.includes(clean(p2)) ||
        (p1s && cq.includes(p1s)) || (p2s && cq.includes(p2s));
    }) || null;
  }

  function getContextMatchup(p1, p2) {
    if (!context?.matchups) return null;
    const cp1 = getSurname(p1);
    const cp2 = getSurname(p2);
    const keys = Object.keys(context.matchups);
    const match = keys.find((key) => {
      const lower = clean(key.replace(/_/g, " "));
      return lower.includes(cp1) && lower.includes(cp2);
    });
    return match ? context.matchups[match] : null;
  }

  function parseAceLine(question) {
    const overMatch = question.match(/over\s+(\d+(?:\.\d+)?)/i);
    const underMatch = question.match(/under\s+(\d+(?:\.\d+)?)/i);
    if (overMatch) return { value: Number(overMatch[1]), side: "over" };
    if (underMatch) return { value: Number(underMatch[1]), side: "under" };
    const plain = question.match(/(\d+(?:\.\d+)?)\s*aces?/i);
    if (plain) return { value: Number(plain[1]), side: null };
    return null;
  }

  function parseDFLine(question) {
    const overMatch = question.match(/over\s+(\d+(?:\.\d+)?)/i);
    const underMatch = question.match(/under\s+(\d+(?:\.\d+)?)/i);
    if (overMatch) return { value: Number(overMatch[1]), side: "over" };
    if (underMatch) return { value: Number(underMatch[1]), side: "under" };
    const plain = question.match(/(\d+(?:\.\d+)?)\s*double/i);
    if (plain) return { value: Number(plain[1]), side: null };
    return null;
  }

  function extractNum(statString, key) {
    if (!statString) return null;
    const patterns = [
      new RegExp(key + "[\\s:]*([\\d.]+)", "i"),
      new RegExp("([\\d.]+)%?\\s*" + key, "i"),
    ];
    for (const p of patterns) {
      const m = String(statString).match(p);
      if (m) return parseFloat(m[1]);
    }
    return null;
  }

  function getHold(p) {
    if (!p) return null;
    if (p.serveStats?.holdPct !== undefined) return Number(p.serveStats.holdPct);
    return extractNum(p.serveStats, "Hold");
  }

  function getAce(p) {
    if (!p) return null;
    if (p.serveStats?.acePct !== undefined) return Number(p.serveStats.acePct);
    return extractNum(p.serveStats, "Ace");
  }

  function getDF(p) {
    if (!p) return null;
    if (p.serveStats?.dfPct !== undefined) return Number(p.serveStats.dfPct);
    return extractNum(p.serveStats, "DF");
  }

  function getBreak(p) {
    if (!p) return null;
    if (p.returnStats?.breakPct !== undefined) return Number(p.returnStats.breakPct);
    return extractNum(p.returnStats, "Break rate");
  }

  function getDR(p) {
    if (!p) return null;
    if (p.overallStats?.dominanceRatio !== undefined) return Number(p.overallStats.dominanceRatio);
    return extractNum(p.overallStats, "Dominance Ratio");
  }

  function getTB(p) {
    if (!p) return null;
    if (p.overallStats?.tiebreakPct !== undefined) return Number(p.overallStats.tiebreakPct);
    return extractNum(p.overallStats, "Tiebreak");
  }

  function getRecord2026(p) {
    if (!p?.record2026) return null;
    const m = p.record2026.match(/(\d+)-(\d+)/);
    if (!m) return null;
    return { w: parseInt(m[1]), l: parseInt(m[2]) };
  }

  // SHARP ACE TAKE
  function buildAceTake(playerName, lineInfo) {
    const dbName = findPlayerInDatabase(playerName) || playerName;
    const p = getPlayerData(dbName);
    const aceData = context?.ace_props?.[dbName];

    const acePct = aceData?.ace_rate ? parseFloat(String(aceData.ace_rate).replace("%", "")) : getAce(p);
    const holdPct = getHold(p);
    const avgAces = aceData?.avg_aces_hard;
    const line = lineInfo?.value;

    if (!line) {
      if (acePct && holdPct) {
        if (acePct >= 12) {
          return `${dbName} is a volume server — ${acePct}% ace rate with ${holdPct}% hold. On Miami hard courts his ace count can stack quickly when the first serve is landing. Lines around his median are live overs.`;
        }
        return `${dbName} runs a ${acePct}% ace rate with ${holdPct}% hold. He generates aces but isn't a pure volume server. Line value depends on where the number sits relative to his ${avgAces ? avgAces + " hard court average" : "baseline"}.`;
      }
      return `${dbName} ace props are a serve-control read. If the holds are clean the count builds — if the returner gets looks early it stalls.`;
    }

    const avg = avgAces;

    if (avg) {
      if (line > avg + 2) {
        return `Lean under ${line} for ${dbName}. His hard court average is ${avg} and you're being asked to price in a clearly above-average output. Miami's slightly slower surface trims free points at the margin.`;
      }
      if (line < avg - 1.5) {
        return `Lean over ${line} for ${dbName}. His hard court average is ${avg} — the line is pricing him below his baseline. Unless the opponent is an elite returner controlling the match, this should clear without needing a hot serve day.`;
      }
      if (Math.abs(line - avg) <= 1.5) {
        if (acePct && acePct >= 13) {
          return `${line} is right at ${dbName}'s average of ${avg}. With a ${acePct}% ace rate he leans over in fast conditions. Miami takes a little off the top, but the serve volume is real. Slight lean over, not strong.`;
        }
        if (holdPct && holdPct < 80) {
          return `${line} is near ${dbName}'s average of ${avg} but his hold rate is only ${holdPct}% — he doesn't protect service games cleanly enough to assume the over. Lean under or pass.`;
        }
        return `${line} is right at ${dbName}'s hard court average of ${avg}. Fair number — match shape decides it. Clean holds push it over, early return pressure kills it.`;
      }
    }

    if (acePct) {
      if (acePct >= 14 && line <= 10) {
        return `Lean over ${line}. ${dbName} runs a ${acePct}% ace rate — he's a volume server and ${line} is a low bar for that profile.`;
      }
      if (acePct >= 14 && line >= 14) {
        return `${line} is a high bar even for a big server like ${dbName} (${acePct}% ace rate). Miami gives returners extra traction. Lean under at standard juice.`;
      }
      if (acePct < 8 && line >= 7) {
        return `Lean under ${line}. ${dbName}'s ace rate is ${acePct}% — he doesn't generate volume on serve. The number asks for more than his profile delivers.`;
      }
      return `${dbName} at ${line} aces — his ${acePct}% ace rate gives him a path but it's match-shape dependent. Clean holds keep it live. Return pressure kills it.`;
    }

    return `${dbName} over ${line} aces — the prop lives and dies on hold quality. Clean service games push it over. Return pressure kills it.`;
  }

  // SHARP DOUBLE FAULT TAKE
  function buildDFTake(playerName, lineInfo) {
    const dbName = findPlayerInDatabase(playerName) || playerName;
    const p = getPlayerData(dbName);
    const dfPct = getDF(p);
    const holdPct = getHold(p);
    const line = lineInfo?.value;

    if (dfPct !== null && dfPct !== undefined) {
      if (line !== null && line !== undefined) {
        // Has a specific line
        if (dfPct <= 2.5) {
          return `Lean under ${line} for ${dbName}. His DF rate is ${dfPct}% — one of the lowest on tour. He almost never double faults and his ${holdPct}% hold rate means service games rarely get tight enough to force them. This is not a pressure prop for him.`;
        }
        if (dfPct >= 5) {
          return `Lean over ${line} for ${dbName}. His ${dfPct}% DF rate is high — he loses serve unexpectedly and double faults cluster when pressure mounts. This is a real market. The over has a genuine path.`;
        }
        return `${dbName} at ${line} double faults — his ${dfPct}% DF rate is near average. Match-shape dependent. If his serve is under pressure early they build. If he holds cleanly they don't get there.`;
      }

      // No line — just profile read
      if (dfPct <= 2.0) {
        return `${dbName} almost never double faults — ${dfPct}% DF rate is among the lowest on tour. His serve is controlled not just powerful. Double fault props for him are almost always lean under regardless of the line.`;
      }
      if (dfPct <= 3.0) {
        return `${dbName} has a ${dfPct}% DF rate — low and controlled. He doesn't tend to give games away on serve. Double fault props are typically lean under unless the line is very low.`;
      }
      if (dfPct >= 5.5) {
        return `${dbName} has a ${dfPct}% DF rate — that's high and it shows up in matches. He can double fault in clusters especially under return pressure. Double fault overs are live for him at reasonable lines.`;
      }
      return `${dbName} has a ${dfPct}% DF rate — average range. His double fault props are pressure dependent. They build when service games tighten and stay low when he's holding comfortably.`;
    }

    return `${dbName} double fault props are pressure dependent. They build when service games stop feeling comfortable — check his hold rate for context.`;
  }

  // SHARP MATCHUP TAKE
  function buildMatchupTake(p1Name, p2Name) {
    const p1 = getPlayerData(p1Name);
    const p2 = getPlayerData(p2Name);

    const p1Hold = getHold(p1);
    const p2Hold = getHold(p2);
    const p1Break = getBreak(p1);
    const p2Break = getBreak(p2);
    const p1DR = getDR(p1);
    const p2DR = getDR(p2);
    const p1TB = getTB(p1);
    const p2TB = getTB(p2);
    const p1Elo = p1?.elo;
    const p2Elo = p2?.elo;
    const p1Record = getRecord2026(p1);
    const p2Record = getRecord2026(p2);
    const ctx = getContextMatchup(p1Name, p2Name);

    let answer = "";

    if (p1Elo && p2Elo) {
      const gap = Math.abs(p1Elo - p2Elo);
      const favorite = p1Elo > p2Elo ? p1Name : p2Name;
      const underdog = p1Elo > p2Elo ? p2Name : p1Name;
      const maxElo = Math.max(p1Elo, p2Elo);
      const minElo = Math.min(p1Elo, p2Elo);
      if (gap > 100) {
        answer += `${favorite} is the clear statistical favorite — ${maxElo} vs ${minElo} Elo, a ${gap}-point gap that's significant on hard courts. `;
      } else if (gap > 40) {
        answer += `${favorite} holds an Elo edge (${maxElo} vs ${minElo}) but this is competitive — ${gap} points is beatable on any given day. `;
      } else {
        answer += `Statistically tight — ${p1Name} at ${p1Elo} Elo vs ${p2Name} at ${p2Elo}. Pure coin flip by the numbers. `;
      }
    } else if (p1 && !p2) {
      answer += `I have a full profile on ${p1Name} but not ${p2Name}. Going off what I know: `;
    } else if (!p1 && p2) {
      answer += `I have a full profile on ${p2Name} but not ${p1Name}. Going off what I know: `;
    } else {
      answer += `${p1Name} vs ${p2Name} — `;
    }

    if (p1Hold && p2Hold) {
      const betterServer = p1Hold > p2Hold ? p1Name : p2Name;
      const holdGap = Math.abs(p1Hold - p2Hold);
      const maxHold = Math.max(p1Hold, p2Hold);
      const minHold = Math.min(p1Hold, p2Hold);
      if (holdGap >= 5) {
        answer += `${betterServer} has a meaningful serve edge — ${maxHold}% hold vs ${minHold}%. That's the structural advantage in this match. `;
      }
    }

    if (p1Break && p2Break) {
      const betterReturner = p1Break > p2Break ? p1Name : p2Name;
      if (Math.max(p1Break, p2Break) >= 25) {
        answer += `${betterReturner} is the better returner and creates real break pressure. `;
      }
    }

    if (p1DR && p2DR) {
      const betterDR = p1DR > p2DR ? p1Name : p2Name;
      const worseDR = p1DR > p2DR ? p2Name : p1Name;
      const drGap = Math.abs(p1DR - p2DR);
      const maxDR = Math.max(p1DR, p2DR);
      const minDR = Math.min(p1DR, p2DR);
      if (drGap >= 0.1) {
        answer += `${betterDR} wins more points than ${worseDR} in aggregate — DR ${maxDR} vs ${minDR}. `;
      }
    }

    if (p1TB && p2TB) {
      const tbGap = Math.abs(p1TB - p2TB);
      if (tbGap >= 15) {
        const betterTB = p1TB > p2TB ? p1Name : p2Name;
        const worseTB = p1TB > p2TB ? p2Name : p1Name;
        const maxTB = Math.max(p1TB, p2TB);
        const minTB = Math.min(p1TB, p2TB);
        answer += `If this reaches a third set, ${betterTB} has a big tiebreak edge — ${maxTB}% vs ${minTB}% for ${worseTB}. `;
      }
    }

    if (ctx?.note) answer += ctx.note + " ";
    if (ctx?.angle) answer += ctx.angle + " ";
    if (ctx?.h2h) answer += `H2H: ${ctx.h2h}. `;
    if (ctx?.key_stat) answer += ctx.key_stat + ".";

    if (!ctx) {
      if (p1?.miamiNote) answer += `On ${p1Name}: ${p1.miamiNote} `;
      if (p2?.miamiNote) answer += `On ${p2Name}: ${p2.miamiNote}`;
    }

    if (p1Record && p2Record) {
      const p1WinPct = Math.round((p1Record.w / (p1Record.w + p1Record.l)) * 100);
      const p2WinPct = Math.round((p2Record.w / (p2Record.w + p2Record.l)) * 100);
      if (Math.abs(p1WinPct - p2WinPct) >= 15) {
        const betterForm = p1WinPct > p2WinPct ? p1Name : p2Name;
        const formRecord = p1WinPct > p2WinPct ? `${p1Record.w}-${p1Record.l}` : `${p2Record.w}-${p2Record.l}`;
        answer += ` Current form backs ${betterForm} — ${formRecord} in 2026.`;
      }
    }

    return answer.trim() || `${p1Name} vs ${p2Name} — ask me a specific angle and I'll give you a sharper read.`;
  }

  // WHO WINS
  function buildWhoWinsTake(p1Name, p2Name) {
    const p1 = getPlayerData(p1Name);
    const p2 = getPlayerData(p2Name);
    const ctx = getContextMatchup(p1Name, p2Name);

    const p1Elo = p1?.elo || 0;
    const p2Elo = p2?.elo || 0;
    const p1DR = getDR(p1);
    const p2DR = getDR(p2);

    const favorite = p1Elo >= p2Elo ? p1Name : p2Name;
    const underdog = p1Elo >= p2Elo ? p2Name : p1Name;
    const favoriteData = p1Elo >= p2Elo ? p1 : p2;
    const eloGap = Math.abs(p1Elo - p2Elo);

    let answer = "";

    if (eloGap > 150) {
      answer = `${favorite} and it's not particularly close statistically. `;
    } else if (eloGap > 60) {
      answer = `${favorite} is the lean, but ${underdog} is live if the match opens up. `;
    } else {
      answer = `Genuinely tight. Slight lean to ${favorite} on raw numbers but the edge is thin. `;
    }

    if (ctx?.surface_edge) answer += `Surface edge goes to ${ctx.surface_edge}. `;
    if (ctx?.h2h) answer += `${ctx.h2h}. `;

    if (p1DR && p2DR) {
      const betterDRName = p1DR > p2DR ? p1Name : p2Name;
      const maxDR = Math.max(p1DR, p2DR);
      const minDR = Math.min(p1DR, p2DR);
      answer += `${betterDRName} has the better dominance ratio (${maxDR} vs ${minDR}) — wins more points per match in aggregate. `;
    }

    if (ctx?.angle) {
      answer += ctx.angle;
    } else if (favoriteData?.miamiNote) {
      answer += favoriteData.miamiNote;
    }

    return answer.trim();
  }

  // PLAYER PROFILE
  function buildPlayerTake(playerName) {
    const p = getPlayerData(playerName);
    if (!p) {
      return `${playerName} is in the draw but I don't have a full profile yet. Ask about the matchup angle or a specific prop and I can still give you a read.`;
    }

    const hold = getHold(p);
    const ace = getAce(p);
    const df = getDF(p);
    const brk = getBreak(p);
    const dr = getDR(p);
    const tb = getTB(p);

    let answer = `${playerName}`;
    if (p.elo) answer += ` — Elo ${p.elo}`;
    if (p.record2026) answer += `. 2026: ${p.record2026}`;
    answer += ". ";

    const stats = [];
    if (hold) stats.push(`${hold}% hold`);
    if (ace) stats.push(`${ace}% ace rate`);
    if (df) stats.push(`${df}% DF rate`);
    if (brk) stats.push(`${brk}% break rate`);
    if (dr) stats.push(`DR ${dr}`);
    if (tb) stats.push(`${tb}% tiebreaks`);
    if (stats.length) answer += stats.join(", ") + ". ";

    if (p.miamiNote) {
      answer += p.miamiNote;
    } else if (p.fullNote) {
      answer += p.fullNote.length > 300 ? p.fullNote.slice(0, 300) + "..." : p.fullNote;
    }

    return answer.trim();
  }

  // ROUTING
  const isAceQ = /aces?|ace prop|aces over|aces under/i.test(q);
  const isDFQ = /double fault|double faults|\bdf\b/i.test(q);
  const isWinnerQ = /who wins|winner|advance|beat|who is better|who should i/i.test(q);
  const isMatchupQ = /\bvs\b|versus|matchup|tell me about|what matters|break down|compare/i.test(q);

  const liveMatch = findLiveMatchFromQuestion(q);
  const mentionedPlayers = findAllPlayersInQuestion(q);
  const singlePlayer = mentionedPlayers.length === 1 ? mentionedPlayers[0] : null;
  const aceLineInfo = isAceQ ? parseAceLine(raw) : null;
  const dfLineInfo = isDFQ ? parseDFLine(raw) : null;

  // ACE QUESTIONS
  if (isAceQ && !isDFQ) {
    const acePlayer = singlePlayer || (liveMatch ? getLiveMatchPlayers(liveMatch).p1 : null);
    if (acePlayer) {
      return buildAceTake(acePlayer, aceLineInfo);
    }
    if (mentionedPlayers.length >= 2 || liveMatch) {
      const p1Name = mentionedPlayers[0] || getLiveMatchPlayers(liveMatch).p1;
      const p2Name = mentionedPlayers[1] || getLiveMatchPlayers(liveMatch).p2;
      return `${p1Name}: ${buildAceTake(p1Name, null)}\n\n${p2Name}: ${buildAceTake(p2Name, null)}`;
    }
  }

  // DOUBLE FAULT QUESTIONS
  if (isDFQ) {
    const dfPlayer = singlePlayer || (mentionedPlayers.length >= 1 ? mentionedPlayers[0] : null) || (liveMatch ? getLiveMatchPlayers(liveMatch).p1 : null);
    if (dfPlayer) {
      return buildDFTake(dfPlayer, dfLineInfo);
    }
    return "Ask me about a specific player's double fault prop and I'll give you a directional lean based on his DF rate and hold profile.";
  }

  // WHO WINS
  if (isWinnerQ) {
    if (mentionedPlayers.length >= 2) {
      return buildWhoWinsTake(mentionedPlayers[0], mentionedPlayers[1]);
    }
    if (liveMatch) {
      const { p1, p2 } = getLiveMatchPlayers(liveMatch);
      return buildWhoWinsTake(findPlayerInDatabase(p1) || p1, findPlayerInDatabase(p2) || p2);
    }
  }

  // MATCHUP / VS QUESTIONS
  if (isMatchupQ) {
    if (mentionedPlayers.length >= 2) {
      return buildMatchupTake(mentionedPlayers[0], mentionedPlayers[1]);
    }
    if (liveMatch) {
      const { p1, p2 } = getLiveMatchPlayers(liveMatch);
      return buildMatchupTake(findPlayerInDatabase(p1) || p1, findPlayerInDatabase(p2) || p2);
    }
    if (selectedMatchup?.title) {
      return selectedMatchup.whatMatters || `On ${selectedMatchup.title}: ask me something specific.`;
    }
  }

  // SINGLE PLAYER
  if (singlePlayer) {
    return buildPlayerTake(singlePlayer);
  }

  // LIVE MATCH FALLBACK
  if (liveMatch) {
    const { p1, p2 } = getLiveMatchPlayers(liveMatch);
    return buildMatchupTake(findPlayerInDatabase(p1) || p1, findPlayerInDatabase(p2) || p2);
  }

  // DEFAULTS
  if (tour === "wta") {
    return "Ask me about a WTA Miami matchup — Sabalenka, Rybakina, Swiatek, Pegula, or a specific ace or double fault prop.";
  }

  return "Ask me about an ATP Miami matchup, a player like Sinner or Alcaraz, or a prop like 'Sinner double faults' or 'Fritz over 10 aces' and I'll give you a sharp answer.";
}
