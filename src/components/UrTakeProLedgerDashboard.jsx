import {
  mergeTierSnapshots,
  normalizeConfidenceTier,
  sportDisplayLabel,
} from "../lib/urTakePerformance.js";

function mergeSportSnapshots(a, b) {
  if (!a && !b) return null;
  if (!a) return { ...b };
  if (!b) return { ...a };
  const wins = (a.wins || 0) + (b.wins || 0);
  const losses = (a.losses || 0) + (b.losses || 0);
  const pushes = (a.pushes || 0) + (b.pushes || 0);
  const settled = (a.settled || 0) + (b.settled || 0);
  const total = (a.total || 0) + (b.total || 0);
  const roiUnits = (Number(a.roiUnits) || 0) + (Number(b.roiUnits) || 0);
  return {
    wins,
    losses,
    pushes,
    settled,
    total,
    roiUnits: Number(roiUnits.toFixed(2)),
    winRate: settled ? wins / settled : 0,
    roiPct: settled ? (roiUnits / settled) * 100 : 0,
    pending: (a.pending || 0) + (b.pending || 0),
    tracked: (a.tracked || 0) + (b.tracked || 0),
  };
}

const SPORT_ROWS = [
  { keys: ["nba"], label: "NBA" },
  { keys: ["mlb"], label: "MLB" },
  { keys: ["golf"], label: "PGA" },
  { keys: ["tennis", "tennis_wta_profile"], label: "Tennis" },
  { keys: ["f1"], label: "F1" },
];

function formatShortDate(iso) {
  const d = Date.parse(iso || "");
  if (!Number.isFinite(d)) return "—";
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

function pickSummaryLine(take) {
  const line = String(take?.playLine || "").trim();
  if (line) return line.slice(0, 35);
  const q = String(take?.question || "").trim();
  return q ? q.slice(0, 35) : "—";
}

function formatPct01(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return `${Math.round(Number(n) * 100)}%`;
}

function formatNum(n, digits = 2) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return Number(n).toFixed(digits);
}

