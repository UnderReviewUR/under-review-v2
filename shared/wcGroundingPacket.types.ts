/**
 * WC player-props grounding packet — one truth object per UR Take turn.
 * @see api/_wcGroundingPacket.js
 */

/** Schema version for prompt + validation evolution. */
export type WcGroundingPacketVersion = "wc-grounding/v1";

/** Route by ask shape, not inferred WC intent taxonomy. */
export type WcPropAskShape =
  | "named_legs"
  | "fixture_board"
  | "slate"
  | "image_slip"
  | "follow_up_explain";

/** Normalized match status for fixture pin + card banner. */
export type WcMatchStatus =
  | "NS"
  | "live"
  | "HT"
  | "FT"
  | "POSTPONED"
  | "CANCELLED"
  | "UNKNOWN";

/** Internal market keys — aligned with WC_MATCH_PLAYER_PROP_MARKET_KEYS. */
export type WcPropMarketKey =
  | "anytime_scorer"
  | "first_goalscorer"
  | "last_goalscorer"
  | "player_goal_or_assist"
  | "player_assists_ou"
  | "player_shots_ou"
  | "player_sot_ou"
  | "player_shots_each_half"
  | "player_sot_each_half"
  | "player_saves_ou"
  | "player_tackles_ou"
  | "player_card"
  | "player_red_card";

/** How the pinned fixture was resolved — auditable in card/debug views. */
export type WcFixturePinMethod =
  | "explicit_event_id"
  | "two_teams_in_question"
  | "player_nation"
  | "history_thread"
  | "slate_single_match"
  | "image_context";

/** GOAT refresh outcome for this turn (not persisted in KV). */
export type WcGroundingRefreshReason =
  | "empty"
  | "stale"
  | "in_play_stale"
  | "fresh_enough"
  | "skipped_image"
  | "error";

/** Data source for props ingest attached to this packet. */
export type WcGroundingDataSource =
  | "balldontlie"
  | "book_scrape"
  | "seed"
  | "mixed"
  | "none";

/** Machine-readable partial-data / routing blockers. */
export type WcGroundingBlocker =
  | "fixture_unpinned"
  | "fixture_ambiguous"
  | "props_fetch_failed"
  | "props_empty_all_markets"
  | "anytime_scorer_empty"
  | "named_market_empty"
  | "named_player_not_in_ladder"
  | "named_line_not_posted"
  | "lineups_unconfirmed"
  | "books_pulled_live"
  | "data_stale"
  | "kv_only_no_bdl";

/** O/U or milestone side when applicable. */
export type WcPropLegSide = "over" | "under" | "yes";

/** Primary validation index key — code-generated, never LLM-generated. */
export type WcLadderKey = string;

/** Player + market grouping key for nearest-line fallback. */
export type WcPlayerMarketKey = string;

/**
 * Ask context for this turn — shape routing input.
 */
export type WcPropAskContext = {
  /** Resolved ask shape for routing. */
  shape: WcPropAskShape;
  /** Raw user text for this turn. */
  question: string;
  /** Normalized routing text (may include history snippet). */
  routingQuestion: string;
  /** Whether an image was attached this turn. */
  hasImage: boolean;
  /** FIFA nation abbreviations explicitly mentioned in the question. */
  mentionedTeams: string[];
  /** Parsed named legs when shape is `named_legs`. */
  parsedNamedLegs?: WcParsedNamedLeg[];
};

/**
 * One parsed named leg from the user question (pre-match resolution input).
 */
export type WcParsedNamedLeg = {
  /** Bare or full player name hint from question. */
  playerHint: string;
  /** Resolved nation abbr when known. */
  nationAbbr: string | null;
  /** Target market key. */
  market: WcPropMarketKey;
  /** User threshold (e.g. 1.5) when applicable. */
  threshold: number | null;
  /** Human market label echoed in prompts. */
  marketLabel: string;
};

/**
 * Fixture pin — set in code before shape routing or LLM.
 */
export type WcPinnedFixture = {
  /** ESPN / app event id (KV key). */
  eventId: string;
  /** BDL match_id when known. */
  bdlMatchId: number | null;
  /** Home nation abbreviation, e.g. GHA. */
  home: string;
  /** Away nation abbreviation, e.g. PAN. */
  away: string;
  /** Display name for home nation. */
  homeDisplay: string;
  /** Display name for away nation. */
  awayDisplay: string;
  /** Normalized match status. */
  status: WcMatchStatus;
  /** ISO 8601 UTC kickoff when known. */
  kickoffUtc: string | null;
  /** ET broadcast slate date YYYY-MM-DD. */
  slateDateEt: string | null;
  /** Human live clock when in progress, e.g. "1st, 2'". */
  clockDisplay: string | null;
  /** How this fixture was pinned. */
  pinMethod: WcFixturePinMethod;
  /** Other fixtures considered when pin was ambiguous. */
  alternateCandidates?: Array<
    Pick<WcPinnedFixture, "eventId" | "home" | "away" | "status">
  >;
};

