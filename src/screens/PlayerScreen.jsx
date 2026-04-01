import AskBar from "../components/AskBar";
import ChatThread from "../components/ChatThread";

export default function PlayerScreen({
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
  player,
}) {
  return (
    <main className="screen">
      <section className="hero">
        <div className="hero-title">{player?.name || "Player"}</div>
        {player?.note && <div className="hero-sub">{player.note}</div>}
      </section>

      <AskBar
        inputRef={askInputRef}
        fileInputRef={fileInputRef}
        value={askInput}
        onChange={setAskInput}
        onSubmit={submitAsk}
        placeholder="How should I bet this player?"
        pastedImage={pastedImage}
        clearImage={clearImage}
        isAsking={isAsking}
        processImageFile={processImageFile}
      />

      <ChatThread msgs={askMsgs} />
    </main>
  );
}
