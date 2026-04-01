import { useRef } from "react";
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
  const inputRef = useRef(null);

  return (
    <main className="screen">
      <section className="hero" style={{ paddingTop: 4 }}>
        <div className="hero-title">UR TAKE</div>
        <div className="hero-sub">Ask in plain English. Paste a screenshot. Get weirdly specific.</div>
      </section>

      <AskBar
        inputRef={inputRef}
        fileInputRef={fileInputRef}
        value={askInput}
        onChange={setAskInput}
        onSubmit={onSubmitAsk}
        placeholder="What do you want to know?"
        pastedImage={pastedImage}
        clearImage={clearImage}
        isAsking={isAsking}
        processImageFile={processImageFile}
      />

      {askMsgs.length === 0 ? (
        <section className="section">
          <div className="section-label">TRY ONE</div>
          <div className="q-list">
            {(dynamicQuestions || []).map((q) => (
              <button key={q.id} className="q-card" onClick={() => onFirePrompt(q.prompt)}>
                <div className="q-top">
                  <div className="q-accent" style={{ background: q.color }} />
                  <div className="q-text">{q.text}</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <ChatThread msgs={askMsgs} />
      )}
    </main>
  );
}
