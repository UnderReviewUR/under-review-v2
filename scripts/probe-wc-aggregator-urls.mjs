import { fetchBookPageHtml, parseGoldenBootRowsForBook } from "../api/_wcBookScrapeCommon.js";
import { scrapeWcOutrightsAggregator } from "../api/_wcScrapeOutrightsAggregators.js";
import {
  isViableWcOutrightsMap,
  parseWcTournamentWinnerOutrightsFromHtml,
} from "../shared/wcOutrightsHtmlParse.js";

const probes = [
  ["oddschecker-us", "https://www.oddschecker.com/us/soccer/world-cup", "oddschecker"],
  ["oddschecker-gb-topgs", "https://www.oddschecker.com/football/world-cup/world-cup-top-goalscorer", "oddschecker"],
  ["covers-wc", "https://www.covers.com/world-cup", "covers"],
  ["oddsshark-hub", "https://www.oddsshark.com/soccer/world-cup", "oddsshark"],
  ["oddsshark-win", "https://www.oddsshark.com/soccer/world-cup/odds-to-win-2026", "oddsshark"],
];

function countTeams(html) {
  const teams = [
    "Spain",
    "France",
    "England",
    "Brazil",
    "Argentina",
    "United States",
    "Mexico",
  ];
  return Object.fromEntries(
    teams.map((t) => {
      const re = new RegExp(`${t}[^<]{0,120}(\\+\\d{2,4}|\\-\\d{2,4}|\\d+\\-1|Even)`, "i");
      const m = html.match(re);
      return [t, m ? m[0].replace(/\s+/g, " ").slice(0, 80) : null];
    }),
  );
}

for (const [label, url, bookKey] of probes) {
  const r = await fetchBookPageHtml(url);
  const html = r.html || "";
  const gb = parseGoldenBootRowsForBook(html, bookKey);
  const teamHits = countTeams(html);
  const hasGoldenBoot = /golden boot|top goalscorer|top scorer/i.test(html);
  const hasGroupWinner = /group winner|win group/i.test(html);
  const hasTournamentWin = /odds to win|win the (2026 )?world cup|tournament winner/i.test(html);
  const outrights = parseWcTournamentWinnerOutrightsFromHtml(html, bookKey);
  console.log(
    JSON.stringify({
      label,
      url,
      fetchOk: r.ok,
      error: r.error,
      htmlLen: html.length,
      gbRowCount: gb.length,
      gbSample: gb.slice(0, 5).map((x) => `${x.name}:${x.americanOdds}`),
      outrightCount: Object.keys(outrights).length,
      outrightViable: isViableWcOutrightsMap(outrights),
      outrightSample: Object.entries(outrights).slice(0, 6),
      hasGoldenBoot,
      hasGroupWinner,
      hasTournamentWin,
      teamHits,
    }),
  );
}

for (const key of ["covers", "oddsshark", "oddschecker"]) {
  const scraped = await scrapeWcOutrightsAggregator(key, 0);
  console.log(
    JSON.stringify({
      event: "wc_outrights_agg_probe",
      source: key,
      ok: scraped.ok,
      rowCount: Object.keys(scraped.outrights || {}).length,
      error: scraped.error,
      sample: Object.entries(scraped.outrights || {}).slice(0, 6),
    }),
  );
}
