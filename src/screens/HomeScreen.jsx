import { useEffect, useLayoutEffect, useMemo, useState } from "react";

import HomeCompactTicker from "../components/HomeCompactTicker.jsx";
import HomeDailyEdgeCard from "../components/HomeDailyEdgeCard.jsx";
import HomeEngageLanes from "../components/HomeEngageLanes.jsx";
import NflHomeScoreStrip from "../components/NflHomeScoreStrip.jsx";
import NflSlateTakesCard from "../components/NflSlateTakesCard.jsx";
import HomeSpotlightRow from "../components/HomeSpotlightRow.jsx";
import AskBar from "../components/AskBar.jsx";
import HomeLastLeanCard from "../components/HomeLastLeanCard.jsx";
import { trackFunnelEvent } from "../lib/funnelAnalytics.js";
import LiveEdgeAlert from "../components/LiveEdgeAlert.jsx";
import TickerRail from "../components/TickerRail.jsx";
import TodaySlatePanel from "../components/TodaySlatePanel.jsx";
import WcXiConfirmedHomeBanner from "../components/WcXiConfirmedHomeBanner.jsx";
import { FREE_TIER_HOME_FOOTNOTE_PRIMARY, FREE_TIER_HOME_FOOTNOTE_SECONDARY } from "../../shared/freeTierCopy.js";
import { HOME_PROMPT_FALLBACKS } from "../features/home/buildDynamicHomeQuestions.js";
import { buildWcXiConfirmedHomeStarter } from "../features/home/buildWcHomePromoCard.js";
import { buildHomeDailyEdgeView } from "../features/home/buildHomeDailyEdgeView.js";
import { isWcHomePromoWindow } from "../../shared/wc2026Constants.js";
import { pickWcFeaturedMatch } from "../../shared/wcFeaturedMatch.js";

const FIRST_SESSION_PROMPTS = HOME_PROMPT_FALLBACKS.filter((q) =>
  ["fb1", "fb2", "fb3"].includes(q.id),
);

/** Home hero copy — NFL + La Liga weekend ICP. */
const HOME_HEADLINE = "Your NFL + La Liga weekend companion.";
const HOME_SUBHEAD = "Posted lines, matchup reads, and prop angles before kickoff.";
const HOME_ASK_PROMISE = `${HOME_HEADLINE} ${HOME_SUBHEAD}`;

const HOME_ASK_PLACEHOLDER = "Ask, then follow up like a group chat…";

