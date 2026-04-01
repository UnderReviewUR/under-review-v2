import AskBar from "../components/AskBar";

export default function HomeScreen({
  homeInput,
  setHomeInput,
  onSubmitHome,
  onFirePrompt,
  isAsking,
  fileInputRef,
  pastedImage,
  clearImage,
  processImageFile,
}) {
  const prompts = [
    "Best bets for today's slate at the Charleston Open?",
    "Will Dak throw for over 3556 yards this season?",
    "Who will lead the NFL in rushing touchdowns this season?",
    "Will Drake Maye experience a regression this year?",
  ];

  return (
    <main className="screen">
      <section className="hero">
        <div className="hero-title">What do you want to know?</div>
        <div className="hero-sub">
          Live tennis first, futures where needed, and weekly NFL once the season flips.
        </div>
      </section>

      <AskBar
        inputRef={null}
        fileInputRef={fileInputRef}
        value={homeInput}
        onChange={setHomeInput}
        onSubmit={onSubmitHome}
        placeholder="Ask UR TAKE anything..."
        pastedImage={pastedImage}
        clearImage={clearImage}
        isAsking={isAsking}
        processImageFile={processImageFile}
      />

      <section className="prompt-section">
        <div className="prompt-grid">
          {prompts.map((q, i) => (
            <button
              key={q}
              className={`prompt-chip ${i % 2 ? "nfl" : "tennis"}`}
              onClick={() => onFirePrompt(q)}
              type="button"
              disabled={isAsking}
            >
              {q}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
