import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rankAlabamaAlerts, scoreAlabamaItem } from "./alabamaScore.js";

describe("scoreAlabamaItem", () => {
  it("keeps injury / roster signal with concrete fact", () => {
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
    assert.ok(scored.reasons.includes("substance"));
  });

  it("keeps named player status", () => {
    const scored = scoreAlabamaItem({
      guid: "a1b",
      title: "Jalen Milroe questionable vs Georgia — ankle",
      link: "https://example.com/a1b",
      pubDate: new Date().toUTCString(),
      source: "AP",
      description: "Alabama QB dealing with ankle injury",
      feedId: "gnews",
      feedLabel: "Alabama",
      feedWeight: 1,
      barcaHeavyFeed: false,
    });
    assert.ok(scored);
    assert.match(scored.title, /Milroe/i);
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

  it("drops vague coach / injury topic labels", () => {
    assert.equal(
      scoreAlabamaItem({
        guid: "vague1",
        title: "Alabama coach updates",
        link: "https://example.com/v1",
        pubDate: new Date().toUTCString(),
        source: "Local",
        description: "Coaching news roundup",
        feedId: "gnews",
        feedLabel: "Alabama",
        feedWeight: 1,
        barcaHeavyFeed: false,
      }),
      null,
    );
    assert.equal(
      scoreAlabamaItem({
        guid: "vague2",
        title: "Injuries for starting players",
        link: "https://example.com/v2",
        pubDate: new Date().toUTCString(),
        source: "Local",
        description: "Alabama football injury notes",
        feedId: "gnews",
        feedLabel: "Alabama",
        feedWeight: 1,
        barcaHeavyFeed: false,
      }),
      null,
    );
  });
});

describe("rankAlabamaAlerts", () => {
  it("keeps ACL surgery fact and drops empty practice blurb", () => {
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
    assert.equal(ranked.length, 1);
    assert.match(ranked[0].title, /ACL|surgery|out for/i);
  });
});
