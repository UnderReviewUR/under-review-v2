import {
  formatWcFeaturedDateLine,
  formatWcFeaturedGroupLabel,
  formatWcFeaturedTimeLine,
  formatWcFeaturedVenueLine,
  resolveWcFeaturedTeam,
} from "../../lib/wcPremiumFeatured.js";

function isLiveStatus(status) {
  return ["live", "in_progress", "1h", "2h", "ht"].includes(String(status || "").toLowerCase());
}

/**
 * Cream hero match card — WC premium landing.
 */
export default function WcPremiumFeaturedMatch({ match, kicker, teams, onOpen, xiTrustLine = null }) {
  if (!match) return null;

  const home = resolveWcFeaturedTeam(match.homeTeam, teams);
  const away = resolveWcFeaturedTeam(match.awayTeam, teams);
  const live = isLiveStatus(match.status);
  const dateLine = formatWcFeaturedDateLine(match);
  const timeLine = live ? "IN PROGRESS" : formatWcFeaturedTimeLine(match);
  const venueLine = formatWcFeaturedVenueLine(match);

  return (
    <button type="button" className="wc-premium-featured" onClick={onOpen}>
      <div className="wc-premium-featured__label">{formatWcFeaturedGroupLabel(match, kicker)}</div>

      <div className="wc-premium-featured__teams">
        <div className="wc-premium-featured__team">
          {home?.flagUrl ? (
            <img
              src={home.flagUrl}
              alt=""
              width={40}
              height={40}
              loading="lazy"
              className="wc-premium-featured__flag"
            />
          ) : null}
          <span className="wc-premium-featured__abbr">{match.homeTeam}</span>
          <span className="wc-premium-featured__name">{home?.name || match.homeTeam}</span>
        </div>

        <span className="wc-premium-featured__vs" aria-hidden>
          {live ? (
            <span className="wc-premium-featured__live">LIVE</span>
          ) : (
            "VS"
          )}
        </span>

        <div className="wc-premium-featured__team">
          {away?.flagUrl ? (
            <img
              src={away.flagUrl}
              alt=""
              width={40}
              height={40}
              loading="lazy"
              className="wc-premium-featured__flag"
            />
          ) : null}
          <span className="wc-premium-featured__abbr">{match.awayTeam}</span>
          <span className="wc-premium-featured__name">{away?.name || match.awayTeam}</span>
        </div>
      </div>

      <div className="wc-premium-featured__rule" aria-hidden />

      <div className="wc-premium-featured__meta">
        {dateLine ? (
          <span className="wc-premium-featured__meta-item">
            <span className="wc-premium-featured__meta-icon" aria-hidden>
              ◷
            </span>
            {dateLine}
          </span>
        ) : null}
        {timeLine ? (
          <span className="wc-premium-featured__meta-item">
            <span className="wc-premium-featured__meta-icon" aria-hidden>
              ◐
            </span>
            {timeLine}
          </span>
        ) : null}
        {venueLine ? (
          <span className="wc-premium-featured__meta-item wc-premium-featured__meta-item--venue">
            <span className="wc-premium-featured__meta-icon" aria-hidden>
              ◈
            </span>
            {venueLine}
          </span>
        ) : null}
      </div>

      {xiTrustLine ? <p className="wc-premium-featured__trust">{xiTrustLine}</p> : null}

      <span className="wc-premium-featured__cta" aria-hidden>
        →
      </span>
    </button>
  );
}
