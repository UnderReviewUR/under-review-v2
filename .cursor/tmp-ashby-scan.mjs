const boards = ["check", "tremendous", "alt", "afresh", "persona.ai", "dualentry", "replit", "notraffic"];

async function fetchBoard(name) {
  const res = await fetch("https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobBoardWithTeams", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operationName: "ApiJobBoardWithTeams",
      variables: { organizationHostedJobsPageName: name },
      query: `query ApiJobBoardWithTeams($organizationHostedJobsPageName: String!) {
        jobBoard: jobBoardWithTeams(organizationHostedJobsPageName: $organizationHostedJobsPageName) {
          teams { name jobs { id title locationName workplaceType } }
        }
      }`,
    }),
  });
  const data = await res.json();
  const teams = data?.data?.jobBoard?.teams || [];
  const jobs = teams.flatMap((t) => t.jobs || []);
  const ta = jobs.filter((j) => /recruit|sourc|talent/i.test(j.title));
  return { name, ta, total: jobs.length, err: data?.errors?.[0]?.message };
}

const results = await Promise.all(boards.map(fetchBoard));
for (const r of results) {
  console.log(`\n=== ${r.name} (total ${r.total})${r.err ? " ERR:" + r.err : ""} ===`);
  for (const j of r.ta) {
    console.log(`- ${j.title} | ${j.locationName} | ${j.workplaceType} | https://jobs.ashbyhq.com/${r.name}/${j.id}`);
  }
  if (!r.ta.length) console.log("(no TA titles)");
}
