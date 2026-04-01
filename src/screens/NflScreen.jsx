import AskBar from "../components/AskBar";
import ChatThread from "../components/ChatThread";

export default function NflScreen({
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
}) {
  return (
    <main className="screen">
      <section className="hero">
        <div className="hero-title">NFL</div>
        <div className="hero-sub">
          Weekly edges, props, futures, and draft angles.
        </div>
      </section>

      <AskBar
        inputRef={askInputRef}
        fileInputRef={fileInputRef}
        value={askInput}
        onChange={setAskInput}
        onSubmit={submitAsk}
        placeholder="Best NFL bet this week?"
        pastedImage={pastedImage}
        clearImage={clearImage}
        isAsking={isAsking}
        processImageFile={processImageFile}
      />

      <ChatThread msgs={askMsgs} />
    </main>
  );
}
