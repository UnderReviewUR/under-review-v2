/**
 * One-off diagnostic: compare ESPN MLB endpoints for probable pitcher fields.
 * Run: node scripts/espn-mlb-endpoint-diagnostic.mjs
 */
function summarizeCompetition(comp, label) {
  if (!comp) return { label, error: "no competition" };
  const home = comp.competitors?.find((c) => c.homeAway === "home");
  const away = comp.competitors?.find((c) => c.homeAway === "away");
  const probables = comp.probables;
  return {
    label,
    competitionTopKeys: comp && typeof comp === "object" ? Object.keys(comp).sort() : [],
    /** Legacy — often empty; site scoreboard stores probables on each competitor instead. */
    probablesCount: Array.isArray(probables) ? probables.length : 0,
    homeCompetitorProbablesCount: Array.isArray(home?.probables) ? home.probables.length : 0,
    awayCompetitorProbablesCount: Array.isArray(away?.probables) ? away.probables.length : 0,
    probablesSample:
      Array.isArray(probables) && probables[0]
        ? {
            keys: Object.keys(probables[0]),
            homeAway: probables[0].homeAway,
            athleteKeys: probables[0].athlete ? Object.keys(probables[0].athlete).slice(0, 15) : [],
          }
        : null,
    homeHasProbablePitcher: Boolean(home?.probablePitcher),
    awayHasProbablePitcher: Boolean(away?.probablePitcher),
    homeProbablePitcherKeys: home?.probablePitcher ? Object.keys(home.probablePitcher) : [],
    awayProbablePitcherKeys: away?.probablePitcher ? Object.keys(away.probablePitcher) : [],
    homePitcherName:
      home?.probablePitcher?.athlete?.displayName ||
      home?.probablePitcher?.athlete?.shortName ||
      null,
    awayPitcherName:
      away?.probablePitcher?.athlete?.displayName ||
      away?.probablePitcher?.athlete?.shortName ||
      null,
  };
}

function summarizeSiteScoreboard(data, label) {
  const events = data?.events || [];
  const first = events[0];
  const comp = first?.competitions?.[0];
  return {
    label,
    rootKeys: data && typeof data === "object" ? Object.keys(data).sort() : [],
    eventCount: events.length,
    firstEventKeys: first ? Object.keys(first).sort() : [],
    firstEventId: first?.id,
    firstCompetitionSummary: summarizeCompetition(comp, `${label}/event[0]`),
  };
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { res, text, json };
}

async function main() {
  const todayEt = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const ymdCompact = todayEt.replace(/-/g, "");

  const scoreboardNoDates = "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard";
  const scoreboardWithDates = `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${encodeURIComponent(ymdCompact)}`;

  const coreEvents = "https://sports.core.api.espn.com/v2/sports/baseball/leagues/mlb/events";

  const out = { todayEt, ymdCompact, results: [] };

  const pairs = [
    ["scoreboardNoDates", scoreboardNoDates],
    ["scoreboardWithDates", scoreboardWithDates],
    ["coreEvents", coreEvents],
  ];

  for (const [name, url] of pairs) {
    try {
      const { res, text, json } = await fetchJson(url);
      if (!json) {
        out.results.push({
          name,
          url,
          ok: res.ok,
          status: res.status,
          snippet: text.slice(0, 500),
        });
        continue;
      }
      if (name.startsWith("scoreboard")) {
        out.results.push({
          name,
          url,
          ok: res.ok,
          status: res.status,
          ...summarizeSiteScoreboard(json, name),
        });
      } else {
        const items = json.items;
        out.results.push({
          name,
          url,
          ok: res.ok,
          status: res.status,
          rootKeys: Object.keys(json).sort(),
          count: json.count,
          page: json.page,
          itemLength: Array.isArray(items) ? items.length : null,
          firstTwoItems: Array.isArray(items)
            ? items.slice(0, 2).map((it) =>
                it && typeof it === "object"
                  ? { keys: Object.keys(it), $ref: it.$ref, href: it.href, id: it.id }
                  : it,
              )
            : null,
        });
      }
    } catch (e) {
      out.results.push({ name, url, error: String(e.message || e) });
    }
  }

  console.log(JSON.stringify(out, null, 2));
}

main();
