import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatTransferSpoilerTitle,
  formatTransferSpoilerBody,
  formatTransferLockScreenLine,
  formatAttribution,
  sanitizeLockScreenText,
} from "./formatSpoiler.js";

describe("formatAttribution", () => {
  it("uses last name like (Shams)", () => {
    assert.equal(formatAttribution(["ornstein"]), "Ornstein");
    assert.equal(formatAttribution(["romano"]), "Romano");
  });
});

describe("sanitizeLockScreenText", () => {
  it("strips replacement diamonds and flattens smart punctuation", () => {
    const out = sanitizeLockScreenText(
      "\uFFFDEmiliano \u201Coffered\u201D to Chelsea\u2014Villa",
    );
    assert.equal(out.includes("\uFFFD"), false);
    assert.equal(out, 'Emiliano "offered" to Chelsea-Villa');
  });
});

describe("formatTransferLockScreenLine", () => {
  it("keeps a complete Alvarez sentence instead of clipping the first name", () => {
    const line = formatTransferLockScreenLine({
      title: "Atletico say there is zero chance of Julian Alvarez leaving - BBC",
      reporters: [],
      source: "BBC",
    });
    assert.match(line, /Julian Alvarez/i);
    assert.doesNotMatch(line, /Chance of Julian$/);
    assert.match(line, /\(BBC\)/);
  });

  it("uses the Romano fact, not a Man United SEO wrapper", () => {
    const line = formatTransferLockScreenLine({
      native: true,
      reporters: ["romano"],
      title: "Man United : Fabrizio Romano Delivers Massive Update",
      description:
        "Barcelona ready to listen on Balde with United interested<br><br>More to follow.",
    });
    assert.match(line, /Balde/i);
    assert.match(line, /Barcelona/i);
    assert.doesNotMatch(line, /Delivers/i);
    assert.doesNotMatch(line, /Man United :/i);
    assert.match(line, /\(Romano\)/);
  });

  it("puts Chelsea/Martinez in one sentence with the extra fact", () => {
    const line = formatTransferLockScreenLine({
      title:
        "David Ornstein reveals Chelsea are considering Emiliano Martinez transfer following contact",
      reporters: ["ornstein"],
    });
    assert.match(line, /Chelsea/i);
    assert.match(line, /Martinez/i);
    assert.match(line, /\(Ornstein\)/);
    assert.doesNotMatch(line, /Breaking/i);
  });

  it("uses the quoted Newcastle agreement, not desk branding", () => {
    const line = formatTransferLockScreenLine({
      title:
        "'Newcastle United reach agreement' – David Ornstein drops transfer news - Read Newcastle",
      reporters: ["ornstein"],
    });
    assert.match(line, /Newcastle/i);
    assert.match(line, /agreement/i);
    assert.doesNotMatch(line, /drops transfer news/i);
    assert.doesNotMatch(line, /Read Newcastle/i);
  });

  it("lifts quoted personal terms onto the club", () => {
    const line = formatTransferLockScreenLine({
      title:
        '"Closing in on personal terms agreement": Fabrizio Romano confirms imminent Liverpool transfer - The Empire of The Kop',
      reporters: ["romano"],
    });
    assert.match(line, /Liverpool/i);
    assert.match(line, /personal terms/i);
    assert.doesNotMatch(line, /Empire/i);
  });

  it("does not use Barça · reporter as the headline", () => {
    const line = formatTransferLockScreenLine({
      title: "Barcelona close to striker deal — David Ornstein",
      reporters: ["ornstein"],
    });
    assert.match(line, /Barcelona/i);
    assert.match(line, /striker/i);
    assert.doesNotMatch(line, /Barça ·/i);
  });

  it("puts extra fact into the same sentence, no URL", () => {
    const line = formatTransferLockScreenLine({
      title: "Barcelona close to striker deal — David Ornstein",
      description: "Personal terms agreed, medical planned this week",
      reporters: ["ornstein"],
      source: "The Athletic",
      link: "https://news.google.com/rss/articles/abc",
    });
    assert.match(line, /Barcelona/i);
    assert.match(line, /Personal terms/i);
    assert.match(line, /\(Ornstein\)/);
    assert.doesNotMatch(line, /google\.com/i);
  });

  it("still attributes when there is no extra clause", () => {
    const line = formatTransferLockScreenLine({
      title: "Newcastle United reach agreement",
      description: "",
      reporters: ["ornstein"],
    });
    assert.match(line, /Newcastle reach agreement/i);
    assert.match(line, /\(Ornstein\)/);
  });

  it("keeps Watkins and the fee in one sentence", () => {
    const alert = {
      native: true,
      reporters: ["romano"],
      title:
        "BREAKING: Al Hilal have now agreed all details of deal to sign Ollie Watkins, here we go!",
      description:
        "BREAKING: Al Hilal have now agreed all details of deal to sign Ollie Watkins, here we go!<br><br>Exclusive details: Aston Villa accepted right now last bid worth £58.4m plus £2m add-ons for the English striker.",
    };
    const line = formatTransferLockScreenLine(alert);
    assert.match(line, /Watkins/i);
    assert.match(line, /Hilal/i);
    assert.match(line, /58\.4m/i);
    assert.match(line, /\(Romano\)/);
  });

  it("keeps Marmoush destination and loan details together", () => {
    const marmoush = {
      native: true,
      reporters: ["ornstein"],
      title: "Omar Marmoush granted permission to take Tottenham Hotspur medical.",
      description:
        "27yo joins #MCFC on loan with #THFC buy obligation for £50m + £10m (£5m guaranteed) - 4+1yr contract & no Frankfurt sell-on",
    };
    const line = formatTransferLockScreenLine(marmoush);
    assert.match(line, /Marmoush/i);
    assert.match(line, /Tottenham/i);
    assert.doesNotMatch(line, /Granted Permission/i);
    assert.doesNotMatch(line, /Hotspur/i);
    assert.match(line, /loan from Man City/i);
    assert.match(line, /obligation to buy/i);
    assert.match(line, /50m/);
    assert.match(line, /4\+1 years/i);
    assert.match(line, /sell-on/i);
    assert.doesNotMatch(line, /sell, on/i);
    assert.doesNotMatch(line, /joins Man City on loan with Tottenham/i);
    assert.doesNotMatch(line, /#/);
    assert.doesNotMatch(line, /27yo/i);
  });

  it("cleans lock-screen chrome on Ornstein Martinez wire", () => {
    const martinez = {
      native: true,
      reporters: ["ornstein"],
      title: "Emiliano Martinez offered to Chelsea by representatives.",
      description:
        "#AVFC open to Argentina int'l exit after Zion Suzuki made No1 + #CFC keen (Ornstein)",
    };
    const line = formatTransferLockScreenLine(martinez);
    assert.match(line, /Martinez/i);
    assert.match(line, /Chelsea/i);
    assert.doesNotMatch(line, /Representatives/i);
    assert.match(line, /open to selling/i);
    assert.match(line, /No\.1/);
    assert.match(line, /Chelsea keen/i);
    assert.doesNotMatch(line, /int'?l exit/i);
    assert.doesNotMatch(line, /#/);
    assert.doesNotMatch(line, /@/);
  });
});

describe("formatTransferSpoilerTitle / Body", () => {
  it("are the same complete sentence (iOS body carries the news)", () => {
    const alert = {
      title: "Barcelona close to striker deal — David Ornstein",
      reporters: ["ornstein"],
    };
    assert.equal(formatTransferSpoilerTitle(alert), formatTransferSpoilerBody(alert));
    assert.equal(formatTransferSpoilerTitle(alert), formatTransferLockScreenLine(alert));
  });
});
