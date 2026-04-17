#!/usr/bin/env node
import fs from "fs";
import path from "path";
import XLSX from "xlsx";
import atpPlayers from "./data/tennis/atp.js";
import wtaPlayers from "./data/tennis/wta.js";
import nameAliases from "./data/tennis/name-aliases.js";

const NOW = new Date();
const YEAR = NOW.getFullYear();
const STAMP = NOW.toISOString().slice(0, 10);

const SOURCES = {
  atp: `http://www.tennis-data.co.uk/${YEAR}/${YEAR}.xlsx`,
  wta: `http://www.tennis-data.co.uk/${YEAR}w/${YEAR}.xlsx`,
};

const FILES = {
  atp: path.join(process.cwd(), "data", "tennis", "atp.js"),
  wta: path.join(process.cwd(), "data", "tennis", "wta.js"),
  expanded: path.join(process.cwd(), "data", "tennis", "expanded.js"),
  unmatched: path.join(process.cwd(), "data", "tennis", "unmatched-feed-names.json"),
};

const SURFACE_KEYS = ["Hard", "Clay", "Grass"];

const SACKMANN = {
  atp: "https://raw.githubusercontent.com/JeffSackmann/tennis_atp/master/atp_players.csv",
  wta: "https://raw.githubusercontent.com/JeffSackmann/tennis_wta/master/wta_players.csv",
};

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Tennis-data style: "Machac T." / "De Minaur A." / "Ugo Carabelli C." */
function parseFeedTennisData(raw) {
  const txt = normalize(raw);
  const parts = txt.split(" ").filter(Boolean);
  if (!parts.length) {
    return { full: "", surnameNorm: "", initialRun: "", parts: [] };
  }
  const lastTok = parts[parts.length - 1].replace(/\./g, "");
  let surnameParts = parts;
  let initialRun = "";
  if (/^[a-z]{1,2}$/i.test(lastTok) && parts.length >= 2) {
    initialRun = lastTok.toLowerCase();
    surnameParts = parts.slice(0, -1);
  }
  const surnameNorm = surnameParts.join(" ").trim();
  return { full: txt, surnameNorm, initialRun, parts };
}

function getLastName(name) {
  const parts = normalize(name).split(" ").filter(Boolean);
  return parts[parts.length - 1] || "";
}

function getFirstInitial(name) {
  const parts = normalize(name).split(" ").filter(Boolean);
  return (parts[0] || "")[0] || "";
}

function makePlayerIndex(playersObj) {
  const keys = Object.keys(playersObj || {});
  return keys.map((key) => ({
    key,
    full: normalize(key),
    lastName: getLastName(key),
    firstInitial: getFirstInitial(key),
  }));
}

