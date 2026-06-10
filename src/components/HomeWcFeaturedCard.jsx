/** Option A — World Cup featured card on home (trophy, bullets, CTAs). */
export default function HomeWcFeaturedCard({
  card,
  onOpenHub,
  onSeeMatches,
  onAskPrompt,
}) {
  if (!card || typeof card !== "object") return null;

  const highlights = Array.isArray(card.highlights)
    ? card.highlights.filter((h) => String(h || "").trim())
    : [];

  return (
    <article className="ur-wc-home-promo ur-wc-home-promo--v2">
      <div className="ur-wc-home-promo-top">
        <span className="ur-wc-home-promo-badge">{card.sportBadge || "WORLD CUP"}</span>
        {onOpenHub ? (
          <button type="button" className="ur-wc-home-promo-hub" onClick={onOpenHub}>
            Open hub →
          </button>
        ) : null}
      </div>

      <div className="ur-wc-home-promo-hero">
        <div className="ur-wc-home-promo-title-wrap">
          <h2 className="ur-wc-home-promo-title">{card.title}</h2>
          {card.tagline ? <p className="ur-wc-home-promo-tagline">{card.tagline}</p> : null}
        </div>
        <img
          className="ur-wc-home-promo-trophy"
          src="/wc-trophy-home.png"
          alt=""
          width={88}
          height={110}
          loading="lazy"
          decoding="async"
        />
      </div>

      {card.trustLine ? <p className="ur-wc-home-promo-trust">{card.trustLine}</p> : null}

      {highlights.length > 0 ? (
        <ul className="ur-wc-home-promo-highlights">
          {highlights.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}

      {onSeeMatches ? (
        <button type="button" className="ur-wc-home-promo-matches" onClick={onSeeMatches}>
          {card.matchesCta || "See today's matches"}
        </button>
      ) : null}

      {onAskPrompt && card.prompt ? (
        <button type="button" className="ur-wc-home-promo-ask" onClick={() => onAskPrompt(card.prompt)}>
          <span>{card.text || "Ask about the World Cup"}</span>
          <span className="ur-wc-home-promo-ask-chev" aria-hidden>
            ›
          </span>
        </button>
      ) : null}
    </article>
  );
}
