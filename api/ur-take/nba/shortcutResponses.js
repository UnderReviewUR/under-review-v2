/** @file NBA availability shortcut responses — extracted from handler.js */
import { detectNbaAvailabilityIntent } from "./decisionAndInvalidation.js";
import { getNbaInjuryIndex } from "./injuryIndex.js";
import { resolveQuestionNbaPlayer } from "./playerResolution.js";

function normalizePlayerNameKey(name) {
  return String(name || "").trim().toLowerCase();
}

function inferNbaMarketSetFromStats(statsRow) {
  const pts = Number(statsRow?.pts);
  const ast = Number(statsRow?.ast);
  const reb = Number(statsRow?.reb);
  const out = [];
  if (Number.isFinite(pts) && pts >= 10) out.push("points");
  if (Number.isFinite(ast) && ast >= 4) out.push("assists");
  if (Number.isFinite(reb) && reb >= 5) out.push("rebounds");
  if (!out.length) out.push("points");
  return out.slice(0, 2);
}

export function buildNbaOutStatusShiftPlan({ targetedPlayer, teamAbbr, nbaContext, teamImpact }) {
  const targetKey = normalizePlayerNameKey(targetedPlayer);
  const playersByTeam = nbaContext?.rosterGrounding?.playersByTeamAbbrev || {};
  const verifiedRoster = (playersByTeam?.[String(teamAbbr || "").toUpperCase()] || [])
    .map((n) => String(n || "").trim())
    .filter(Boolean);
  const rosterKeySet = new Set(verifiedRoster.map((n) => normalizePlayerNameKey(n)));
  const statsRows = Array.isArray(nbaContext?.playerStats) ? nbaContext.playerStats : [];
  const statsMap = new Map(
    statsRows
      .map((row) => [normalizePlayerNameKey(row?.name), row])
      .filter(([k]) => Boolean(k)),
  );

  const candidates = [];
  const seen = new Set();
  const pushCandidate = (name, markets = []) => {
    const cleaned = String(name || "").trim();
    const key = normalizePlayerNameKey(cleaned);
    if (!cleaned || !key || key === targetKey || seen.has(key)) return;
    if (rosterKeySet.size > 0 && !rosterKeySet.has(key)) return;
    const row = statsMap.get(key) || null;
    const resolvedMarkets = Array.isArray(markets) && markets.length ? markets : inferNbaMarketSetFromStats(row);
    seen.add(key);
    candidates.push({ name: cleaned, stats: row, markets: resolvedMarkets });
  };

  for (const b of teamImpact?.beneficiaries || []) {
    pushCandidate(b?.player, b?.markets || []);
  }
  if (candidates.length < 3) {
    const rankedRoster = verifiedRoster
      .map((name) => ({ name, row: statsMap.get(normalizePlayerNameKey(name)) || null }))
      .sort((a, b) => {
        const as = Number(a.row?.pts || 0) + Number(a.row?.ast || 0) * 1.4 + Number(a.row?.reb || 0) * 0.9;
        const bs = Number(b.row?.pts || 0) + Number(b.row?.ast || 0) * 1.4 + Number(b.row?.reb || 0) * 0.9;
        return bs - as;
      });
    for (const row of rankedRoster) {
      if (candidates.length >= 3) break;
      pushCandidate(row.name, inferNbaMarketSetFromStats(row.row));
    }
  }

  const selected = candidates.slice(0, 3);
  const replacementLines = selected.length
    ? selected
        .map((c) => {
          const pts = Number(c?.stats?.pts);
          const ast = Number(c?.stats?.ast);
          const reb = Number(c?.stats?.reb);
          const statsLine =
            Number.isFinite(pts) || Number.isFinite(ast) || Number.isFinite(reb)
              ? `${Number.isFinite(pts) ? `${pts} pts` : "n/a pts"}, ${Number.isFinite(ast) ? `${ast} ast` : "n/a ast"}, ${Number.isFinite(reb) ? `${reb} reb` : "n/a reb"}`
              : "no stable season stat row in payload";
          return `- ${c.name}: ${statsLine}; watch ${c.markets.join("/")} volume up.`;
        })
        .join("\n")
    : "- Verified roster replacements unavailable in payload; do not name replacement players until rosterGrounding refreshes.";

  const shiftLine = selected.length
    ? `Prop shifts: ${targetedPlayer} props stay blocked while out. Lean ${selected.map((c) => `${c.name} ${c.markets.join("/")}`).join("; ")} toward over if books post near baseline.`
    : `Prop shifts: ${targetedPlayer} props stay blocked while out; without verified replacement names, use team-level pace/usage angles only.`;
  const triggerPrimary = selected[0]?.name || "replacement guard";
  const triggerSecondary = selected[1]?.name || "secondary creator";
  const liveTrigger = `Live trigger: if ${triggerPrimary} and ${triggerSecondary} both clear opening-rotation minutes and early touch volume by halftime, keep the replacement-over angle; if one is stuck in a low-minute role, cut exposure.`;

  return { replacementLines, shiftLine, liveTrigger };
}

