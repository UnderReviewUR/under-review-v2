/**
 * RSS source list for transfer / Barça bounce alerts.
 * Google News RSS is the reliable public wire; club + beat queries bias Barça.
 */

/**
 * @typedef {{ id: string, label: string, url: string, weight?: number, barcaHeavy?: boolean }} TransferFeed
 */

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
      "(transfer OR \"here we go\" OR \"personal terms\" OR medical) (Liverpool OR Arsenal OR Chelsea OR \"Man City\" OR \"Man United\" OR \"Real Madrid\" OR PSG OR Bayern)",
    ),
    weight: 1.0,
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
