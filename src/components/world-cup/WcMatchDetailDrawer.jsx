import { useEffect, useState } from "react";
import { getWcTeamByAbbr } from "../../data/wc2026Teams.js";
import { formatWcKickoffDisplay } from "../../../shared/wcKickoffDisplay.js";
import {
  formatWcDetailAsOfEt,
  resolveWcXiStatus,
  wcXiStatusChipLabel,
} from "../../../shared/wcXiStatus.js";
import { WC_MATCH_INTEL_BODY, WC_MATCH_INTEL_LOADING } from "../../../shared/wcProductVoice.js";

function StatLine({ label, home, away }) {
  if (home == null && away == null) return null;
  return (
    <div className="wc-detail-stat-row">
      <span className="wc-detail-stat-val">{home ?? "—"}</span>
      <span className="wc-detail-stat-label">{label}</span>
      <span className="wc-detail-stat-val">{away ?? "—"}</span>
    </div>
  );
}

function PropList({ title, rows }) {
  if (!rows?.length) return null;
  return (
    <div className="wc-detail-props-block">
      <h4>{title}</h4>
      <ul className="wc-detail-props-list">
        {rows.slice(0, 8).map((row) => (
          <li key={`${row.name}-${row.americanOdds}`}>
            <span>{row.name}</span>
            <span>{row.americanOdds}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function WcMatchDetailDrawer({ match, onClose }) {
  const [detail, setDetail] = useState(null);
  const [props, setProps] = useState(null);
  const [loading, setLoading] = useState(true);

  const eventId = match?.id != null ? String(match.id).trim() : "";
  const home = getWcTeamByAbbr(match?.homeTeam);
  const away = getWcTeamByAbbr(match?.awayTeam);

  useEffect(() => {
    if (!eventId) return;
    let cancel = false;
    setLoading(true);
    Promise.all([
      fetch(`/api/world-cup?view=detail&eventId=${encodeURIComponent(eventId)}`, {
        cache: "no-store",
      }).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/world-cup?view=match_player_props&eventId=${encodeURIComponent(eventId)}`, {
        cache: "no-store",
      }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([d, p]) => {
        if (cancel) return;
        setDetail(d);
        setProps(p);
      })
      .catch(() => {
        /* keep card-level intel */
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [eventId]);

  if (!match) return null;

  const xiStatus = resolveWcXiStatus(detail?.ok ? detail : match);
  const asOf = formatWcDetailAsOfEt(detail?.lastUpdated || match?.lastUpdated);
  const markets = props?.markets || props?.goldenBoot?.markets || props?.event?.markets;
  const hasStats = Boolean(detail?.teamStats);
  const hasProps = Boolean(
    markets?.anytime_scorer?.length ||
      markets?.first_goalscorer?.length ||
      markets?.player_assists_ou?.length,
  );

  return (
    <div className="wc-detail-drawer-backdrop" role="presentation" onClick={onClose}>
      <div
        className="wc-detail-drawer"
        role="dialog"
        aria-labelledby="wc-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="wc-detail-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h3 id="wc-detail-title" className="wc-detail-title">
          {home?.name || match.homeTeam} vs {away?.name || match.awayTeam}
        </h3>
        <p className="wc-detail-meta">
          {formatWcKickoffDisplay(match)}
          {match.group ? ` · Group ${match.group}` : ""}
        </p>
        <p className="wc-detail-xi">
          {wcXiStatusChipLabel(xiStatus)}
          {asOf ? ` · ${asOf}` : ""}
        </p>

        {loading ? <p className="wc-detail-loading">{WC_MATCH_INTEL_LOADING}</p> : null}

        {!loading && !hasStats && !hasProps ? (
          <p className="wc-detail-muted">{WC_MATCH_INTEL_BODY}</p>
        ) : null}

        {!loading && hasStats ? (
          <section className="wc-detail-section">
            <h4>Match stats</h4>
            <StatLine
              label="Possession %"
              home={detail.teamStats.home?.possessionPct}
              away={detail.teamStats.away?.possessionPct}
            />
            <StatLine
              label="Shots"
              home={detail.teamStats.home?.shots}
              away={detail.teamStats.away?.shots}
            />
            <StatLine
              label="Shots on target"
              home={detail.teamStats.home?.shotsOnTarget}
              away={detail.teamStats.away?.shotsOnTarget}
            />
          </section>
        ) : null}

        {!loading && detail?.injuryCount > 0 ? (
          <p className="wc-detail-injuries">{detail.injuryCount} availability notes on file.</p>
        ) : null}

        {!loading && hasProps ? (
          <section className="wc-detail-section">
            <h4>Player markets</h4>
            <PropList title="Anytime scorer" rows={markets.anytime_scorer} />
            <PropList title="First goalscorer" rows={markets.first_goalscorer} />
            <PropList title="Assists O/U" rows={markets.player_assists_ou} />
          </section>
        ) : null}
      </div>
    </div>
  );
}
