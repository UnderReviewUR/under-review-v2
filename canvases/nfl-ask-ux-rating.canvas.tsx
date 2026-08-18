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
  Stat,
  Table,
  Text,
  useHostTheme,
} from "cursor/canvas";

const SURFACES = [
  {
    surface: "Home Ask bar",
    score: "4",
    tone: "danger" as const,
    what: "Bar is live. NFL questions bounce to Coming Soon. No take.",
  },
  {
    surface: "Home slate card",
    score: "6",
    tone: "warning" as const,
    what: "Readable. Lanes not tappable while gated. First row is a pass under THE PLAY.",
  },
  {
    surface: "NFL tab (Coming Soon)",
    score: "6",
    tone: "warning" as const,
    what: "Board is up. Ask is dead. Predictor / World Cup are the exits.",
  },
  {
    surface: "Ask answer (API on)",
    score: "8",
    tone: "success" as const,
    what: "Tense, prices, and priors are honest. Still thin on props and inactives.",
  },
];

const FAN_BEATS = [
  [
    "Opens Home",
    "Sees three jobs + board teaser",
    "Clear. Looks like a betting product.",
  ],
  [
    "Reads THE PLAY",
    "Copy says Pass until inactives",
    "Header and body fight. Feels like a glitch, not a stance.",
  ],
  [
    "Types DEN @ ATL in Ask",
    "Sent to Coming Soon. No card.",
    "The promise on the bar is broken for NFL until Sep 9.",
  ],
  [
    "Opens NFL tab",
    "Board + same card + Week 1 lock",
    "Honest. Also inert. Cannot unpack a number.",
  ],
  [
    "Gets an Ask (local / ungated)",
    "Pregame voice, posted side, prior stats labeled",
    "Trust goes up. Excitement stays mid until props exist.",
  ],
];

export default function NflAskUxRating() {
  const { tokens: t } = useHostTheme();

  return (
    <Stack gap={24} style={{ padding: 24, maxWidth: 880 }}>
      <Stack gap={8}>
        <H1>NFL Ask UX — Aug 14, 2026</H1>
        <Text tone="secondary">
          Rated from a fan opening the app tonight, not from the pipeline. Ask
          is still gated to Week 1 (Sep 9). The six tightenings changed answer
          quality, not the front door.
        </Text>
      </Stack>

      <Grid columns={3} gap={16}>
        <Stat value="5.5" label="Tonight, as shipped" tone="warning" />
        <Stat value="8" label="Ask quality when it runs" tone="success" />
        <Stat value="7.5" label="Week 1 if props post" />
      </Grid>

      <Callout tone="warning" title="THE PLAY that says pass">
        The first row is still branded THE PLAY. The lean is now “Pass until
        inactives.” That is the right decision and the wrong package. A fan
        scans the label, not the paragraph. It reads like the product cannot
        decide.
      </Callout>

      <H2>By surface</H2>
      <Grid columns={2} gap={12}>
        {SURFACES.map((row) => (
          <Card key={row.surface}>
            <CardHeader trailing={<Pill tone={row.tone}>{row.score} / 10</Pill>}>
              {row.surface}
            </CardHeader>
            <CardBody>
              <Text>{row.what}</Text>
            </CardBody>
          </Card>
        ))}
      </Grid>

      <H2>What a fan actually does</H2>
      <Table
        headers={["Beat", "What they get", "How it feels"]}
        rows={FAN_BEATS}
      />

      <H2>What the six fixes bought</H2>
      <Grid columns={2} gap={16}>
        <Stack gap={8}>
          <H3>Trust (up)</H3>
          <Text>Pregame stays pregame. No fake LIVE clock.</Text>
          <Text>A posted spread is a real call, not a suitcase PASS.</Text>
          <Text>No “line stable” when there is no opener.</Text>
          <Text>yds/g reads as prior tape, not tonight.</Text>
        </Stack>
        <Stack gap={8}>
          <H3>Feel (still stuck)</H3>
          <Text>Ask is off for NFL until Week 1. The bar still invites it.</Text>
          <Text>Props pocket is empty. Prop asks still PASS, correctly.</Text>
          <Text>Inactives have not lit up. “Pass until inactives” is a wait.</Text>
          <Text>THE WATCH still sounds like fantasy, not shop-the-number.</Text>
        </Stack>
      </Grid>

      <Divider />

      <Stack gap={8}>
        <H3>Bottom line</H3>
        <Text>
          As a <Text weight="semibold">betting product you can use tonight</Text>
          , it is a board with a locked mouth. Fine for a coming-soon week. Weak
          if someone hits Home Ask expecting a take.
        </Text>
        <Text>
          As a <Text weight="semibold">voice you would trust in Week 1</Text>,
          it just got a lot better. The remaining UX debt is packaging: do not
          put a pass under THE PLAY, and do not show an Ask bar that cannot
          answer NFL.
        </Text>
        <Text tone="secondary" style={{ color: t.textSecondary }}>
          Source: current Home / NFL Coming Soon / slate card / Ask guard as of
          Aug 14, 2026 preseason.
        </Text>
      </Stack>
    </Stack>
  );
}
