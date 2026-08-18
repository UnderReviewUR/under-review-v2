import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  Pill,
  Row,
  Stack,
  Stat,
  Table,
  Text,
  useHostTheme,
} from "cursor/canvas";

const JOBS = [
  {
    job: "Know",
    who: "Google",
    example: "What time is DET @ CIN? Is Burrow hurt?",
    ur: "Lose on purpose",
  },
  {
    job: "Understand",
    who: "Claude / ChatGPT",
    example: "Why do backups inflate totals? Tell me the Burrow story.",
    ur: "Lose on purpose",
  },
  {
    job: "Decide",
    who: "UnderReview",
    example: "CIN −6.5 if he only plays a series — still a bet?",
    ur: "This is the product",
  },
  {
    job: "Account",
    who: "Nobody owns it",
    example: "You said the kill was one series. It happened. Now what?",
    ur: "The moat if you build it",
  },
];

const COMPETE = [
  {
    moment: "Who won last year?",
    google: "Win",
    gpt: "Win",
    ur: "Don't fight",
  },
  {
    moment: "Explain the matchup in 4 paragraphs",
    google: "Links",
    gpt: "Win",
    ur: "Too long — they already left",
  },
  {
    moment: "Paste this ticket. Veto or one change.",
    google: "Can't",
    gpt: "Will invent a book",
    ur: "Win if the board is the law",
  },
  {
    moment: "Tonight's six — one play",
    google: "Recap article",
    gpt: "Confident, unpriced",
    ur: "Win if PASS is allowed",
  },
  {
    moment: "4:12 left. Still on the under?",
    google: "Score",
    gpt: "Guesses the clock",
    ur: "Win if live state is injected",
  },
  {
    moment: "Did last night's kill fire?",
    google: "Box score",
    gpt: "Amnesia",
    ur: "Win if takes are saved + graded",
  },
];

const HABITS = [
  {
    when: "Morning",
    want: "What changed overnight on my slate — not a new essay",
    status: "Partial — board exists, no 'delta since yesterday'",
  },
  {
    when: "90s before Place Bet",
    want: "Paste slip → veto / one cleaner leg",
    status: "Built (image + slip) — make this the front door",
  },
  {
    when: "Kickoff week",
    want: "Tap a game, get one lean, shop the number",
    status: "NFL Ask gated until Sep — habit can't form in August",
  },
  {
    when: "Live",
    want: "Still on it? Clock + score + original kill",
    status: "Live mode exists; must feel like a second Ask, not a new chat",
  },
  {
    when: "After",
    want: "You said WHAT KILLS IT was X. It hit. Grade the take.",
    status: "Save-take exists. Grading loop does not.",
  },
  {
    when: "With a friend",
    want: "Send the lean, not a screenshot of a novel",
    status: "Share strip exists — lean must travel alone",
  },
];

export default function UrVsGoogleClaude() {
  const theme = useHostTheme();
  const t = theme.tokens;

  return (
    <Stack gap={24} style={{ padding: 24, maxWidth: 960 }}>
      <Stack gap={8}>
        <H1>UR doesn't beat Google at answers</H1>
        <Text tone="secondary">
          Google, ChatGPT, and Claude are real competitors for sports questions.
          They should win Know and Understand. UnderReview only becomes the go-to
          if it owns Decide — and then Account.
        </Text>
      </Stack>

      <Grid columns={4} gap={12}>
        <Stat value="Know" label="Google" tone="neutral" />
        <Stat value="Understand" label="Claude / ChatGPT" tone="neutral" />
        <Stat value="Decide" label="UnderReview" tone="success" />
        <Stat value="Account" label="Open moat" tone="warning" />
      </Grid>

      <Callout tone="warning" title="Don't compete for the search bar">
        If the job is "who is Joe Burrow" or "explain preseason totals," they
        will keep going to Google and Claude. That's correct. UR wins the 90
        seconds before they tap Place Bet — one number, this board, a kill
        condition, or an honest PASS.
      </Callout>

      <H2>Four jobs</H2>
      <Table
        headers={["Job", "Who should win", "What the person actually types", "UR posture"]}
        rows={JOBS.map((r) => [r.job, r.who, r.example, r.ur])}
        rowTone={JOBS.map((r) =>
          r.ur === "This is the product"
            ? "success"
            : r.ur === "The moat if you build it"
              ? "warning"
              : "neutral",
        )}
      />

      <H2>Moments, not features</H2>
      <Table
        headers={["Moment", "Google", "ChatGPT / Claude", "UR"]}
        rows={COMPETE.map((r) => [r.moment, r.google, r.gpt, r.ur])}
      />

      <Divider />

      <H2>How people want to use UR more</H2>
      <Text tone="secondary">
        Not "more sports in the chat." Same person, same week, more returns —
        because the product sat next to the book, not next to Wikipedia.
      </Text>

      <Stack gap={12}>
        {HABITS.map((h) => (
          <Card key={h.when}>
            <CardHeader
              title={h.want}
              trailing={
                <Pill
                  tone={
                    h.status.startsWith("Built")
                      ? "success"
                      : h.status.startsWith("Partial") || h.status.includes("exists")
                        ? "warning"
                        : "neutral"
                  }
                >
                  {h.when}
                </Pill>
              }
            />
            <CardBody>
              <Text tone="secondary" size="small">
                {h.status}
              </Text>
            </CardBody>
          </Card>
        ))}
      </Stack>

      <H2>What makes UR the go-to (if you keep the promise)</H2>
      <Grid columns={2} gap={16}>
        <Stack gap={8}>
          <H3>Board is law</H3>
          <Text>
            Claude will invent a line. Google will send you to a recap. UR
            either uses tonight's posted number or PASSes. That trust is the
            product.
          </Text>
        </Stack>
        <Stack gap={8}>
          <H3>Kill condition</H3>
          <Text>
            A take without "what kills it" is a tweet. A take with a kill is
            something you can check at 9:12. That's why they come back.
          </Text>
        </Stack>
        <Stack gap={8}>
          <H3>Slip in, veto out</H3>
          <Text>
            The highest-intent input is the ticket they were about to send.
            Don't write a new parlay. Cut a correlated leg or say no.
          </Text>
        </Stack>
        <Stack gap={8}>
          <H3>Grade the take</H3>
          <Text>
            Save exists. Grading doesn't. The loop "you said X kills it — it
            fired" is what ChatGPT cannot do without a ledger. Build that and
            you stop being a better prompt.
          </Text>
        </Stack>
      </Grid>

      <Callout tone="info" title="Penetration is a habit, not a better model">
        Thursday slate → one play. Slip paste before you bet. Live "still on
        it?" After: grade the kill. If NFL Ask stays dark while lines are live,
        that habit never starts — they already trained on Claude.
      </Callout>

      <Text tone="tertiary" size="small">
        Grounded in UR Take as of Aug 13, 2026: live AN NFL board, ESPN
        participation notes, structured lean + PASS guards, Ask/NFL still
        calendar-gated, free quota typically 3. Not a traffic study.
      </Text>
    </Stack>
  );
}
