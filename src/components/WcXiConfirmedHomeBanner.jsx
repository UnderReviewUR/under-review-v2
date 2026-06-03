/**
 * Home banner when WC poll detects pending → confirmed XI (session-scoped).
 */
export default function WcXiConfirmedHomeBanner({ notice, onOpenMatch, onDismiss }) {
  if (!notice?.eventId) return null;
  const label =
    notice.homeTeam && notice.awayTeam
      ? `${notice.homeTeam} vs ${notice.awayTeam}`
      : "a match on your slate";

  return (
    <div className="wc-xi-confirmed-banner" role="status">
      <button type="button" className="wc-xi-confirmed-banner-body" onClick={() => onOpenMatch?.(notice)}>
        <span className="wc-xi-confirmed-banner-kicker">Starting XIs confirmed</span>
        <span className="wc-xi-confirmed-banner-text">{label}</span>
      </button>
      <button
        type="button"
        className="wc-xi-confirmed-banner-dismiss"
        aria-label="Dismiss"
        onClick={() => onDismiss?.(notice)}
      >
        ×
      </button>
    </div>
  );
}
