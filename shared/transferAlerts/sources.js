/**
 * RSS + native X (FxTwitter) source list for transfer / Barça bounce alerts.
 *
 * Native wires: FxTwitter public timelines (full tweet text) + Telegram mirrors.
 * Google News stays as fallback if those fail.
 */

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   url?: string,
 *   urls?: string[],
 *   weight?: number,
 *   barcaHeavy?: boolean,
 *   reporterId?: string,
 *   native?: boolean,
 * }} TransferFeed
 */

/**
 * @param {TransferFeed} feed
 * @returns {string[]}
 */
export function feedUrls(feed) {
  const list = [];
  if (Array.isArray(feed.urls)) list.push(...feed.urls.filter(Boolean));
  if (feed.url) list.push(feed.url);
  return [...new Set(list)];
}

/**
 * Public X handles → reporter. Fetched via FxTwitter (no official X API key).
 * @type {{ handle: string, reporterId: string, barcaHeavy?: boolean }[]}
 */
export const TRANSFER_X_ACCOUNTS = [
  { handle: "David_Ornstein", reporterId: "ornstein" },
  { handle: "FabrizioRomano", reporterId: "romano" },
  { handle: "DiMarzio", reporterId: "di_marzio" },
  { handle: "jamesbenge", reporterId: "benge", barcaHeavy: true },
  { handle: "sammarsden_", reporterId: "marsden", barcaHeavy: true },
  { handle: "sidlowe", reporterId: "lowe", barcaHeavy: true },
  { handle: "PolBallus", reporterId: "ballus", barcaHeavy: true },
];

const GNEWS =
  "https://news.google.com/rss/search?hl=en-GB&gl=GB&ceid=GB:en&q=";

/**
 * @param {string} q
 * @returns {string}
 */
function gnews(q) {
  return `${GNEWS}${encodeURIComponent(q)}`;
}

/** @type {TransferFeed[]} */
export const TRANSFER_FEEDS = [
  {
    id: "tg_romano",
    label: "Romano X via Telegram",
    urls: [
      "https://rsshub.rssforever.com/telegram/channel/FabrizioRomanoTG",
      "https://tg.i-c-a.su/rss/FabrizioRomanoTG",
    ],
    weight: 1.85,
    reporterId: "romano",
    native: true,
  },
  {
    id: "tg_dimarzio",
    label: "Di Marzio Telegram",
    urls: ["https://rsshub.rssforever.com/telegram/channel/dimarzio"],
    weight: 1.7,
    reporterId: "di_marzio",
    native: true,
  },
  {
    id: "gnews_ornstein",
    label: "Ornstein wire",
    url: gnews('"David Ornstein" OR Ornstein (transfer OR signing OR deal OR bid)'),
    weight: 1.4,
  },
  {
    id: "gnews_romano",
    label: "Romano wire",
    url: gnews('"Fabrizio Romano" (transfer OR signing OR deal OR "here we go")'),
    weight: 1.35,
  },
  {
    id: "gnews_trusted_tier1",
    label: "Tier-1 transfer bylines",
    url: gnews(
      '("Di Marzio" OR "Ben Jacobs" OR "Matt Law" OR "Laurie Whitwell" OR "Simon Stone") (transfer OR signing OR deal)',
    ),
    weight: 1.2,
  },
  {
    id: "gnews_barca_transfer",
    label: "Barcelona transfers",
    url: gnews(
      "(Barcelona OR Barça OR Barca) (transfer OR signing OR signed OR bid OR deal OR loan OR medical OR \"personal terms\")",
    ),
    weight: 1.5,
    barcaHeavy: true,
  },
  {
    id: "gnews_barca_reporters",
    label: "Barça beat reporters",
    url: gnews(
      '("James Benge" OR "Sam Marsden" OR "Jonathan Johnson" OR "Sid Lowe" OR "James Westwood") (Barcelona OR Barça OR transfer)',
    ),
    weight: 1.45,
    barcaHeavy: true,
  },
  {
    id: "gnews_top_transfers",
    label: "Top-club transfer desk",
    url: gnews(
      "(transfer OR \"here we go\" OR \"personal terms\" OR medical) (Barcelona OR Barça OR Liverpool OR Arsenal OR Chelsea OR \"Man City\" OR \"Man United\" OR \"Real Madrid\" OR Atletico OR Sevilla OR Villarreal OR PSG OR Bayern)",
    ),
    weight: 1.0,
  },
  {
    id: "gnews_laliga_transfer",
    label: "La Liga transfers",
    url: gnews(
      "(La Liga OR Laliga OR \"Real Madrid\" OR Atletico OR Sevilla OR Villarreal OR \"Real Sociedad\" OR Betis OR Valencia OR Girona) (transfer OR signing OR signed OR bid OR deal OR loan OR medical)",
    ),
    weight: 1.25,
  },
  {
    id: "athletic_pl",
    label: "The Athletic Premier League",
    url: "https://www.nytimes.com/athletic/rss/premier-league/",
    weight: 1.3,
  },
  {
    id: "bbc_football",
    label: "BBC Sport Football",
    url: "https://feeds.bbci.co.uk/sport/football/rss.xml",
    weight: 0.95,
  },
  {
    id: "guardian_football",
    label: "Guardian Football",
    url: "https://www.theguardian.com/football/rss",
    weight: 0.95,
  },
  {
    id: "sky_transfer",
    label: "Sky Sports Transfer Centre",
    url: "https://www.skysports.com/rss/12040",
    weight: 1.05,
  },
];
