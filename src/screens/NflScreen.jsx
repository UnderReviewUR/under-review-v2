import AskBar from "../components/AskBar";
import ChatThread from "../components/ChatThread";
import NflPlayerCard from "../components/NflPlayerCard";
import { NFL_PROP_GUIDE, NFL_POSITIONS } from "../data/nflPlayers";

export default function NflScreen({
  nflMsgs,
  nflInput,
  setNflInput,
  nflPosFilter,
  setNflPosFilter,
  onSubmitNfl,
  onOpenNflPlayer,
  isAsking,
  pastedImage,
  clearImage,
  processImageFile,
  fileInputRef,
}) {
  const filtered = NFL_PROP_GUIDE.filter(
    (p) => nflPosFilter === "ALL" || p.pos === nflPosFilter
  );

  return (
    <main className="screen">
      <section className="hero">
        <div className="hero-title">NFL</div>
        <div className="hero-sub">
          Weekly edges, props, futures, and draft angles.
        </div>
      </section>

      <div className="filter-row">
        {NFL_POSITIONS.map((pos) => (
          <button
            key={pos}
            type="button"
            className={`prompt-chip${nflPosFilter === pos ? " active" : ""}`}
            onClick={() => setNflPosFilter(pos)}
          >
            {pos}
          </button>
        ))}
      </div>

      <div className="cards-list">
        {filtered.map((p) => (
          <NflPlayerCard
            key={`${p.player}-${p.propType}`}
            item={p}
            onAsk={(q) => {
              setNflInput(q);
              onSubmitNfl(q);
            }}
            onOpenNflPlayer={onOpenNflPlayer}
          />
        ))}
      </div>

      <AskBar
        fileInputRef={fileInputRef}
        value={nflInput}
        onChange={setNflInput}
        onSubmit={onSubmitNfl}
        placeholder="Ask an NFL prop, future, or player angle..."
        pastedImage={pastedImage}
        clearImage={clearImage}
        isAsking={isAsking}
        processImageFile={processImageFile}
      />

      <ChatThread msgs={nflMsgs} />
    </main>
  );
}
