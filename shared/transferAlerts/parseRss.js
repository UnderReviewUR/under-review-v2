/**
 * Minimal RSS/Atom item extraction — no XML dependency.
 */

/**
 * @typedef {{
 *   guid: string,
 *   title: string,
 *   link: string,
 *   pubDate: string | null,
 *   source: string | null,
 *   description: string,
 *   feedId: string,
 *   feedLabel: string,
 *   feedWeight: number,
 *   barcaHeavyFeed: boolean,
 *   reporterId?: string | null,
 *   native?: boolean,
 * }} RawFeedItem
 */

/**
 * @param {string} xml
 * @param {string} tag
 * @returns {string[]}
 */
function allTagBlocks(xml, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${tag}>`, "gi");
  return xml.match(re) || [];
}

/**
 * @param {string} block
 * @param {string} tag
 * @returns {string}
 */
function innerTag(block, tag) {
  const cdata = block.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, "i"),
  );
  if (cdata) return String(cdata[1] || "").trim();
  const plain = block.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"),
  );
  if (!plain) return "";
  return decodeXmlEntities(stripTags(String(plain[1] || "").trim()));
}

/**
 * @param {string} s
 * @returns {string}
 */
function stripTags(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string} s
 * @returns {string}
 */
export function decodeXmlEntities(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/gi, " ")
    .replace(/&pound;/gi, "£")
    .replace(/&euro;/gi, "€")
    .replace(/&ndash;/gi, "-")
    .replace(/&mdash;/gi, "-")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"')
    .replace(/&ldquo;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      if (!Number.isFinite(code) || code < 1 || code > 0x10ffff) return "";
      try {
        return String.fromCodePoint(code);
      } catch {
        return "";
      }
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      const code = parseInt(h, 16);
      if (!Number.isFinite(code) || code < 1 || code > 0x10ffff) return "";
      try {
        return String.fromCodePoint(code);
      } catch {
        return "";
      }
    });
}

/**
 * @param {string} xml
 * @param {{ id: string, label: string, weight?: number, barcaHeavy?: boolean, reporterId?: string, native?: boolean }} feed
 * @returns {RawFeedItem[]}
 */
export function parseRssItems(xml, feed) {
  const text = String(xml || "");
  const blocks = [
    ...allTagBlocks(text, "item"),
    ...allTagBlocks(text, "entry"),
  ];
  const weight = Number(feed.weight) > 0 ? Number(feed.weight) : 1;
  const out = [];

  for (const block of blocks) {
    const title = innerTag(block, "title");
    if (!title) continue;

    let link = innerTag(block, "link");
    if (!link) {
      const href = block.match(/<link[^>]+href=["']([^"']+)["']/i);
      if (href) link = href[1];
    }
    // Google News often puts the URL as bare text in <link>
    if (!link) {
      const bare = block.match(/<link>([^<]+)<\/link>/i);
      if (bare) link = bare[1].trim();
    }

    const guid =
      innerTag(block, "guid") ||
      innerTag(block, "id") ||
      link ||
      title;
    const pubDate =
      innerTag(block, "pubDate") ||
      innerTag(block, "published") ||
      innerTag(block, "updated") ||
      null;
    const source =
      innerTag(block, "source") ||
      innerTag(block, "dc:creator") ||
      innerTag(block, "author") ||
      null;
    const description =
      innerTag(block, "description") ||
      innerTag(block, "summary") ||
      innerTag(block, "content") ||
      "";

    out.push({
      guid: String(guid).slice(0, 500),
      title,
      link: String(link || "").trim(),
      pubDate,
      source,
      description: description.slice(0, 1200),
      feedId: feed.id,
      feedLabel: feed.label,
      feedWeight: weight,
      barcaHeavyFeed: Boolean(feed.barcaHeavy),
      reporterId: feed.reporterId || null,
      native: Boolean(feed.native),
    });
  }

  return out;
}
