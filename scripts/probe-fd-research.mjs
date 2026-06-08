import { fetchBookPageHtml } from "../api/_wcBookScrapeCommon.js";

const r = await fetchBookPageHtml(
  "https://www.fanduel.com/research/world-cup-golden-boot-betting-explained",
);
const m = r.html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
if (!m) {
  console.log("no next data");
  process.exit(0);
}
const data = JSON.parse(m[1]);
const blob = JSON.stringify(data);
const re = /([A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]+(?: [A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]+){0,3})\s*\(\+\d{3,5}\)/g;
let hit;
let n = 0;
while ((hit = re.exec(blob)) && n < 20) {
  console.log(hit[0]);
  n++;
}
console.log("golden boot mentions", (blob.match(/golden boot/gi) || []).length);