export function buildNbaAvailabilityResponse({
  question,
  nbaContext,
  nbaInvalidation,
  derivedConfidence,
  nbaConfidenceModifier,
  decisionMode,
}) {
  const targetedPlayer = nbaInvalidation?.targetedPlayer || resolveQuestionNbaPlayer(question, nbaContext) || "Target player";
  const injuriesByPlayer = getNbaInjuryIndex(nbaContext || {});
  const injuryMeta = injuriesByPlayer.get(String(targetedPlayer).toLowerCase()) || null;
  const statusClass = injuryMeta?.statusClass || "unknown";
  const statusDisplay = injuryMeta?.statusRaw || injuryMeta?.detail || (statusClass === "unknown" ? "No injury designation in current context" : statusClass);
  const intent = detectNbaAvailabilityIntent(question);
  const includeConsequence =
    decisionMode === "status_plus_consequence" || intent.asksBettingConsequence;

  const firstLine =
    statusClass === "unknown"
      ? `STATUS\n${targetedPlayer} — ${statusDisplay}.`
      : `STATUS\n${targetedPlayer} — ${statusDisplay}.`;

  const confidenceLine = `CONFIDENCE\n${derivedConfidence}${nbaConfidenceModifier?.reason ? ` — ${nbaConfidenceModifier.reason}` : ""}`;
  let consequenceBlock = "";
  if (includeConsequence) {
    if (statusClass === "out") {
      const teamImpact = (nbaContext?.newsImpact?.affectedTeams || []).find(
        (t) => String(t?.team || "").toUpperCase() === String(injuryMeta?.team || "").toUpperCase(),
      );
      const outPlan = buildNbaOutStatusShiftPlan({
        targetedPlayer,
        teamAbbr: injuryMeta?.team,
        nbaContext,
        teamImpact,
      });
      consequenceBlock = `\n\nHow to play it\n${targetedPlayer} is out — do not play direct props on this player.\n\nReplacement looks\n${outPlan.replacementLines}\n\nProp reads\n${outPlan.shiftLine}\n\nWatch\n${String(outPlan.liveTrigger || "").replace(/^Live trigger:\s*/i, "").trim()}`;
    } else if (statusClass === "questionable" || statusClass === "doubtful") {
      consequenceBlock = `\n\nHow to play it\nTreat ${targetedPlayer} props as contingent until final availability confirms. Avoid full-size exposure before status lock.`;
    } else {
      consequenceBlock = `\n\nHow to play it\nNo explicit injury downgrade in current context. Use listed markets and matchup structure for any sizing decision.`;
    }
  }

  const statusShift =
    statusClass === "out" || statusClass === "questionable" || statusClass === "doubtful"
      ? `${targetedPlayer} status is ${statusDisplay}. Availability should be acknowledged before prop recommendations.`
      : null;

  return {
    response: `${firstLine}${consequenceBlock}\n\n${confidenceLine}`,
    statusShift,
  };
}
