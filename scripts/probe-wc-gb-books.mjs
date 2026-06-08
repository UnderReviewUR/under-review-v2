import { scrapeGoldenBootForBook } from "../api/_wcScrapeGoldenBootBooks.js";
import {
  listEnabledWcGoldenBootBooks,
  listWcGoldenBootScrapeUrls,
} from "../shared/wcBookScrapePolicy.js";
import { WC_GOLDEN_BOOT_SOURCE_COUNT } from "../shared/wcGoldenBootSourceRegistry.js";

const enabled = listEnabledWcGoldenBootBooks();
console.log(
  JSON.stringify({
    event: "wc_gb_probe_start",
    sourcesRegistered: WC_GOLDEN_BOOT_SOURCE_COUNT,
    sourcesEnabled: enabled.length,
    enabled,
  }),
);

let okCount = 0;
for (let i = 0; i < enabled.length; i++) {
  const book = enabled[i];
  const urls = listWcGoldenBootScrapeUrls(book);
  const result = await scrapeGoldenBootForBook(book, i);
  if (result.ok) okCount += 1;
  console.log(
    JSON.stringify({
      book,
      urls: urls.map((u) => u.slice(0, 100)),
      ok: result.ok,
      rowCount: result.rows?.length || 0,
      error: result.error,
      sample: (result.rows || []).slice(0, 4).map((r) => r.name),
    }),
  );
}

console.log(
  JSON.stringify({
    event: "wc_gb_probe_done",
    sourcesTried: enabled.length,
    sourcesOk: okCount,
  }),
);
