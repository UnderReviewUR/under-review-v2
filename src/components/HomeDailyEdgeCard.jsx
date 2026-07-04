/**
 * Cream hero card for /api/daily-take preview (Option B home).
 */
export default function HomeDailyEdgeCard({ preview, onUnpack }) {
  if (!preview?.headline || typeof onUnpack !== "function") return null;

  const kicker = preview.kicker || "Today's edge — free preview";

  return (
    <section className="home-daily-edge-card" aria-label="Today's edge preview">
      <div className="home-daily-edge-card__kicker">{kicker}</div>
      {preview.matchupLabel ? (
        <div className="home-daily-edge-card__matchup">
          <span>{preview.matchupLabel}</span>
          {preview.scoreLine ? (
            <span className="home-daily-edge-card__score"> · {preview.scoreLine}</span>
          ) : null}
        </div>
      ) : null}
      <h2 className="home-daily-edge-card__headline">{preview.headline}</h2>
      {preview.bodyChunk ? <p className="home-daily-edge-card__body">{preview.bodyChunk}</p> : null}
      {preview.closing ? <p className="home-daily-edge-card__closing">{preview.closing}</p> : null}
      <button type="button" className="home-daily-edge-card__cta" onClick={onUnpack}>
        Unpack this take →
      </button>
    </section>
  );
}
