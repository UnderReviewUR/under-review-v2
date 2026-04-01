import { useRef } from "react";
import AskBar from "../components/AskBar";
import ChatThread from "../components/ChatThread";

export default function MatchupScreen({
  selectedMatchup,
  matchupMsgs,
  matchupInput,
  setMatchupInput,
  pastedImage,
  clearImage,
  isAsking,
  processImageFile,
  fileInputRef,
  onSubmitMatchup,
  onBack,
}) {
  const inputRef = useRef(null);
  if (!selectedMatchup) return null;

  return (
    <main className="screen">
      <button className="detail-back" onClick={onBack}>← BACK</button>

      <div className="detail-card">
        <div className="detail-head">
          <div className="detail-league" style={{ color: selectedMatchup.leagueColor }}>{selectedMatchup.league}</div>
          <div className="detail-title">{selectedMatchup.title}</div>
          <div className="detail-sub">{selectedMatchup.time} · {selectedMatchup.network}</div>
        </div>

        <div className="what-matters">
          <div className="wm-label">Match Snapshot</div>
          <div className="wm-text">{selectedMatchup.whatMatters || "Ask for the side, total, props, or live angle."}</div>
        </div>

        {selectedMatchup.stats?.length > 0 && (
          <div className="mini-grid">
            {selectedMatchup.stats.map((s) => (
              <div key={s.label} className="mini-stat">
                <div className="mini-label">{s.label}</div>
                <div className="mini-value">{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {selectedMatchup.quickHitters?.length > 0 && (
          <div className="quick-hitters">
            {selectedMatchup.quickHitters.map((q) => (
              <button key={q} className="quick-btn" onClick={() => onSubmitMatchup(q)}>{q}</button>
            ))}
          </div>
        )}
      </div>

      <ChatThread msgs={matchupMsgs} />

      <AskBar
        inputRef={inputRef}
        fileInputRef={fileInputRef}
        value={matchupInput}
        onChange={setMatchupInput}
        onSubmit={() => onSubmitMatchup()}
        placeholder={`Ask about ${selectedMatchup.title}...`}
        pastedImage={pastedImage}
        clearImage={clearImage}
        isAsking={isAsking}
        processImageFile={processImageFile}
      />
    </main>
  );
}
