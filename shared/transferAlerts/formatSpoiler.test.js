import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatTransferSpoilerTitle,
  formatTransferSpoilerBody,
  formatAttribution,
} from "./formatSpoiler.js";

describe("formatAttribution", () => {
  it("uses last name like (Shams)", () => {
    assert.equal(formatAttribution(["ornstein"]), "Ornstein");
    assert.equal(formatAttribution(["romano"]), "Romano");
  });
});

describe("formatTransferSpoilerTitle", () => {
  it("puts the Chelsea/Martinez spoiler in the title", () => {
    const title = formatTransferSpoilerTitle({
      title:
        "David Ornstein reveals Chelsea are considering Emiliano Martinez transfer following contact",
      reporters: ["ornstein"],
    });
    assert.match(title, /Chelsea/i);
    assert.match(title, /Martinez/i);
    assert.doesNotMatch(title, /Ornstein/i);
    assert.doesNotMatch(title, /Breaking/i);
    assert.doesNotMatch(title, /following contact/i);
  });

  it("uses the quoted Newcastle agreement, not desk branding", () => {
    const title = formatTransferSpoilerTitle({
      title:
        "'Newcastle United reach agreement' – David Ornstein drops transfer news - Read Newcastle",
      reporters: ["ornstein"],
    });
    assert.match(title, /Newcastle/i);
    assert.match(title, /Agreement/i);
    assert.doesNotMatch(title, /drops transfer news/i);
    assert.doesNotMatch(title, /Read Newcastle/i);
  });

  it("lifts quoted personal terms onto the club", () => {
    const title = formatTransferSpoilerTitle({
      title:
        '"Closing in on personal terms agreement": Fabrizio Romano confirms imminent Liverpool transfer - The Empire of The Kop',
      reporters: ["romano"],
    });
    assert.match(title, /Liverpool/i);
    assert.match(title, /Personal Terms/i);
    assert.doesNotMatch(title, /Empire/i);
    assert.doesNotMatch(title, /Romano/i);
  });

  it("does not use Barça · reporter as the headline", () => {
    const title = formatTransferSpoilerTitle({
      title: "Barcelona close to striker deal — David Ornstein",
      reporters: ["ornstein"],
    });
    assert.match(title, /Barcelona/i);
    assert.match(title, /Striker/i);
    assert.doesNotMatch(title, /Barça ·/i);
  });
});

describe("formatTransferSpoilerBody", () => {
  it("puts extra fact and reporter under the spoiler, no URL", () => {
    const body = formatTransferSpoilerBody({
      title: "Barcelona close to striker deal — David Ornstein",
      description: "Personal terms agreed, medical planned this week",
      reporters: ["ornstein"],
      source: "The Athletic",
      link: "https://news.google.com/rss/articles/abc",
    });
    assert.match(body, /Personal terms/i);
    assert.match(body, /\(Ornstein\)/);
    assert.doesNotMatch(body, /google\.com/i);
  });

  it("falls back to attribution only", () => {
    const body = formatTransferSpoilerBody({
      title: "Newcastle United reach agreement",
      description: "",
      reporters: ["ornstein"],
    });
    assert.equal(body, "(Ornstein)");
  });

  it("uses the X/Telegram second paragraph as the body spoiler", () => {
    const alert = {
      native: true,
      reporters: ["romano"],
      title:
        "BREAKING: Al Hilal have now agreed all details of deal to sign Ollie Watkins, here we go!",
      description:
        "BREAKING: Al Hilal have now agreed all details of deal to sign Ollie Watkins, here we go!<br><br>Exclusive details: Aston Villa accepted right now last bid worth £58.4m plus £2m add-ons for the English striker.",
    };
    const title = formatTransferSpoilerTitle(alert);
    const body = formatTransferSpoilerBody(alert);
    assert.match(title, /Watkins/i);
    assert.match(title, /Hilal/i);
    assert.doesNotMatch(title, /58\.4/);
    assert.match(body, /58\.4m/i);
    assert.match(body, /\(Romano\)/);
  });

  it("splits an Ornstein tweet into spoiler + fee line", () => {
    const title = formatTransferSpoilerTitle({
      native: true,
      reporters: ["ornstein"],
      title: "Al Hilal finalising agreement with Aston Villa to sign Ollie Watkins.",
      description:
        "Subject to AVFC landing replacement, 30yo England striker to move for £50m + small add-ons.",
    });
    const body = formatTransferSpoilerBody({
      native: true,
      reporters: ["ornstein"],
      title: "Al Hilal finalising agreement with Aston Villa to sign Ollie Watkins.",
      description:
        "Subject to AVFC landing replacement, 30yo England striker to move for £50m + small add-ons.",
    });
    assert.match(title, /Watkins/i);
    assert.doesNotMatch(title, /50m/);
    assert.match(body, /50m/);
    assert.match(body, /\(Ornstein\)/);
  });

  it("cleans lock-screen chrome on Ornstein wires", () => {
    const martinez = {
      native: true,
      reporters: ["ornstein"],
      title: "Emiliano Martinez offered to Chelsea by representatives.",
      description:
        "#AVFC open to Argentina int'l exit after Zion Suzuki made No1 + #CFC keen (Ornstein)",
    };
    const title = formatTransferSpoilerTitle(martinez);
    const body = formatTransferSpoilerBody(martinez);
    assert.match(title, /Martinez/i);
    assert.match(title, /Chelsea/i);
    assert.doesNotMatch(title, /Representatives/i);
    assert.doesNotMatch(title, /\.\.\./);
    assert.match(body, /Villa/i);
    assert.match(body, /Chelsea/i);
    assert.doesNotMatch(body, /#/);
    assert.doesNotMatch(body, /@/);

    const marmoush = {
      native: true,
      reporters: ["ornstein"],
      title: "Omar Marmoush granted permission to take Tottenham Hotspur medical.",
      description:
        "27yo joins #MCFC on loan with #THFC buy obligation for £50m + £10m (£5m guaranteed) - 4+1yr contract & no Frankfurt sell-on",
    };
    const t2 = formatTransferSpoilerTitle(marmoush);
    const b2 = formatTransferSpoilerBody(marmoush);
    assert.match(t2, /Marmoush/i);
    assert.match(t2, /Tottenham/i);
    assert.doesNotMatch(t2, /Granted Permission/i);
    assert.doesNotMatch(t2, /Hotspur/i);
    assert.match(b2, /50m/);
    assert.match(b2, /Man City/i);
    assert.doesNotMatch(b2, /#/);
  });
});
