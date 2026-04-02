// api/odds.js
// Fetches live tennis prop lines from The Odds API v4
// Returns structured prop lines for injection into UR TAKE system prompt
// Covers: match winner odds, player aces, player double faults, total games

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const API_KEY = process.env.ODDS_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: "Missing ODDS_API_KEY" });
  }

  const { tour = "atp" } = req.query;

  const sportKeys = tour === "wta"
    ? ["tennis_wta_miami", "tennis_wta"]
    : ["tennis_atp_miami", "tennis_atp"];

  const BASE = "https://api.the-odds-api.com/v4";
  const REGIONS = "us,us2";
  const ODDS_FORMAT = "american";

  // ─── Step 1: Get current events (matches) ──────────────────────────────────
  let events = [];
  let usedSportKey = null;

  for (const sportKey of sportKeys) {
    try {
      const url = `${BASE}/sports/${sportKey}/odds/?apiKey=${API_KEY}&regions=${REGIONS}&markets=h2h&oddsFormat=${ODDS_FORMAT}`;
      const r = await fetch(url);
      if (!r.ok) continue;
      const data = await r.json();
      if (Array.isArray(data) && data.length > 0) {
        events = data;
        usedSportKey = sportKey;
        break;
      }
    } catch {
      continue;
    }
  }

  if (events.length === 0) {
    return res.status(200).json({
      sportKey: null,
      matches: [],
      props: [],
      note: "No active tennis matches found on The Odds API right now.",
    });
  }

  // ─── Step 2: Extract match winner lines ────────────────────────────────────
  const matches = events.map((event) => {
    const home = event.home_team;
    const away = event.away_team;
    let homeOdds = null;
    let awayOdds = null;

    const preferredBooks = ["draftkings", "fanduel", "betmgm", "caesars", "pointsbetus"];
    for (const book of event.bookmakers || []) {
      if (preferredBooks.includes(book.key)) {
        const h2h = (book.markets || []).find((m) => m.key === "h2h");
        if (h2h) {
          for (const outcome of h2h.outcomes || []) {
            if (outcome.name === home) homeOdds = outcome.price;
            if (outcome.name === away) awayOdds = outcome.price;
          }
          break;
        }
      }
    }

    if (homeOdds === null) {
      for (const book of event.bookmakers || []) {
        const h2h = (book.markets || []).find((m) => m.key === "h2h");
        if (h2h) {
          for (const outcome of h2h.outcomes || []) {
            if (outcome.name === home) homeOdds = outcome.price;
            if (outcome.name === away) awayOdds = outcome.price;
          }
          break;
        }
      }
    }

    return {
      id: event.id,
      home,
      away,
      commenceTime: event.commence_time,
      homeOdds,
      awayOdds,
    };
  });

  // ─── Step 3: Fetch player props for each match ─────────────────────────────
  const propMarkets = "player_aces,player_double_faults";
  const props = [];
  const matchesToFetch = matches.slice(0, 6);

  await Promise.all(
    matchesToFetch.map(async (match) => {
      try {
        const url = `${BASE}/events/${match.id}/odds?apiKey=${API_KEY}&regions=${REGIONS}&markets=${propMarkets}&oddsFormat=${ODDS_FORMAT}`;
        const r = await fetch(url);
        if (!r.ok) return;
        const data = await r.json();

        const matchProps = {
          matchId: match.id,
          home: match.home,
          away: match.away,
          aces: [],
          doubleFaults: [],
        };

        for (const book of data.bookmakers || []) {
          for (const market of book.markets || []) {
            for (const outcome of market.outcomes || []) {
              const entry = {
                book: book.key,
                player: outcome.name,
                description: outcome.description,
                line: outcome.point,
                odds: outcome.price,
              };

              if (market.key === "player_aces") {
                const exists = matchProps.aces.find(
                  (e) => e.player === outcome.name && e.description === outcome.description
                );
                if (!exists) matchProps.aces.push(entry);
              }

              if (market.key === "player_double_faults") {
                const exists = matchProps.doubleFaults.find(
                  (e) => e.player === outcome.name && e.description === outcome.description
                );
                if (!exists) matchProps.doubleFaults.push(entry);
              }
            }
          }
          if (matchProps.aces.length > 0 || matchProps.doubleFaults.length > 0) break;
        }

        if (matchProps.aces.length > 0 || matchProps.doubleFaults.length > 0) {
          props.push(matchProps);
        }
      } catch {
        // Not all matches will have prop markets
      }
    })
  );

  return res.status(200).json({
    sportKey: usedSportKey,
    matches,
    props,
    fetchedAt: new Date().toISOString(),
  });
}
