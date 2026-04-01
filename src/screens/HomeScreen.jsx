import AskBar from "../components/AskBar";
import ChatThread from "../components/ChatThread";

export default function HomeScreen({
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
        <div className="hero-title">What do you want to know?</div>
        <div className="hero-sub">
          Live tennis first, futures where needed, and weekly NFL once the season flips.
        </div>
      </section>

      <AskBar
        inputRef={askInputRef}
        fileInputRef={fileInputRef}
        value={askInput}
        onChange={setAskInput}
        onSubmit={submitAsk}
        placeholder="Ask UR TAKE anything..."
        pastedImage={pastedImage}
        clearImage={clearImage}
        isAsking={isAsking}
        processImageFile={processImageFile}
      />

      <ChatThread msgs={askMsgs} />
    </main>
  );
}
