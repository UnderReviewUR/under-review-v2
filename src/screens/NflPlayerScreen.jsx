import AskBar from "../components/AskBar";
import ChatThread from "../components/ChatThread";

export default function NflPlayerScreen({
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
        <div className="hero-title">{player?.name || "NFL Player"}</div>
        {player?.note && <div className="hero-sub">{player.note}</div>}
      </section>

      <AskBar
        inputRef={askInputRef}
        fileInputRef={fileInputRef}
        value={askInput}
        onChange={setAskInput}
        onSubmit={submitAsk}
        placeholder="Best prop or angle for this player?"
        pastedImage={pastedImage}
        clearImage={clearImage}
        isAsking={isAsking}
        processImageFile={processImageFile}
      />

      <ChatThread msgs={askMsgs} />
    </main>
  );
}
