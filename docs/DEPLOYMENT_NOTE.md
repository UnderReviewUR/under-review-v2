# Deployment note — World Cup UR Take fixes (PR #26)

**The one thing to check (important):**

These fixes are on the branch/PR (**#26**), not on production. The logs are from
`www.under-review.app`, which serves whatever is currently deployed — if that's
`main`, it does **not** yet have any of this branch's fixes (the live-state fix,
the earlier live-score/odds fixes, key players, pre-match/lineup fixes, image
grounding). That would fully explain why production still shows the old behavior.

Merging PRs / deploying is restricted for the agent, so for these to take effect
on `www.under-review.app` the branch needs to be **merged and deployed**. If it's
already deployed from this branch and the failure still shows after the latest
commit ships, flag it for a deeper dig — but based on the code paths, the
`LIVE STATE` guard makes the "need the score" reply structurally impossible
whenever the feed has the live match (which the logs show it does:
`wc_live_scores_refreshed source:balldontlie liveCount:1`).