async function fetchText(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${url}`);
  return res.text();
}

function buildSackmannDirectory(csvText) {
  const byKey = new Map();
  const byLast = new Map();
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  for (let i = 1; i < lines.length; i += 1) {
    const parts = lines[i].split(",");
    const id = Number(parts[0]) || 0;
    const nameFirst = String(parts[1] || "").trim();
    const nameLast = String(parts[2] || "").trim();
    if (!nameFirst || !nameLast) continue;
    const lastNorm = normalize(nameLast).replace(/-/g, " ");
    const display = `${nameFirst} ${nameLast}`.replace(/\s+/g, " ").trim();
    const baseFirst = nameFirst.toLowerCase();

    const pushLast = (entry) => {
      if (!byLast.has(lastNorm)) byLast.set(lastNorm, []);
      byLast.get(lastNorm).push(entry);
    };

    const entry = { id, display, nameFirst, nameLast, lastNorm, firstLower: baseFirst };
    pushLast(entry);

    const ini1 = baseFirst[0] || "";
    if (ini1) {
      const key1 = `${lastNorm}|${ini1}`;
      const prev1 = byKey.get(key1);
      if (!prev1 || id > prev1.id) byKey.set(key1, entry);
    }
    if (baseFirst.length >= 2) {
      const ini2 = baseFirst.slice(0, 2);
      const key2 = `${lastNorm}|${ini2}`;
      const prev2 = byKey.get(key2);
      if (!prev2 || id > prev2.id) byKey.set(key2, entry);
    }
  }
  return { byKey, byLast };
}

function lookupSackmannDirectory(dir, feed) {
  if (!dir || !feed?.surnameNorm) return null;
  const { surnameNorm, initialRun } = feed;
  const tryKeys = [];
  if (initialRun && initialRun.length === 2) tryKeys.push(initialRun);
  if (initialRun && initialRun.length >= 1) tryKeys.push(initialRun.slice(0, 1));

  for (const ini of tryKeys) {
    const hit = dir.byKey.get(`${surnameNorm}|${ini}`);
    if (hit) return hit.display;
  }

  const arr = dir.byLast.get(surnameNorm) || [];
  if (initialRun) {
    const hits = arr.filter((p) =>
      initialRun.length === 2 ? p.firstLower.startsWith(initialRun) : p.firstLower.startsWith(initialRun[0])
    );
    if (hits.length === 1) return hits[0].display;
    if (hits.length > 1) return hits.reduce((a, b) => (a.id > b.id ? a : b)).display;
  }

  if (arr.length === 1) return arr[0].display;
  return null;
}

function matchFromFullName(fullName, index) {
  const fn = normalize(fullName).replace(/-/g, " ");
  if (!fn) return null;
  for (const p of index) {
    const kn = normalize(p.key).replace(/-/g, " ");
    if (!kn) continue;
    if (fn === kn || fn.endsWith(` ${kn}`)) return p.key;
  }
  return null;
}

function matchPlayer(rawName, index, aliases = {}, sackDir = null) {
  const feed = parseFeedTennisData(rawName);
  if (!feed.full) return null;

  const aliasHit = aliases[feed.full];
  if (aliasHit && index.some((p) => p.key === aliasHit)) {
    return aliasHit;
  }

  if (sackDir) {
    const display = lookupSackmannDirectory(sackDir, feed);
    if (display) {
      const hit = matchFromFullName(display, index);
      if (hit) return hit;
    }
  }

  const exact = index.find((p) => p.full === feed.full);
  if (exact) return exact.key;

  const includeMatch = index.find(
    (p) => feed.full.includes(p.full) || p.full.includes(feed.full)
  );
  if (includeMatch) return includeMatch.key;

  const lastTok = feed.surnameNorm.split(" ").filter(Boolean).pop() || "";
  const lastCandidates = index.filter((p) => p.lastName && lastTok && p.lastName === lastTok);
  if (lastCandidates.length === 1) return lastCandidates[0].key;

  if (feed.initialRun) {
    const initialMatch = lastCandidates.find((p) => p.firstInitial === feed.initialRun[0]);
    if (initialMatch) return initialMatch.key;
  }

  return null;
}

function detectColumn(columns, names) {
  const wanted = names.map((x) => x.toLowerCase());
  for (const col of columns) {
    const norm = String(col || "").trim().toLowerCase();
    if (wanted.includes(norm)) return col;
  }
  return null;
}

async function fetchWorkbook(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Fetch failed ${res.status}: ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return XLSX.read(buf, { type: "buffer" });
}

function readRows(book) {
  const sheetName = book.SheetNames[0];
  const sheet = book.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

function computeStats(rows, playersObj, aliases = {}, sackDir = null) {
  const idx = makePlayerIndex(playersObj);
  const result = {};
  const unmatched = {};
  for (const key of Object.keys(playersObj)) {
    result[key] = {
      wins: 0,
      losses: 0,
      bySurface: { Hard: { w: 0, l: 0 }, Clay: { w: 0, l: 0 }, Grass: { w: 0, l: 0 } },
    };
  }

  if (!rows.length) return { result, unmatched };

  const columns = Object.keys(rows[0]);
  const winnerCol = detectColumn(columns, ["Winner", "winner_name", "WinnerName"]);
  const loserCol = detectColumn(columns, ["Loser", "loser_name", "LoserName"]);
  const surfaceCol = detectColumn(columns, ["Surface", "surface"]);

  if (!winnerCol || !loserCol) {
    throw new Error("Could not find Winner/Loser columns in workbook.");
  }

  for (const row of rows) {
    const winnerRaw = row[winnerCol];
    const loserRaw = row[loserCol];
    if (!winnerRaw || !loserRaw) continue;

    const winner = matchPlayer(winnerRaw, idx, aliases, sackDir);
    const loser = matchPlayer(loserRaw, idx, aliases, sackDir);
    if (!winner && !loser) continue;

    if (!winner) {
      const k = normalize(winnerRaw);
      if (k) unmatched[k] = (unmatched[k] || 0) + 1;
    }
    if (!loser) {
      const k = normalize(loserRaw);
      if (k) unmatched[k] = (unmatched[k] || 0) + 1;
    }

    const surfaceRaw = String(row[surfaceCol] || "").trim();
    const surface = SURFACE_KEYS.find((s) => s.toLowerCase() === surfaceRaw.toLowerCase()) || null;

    if (winner && result[winner]) {
      result[winner].wins += 1;
      if (surface && result[winner].bySurface[surface]) result[winner].bySurface[surface].w += 1;
    }
    if (loser && result[loser]) {
      result[loser].losses += 1;
      if (surface && result[loser].bySurface[surface]) result[loser].bySurface[surface].l += 1;
    }
  }

  return { result, unmatched };
}

function feedFallbackPretty(feed) {
  if (!feed?.surnameNorm) return "";
  const sur = feed.surnameNorm
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  if (feed.initialRun) {
    const ini =
      feed.initialRun.length === 2
        ? feed.initialRun[0].toUpperCase() + feed.initialRun[1].toLowerCase()
        : feed.initialRun[0].toUpperCase();
    return `${ini}. ${sur}`;
  }
  return sur;
}

function resolveExpandedDisplayName(rawName, aliases, idx, sackDir) {
  const feed = parseFeedTennisData(rawName);
  if (matchPlayer(rawName, idx, aliases, sackDir)) return null;
  const sackName = sackDir ? lookupSackmannDirectory(sackDir, feed) : null;
  if (sackName) return sackName.trim();
  return feedFallbackPretty(feed);
}

function computeExpandedPool(rows, aliases = {}, existingPlayers = {}, sackDir = null) {
  const idx = makePlayerIndex(existingPlayers);
  const expanded = {};

  if (!rows.length) return expanded;

  const columns = Object.keys(rows[0]);
  const winnerCol = detectColumn(columns, ["Winner", "winner_name", "WinnerName"]);
  const loserCol = detectColumn(columns, ["Loser", "loser_name", "LoserName"]);
  const surfaceCol = detectColumn(columns, ["Surface", "surface"]);
  if (!winnerCol || !loserCol) return expanded;

  function upsert(rawName, won, surfaceRaw) {
    const feed = parseFeedTennisData(rawName);
    if (!feed.full) return;
    if (aliases[feed.full]) return;
    const matched = matchPlayer(rawName, idx, aliases, sackDir);
    if (matched) return;

    const key = resolveExpandedDisplayName(rawName, aliases, idx, sackDir);
    if (!key) return;

    if (!expanded[key]) {
      expanded[key] = {
        feedNames: [],
        wins: 0,
        losses: 0,
        bySurface: {
          Hard: { w: 0, l: 0 },
          Clay: { w: 0, l: 0 },
          Grass: { w: 0, l: 0 },
        },
      };
    }

    const tag = String(rawName || "").trim();
    if (tag && !expanded[key].feedNames.includes(tag)) expanded[key].feedNames.push(tag);

    const surface = SURFACE_KEYS.find((s) => s.toLowerCase() === String(surfaceRaw || "").toLowerCase()) || null;
    if (won) {
      expanded[key].wins += 1;
      if (surface && expanded[key].bySurface[surface]) expanded[key].bySurface[surface].w += 1;
    } else {
      expanded[key].losses += 1;
      if (surface && expanded[key].bySurface[surface]) expanded[key].bySurface[surface].l += 1;
    }
  }

  for (const row of rows) {
    const surfaceRaw = row[surfaceCol];
    upsert(row[winnerCol], true, surfaceRaw);
    upsert(row[loserCol], false, surfaceRaw);
  }

  const pruned = {};
  for (const [name, stats] of Object.entries(expanded)) {
    const matches = Number(stats.wins || 0) + Number(stats.losses || 0);
    if (matches < 3) continue;

    pruned[name] = {
      record2026: `${stats.wins}-${stats.losses} — Auto-generated from ${YEAR} feed (${STAMP}).`,
      surfaceRecord2026: formatSurfaceText(stats),
      style: "Auto profile (limited)",
      fullNote:
        "Auto-generated profile from match-feed records. Add manual serve/return/Elo notes for elite analysis quality.",
      source: "tennis-data.co.uk + Sackmann roster (name normalization)",
      feedNames: stats.feedNames || [],
      autoGenerated: true,
    };
  }

  return pruned;
}

function writeExpandedFile(expandedData) {
  const body = `const expanded = ${JSON.stringify(expandedData, null, 2)};\n\nexport default expanded;\n`;
  fs.writeFileSync(FILES.expanded, body, "utf8");
}

function writeUnmatchedReport(unmatchedData) {
  const sorted = {};
  for (const [tour, obj] of Object.entries(unmatchedData || {})) {
    sorted[tour] = Object.fromEntries(
      Object.entries(obj || {}).sort((a, b) => b[1] - a[1])
    );
  }
  fs.writeFileSync(FILES.unmatched, JSON.stringify(sorted, null, 2), "utf8");
}

function formatRecordText(s) {
  return `${s.wins}-${s.losses} — Auto-refreshed ${YEAR} match record (${STAMP}).`;
}

function formatSurfaceText(s) {
  const hard = `${s.bySurface.Hard.w}-${s.bySurface.Hard.l}`;
  const clay = `${s.bySurface.Clay.w}-${s.bySurface.Clay.l}`;
  const grass = `${s.bySurface.Grass.w}-${s.bySurface.Grass.l}`;
  return `Hard ${hard} · Clay ${clay} · Grass ${grass} (auto-refreshed ${STAMP})`;
}

function updateBlockText(block, stats) {
  const recordLine = `record2026: "${formatRecordText(stats)}",`;
  const surfaceLine = `surfaceRecord2026: "${formatSurfaceText(stats)}",`;

  let out = block;
  if (/record2026:\s*"[^"]*",?/.test(out)) {
    out = out.replace(/record2026:\s*"[^"]*",?/, recordLine);
  } else if (/yElo2026:\s*[^,\n]+,/.test(out)) {
    out = out.replace(/(yElo2026:\s*[^,\n]+,)/, `$1\n    ${recordLine}`);
  } else {
    out = out.replace(/\{\n/, `{\n    ${recordLine}\n`);
  }

  if (/surfaceRecord2026:\s*"[^"]*",?/.test(out)) {
    out = out.replace(/surfaceRecord2026:\s*"[^"]*",?/, surfaceLine);
  } else if (/record2026:\s*"[^"]*",?/.test(out)) {
    out = out.replace(/(record2026:\s*"[^"]*",?)/, `$1\n    ${surfaceLine}`);
  } else {
    out = out.replace(/\{\n/, `{\n    ${surfaceLine}\n`);
  }

  return out;
}

function patchFile(filePath, playersObj, statsMap) {
  let text = fs.readFileSync(filePath, "utf8");
  let touched = 0;

  for (const playerName of Object.keys(playersObj)) {
    const stats = statsMap[playerName];
    if (!stats || stats.wins + stats.losses === 0) continue;

    const escaped = playerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const keyRegex = new RegExp(
      `(^\\s*(?:"${escaped}"|${escaped})\\s*:\\s*\\{)`,
      "m"
    );
    const match = text.match(keyRegex);
    if (!match || match.index == null) continue;

    const start = match.index + match[0].length - 1;
    let depth = 0;
    let end = -1;
    for (let i = start; i < text.length; i += 1) {
      if (text[i] === "{") depth += 1;
      else if (text[i] === "}") {
        depth -= 1;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    if (end < 0) continue;

    const block = text.slice(match.index, end);
    const nextBlock = updateBlockText(block, stats);
    if (nextBlock !== block) {
      text = text.slice(0, match.index) + nextBlock + text.slice(end);
      touched += 1;
    }
  }

  fs.writeFileSync(filePath, text, "utf8");
  return touched;
}

async function main() {
  const atpBook = await fetchWorkbook(SOURCES.atp);
  const wtaBook = await fetchWorkbook(SOURCES.wta);

  const atpRows = readRows(atpBook);
  const wtaRows = readRows(wtaBook);

  let atpSackDir = null;
  let wtaSackDir = null;
  try {
    const [atpCsv, wtaCsv] = await Promise.all([
      fetchText(SACKMANN.atp),
      fetchText(SACKMANN.wta),
    ]);
    atpSackDir = buildSackmannDirectory(atpCsv);
    wtaSackDir = buildSackmannDirectory(wtaCsv);
  } catch (e) {
    console.warn("[tennis-form] Sackmann roster fetch failed — name normalization degraded:", e?.message || e);
  }

  const atpAlias = nameAliases?.atp || {};
  const wtaAlias = nameAliases?.wta || {};
  const atpComputed = computeStats(atpRows, atpPlayers, atpAlias, atpSackDir);
  const wtaComputed = computeStats(wtaRows, wtaPlayers, wtaAlias, wtaSackDir);

  const atpStats = atpComputed.result;
  const wtaStats = wtaComputed.result;

  const atpTouched = patchFile(FILES.atp, atpPlayers, atpStats);
  const wtaTouched = patchFile(FILES.wta, wtaPlayers, wtaStats);

  const expanded = {
    updatedAt: STAMP,
    atp: computeExpandedPool(atpRows, atpAlias, atpPlayers, atpSackDir),
    wta: computeExpandedPool(wtaRows, wtaAlias, wtaPlayers, wtaSackDir),
  };
  writeExpandedFile(expanded);
  writeUnmatchedReport({
    atp: atpComputed.unmatched,
    wta: wtaComputed.unmatched,
  });

  console.log(`[tennis-form] ATP players updated: ${atpTouched}`);
  console.log(`[tennis-form] WTA players updated: ${wtaTouched}`);
  console.log(
    `[tennis-form] Expanded pool: ATP ${Object.keys(expanded.atp || {}).length}, WTA ${Object.keys(expanded.wta || {}).length}`
  );
  console.log(`[tennis-form] Source year: ${YEAR} (${STAMP})`);
}

main().catch((err) => {
  console.error("[tennis-form] refresh failed:", err?.message || err);
  process.exit(1);
});
