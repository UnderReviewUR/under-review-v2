import { getGolfHomeValidity } from "../../lib/golfEventStatus.js";
import {
  classifyMlbGame,
  classifyNbaGame,
  getDisplayableF1NextRace,
  isDisplayableValidity,
} from "../../../shared/eventValidity.js";
import {
  nbaEventKey,
  mlbEventKey,
  f1EventKey,
  golfSnapshotKey,
} from "../../../shared/homeEventDedup.js";
import { resolveNflDraftPromoBand } from "../../../shared/nflDraftCalendarBand.js";

function formatScore(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0.0u";
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}u`;
}

function isLikelyDraftWindow(now = new Date()) {
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  return month === 4 && day >= 18 && day <= 28;
}

export function buildHomeTrackerCards({
  performanceData,
  nbaGames,
  mlbData,
  golfData,
  f1Data,
  nflDraftMeta,
  excludeEventKeys = null,
  promoNowMs = Date.now(),
}) {
  const excluded =
    excludeEventKeys instanceof Set ? excludeEventKeys : new Set(excludeEventKeys || []);
  const summary = performanceData?.summary || null;
  const settled = Number(summary?.settled || 0);
  const roiUnits = Number(summary?.roiUnits || 0);
  const winRatePct = Math.round(Number(summary?.winRate || 0) * 100);

  const roiLabel = formatScore(roiUnits);
  const trackerLine =
    settled < 40
      ? `YTD · ${settled} settled · ROI ${roiLabel} · sample still building`
      : winRatePct < 40 || winRatePct > 70
      ? `YTD · ${settled} settled · ROI ${roiLabel} · hit rate still finding level`
      : `YTD · ${winRatePct}% hit rate · ROI ${roiLabel} · ${settled} settled`;

  const candidates = [];
  const nbaUpcoming = (nbaGames || [])
    .filter((g) => isDisplayableValidity(classifyNbaGame(g)))
    .filter((g) => {
      const s = String(g?.state || "").toLowerCase();
      return s === "pre" || s === "scheduled";
    });
  const mlbUpcoming = (mlbData?.games || [])
    .filter((g) => isDisplayableValidity(classifyMlbGame(g)))
    .filter((g) => g?.state === "pre");
  const golfLeaders = golfData?.currentEvent?.leaderboard || [];
  const golfHomeValidity = getGolfHomeValidity(golfData);
  const nextF1Race = getDisplayableF1NextRace(f1Data);
  const draftPhase = String(nflDraftMeta?.phase || "").toLowerCase();
  const hasDraftPhase = draftPhase === "pre_draft" || draftPhase === "during_draft";
  const shouldShowDraftPredictor =
    hasDraftPhase || (!draftPhase && isLikelyDraftWindow());

  if (nbaUpcoming[0]) {
    const g = nbaUpcoming[0];
    const nk = nbaEventKey(g);
    if (nk && excluded.has(nk)) {
      /* skip — surfaced higher in Live Snapshot / Today's Slate */
    } else {
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
  }

  if (mlbUpcoming[0]) {
    const g = mlbUpcoming[0];
    const mk = mlbEventKey(g);
    if (mk && excluded.has(mk)) {
      /* skip */
    } else {
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
  }

  if (golfHomeValidity.isActive && golfHomeValidity.hasLeaderboard && golfLeaders[0]) {
    const gk = golfSnapshotKey(golfData);
    if (!gk || !excluded.has(gk)) {
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
  }

  if (nextF1Race) {
    const fk = f1EventKey(nextF1Race);
    if (!fk || !excluded.has(fk)) {
      candidates.push({
        league: "F1",
        family: "h2h",
        reliability: 0.8,
        text: `${nextF1Race.meeting_name || "Next Grand Prix"} — driver H2H > outright volatility.`,
        isPlayerProp: false,
      });
    }
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
        text: "Player prop anchor: one high-usage market beats chasing long-shot chaos.",
        isPlayerProp: true,
      });
    }
  }

  const predictionLines = selected.length
    ? selected.map((c, i) => `${i + 1}. ${c.text}`)
    : [
        "1. Boards are between refresh cycles — best edges sharpen when lines repost.",
        "2. Live Snapshot above shows what's in-window; ask UR Take on a named game for depth.",
      ];

  const cards = [];

  if (shouldShowDraftPredictor) {
    const orderCount = Number(nflDraftMeta?.fullOrderCount || 257);
    const band = resolveNflDraftPromoBand(promoNowMs, nflDraftMeta);
    const roundLine =
      band.band === "rounds2_3"
        ? "Tonight: Rounds 2–3 · capital, runs, fits"
        : band.band === "rounds4_7"
          ? "Today: Rounds 4–7 · depth, comps, specials"
          : band.band === "round1"
            ? "Tonight: Round 1 · live board + needs"
            : `${band.roundsLabel} · ${band.headline}`;
    const defaultPrompt =
      band.band === "rounds2_3"
        ? "Best Round 2–3 value that hasn't been priced into public boards?"
        : band.band === "rounds4_7"
          ? "Best Day 3 steal profile for a contender picking late?"
          : "Which team has the most interesting draft situation?";
    cards.push({
      id: "nfl-draft-predictor",
      league: "NFL DRAFT",
      leagueColor: "#E11D48",
      title: band.band === "outside" && draftPhase !== "during_draft" ? "2026 Draft Predictor" : band.headline,
      time: roundLine,
      network: `${orderCount}-pick verified order · ${band.roundsLabel}`,
      reliability: 0.98,
      text: "Ask about your team's picks, needs, and board leverage.",
      blurb: `${band.promptHint} Ask about your team's picks, trade-ups, or sleepers — label simulations clearly.`,
      isDraft: true,
      sportHint: "nfl",
      draftPhase,
      defaultPrompt,
      quickHitters:
        band.band === "rounds2_3"
          ? [
              defaultPrompt,
              "Simulate Rounds 2–3 for the Cowboys",
              "Where does the board bend Friday night?",
            ]
          : band.band === "rounds4_7"
            ? [
                defaultPrompt,
                "Best comp-pick targets for Dallas late",
                "Which traits overperform on Day 3?",
              ]
            : [
                defaultPrompt,
                "Simulate Cowboys rounds 1-3",
                "Who are the best EDGE prospects?",
              ],
      confirmed: true,
    });
  }

  cards.push({
      id: "ur-home-tracker",
      league: "UR TRACKER",
      leagueColor: "#00F5E9",
      title: "Today's edges + verified record",
      time: "Daily brief",
      network: "Higher-signal picks first",
      blurb: `TODAY'S SLATE\n${predictionLines.join("\n")}\n\nVERIFIED RECORD\n${trackerLine}`,
      whatMatters:
        "Three different market types when we can — props and placements over pure chaos when boards allow.",
      quickHitters: [
        "Best NBA edge on this slate?",
        "Stable MLB prop worth a look?",
        "Show my full tracked record",
      ],
      confirmed: true,
    });

  return cards;
}
