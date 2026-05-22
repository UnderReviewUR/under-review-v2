import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  bdlGameStartEtDateYmd,
  filterBdlRowsForEtDay,
  filterBdlRowsToTonightSlate,
  isBdlEtDayPlayableSlateGame,
  mapBdlGameToSlateRow,
  readNbaBdlPlayoffSlateWindow,
} from "./nbaPlayoffSlateFromBdl.js";

describe("nbaPlayoffSlateFromBdl ET day filters", () => {
  const tomorrowTip = "2026-05-23T01:30:00Z";

  const row = {
    id: 99,
    status: "Scheduled",
    postseason: true,
    start_time: tomorrowTip,
    home_team: { abbreviation: "OKC", full_name: "Oklahoma City Thunder" },
    visitor_team: { abbreviation: "SAS", full_name: "San Antonio Spurs" },
  };

  it("maps SAS @ OKC to tomorrow ET when tip is after midnight UTC on game night", () => {
    const mapped = mapBdlGameToSlateRow(row);
    assert.equal(mapped.awayTeam.abbr, "SAS");
    assert.equal(mapped.homeTeam.abbr, "OKC");
    assert.equal(bdlGameStartEtDateYmd(mapped), "2026-05-22");
    assert.equal(isBdlEtDayPlayableSlateGame(mapped, "2026-05-22"), true);
    assert.equal(isBdlEtDayPlayableSlateGame(mapped, "2026-05-21"), false);
  });

  it("filterBdlRowsForEtDay keeps tomorrow slate, tonight filter drops it on off night", () => {
    const tomorrowOnly = filterBdlRowsForEtDay([row], "2026-05-22");
    assert.equal(tomorrowOnly.length, 1);
    const tonight = filterBdlRowsToTonightSlate([row], "2026-05-21");
    assert.equal(tonight.length, 0);
  });
});

describe("readNbaBdlPlayoffSlateWindow", () => {
  it("returns tomorrow games with slateDayLabel when today is empty", async () => {
    const tomorrowTip = "2026-05-23T01:30:00Z";
    const bdlRow = {
      id: 42,
      status: "Scheduled",
      postseason: true,
      start_time: tomorrowTip,
      home_team: { abbreviation: "OKC", full_name: "Oklahoma City Thunder" },
      visitor_team: { abbreviation: "SAS", full_name: "San Antonio Spurs" },
    };

    const store = {
      getDurableJson: async () => null,
      setDurableJson: async () => {},
    };

    const fetchCalls = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      fetchCalls.push(String(url));
      const dateMatch = String(url).match(/dates%5B%5D=([^&]+)/);
      const dateIso = dateMatch ? decodeURIComponent(dateMatch[1]) : "";
      const data =
        dateIso === "2026-05-22"
          ? { data: [bdlRow], meta: {} }
          : { data: [], meta: {} };
      return {
        ok: true,
        json: async () => data,
      };
    };

    try {
      const window = await readNbaBdlPlayoffSlateWindow(
        "2026-05-21",
        "2026-05-22",
        store,
        "test-bdl-key",
      );
      assert.equal(window.window, "tomorrow");
      assert.equal(window.games.length, 1);
      assert.equal(window.games[0].slateDayLabel, "Tomorrow");
      assert.equal(window.games[0].awayTeam.abbr, "SAS");
      assert.ok(fetchCalls.some((u) => u.includes("2026-05-22")));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
