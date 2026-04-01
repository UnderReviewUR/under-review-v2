import AskBar from "../components/AskBar";
import ChatThread from "../components/ChatThread";

export default function TennisScreen({
  tennisInput,
  setTennisInput,
  tennisMsgs,
  submitTennis,
  isAsking,
  pastedImage,
  clearImage,
  processImageFile,
  tennisInputRef,
  fileInputRef,
}) {
  return (
    <main className="screen">
      <section className="hero">
        <div className="hero-title">Tennis</div>
        <div className="hero-sub">
          Live matches, upcoming boards, and futures where the market is slow.
        </div>
      </section>

      <AskBar
        inputRef={tennisInputRef}
        fileInputRef={fileInputRef}
        value={tennisInput}
        onChange={setTennisInput}
        onSubmit={submitTennis}
        placeholder="Best tennis bet tonight? Any mispriced matches?"
        pastedImage={pastedImage}
        clearImage={clearImage}
        isAsking={isAsking}
        processImageFile={processImageFile}
      />

      <ChatThread msgs={tennisMsgs} />
    </main>
  );
}
