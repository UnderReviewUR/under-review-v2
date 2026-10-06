import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rankAlabamaAlerts, scoreAlabamaItem } from "./alabamaScore.js";

describe("scoreAlabamaItem", () => {
  it("keeps injury / roster signal", () => {
    const scored = scoreAlabamaItem({
      guid: "a1",
      title: "Alabama QB ruled out with ankle injury vs Georgia",
      link: "https://example.com/a1",
      pubDate: new Date().toUTCString(),
      source: "AP",
      description: "Crimson Tide starter sidelined",
      feedId: "gnews",
      feedLabel: "Alabama",
      feedWeight: 1,
      barcaHeavyFeed: false,
    });
    assert.ok(scored);
    assert.ok(scored.score >= 4.5);
  });

  it("drops recruiting fluff", () => {
    const scored = scoreAlabamaItem({
      guid: "a2",
      title: "Four-star WR commits to Alabama Crimson Tide",
      link: "https://example.com/a2",
      pubDate: new Date().toUTCString(),
      source: "247Sports",
      description: "Recruiting class of 2027",
      feedId: "gnews",
      feedLabel: "Alabama",
      feedWeight: 1,
      barcaHeavyFeed: false,
    });
    assert.equal(scored, null);
  });
});

describe("rankAlabamaAlerts", () => {
  it("ranks injury above weaker practice note", () => {
    const now = new Date().toUTCString();
    const ranked = rankAlabamaAlerts(
      [
        {
          guid: "p1",
          title: "Alabama limited in practice Friday",
          link: "https://example.com/p1",
          pubDate: now,
          source: "Local",
          description: "Crimson Tide practice report",
          feedId: "gnews",
          feedLabel: "A",
          feedWeight: 1,
          barcaHeavyFeed: false,
        },
        {
          guid: "i1",
          title: "Alabama star WR out for season after ACL surgery",
          link: "https://example.com/i1",
          pubDate: now,
          source: "ESPN",
          description: "Crimson Tide injury",
          feedId: "gnews",
          feedLabel: "A",
          feedWeight: 1,
          barcaHeavyFeed: false,
        },
      ],
      { limit: 2 },
    );
    assert.ok(ranked.length >= 1);
    assert.match(ranked[0].title, /ACL|surgery|out for/i);
  });
});
