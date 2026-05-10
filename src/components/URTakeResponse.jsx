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

/** Option C confidence pill (inline until shared CSS in appBaseCss). */
function confidencePillClass(tier) {
  const t = String(tier || "");
  if (t === "High") {
    return "text-[11px] font-medium px-3 py-0.5 rounded-[20px] bg-[rgba(74,222,128,0.1)] text-[#4ade80] border border-[rgba(74,222,128,0.25)]";
  }
  if (t === "Medium") {
    return "text-[11px] font-medium px-3 py-0.5 rounded-[20px] bg-[rgba(234,179,8,0.1)] text-[#eab308] border border-[rgba(234,179,8,0.25)]";
  }
  if (t === "Speculative") {
    return "text-[11px] font-medium px-3 py-0.5 rounded-[20px] bg-[rgba(148,163,184,0.1)] text-[#94a3b8] border border-[rgba(148,163,184,0.25)]";
  }
  return "text-[11px] font-medium px-3 py-0.5 rounded-[20px] bg-[rgba(148,163,184,0.1)] text-[#94a3b8] border border-[rgba(148,163,184,0.25)]";
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
}) {
  const [animMounted, setAnimMounted] = useState(false);
  useEffect(() => {
    setAnimMounted(true);
  }, []);
  const pillCls = confidencePillClass(confidence);
  const formattedTimestamp = formatTimestamp(timestamp);
  const sportTag = `${String(sport || "generic").toUpperCase()} · ${callType || "—"}`;

  return (
    <div className="mt-1 ur-take-structured ur-take-response">
      <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-[#111318]">
        <div
          className="h-[3px] w-full shrink-0"
          style={{ background: "linear-gradient(90deg, #6366f1, #a855f7)" }}
        />

        <div className="flex justify-between items-center px-5 py-3 bg-[#1a1d24] border-b border-white/[0.06]">
          <span className="font-mono text-[10px] tracking-[0.12em] text-[#a855f7] uppercase">{sportTag}</span>
          <span className={pillCls}>{confidence}</span>
        </div>

        <div className="px-5 pt-6 pb-6">
          <div
            className={
              animMounted
                ? "text-[20px] font-semibold text-white leading-[1.3] tracking-[-0.2px] mb-5 ur-response-headline"
                : "text-[20px] font-semibold text-white leading-[1.3] tracking-[-0.2px] mb-5"
            }
            style={{ opacity: animMounted ? undefined : 0 }}
          >
            {call}
          </div>

          <div className="mb-4">
            <div className="font-mono text-[9px] tracking-[0.18em] uppercase text-white/[0.25] mb-1.5 pl-2.5 border-l-2 border-white/[0.1] rounded-none">
              WHY NOW
            </div>
            <div className="text-[13px] text-white/[0.6] leading-relaxed pl-3" style={{ paddingLeft: "12px" }}>
              {whyNow}
            </div>
          </div>

          <div className="bg-[rgba(99,102,241,0.08)] border-l-[3px] border-l-[#6366f1] rounded-r-[10px] py-3 px-4 mb-4">
            <div className="font-mono text-[9px] tracking-[0.15em] text-[#6366f1] uppercase mb-1">EDGE</div>
            <div className="text-[13px] text-white/[0.7] leading-relaxed">{edge}</div>
          </div>

          {Array.isArray(caveats) && caveats.length > 0 ? (
            <div className="mb-4">
              <div className="font-mono text-[9px] tracking-[0.18em] uppercase text-white/[0.25] mb-1.5 pl-2.5 border-l-2 border-white/[0.1] rounded-none">
                CAVEATS
              </div>
              <ul className="m-0 list-disc space-y-1.5 pl-[18px] text-[13px] leading-relaxed text-white/[0.65]">
                {caveats.map((c, idx) => (
                  <li key={idx}>{c}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {callType === "parlay" && Array.isArray(parlayLegs) && parlayLegs.length > 0 ? (
            <div className="mt-5">
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/[0.25] mb-2">PARLAY LEGS</div>
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

        <div className="flex items-center justify-between px-5 py-2.5 bg-[#1a1d24] border-t border-white/[0.06]">
          {formattedTimestamp ? (
            <span className="font-mono text-[10px] text-white/[0.25]">{formattedTimestamp}</span>
          ) : (
            <span />
          )}
          <UrTakeShareButton headline={call} bodyChunks={[edge]} />
        </div>
      </div>
    </div>
  );
}
