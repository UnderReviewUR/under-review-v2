import { PGA_CHAMPIONSHIP_ODDS_PAGE_URL } from "../shared/pgaChampionshipOddsConstants.js";
import {
  buildGolferNameMapFromStaticAssets,
  parsePgaChampionshipEventOddsRows,
} from "./_pgaChampionshipOddsParse.js";

/**
 * Headless browser fallback when GraphQL is blocked or shape changes.
 * Intercepts the same EventOdds GraphQL response the odds page loads.
 */
export async function scrapePgaChampionshipOddsViaPuppeteer() {
  let chromium;
  let puppeteer;
  try {
    chromium = await import("@sparticuz/chromium");
    puppeteer = await import("puppeteer-core");
  } catch (err) {
    throw new Error(
      `Puppeteer dependencies missing (install puppeteer-core and @sparticuz/chromium): ${err?.message || err}`,
    );
  }

  const browser = await puppeteer.launch({
    args: chromium.default.args,
    defaultViewport: chromium.default.defaultViewport,
    executablePath: await chromium.default.executablePath(),
    headless: chromium.default.headless,
  });

  try {
    const page = await browser.newPage();
    let eventOddsJson = null;
    let staticAssetsJson = null;

    page.on("response", async (response) => {
      try {
        const url = response.url();
        if (!url.includes("/graphql/delivery/pga/v4/scoring")) return;
        if (response.status() !== 200) return;
        const json = await response.json();
        if (url.includes("operationName=EventOdds")) eventOddsJson = json;
        if (url.includes("operationName=StaticLeaderboardAssets")) staticAssetsJson = json;
      } catch {
        /* ignore parse errors on unrelated responses */
      }
    });

    await page.goto(PGA_CHAMPIONSHIP_ODDS_PAGE_URL, {
      waitUntil: "networkidle2",
      timeout: 45000,
    });

    try {
      await page.click('button#onetrust-accept-btn-handler', { timeout: 4000 });
    } catch {
      try {
        await page.evaluate(() => {
          const buttons = [...document.querySelectorAll("button")];
          const accept = buttons.find((b) =>
            /accept/i.test(b.textContent || ""),
          );
          accept?.click();
        });
      } catch {
        /* optional cookie banner */
      }
    }

    await page.waitForFunction(
      () =>
        [...document.querySelectorAll("button")].some((b) =>
          /to win/i.test(b.textContent || ""),
        ),
      { timeout: 20000 },
    );

    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (!eventOddsJson) {
      throw new Error("Puppeteer did not capture EventOdds GraphQL response");
    }

    const golfers = staticAssetsJson?.data?.staticLeaderboardAssets?.golfers || [];
    const nameMap = buildGolferNameMapFromStaticAssets(golfers);
    const rows = eventOddsJson?.data?.eventOdds?.rows || [];
    const parsed = parsePgaChampionshipEventOddsRows(nameMap, rows);
    const providerTimestamp = Number(rows[0]?.timestamp) || Date.now();

    return {
      ...parsed,
      providerTimestamp,
      scrapeMethod: "puppeteer",
    };
  } finally {
    await browser.close();
  }
}
