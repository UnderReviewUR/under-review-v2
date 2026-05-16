import { getDurableJson } from "./_durableStore.js";

function isLiveStatus(status) {
  return ["live", "in_progress", "1h", "2h", "ht"].includes(String(status || "").toLowerCase());
}

function isScheduled(status) {
  const s = String(status || "").toLowerCase();
  return s === "ns" || s === "scheduled" || s === "not started";
}

export async function buildWorldCupContext() {
  const groups = await getDurableJson("wc2026_groups");
  const matches = await getDurableJson("wc2026_matches");

  if (!groups && !matches) return "";

  const lines = ["WORLD CUP 2026 CONTEXT:"];

  const live = (matches?.matches || []).filter((m) => isLiveStatus(m?.status));
  if (live.length) {
    lines.push("LIVE NOW:");
    for (const m of live) {
      lines.push(
        `  ${m.homeTeam} ${m.homeScore ?? 0}-${m.awayScore ?? 0} ${m.awayTeam} (${m.status})`,
      );
    }
  }

  if (groups?.groups) {
    lines.push("GROUP STANDINGS (top 2 advance + 8 best 3rd place):");
    for (const [g, teams] of Object.entries(groups.groups)) {
      const top = (teams || [])
        .slice(0, 2)
        .map((t) => `${t.team}(${t.points}pts)`)
        .join(", ");
      lines.push(`  Group ${g}: ${top} leading`);
    }
  }

  const upcoming = (matches?.matches || [])
    .filter((m) => isScheduled(m?.status))
    .slice(0, 3);
  if (upcoming.length) {
    lines.push("NEXT MATCHES:");
    for (const m of upcoming) {
      lines.push(
        `  ${m.homeTeam} vs ${m.awayTeam} — ${m.date} ${m.time} at ${m.stadium || m.city || "TBD"}`,
      );
    }
  }

  const text = lines.join("\n");
  return text.length > 3000 ? `${text.slice(0, 2997)}...` : text;
}
