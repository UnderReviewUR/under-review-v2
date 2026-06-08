/**
 * Headless browser fallback for JS-shell sportsbooks and bot-walled aggregators.
 */

import { getEnv } from "./_env.js";
import { WC_BOOK_SCRAPE_TIMEOUT_MS } from "../shared/wcBookScrapePolicy.js";

const PUPPETEER_BOOKS = new Set([
  "draftkings",
  "betmgm",
  "oddschecker",
  "paddypower",
  "bet365",
  "skybet",
]);

/**
 * @param {string} [bookKey]
 */
export function shouldTryWcBookPuppeteer(bookKey, fetchError = null) {
  const flag = getEnv("WC_SCRAPE_PUPPETEER", { treatEmptyAsMissing: false });
  if (flag !== undefined) {
    const v = String(flag).trim().toLowerCase();
    if (v === "0" || v === "false" || v === "no") return false;
    if (v === "1" || v === "true" || v === "yes") {
      /* fall through */
    } else {
      return false;
    }
  } else if (process.env.VERCEL_ENV !== "production") {
    return false;
  }

  const key = String(bookKey || "").toLowerCase();
  if (key && PUPPETEER_BOOKS.has(key)) return true;
  if (fetchError === "http_403") return true;
  return false;
}

/**
 * @param {string} url
 * @param {{ timeoutMs?: number, waitMs?: number }} [opts]
 */
export async function fetchBookPageHtmlViaPuppeteer(url, opts = {}) {
  const timeoutMs = opts.timeoutMs || Math.max(WC_BOOK_SCRAPE_TIMEOUT_MS, 45_000);
  const waitMs = opts.waitMs ?? 2_000;

  let chromium;
  let puppeteer;
  try {
    chromium = await import("@sparticuz/chromium");
    puppeteer = await import("puppeteer-core");
  } catch (err) {
    return {
      ok: false,
      html: "",
      status: 0,
      error: `puppeteer_deps_missing:${err?.message || err}`,
      scrapeMethod: "puppeteer",
    };
  }

  /** @type {import("puppeteer-core").Browser | null} */
  let browser = null;
  try {
    browser = await puppeteer.launch({
      args: chromium.default.args,
      defaultViewport: chromium.default.defaultViewport,
      executablePath: await chromium.default.executablePath(),
      headless: chromium.default.headless,
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );

    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
    });

    try {
      await page.click("button#onetrust-accept-btn-handler", { timeout: 2500 });
    } catch {
      /* optional cookie wall */
    }

    if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));

    const html = await page.content();
    const status = response?.status() || 200;

    return {
      ok: Boolean(html && html.length > 500),
      html: html || "",
      status,
      error: html && html.length > 500 ? null : "puppeteer_empty_html",
      scrapeMethod: "puppeteer",
    };
  } catch (err) {
    return {
      ok: false,
      html: "",
      status: 0,
      error: err?.message || "puppeteer_failed",
      scrapeMethod: "puppeteer",
    };
  } finally {
    if (browser) await browser.close();
  }
}