function downloadLedgerCsv(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const headers = [
    "createdAt",
    "sport",
    "playLine",
    "confidence",
    "status",
    "result",
    "eeSport",
    "eeMarketType",
    "eeSubject",
    "eeDataQuality",
    "eeConfidence",
    "eeProjectionPresent",
    "eeFairLinePresent",
    "eeLeanReadPresent",
    "eeUserBetSignal",
    "eeGradedResult",
    "eeGradedAt",
    "eeMissDistance",
  ];
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.join(","),
    ...list.map((r) => {
      const m = r.estimatedEdgeMeta;
      const o = m?.outcome;
      const flat = {
        createdAt: r.createdAt,
        sport: r.sport,
        playLine: r.playLine,
        confidence: r.confidence,
        status: r.status,
        result: r.result,
        eeSport: m?.sport ?? "",
        eeMarketType: m?.marketType ?? "",
        eeSubject: m?.subject ?? "",
        eeDataQuality: m?.dataQuality ?? "",
        eeConfidence: m?.confidence ?? "",
        eeProjectionPresent: m?.projectionPresent === true ? "yes" : m?.projectionPresent === false ? "no" : "",
        eeFairLinePresent: m?.fairLinePresent === true ? "yes" : m?.fairLinePresent === false ? "no" : "",
        eeLeanReadPresent: m?.leanReadPresent === true ? "yes" : m?.leanReadPresent === false ? "no" : "",
        eeUserBetSignal:
          m?.userBetSignal ??
          (r.betSignal && typeof r.betSignal === "object" && "betYes" in r.betSignal
            ? r.betSignal.betYes
              ? "yes"
              : "no"
            : ""),
        eeGradedResult: o?.result ?? "",
        eeGradedAt: o?.gradedAt ?? "",
        eeMissDistance: o?.missDistance != null ? String(o.missDistance) : "",
      };
      return headers.map((h) => esc(flat[h])).join(",");
    }),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ur-take-ledger.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * Pro tab — ledger-backed record (POST /api/performance). Free users see a teaser gate.
 */
export default function UrTakeProLedgerDashboard({
  accessTier,
  userEmail,
  publicStats,
  performanceData,
  performanceLoading,
  performanceError,
  onRefresh,
  onUpgrade,
}) {
  const paid = accessTier !== "free";
  const isOwner = accessTier === "owner";
  const teaserTotal =
    publicStats?.totalTakes != null ? publicStats.totalTakes.toLocaleString() : "—";

  if (!paid) {
    return (
      <div className="ur-record-gate">
        <div className="ur-record-teaser">{teaserTotal} edges tracked this season</div>
        <div className="ur-record-unlock">Full record unlocked with Pro</div>
        <button type="button" className="ur-upgrade-btn" onClick={() => onUpgrade?.()}>
          Upgrade to Pro
        </button>
      </div>
    );
  }

  const email = String(userEmail || "").trim();
  if (!email) {
    return (
      <div className="ur-record-dashboard-wrap">
        <div className="ur-record-heading">Win–loss record</div>
        <p className="ur-record-muted">Sign in with your email to load your tracked ledger.</p>
      </div>
    );
  }

  if (performanceError) {
    return (
      <div className="ur-record-dashboard-wrap">
        <div className="ur-record-heading">Win–loss record</div>
        <p className="ur-record-err">{performanceError}</p>
      </div>
    );
  }

  if (!performanceData && performanceLoading) {
    return (
      <div className="ur-record-dashboard-wrap">
        <div className="ur-record-heading">Win–loss record</div>
        <p className="ur-record-muted">Loading…</p>
      </div>
    );
  }

  if (!performanceData) {
    return (
      <div className="ur-record-dashboard-wrap">
        <div className="ur-record-heading">Win–loss record</div>
        <p className="ur-record-muted">No performance data yet.</p>
      </div>
    );
  }

  const summary = performanceData.summary || {};
  const wins = summary.wins ?? 0;
  const losses = summary.losses ?? 0;
  const pushes = summary.pushes ?? 0;
  const total = summary.total ?? 0;
  const roi = Number(summary.roiUnits) || 0;
  const tiers = mergeTierSnapshots(performanceData.byConfidence);
  const bySport = performanceData.bySport || {};

  const sportBlocks = SPORT_ROWS.map(({ keys, label }) => {
    let snap = null;
    for (const k of keys) {
      snap = mergeSportSnapshots(snap, bySport[k]);
    }
    if (!snap || snap.total < 3) return null;
    const ru = Number(snap.roiUnits) || 0;
    const wr = snap.settled ? Math.round(snap.winRate * 100) : 0;
    return (
      <div key={label} className="ur-record-data-row">
        <span>{label}</span>
        <span className="ur-record-mono">
          {snap.wins}-{snap.losses}-{snap.pushes}
        </span>
        <span className="ur-record-mono">
          {ru > 0 ? "+" : ""}
          {ru.toFixed(1)}u
        </span>
        <span className="ur-record-mono">{wr}%</span>
      </div>
    );
  }).filter(Boolean);

  const last10 = (performanceData.recent || [])
    .filter((t) => t.status === "settled")
    .slice(0, 10);

  const ledgerRows = performanceData.ledgerRows || performanceData.recent || [];

  const ee = performanceData.estimatedEdge;
  const eeSportEntries =
    ee && ee.bySport ? Object.entries(ee.bySport).sort((a, b) => b[1] - a[1]) : [];
  const eeDqOrder = ["strong", "usable", "thin", "unknown"];

  return (
    <div className="ur-record-dashboard-wrap">
      <div className="ur-record-dashboard-head">
        <div className="ur-record-heading">Win–loss record</div>
        <div className="ur-record-head-actions">
          {isOwner ? (
            <button
              type="button"
              className="ur-record-csv-btn"
              onClick={() => downloadLedgerCsv(ledgerRows)}
            >
              Download CSV
            </button>
          ) : null}
          <button
            type="button"
            className="ur-record-refresh-btn"
            onClick={() => onRefresh?.()}
            disabled={performanceLoading}
          >
            {performanceLoading ? "…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="ur-record-overall">
        <span className="ur-record-wlp">
          {wins}-{losses}-{pushes}
        </span>
        <span className="ur-record-roi">
          {roi > 0 ? "+" : ""}
          {roi.toFixed(1)}u ROI
        </span>
        <span className="ur-record-sample">{total} tracked</span>
      </div>

      <div className="ur-record-section-label">By confidence</div>
      {(["High", "Medium", "Speculative"]).map((name) => {
        const snap = tiers[name];
        const wr = snap.settled ? Math.round(snap.winRate * 100) : 0;
        const ru = Number(snap.roiUnits) || 0;
        return (
          <div key={name} className="ur-record-data-row">
            <span>{name}</span>
            <span className="ur-record-mono">
              {snap.wins}-{snap.losses}-{snap.pushes}
            </span>
            <span className="ur-record-mono">
              {ru > 0 ? "+" : ""}
              {ru.toFixed(1)}u
            </span>
            <span className="ur-record-mono">{wr}%</span>
          </div>
        );
      })}

      {sportBlocks.length > 0 ? (
        <>
          <div className="ur-record-section-label">By sport</div>
          {sportBlocks}
        </>
      ) : null}

      {ee && ee.eeTakeCount > 0 ? (
        <>
          <div className="ur-record-section-label">Estimated edge (structure)</div>
          <p className="ur-record-muted" style={{ margin: "0 0 8px" }}>
            {ee.eeTakeCount} EE take{ee.eeTakeCount === 1 ? "" : "s"} — bet signal rate (answered):{" "}
            {formatPct01(ee.overallBetYesRateAmongAnswered)}
            {ee.thinHeuristic?.thinTakes > 0 ? (
              <>
                {" "}
                · thin pass-like (heuristic): {formatPct01(ee.thinHeuristic.thinPassLikeRate)} (
                {ee.thinHeuristic.thinPassLikeCount}/{ee.thinHeuristic.thinTakes})
              </>
            ) : null}
          </p>
          {eeSportEntries.length > 0 ? (
            <>
              <div className="ur-record-muted" style={{ fontSize: "12px", marginBottom: "4px" }}>
                EE takes by sport
              </div>
              {eeSportEntries.map(([k, n]) => (
                <div key={k} className="ur-record-data-row">
                  <span>{sportDisplayLabel(k)}</span>
                  <span className="ur-record-mono">{n}</span>
                  <span />
                  <span />
                </div>
              ))}
            </>
          ) : null}
          <div className="ur-record-muted" style={{ fontSize: "12px", margin: "10px 0 4px" }}>
            By data quality (EE)
          </div>
          {eeDqOrder.map((dq) => {
            const row = ee.byDataQuality?.[dq];
            if (!row || !row.takes) return null;
            const wl = `${row.win}-${row.loss}-${row.pushes}${row.pass ? `-${row.pass}p` : ""}`;
            return (
              <div key={dq} className="ur-record-data-row">
                <span style={{ textTransform: "capitalize" }}>{dq}</span>
                <span className="ur-record-mono" title="takes">
                  n={row.takes}
                </span>
                <span className="ur-record-mono" title="bet yes among answered">
                  bet {formatPct01(row.betYesRateAmongAnswered)}
                </span>
                <span className="ur-record-mono" title="graded EE outcomes">
                  gr {row.graded} {row.graded ? `· ${wl}` : ""}
                </span>
                <span className="ur-record-mono" title="avg miss when line vs actual captured">
                  miss {formatNum(row.avgMissDistanceWhenProjectionPresent)}
                </span>
              </div>
            );
          })}
        </>
      ) : null}

      <div className="ur-record-section-label">Last 10 takes</div>
      <div className="ur-record-last-grid">
        {last10.length === 0 ? (
          <div className="ur-record-muted">No settled takes yet.</div>
        ) : (
          last10.map((t) => {
            const r = String(t.result || "").toLowerCase();
            const badge = r === "win" ? "W" : r === "loss" ? "L" : "P";
            const badgeClass = r === "win" ? "ur-badge-w" : r === "loss" ? "ur-badge-l" : "ur-badge-p";
            const tier = normalizeConfidenceTier(t.confidence);
            return (
              <div key={t.id || `${t.createdAt}-${t.playLine}`} className="ur-record-last-row">
                <span className="ur-record-mono ur-record-last-date">{formatShortDate(t.createdAt)}</span>
                <span className="ur-record-last-sport">{sportDisplayLabel(t.sport)}</span>
                <span className="ur-record-last-pick" title={t.playLine || t.question}>
                  {pickSummaryLine(t)}
                </span>
                <span className={`ur-record-result-badge ${badgeClass}`}>{badge}</span>
                <span
                  className="ur-record-conf-dot"
                  style={{
                    background:
                      tier === "High"
                        ? "#00ff87"
                        : tier === "Medium"
                          ? "#F5C842"
                          : "rgba(255,255,255,0.35)",
                  }}
                  title={tier || "—"}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