export default function HomeScreen({
  strippedHomeSession = false,
  strippedSessionBusy = false,
  hasDockedBar,
  askInput,
  setAskInput,
  submitHome,
  askInputRef,
  askBarCommon,
  goTennis: _goTennis,
  goNfl,
  goLaliga = null,
  goF1: _goF1,
  goNba: _goNba,
  goMlb: _goMlb,
  goGolf: _goGolf,
  goWorldCup: _goWorldCup,
  dynamicHomeQuestions,
  dailyFeaturedAngleCard,
  pgaChampionshipOddsCard,
  wcHomePromoCard: _wcHomePromoCard,
  goWorldCup,
  goWorldCupMatchesToday,
  wcXiConfirmedNotice,
  onDismissWcXiNotice,
  onOpenWcXiNotice,
  firePrompt,
  askWorldCup = null,
  prefillUrTakeQuestion,
  isUnlimited = false,
  freeUsedCount = 0,
  freeQuestionLimit = 3,
  lastLeanRevision = 0,
  onOpenUpgrade,
  isNflSlateActive,
  nflGames = [],
  nflBoardAsOf = null,
  nflPropLines = [],
  nflUrTakeGated = true,
  laligaMatches = [],
  laligaPropLines = [],
  laligaUrTakeGated = true,
  tickerNbaGames,
  getSeriesLabel,
  tennisTickerMatches,
  golfData,
  golfLoading = false,
  mlbGames,
  mlbData,
  f1Data,
  wcMatches,
  homeCards,
  openMatchup,
  golfScoreColor,
  liveSnapshotEventKeys,
  onTodaySlateDisplayedKeys,
  slateFallbackSports,
  nbaLiveEdgeAlerts,
}) {
  const homeNbaGames = Array.isArray(tickerNbaGames) ? tickerNbaGames : [];

  const [dailyPreview, setDailyPreview] = useState(null);
  const [narrowHome, setNarrowHome] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches,
  );

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setNarrowHome(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const tryOne = useMemo(() => {
    const dq = Array.isArray(dynamicHomeQuestions) ? dynamicHomeQuestions : [];
    return dq.length > 1 ? dq[0] : null;
  }, [dynamicHomeQuestions]);

  const wcXiStarter = useMemo(
    () => buildWcXiConfirmedHomeStarter(wcXiConfirmedNotice),
    [wcXiConfirmedNotice],
  );

  const starterQs = useMemo(() => {
    const dq = Array.isArray(dynamicHomeQuestions) ? dynamicHomeQuestions : [];
    const maxStarters = narrowHome ? 2 : 3;
    const offset = dq.length > 1 ? 1 : 0;
    const liveSports = new Set(["nfl", "laliga"]);
    const liveFirst = dq.filter((q) => liveSports.has(String(q?.sportHint || "").toLowerCase()));
    const rest = dq.filter((q) => !liveSports.has(String(q?.sportHint || "").toLowerCase()));
    const ordered = liveFirst.length ? [...liveFirst, ...rest] : dq;

    if (wcXiStarter) {
      const restPick = ordered.slice(offset, offset + maxStarters);
      return [wcXiStarter, ...restPick.filter((q) => q.id !== wcXiStarter.id)].slice(0, maxStarters);
    }

    if (liveFirst.length >= maxStarters) {
      return liveFirst.slice(0, maxStarters);
    }

    if (isWcHomePromoWindow()) {
      return ordered.slice(offset, offset + maxStarters);
    }
    const wc = ordered.find((q) => String(q?.sportHint || "").toLowerCase() === "worldcup");
    let picks = ordered.slice(offset, offset + maxStarters);
    if (wc && !picks.some((q) => q.id === wc.id) && !liveFirst.length) {
      picks = [wc, ...picks.filter((q) => q.id !== wc.id)].slice(0, maxStarters);
    }
    if (ordered.length <= 1) return narrowHome ? ordered.slice(0, 2) : ordered.slice(0, 3);
    return picks;
  }, [dynamicHomeQuestions, narrowHome, wcXiStarter]);

  useLayoutEffect(() => {
    if (!strippedHomeSession) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    const t = window.setTimeout(() => askInputRef?.current?.focus({ preventScroll: true }), 0);
    return () => window.clearTimeout(t);
  }, [strippedHomeSession, askInputRef]);

  useEffect(() => {
    if (!strippedHomeSession) return;
    try {
      if (sessionStorage.getItem("ur_first_session_home_viewed") === "1") return;
      sessionStorage.setItem("ur_first_session_home_viewed", "1");
    } catch {
      return;
    }
    trackFunnelEvent("first_session_home_view", { surface: "stripped_home" });
  }, [strippedHomeSession]);

  const wcFeaturedEventId = useMemo(() => {
    if (!isWcHomePromoWindow()) return null;
    const featured = pickWcFeaturedMatch({ matches: wcMatches });
    return featured?.match?.id != null ? String(featured.match.id) : null;
  }, [wcMatches]);

  const homeDailyEdge = useMemo(
    () => buildHomeDailyEdgeView(dailyPreview, wcMatches),
    [dailyPreview, wcMatches],
  );

  useEffect(() => {
    if (strippedHomeSession) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/daily-take", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.ok && data?.headline) setDailyPreview(data);
      } catch {
        /* ignore — preview is optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [strippedHomeSession, wcFeaturedEventId]);

  if (strippedHomeSession) {
    return (
      <main className="screen ur-first-session-home">
        <div className="ur-first-session-stack">
          <h1 className="ur-first-session-headline">What do you want to know before you bet?</h1>
          <p className="ur-home-promise ur-home-promise--stripped">{HOME_ASK_PROMISE}</p>
          <AskBar
            inputRef={askInputRef}
            value={askInput}
            onChange={setAskInput}
            onSubmit={submitHome}
            placeholder={HOME_ASK_PLACEHOLDER}
            pasteHintText="Paste a slip, line, or matchup."
            {...askBarCommon}
          />
          {strippedSessionBusy ? (
            <p className="ur-first-session-wait" aria-live="polite">
              Working on your answer…
            </p>
          ) : null}
          <div className="ur-first-session-prompts">
            {FIRST_SESSION_PROMPTS.map((q) => (
              <button
                key={q.id}
                type="button"
                disabled={strippedSessionBusy}
                className={`ur-first-session-pill ur-first-session-pill--${q.id}`}
                onClick={() => firePrompt(q.prompt, q.sportHint || null, q.id)}
              >
                <span className="ur-first-session-pill-text" style={{ color: q.color }}>
                  {q.text}
                </span>
                <span className="ur-first-session-pill-arrow" style={{ color: q.color }} aria-hidden>
                  →
                </span>
              </button>
            ))}
          </div>
          <p className="ur-first-session-foot">
            {FREE_TIER_HOME_FOOTNOTE_PRIMARY}
            <br />
            <span className="ur-first-session-foot-secondary">
              {FREE_TIER_HOME_FOOTNOTE_SECONDARY}
            </span>
          </p>
        </div>
      </main>
    );
  }

  const askPlaceholder = HOME_ASK_PLACEHOLDER;

  const handleCompactTickerNav = (item) => {
    if (!item?.kind) return;
    switch (item.kind) {
      case "worldcup":
        _goWorldCup?.();
        break;
      case "golf":
        _goGolf?.();
        break;
      case "nba":
        _goNba?.();
        break;
      case "mlb":
        _goMlb?.();
        break;
      case "tennis":
        _goTennis?.();
        break;
      case "f1":
        _goF1?.();
        break;
      case "nfl":
        goNfl?.();
        break;
      case "laliga":
        goLaliga?.();
        break;
      default:
        break;
    }
  };

  return (
    <main className={`screen home-surface-premium home-surface-option-a home-surface-option-b${hasDockedBar ? " has-msgs" : ""}`}>
      <HomeCompactTicker
        isNflSlateActive={isNflSlateActive}
        tickerNbaGames={homeNbaGames}
        wcMatches={wcMatches}
        laligaMatches={laligaMatches}
        getSeriesLabel={getSeriesLabel}
        tennisTickerMatches={tennisTickerMatches}
        golfData={golfData}
        mlbGames={mlbGames}
        mlbData={mlbData}
        f1Data={f1Data}
        onNavigate={handleCompactTickerNav}
      />

      <section className="ur-home-hero" aria-label="Ask Under Review">
        <h1 className="ur-home-promise">
          <span className="ur-home-promise-line">{HOME_HEADLINE}</span>
          <span className="ur-home-promise-line ur-home-promise-line--soft">{HOME_SUBHEAD}</span>
        </h1>
        <div className="ur-home-ask-shell">
          <AskBar
            inputRef={askInputRef}
            value={askInput}
            onChange={setAskInput}
            onSubmit={submitHome}
            placeholder={askPlaceholder}
            layout="home"
            pasteHintText="Paste a slip, line, or matchup."
            {...askBarCommon}
          />
        </div>
      </section>

      <HomeEngageLanes
        nflGames={nflGames}
        laligaMatches={laligaMatches}
        nflPropLines={nflPropLines}
        laligaPropLines={laligaPropLines}
        nflUrTakeGated={nflUrTakeGated}
        laligaUrTakeGated={laligaUrTakeGated}
        onPrompt={(prompt, sportHint, promptId) => {
          if (!nflUrTakeGated && sportHint === "nfl" && typeof prefillUrTakeQuestion === "function") {
            prefillUrTakeQuestion(prompt, "nfl");
            return;
          }
          if (!laligaUrTakeGated && sportHint === "laliga" && typeof prefillUrTakeQuestion === "function") {
            prefillUrTakeQuestion(prompt, "laliga");
            return;
          }
          firePrompt(prompt, sportHint || null, promptId);
        }}
        onOpenSport={(sport) => {
          if (sport === "nfl") goNfl?.();
          else if (sport === "laliga") goLaliga?.();
        }}
      />

      {starterQs.length > 0 ? (
        <section className="ur-home-starters ur-home-starters-option-a" aria-labelledby="ur-home-starters-heading">
          <h2 id="ur-home-starters-heading" className="ur-home-starters-heading">
            Ask next
          </h2>
          <div className="ur-home-starter-list">
            {starterQs.map((q) => (
              <button
                key={q.id}
                type="button"
                className="ur-home-starter-item"
                onClick={() => {
                  if (q.id === "q-wc-xi-confirmed" && askWorldCup) {
                    askWorldCup(q.prompt, {
                      eventId: q.eventId,
                      highlightEventId: q.eventId,
                      matchSubTab: "today",
                    });
                    return;
                  }
                  if (String(q.sportHint || "").toLowerCase() === "worldcup" && askWorldCup) {
                    askWorldCup(q.prompt, { inheritThread: false });
                    return;
                  }
                  if (String(q.sportHint || "").toLowerCase() === "laliga" && typeof prefillUrTakeQuestion === "function") {
                    prefillUrTakeQuestion(q.prompt, "laliga");
                    return;
                  }
                  if (String(q.sportHint || "").toLowerCase() === "nfl" && typeof prefillUrTakeQuestion === "function") {
                    prefillUrTakeQuestion(q.prompt, "nfl");
                    return;
                  }
                  firePrompt(q.prompt, q.sportHint || null, q.id);
                }}
              >
                <span className="ur-home-starter-accent" style={{ background: q.color }} aria-hidden />
                <span className="ur-home-starter-text">{q.text}</span>
                <span className="ur-home-starter-chev" aria-hidden>
                  ›
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <NflHomeScoreStrip
        games={nflGames}
        onSelectRow={(row) => {
          if (!row?.question) return;
          if (!nflUrTakeGated && typeof prefillUrTakeQuestion === "function") {
            prefillUrTakeQuestion(row.question, "nfl");
            return;
          }
          goNfl?.();
        }}
      />

      <HomeDailyEdgeCard
        preview={homeDailyEdge}
        onUnpack={() => {
          if (!homeDailyEdge?.question) return;
          prefillUrTakeQuestion?.(homeDailyEdge.question, homeDailyEdge.sportHint || null);
        }}
      />

      <NflSlateTakesCard
        games={nflGames}
        asOf={nflBoardAsOf}
        isUnlimited={isUnlimited}
        askLive={!nflUrTakeGated}
        onOpenUpgrade={onOpenUpgrade}
        onSelectLane={(lane) => {
          if (!lane?.question) return;
          prefillUrTakeQuestion?.(lane.question, "nfl");
        }}
        onSeeBoard={goNfl}
      />

      <HomeSpotlightRow
        wcMatches={wcMatches}
        golfData={golfData}
        golfLoading={golfLoading}
        goWorldCup={goWorldCup}
        goWorldCupMatchesToday={goWorldCupMatchesToday}
        askWorldCup={askWorldCup}
        firePrompt={firePrompt}
        onOpenGolf={_goGolf}
      />

      {!narrowHome ? (
      <div className="ur-home-feed">
      {tryOne ? (
        <div className="ur-home-try-row">
          <button
            type="button"
            className="ur-home-try-chip"
            onClick={() => {
              trackFunnelEvent("home_try_one_chip", { promptId: tryOne.id });
              setAskInput(tryOne.prompt);
              requestAnimationFrame(() => {
                askInputRef?.current?.focus({ preventScroll: true });
              });
            }}
          >
            <span className="ur-home-try-label">Try</span>
            <span className="ur-home-try-text">{tryOne.text}</span>
          </button>
        </div>
      ) : null}

      <HomeLastLeanCard
        isUnlimited={isUnlimited}
        freeUsedCount={freeUsedCount}
        freeQuestionLimit={freeQuestionLimit}
        lastLeanRevision={lastLeanRevision}
        onAskAgain={(question, sportHint) => prefillUrTakeQuestion?.(question, sportHint || null)}
        onOpenUpgrade={onOpenUpgrade}
      />

      {wcXiConfirmedNotice ? (
        <WcXiConfirmedHomeBanner
          notice={wcXiConfirmedNotice}
          onOpenMatch={onOpenWcXiNotice}
          onDismiss={onDismissWcXiNotice}
        />
      ) : null}

      <LiveEdgeAlert alerts={nbaLiveEdgeAlerts || []} />

      {!narrowHome ? (
        <>
      <TickerRail
        collapsible
        isNflSlateActive={isNflSlateActive}
        goNfl={goNfl}
        goNba={_goNba}
        goGolf={_goGolf}
        goMlb={_goMlb}
        goF1={_goF1}
        goTennis={_goTennis}
        goWorldCup={_goWorldCup}
        goLaliga={goLaliga}
        tickerNbaGames={homeNbaGames}
        wcMatches={wcMatches}
        laligaMatches={laligaMatches}
        getSeriesLabel={getSeriesLabel}
        tennisTickerMatches={tennisTickerMatches}
        golfData={golfData}
        mlbGames={mlbGames}
        mlbData={mlbData}
        f1Data={f1Data}
      />

      <TodaySlatePanel
        excludeEventKeys={liveSnapshotEventKeys}
        onDisplayedEventKeysChange={onTodaySlateDisplayedKeys}
        fallbackSports={slateFallbackSports}
        nflGames={nflGames}
        laligaMatches={laligaMatches}
      />

      {pgaChampionshipOddsCard ? (
        <button
          type="button"
          onClick={() =>
            firePrompt(
              pgaChampionshipOddsCard.prompt,
              pgaChampionshipOddsCard.sportHint,
              "pga_championship_odds",
            )
          }
          style={{
            width: "100%",
            marginTop: 6,
            marginBottom: 10,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            borderLeft: `4px solid ${pgaChampionshipOddsCard.accentColor || "#C9A227"}`,
            background: "linear-gradient(180deg, rgba(201,162,39,0.12), rgba(255,255,255,0.02))",
            padding: "14px 14px 12px",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontFamily: "var(--mono-font)",
                fontSize: 10,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: pgaChampionshipOddsCard.accentColor || "#C9A227",
              }}
            >
              {pgaChampionshipOddsCard.sportBadge || "PGA"}
            </span>
            {pgaChampionshipOddsCard.fetchedLabel ? (
              <span style={{ fontFamily: "var(--mono-font)", fontSize: 10, color: "var(--muted)" }}>
                {pgaChampionshipOddsCard.fetchedLabel}
              </span>
            ) : null}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
            {pgaChampionshipOddsCard.title}
          </div>
          {pgaChampionshipOddsCard.subtitle ? (
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10 }}>
              {pgaChampionshipOddsCard.subtitle}
            </div>
          ) : null}
          <ol
            style={{
              margin: 0,
              padding: "0 0 0 18px",
              listStyle: "decimal",
              fontSize: 13,
              color: "#fff",
              lineHeight: 1.55,
            }}
          >
            {pgaChampionshipOddsCard.leaders.map((row, i) => (
              <li key={`${row.player}-${i}`} style={{ fontWeight: i === 0 ? 800 : 600 }}>
                <span>{row.player}</span>
                <span style={{ fontFamily: "var(--mono-font)", marginLeft: 8, color: "#C9A227" }}>
                  {row.display}
                </span>
              </li>
            ))}
          </ol>
          <div style={{ fontSize: 11, color: "var(--soft)", marginTop: 10 }}>
            Tap for a full outright take →
          </div>
        </button>
      ) : null}

      {dailyFeaturedAngleCard ? (
        <button
          type="button"
          onClick={() =>
            firePrompt(dailyFeaturedAngleCard.prompt, dailyFeaturedAngleCard.sportHint, "daily_featured_angle")
          }
          style={{
            width: "100%",
            marginTop: 6,
            marginBottom: 10,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            borderLeft: `4px solid ${dailyFeaturedAngleCard.accentColor || "#FF6B00"}`,
            background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
            padding: "14px 14px 12px",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontFamily: "var(--mono-font)",
                fontSize: 10,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: dailyFeaturedAngleCard.accentColor || "#FF6B00",
              }}
            >
              {dailyFeaturedAngleCard.sportBadge || "NBA"}
            </span>
            <span style={{ fontFamily: "var(--mono-font)", fontSize: 10, color: "var(--muted)" }}>
              {dailyFeaturedAngleCard.timestamp}
            </span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
            {dailyFeaturedAngleCard.matchup}
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 5 }}>
            {dailyFeaturedAngleCard.lean}
          </div>
          <div style={{ fontSize: 12, color: "var(--soft)", lineHeight: 1.4 }}>{dailyFeaturedAngleCard.reason}</div>
        </button>
      ) : null}

      {homeCards
        .filter((m) => m.id !== "ur-home-tracker")
        .map((m) => (
          <div
            key={m.id}
            className={`spotlight-card${m.isDraft ? " draft-gold-pulse" : ""}`}
            onClick={() => {
              if (m.isNbaRowsCard) return;
              openMatchup(m);
            }}
          >
            <div className="spotlight-top">
              <span className="spotlight-sport" style={{ color: m.leagueColor }}>
                {m.homeCategory || m.league}
              </span>
              <span className="spotlight-time">{m.time}</span>
            </div>
            <div className="spotlight-title">{m.title}</div>
            {m.isNbaRowsCard && Array.isArray(m.nbaRows) && m.nbaRows.length > 0 ? (
              <div className="spotlight-edge" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {m.nbaRows.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className="quick-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      openMatchup({
                        id: row.id,
                        league: "NBA PLAYOFFS",
                        leagueColor: m.leagueColor,
                        title: `${row.away} vs ${row.home}`,
                        time: row.tipEt,
                        network: row.channel || row.series || "Playoff matchup",
                        nbaEventKey: row.nbaEventKey || null,
                      });
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "1px solid rgba(255, 107, 0, 0.35)",
                      borderRadius: 10,
                      background: "rgba(255, 107, 0, 0.08)",
                      padding: "8px 10px",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                        {row.away} @ {row.home}
                      </div>
                      <div style={{ fontFamily: "var(--mono-font)", fontSize: 11, color: "#FF6B00" }}>{row.tipEt}</div>
                    </div>
                    <div style={{ marginTop: 3, fontSize: 11, color: "var(--muted)" }}>
                      {[row.series, row.channel].filter(Boolean).join(" · ")}
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
            {m.id?.startsWith("golf-home-leaderboard") && Array.isArray(m.topThree) && m.topThree.length > 0 ? (
              <div className="spotlight-edge">
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {m.topThree.map((row) => (
                    <div
                      key={`${m.id}-${row.rank}-${row.name}`}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}
                    >
                      <span style={{ fontSize: 12, color: "var(--soft)" }}>
                        {row.rank}. {row.name}
                        {row.thru && row.thru !== "—" && row.thru !== "-" ? ` (${row.thru})` : ""}
                      </span>
                      <span style={{ fontFamily: "var(--mono-font)", fontSize: 12, color: golfScoreColor(row.score) }}>
                        {row.score}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)" }}>{m.sourceLine || m.blurb}</div>
              </div>
            ) : m.id === "tennis-atp-schedule-board" && Array.isArray(m.matchupLines) && m.matchupLines.length > 0 ? (
              <div className="spotlight-edge">
                <div className="spotlight-atp-matchups-wrap">
                  <ul className="spotlight-atp-matchups">
                    {m.matchupLines.map((line, i) => (
                      <li key={`${m.id}-m-${i}`}>{line}</li>
                    ))}
                  </ul>
                </div>
                {m.moreMatchupsCount > 0 ? (
                  <div className="spotlight-atp-foot">
                    +{m.moreMatchupsCount} more matchup
                    {m.moreMatchupsCount === 1 ? "" : "s"} on the board
                  </div>
                ) : null}
                <div className="spotlight-atp-foot">{m.network}</div>
              </div>
            ) : m.isDraft ? (
              <>
                <div className="spotlight-edge">{m.blurb}</div>
                {Array.isArray(m.quickHitters) && m.quickHitters.length > 1 ? (
                  <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 10, paddingLeft: 2 }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>More angles</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {m.quickHitters.slice(1).map((q) => (
                        <button
                          key={q}
                          type="button"
                          className="quick-btn"
                          onClick={() => firePrompt(q, "nfl", "nfl_home_quick")}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div
                className="spotlight-edge"
                style={
                  m.id?.startsWith("golf-home-leaderboard") || m.id === "ur-home-tracker"
                    ? { whiteSpace: "pre-line" }
                    : undefined
                }
              >
                {!m.isNbaRowsCard ? m.blurb : null}
              </div>
            )}
          </div>
        ))}

        </>
      ) : null}

      </div>
      ) : null}

      <div className="page-spacer" />
    </main>
  );
}
