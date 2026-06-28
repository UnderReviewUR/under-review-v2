import { useLayoutEffect, useRef, useState } from "react";
import { formatUrTakeSportTag, resolveUrTakeDisplaySport } from "../lib/urTakeSportTag.js";
import { scrubStructuredFaceText } from "../lib/urTakeFaceTextScrub.js";
import { buildEstimatedEdgeCardModel } from "../lib/urTakeEstimatedEdgeUi.js";
import {
  buildSharpBriefStatGrid,
  inferEdgeTypePill,
  inferMarketPill,
  pickSharpBriefHeadline,
} from "../lib/urTakeSharpBriefUi.js";
import { synthesizeLeanLine } from "../lib/urTakeLean.js";
import UrTakeShareButton from "./UrTakeShareButton.jsx";
import { formatUrTakeTimestampEt } from "../lib/urTakeTimestampEt.js";
import { resolveParlayCombinedOddsDisplay } from "../lib/calculateParlayOdds.js";
import { formatOddsAmerican } from "../../shared/formatOddsAmerican.js";
import {
  capWcStructuredConfidence,
  wcDataConfidenceCautionBanner,
  wcDataConfidenceNeedsCaution,
} from "../../shared/wcDataConfidence.js";
import WcTakeCard from "./WcTakeCard.jsx";
import UrTakeBreakdownBody from "./UrTakeBreakdownBody.jsx";
import { sanitizeUrTakeUserFacingProse } from "../../shared/wcUserFacingCopy.js";
import {
  buildWcTakeStatGrid,
  pickWcThePlayLine,
  wcCardSectionText,
  compressWcCardSections,
  prepareWcCardWhyDisplay,
  prepareWcCardFaceDisplay,
  wcTakeCardHasVisibleContent,
  UR_TAKE_BREAKDOWN_LABEL,
} from "../lib/wcTakeCardUi.js";
import { scrubStaleFinalsTiedCopy } from "../../shared/nbaFinalsTakeDisplay.js";
import {
  formatWcAdvancementMarketContextLine,
  getWcAdvancementMarketContextLabel,
} from "../../shared/wcAdvancementMarket.js";
import { shouldAutoExpandWcBreakdown } from "../../shared/wcFollowUpExplain.js";
import { isKnockoutPhase } from "../../shared/wcPhaseUtils.js";

function buildParlayCombinedExplainer(parlayLegs, combinedAmerican) {
  const tag = String(combinedAmerican || "").trim() || "this price";
  const legs = Array.isArray(parlayLegs) ? parlayLegs : [];
  const odds = legs
    .map((leg) => String(leg?.odds ?? "").trim())
    .filter((o) => o && o !== "TBD" && /^[+-]?\d+$/.test(o.replace(/^\+/, "")));
  if (odds.length < 2) {
    return `${tag} is the single-ticket American price for this parlay—each leg’s line rolls into one payout (books compound implied odds; they don’t add American prices like a scoreboard).`;
  }
  const uniq = [...new Set(odds)];
  if (uniq.length === 1) {
    return `Each leg is ${uniq[0]}; one slip rolls those into ${tag} American—typical parlay math for two ${uniq[0]} legs lands near +260–+270, not “${uniq[0]} + ${uniq[0]}”.`;
  }
  return `${tag} is the rolled-up American price for this parlay—leg lines compound into one number the book shows on the full ticket.`;
}

/** User questions that mirror follow-up CTAs — not useful as a “matchup” chip (repeat “parlay” noise). */
const META_PARLAY_PROMPT = /^build\s+a\s+parlay\b/i;

function matchupPillText(gameStateLine, userQuestion) {
  const g = String(gameStateLine || "").trim();
  if (g.length >= 6 && g.length <= 48) return g;
  const q = String(userQuestion || "").trim();
  if (q && !META_PARLAY_PROMPT.test(q)) {
    return q.slice(0, 44) + (q.length > 44 ? "…" : "");
  }
  return "Tonight";
}

/**
 * Sharp Brief (Variant 2) — structured UR Take card.
 */
