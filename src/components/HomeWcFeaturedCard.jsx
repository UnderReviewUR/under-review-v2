/** Premium World Cup feature card on home — editorial layout, not promo spam. */
export default function HomeWcFeaturedCard({
  card,
  onOpenHub,
  onSeeMatches,
  onAskPrompt,
}) {
  if (!card || typeof card !== "object") return null;

  const tagline = card.tagline || card.subtitle || null;
  const featureLine = card.featureLine || null;

  return (
    <article className="ur-wc-featured">
      <div className="ur-wc-featured-glow" aria-hidden />
      <img className="ur-wc-featured-trophy" src="/wc-trophy-home.png" alt="" width={112} height={140} loading="lazy" decoding="async" />
      <div className="ur-wc-featured-body">
        <div className="ur-wc-featured-top">
          <span className="ur-wc-featured-kicker">{card.sportBadge || "WORLD CUP"}</span>
          {onOpenHub ? (
            <button type="button" className="ur-wc-featured-hub" onClick={onOpenHub}>
              Open hub
              <span aria-hidden> →</span>
            </button>
          ) : null}
        </div>
        <h2 className="ur-wc-featured-title">{card.title}</h2>
        {tagline ? <p className="ur-wc-featured-tagline">{tagline}</p> : null}
        {card.trustLine ? <p className="ur-wc-featured-trust">{card.trustLine}</p> : null}
        {featureLine ? <p className="ur-wc-featured-copy">{featureLine}</p> : null}
        <div className="ur-wc-featured-actions">
          {onSeeMatches ? (
            <button type="button" className="ur-wc-featured-matches" onClick={onSeeMatches}>
              {card.matchesCta || "See today's matches"}
            </button>
          ) : null}
          {onAskPrompt && card.prompt ? (
            <button type="button" className="ur-wc-featured-ask" onClick={() => onAskPrompt(card.prompt)}>
              <span>{card.text || "Ask about the World Cup"}</span>
              <span className="ur-wc-featured-ask-chev" aria-hidden>
                ›
              </span>
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
