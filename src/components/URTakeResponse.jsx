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

  return (
    <div className="mt-1 ur-take-structured ur-take-response">
      <div className="ur-card-root">
        <div className="ur-card-accent-bar" />

        <div className="ur-card-header">
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
            <div className="text-[13px] text-white/[0.6] leading-relaxed pl-3">{whyNow}</div>
          </div>

          <div className="ur-edge-block">
            <div className="ur-edge-block-label">EDGE</div>
            <div className="text-[13px] text-white/[0.7] leading-relaxed">{edge}</div>
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
            <div className="mt-5">
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/[0.25] mb-2">
                PARLAY LEGS
              </div>
              <div className="flex flex-col gap-2">
                {parlayLegs.map((leg, idx) => (
                  <div
                    key={`${leg.play}-${idx}`}
                    className="rounded-[10px] border border-white/[0.07] bg-white/[0.03] px-3.5 py-3"
                  >
                    <div className="text-[14px] font-semibold text-white mb-1">{leg.play}</div>
                    {leg.rationale && String(leg.rationale).trim() ? (
                      <div className="text-[12px] text-white/[0.55] leading-snug">{leg.rationale}</div>
                    ) : null}
                    {leg.odds && leg.odds !== "TBD" ? (
                      <div className="mt-1 font-mono text-[10px] text-white/[0.35]">Odds: {leg.odds}</div>
                    ) : null}
                  </div>
                ))}
              </div>
              {parlayTotalOdds && parlayTotalOdds !== "TBD" ? (
                <div className="mt-2.5 font-mono text-[11px] text-white/70">Ticket odds: {parlayTotalOdds}</div>
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
              <UrTakeShareButton headline={call} bodyChunks={[edge]} />
            </div>
          ) : (
            <UrTakeShareButton headline={call} bodyChunks={[edge]} />
          )}
        </div>
      </div>
    </div>
  );
}
