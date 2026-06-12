/**
 * One-shot diagnostic for F1 / tennis / WC BDL degraded paths.
 * Usage: node scripts/probe-degraded-feeds.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvFile(name) {
  const p = resolve(root, name);
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.production.local");

const BDL_KEY = process.env.BALLDONTLIE_API_KEY || "";
const ODDS_KEY = process.env.ODDS_API_KEY || "";
const OPENF1_AUTH = process.env.OPENF1_AUTHORIZATION || process.env.OPENF1_API_KEY || "";

async function probe(label, url, opts = {}) {
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 15000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      cache: "no-store",
      headers: opts.headers || {},
    });
    clearTimeout(timer);
    let body = null;
    let text = "";
    try {
      text = await res.text();
      body = JSON.parse(text);
    } catch {
      body = null;
    }
    return {
      label,
      ok: res.ok,
      status: res.status,
      ms: Date.now() - t0,
      summary: opts.summarize?.(body, text, res) ?? (body ? Object.keys(body).slice(0, 8) : text.slice(0, 120)),
    };
  } catch (err) {
    clearTimeout(timer);
    return { label, ok: false, status: 0, ms: Date.now() - t0, summary: err?.message || String(err) };
  }
}

function hasKey(k) {
  return Boolean(String(k || "").trim());
}

const report = {
  env: {
    BALLDONTLIE_API_KEY: hasKey(BDL_KEY),
    ODDS_API_KEY: hasKey(ODDS_KEY),
    OPENF1_AUTHORIZATION: hasKey(OPENF1_AUTH),
    OPENF1_BASE_URL: process.env.OPENF1_BASE_URL || "(default public)",
  },
  probes: [],
};

// --- F1 OpenF1 ---
report.probes.push(
  await probe("openf1_sessions_latest_no_auth", "https://api.openf1.org/v1/sessions?session_key=latest", {
    summarize: (b) => ({
      rows: Array.isArray(b) ? b.length : null,
      first: Array.isArray(b) && b[0] ? b[0].session_name : null,
    }),
  }),
);

if (OPENF1_AUTH) {
  report.probes.push(
    await probe("openf1_sessions_latest_with_auth", "https://api.openf1.org/v1/sessions?session_key=latest", {
      headers: { Authorization: OPENF1_AUTH },
      summarize: (b) => ({
        rows: Array.isArray(b) ? b.length : null,
        first: Array.isArray(b) && b[0] ? b[0].session_name : null,
      }),
    }),
  );
}

report.probes.push(
  await probe("openf1_meetings_2026_no_auth", "https://api.openf1.org/v1/meetings?year=2026", {
    summarize: (b) => ({ meetings: Array.isArray(b) ? b.length : null }),
  }),
);

// --- BDL WC ---
if (BDL_KEY) {
  report.probes.push(
    await probe("bdl_wc_group_standings_2026", "https://api.balldontlie.io/fifa/worldcup/v1/group_standings?seasons%5B%5D=2026", {
      headers: { Authorization: BDL_KEY },
      summarize: (b) => {
        const raw = b?.data ?? b?.groups ?? b?.group_standings ?? b;
        const arr = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? Object.keys(raw) : [];
        return {
          topKeys: b && typeof b === "object" ? Object.keys(b).slice(0, 10) : [],
          groupLetters: Array.isArray(raw)
            ? raw.map((g) => g.group || g.name || g.letter).filter(Boolean).slice(0, 16)
            : Array.isArray(arr) ? arr.slice(0, 16) : [],
          dataLen: Array.isArray(raw) ? raw.length : typeof raw === "object" && raw ? Object.keys(raw).length : 0,
        };
      },
    }),
  );
  report.probes.push(
    await probe("bdl_wc_matches_2026_page1", "https://api.balldontlie.io/fifa/worldcup/v1/matches?seasons%5B%5D=2026&per_page=5", {
      headers: { Authorization: BDL_KEY },
      summarize: (b) => ({
        matches: Array.isArray(b?.data) ? b.data.length : null,
        meta: b?.meta ?? null,
      }),
    }),
  );
} else {
  report.probes.push({ label: "bdl_wc_skipped", ok: false, summary: "no BALLDONTLIE_API_KEY locally" });
}

// --- BDL ATP ---
if (BDL_KEY) {
  const anchor = new Date();
  anchor.setDate(anchor.getDate() - 60);
  const startDateAfter = anchor.toISOString().slice(0, 10);
  report.probes.push(
    await probe(
      "bdl_atp_matches_live",
      `https://api.balldontlie.io/atp/v1/matches?per_page=10&is_live=true&start_date_after=${startDateAfter}`,
      {
        headers: { Authorization: BDL_KEY },
        summarize: (b) => ({
          matches: Array.isArray(b?.data) ? b.data.length : null,
          sample: Array.isArray(b?.data) && b.data[0]
            ? {
                id: b.data[0].id,
                status: b.data[0].match_status,
                p1: b.data[0].player1?.full_name,
                p2: b.data[0].player2?.full_name,
                tournament: b.data[0].tournament?.name,
              }
            : null,
        }),
      },
    ),
  );
  report.probes.push(
    await probe(
      "bdl_atp_matches_recent",
      `https://api.balldontlie.io/atp/v1/matches?per_page=10&start_date_after=${startDateAfter}`,
      {
        headers: { Authorization: BDL_KEY },
        summarize: (b) => ({
          matches: Array.isArray(b?.data) ? b.data.length : null,
          next_cursor: b?.meta?.next_cursor ?? null,
        }),
      },
    ),
  );
  report.probes.push(
    await probe("bdl_atp_tournaments_2026", "https://api.balldontlie.io/atp/v1/tournaments?season=2026&per_page=100", {
      headers: { Authorization: BDL_KEY },
      summarize: (b) => {
        const now = Date.now();
        const active = (b?.data || []).filter((t) => {
          const sd = new Date(`${String(t.start_date).slice(0, 10)}T00:00:00.000Z`).getTime();
          const ed = new Date(`${String(t.end_date).slice(0, 10)}T23:59:59.999Z`).getTime();
          return sd <= now + 45 * 864e5 && ed >= now - 4 * 864e5;
        });
        return {
          total: Array.isArray(b?.data) ? b.data.length : null,
          activeInWindow: active.length,
          activeNames: active.slice(0, 6).map((t) => t.name),
        };
      },
    }),
  );
}

// --- Odds API tennis ---
if (ODDS_KEY) {
  for (const sportKey of ["tennis_atp", "tennis_atp_miami"]) {
    report.probes.push(
      await probe(
        `odds_api_${sportKey}`,
        `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${ODDS_KEY}&regions=us,us2&markets=h2h&oddsFormat=american`,
        {
          summarize: (b, _t, res) => ({
            events: Array.isArray(b) ? b.length : null,
            remaining: res.headers.get("x-requests-remaining"),
            used: res.headers.get("x-requests-used"),
          }),
        },
      ),
    );
  }
} else {
  report.probes.push({ label: "odds_api_skipped", ok: false, summary: "no ODDS_API_KEY locally" });
}

// --- Production endpoints ---
for (const [label, url] of [
  ["prod_tennis_atp", "https://www.under-review.app/api/tennis?tour=atp"],
  ["prod_f1", "https://www.under-review.app/api/f1"],
  ["prod_world_cup", "https://www.under-review.app/api/world-cup?view=groups"],
]) {
  report.probes.push(
    await probe(label, url, {
      timeoutMs: 25000,
      summarize: (b) => {
        if (label === "prod_tennis_atp") {
          return { source: b?.source, results: (b?.results || []).length, first: b?.results?.[0]?.tournament_name };
        }
        if (label === "prod_f1") {
          return {
            usingFallback: b?.usingFallback,
            openf1TimingSource: b?.openf1TimingSource,
            session: b?.session?.session_name ?? null,
            races: b?.schedule?.races?.length ?? 0,
            standings: b?.standings?.length ?? 0,
          };
        }
        if (label === "prod_world_cup") {
          const g = b?.groups || {};
          return { source: b?.source, groupCount: Object.keys(g).length, matchCount: b?.matches?.length ?? null };
        }
        return null;
      },
    }),
  );
}

console.log(JSON.stringify(report, null, 2));