export default function URTakeResponse({
  sport,
  question: userQuestion,
  lean,
  call,
  confidence,
  whyNow,
  edge,
  callType,
  analysis: _analysis,
  caveats,
  parlayLegs,
  parlayTotalOdds,
  timestamp,
  gameStateLine,
  liveScore,
  estimatedEdge,
  takeMeta = null,
  structuralEdgeChip = null,
  dataConfidence = null,
  nbaContextBar = null,
  playerMarketTier = null,
  line: wcLine = null,
  deep: wcDeep = null,
  breakdownAvailable = false,
  breakdownDefaultExpanded = false,
  predictionSlots = [],
  nbaRelevance = null,
  focusLayout = false,
  cardCollapsed = false,
  /** Orange data-confidence banner — first take in thread only. */
  showWcCautionBanner = true,
  modelAttribution = null,
  auditFootnote = null,
  tomorrowSlateAngles = null,
  slateDay = null,
  tomorrowFixtureCount = null,
  wcCardType = null,
  wcPropBoardRows = null,
  wcFixtureHome = null,
  wcFixtureAway = null,
  groundingVisible = false,
  groundingPinBanner = null,
  groundingInventoryStrip = null,
  namedLegCitation = null,
  wcNamedPlayerPropsCard = false,
  wcTournamentPhase = null,
}) {
  const primaryBodyRef = useRef(null);
  const [primaryOverflow, setPrimaryOverflow] = useState(false);
  const [bodyExpanded, setBodyExpanded] = useState(false);
  const [deepBreakdownExpanded, setDeepBreakdownExpanded] = useState(false);

  const formattedTimestamp = formatUrTakeTimestampEt(timestamp);
  const displaySport = resolveUrTakeDisplaySport({
    sport,
    question: userQuestion,
    structured: { sport },
  });
  const sportTag = formatUrTakeSportTag(displaySport, callType);
  const liveRibbon = String(liveScore || "").trim() || String(gameStateLine || "").trim() || "";
  const showLiveRibbon = liveRibbon.length > 0;

  const callScrub = scrubStructuredFaceText(call);
  const rulesCallType = String(callType || "").toLowerCase() === "rules";

  const rulesHeadline = scrubStructuredFaceText(String(lean || callScrub || "").trim());
  const rulesBodyRaw = scrubStructuredFaceText(String(whyNow || "").trim());
  const norm = (s) => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
  const rulesBody =
    rulesBodyRaw && norm(rulesBodyRaw) !== norm(rulesHeadline) && !norm(rulesBodyRaw).startsWith(norm(rulesHeadline))
      ? rulesBodyRaw
      : rulesBodyRaw && norm(rulesBodyRaw).startsWith(norm(rulesHeadline))
        ? rulesBodyRaw.slice(rulesHeadline.length).trim()
        : "";

  const whyNowRaw = sanitizeUrTakeUserFacingProse(
    rulesCallType ? rulesBody || "—" : scrubStructuredFaceText(whyNow) || "—",
  );
  const edgeRaw = sanitizeUrTakeUserFacingProse(
    rulesCallType ? "" : scrubStructuredFaceText(edge) || "—",
  );

  const safeParlayLegs = Array.isArray(parlayLegs)
    ? parlayLegs
        .filter((leg) => leg && typeof leg === "object" && String(leg.play ?? "").trim().length > 0)
        .slice(0, 12)
    : [];
  const combinedParlayOddsRaw = resolveParlayCombinedOddsDisplay(safeParlayLegs, parlayTotalOdds);
  const combinedParlayOdds = combinedParlayOddsRaw
    ? formatOddsAmerican(combinedParlayOddsRaw)
    : null;

  const ee =
    estimatedEdge && typeof estimatedEdge === "object" && estimatedEdge.source === "estimated_edge"
      ? estimatedEdge
      : null;
  const eeModel = buildEstimatedEdgeCardModel(ee);

  const sportLowerEarly = String(displaySport || sport || "").toLowerCase();
  const liveLeanCap = sportLowerEarly === "nba" && String(liveScore || gameStateLine || "").trim() ? 220 : null;

  let leanMerged = synthesizeLeanLine({ lean, call: callScrub, whyNow });
  if (liveLeanCap != null && leanMerged.length > liveLeanCap) {
    leanMerged = `${leanMerged.slice(0, liveLeanCap - 1).trim()}…`;
  }
  const leanDisplay = scrubStaleFinalsTiedCopy(
    scrubStructuredFaceText(rulesCallType ? rulesHeadline : leanMerged),
    nbaRelevance,
    userQuestion,
  );
  const gameStateLineDisplay = scrubStaleFinalsTiedCopy(
    String(gameStateLine || "").trim(),
    nbaRelevance,
    userQuestion,
  );
  const sportLower = sportLowerEarly;
  const displayConfidence = capWcStructuredConfidence(confidence, dataConfidence);
  const wcCautionText = wcDataConfidenceCautionBanner(dataConfidence, userQuestion);
  const callTypeLower = String(callType || "").toLowerCase();
  const playerMarketTierKey = String(playerMarketTier || "").toLowerCase();
  const isWcPredictionsRoundup = sportLower === "worldcup" && callTypeLower === "predictions_roundup";
  const isWcPlayerMarketCard =
    sportLower === "worldcup" &&
    !isWcPredictionsRoundup &&
    (callTypeLower.startsWith("player_market_") || Boolean(playerMarketTierKey));
  const isWcDirectCard = sportLower === "worldcup" && !rulesCallType;
  const deepRaw = sanitizeUrTakeUserFacingProse(String(wcDeep || "").trim());
  const showDeepBreakdown = !isWcDirectCard && Boolean(breakdownAvailable && deepRaw);
  const wcPredictionSlotRows = Array.isArray(predictionSlots)
    ? predictionSlots.filter((s) => s && String(s.value || "").trim())
    : [];

  const clampWcSentences = (text, max = 3) => {
    const t = String(text || "").trim();
    if (!t || t === "—") return t;
    const sentences = t.match(/[^.!?]+[.!?]+/g) || [t];
    return sentences.slice(0, max).join(" ").trim();
  };

  const whyNowScrubbed = scrubStaleFinalsTiedCopy(whyNowRaw, nbaRelevance, userQuestion);
  const whyNowDisplay =
    rulesCallType || !isWcDirectCard
      ? whyNowScrubbed
      : bodyExpanded
        ? clampWcSentences(whyNowScrubbed, 3)
        : whyNowScrubbed;
  const edgeDisplay =
    rulesCallType || !isWcDirectCard
      ? edgeRaw
      : bodyExpanded
        ? clampWcSentences(edgeRaw, 2)
        : edgeRaw;

  const headline =
    isWcDirectCard && callScrub && callScrub !== "—"
      ? callScrub
      : isWcPlayerMarketCard && callScrub && callScrub !== "—"
        ? callScrub
        : pickSharpBriefHeadline(
            leanDisplay,
            rulesCallType ? rulesHeadline : callScrub,
            edgeDisplay,
            callType,
            sport,
          );
  const playerMarketPass =
    isWcPlayerMarketCard &&
    (callTypeLower === "player_market_pass" || callTypeLower === "player_market_thin");
  const playerMarketTierLabel =
    playerMarketTierKey === "verified" || callTypeLower === "player_market_verified"
      ? "Market Odds · Verified"
      : playerMarketTierKey === "market_only" || callTypeLower === "player_market_odds"
        ? "Market Odds"
        : playerMarketTierKey === "squad" || callTypeLower === "player_market_squad"
          ? "Squad & Form"
          : playerMarketTierKey === "thin" || callTypeLower === "player_market_thin"
            ? "Early Contenders"
            : null;
  const showWcCaution =
    showWcCautionBanner &&
    !rulesCallType &&
    !isWcPlayerMarketCard &&
    wcDataConfidenceNeedsCaution(dataConfidence) &&
    Boolean(wcCautionText);
  const statGrid = isWcDirectCard
    ? buildWcTakeStatGrid({
        call: callScrub,
        line: wcLine,
        lean: leanDisplay,
        confidence: displayConfidence,
        callType,
        compactFace: focusLayout,
      })
    : buildSharpBriefStatGrid({
        estimatedEdge: ee,
        takeMeta,
        structured: { call: callScrub, line: wcLine, confidence: displayConfidence, callType },
        parlayLegs: safeParlayLegs,
      });

  const edgeTypePill = inferEdgeTypePill(callType);
  const marketPill = inferMarketPill(callScrub, callType);
  const marketPillDistinct =
    marketPill.toLowerCase() !== edgeTypePill.toLowerCase() ? marketPill : null;

  const wcAdvancementContextLabel =
    sportLower === "worldcup" ? getWcAdvancementMarketContextLabel(userQuestion) : null;
  const wcAdvancementContextLine =
    sportLower === "worldcup"
      ? formatWcAdvancementMarketContextLine(userQuestion, showLiveRibbon)
      : null;

  const contextLine =
    String(nbaContextBar || "").trim() ||
    (isWcPredictionsRoundup
      ? "Predictions · Tournament board"
      : isWcPlayerMarketCard && playerMarketTierLabel
      ? `Player market · ${playerMarketTierLabel}`
      : playerMarketPass
        ? "Player market · Early contenders"
        : wcAdvancementContextLine
        ? wcAdvancementContextLine
        : callTypeLower === "group_slate"
          ? "Group stage · Advancement"
        : rulesCallType
      ? "Knockout rules · Reference"
      : String(callType || "").toLowerCase() === "matchup"
        ? [edgeTypePill, marketPillDistinct ?? "Group stage"].join(" · ")
        : [
            marketPillDistinct ?? edgeTypePill,
            showLiveRibbon ? "Live" : "Tonight",
          ].join(" · "));

  const modePill =
    isWcPredictionsRoundup ? (
      <span className="ur-v2-mode-pill ur-v2-mode-pill--structural">Predictions</span>
    ) : isWcPlayerMarketCard && playerMarketTierLabel ? (
      <span className="ur-v2-mode-pill ur-v2-mode-pill--odds">{playerMarketTierLabel}</span>
    ) : playerMarketPass ? (
      <span className="ur-v2-mode-pill ur-v2-mode-pill--structural">Early contenders</span>
    ) : rulesCallType ? (
      <span className="ur-v2-mode-pill ur-v2-mode-pill--structural">Reference</span>
    ) : wcAdvancementContextLabel ? (
      <span className="ur-v2-mode-pill ur-v2-mode-pill--odds">Futures market</span>
    ) : ee && eeModel ? (
      <span className="ur-v2-mode-pill ur-v2-mode-pill--ee">
        <span className="ur-v2-mode-ic" aria-hidden>
          ◈
        </span>
        Estimated edge
      </span>
    ) : takeMeta?.openingLineSnapshot?.line != null || takeMeta?.openingLineSnapshot?.openingAmerican != null ? (
      <span className="ur-v2-mode-pill ur-v2-mode-pill--odds">
        <span className="ur-v2-mode-dot" aria-hidden />
        Live odds
      </span>
    ) : (
      <span className="ur-v2-mode-pill ur-v2-mode-pill--structural">The angle</span>
    );

  const shareBody = [whyNowDisplay, edgeDisplay].filter(Boolean);
  const wcHasBreakdownBody =
    isWcDirectCard &&
    ((whyNowDisplay && whyNowDisplay !== "—") || (edgeDisplay && edgeDisplay !== "—"));
  const wcShowEdgeExpand =
    isWcDirectCard && edgeDisplay && edgeDisplay !== "—";

  const hasSecondaryBody =
    Boolean(ee && eeModel) ||
    (Array.isArray(caveats) && caveats.some((c) => String(c ?? "").trim())) ||
    safeParlayLegs.length >= 2;

  useLayoutEffect(() => {
    if (showDeepBreakdown && focusLayout) {
      setDeepBreakdownExpanded(true);
    }
  }, [showDeepBreakdown, focusLayout, deepRaw]);

  useLayoutEffect(() => {
    if (isWcDirectCard) {
      setPrimaryOverflow(Boolean(wcHasBreakdownBody));
      if (!wcHasBreakdownBody) setBodyExpanded(false);
      return;
    }
    const el = primaryBodyRef.current;
    if (!el) return;
    const cs = globalThis.getComputedStyle?.(el);
    const lh = parseFloat(cs?.lineHeight || "0") || 28;
    const threshold = lh * 3 + 2;
    setPrimaryOverflow(el.scrollHeight > threshold);
    if (el.scrollHeight <= threshold && !hasSecondaryBody) setBodyExpanded(false);
  }, [whyNowDisplay, edgeDisplay, hasSecondaryBody, isWcDirectCard, wcHasBreakdownBody]);

  const showBodyExpand =
    isWcDirectCard && wcShowEdgeExpand
      ? !bodyExpanded
      : !bodyExpanded && (primaryOverflow || hasSecondaryBody);

  const wcShareText = String(userQuestion || headline || "").trim();
  const shareQuery =
    sportLower === "worldcup" && wcShareText
      ? `?wc=1&q=${encodeURIComponent(wcShareText.slice(0, 200))}`
      : isWcDirectCard && headline
        ? `?wc=1&q=${encodeURIComponent(String(headline).slice(0, 120))}`
        : "";

  if (isWcDirectCard) {
    const lineSlotValue =
      statGrid.slots.find((s) => s.key === "ln" || s.key === "pl")?.value ?? "";
    const wcWhyPrepared =
      wcPredictionSlotRows.length > 0 ? { why: "", modelAttribution: null } : prepareWcCardWhyDisplay(whyNowRaw);
    const thePlayRaw = wcCardSectionText(
      pickWcThePlayLine({
        lean: leanDisplay,
        call: callScrub,
        headline: callScrub,
        lineSlot: lineSlotValue,
        callType,
      }),
    );
    const wcFace = prepareWcCardFaceDisplay({
      lean: leanDisplay,
      call: callScrub,
      why: wcWhyPrepared.why,
      watchFor: wcCardSectionText(edgeRaw),
      thePlay: thePlayRaw,
      breakdown: String(wcDeep || "").trim(),
      breakdownAvailable: Boolean(breakdownAvailable),
      focusLayout,
      lineSlot: lineSlotValue,
      callType,
      question: userQuestion,
      cardType: wcCardType,
      playerMarketTier,
      propBoardRows: wcPropBoardRows,
      fixtureHome: wcFixtureHome,
      fixtureAway: wcFixtureAway,
      parlayLegs: safeParlayLegs,
      parlayCombinedOdds: combinedParlayOdds,
      tomorrowSlateAngles: Array.isArray(tomorrowSlateAngles) ? tomorrowSlateAngles : [],
      slateDay: slateDay || null,
      tomorrowFixtureCount,
      wcNamedPlayerPropsCard,
      isKnockout:
        String(callType || "").toLowerCase() === "matchup" &&
        isKnockoutPhase(String(wcTournamentPhase || "").trim()),
    });
    const wcSections = {
      ...wcFace.sections,
      ...compressWcCardSections({
        headline: wcFace.headline,
        lineSlot: lineSlotValue,
        why: wcFace.sections.why,
        watchFor: wcFace.sections.watchFor,
        thePlay: wcFace.sections.thePlay,
        callType,
      }),
    };
    return (
      <WcTakeCard
        headline={wcFace.headline}
        statSlots={focusLayout ? [] : statGrid.slots}
        sections={wcSections}
        confidence={displayConfidence}
        contextLine={contextLine}
        modePill={focusLayout ? null : modePill}
        cautionText={focusLayout ? null : showWcCaution ? wcCautionText : null}
        sharePath={shareQuery}
        userQuestion={userQuestion}
        timestamp={timestamp}
        breakdownText={wcFace.breakdownText}
        breakdownTextFull={wcFace.breakdownTextFull}
        breakdownTruncated={wcFace.breakdownTruncated}
        breakdownAvailable={wcFace.breakdownAvailable}
        predictionSlots={wcPredictionSlotRows}
        focusLayout={focusLayout}
        collapsed={cardCollapsed}
        callType={callType}
        slateListFace={wcFace.slateListFace}
        modelAttribution={modelAttribution || wcWhyPrepared.modelAttribution}
        auditFootnote={auditFootnote}
        groundingVisible={groundingVisible}
        groundingPinBanner={groundingPinBanner}
        groundingInventoryStrip={groundingInventoryStrip}
        namedLegCitation={namedLegCitation}
        breakdownDefaultExpanded={
          focusLayout &&
          wcFace.breakdownAvailable &&
          (Boolean(breakdownDefaultExpanded) ||
            callType === "group_slate" ||
            callType === "advancement" ||
            shouldAutoExpandWcBreakdown(userQuestion, breakdownDefaultExpanded))
        }
        fallbackSummary={
          wcTakeCardHasVisibleContent({
            headline: wcFace.headline,
            sections: wcSections,
            breakdownText: wcFace.breakdownText,
            breakdownAvailable: wcFace.breakdownAvailable,
            modelAttribution: modelAttribution || wcWhyPrepared.modelAttribution,
          })
            ? ""
            : [leanDisplay, whyNowDisplay, wcFace.breakdownText, callScrub, userQuestion]
                .map((x) => String(x || "").trim())
                .find((x) => x && x !== "—") || "Analysis unavailable — try again."
        }
      />
    );
  }

  return (
    <div className="ur-take-structured ur-take-response ur-v2-card ur-take-response-v2">
      {!isWcDirectCard ? (
        <div className="ur-v2-sport-bar">
          {sportTag ? (
            <>
              <span className="ur-v2-sport-bar-tag">{sportTag}</span>
              <span className="ur-v2-sport-bar-dot" aria-hidden>
                ·
              </span>
            </>
          ) : null}
          <span className="ur-v2-sport-bar-ctx">{contextLine}</span>
          <span className="ur-v2-sport-bar-spacer" />
          {modePill}
        </div>
      ) : null}

      {playerMarketPass && !isWcDirectCard ? (
        <p className="wc-player-pass-note" role="note">
          Lineups may not be confirmed — ranked early contenders use current betting markets and squad data.
        </p>
      ) : null}

      {showWcCaution ? (
        <div className="ur-v2-wc-caution" role="status">
          <span className="ur-v2-wc-caution-icon" aria-hidden>
            ◷
          </span>
          <span className="ur-v2-wc-caution-text">{wcCautionText}</span>
        </div>
      ) : null}

      <div className="ur-v2-headline-wrap">
        <h2
          className={
            isWcDirectCard ? "ur-v2-headline" : "ur-v2-headline ur-v2-headline--lean"
          }
        >
          {String(headline ?? "")}
        </h2>
      </div>

      {structuralEdgeChip?.label ? (
        <p className="ur-v2-structural-edge-chip" aria-label={structuralEdgeChip.label}>
          <span className="ur-v2-structural-edge-chip-kicker">The angle</span>
          <span className="ur-v2-structural-edge-chip-player">{structuralEdgeChip.player}</span>
          {structuralEdgeChip.oddsDisplay ? (
            <span className="ur-v2-structural-edge-chip-odds">
              {formatOddsAmerican(structuralEdgeChip.oddsDisplay)}
            </span>
          ) : null}
        </p>
      ) : null}

      {!isWcDirectCard ? (
        <div className="ur-v2-pill-row">
          <span className="ur-v2-mini-pill">{edgeTypePill}</span>
          {marketPillDistinct ? <span className="ur-v2-mini-pill">{marketPillDistinct}</span> : null}
          <span className="ur-v2-mini-pill ur-v2-mini-pill--muted">
            {matchupPillText(gameStateLineDisplay, userQuestion)}
          </span>
        </div>
      ) : null}

      {statGrid.slots.length > 0 ? (
        <>
          <div className="ur-v2-stat-grid">
            {statGrid.slots.map((slot) => (
              <div
                key={slot.key}
                className={`ur-v2-stat-cell${slot.highlight ? " ur-v2-stat-cell--hi" : ""}`}
              >
                <div className="ur-v2-stat-label">{String(slot.label ?? "")}</div>
                <div className="ur-v2-stat-value">{String(slot.value ?? "")}</div>
              </div>
            ))}
          </div>

          <div className="ur-v2-divider" />
        </>
      ) : null}

      {((!isWcDirectCard || bodyExpanded || (whyNowDisplay && whyNowDisplay !== "—")) &&
        (whyNowDisplay !== "—" || edgeDisplay !== "—")) ? (
        <div
          ref={primaryBodyRef}
          className={`ur-v2-body-primary${showBodyExpand && !isWcDirectCard ? " ur-v2-body-primary--clamp" : ""}`}
        >
          {whyNowDisplay && whyNowDisplay !== "—" ? (
            <p className="ur-v2-body-p">{whyNowDisplay}</p>
          ) : null}
          {edgeDisplay && edgeDisplay !== "—" ? (
            <p className="ur-v2-body-p ur-v2-body-p--edge">{edgeDisplay}</p>
          ) : null}
        </div>
      ) : isWcDirectCard && wcHasBreakdownBody ? (
        <div ref={primaryBodyRef} className="ur-v2-body-primary" aria-hidden />
      ) : null}

      {showBodyExpand && !showDeepBreakdown ? (
        <button type="button" className="ur-v2-body-expand" onClick={() => setBodyExpanded(true)}>
          {UR_TAKE_BREAKDOWN_LABEL}
        </button>
      ) : showDeepBreakdown && !deepBreakdownExpanded ? (
        <button
          type="button"
          className={`ur-v2-body-expand${focusLayout ? " wc-take-breakdown-toggle--focus" : ""}`}
          onClick={() => setDeepBreakdownExpanded(true)}
        >
          {UR_TAKE_BREAKDOWN_LABEL}
        </button>
      ) : bodyExpanded && (primaryOverflow || hasSecondaryBody) ? (
        <button type="button" className="ur-v2-body-expand" onClick={() => setBodyExpanded(false)}>
          Show less
        </button>
      ) : null}

      {showDeepBreakdown && deepBreakdownExpanded ? (
        <div className="wc-take-breakdown-panel">
          <div className="wc-take-breakdown-label">{UR_TAKE_BREAKDOWN_LABEL}</div>
          <UrTakeBreakdownBody text={deepRaw} />
          <button
            type="button"
            className={`ur-v2-body-expand wc-take-breakdown-toggle${focusLayout ? " wc-take-breakdown-toggle--focus" : ""}`}
            onClick={() => setDeepBreakdownExpanded(false)}
          >
            Show less
          </button>
        </div>
      ) : null}

      <div
        className={`ur-v2-body-secondary${bodyExpanded ? " ur-v2-body-secondary--open" : ""}`}
        aria-hidden={!bodyExpanded}
      >
        {ee && eeModel ? (
          <div className="ur-v2-ee-prose">
            <p className="ur-v2-body-p ur-v2-muted">
              <span className="ur-v2-inline-label">Why I like this</span> {String(eeModel.whyTierBody ?? "")}
            </p>
            {eeModel.layout === "thin" ? (
              <>
                <p className="ur-v2-body-p">
                  <span className="ur-v2-inline-label">{String(eeModel.leanHeading ?? "")}</span>{" "}
                  {String(eeModel.leanBody ?? "")}
                </p>
                {eeModel.drivers.length > 0 ? (
                  <ul className="ur-v2-driver-list">
                    {eeModel.drivers.map((d, i) => (
                      <li key={i}>{String(d ?? "")}</li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : (
              <>
                {eeModel.numericRows.map((row) => (
                  <p key={row.key} className="ur-v2-body-p">
                    <span className="ur-v2-inline-label">{String(row.label ?? "")}</span> {String(row.value ?? "")}
                  </p>
                ))}
                {eeModel.drivers.length > 0 ? (
                  <ul className="ur-v2-driver-list">
                    {eeModel.drivers.map((d, i) => (
                      <li key={i}>{String(d ?? "")}</li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        {Array.isArray(caveats) && caveats.length > 0 ? (
          <ul className="ur-v2-caveats">
            {caveats.map((c, idx) => {
              if (c == null) return null;
              if (typeof c === "string" || typeof c === "number") {
                const line = String(c).trim();
                return line ? <li key={idx}>{line}</li> : null;
              }
              return null;
            })}
          </ul>
        ) : null}

        {safeParlayLegs.length >= 2 ? (
        <div className="ur-v2-parlay-block">
          <div className="ur-v2-parlay-title">Parlay legs</div>
          <div className="ur-v2-parlay-legs">
            {safeParlayLegs.map((leg, idx) => {
              const play = String(leg.play ?? "").trim() || "Leg";
              const odds = leg.odds != null && String(leg.odds).trim() !== "" ? String(leg.odds) : "";
              const rationale =
                leg.rationale && String(leg.rationale).trim() ? String(leg.rationale).trim() : "";
              return (
              <div key={`${play}-${idx}`} className="ur-v2-parlay-leg">
                <div className="ur-v2-parlay-leg-head">
                  <span className="ur-v2-parlay-play">{play}</span>
                  {odds && odds !== "TBD" ? (
                    <span className="ur-v2-parlay-odds">{formatOddsAmerican(odds)}</span>
                  ) : null}
                </div>
                {rationale ? (
                  <div className="ur-v2-parlay-rationale">{rationale}</div>
                ) : null}
              </div>
            );
            })}
          </div>
          {combinedParlayOdds ? (
            <div className="ur-v2-parlay-combined">
              <div className="ur-v2-parlay-combined-label">Combined price {combinedParlayOdds}</div>
              <div className="ur-v2-parlay-explainer">
                {buildParlayCombinedExplainer(safeParlayLegs, combinedParlayOddsRaw)}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      </div>

      <div className="ur-v2-footer-row">
        {formattedTimestamp ? (
          <span className="ur-v2-ts">{formattedTimestamp}</span>
        ) : (
          <span />
        )}
        <UrTakeShareButton headline={headline} bodyChunks={shareBody} sharePath={shareQuery} />
      </div>
    </div>
  );
}
