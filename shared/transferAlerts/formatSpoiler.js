/**
 * Compress Google News SEO titles into B/R-style lock-screen copy:
 * bold line = the spoiler, body = extra fact + (reporter).
 */

import { TRUSTED_REPORTERS } from "./reporters.js";

const TITLE_MAX = 46;
const BODY_MAX = 160;

const LEADING_EMOJI =
  /^(?:[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0F\u200D\u20E3]|[↩️🖼⭐✅❌⚡🔥🎯📢📣⚽🏟🚨])+[\s]*/u;

const OUTLET_TAIL =
  /\s*[-–—|]\s*(?:the athletic|sky sports(?: news)?|bbc(?: sport)?|livescore|live score|google news|the guardian|guardian|espn|reuters|afp|telegraph|the times|independent|marca|mundo deportivo|cbs sports|tea?m talk|the sun|mirror|empire of the kop|read (?:newcastle|liverpool|chelsea|arsenal|united)|readliverpoolfc\.com|football insider|caught offside|sportbible|give me sport)(?:\.\w+)?\s*$/i;

const URL_BIT = /\s*https?:\/\/\S+/gi;

const REPORTER_VERBS =
  /\b(?:reveals?|confirms?|drops?|says?|reports?|claims?|hints?|insists?|explains?|adds?)\b/i;

/** Extra clauses that belong under the spoiler, not in the bold line. */
const BODY_CLAUSES =
  /(?:,?\s+(?:following (?:contact|talks|enquiries|inquiries)|sources (?:say|told)|it is understood|exclusive)(?:\b.*)?)$/i;

const SMALL = new Set([
  "a",
  "an",
  "the",
  "to",
  "for",
  "of",
  "on",
  "in",
  "with",
  "and",
  "or",
  "at",
  "from",
  "vs",
]);

/**
 * @param {string} s
 * @returns {string}
 */
