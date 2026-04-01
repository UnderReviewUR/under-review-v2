import { useRef } from "react";
import AskBar from "../components/AskBar";
import { formatServeStats, formatReturnStats, formatOverallStats } from "../lib/tennis";

export default function PlayerScreen({
  selectedPlayerName,
  players,
  tennisInput,
  setTennisInput,
  pastedImage,
  clearImage,
  isAsking,
  processImageFile,
  fileInputRef,
  onSubmitTennis,
  onBack,
}) {
  const inputRef = useRef(null);

  const pd = selectedPlayerName && players
    ? (players.atp?.[selectedPlayerName] || players.wta?.[selectedPlayerName] || null)
    : null;

  if (!pd) return null;

  return (
    <main className="screen">
      <button className="detail-back" onClick={onBack}>← BACK</button>

      <div className="detail-card">
        <div className="detail-head">
          <div className="detail-league" style={{ color:"var(--cyan-bright)" }}>TENNIS PLAYER PROFILE</div>
          <div className="detail-title">{selectedPlayerName}</div>
          <div className="detail-sub">
            {Array.isArray(pd.style) ? pd.style.join(", ").replaceAll("_"," ") : pd.style} · Elo {pd.elo}
          </div>
        </div>

        <div className="what-matters">
          <div className="wm-label">Surface Notes</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginTop:8 }}>
            {[["HARD","var(--cyan-bright)",pd.surfaceNote?.hard],["CLAY","var(--gold)",pd.surfaceNote?.clay],["GRASS","var(--green)",pd.surfaceNote?.grass]].map(([label,color,note]) => (
              <div key={label} className="mini-stat">
                <div className="mini-label">{label}</div>
                <div className="mini-value" style={{ color }}>•</div>
                <div style={{ fontSize:10, color:"var(--muted)", marginTop:2 }}>{note || "—"}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding:"0 14px 14px" }}>
          <div className="wm-label" style={{ marginBottom:8 }}>2026 Form</div>
          <div style={{ background:"var(--surface-2)", borderRadius:10, padding:10, fontSize:13, color:"var(--soft)", lineHeight:1.5 }}>{pd.record2026 || "—"}</div>
        </div>

        <div className="what-matters" style={{ paddingTop:0 }}>
          <div className="wm-label">Serve</div>
          <div style={{ fontSize:13, color:"var(--soft)", lineHeight:1.5 }}>{formatServeStats(pd.serveStats)}</div>
        </div>

        <div className="what-matters" style={{ paddingTop:0 }}>
          <div className="wm-label">Return</div>
          <div style={{ fontSize:13, color:"var(--soft)", lineHeight:1.5 }}>{formatReturnStats(pd.returnStats)}</div>
        </div>

        <div className="what-matters" style={{ paddingTop:0 }}>
          <div className="wm-label">Overall</div>
          <div style={{ fontSize:13, color:"var(--soft)", lineHeight:1.5 }}>{formatOverallStats(pd.overallStats)}</div>
        </div>

        {pd.miamiNote && (
          <div className="what-matters" style={{ paddingTop:0 }}>
            <div className="wm-label" style={{ color:"var(--mag)" }}>Tournament Note</div>
            <div style={{ fontSize:13, color:"var(--soft)", lineHeight:1.55 }}>{pd.miamiNote}</div>
          </div>
        )}
        {pd.fullNote && (
          <div className="what-matters" style={{ paddingTop:0 }}>
            <div className="wm-label">UR Take</div>
            <div style={{ fontSize:13, color:"var(--soft)", lineHeight:1.55 }}>{pd.fullNote}</div>
          </div>
        )}
      </div>

      <AskBar
        inputRef={inputRef}
        fileInputRef={fileInputRef}
        value={tennisInput}
        onChange={setTennisInput}
        onSubmit={() => onSubmitTennis()}
        placeholder={`Ask about ${selectedPlayerName}...`}
        pastedImage={pastedImage}
        clearImage={clearImage}
        isAsking={isAsking}
        processImageFile={processImageFile}
      />
    </main>
  );
}