/**
 * Freshness metadata for props attached to this packet.
 */
export type WcDataFreshness = {
  /** Ingest source tier. */
  source: WcGroundingDataSource;
  /** Milliseconds since last successful props ingest for this event. */
  ageMs: number;
  /** Derived seconds — for prompts and UI. */
  ageSec: number;
  /** ISO timestamp of last successful fetch/write. */
  fetchedAt: string;
  /** True when match is in progress (live / HT). */
  inPlay: boolean;
  /** GOAT refresh policy outcome this turn. */
  refresh: {
    /** Whether a live BDL refresh was attempted this turn. */
    attempted: boolean;
    /** Whether refresh returned usable rows. */
    succeeded: boolean;
    /** Why refresh ran or was skipped. */
    reason: WcGroundingRefreshReason;
    /** Wall time for refresh attempt when attempted. */
    durationMs: number | null;
  };
  /** True when age exceeds policy for current match phase. */
  isStale: boolean;
  /** Policy threshold (seconds) used for isStale. */
  staleAfterSec: number;
};

/**
 * Canonical posted prop leg — authoritative for validation.
 */
export type WcPropLeg = {
  /** Stable id: market|player|line|side|vendor (or BDL row id when present). */
  legId: string;
  /** BDL player_id when known. */
  playerId: number | null;
  /** Display player name. */
  playerName: string;
  /** Nation abbreviation when known. */
  nationAbbr: string | null;
  /** Internal market key. */
  market: WcPropMarketKey;
  /** Milestone or O/U line as string, e.g. "1.5". */
  line: string | null;
  /** Bet side when applicable. */
  side: WcPropLegSide | null;
  /** American odds string, e.g. "+125". */
  americanOdds: string;
  /** Decimal odds when available. */
  decimalOdds: number | null;
  /** Sportsbook vendor slug. */
  vendor: string;
  /** Rank within market for display ordering (1 = primary). */
  displayRank?: number;
};

/**
 * Full ladder — validation layer (all posted rows, uncollapsed).
 */
export type WcFullLadder = {
  /** O(1) lookup for validation gate. */
  byKey: Record<WcLadderKey, WcPropLeg>;
  /** Grouped for nearest-line fallback matcher. */
  byPlayerMarket: Record<WcPlayerMarketKey, WcPropLeg[]>;
  /** Total leg count across all markets. */
  totalLegs: number;
  /** Distinct player names in ladder. */
  uniquePlayers: number;
};

/**
 * Per-market summary entry for Claude + card inventory.
 */
export type WcMarketSummaryEntry = {
  /** Internal market key. */
  market: WcPropMarketKey;
  /** Short human label, e.g. "shots". */
  label: string;
  /** Raw row count in full ladder for this market. */
  count: number;
  /** True when count >= 2 (fixture board eligible). */
  boardEligible: boolean;
  /** Collapsed top legs for reasoning/display. */
  topLegs: WcPropLeg[];
  /** Top legs split by pinned home/away when fixture is pinned. */
  topByNation?: {
    home: WcPropLeg[];
    away: WcPropLeg[];
  };
};

/**
 * Aggregated market summary across all prop types.
 */
export type WcMarketsSummary = {
  /** Markets with at least one posted row, priority ordered. */
  posted: WcMarketSummaryEntry[];
  /** Markets with zero rows this fetch. */
  empty: WcPropMarketKey[];
  /** Preferred board market for fixture_board asks. */
  primaryBoardMarket: WcPropMarketKey | null;
};

/**
 * Blockers — explicit partial-data reasons (never inferred from empty UI).
 */
export type WcGroundingBlockers = {
  /** Machine-readable blocker codes. */
  codes: WcGroundingBlocker[];
  /** User-facing one-liners derived from codes. */
  messages: string[];
};

/**
 * Deterministic named-leg match result (pre-LLM).
 */
export type WcNamedLegMatchStatus =
  | "matched"
  | "partial"
  | "missing_player"
  | "missing_market"
  | "missing_line";

/**
 * Named leg match against full ladder.
 */
export type WcNamedLegMatch = {
  /** Parsed leg from question. */
  leg: WcParsedNamedLeg;
  /** Match status. */
  status: WcNamedLegMatchStatus;
  /** Nearest posted row when matched or partial. */
  matched: WcPropLeg | null;
  /** Absolute delta between asked threshold and posted line. */
  lineDelta: number | null;
  /** Human note for card, e.g. fallback market label. */
  fallbackNote: string | null;
};

/**
 * Slim Claude reasoning view — summary + top-N only.
 */
