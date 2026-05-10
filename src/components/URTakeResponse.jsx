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

function confidenceBadgeClasses(tier) {
  const t = String(tier || "");
  if (t === "High") return "border-emerald-400/35 bg-emerald-400/10 text-emerald-400";
  if (t === "Medium") return "border-amber-400/35 bg-amber-400/10 text-amber-400";
  if (t === "Speculative") return "border-white/12 bg-white/5 text-white/55";
  return "border-white/10 bg-black/20 text-white/50";
}

/**
 * Structured UR Take card — rendered when API returns `structured`.
 * Design sections: THE CALL, CONFIDENCE, EDGE, DEEP ANALYSIS, CAVEATS.
 */
export default function URTakeResponse({
  sport,
  question,
  call,
  confidence,
  whyNow,
  edge,
  callType,
  analysis,
  caveats,
  parlayLegs,
  parlayTotalOdds,
  timestamp,
}) {
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [animMounted, setAnimMounted] = useState(false);
  useEffect(() => {
    setAnimMounted(true);
  }, []);
  const badgeCls = confidenceBadgeClasses(confidence);
  const formattedTimestamp = formatTimestamp(timestamp);

  return (
    <div className="mt-1 ur-take-structured ur-take-response">
      <div className="relative pb-11 rounded-xl border border-[rgba(0,245,233,0.25)] bg-[rgba(0,245,233,0.04)] p-4 shadow-[0_0_24px_rgba(0,245,233,0.06)]">
        {/* THE CALL */}
        <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-white/45">THE CALL · {sport || "—"}</div>
        <div
          className={animMounted ? "mb-4 font-sans text-[17px] font-semibold leading-snug text-white/95 ur-response-headline" : "mb-4 font-sans text-[17px] font-semibold leading-snug text-white/95"}
          style={{ opacity: animMounted ? undefined : 0 }}
        >
          {call}
        </div>

        <div className="flex flex-col gap-4">
          <div
            className={
              animMounted
                ? "text-[13px] leading-relaxed text-white/82 ur-response-chunk"
                : "text-[13px] leading-relaxed text-white/82"
            }
            style={{ opacity: animMounted ? undefined : 0 }}
          >
            <strong className="text-[rgba(0,245,233,0.85)]">Why now:</strong> {whyNow}
          </div>

          {/* CONFIDENCE */}
          <div
            className={
              animMounted ? "ur-response-closing" : undefined
            }
            style={{ opacity: animMounted ? undefined : 0 }}
          >
            <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-white/45">CONFIDENCE</div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-wide ${badgeCls}`}>
                {confidence}
              </span>
              <span className="font-mono text-[10px] text-white/45">{callType}</span>
            </div>
          </div>

          {/* EDGE */}
          <div
            className={
              animMounted
                ? "text-[13px] leading-relaxed text-white/78 ur-response-chunk"
                : "text-[13px] leading-relaxed text-white/78"
            }
            style={{ opacity: animMounted ? undefined : 0 }}
          >
            <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-white/45">EDGE</div>
            <p className="m-0">{edge}</p>
          </div>
        </div>
        <div className="ur-take-share-anchor">
          <UrTakeShareButton headline={call} bodyChunks={[edge]} />
        </div>
      </div>

      {question ? (
        <div className="mt-2.5 font-mono text-[10px] leading-snug text-white/45">Q: {question}</div>
      ) : null}

      {/* DEEP ANALYSIS */}
      <div className="mt-3.5">
        <button
          type="button"
          className="quick-btn text-[11px]"
          onClick={() => setAnalysisOpen((o) => !o)}
        >
          {analysisOpen ? "Hide deep analysis" : "Deep analysis"}
        </button>
        {analysisOpen && analysis && typeof analysis === "object" ? (
          <div className="mt-3 rounded-[10px] border border-white/10 bg-black/20 p-3 text-[12px] leading-relaxed text-white/82">
            <div className="mb-3 font-mono text-[9px] uppercase tracking-[0.15em] text-white/45">DEEP ANALYSIS</div>
            {[
              ["Matchup", analysis.matchupAnalysis],
              ["Injuries & availability", analysis.injuryContext],
              ["Market", analysis.marketContext],
              ["Line movement", analysis.lineMovement],
              ["Statistical edge", analysis.statisticalEdge],
            ].map(([label, val]) => (
              <div key={label} className="mb-3 last:mb-0">
                <div className="mb-1 font-mono text-[9px] uppercase tracking-wider text-white/45">{label}</div>
                <div>{val}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* CAVEATS */}
      {Array.isArray(caveats) && caveats.length > 0 ? (
        <div className="mt-3.5">
          <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-orange-400/90">CAVEATS</div>
          <ul className="m-0 list-disc space-y-1.5 pl-[18px] text-[12px] leading-snug text-white/78">
            {caveats.map((c, idx) => (
              <li key={idx}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {callType === "parlay" && Array.isArray(parlayLegs) && parlayLegs.length > 0 ? (
        <div className="mt-3.5">
          <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-white/45">PARLAY LEGS</div>
          <div className="flex flex-col gap-2.5">
            {parlayLegs.map((leg, idx) => (
              <div key={`${leg.play}-${idx}`} className="rounded-lg border border-white/10 p-3 text-[12px] leading-snug">
                <div className="mb-1 font-semibold">{leg.play}</div>
                <div className="text-white/75">{leg.rationale}</div>
                <div className="mt-1.5 font-mono text-[10px] text-white/45">Odds: {leg.odds}</div>
              </div>
            ))}
          </div>
          {parlayTotalOdds ? (
            <div className="mt-2.5 font-mono text-[11px] text-white/70">Ticket odds: {parlayTotalOdds}</div>
          ) : null}
        </div>
      ) : null}

      {formattedTimestamp ? (
        <div className="mt-3 font-mono text-[9px] text-white/45">{formattedTimestamp}</div>
      ) : null}
    </div>
  );
}
