#!/usr/bin/env python3
"""Generate api/data/nfl-clay-projections-2026.js from Mike Clay PDF.

Usage:
  python3 scripts/gen-nfl-clay-projections-2026.py /path/to/NFLDK2026_CS_ClayProjections2026.pdf
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError as exc:  # pragma: no cover
    raise SystemExit("Install pypdf: pip install pypdf") from exc

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "api" / "data" / "nfl-clay-projections-2026.js"

TEAM_ALIASES = {
    "BUF": "BUF",
    "NE": "NE",
    "NYJ": "NYJ",
    "MIA": "MIA",
    "BLT": "BAL",
    "BAL": "BAL",
    "CIN": "CIN",
    "PIT": "PIT",
    "CLV": "CLE",
    "CLE": "CLE",
    "HST": "HOU",
    "HOU": "HOU",
    "IND": "IND",
    "JAX": "JAX",
    "TEN": "TEN",
    "DEN": "DEN",
    "KC": "KC",
    "LAC": "LAC",
    "LV": "LV",
    "PHI": "PHI",
    "DAL": "DAL",
    "NYG": "NYG",
    "WAS": "WAS",
    "DET": "DET",
    "GB": "GB",
    "CHI": "CHI",
    "MIN": "MIN",
    "TB": "TB",
    "NO": "NO",
    "CAR": "CAR",
    "ATL": "ATL",
    "LAR": "LAR",
    "SEA": "SEA",
    "SF": "SF",
    "ARZ": "ARI",
    "ARI": "ARI",
}

NAME_TO_ABBR = {
    "Buffalo Bills": "BUF",
    "New England Patriots": "NE",
    "New York Jets": "NYJ",
    "Miami Dolphins": "MIA",
    "Baltimore Ravens": "BAL",
    "Cincinnati Bengals": "CIN",
    "Pittsburgh Steelers": "PIT",
    "Cleveland Browns": "CLE",
    "Houston Texans": "HOU",
    "Indianapolis Colts": "IND",
    "Jacksonville Jaguars": "JAX",
    "Tennessee Titans": "TEN",
    "Denver Broncos": "DEN",
    "Kansas City Chiefs": "KC",
    "Los Angeles Chargers": "LAC",
    "Las Vegas Raiders": "LV",
    "Philadelphia Eagles": "PHI",
    "Dallas Cowboys": "DAL",
    "New York Giants": "NYG",
    "Washington Commanders": "WAS",
    "Detroit Lions": "DET",
    "Green Bay Packers": "GB",
    "Chicago Bears": "CHI",
    "Minnesota Vikings": "MIN",
    "Tampa Bay Buccaneers": "TB",
    "New Orleans Saints": "NO",
    "Carolina Panthers": "CAR",
    "Atlanta Falcons": "ATL",
    "Los Angeles Rams": "LAR",
    "Seattle Seahawks": "SEA",
    "San Francisco 49ers": "SF",
    "Arizona Cardinals": "ARI",
}


def parse_qb(line: str):
    m = re.match(
        r"^(.+?)\s+([A-Z]{2,3})\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$",
        line,
    )
    if not m:
        return None
    team = TEAM_ALIASES.get(m.group(2))
    if not team:
        return None
    return {
        "name": m.group(1).strip(),
        "team": team,
        "pos": "QB",
        "posRank": int(m.group(3)),
        "pprPoints": int(m.group(4)),
        "games": int(m.group(5)),
        "passAtt": int(m.group(6)),
        "passComp": int(m.group(7)),
        "passYds": int(m.group(8)),
        "passTd": int(m.group(9)),
        "interceptions": int(m.group(10)),
        "sacks": int(m.group(11)),
        "rushAtt": int(m.group(12)),
        "rushYds": int(m.group(13)),
        "rushTd": int(m.group(14)),
    }


def parse_skill(line: str, pos: str):
    m = re.match(
        r"^(.+?)\s+([A-Z]{2,3})\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)%\s+(\d+)%\s*$",
        line,
    )
    if not m:
        return None
    team = TEAM_ALIASES.get(m.group(2))
    if not team:
        return None
    return {
        "name": m.group(1).strip(),
        "team": team,
        "pos": pos,
        "posRank": int(m.group(3)),
        "pprPoints": int(m.group(4)),
        "games": int(m.group(5)),
        "rushAtt": int(m.group(6)),
        "rushYds": int(m.group(7)),
        "rushTd": int(m.group(8)),
        "targets": int(m.group(9)),
        "receptions": int(m.group(10)),
        "recYds": int(m.group(11)),
        "recTd": int(m.group(12)),
        "carryShare": int(m.group(13)),
        "targetShare": int(m.group(14)),
    }


def js_val(v):
    if isinstance(v, str):
        return json.dumps(v)
    if isinstance(v, float):
        if v == int(v):
            return str(int(v))
        return repr(v)
    return json.dumps(v)


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__.strip(), file=sys.stderr)
        return 2
    pdf_path = Path(argv[1])
    if not pdf_path.exists():
        print(f"PDF not found: {pdf_path}", file=sys.stderr)
        return 1

    reader = PdfReader(str(pdf_path))
    players: dict[str, dict] = {}
    for i in range(34, 45):  # pages 35-45
        text = reader.pages[i].extract_text() or ""
        if "Quarterback Team" in text:
            pos = "QB"
        elif "Running Back Team" in text:
            pos = "RB"
        elif "Wide Receiver Team" in text:
            pos = "WR"
        elif "Tight End Team" in text:
            pos = "TE"
        else:
            continue
        for line in text.splitlines():
            line = line.strip()
            if not line or line.startswith(("Quarterback", "Running", "Wide", "Tight", "Defender")):
                continue
            row = parse_qb(line) if pos == "QB" else parse_skill(line, pos)
            if not row:
                continue
            if (
                row["pprPoints"] <= 0
                and row.get("passYds", 0) == 0
                and row.get("rushYds", 0) == 0
                and row.get("recYds", 0) == 0
            ):
                continue
            players[row["name"]] = {k: v for k, v in row.items() if k != "name"}

    teams: dict[str, dict] = {}
    stand_text = reader.pages[60].extract_text() or ""
    for full in sorted(NAME_TO_ABBR, key=len, reverse=True):
        abbr = NAME_TO_ABBR[full]
        for line in stand_text.splitlines():
            line = line.strip()
            idx = line.find(full)
            if idx < 0:
                continue
            rest = line[idx + len(full) :].strip()
            nums = re.findall(r"-?\d+(?:\.\d+)?", rest)
            if len(nums) < 7:
                continue
            teams[abbr] = {
                "projectedWins": float(nums[0]),
                "projectedLosses": float(nums[1]),
                "favoredGames": int(float(nums[2])),
                "pf": int(float(nums[3])),
                "pa": int(float(nums[4])),
                "diff": int(float(nums[5])),
                "sosRank": int(float(nums[6])),
            }
            break

    ug = reader.pages[62].extract_text() or ""
    up = re.compile(
        r"^(.+?)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+\.\d+)\s+(\d+)\s+(\d+\.\d+)\s+(\d+)\s+(\d+\.\d+)\s+(\d+)\s*$"
    )
    for line in ug.splitlines():
        line = line.strip()
        m = up.match(line)
        if not m:
            continue
        name = m.group(1).strip()
        abbr = NAME_TO_ABBR.get(name)
        if not abbr:
            continue
        row = teams.setdefault(abbr, {})
        row["overallGrade"] = float(m.group(12))
        row["nflRank"] = int(m.group(13))
        row["offGrade"] = float(m.group(14))
        row["offRank"] = int(m.group(15))
        row["defGrade"] = float(m.group(16))
        row["defRank"] = int(m.group(17))

    if len(teams) != 32:
        missing = set(NAME_TO_ABBR.values()) - set(teams)
        raise SystemExit(f"Expected 32 teams, got {len(teams)}; missing {sorted(missing)}")
    if not all("projectedWins" in t and "offRank" in t for t in teams.values()):
        raise SystemExit("Team rows missing projectedWins/offRank")

    lines = [
        "// Auto-generated from Mike Clay 2026 NFL Projection Guide (updated 2026-08-09).",
        "// Regen: python3 scripts/gen-nfl-clay-projections-2026.py <path-to-pdf>",
        "// Full guide positional + standings/unit-grade layers. Not roster truth or live odds.",
        "",
        "export const NFL_CLAY_PROJECTIONS_2026 = {",
        "  meta: {",
    ]
    meta = {
        "source": "Mike Clay 2026 NFL Projection Guide",
        "updatedAt": "2026-08-09",
        "projectionWindow": "Weeks 1-18 regular season",
        "injuryAdjustment": (
            "Clay notes these are 17-game projections; when comparing to props, "
            "consider removing about 2 games for QBs/WRs/TEs and about 3 games for RBs."
        ),
        "playerCount": len(players),
        "teamCount": len(teams),
        "generatedFrom": pdf_path.name,
    }
    for k, v in meta.items():
        lines.append(f"    {k}: {js_val(v)},")
    lines.append("  },")
    lines.append("  players: {")
    for name in sorted(players, key=lambda n: (players[n]["pos"], players[n]["posRank"], n)):
        row = players[name]
        parts = ", ".join(f"{k}: {js_val(v)}" for k, v in row.items())
        lines.append(f"    {json.dumps(name)}: {{ {parts} }},")
    lines.append("  },")
    lines.append("  teams: {")
    order = [
        "projectedWins",
        "projectedLosses",
        "favoredGames",
        "pf",
        "pa",
        "diff",
        "sosRank",
        "overallGrade",
        "nflRank",
        "offGrade",
        "offRank",
        "defGrade",
        "defRank",
    ]
    for abbr in sorted(teams):
        row = teams[abbr]
        parts = ", ".join(f"{k}: {js_val(row[k])}" for k in order if k in row)
        lines.append(f"    {abbr}: {{ {parts} }},")
    lines.extend(
        [
            "  },",
            "};",
            "",
            "function key(value) {",
            '  return String(value || "")',
            "    .toLowerCase()",
            '    .replace(/[^a-z0-9]+/g, "");',
            "}",
            "",
            "const CLAY_PLAYERS_BY_KEY = new Map(",
            "  Object.entries(NFL_CLAY_PROJECTIONS_2026.players).map(([name, row]) => [",
            "    key(name),",
            "    { name, ...row },",
            "  ]),",
            ");",
            "",
            "export function getNflClayProjectionPlayer(name) {",
            "  return CLAY_PLAYERS_BY_KEY.get(key(name)) || null;",
            "}",
            "",
            "export function getNflClayTeamProjection(teamAbbr) {",
            '  return NFL_CLAY_PROJECTIONS_2026.teams[String(teamAbbr || "").toUpperCase()] || null;',
            "}",
            "",
        ]
    )
    OUT.write_text("\n".join(lines) + "\n")
    by_pos = {p: sum(1 for v in players.values() if v["pos"] == p) for p in ["QB", "RB", "WR", "TE"]}
    print(f"Wrote {OUT} ({len(players)} players {by_pos}, {len(teams)} teams)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