function collapse(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Keep lock-screen copy in characters iOS can render. No replacement diamonds,
 * private-use glyphs, or smart-punctuation leftovers from RSS/X.
 * @param {string} s
 * @returns {string}
 */
export function sanitizeLockScreenText(s) {
  let t = String(s || "").normalize("NFC");
  t = t
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, " ")
    .replace(/[\u200C\u200D\u2060\u2066-\u2069\uFE00-\uFE0F]/g, "")
    .replace(/\uFFFD/g, "")
    .replace(/[\uE000-\uF8FF]/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .replace(/[\u2600-\u27BF]/g, "")
    .replace(/[\uD800-\uDFFF]/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  return collapse(t);
}

/**
 * @param {import("./reporters.js").Reporter | undefined} reporter
 * @returns {string[]}
 */
function reporterPhrases(reporter) {
  if (!reporter) return [];
  const names = reporter.names.flatMap((n) => [n, n.replace(/à/g, "a")]);
  names.sort((a, b) => b.length - a.length);
  return names;
}

/**
 * Last-name style attribution, B/R "(Shams)".
 * @param {string[] | undefined} reporterIds
 * @param {string | null | undefined} source
 * @returns {string}
 */
export function formatAttribution(reporterIds, source) {
  const id = reporterIds?.[0];
  const reporter = TRUSTED_REPORTERS.find((r) => r.id === id);
  if (reporter) {
    const full = reporter.names[0];
    const parts = full.split(/\s+/);
    const last = parts[parts.length - 1];
    return last;
  }
  if (source && String(source).trim()) {
    const s = String(source).replace(/\s*[-–—].*$/, "").trim();
    return s.slice(0, 24);
  }
  return "Wire";
}

const CLUB_TAGS = {
  AVFC: "Villa",
  CFC: "Chelsea",
  MCFC: "Man City",
  THFC: "Tottenham",
  LFC: "Liverpool",
  NUFC: "Newcastle",
  AFC: "Arsenal",
  PSG: "PSG",
  MUFC: "Man Utd",
  SAFC: "Sunderland",
  BHAFC: "Brighton",
  CPFC: "Palace",
  WHUFC: "West Ham",
  FCB: "Barça",
};

/**
 * Expand #AVFC / drop @handles so the lock screen reads like a wire, not a tweet.
 * @param {string} s
 * @returns {string}
 */
export function cleanWireText(s) {
  return collapse(
    String(s || "")
      .replace(LEADING_EMOJI, "")
      .replace(/#([A-Za-z0-9_]+)/g, (_, tag) => CLUB_TAGS[String(tag).toUpperCase()] || "")
      .replace(
        /\b(AVFC|CFC|MCFC|THFC|LFC|NUFC|MUFC|SAFC|BHAFC|CPFC|WHUFC)\b/g,
        (_, tag) => CLUB_TAGS[tag] || "",
      )
      .replace(/@\w+/g, "")
      .replace(/\bW\/\b/gi, "")
      .replace(/\s*https?:\/\/\S+/gi, "")
      .replace(/^(exclusive story,?\s*)+/i, "")
      .replace(/^(confirmed:?\s*)+/i, "")
      .replace(/^(BREAKING|EXCL|Exclusive|Official and confirmed|Official):\s*/i, ""),
  );
}

/**
 * Short lock-screen spoiler — iOS stacked banners cut around ~40–45 chars.
 * @param {string} s
 * @returns {string}
 */
export function shortenHeadline(s) {
  let t = cleanWireText(s);
  t = t
    .replace(/\bgranted permission to take\s+/gi, "to ")
    .replace(/\bby representatives\b/gi, "")
    .replace(/\bholding key talks with\b/gi, "in talks with")
    .replace(/\breach(?:es|ed)? agreement with\b/gi, "agree deal with")
    .replace(/\bstrike agreement with\b/gi, "agree deal with")
    .replace(/\bfinalising agreement with\b/gi, "closing deal with")
    .replace(/\b(?:closing deal|agree deal) with .+? to sign\b/gi, "to sign")
    .replace(/\bhave now agreed all details of deal to sign\b/gi, "to sign")
    .replace(/\bagreed all details of deal to sign\b/gi, "to sign")
    .replace(/,?\s*here we go!?/gi, "")
    .replace(/\btottenham hotspur\b/gi, "Tottenham")
    .replace(/\bmanchester city\b/gi, "Man City")
    .replace(/\bmanchester united\b/gi, "Man Utd")
    .replace(/\bparis saint-?germain\b/gi, "PSG")
    .replace(/\baston villa\b/gi, "Villa")
    .replace(/\bnewcastle united\b/gi, "Newcastle")
    .replace(/\breal madrid\b/gi, "Real Madrid")
    .replace(/\s+medical\.?$/i, "");
  t = collapse(t);
  return t;
}

export function stripNativeChrome(s) {
  return shortenHeadline(
    collapse(
      String(s || "")
        .replace(/\s+[—–-]\s*Fabrizio Romano.*$/i, "")
        .replace(/\s+@FabrizioRomano\b.*$/i, ""),
    ),
  );
}

/**
 * First line = spoiler; remaining paragraphs = lock-screen body (the X post details).
 * @param {{ title?: string, description?: string }} alert
 * @returns {{ title: string, extra: string } | null}
 */
export function compressNativePost(alert) {
  const headline = stripNativeChrome(alert.title || "");
  if (headline.length < 12) return null;

  const desc = String(alert.description || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ");
  const paras = desc
    .split(/\n+/)
    .map((p) => stripNativeChrome(p))
    .filter((p) => p.length >= 12)
    .filter((p) => !/^@\w+$/.test(p))
    .filter((p) => !/X \(formerly Twitter\)/i.test(p));

  const extra =
    paras.find((p) => {
      const a = p.toLowerCase();
      const b = headline.toLowerCase().slice(0, 28);
      return b.length > 8 && !a.startsWith(b) && !headline.toLowerCase().includes(a.slice(0, 28));
    }) || "";

  if (!extra) {
    const blob = stripNativeChrome(`${headline} ${desc}`);
    const bits = blob.split(/(?<=[.!?])\s+/).filter((p) => p.length >= 12);
    if (bits.length >= 2) {
      return finishNative(bits[0], bits.slice(1).join(" "));
    }
  }

  return finishNative(headline, extra);
}

/**
 * @param {string} title
 * @param {string} extra
 */
function tidyFeeBits(s) {
  return collapse(
    String(s || "")
      .replace(/^for\s+/i, "")
      .replace(/\s+[–—-]\s+/g, ", ")
      .replace(/\s*&\s*/g, ", ")
      .replace(/\b(\d+)\+(\d+)yr(?:\s+contract)?\b/gi, "$1+$2 years")
      .replace(/,\s*,/g, ","),
  );
}

/**
 * Turn Ornstein telegram-speak into a lock-screen fact line.
 * "joins City on loan with Spurs buy obligation" means City→Spurs, not the reverse.
 * @param {string} extra
 * @returns {string}
 */
export function polishDealBody(extra) {
  let e = collapse(cleanWireText(extra)).replace(/^\d+yo\s+/i, "");
  const loanBuy = e.match(
    /^joins\s+(.+?)\s+on loan with\s+(.+?)\s+buy obligation(?:\s+for)?\s*(.*)$/i,
  );
  if (loanBuy) {
    const fromClub = collapse(loanBuy[1]);
    const toClub = collapse(loanBuy[2]);
    const rest = tidyFeeBits(loanBuy[3]);
    e = `${toClub} loan from ${fromClub}${rest ? `; obligation to buy ${rest}` : ""}`;
    return e;
  }
  const loanFrom = e.match(/^joins\s+(.+?)\s+on loan from\s+(.+?)([,.]|$)/i);
  if (loanFrom) {
    const rest = tidyFeeBits(e.slice(loanFrom[0].length));
    e = `${collapse(loanFrom[1])} loan from ${collapse(loanFrom[2])}${rest ? `; ${rest}` : ""}`;
    return e;
  }
  return tidyFeeBits(e)
    .replace(/\bopen to Argentina int'?l exit\b/gi, "open to selling")
    .replace(/\bafter ([A-Za-z]+(?:\s+[A-Za-z]+)?) made No\.?1\b/gi, "after $1 became No.1")
    .replace(/\+\s+(Chelsea|Arsenal|Liverpool|Tottenham|Newcastle|Villa) keen\b/gi, "; $1 keen");
}

function finishNative(title, extra) {
  let t = collapse(title).replace(/[.]+$/g, "");
  let e = polishDealBody(extra);
  if (/are now\.?$/i.test(t) && e.length >= 20) {
    t = e.split(/[.!?]/)[0] || t;
    e = "";
  }
  return {
    title: sanitizeLockScreenText(
      toHeadlineCase(clipWords(t, TITLE_MAX)).replace(/\s+\./g, ".").replace(/\.+$/g, ""),
    ),
    extra: sanitizeLockScreenText(clipWords(e, BODY_MAX)),
  };
}

/**
 * @param {string} title
 * @returns {string}
 */
export function stripOutletAndUrl(title) {
  let t = collapse(title).replace(URL_BIT, "");
  for (let i = 0; i < 3; i += 1) {
    const next = t.replace(OUTLET_TAIL, "");
    if (next === t) break;
    t = collapse(next);
  }
  return t;
}

/**
 * @param {string} title
 * @param {string[] | undefined} reporterIds
 * @returns {string}
 */
export function stripReporterFraming(title, reporterIds) {
  let t = collapse(title);
  const reporters = (reporterIds || [])
    .map((id) => TRUSTED_REPORTERS.find((r) => r.id === id))
    .filter(Boolean);

  const phrases = reporters.flatMap((r) => reporterPhrases(r));
  if (!phrases.length) {
    phrases.push(
      "David Ornstein",
      "Fabrizio Romano",
      "Gianluca Di Marzio",
      "Ornstein",
      "Romano",
      "Di Marzio",
    );
  }

  for (const name of phrases) {
    const n = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    t = t.replace(
      new RegExp(
        `^${n}\\s+${REPORTER_VERBS.source}\\s+(?:that\\s+)?`,
        "i",
      ),
      "",
    );
    t = t.replace(
      new RegExp(`\\s*[-–—,:]\\s*${n}\\s*$`, "i"),
      "",
    );
    t = t.replace(
      new RegExp(`\\s*[-–—]\\s*${n}\\s+${REPORTER_VERBS.source}\\b.*$`, "i"),
      "",
    );
    t = t.replace(
      new RegExp(
        `[“”"'‘’]:?\\s*${n}\\s+${REPORTER_VERBS.source}\\b.*$`,
        "i",
      ),
      "",
    );
    t = t.replace(
      new RegExp(`\\s+${n}\\s+${REPORTER_VERBS.source}\\b.*$`, "i"),
      "",
    );
  }

  t = collapse(t)
    .replace(/^[:\s\-–—]+/, "")
    .replace(/\s*[-–—]\s*$/, "");
  return collapse(t);
}

/**
 * Prefer the quoted fact when aggregators wrap it in reporter SEO.
 * @param {string} title
 * @returns {{ quote: string | null, rest: string }}
 */
export function extractQuotedFact(title) {
  const m = String(title || "").match(
    /^[“”"'‘’]([^“”"'‘’]{8,140})[“”"'‘’]\s*[:–—-]?\s*(.*)$/s,
  );
  if (!m) return { quote: null, rest: collapse(title) };
  return { quote: collapse(m[1]), rest: collapse(m[2]) };
}

/**
 * @param {string} s
 * @returns {string}
 */
function peelBodyClause(s) {
  const m = s.match(BODY_CLAUSES);
  if (!m) return s;
  return collapse(s.slice(0, m.index));
}

/**
 * @param {string} s
 * @returns {string}
 */
function dropEmptyTransferNoun(s) {
  // "Chelsea considering Emiliano Martinez transfer" → drop trailing transfer
  return collapse(
    s.replace(/\b(?:a |the )?transfer\b/gi, (hit, offset, str) => {
      const after = str.slice(offset + hit.length);
      if (/^\s*$/.test(after) || /^[-–—,.]/.test(after.trimStart())) return "";
      return hit;
    }),
  );
}

/**
 * @param {string} s
 * @returns {string}
 */
function tightenGrammar(s) {
  return collapse(
    s
      .replace(/\b(are|is)\s+(considering|closing|nearing|set)\b/gi, "$2")
      .replace(/\b(have|has)\s+(reached|agreed|signed)\b/gi, "$2")
      .replace(/\bconfirms?\s+(?:imminent\s+)?/gi, "")
      .replace(/\bmassive\b/gi, "")
      .replace(/\bdrops transfer news\b/gi, "")
      .replace(/\btransfer news\b/gi, "")
      .replace(/\btransfer blow\b/gi, "transfer blow")
      .replace(/^[:\s\-–—"]+/, "")
      .replace(/[“”]/g, '"')
      .replace(/^["']+|["']+$/g, ""),
  );
}

/**
 * Short lock-screen title case — B/R "Kuminga Signing with Wolves".
 * @param {string} s
 * @returns {string}
 */
export function toHeadlineCase(s) {
  const words = collapse(s).split(" ");
  return words
    .map((w, i) => {
      if (/^[A-Z0-9]{2,6}$/.test(w)) return w;
      const letters = w.replace(/[^A-Za-z]/g, "");
      const lower = letters.toLowerCase();
      if (i > 0 && SMALL.has(lower)) {
        return w.replace(letters, lower);
      }
      if (!letters) return w;
      const titled = letters.charAt(0).toUpperCase() + letters.slice(1).toLowerCase();
      return w.replace(letters, titled);
    })
    .join(" ");
}

/**
 * @param {string} s
 * @param {number} max
 * @returns {string}
 */
function clipWords(s, max) {
  const t = collapse(s);
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > 24 ? cut.slice(0, sp) : cut).trim()}`;
}

/**
 * @param {{ title?: string, description?: string, reporters?: string[] }} alert
 * @returns {{ title: string, extra: string }}
 */
export function compressTransferCopy(alert) {
  if (alert.native) {
    const native = compressNativePost(alert);
    if (native?.title) return native;
  }

  const raw = stripOutletAndUrl(alert.title || "");
  const { quote, rest } = extractQuotedFact(raw);
  const framedRest = stripReporterFraming(rest, alert.reporters);

  let core = quote || framedRest;
  if (quote && framedRest) {
    const clubHint = framedRest.match(
      /\b(liverpool|chelsea|arsenal|barcelona|barça|newcastle|manchester united|manchester city|tottenham|real madrid|bayern|psg|juventus)\b/i,
    );
    if (clubHint && !new RegExp(clubHint[1], "i").test(quote)) {
      core = `${clubHint[1]} ${quote}`;
    }
  }

  core = stripReporterFraming(core, alert.reporters);
  core = peelBodyClause(core);
  core = tightenGrammar(core);
  core = dropEmptyTransferNoun(core);
  core = shortenHeadline(core);
  core = collapse(core.replace(/^["']+|["']+$/g, ""));

  if (core.length < 12 && alert.description) {
    const desc = stripOutletAndUrl(
      stripReporterFraming(
        String(alert.description).replace(/<[^>]+>/g, " ").split(/[.!?]/)[0],
        alert.reporters,
      ),
    );
    if (desc.length >= 12) core = tightenGrammar(peelBodyClause(desc));
  }

  const title = toHeadlineCase(clipWords(core, TITLE_MAX));

  const extraBits = [];
  const desc = collapse(
    String(alert.description || "")
      .replace(/<[^>]+>/g, " ")
      .replace(URL_BIT, ""),
  );
  const descFirst = desc.split(/[.!?]/)[0] || "";
  const descUseful =
    descFirst.length >= 20 &&
    descFirst.length <= 180 &&
    !/google news|subscribe|continue reading/i.test(descFirst) &&
    title &&
    !descFirst.toLowerCase().includes(title.toLowerCase().slice(0, 24));
  if (descUseful) extraBits.push(clipWords(descFirst, 140));

  const clause = String(alert.title || "").match(BODY_CLAUSES);
  if (clause && !extraBits.length) {
    extraBits.push(collapse(clause[0]).replace(/^,\s*/, ""));
  }

  return { title, extra: extraBits[0] || "" };
}

/**
 * Bold lock-screen line — the spoiler, not the desk.
 * @param {{ title?: string, description?: string, reporters?: string[] }} alert
 * @returns {string}
 */
export function formatTransferSpoilerTitle(alert) {
  const { title } = compressTransferCopy(alert);
  return sanitizeLockScreenText(title) || "Transfer update";
}

/**
 * Secondary line: extra fact + (Ornstein). No URL (tap already opens).
 * @param {{ title?: string, description?: string, reporters?: string[], source?: string | null }} alert
 * @returns {string}
 */
export function formatTransferSpoilerBody(alert) {
  const { extra } = compressTransferCopy(alert);
  const who = formatAttribution(alert.reporters, alert.source);
  if (extra) {
    const fact = polishDealBody(extra).replace(
      /\s*\((?:ornstein|romano|di marzio|david ornstein|fabrizio romano)\)\s*$/i,
      "",
    );
    const line = fact.charAt(0).toUpperCase() + fact.slice(1);
    return sanitizeLockScreenText(`${line} (${who})`);
  }
  return sanitizeLockScreenText(`(${who})`);
}
