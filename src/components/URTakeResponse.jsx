import { useEffect, useState } from "react";
import { formatUrTakeSportTag } from "../lib/urTakeSportTag.js";
import { scrubStructuredFaceText } from "../lib/urTakeFaceTextScrub.js";
import { buildEstimatedEdgeCardModel } from "../lib/urTakeEstimatedEdgeUi.js";
import {
  buildSharpBriefStatGrid,
  inferEdgeTypePill,
  inferMarketPill,
  pickSharpBriefHeadline,
} from "../lib/urTakeSharpBriefUi.js";
import UrTakeDockedFollowUps from "./UrTakeDockedFollowUps.jsx";
import UrTakeShareButton from "./UrTakeShareButton.jsx";

function formatTimestamp(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  try {
    const base = d
      .toLocaleString("en-US", {
        timeZone: "America/New_York",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .replace(",", " ·");
    return `${base} ET`;
  } catch {
    return null;
  }
}

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

function formatEstimatedSportLabel(sport) {
  const s = String(sport || "").toLowerCase();
  if (s === "tennis_wta_profile") return "Tennis (WTA profile)";
  if (!s) return "—";
  return s.toUpperCase();
}

function matchupPillText(gameStateLine, userQuestion) {
  const g = String(gameStateLine || "").trim();
  if (g.length >= 6 && g.length <= 48) return g;
  const q = String(userQuestion || "").trim();
  return q ? q.slice(0, 44) + (q.length > 44 ? "…" : "") : "Tonight";
}

/**
 * Sharp Brief (Variant 2) — structured UR Take card.
 */
export default function URTakeResponse({
  sport,
  question: userQuestion,
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
  followUpSource = null,
  onFollowUpPick = null,
}) {
  const [animMounted, setAnimMounted] = useState(false);
  useEffect(() => {
    setAnimMounted(true);
  }, []);

  console.info("[SharpBrief] URTakeResponse payload", {
    sport,
    callType,
    keys: {
      call: Boolean(call),
      whyNow: Boolean(whyNow),
      edge: Boolean(edge),
      analysis: _analysis && typeof _analysis === "object",
      caveats: Array.isArray(caveats),
    },
  });

  const formattedTimestamp = formatTimestamp(timestamp);
  const sportTag = formatUrTakeSportTag(sport, callType);
  const liveRibbon = String(liveScore || "").trim() || String(gameStateLine || "").trim() || "";
  const showLiveRibbon = liveRibbon.length > 0;

  const whyNowDisplay = scrubStructuredFaceText(whyNow) || "—";
  const edgeDisplay = scrubStructuredFaceText(edge) || "—";
  const callScrub = scrubStructuredFaceText(call);

  const ee =
    estimatedEdge && typeof estimatedEdge === "object" && estimatedEdge.source === "estimated_edge"
      ? estimatedEdge
      : null;
  const eeModel = buildEstimatedEdgeCardModel(ee);

  const headline = pickSharpBriefHeadline(callScrub, edgeDisplay, callType, sport);
  const statGrid = buildSharpBriefStatGrid({
    estimatedEdge: ee,
    takeMeta,
    structured: { call: callScrub, confidence, callType },
  });

  const contextLine = [
    inferMarketPill(callScrub, callType),
    showLiveRibbon ? "Live" : "Tonight",
  ].join(" · ");

  const modePill =
    ee && eeModel ? (
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
      <span className="ur-v2-mode-pill ur-v2-mode-pill--structural">Structural read</span>
    );

  const shareBody = [whyNowDisplay, edgeDisplay].filter(Boolean);

  return (
    <div className="mt-1 ur-take-structured ur-take-response ur-v2-card">
      <div className="ur-v2-sport-bar">
        <span className="ur-v2-sport-bar-tag">{sportTag}</span>
        <span className="ur-v2-sport-bar-dot" aria-hidden>
          ·
        </span>
        <span className="ur-v2-sport-bar-ctx">{contextLine}</span>
        <span className="ur-v2-sport-bar-spacer" />
        {modePill}
      </div>

      <div className="ur-v2-body-pad">
        <h2
          className={`ur-v2-headline ${animMounted ? "ur-v2-headline--in" : ""}`}
          style={{ opacity: animMounted ? 1 : 0 }}
        >
          {headline}
        </h2>

        <div className="ur-v2-pill-row">
          <span className="ur-v2-mini-pill">{inferEdgeTypePill(callType)}</span>
          <span className="ur-v2-mini-pill">{inferMarketPill(callScrub, callType)}</span>
          <span className="ur-v2-mini-pill ur-v2-mini-pill--muted">{matchupPillText(gameStateLine, userQuestion)}</span>
        </div>

        <div className="ur-v2-stat-grid">
          {statGrid.slots.map((slot) => (
            <div
              key={slot.key}
              className={`ur-v2-stat-cell${slot.highlight ? " ur-v2-stat-cell--hi" : ""}`}
            >
              <div className="ur-v2-stat-label">{slot.label}</div>
              <div className="ur-v2-stat-value">{slot.value}</div>
            </div>
          ))}
        </div>

        <div className="ur-v2-divider" />

        <div className="ur-v2-body-copy">
          <p className="ur-v2-body-p">{whyNowDisplay}</p>
          <p className="ur-v2-body-p">{edgeDisplay}</p>

          {ee && eeModel ? (
            <div className="ur-v2-ee-prose">
              <p className="ur-v2-body-p ur-v2-muted">
                <span className="ur-v2-inline-label">Why this tier</span> {eeModel.whyTierBody}
              </p>
              {eeModel.layout === "thin" ? (
                <>
                  <p className="ur-v2-body-p">
                    <span className="ur-v2-inline-label">{eeModel.leanHeading}</span> {eeModel.leanBody}
                  </p>
                  {eeModel.drivers.length > 0 ? (
                    <ul className="ur-v2-driver-list">
                      {eeModel.drivers.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : (
                <>
                  {eeModel.numericRows.map((row) => (
                    <p key={row.key} className="ur-v2-body-p">
                      <span className="ur-v2-inline-label">{row.label}</span> {row.value}
                    </p>
                  ))}
                  {eeModel.drivers.length > 0 ? (
                    <ul className="ur-v2-driver-list">
                      {eeModel.drivers.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          {Array.isArray(caveats) && caveats.length > 0 ? (
            <ul className="ur-v2-caveats">
              {caveats.map((c, idx) => (
                <li key={idx}>{c}</li>
              ))}
            </ul>
          ) : null}
        </div>

        {callType === "parlay" && Array.isArray(parlayLegs) && parlayLegs.length > 0 ? (
          <div className="ur-v2-parlay-block">
            <div className="ur-v2-parlay-title">Parlay legs</div>
            <div className="ur-v2-parlay-legs">
              {parlayLegs.map((leg, idx) => (
                <div key={`${leg.play}-${idx}`} className="ur-v2-parlay-leg">
                  <div className="ur-v2-parlay-leg-head">
                    <span className="ur-v2-parlay-play">{leg.play}</span>
                    {leg.odds && leg.odds !== "TBD" ? (
                      <span className="ur-v2-parlay-odds">{leg.odds}</span>
                    ) : null}
                  </div>
                  {leg.rationale && String(leg.rationale).trim() ? (
                    <div className="ur-v2-parlay-rationale">{leg.rationale}</div>
                  ) : null}
                </div>
              ))}
            </div>
            {parlayTotalOdds && parlayTotalOdds !== "TBD" ? (
              <div className="ur-v2-parlay-combined">
                <div className="ur-v2-parlay-combined-label">Combined price {parlayTotalOdds}</div>
                <div className="ur-v2-parlay-explainer">{buildParlayCombinedExplainer(parlayLegs, parlayTotalOdds)}</div>
              </div>
            ) : null}
          </div>
        ) : null}

        {followUpSource?.followUps?.length > 0 && typeof onFollowUpPick === "function" ? (
          <div className="ur-v2-inline-followups">
            <UrTakeDockedFollowUps source={followUpSource} onPick={onFollowUpPick} />
          </div>
        ) : null}

        <div className="ur-v2-footer-row">
          {formattedTimestamp ? (
            <span className="ur-v2-ts">{formattedTimestamp}</span>
          ) : (
            <span />
          )}
          <UrTakeShareButton headline={headline} bodyChunks={shareBody} />
        </div>
      </div>
    </div>
  );
}
