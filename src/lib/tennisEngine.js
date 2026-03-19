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

  const noDash = (t) => String(t || "").replace(/—/g, "").replace(/\s+/g, " ").trim();

  const clean = (str) =>
    String(str || "")
      .toLowerCase()
      .replace(/[.\-']/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const getSurname = (name) => clean(name).split(" ").filter(Boolean).slice(-1)[0] || "";

  const getLiveMatchPlayers = (match) => ({
    p1: match?.home_team || match?.event_first_player || "Player 1",
    p2: match?.away_team || match?.event_second_player || "Player 2",
  });

  const getPlayerData = (name) => allPlayers?.[name] || null;

  const findPlayer = (question) => {
    const cq = clean(question);
    return (
      playerNames.find((name) => {
        const lower = clean(name);
        const surname = getSurname(name);
        return cq.includes(lower) || (surname && cq.includes(surname));
      }) || null
    );
  };

  const findMatch = (question) => {
    const cq = clean(question);
    return (
      liveMatches.find((m) => {
        const { p1, p2 } = getLiveMatchPlayers(m);
        return (
          cq.includes(clean(p1)) ||
          cq.includes(clean(p2)) ||
          cq.includes(getSurname(p1)) ||
          cq.includes(getSurname(p2))
        );
      }) || null
    );
  };

  const getBreak = (p) => p?.returnStats?.breakPct || null;
  const getHold = (p) => p?.serveStats?.holdPct || null;
  const getAce = (p) => p?.serveStats?.acePct || null;

  const isBigServer = (p) =>
    p?.strengths?.includes("ace_volume") ||
    p?.strengths?.includes("easy_holds") ||
    p?.style?.includes("big_server");

  const parseLine = (q) => {
    const m = q.match(/(\d+(\.\d+)?)/);
    return m ? Number(m[1]) : null;
  };

  const match = findMatch(q);
  const player = findPlayer(q);
  const line = parseLine(raw);

  // ---------------- ACE TAKE ----------------

  function aceTake(name, p) {
    const isBig = isBigServer(p);
    const hold = getHold(p);

    if (line && line >= 14) {
      return noDash(
        `${line} is not a neutral number. It is asking for sustained control on serve. With ${name}, that path exists because the match runs through his service games. If he is holding comfortably, the count builds without much resistance. Miami adds just enough friction that you need that control for longer than usual.`
      );
    }

    if (line && line <= 6) {
      return noDash(
        `${line} is a lighter number, so it comes down to whether the serve shows up early. If ${name} is holding cleanly, it can clear without needing long sets. If return pressure shows up, it flattens quickly.`
      );
    }

    return noDash(
      `This is really about service control. If ${name} is holding comfortably, the ace count takes care of itself. If not, it becomes difficult quickly.`
    );
  }

  // ---------------- MATCHUP TAKE ----------------

  function matchupTake(p1, p2) {
    const p1d = getPlayerData(p1);
    const p2d = getPlayerData(p2);

    const p1Big = isBigServer(p1d);
    const p2Big = isBigServer(p2d);

    let text = "";

    if (p1Big && !p2Big) {
      text += `This matchup pulls in opposite directions. ${p1} is trying to keep points short and hold cleanly, while ${p2} needs rallies to show up.`;
    } else if (!p1Big && p2Big) {
      text += `This matchup pulls in opposite directions. ${p2} is trying to keep points short and hold cleanly, while ${p1} needs rallies to show up.`;
    } else {
      text += `This is more of a baseline matchup where control comes from who can create pressure first.`;
    }

    text += ` If one player settles into their preferred pattern, the match follows it.`;

    return noDash(text);
  }

  // ---------------- WINNER TAKE ----------------

  function winnerTake(p1, p2) {
    const p1d = getPlayerData(p1);
    const p2d = getPlayerData(p2);

    let text = `This is not about who is better on paper. It is about who gets to play their match more often.`;

    const h1 = getHold(p1d);
    const h2 = getHold(p2d);

    if (h1 && h2) {
      if (h1 > h2 + 3) {
        text += ` ${p1} has the cleaner hold profile, which gives him the steadier path if this stays on serve.`;
      } else if (h2 > h1 + 3) {
        text += ` ${p2} has the cleaner hold profile, which gives him the steadier path if this stays on serve.`;
      } else {
        text += ` Both players can hold, so this likely comes down to who creates the first real pressure.`;
      }
    }

    text += ` Once that balance shifts, the match tends to go with it.`;

    return noDash(text);
  }

  // ---------------- ROUTING ----------------

  if (q.includes("ace")) {
    const name = player || getSurname(q);
    const p = getPlayerData(name);
    return aceTake(name, p);
  }

  if (q.includes("who wins") || q.includes("wins")) {
    if (match) {
      const { p1, p2 } = getLiveMatchPlayers(match);
      return winnerTake(p1, p2);
    }
  }

  if (q.includes("matchup") || q.includes("tell me about") || q.includes("vs")) {
    if (match) {
      const { p1, p2 } = getLiveMatchPlayers(match);
      return matchupTake(p1, p2);
    }
  }

  if (player) {
    const p = getPlayerData(player);
    return noDash(
      `${player} is defined by how their matches flow. If they are able to impose their style early, everything becomes simpler from there.`
    );
  }

  return noDash(
    `Ask about a matchup, a player, or an ace line and I will break it down in plain terms.`
  );
}
