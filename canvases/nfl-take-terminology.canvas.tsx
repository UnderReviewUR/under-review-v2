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
  Stack,
  Table,
  Text,
  useHostTheme,
} from "cursor/canvas";

const MARKET = [
  {
    term: "Best bet / pick / lock / smash",
    who: "Action Network, Covers, touts, ESPN roundups",
    means: "A ticket. More tickets = more content.",
    ur: "Avoid. That is the mill.",
  },
  {
    term: "The play",
    who: "Newsletters + UR Ask closer",
    means: "I am actually betting this number.",
    ur: "Keep for Ask only. One closer after a question.",
  },
  {
    term: "Lean",
    who: "Handicappers, Discord, our JSON field",
    means: "Slight preference. Not sized. Not a play yet.",
    ur: "Too soft for a card header. Fine inside a sentence.",
  },
  {
    term: "Pass / no bet",
    who: "Sharps, bankroll writing, Maven, ATS stats",
    means: "A position. Price is not there. Not a missed pick.",
    ur: "The trust word. Say it in the sentence, not as a logo.",
  },
  {
    term: "Fade",
    who: "Action Network, public-fade systems",
    means: "Bet the other side. Still a ticket.",
    ur: "Don't use as a lane. Fade ≠ pass.",
  },
  {
    term: "Shop / line shop",
    who: "OddsShopper, every +EV explainer",
    means: "The number is live. Hunt juice. Don't bet this book yet.",
    ur: "A verb in the why. Not a third brand.",
  },
  {
    term: "Watch / sit-watch",
    who: "Fantasy apps, injury reports",
    means: "Roster status. Not a betting decision.",
    ur: "Kill. Sounds like ESPN Fantasy.",
  },
];

const SAME_SLATE = [
  {
    job: "take",
    branded: "THE PLAY",
    brandedLine: "CIN -6.5",
    brandedWhy: "Posted CIN -6.5. Market has CIN at 59% implied.",
    plain: "CIN -6.5",
    plainWhy: "Posted. Cleanest number on the board. That's the one I'd take.",
  },
  {
    job: "don't",
    branded: "THE PASS",
    brandedLine: "Pass laying BAL -10.5",
    brandedWhy: "Double-digit favorite on a preseason board. Do not pay a touchdown to be right.",
    plain: "Don't lay BAL -10.5",
    plainWhy: "Double-digit favorite in August. Not a ticket.",
  },
  {
    job: "number",
    branded: "THE WATCH",
    brandedLine: "Shop GB -3",
    brandedWhy: "Key number. Shop off 3 before you take a side.",
    plain: "GB -3",
    plainWhy: "Sitting on a key. Get it off 3 before you take a side.",
  },
];

export default function NflTakeTerminology() {
  const { tokens: t } = useHostTheme();

  return (
    <Stack gap={24} style={{ padding: 24, maxWidth: 920 }}>
      <Stack gap={8}>
        <H1>Betting terms vs no terms</H1>
        <Text tone="secondary">
          Same three jobs. Different packaging. Research across Action Network,
          OddsShopper, sharp bankroll writing, and UR&apos;s own voice.
        </Text>
      </Stack>

      <Grid columns={3} gap={12}>
        <Card>
          <CardHeader>Rec products</CardHeader>
          <CardBody>
            <Text>Best bets. Picks. Locks. Stars. Smash.</Text>
            <Text tone="secondary">A list of tickets. The public already has this.</Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Sharp process</CardHeader>
          <CardBody>
            <Text>Play. Pass. No bet. Shop the number.</Text>
            <Text tone="secondary">Verbs in a sentence. Rarely a branded trio.</Text>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>UR already owns</CardHeader>
          <CardBody>
            <Text>THE PLAY as the Ask closer. Unpack this take.</Text>
            <Text tone="secondary">Don&apos;t spend that word on a homepage lane.</Text>
          </CardBody>
        </Card>
      </Grid>

      <H2>What the words actually mean</H2>
      <Table
        headers={["Term", "Who uses it", "What it means", "For UR"]}
        rows={MARKET.map((r) => [r.term, r.who, r.means, r.ur])}
      />

      <Callout tone="warning" title="Lean is not a play. Fade is not a pass.">
        A lean is a hunch you have not sized. A play is money down. A pass is
        walking. A fade is still a bet on the other side. Shop is hunting the
        number, not betting it. Watch is fantasy. Mixing those on three equal
        headers teaches the wrong product.
      </Callout>

      <H2>Same slate, two cards</H2>
      <Text tone="secondary">
        Tonight&apos;s board: CIN -6.5, BAL -10.5, GB -3. Jobs unchanged. Only
        the labels change.
      </Text>

      <Grid columns={2} gap={16}>
        <Card>
          <CardHeader trailing={<Pill tone="warning">With terms</Pill>}>
            NFL · Preseason slate
          </CardHeader>
          <CardBody>
            <Stack gap={4}>
              <H3>What to do with this slate</H3>
              <Text tone="secondary">One play. One pass. One number to watch.</Text>
            </Stack>
            <Divider />
            {SAME_SLATE.map((row) => (
              <Stack key={row.job} gap={4}>
                <Text weight="semibold" style={{ color: t.accent }}>
                  {row.branded}
                </Text>
                <Text weight="semibold">{row.brandedLine}</Text>
                <Text tone="secondary">{row.brandedWhy}</Text>
              </Stack>
            ))}
            <Text tone="secondary">Go Pro for more data-backed takes →</Text>
          </CardBody>
        </Card>

        <Card>
          <CardHeader trailing={<Pill tone="success">No terms</Pill>}>
            Tonight
          </CardHeader>
          <CardBody>
            <Stack gap={4}>
              <H3>On this board</H3>
              <Text tone="secondary">Three reads. Not three tickets.</Text>
            </Stack>
            <Divider />
            {SAME_SLATE.map((row) => (
              <Stack key={row.job} gap={4}>
                <Text weight="semibold">{row.plain}</Text>
                <Text tone="secondary">{row.plainWhy}</Text>
              </Stack>
            ))}
            <Text tone="secondary">Go Pro for more data-backed takes →</Text>
          </CardBody>
        </Card>
      </Grid>

      <H2>How no terms works in practice</H2>
      <Stack gap={10}>
        <Text>
          The first line is the take. The second line is why. Scan = the number.
          No legend to learn. A friend would text it that way.
        </Text>
        <Text>
          Hierarchy still exists without labels: first row is the one you&apos;d
          take, middle is the trap, last is the number to hunt. Order does the
          job the logo was doing.
        </Text>
        <Text>
          Ask does not change. After a question, UR still closes with THE PLAY
          or an honest PASS. That word stays expensive. The home/NFL card is
          just the board talking.
        </Text>
        <Text>
          Pro lock still works: two more rows, same shape, no THE TOTAL / ALSO
          ON THE BOARD stamps. Matchup + dots, then the CTA.
        </Text>
      </Stack>

      <Callout tone="info" title="What I would ship">
        Drop the three headers. Keep the three jobs in the builder. Write the
        row as the take. Tiny kicker can stay (Tonight / Preseason slate). Ask
        closer stays THE PLAY. Pass lives in the sentence: &quot;Don&apos;t lay
        BAL -10.5.&quot;
      </Callout>
    </Stack>
  );
}
