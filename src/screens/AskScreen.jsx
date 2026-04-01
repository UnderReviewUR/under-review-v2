import AskBar from "../components/AskBar";
import ChatThread from "../components/ChatThread";

export default function AskScreen({
  askMsgs,
  askInput,
  setAskInput,
  onSubmitAsk,
  dynamicQuestions,
  onFirePrompt,
  isAsking,
  pastedImage,
  clearImage,
  processImageFile,
  fileInputRef,
}) {
  return (
    <main className="screen">
      <section className="hero">
        <div className="hero-title">Ask UR Take</div>
        <div className="hero-sub">Cross-sport Q&A with fast edges and clear takes.</div>
      </section>

      <AskBar
        value={askInput}
        onChange={setAskInput}
        onSubmit={onSubmitAsk}
        placeholder="Ask anything..."
        pastedImage={pastedImage}
        clearImage={clearImage}
        isAsking={isAsking}
        processImageFile={processImageFile}
        fileInputRef={fileInputRef}
      />

      {Array.isArray(dynamicQuestions) && dynamicQuestions.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {dynamicQuestions.map((q) => (
            <button
              key={q.id || q.text}
              type="button"
              className="prompt-chip"
              onClick={() => onFirePrompt(q.prompt)}
              title={q.prompt}
            >
              {q.text}
            </button>
          ))}
        </div>
      )}

      <ChatThread msgs={askMsgs} />
    </main>
  );
}
