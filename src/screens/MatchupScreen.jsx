import AskBar from "../components/AskBar";
import ChatThread from "../components/ChatThread";

export default function MatchupScreen({
  askInput,
  setAskInput,
  askMsgs,
  submitAsk,
  isAsking,
  pastedImage,
  clearImage,
  processImageFile,
  askInputRef,
  fileInputRef,
  matchupContext,
}) {
  return (
    <main className="screen">
      <section className="hero">
        <div className="hero-title">Matchup</div>
        {matchupContext?.title && (
          <div className="hero-sub">{matchupContext.title}</div>
        )}
      </section>

      <AskBar
        inputRef={askInputRef}
        fileInputRef={fileInputRef}
        value={askInput}
        onChange={setAskInput}
        onSubmit={submitAsk}
        placeholder="How does this matchup play out?"
        pastedImage={pastedImage}
        clearImage={clearImage}
        isAsking={isAsking}
        processImageFile={processImageFile}
      />

      <ChatThread msgs={askMsgs} />
    </main>
  );
}
