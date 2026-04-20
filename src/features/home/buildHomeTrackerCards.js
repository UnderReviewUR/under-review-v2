function formatScore(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0.0u";
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}u`;
}

export function buildHomeTrackerCards({
  performanceData,
  nbaGames,
  mlbData,
  golfData,
  f1Data,
  nflDraftMeta,
  nflSeasonMode = false,
}) {
  const summary = performanceData?.summary || null;
  const settled = Number(summary?.settled || 0);
  const roiUnits = Number(summary?.roiUnits || 0);
  const winRatePct = Math.round(Number(summary?.winRate || 0) * 100);

  const roiLabel = formatScore(roiUnits);
  const trackerLine =
    settled < 40
      ? `YTD: ${settled} settled · ROI ${roiLabel} · sample still building`
      : winRatePct < 40 || winRatePct > 70
      ? `YTD: ${settled} settled · ROI ${roiLabel} · hit rate stabilizing`
      : `YTD hit rate: ${winRatePct}% · ROI ${roiLabel} · ${settled} settled`;

  const candidates = [];
  const nbaUpcoming = (nbaGames || []).filter((g) => g?.state === "pre");
  const mlbUpcoming = (mlbData?.games || []).filter((g) => g?.state === "pre");
  const golfLeaders = golfData?.currentEvent?.leaderboard || [];
  const nextF1Race = f1Data?.schedule?.races?.find((r) => r?.is_next);
  const draftPhase = String(nflDraftMeta?.phase || "").toLowerCase();
  const shouldShowDraftPredictor =
    nflSeasonMode && (draftPhase === "pre_draft" || draftPhase === "during_draft");

  if (nbaUpcoming[0]) {
    const g = nbaUpcoming[0];
    const away = g?.awayTeam?.abbr || g?.awayTeam?.name || "Away";
    const home = g?.homeTeam?.abbr || g?.homeTeam?.name || "Home";
    candidates.push({
      league: "NBA",
      family: "moneyline",
      reliability: 0.86,
      text: `${away} vs ${home} — moneyline setup with stable pregame profile.`,
      isPlayerProp: false,
    });
    candidates.push({
      league: "NBA",
      family: "player_prop",
      reliability: 0.85,
      text: `${away} vs ${home} — anchor one ball-handler PRA/assists player prop.`,
      isPlayerProp: true,
    });
  }

  if (mlbUpcoming[0]) {
    const g = mlbUpcoming[0];
    const away = g?.awayTeam?.abbr || g?.awayTeam?.name || "Away";
    const home = g?.homeTeam?.abbr || g?.homeTeam?.name || "Home";
    const homeP = g?.homeTeam?.pitcher
      ? String(g.homeTeam.pitcher).split(" ").slice(-1)[0]
      : "home SP";
    candidates.push({
      league: "MLB",
      family: "pitcher_k",
      reliability: 0.88,
      text: `${away} @ ${home} — ${homeP} K-prop angle over volatile HR markets.`,
      isPlayerProp: true,
    });
  }

  if (golfLeaders[0]) {
    const leader = String(golfLeaders[0]?.name || "Current leader").trim();
    const eventName = golfData?.currentEvent?.shortName || "PGA board";
    candidates.push({
      league: "GOLF",
      family: "placement",
      reliability: 0.84,
      text: `${eventName} — ${leader} placement market (top-10/top-20) over outrights.`,
      isPlayerProp: true,
    });
  }

  if (nextF1Race) {
    candidates.push({
      league: "F1",
      family: "h2h",
      reliability: 0.8,
      text: `${nextF1Race.meeting_name || "Next Grand Prix"} — driver H2H > outright volatility.`,
      isPlayerProp: false,
    });
  }

  const selected = [];
  const usedFamily = new Set();
  const usedLeague = new Set();
  for (const c of candidates.sort((a, b) => b.reliability - a.reliability)) {
    if (selected.length >= 3) break;
    if (usedFamily.has(c.family)) continue;
    if (usedLeague.has(c.league) && candidates.length > 3) continue;
    usedFamily.add(c.family);
    usedLeague.add(c.league);
    selected.push(c);
  }

  if (!selected.some((c) => c.isPlayerProp)) {
    const bestPlayerProp = candidates
      .filter((c) => c.isPlayerProp)
      .sort((a, b) => b.reliability - a.reliability)[0];
    if (bestPlayerProp) {
      if (selected.length >= 3) selected[selected.length - 1] = bestPlayerProp;
      else selected.push(bestPlayerProp);
    } else {
      selected.push({
        league: "MULTI",
        family: "player_prop",
        reliability: 0.79,
        text: "Player prop focus: prioritize one high-usage prop over long-shot markets.",
        isPlayerProp: true,
      });
    }
  }

  const predictionLines = selected.length
    ? selected.map((c, i) => `${i + 1}. ${c.text}`)
    : [
        "1. Building slate... stable markets will post as boards refresh.",
        "2. Player prop anchor will appear with the next live board update.",
      ];

  const cards = [];

  if (shouldShowDraftPredictor) {
    const orderCount = Number(nflDraftMeta?.fullOrderCount || 257);
    const location = nflDraftMeta?.boardLocation || "Pittsburgh, PA";
    cards.push({
      id: "nfl-draft-predictor",
      league: "NFL DRAFT",
      leagueColor: "#E11D48",
      title: "2026 Draft Predictor",
      time: `${location} · ${orderCount}-pick order`,
      network: "Round 1 board + team needs",
      reliability: 0.98,
      text: "2026 Draft Predictor: Round 1 order + Team Needs are live for Pittsburgh. Ask for a 7-round mock.",
      blurb:
        "2026 Draft Predictor: Round 1 order + Team Needs are live for Pittsburgh. Ask for a 7-round mock.",
      isDraft: true,
      sportHint: "nfl",
      draftPhase,
      defaultPrompt: "Show me the sharpest Round 1 path for the Cowboys",
      confirmed: true,
    });
  }

  cards.push({
      id: "ur-home-tracker",
      league: "UR TRACKER",
      leagueColor: "#00F5E9",
      title: "Today's slate + verified record",
      time: "Daily brief",
      network: "Most predictable markets first",
      blurb: `TODAY'S SLATE\n${predictionLines.join("\n")}\n\nVERIFIED RECORD\n${trackerLine}`,
      whatMatters:
        "Card enforces market-type variety and favors higher predictability picks over volatile longshots.",
      quickHitters: [
        "Best NBA angle today?",
        "Best stable MLB prop right now?",
        "Show my full tracked record",
      ],
      confirmed: true,
    });

  return cards;
}
