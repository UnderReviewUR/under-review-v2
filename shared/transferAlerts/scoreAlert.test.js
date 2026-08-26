import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseRssItems, decodeXmlEntities } from "./parseRss.js";
import { hashAlertId, rankTransferAlerts, scoreTransferItem } from "./scoreAlert.js";

describe("decodeXmlEntities", () => {
  it("decodes common entities", () => {
    assert.equal(decodeXmlEntities("A &amp; B"), "A & B");
    assert.equal(decodeXmlEntities("It&#39;s"), "It's");
  });
});

describe("parseRssItems", () => {
  it("parses Google-style RSS items with CDATA", () => {
    const xml = `<?xml version="1.0"?>
      <rss><channel>
        <item>
          <title><![CDATA[Barcelona close to deal for striker - David Ornstein]]></title>
          <link>https://example.com/a</link>
          <guid>guid-1</guid>
          <pubDate>Wed, 26 Aug 2026 12:00:00 GMT</pubDate>
          <source>The Athletic</source>
          <description><![CDATA[Exclusive: personal terms agreed]]></description>
        </item>
      </channel></rss>`;
    const items = parseRssItems(xml, {
      id: "test",
      label: "Test",
      weight: 1.2,
      barcaHeavy: true,
    });
    assert.equal(items.length, 1);
    assert.match(items[0].title, /Barcelona/);
    assert.equal(items[0].link, "https://example.com/a");
    assert.equal(items[0].feedWeight, 1.2);
    assert.equal(items[0].barcaHeavyFeed, true);
  });
});

describe("scoreTransferItem", () => {
  it("scores Ornstein + Barça transfer highly", () => {
    const scored = scoreTransferItem({
      guid: "1",
      title: "Barcelona agree deal for midfielder — David Ornstein",
      link: "https://example.com/1",
      pubDate: null,
      source: "The Athletic",
      description: "Personal terms and medical planned",
      feedId: "gnews_ornstein",
      feedLabel: "Ornstein wire",
      feedWeight: 1.4,
      barcaHeavyFeed: false,
    });
    assert.ok(scored);
    assert.equal(scored.barca, true);
    assert.ok(scored.reporters.includes("ornstein"));
    assert.ok(scored.score >= 8);
    assert.equal(scored.priority, 5);
  });

  it("keeps Romano Here We Go on a top club", () => {
    const scored = scoreTransferItem({
      guid: "2",
      title: "Here We Go! Liverpool — Fabrizio Romano",
      link: "https://example.com/2",
      pubDate: null,
      source: null,
      description: "Deal done, medical tomorrow",
      feedId: "gnews_romano",
      feedLabel: "Romano wire",
      feedWeight: 1.35,
      barcaHeavyFeed: false,
    });
    assert.ok(scored);
    assert.ok(scored.reporters.includes("romano"));
    assert.ok(scored.priority >= 4);
  });

  it("drops match report noise without transfer language or byline", () => {
    const scored = scoreTransferItem({
      guid: "3",
      title: "Premier League: Arsenal thrash visitors 3-0",
      link: "https://example.com/3",
      pubDate: null,
      source: "BBC",
      description: "Match report from the Emirates",
      feedId: "bbc_football",
      feedLabel: "BBC Sport Football",
      feedWeight: 0.95,
      barcaHeavyFeed: false,
    });
    assert.equal(scored, null);
  });
});

describe("rankTransferAlerts", () => {
  it("dedupes by hash and prefers higher score", () => {
    const a = {
      guid: "same-story",
      title: "Barcelona signing close — James Benge",
      link: "https://example.com/x",
      pubDate: null,
      source: "The Athletic",
      description: "Transfer talks advanced",
      feedId: "a",
      feedLabel: "A",
      feedWeight: 1,
      barcaHeavyFeed: true,
    };
    const b = { ...a, feedWeight: 1.5, title: "Barcelona signing close — James Benge (update)" };
    // Different titles → different hashes; use identical guid path via hashAlertId stability
    const ranked = rankTransferAlerts(
      [
        { ...a, guid: "dup" },
        { ...b, guid: "dup" },
      ],
      { limit: 5 },
    );
    assert.equal(ranked.length, 1);
    assert.ok(ranked[0].score >= 5);
  });
});

describe("hashAlertId", () => {
  it("is stable", () => {
    assert.equal(hashAlertId("Hello World"), hashAlertId("hello   world"));
  });
});

describe("phraseMatch / false positives", () => {
  it("does not treat Barcola as Barça", () => {
    const scored = scoreTransferItem({
      guid: "barcola",
      title: "Flying for medical: Fabrizio Romano confirms deal as Barcola closer to Liverpool transfer",
      link: "https://example.com/barcola",
      pubDate: new Date().toUTCString(),
      source: "Yahoo Sports",
      description: "Medical planned",
      feedId: "gnews_romano",
      feedLabel: "Romano wire",
      feedWeight: 1.35,
      barcaHeavyFeed: false,
    });
    assert.ok(scored);
    assert.equal(scored.barca, false);
    assert.deepEqual(scored.reporters, ["romano"]);
  });

  it("does not attribute Benge from Athletic outlet alone", () => {
    const scored = scoreTransferItem({
      guid: "ath",
      title: "Arsenal nearing agreement for Bruno Guimaraes transfer from Newcastle - The Athletic",
      link: "https://example.com/ath",
      pubDate: new Date().toUTCString(),
      source: "The Athletic",
      description: "Talks ongoing",
      feedId: "gnews_top_transfers",
      feedLabel: "Top-club transfer desk",
      feedWeight: 1,
      barcaHeavyFeed: false,
    });
    if (scored) {
      assert.equal(scored.barca, false);
      assert.ok(!scored.reporters.includes("benge"));
    } else {
      assert.equal(scored, null);
    }
  });

  it("drops stale archive pieces", () => {
    const scored = scoreTransferItem({
      guid: "old",
      title: "Barcelona transfer ban or not — Sid Lowe",
      link: "https://example.com/old",
      pubDate: "Mon, 01 Jan 2018 12:00:00 GMT",
      source: "The Guardian",
      description: "Archive",
      feedId: "guardian_football",
      feedLabel: "Guardian Football",
      feedWeight: 0.95,
      barcaHeavyFeed: false,
    });
    assert.equal(scored, null);
  });
});
