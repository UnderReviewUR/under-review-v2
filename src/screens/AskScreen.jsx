import AskBar from "../components/AskBar.jsx";
import { ChatThread } from "../features/app/helpers.jsx";

export default function AskScreen({
  askScreenRef,
  hasDockedBar,
  askMsgs,
  askInputRef,
  askInput,
  setAskInput,
  submitAsk,
  askBarCommon,
  dynamicHomeQuestions,
  firePrompt,
  urTakeTrackPlay = null,
}) {
  return (
          <main ref={askScreenRef} className={`screen${hasDockedBar ? " has-msgs" : ""}`}>
            {askMsgs.length === 0 ? (
              <>
                <section className="hero" style={{paddingTop:4}}><div className="hero-title">UR TAKE</div><div className="hero-sub">Ask in plain English. Paste a screenshot. Get weirdly specific.</div></section>
                <AskBar
                  inputRef={askInputRef}
                  value={askInput}
                  onChange={setAskInput}
                  onSubmit={submitAsk}
                  placeholder="What do you want to know?"
                  showPasteHint={false}
                  {...askBarCommon}
                />
                <section className="section"><div className="section-label">TRY ONE</div><div className="q-list">{dynamicHomeQuestions.map(q=><button key={q.id} className="q-card" onClick={()=>firePrompt(q.prompt, q.sportHint || null)}><div className="q-top"><div className="q-accent" style={{background:q.color}}/><div className="q-text">{q.text}</div></div></button>)}</div></section>
              </>
            ) : (
              <>
                <div style={{ fontSize: 10, fontFamily: "var(--mono-font)", letterSpacing: 2, color: "var(--muted)", padding: "6px 2px 10px", textTransform: "uppercase" }}>UR TAKE · conversation</div>
                <ChatThread msgs={askMsgs} urTakeTrackPlay={urTakeTrackPlay} />
              </>
            )}
          </main>
  );
}
