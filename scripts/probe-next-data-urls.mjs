const UA = "UnderReview/1.0";

async function probe(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  const html = await r.text();
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return { url, status: r.status, hasNextData: false };
  const data = JSON.parse(m[1]);
  const blob = JSON.stringify(data);
  const apiUrls = [
    ...new Set(
      (blob.match(/https?:\/\/[^"\\]+/g) || []).filter((u) =>
        /api\.actionnetwork|execute-api|graphql|the-odds-api/i.test(u),
      ),
    ),
  ].slice(0, 40);
  return {
    url,
    status: r.status,
    hasNextData: true,
    apiUrls,
    pagePropsKeys: Object.keys(data?.props?.pageProps || {}),
    buildId: data?.buildId,
  };
}

const urls = [
  "https://www.actionnetwork.com/motor-sports",
  "https://www.actionnetwork.com/motor-sports/f1-odds",
  "https://www.actionnetwork.com/tennis",
  "https://www.wtatennis.com/scores",
];

for (const u of urls) {
  console.log(JSON.stringify(await probe(u), null, 2));
}
