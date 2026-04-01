import AskBar from "../components/AskBar";
import ChatThread from "../components/ChatThread";
import PropCard from "../components/PropCard";

const HOME_PROMPTS = [
  "Best bets for today's slate at the Charleston Open?",
  "Will Dak throw for over 3556 yards this season?",
  "Who will lead the NFL in rushing touchdowns this season?",
  "Will Drake Maye experience regression this year?",
];

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
  submitQuickAsk,
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

      {askMsgs.length === 0 && (
        <section className="home-prompts">
          {HOME_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="prompt-card"
              onClick={() => submitQuickAsk(prompt)}
              disabled={isAsking}
            >
              <PropCard player="UR TAKE" prop="Quick Prompt" reason={prompt} />
            </button>
          ))}
        </section>
      )}

      <ChatThread msgs={askMsgs} />
    </main>
  );
}
