import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getWcTeamByAbbr, getWcTeamsByGroup } from "../../data/wc2026Teams.js";
import { formatWcKickoffDisplay } from "../../../shared/wcKickoffDisplay.js";
import {
  formatWcDetailAsOfEt,
  resolveWcXiStatus,
  wcXiStatusChipLabel,
} from "../../../shared/wcXiStatus.js";
import { WC_MATCH_INTEL_LOADING } from "../../../shared/wcProductVoice.js";
import { buildWcMatchReadDisplay } from "../../../shared/wcMatchReadModel.js";
import { filterMatchPlayerPropScrapeRows } from "../../../shared/wcMatchPlayerPropRowGuard.js";
import { collapseMatchPlayerPropRowsForDisplay } from "../../../shared/wcMatchPlayerProps.js";
import { wcTeamsWithStrengthTags } from "../../../shared/wc2026Strength.js";
import BookmakerOddsPanel from "../BookmakerOddsPanel.jsx";
import WcMatchReadCard from "./WcMatchReadCard.jsx";
import {
  formatWcMatchVenueLine,
  formatWcMatchStageLabel,
  resolveWcMatchGroupLetter,
} from "../../../shared/wcMatchFieldDisplay.js";
import { isWcKnockoutFixtureMatch } from "../../../shared/wcKnockoutFixture.js";

const STRENGTH_CLASS = {
  Favorite: "wc-strength--favorite",
  Contender: "wc-strength--contender",
  Longshot: "wc-strength--longshot",
};

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

function PropList({ title, rows, marketKey = "" }) {
  const displayRows = collapseMatchPlayerPropRowsForDisplay(rows, marketKey);
  if (!displayRows.length) return null;
  return (
    <div className="wc-detail-props-block">
      <h4>{title}</h4>
      <ul className="wc-detail-props-list">
        {displayRows.slice(0, 8).map((row) => (
          <li key={`${row.name}-${marketKey}`}>
            <span>{row.name}</span>
            <span>{row.americanOdds}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function wcDetailHasVisibleTeamStats(detail) {
  const ts = detail?.teamStats;
  if (!ts || typeof ts !== "object") return false;
  const fields = ["possessionPct", "shots", "shotsOnTarget"];
  for (const side of ["home", "away"]) {
    const bucket = ts[side];
    if (!bucket || typeof bucket !== "object") continue;
    for (const field of fields) {
      if (bucket[field] != null && bucket[field] !== "") return true;
    }
  }
  return false;
}

function WcPreMatchIntel({ match, home, away, teams, xiStatus, mispriceContext, tournamentPhase, allMatches, onAskUrTake }) {
  const groupLetter = resolveWcMatchGroupLetter(match, teams) || null;
  const showGroupTable =
    groupLetter && !isWcKnockoutFixtureMatch(match, { tournamentPhase, allMatches });
  const groupTeams = showGroupTable ? wcTeamsWithStrengthTags(getWcTeamsByGroup(groupLetter)) : [];
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

      <WcMatchReadCard
        match={match}
        teams={teams}
        mispriceContext={mispriceContext}
        tournamentPhase={tournamentPhase}
        allMatches={allMatches}
        onGoDeeper={onAskUrTake}
        showGoDeeper={Boolean(onAskUrTake)}
      />

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
            {groupTeams.map((t) => {
              const tag = t.strengthTag || "Longshot";
              const tagClass = STRENGTH_CLASS[tag] || "wc-strength--longshot";
              return (
                <li key={t.abbreviation}>
                  <span>{t.name}</span>
                  <span className={`wc-strength-tag ${tagClass}`}>{tag}</span>
                </li>
              );
            })}
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
    </section>
  );
}

export default function WcMatchDetailDrawer({
  match,
  teams,
  mispriceContext = null,
  tournamentPhase = "",
  allMatches = [],
  onClose,
  onAskUrTake,
}) {
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
      fetch(`/api/world-cup?view=detail&eventId=${encodeURIComponent(eventId)}`).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch(`/api/world-cup?view=match_player_props&eventId=${encodeURIComponent(eventId)}`).then(
        (r) => (r.ok ? r.json() : null),
      ),
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
  const hasStats = wcDetailHasVisibleTeamStats(detail);
  const hasAnytime = Boolean(markets?.anytime_scorer?.length);
  const hasFirst = Boolean(markets?.first_goalscorer?.length);
  const hasAssists = Boolean(markets?.player_assists_ou?.length);
  const hasProps = Boolean(props?.ok !== false && (hasAnytime || hasFirst || hasAssists));
  const showPreMatchIntel = !hasStats;

  const stageLabel = formatWcMatchStageLabel(match, teams, { tournamentPhase, allMatches });

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
          {stageLabel ? ` · ${stageLabel}` : ""}
        </p>
        <p className="wc-detail-xi">
          {wcXiStatusChipLabel(xiStatus)}
          {asOf ? ` · ${asOf}` : ""}
        </p>

        {loading ? <p className="wc-detail-loading">{WC_MATCH_INTEL_LOADING}</p> : null}

        {showPreMatchIntel ? (
          <WcPreMatchIntel
            match={match}
            home={home}
            away={away}
            teams={teams}
            xiStatus={xiStatus}
            mispriceContext={mispriceContext}
            tournamentPhase={tournamentPhase}
            allMatches={allMatches}
            onAskUrTake={!loading && !hasProps ? onAskUrTake : null}
          />
        ) : null}

        {!loading && hasStats ? (
          <>
            <WcMatchReadCard
              match={match}
              teams={teams}
              detail={detail}
              mispriceContext={mispriceContext}
              tournamentPhase={tournamentPhase}
              allMatches={allMatches}
              onGoDeeper={onAskUrTake}
              showGoDeeper={Boolean(onAskUrTake)}
            />
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
          </>
        ) : null}

        {!loading && detail?.injuryCount > 0 ? (
          <p className="wc-detail-injuries">{detail.injuryCount} availability notes on file.</p>
        ) : null}

        {!loading && hasProps ? (
          <section className="wc-detail-section">
            {hasAnytime || hasFirst || hasAssists ? <h4>Player markets</h4> : null}
            <PropList title="Anytime scorer" rows={markets.anytime_scorer} marketKey="anytime_scorer" />
            <PropList title="First goalscorer" rows={markets.first_goalscorer} marketKey="first_goalscorer" />
            <PropList title="Assists O/U" rows={markets.player_assists_ou} marketKey="player_assists_ou" />
          </section>
        ) : null}

        {!loading && (hasStats || hasProps) && onAskUrTake ? (
          <button
            type="button"
            className="wc-ask-btn wc-detail-ask-btn wc-match-read__deeper-btn wc-match-read__deeper-btn--full"
            onClick={() => {
              const read = buildWcMatchReadDisplay({
                match,
                teams,
                detail,
                mispriceContext,
              });
              onAskUrTake(match, read?.askPrompt);
            }}
          >
            Go deeper →
          </button>
        ) : null}
      </div>
    </div>
  );

  if (typeof document === "undefined") return sheet;
  return createPortal(sheet, document.body);
}
