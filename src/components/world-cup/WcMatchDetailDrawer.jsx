import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getWcTeamByAbbr, getWcTeamsByGroup } from "../../data/wc2026Teams.js";
import { formatMatchOdds } from "../../data/wc2026WinProbability.js";
import { formatWcKickoffDisplay } from "../../../shared/wcKickoffDisplay.js";
import {
  formatWcDetailAsOfEt,
  resolveWcXiStatus,
  wcXiStatusChipLabel,
} from "../../../shared/wcXiStatus.js";
import { WC_MATCH_INTEL_LOADING } from "../../../shared/wcProductVoice.js";
import { filterMatchPlayerPropScrapeRows } from "../../../shared/wcMatchPlayerPropRowGuard.js";
import { wcTeamsWithStrengthTags } from "../../../shared/wc2026Strength.js";
import BookmakerOddsPanel from "../BookmakerOddsPanel.jsx";
import {
  formatWcMatchGroupLetter,
  formatWcMatchVenueLine,
} from "../../../shared/wcMatchFieldDisplay.js";

const WC_XI_HELP =
  "Lineups lock in as kickoff approaches. Starter props unlock once this chip shows Starting XI locked.";

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

function ModelOddsBar({ odds }) {
  if (!odds) return null;
  const total = odds.teamA.winPct + odds.draw + odds.teamB.winPct || 1;
  const aW = (odds.teamA.winPct / total) * 100;
  const dW = (odds.draw / total) * 100;
  const bW = (odds.teamB.winPct / total) * 100;
  return (
    <div className="wc-detail-model-odds">
      <p className="wc-detail-model-odds__label">Model win chance (Elo)</p>
      <div className="wc-odds-labels">
        <span>
          {odds.teamA.abbr} {odds.teamA.winPct}%
        </span>
        <span>Draw {odds.draw}%</span>
        <span>
          {odds.teamB.abbr} {odds.teamB.winPct}%
        </span>
      </div>
      <div className="wc-odds-bar">
        <span style={{ width: `${aW}%`, background: "var(--wc-blue)" }} />
        <span style={{ width: `${dW}%`, background: "var(--muted)" }} />
        <span style={{ width: `${bW}%`, background: "var(--wc-gold)" }} />
      </div>
    </div>
  );
}

function WcPreMatchIntel({ match, home, away, teams, xiStatus, onAskUrTake }) {
  const groupLetter = formatWcMatchGroupLetter(match?.group) || null;
  const groupTeams = groupLetter ? wcTeamsWithStrengthTags(getWcTeamsByGroup(groupLetter)) : [];
  const modelOdds = teams?.length ? formatMatchOdds(match.homeTeam, match.awayTeam, teams) : null;
  const venueLine = formatWcMatchVenueLine(match?.stadium, match?.city);

  return (
    <section className="wc-detail-section wc-detail-pre-match">
      <div className="wc-detail-team-row">
        <div className="wc-detail-team-col">
          {home?.flagUrl ? (
            <img src={home.flagUrl} alt="" width={40} height={28} loading="lazy" className="wc-flag-sm" />
          ) : null}
          <span>{home?.name || match.homeTeam}</span>
        </div>
        <span className="wc-detail-team-vs">vs</span>
        <div className="wc-detail-team-col">
          {away?.flagUrl ? (
            <img src={away.flagUrl} alt="" width={40} height={28} loading="lazy" className="wc-flag-sm" />
          ) : null}
          <span>{away?.name || match.awayTeam}</span>
        </div>
      </div>

      {venueLine ? <p className="wc-detail-venue">{venueLine}</p> : null}

      <ModelOddsBar odds={modelOdds} />

      <BookmakerOddsPanel
        compact
        fetchMultiBook={false}
        sportKey="soccer_fifa_world_cup"
        home={home?.name}
        away={away?.name}
        homeAbbr={match?.homeTeam}
        awayAbbr={match?.awayTeam}
        homeLabel={match?.homeTeam}
        awayLabel={match?.awayTeam}
        showDraw
        espnFallback={match?.odds}
      />

      {groupTeams.length ? (
        <div className="wc-detail-group-roster">
          <h4>Group {groupLetter}</h4>
          <ul>
            {groupTeams.map((t) => (
              <li key={t.abbreviation}>
                <span>{t.name}</span>
                <span className="wc-detail-tier">{t.strengthTag}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="wc-detail-xi-note">
        <strong>{wcXiStatusChipLabel(xiStatus)}</strong>
        {xiStatus === "pending" || xiStatus === "unavailable" ? ` — ${WC_XI_HELP}` : null}
      </p>

      <p className="wc-detail-muted wc-detail-live-note">
        Live stats, chance index, and player props fill in at kickoff.
      </p>

      {onAskUrTake ? (
        <button type="button" className="wc-ask-btn wc-detail-ask-btn" onClick={() => onAskUrTake(match)}>
          Ask UR Take →
        </button>
      ) : null}
    </section>
  );
}

export default function WcMatchDetailDrawer({ match, teams, onClose, onAskUrTake }) {
  const [detail, setDetail] = useState(null);
  const [props, setProps] = useState(null);
  const [loading, setLoading] = useState(true);

  const eventId = match?.id != null ? String(match.id).trim() : "";
  const home = getWcTeamByAbbr(match?.homeTeam);
  const away = getWcTeamByAbbr(match?.awayTeam);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }
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
        setDetail(d?.ok ? d : null);
        setProps(p);
      })
      .catch(() => {
        /* card-level intel still renders */
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [eventId]);

  if (!match) return null;

  const xiStatus = resolveWcXiStatus(detail || match);
  const asOf = formatWcDetailAsOfEt(detail?.lastUpdated || match?.lastUpdated);
  const rawMarkets = props?.markets || props?.goldenBoot?.markets || props?.event?.markets;
  const markets = rawMarkets
    ? Object.fromEntries(
        Object.entries(rawMarkets).map(([key, rows]) => [
          key,
          filterMatchPlayerPropScrapeRows(Array.isArray(rows) ? rows : []),
        ]),
      )
    : null;
  const hasStats = Boolean(detail?.teamStats);
  const hasProps = Boolean(
    props?.ok !== false &&
      (markets?.anytime_scorer?.length ||
        markets?.first_goalscorer?.length ||
        markets?.player_assists_ou?.length),
  );
  const showPreMatch = !loading && !hasStats && !hasProps;

  const sheet = (
    <div className="wc-detail-drawer-backdrop" role="presentation" onClick={onClose}>
      <div
        className="wc-detail-drawer"
        role="dialog"
        aria-modal="true"
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

        {showPreMatch ? (
          <WcPreMatchIntel
            match={match}
            home={home}
            away={away}
            teams={teams}
            xiStatus={xiStatus}
            onAskUrTake={onAskUrTake}
          />
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

        {!loading && (hasStats || hasProps) && onAskUrTake ? (
          <button type="button" className="wc-ask-btn wc-detail-ask-btn" onClick={() => onAskUrTake(match)}>
            Ask UR Take →
          </button>
        ) : null}
      </div>
    </div>
  );

  if (typeof document === "undefined") return sheet;
  return createPortal(sheet, document.body);
}
