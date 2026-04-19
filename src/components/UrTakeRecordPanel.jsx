import { mergeTierSnapshots, sportDisplayLabel } from "../lib/urTakePerformance.js";

const panelStyle = {
  marginTop: 12,
  marginBottom: 8,
  padding: "14px 14px 16px",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 14,
};

const headingStyle = {
  fontFamily: "var(--mono-font)",
  fontSize: 11,
  letterSpacing: 2,
  color: "var(--cyan-bright)",
  textTransform: "uppercase",
  marginBottom: 10,
};

const sectionLabel = {
  fontFamily: "var(--mono-font)",
  fontSize: 9,
  letterSpacing: 1.2,
  color: "var(--muted)",
  textTransform: "uppercase",
  marginTop: 12,
  marginBottom: 4,
};

const bodyStyle = { fontSize: 12, color: "var(--soft)", lineHeight: 1.55 };

function pillColor(result) {
  if (result === "win") return "#00E676";
  if (result === "loss") return "#FF6B6B";
  return "#FFD166";
}

/**
 * @param {object} props
 * @param {string} props.userEmail
 * @param {object | null} props.performanceData
 * @param {boolean} props.performanceLoading
 * @param {string} props.performanceError
 * @param {() => void} props.onRefresh
 */
export default function UrTakeRecordPanel({
  userEmail,
  performanceData,
  performanceLoading,
  performanceError,
  onRefresh,
}) {
  if (!userEmail) {
    return (
      <div style={panelStyle}>
        <div style={headingStyle}>UR TAKE RECORD</div>
        <div style={{ ...bodyStyle, color: "var(--muted)" }}>
          Set your email to see your tracked record here.
        </div>
      </div>
    );
  }

  if (performanceError) {
    return (
      <div style={panelStyle}>
        <div style={headingStyle}>UR TAKE RECORD</div>
        <div style={{ fontSize: 12, color: "#FF6B6B" }}>{performanceError}</div>
      </div>
    );
  }

  if (!performanceData && performanceLoading) {
    return (
      <div style={panelStyle}>
        <div style={headingStyle}>UR TAKE RECORD</div>
        <div style={{ ...bodyStyle, color: "var(--muted)" }}>Loading performance…</div>
      </div>
    );
  }

  const summary = performanceData?.summary;
  const settled = summary?.settled ?? 0;

  if (!performanceData || settled === 0) {
    return (
      <div style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={headingStyle}>UR TAKE RECORD</div>
          <button
            type="button"
            className="quick-btn"
            onClick={() => onRefresh?.()}
            style={{ fontSize: 10, padding: "6px 10px", flexShrink: 0 }}
            disabled={performanceLoading}
          >
            {performanceLoading ? "…" : "Refresh"}
          </button>
        </div>
        <div style={{ ...bodyStyle, color: "var(--soft)" }}>
          No settled takes yet. Results appear here as games finish.
        </div>
        {summary != null && (summary.pending > 0 || summary.tracked > 0) && (
          <div style={{ ...bodyStyle, fontSize: 11, color: "var(--muted)", marginTop: 8 }}>
            {summary.pending > 0 && <span>{summary.pending} awaiting results · </span>}
            {summary.tracked > 0 && <span>{summary.tracked} tracked</span>}
          </div>
        )}
      </div>
    );
  }

  const tiers = mergeTierSnapshots(performanceData.byConfidence);
  const bySport = performanceData.bySport || {};
  const sportKeys = Object.keys(bySport).sort((a, b) => {
    const sa = bySport[a]?.settled || 0;
    const sb = bySport[b]?.settled || 0;
    if (sb !== sa) return sb - sa;
    return a.localeCompare(b);
  });

  const recentSettled = (performanceData.recent || [])
    .filter((t) => t.status === "settled")
    .slice(0, 5);

  const wrPct = Math.round((summary.winRate || 0) * 100);
  const roiU = Number(summary.roiUnits) || 0;
  const roiPct = summary.roiPct ?? 0;

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
        <div style={headingStyle}>UR TAKE RECORD</div>
        <button
          type="button"
          className="quick-btn"
          onClick={() => onRefresh?.()}
          style={{ fontSize: 10, padding: "6px 10px", flexShrink: 0 }}
          disabled={performanceLoading}
        >
          {performanceLoading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div style={sectionLabel}>Overall</div>
      <div style={bodyStyle}>
        {summary.wins}-{summary.losses}-{summary.pushes} ({wrPct}%) | {roiU > 0 ? "+" : ""}
        {roiU.toFixed(2)} units ({roiPct > 0 ? "+" : ""}
        {Number(roiPct).toFixed(1)}%)
        <br />
        {summary.tracked ?? 0} tracked | {summary.pending ?? 0} awaiting results
      </div>

      <div style={sectionLabel}>By confidence</div>
      {(["High", "Medium", "Speculative"]).map((name) => {
        const snap = tiers[name];
        const wr = snap.settled ? Math.round(snap.winRate * 100) : 0;
        const ru = Number(snap.roiUnits) || 0;
        return (
          <div key={name} style={{ ...bodyStyle, marginBottom: 4 }}>
            {name}: {snap.wins}-{snap.losses} ({wr}%) | {ru > 0 ? "+" : ""}
            {ru.toFixed(1)}u
          </div>
        );
      })}

      <div style={sectionLabel}>By sport</div>
      {sportKeys.length === 0 ? (
        <div style={{ ...bodyStyle, color: "var(--muted)" }}>—</div>
      ) : (
        sportKeys.map((k) => {
          const snap = bySport[k];
          const ru = Number(snap?.roiUnits) || 0;
          return (
            <div key={k} style={{ ...bodyStyle, marginBottom: 4 }}>
              {sportDisplayLabel(k)}: {snap.wins}-{snap.losses} | {ru > 0 ? "+" : ""}
              {ru.toFixed(1)}u
            </div>
          );
        })
      )}

      <div style={sectionLabel}>Recent takes</div>
      <div style={{ display: "grid", gap: 6 }}>
        {recentSettled.length === 0 ? (
          <div style={{ ...bodyStyle, color: "var(--muted)", fontSize: 11 }}>No settled takes in your recent list yet.</div>
        ) : (
          recentSettled.map((take) => {
            const r = String(take.result || "").toLowerCase();
            const label = r === "win" ? "W" : r === "loss" ? "L" : "P";
            return (
              <div
                key={take.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "8px 10px",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text)",
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    minWidth: 0,
                  }}
                >
                  {take.playLine || "Take"}
                </div>
                <div
                  style={{
                    fontFamily: "var(--mono-font)",
                    fontSize: 10,
                    letterSpacing: 1,
                    color: pillColor(r),
                    flexShrink: 0,
                  }}
                >
                  {label}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
