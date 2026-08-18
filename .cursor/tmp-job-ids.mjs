const html = await (await fetch("https://jobs.ashbyhq.com/check-technologies")).text();
const ids = [...new Set([...html.matchAll(/\/check-technologies\/([a-f0-9-]{36})/g)].map((m) => m[1]))];
console.log("ids", ids.length);
for (const id of ids) {
  const j = await (await fetch(`https://jobs.ashbyhq.com/check-technologies/${id}`)).text();
  const title = (j.match(/<h1[^>]*>([^<]+)</) || [])[1] || "(no h1)";
  if (/recruit|sourc|talent/i.test(title) || /recruit|sourc|talent/i.test(j.slice(0, 2000))) {
    console.log(title.trim(), `https://jobs.ashbyhq.com/check-technologies/${id}`);
  }
}

const afresh = await (await fetch("https://job-boards.greenhouse.io/afresh")).text();
const ta = [...afresh.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([^<]*(?:Recruiter|Sourcer|Talent Acquisition)[^<]*)<\/a>/gi)];
console.log("\nAfresh TA:");
for (const m of ta) console.log(m[2].trim(), m[1]);
