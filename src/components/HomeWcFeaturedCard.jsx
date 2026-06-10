/** World Cup spotlight on home — typographic, no pasted assets. */
export default function HomeWcFeaturedCard({
  card,
  onOpenHub,
  onSeeMatches,
  onAskPrompt,
}) {
  if (!card || typeof card !== "object") return null;

  const tagline = card.tagline || null;
  const summary = card.featureLine || null;
  const footnote = card.trustLine || null;

  return (
    <article className="ur-wc-spotlight">
      <header className="ur-wc-spotlight-head">
        <span className="ur-wc-spotlight-label">{card.sportBadge || "World Cup"}</span>
        {tagline ? <span className="ur-wc-spotlight-meta">{tagline}</span> : null}
      </header>

      {onOpenHub ? (
        <button type="button" className="ur-wc-spotlight-main" onClick={onOpenHub}>
          <h2 className="ur-wc-spotlight-title">{card.title}</h2>
          {summary ? <p className="ur-wc-spotlight-summary">{summary}</p> : null}
        </button>
      ) : (
        <div className="ur-wc-spotlight-main ur-wc-spotlight-main--static">
          <h2 className="ur-wc-spotlight-title">{card.title}</h2>
          {summary ? <p className="ur-wc-spotlight-summary">{summary}</p> : null}
        </div>
      )}

      <div className="ur-wc-spotlight-actions">
        {onSeeMatches ? (
          <button type="button" className="ur-wc-spotlight-action" onClick={onSeeMatches}>
            {card.matchesCta || "Today's matches"}
          </button>
        ) : null}
        {onAskPrompt && card.prompt ? (
          <button type="button" className="ur-wc-spotlight-action" onClick={() => onAskPrompt(card.prompt)}>
            {card.text || "Ask about the World Cup"}
          </button>
        ) : null}
      </div>

      {footnote ? <p className="ur-wc-spotlight-foot">{footnote}</p> : null}
    </article>
  );
}
