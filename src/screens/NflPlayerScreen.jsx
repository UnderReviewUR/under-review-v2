import NflPlayerCard from "../components/NflPlayerCard";
import AskBar from "../components/AskBar";

export default function NflPlayerScreen({
  selectedNflPlayerName,
  nflInput,
  setNflInput,
  onSubmitNfl,
  onBack,
  isAsking,
  pastedImage,
  clearImage,
  processImageFile,
  fileInputRef,
}) {
  return (
    <main className="screen">
      <button type="button" onClick={onBack} style={{ marginBottom: 12 }}>
        ← Back
      </button>

      <NflPlayerCard playerName={selectedNflPlayerName} />

      <AskBar
        inputRef={null}
        fileInputRef={fileInputRef}
        value={nflInput}
        onChange={setNflInput}
        onSubmit={() => onSubmitNfl()}
        placeholder={`Bet angle on ${selectedNflPlayerName || "this NFL player"}?`}
        pastedImage={pastedImage}
        clearImage={clearImage}
        isAsking={isAsking}
        processImageFile={processImageFile}
        btnColor="#E11D48"
      />
    </main>
  );
}
