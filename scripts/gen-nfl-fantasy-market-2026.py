#!/usr/bin/env python3
"""Expand api/data/nfl-fantasy-market-2026.js from ESPN draft-kit PDFs.

Usage:
  python3 scripts/gen-nfl-fantasy-market-2026.py \\
    /path/to/NFL26_CS_PPR300.pdf \\
    /path/to/NFL26_CS_Super.pdf
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
OUT = ROOT / "api" / "data" / "nfl-fantasy-market-2026.js"
TEAM_FIX = {"JAC": "JAX", "ARZ": "ARI"}

SIGNALS = {
    "Jahmyr Gibbs": "Consensus elite PPR anchor; top overall non-superflex player.",
    "Bijan Robinson": "Elite workhorse tier; priced directly with Gibbs.",
    "Puka Nacua": "Market treats him as top PPR WR by volume.",
    "Ja'Marr Chase": "Elite WR with stable Burrow correlation when healthy.",
    "Jaxon Smith-Njigba": "Market prices him as a true target-dominant WR1.",
    "Christian McCaffrey": "Still elite, but ESPN mock narratives flagged age/workload risk.",
    "Jonathan Taylor": "TD-heavy elite RB market profile.",
    "Amon-Ra St. Brown": "High-floor PPR volume target.",
    "CeeDee Lamb": "Elite market respect, but verify current roster/QB and injury context.",
    "De'Von Achane": "Explosive PPR profile; ESPN mock notes flagged Miami context risk.",
    "Trey McBride": "Elite TE premium; high weekly edge versus replacement TE.",
    "Brock Bowers": "ESPN mock/market treats him like a target-share WR from the TE slot.",
    "Josh Allen": "Superflex 1.01 profile; rushing TD equity separates him.",
    "Jayden Daniels": "Superflex elite due rushing ceiling.",
    "Lamar Jackson": "Elite rushing QB; ESPN mock group often waited and found value.",
    "Drake Maye": "Market prices second-year leap as near-elite.",
    "Caleb Williams": "Late QB/bench target in standard PPR; materially more important in superflex.",
    "Patrick Mahomes": "Fantasy market discount versus name value; useful late-QB sentiment signal.",
    "Kenneth Gainwell": (
        "ESPN mock value target: PPR receiving role and possible extra touches "
        "if Tampa backfield injuries linger."
    ),
    "George Kittle": "ESPN injury-return optimism; use with current injury status before trusting.",
}


def parse_ranked(path: Path) -> dict:
    text = PdfReader(str(path)).pages[0].extract_text() or ""
    pat = re.compile(
        r"(\d+)\.\s*\(([A-Z0-9/]+)\)\s+([^,]+),\s*([A-Z]{2,3})\s+\$(\d+)\s+(\d+)"
    )
    rows = {}
    for m in pat.finditer(text):
        overall = int(m.group(1))
        pos_rank = m.group(2)
        name = m.group(3).strip()
        team = TEAM_FIX.get(m.group(4), m.group(4))
        salary = int(m.group(5))
        bye = int(m.group(6))
        if "D/ST" in name or pos_rank.startswith(("DST", "K")):
            continue
        rows[name] = {
            "overallRank": overall,
            "posRank": pos_rank,
            "salary": salary,
            "bye": bye,
            "team": team,
        }
    return rows


def main(argv: list[str]) -> int:
    if len(argv) < 3:
        print(__doc__.strip(), file=sys.stderr)
        return 2
    ppr_path = Path(argv[1])
    sf_path = Path(argv[2])
    ppr = parse_ranked(ppr_path)
    sf = parse_ranked(sf_path)
    if len(ppr) < 100 or len(sf) < 100:
        raise SystemExit(f"Parse too small: ppr={len(ppr)} super={len(sf)}")

    names = set()
    for name, row in ppr.items():
        if row["overallRank"] <= 120 or name in SIGNALS:
            names.add(name)
    for name, row in sf.items():
        if row["overallRank"] <= 40 or name in SIGNALS:
            names.add(name)

    players = {}
    for name in sorted(names, key=lambda n: (ppr.get(n, {}).get("overallRank", 9999), n)):
        entry = {}
        if name in ppr:
            entry["ppr"] = {k: ppr[name][k] for k in ["overallRank", "posRank", "salary", "bye"]}
        if name in sf:
            entry["superflex"] = {
                k: sf[name][k] for k in ["overallRank", "posRank", "salary", "bye"]
            }
        if name in SIGNALS:
            entry["signal"] = SIGNALS[name]
        if entry:
            players[name] = entry

    lines = [
        "// Auto-expanded ESPN Fantasy Draft Kit market layer (updated 2026-08-09).",
        "// Regen: python3 scripts/gen-nfl-fantasy-market-2026.py <PPR300.pdf> <Super.pdf>",
        "// Not roster truth or live odds.",
        "",
        "export const NFL_FANTASY_MARKET_2026 = {",
        "  meta: {",
        '    source: "ESPN Fantasy Football Draft Kit",',
        '    updatedAt: "2026-08-09",',
        '    scoring: "PPR and Superflex auction boards; 10-team $200 salary cap unless otherwise noted",',
        '    notes: "Use as fantasy-market sentiment and rank/value context. Do not override ESPN roster refresh or live prop lines.",',
        f"    playerCount: {len(players)},",
        "  },",
        "  players: {",
    ]
    for name, row in players.items():
        parts = []
        if "ppr" in row:
            p = row["ppr"]
            parts.append(
                f'ppr: {{ overallRank: {p["overallRank"]}, posRank: {json.dumps(p["posRank"])}, salary: {p["salary"]}, bye: {p["bye"]} }}'
            )
        if "superflex" in row:
            p = row["superflex"]
            parts.append(
                f'superflex: {{ overallRank: {p["overallRank"]}, posRank: {json.dumps(p["posRank"])}, salary: {p["salary"]}, bye: {p["bye"]} }}'
            )
        if "signal" in row:
            parts.append(f"signal: {json.dumps(row['signal'])}")
        lines.append(f"    {json.dumps(name)}: {{")
        lines.append("      " + ",\n      ".join(parts) + ",")
        lines.append("    },")
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
            "const MARKET_BY_KEY = new Map(",
            "  Object.entries(NFL_FANTASY_MARKET_2026.players).map(([name, row]) => [key(name), { name, ...row }]),",
            ");",
            "",
            "export function getNflFantasyMarketPlayer(name) {",
            "  return MARKET_BY_KEY.get(key(name)) || null;",
            "}",
            "",
        ]
    )
    OUT.write_text("\n".join(lines) + "\n")
    print(f"Wrote {OUT} ({len(players)} players; ppr={len(ppr)} super={len(sf)})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
