import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  splitTweetCopy,
  xStatusToFeedItem,
  parseFxTimeline,
} from "./_transferAlertsX.js";

const ornstein = { handle: "David_Ornstein", reporterId: "ornstein" };

describe("splitTweetCopy", () => {
  it("puts the deal in the title and fee details in the body", () => {
    const { title, description } = splitTweetCopy(
      "Al Hilal finalising agreement with Aston Villa to sign Ollie Watkins. Subject to #AVFC landing replacement, 30yo England striker to move for £50m + small add-ons @TheAthleticFC https://www.nytimes.com/athletic/x",
    );
    assert.match(title, /Watkins/i);
    assert.doesNotMatch(title, /50m/);
    assert.match(description, /50m/);
    assert.match(description, /Villa/);
    assert.doesNotMatch(description, /#AVFC/);
    assert.doesNotMatch(description, /@TheAthleticFC/);
    assert.doesNotMatch(description, /nytimes\.com/);
  });
});

describe("xStatusToFeedItem", () => {
  it("maps a native Ornstein status", () => {
    const item = xStatusToFeedItem(
      {
        type: "status",
        id: "209",
        url: "https://x.com/David_Ornstein/status/209",
        text: "Aston Villa strike agreement with Chelsea to sign Nicolas Jackson. Deal for 25yo striker worth £47.5m + £17.5m add-ons.",
        created_at: "Wed Aug 26 18:40:02 +0000 2026",
        replying_to: null,
      },
      ornstein,
    );
    assert.ok(item);
    assert.equal(item.reporterId, "ornstein");
    assert.equal(item.native, true);
    assert.match(item.title, /Jackson/i);
    assert.match(item.description, /47\.5m/);
  });

  it("drops replies", () => {
    const item = xStatusToFeedItem(
      {
        type: "status",
        id: "1",
        text: "After @someone more context on the bid.",
        replying_to: { screen_name: "David_Ornstein" },
      },
      ornstein,
    );
    assert.equal(item, null);
  });
});

describe("parseFxTimeline", () => {
  it("reads results[]", () => {
    const items = parseFxTimeline(
      {
        code: 200,
        results: [
          {
            type: "status",
            id: "9",
            url: "https://x.com/David_Ornstein/status/9",
            text: "Sunderland submit offer to sign Jack Grealish from Manchester City. Bid is a loan with option.",
            created_at: "Wed Aug 26 14:56:16 +0000 2026",
          },
        ],
      },
      ornstein,
    );
    assert.equal(items.length, 1);
    assert.match(items[0].title, /Grealish/i);
  });
});
