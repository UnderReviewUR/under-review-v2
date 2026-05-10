import { useEffect, useState } from "react";
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

function confidencePillClass(tier) {
  const t = String(tier || "");
  if (t === "High") return "ur-conf-pill-high";
  if (t === "Medium") return "ur-conf-pill-medium";
  if (t === "Speculative") return "ur-conf-pill-speculative";
  return "ur-conf-pill-speculative";
}

/** Strip internal prompt / UI scaffolding that sometimes leaks into structured JSON. */
function scrubStructuredFaceText(text) {
  let s = String(text || "");
  const patterns = [
    /\bLegs below are shown in the structured card[^.!?\n]*/gi,
    /\byour full write-up stays in the thread\.?/gi,
    /\blayout is extracted from plain text\.?/gi,
  ];
  for (const re of patterns) {
    s = s.replace(re, " ");
  }
  return s.replace(/\s{2,}/g, " ").replace(/^\s+|\s+$/g, "").trim();
}

/**
 * Structured UR Take card — Option C (API `structured`).
 */
export default function URTakeResponse({
  sport,
  question: _question,
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
}) {
  const [animMounted, setAnimMounted] = useState(false);
  useEffect(() => {
    setAnimMounted(true);
  }, []);
  const pillCls = confidencePillClass(confidence);
  const formattedTimestamp = formatTimestamp(timestamp);
  const sportTag = `${String(sport || "generic").toUpperCase()} · ${callType || "—"}`;

  const liveRibbon =
    String(liveScore || "").trim() ||
    String(gameStateLine || "").trim() ||
    "";
  const showLiveHeader = liveRibbon.length > 0;

  const whyNowDisplay = scrubStructuredFaceText(whyNow) || "—";
  const edgeDisplay = scrubStructuredFaceText(edge) || "—";

  return (
    <div className="mt-1 ur-take-structured ur-take-response">
      <div className="ur-card-root">
        <div className="ur-card-accent-bar" />

        <div className="ur-card-header" style={{ paddingTop: "calc(14px + 4px)" }}>
          <span className="ur-card-sport-tag">{sportTag}</span>
          {showLiveHeader ? (
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#4ade80]" />
              <span className="font-mono text-[11px] text-[#4ade80]">{liveRibbon}</span>
            </div>
          ) : (
            <span className={pillCls}>{confidence}</span>
          )}
        </div>

        <div className="ur-card-body">
          <div
            className={
              animMounted ? "ur-card-headline ur-response-headline" : "ur-card-headline"
            }
            style={{ opacity: animMounted ? undefined : 0 }}
          >
            {call}
          </div>

          <div className="mb-4">
            <div className="ur-labeled-block-label">WHY NOW</div>
            <div className="text-[13px] text-white/[0.6] leading-relaxed pl-3">{whyNowDisplay}</div>
          </div>

          <div className="ur-edge-block">
            <div className="ur-edge-block-label">EDGE</div>
            <div className="text-[13px] text-white/[0.7] leading-relaxed">{edgeDisplay}</div>
          </div>

          {Array.isArray(caveats) && caveats.length > 0 ? (
            <div className="mb-4">
              <div className="ur-labeled-block-label">CAVEATS</div>
              <ul className="m-0 list-disc space-y-1.5 pl-[18px] text-[13px] leading-relaxed text-white/[0.65]">
                {caveats.map((c, idx) => (
                  <li key={idx}>{c}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {callType === "parlay" && Array.isArray(parlayLegs) && parlayLegs.length > 0 ? (
            <div className="mt-7 pt-5 border-t border-white/[0.06]">
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/[0.25] mb-3">
                PARLAY LEGS
              </div>
              <div className="flex flex-col">
                {parlayLegs.map((leg, idx) => (
                  <div key={`${leg.play}-${idx}`} className="ur-pick-row">
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                      <span className="min-w-0 flex-1 text-[14px] font-semibold leading-snug text-white">
                        {leg.play}
                      </span>
                      {leg.odds && leg.odds !== "TBD" ? (
                        <span className="shrink-0 font-mono text-[10px] leading-snug text-white/35">
                          {leg.odds}
                        </span>
                      ) : null}
                    </div>
                    {leg.rationale && String(leg.rationale).trim() ? (
                      <div className="mt-2 text-[12px] leading-snug text-white/[0.55]">{leg.rationale}</div>
                    ) : null}
                  </div>
                ))}
              </div>
              {parlayTotalOdds && parlayTotalOdds !== "TBD" ? (
                <div className="mt-4 border-t border-white/[0.06] pt-3 font-mono text-[10px] tracking-wide text-white/40">
                  Combined price {parlayTotalOdds}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="ur-card-footer">
          {formattedTimestamp ? (
            <span className="font-mono text-[10px] text-white/[0.25]">{formattedTimestamp}</span>
          ) : (
            <span />
          )}
          {showLiveHeader ? (
            <div className="flex items-center gap-2">
              {confidence ? <span className={pillCls}>{confidence}</span> : null}
              <UrTakeShareButton headline={call} bodyChunks={[edgeDisplay]} />
            </div>
          ) : (
            <UrTakeShareButton headline={call} bodyChunks={[edgeDisplay]} />
          )}
        </div>
      </div>
    </div>
  );
}