export type WcGroundingClaudeView = {
  /** Ask shape for this turn. */
  askShape: WcPropAskShape;
  /** User question text. */
  question: string;
  /** Pinned fixture summary or null when unpinned. */
  pinned: {
    fixture: string;
    eventId: string;
    status: string;
    kickoff: string | null;
  } | null;
  /** Freshness summary for prompts. */
  freshness: {
    source: string;
    ageSec: number;
    inPlay: boolean;
    refreshedThisTurn: boolean;
  };
  /** Per-market counts + top legs (no full ladder). */
  markets: Array<{
    market: WcPropMarketKey;
    label: string;
    count: number;
    topLegs: Array<{
      player: string;
      nation: string | null;
      line: string | null;
      side: string | null;
      odds: string;
      vendor: string;
      legId: string;
    }>;
  }>;
  /** User-facing blocker messages. */
  blockers: string[];
  /** Named leg match summaries when applicable. */
  namedLegMatches: Array<{
    ask: string;
    status: WcNamedLegMatchStatus;
    matchedLegId: string | null;
    note: string | null;
  }>;
  /** Static instruction fragment appended to system context. */
  instructions: string;
};

/**
 * Card UI view — pin banner + inventory strip (always rendered).
 */
export type WcGroundingCardView = {
  /** Fixture pin banner above card fold. */
  pinBanner: {
    headline: string;
    subline: string;
    eventId: string;
    homeAbbr: string;
    awayAbbr: string;
    status: WcMatchStatus;
  } | null;
  /** Posted vs not-posted market chips. */
  inventoryStrip: {
    posted: string[];
    notPosted: string[];
    freshnessLabel: string;
  };
  /** User-facing blocker messages. */
  blockers: string[];
  /** Seed fields for URTakeResponse structured payload. */
  structuredSeed: {
    sport: "worldcup";
    wcEventId?: string;
    fixtureHome?: string;
    fixtureAway?: string;
    playerMarketTier?: string;
    groundingVisible: true;
    propBoardRows?: Array<{
      label: string;
      lean: string;
      market: WcPropMarketKey;
      odds: string;
      legId: string;
    }>;
  };
};

/**
 * Validation view — full ladder indexes for odds gate (Phase 3).
 */
export type WcGroundingValidationView = {
  /** Full uncollapsed ladder. */
  ladder: WcFullLadder;
  /** Fast membership set of allowed legIds. */
  allowedLegIds: Set<string>;
  /** Normalized player name → all legs for fuzzy fallback. */
  playerIndex: Record<string, WcPropLeg[]>;
};

/**
 * Citation shape for Phase 3 validation gate (exported for downstream handlers).
 */
export type WcValidatedPropCitation = {
  player: string;
  market: WcPropMarketKey;
  line: string | null;
  side: WcPropLegSide | null;
  americanOdds: string;
  vendor: string | null;
  legId?: string;
};

/** Root grounding packet — single writer per turn. */
export type WcGroundingPacket = {
  /** Schema version. */
  version: WcGroundingPacketVersion;
  /** Correlation id for logs. */
  requestId: string;
  /** ISO timestamp when packet was built. */
  builtAt: string;
  /** Ask context for this turn. */
  ask: WcPropAskContext;
  /** Pinned fixture or null when unpinned. */
  pinnedFixture: WcPinnedFixture | null;
  /** Freshness metadata. */
  dataFreshness: WcDataFreshness;
  /** Aggregated market summary. */
  marketsSummary: WcMarketsSummary;
  /** Full validation ladder. */
  fullLadder: WcFullLadder;
  /** Explicit blockers. */
  blockers: WcGroundingBlockers;
  /** Named leg matches (may be empty). */
  namedLegMatches: WcNamedLegMatch[];
  /** Slate shape: sub-packets keyed by eventId (optional). */
  slateFixtures?: Record<string, WcGroundingPacket>;
  /** Projections for Claude, card, and validation consumers. */
  views: {
    claude: WcGroundingClaudeView;
    card: WcGroundingCardView;
    validation: WcGroundingValidationView;
  };
};

/** Input params for buildWcGroundingPacket (Phase 0). */
export type BuildWcGroundingPacketParams = {
  requestId: string;
  askContext: WcPropAskContext;
  pinnedFixture: WcPinnedFixture | null;
  /**
   * Raw markets map from KV/BDL normalize — keys are WcPropMarketKey,
   * values are arrays of { name, americanOdds, line?, side?, nationAbbr?, bookOdds?, vendor? }.
   */
  rawBdlPlayerProps: Record<string, Array<Record<string, unknown>>>;
  dataFreshness: Partial<WcDataFreshness> & Pick<WcDataFreshness, "source">;
  /** Optional pre-computed named leg matches (Phase 1+). */
  namedLegMatches?: WcNamedLegMatch[];
};

/**
 * View-only imports for handlers — use these when you need one projection:
 * @example import type { WcGroundingClaudeView } from "../shared/wcGroundingPacket.types";
 */
export type {
  WcGroundingClaudeView,
  WcGroundingCardView,
  WcGroundingValidationView,
};
