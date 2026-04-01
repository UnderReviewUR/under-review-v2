import AskBar from "../components/AskBar";
import TennisPlayerCard from "../components/TennisPlayerCard";

export default function PlayerScreen({
  selectedPlayerName,
  players,
  tennisInput,
  setTennisInput,
  onSubmitTennis,
  onBack,
  isAsking,
  pastedImage,
  clearImage,
  processImageFile,
  fileInputRef,
}) {
  const player =
    (selectedPlayerName && (players?.atp?.[selectedPlayerName] || players?.wta?.[selectedPlayerName])) ||
    null;

  return (
    <main className="screen">
      <section className="hero">
        <button type="button" onClick={onBack} className="prompt-chip" style={{ marginBottom: 8 }}>
          Back to Tennis
        </button>
        <div className="hero-title">{selectedPlayerName || "Tennis Player"}</div>
      </section>

      <TennisPlayerCard name={selectedPlayerName} player={player} />

      <AskBar
        fileInputRef={fileInputRef}
        value={tennisInput}
        onChange={setTennisInput}
        onSubmit={() => onSubmitTennis()}
        placeholder="Ask about this tennis player..."
        pastedImage={pastedImage}
        clearImage={clearImage}
        isAsking={isAsking}
        processImageFile={processImageFile}
      />
    </main>
  );
}
