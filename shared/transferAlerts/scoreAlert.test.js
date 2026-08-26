import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseRssItems, decodeXmlEntities } from "./parseRss.js";
import {
  hashAlertId,
  rankTransferAlerts,
  scoreTransferItem,
  storyFingerprint,
} from "./scoreAlert.js";

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

  it("copies native reporterId from the feed", () => {
    const xml = `<?xml version="1.0"?>
      <rss><channel>
        <item>
          <title>Chelsea close to signing a defender</title>
          <link>https://t.me/x/1</link>
          <guid>g-1</guid>
        </item>
      </channel></rss>`;
    const items = parseRssItems(xml, {
      id: "tg_romano",
      label: "Romano",
      reporterId: "romano",
      native: true,
    });
    assert.equal(items[0].reporterId, "romano");
    assert.equal(items[0].native, true);
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

  it("credits Romano from a native Telegram feed without his name in the title", () => {
    const scored = scoreTransferItem({
      guid: "tg-1",
      title: "Chelsea are in advanced talks over a £40m deal for Honest Ahanor from Atalanta",
      link: "https://t.me/FabrizioRomanoTG/1",
      pubDate: new Date().toUTCString(),
      source: null,
      description: "Honest already said yes to Chelsea.",
      feedId: "tg_romano",
      feedLabel: "Romano X via Telegram",
      feedWeight: 1.85,
      barcaHeavyFeed: false,
      reporterId: "romano",
      native: true,
    });
    assert.ok(scored);
    assert.ok(scored.reporters.includes("romano"));
    assert.equal(scored.native, true);
  });

  it("drops native reply-guy posts", () => {
    const scored = scoreTransferItem({
      guid: "tg-reply",
      title: "@Gazoaks literally 10 minutes ago",
      link: "https://t.me/FabrizioRomanoTG/2",
      pubDate: new Date().toUTCString(),
      source: null,
      description: "",
      feedId: "tg_romano",
      feedLabel: "Romano X via Telegram",
      feedWeight: 1.85,
      barcaHeavyFeed: false,
      reporterId: "romano",
      native: true,
    });
    assert.equal(scored, null);
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

  it("keeps one banner when X and Google rewrite the same player", () => {
    const now = new Date().toUTCString();
    const ranked = rankTransferAlerts(
      [
        {
          guid: "x-martinez",
          native: true,
          reporterId: "ornstein",
          title: "Emiliano Martinez offered to Chelsea by representatives.",
          description: "#AVFC open to Argentina int'l exit after Zion Suzuki made No1 + #CFC keen",
          link: "https://x.com/David_Ornstein/status/1",
          pubDate: now,
          source: "X",
          feedId: "x_ornstein",
          feedLabel: "Ornstein X",
          feedWeight: 1.4,
          barcaHeavyFeed: false,
        },
        {
          guid: "gnews-martinez",
          title: "David Ornstein: Chelsea considering Emiliano Martinez transfer - Google News",
          description: "Aston Villa open to selling the goalkeeper",
          link: "https://news.google.com/rss/articles/zz",
          pubDate: now,
          source: "The Athletic",
          feedId: "gnews_ornstein",
          feedLabel: "Ornstein wire",
          feedWeight: 1,
          barcaHeavyFeed: false,
        },
      ],
      { limit: 8 },
    );
    assert.equal(ranked.length, 1);
    assert.equal(ranked[0].native, true);
    assert.equal(storyFingerprint(ranked[0]), "ornstein|martinez");
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
