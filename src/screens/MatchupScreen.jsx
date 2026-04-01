import { useRef } from "react";
import AskBar from "../components/AskBar";
import ChatThread from "../components/ChatThread";

export default function MatchupScreen({
  selectedMatchup,
  matchupMsgs,
  matchupInput,
  setMatchupInput,
  onSubmitMatchup,
  onBack,
  isAsking,
  pastedImage,
  clearImage,
  processImageFile,
  fileInputRef,
}) {
  const inputRef = useRef(null);

  return (
    <main className="screen">
      <section className="hero">
        <div className="hero-title">{selectedMatchup?.title || "Matchup"}</div>
        {selectedMatchup?.blurb && <div className="hero-sub">{selectedMatchup.blurb}</div>}
      </section>

      <button type="button" onClick={onBack} className="prompt-chip" style={{ marginBottom: 10 }}>
        ← Back
      </button>

      <AskBar
        inputRef={inputRef}
        fileInputRef={fileInputRef}
        value={matchupInput}
        onChange={setMatchupInput}
        onSubmit={onSubmitMatchup}
        placeholder="How does this matchup play out?"
        pastedImage={pastedImage}
        clearImage={clearImage}
        isAsking={isAsking}
        processImageFile={processImageFile}
      />

      <ChatThread msgs={matchupMsgs} />
    </main>
  );
}
