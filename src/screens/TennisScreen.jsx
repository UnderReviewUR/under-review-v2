import AskBar from "../components/AskBar";
import ChatThread from "../components/ChatThread";
import MatchupCard from "../components/MatchupCard";

export default function TennisScreen({
  liveMatches,
  context,
  tennisInput,
  setTennisInput,
  tennisMsgs,
  onSubmitTennis,
  onOpenMatchup,
  onOpenPlayer,
  isAsking,
  pastedImage,
  clearImage,
  processImageFile,
  fileInputRef,
}) {
  const topMatches = (liveMatches || []).slice(0, 6);

  return (
    <main className="screen">
      <section className="hero">
        <div className="hero-title">Tennis</div>
        <div className="hero-sub">
          {context?.currentTournament?.name
            ? `${context.currentTournament.name} — live matches, upcoming boards, and futures where the market is slow.`
            : "Live matches, upcoming boards, and futures where the market is slow."}
        </div>
      </section>

      <AskBar
        inputRef={undefined}
        fileInputRef={fileInputRef}
        value={tennisInput}
        onChange={setTennisInput}
        onSubmit={() => onSubmitTennis()}
        placeholder="Best tennis bet tonight? Any mispriced matches?"
        pastedImage={pastedImage}
        clearImage={clearImage}
        isAsking={isAsking}
        processImageFile={processImageFile}
      />

      {topMatches.length > 0 && (
        <section style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {topMatches.map((m) => (
            <MatchupCard key={m.id} matchup={m} onClick={() => onOpenMatchup?.(m)} />
          ))}
        </section>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {(context?.currentTournament?.atp_favorite
          ? [context.currentTournament.atp_favorite, context.currentTournament.wta_favorite]
          : ["Sinner", "Sabalenka", "Alcaraz", "Swiatek"]
        )
          .filter(Boolean)
          .slice(0, 6)
          .map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onOpenPlayer?.(name)}
              style={{
                border: "1px solid var(--border)",
                background: "#1b2744",
                color: "var(--text)",
                borderRadius: 999,
                padding: "6px 10px",
                cursor: "pointer",
              }}
            >
              {name}
            </button>
          ))}
      </div>

      <ChatThread msgs={tennisMsgs} />
    </main>
  );
}
