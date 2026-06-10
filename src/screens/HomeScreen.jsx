import { useEffect, useLayoutEffect, useMemo, useState } from "react";

import AskBar from "../components/AskBar.jsx";
import HomeLastLeanCard from "../components/HomeLastLeanCard.jsx";
import { trackFunnelEvent } from "../lib/funnelAnalytics.js";
import LiveEdgeAlert from "../components/LiveEdgeAlert.jsx";
import TickerRail from "../components/TickerRail.jsx";
import TodaySlatePanel from "../components/TodaySlatePanel.jsx";
import WcXiConfirmedHomeBanner from "../components/WcXiConfirmedHomeBanner.jsx";
import { HOME_PROMPT_FALLBACKS } from "../features/home/buildDynamicHomeQuestions.js";
import { isWcHomePromoWindow } from "../../shared/wc2026Constants.js";

const FIRST_SESSION_PROMPTS = HOME_PROMPT_FALLBACKS.filter((q) =>
  ["fb1", "fb2", "fb3"].includes(q.id),
);

const HOME_ASK_PROMISE = "Ask like you would in chat. Get a take you can push back on.";
const HOME_ASK_HINT = "You'll get an answer you can push back on.";

const HOME_PLACEHOLDER_ROTATION = [
  "Ask, then follow up like a group chat…",
  "Who's the sharp side tonight?",
  "Is this line mispriced?",
  "What's the smartest angle on the slate?",
];

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
  goNfl: _goNfl,
  goF1: _goF1,
  goNba: _goNba,
  goMlb: _goMlb,
  goGolf: _goGolf,
  dynamicHomeQuestions,
  dailyFeaturedAngleCard,
  pgaChampionshipOddsCard,
  wcHomePromoCard,
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
  tickerNbaGames,
  getSeriesLabel,
  tennisTickerMatches,
  golfData,
  mlbGames,
  mlbData,
  f1Data,
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
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
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

  const starterQs = useMemo(() => {
    const dq = Array.isArray(dynamicHomeQuestions) ? dynamicHomeQuestions : [];
    const maxStarters = narrowHome ? 2 : 3;
    const offset = dq.length > 1 ? 1 : 0;
    if (isWcHomePromoWindow()) {
      return dq.slice(offset, offset + maxStarters);
    }
    const wc = dq.find((q) => String(q?.sportHint || "").toLowerCase() === "worldcup");
    let picks = dq.slice(offset, offset + maxStarters);
    if (wc && !picks.some((q) => q.id === wc.id)) {
      picks = [wc, ...picks.filter((q) => q.id !== wc.id)].slice(0, maxStarters);
    }
    if (dq.length <= 1) return narrowHome ? dq.slice(0, 2) : dq.slice(0, 3);
    return picks;
  }, [dynamicHomeQuestions, narrowHome]);

  useLayoutEffect(() => {
    if (!strippedHomeSession) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    const t = window.setTimeout(() => askInputRef?.current?.focus({ preventScroll: true }), 0);
    return () => window.clearTimeout(t);
  }, [strippedHomeSession, askInputRef]);

  useEffect(() => {
    if (strippedHomeSession) return;
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;
    const id = window.setInterval(
      () => setPlaceholderIdx((i) => (i + 1) % HOME_PLACEHOLDER_ROTATION.length),
      5000,
    );
    return () => window.clearInterval(id);
  }, [strippedHomeSession]);

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

  useEffect(() => {
    if (strippedHomeSession) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/daily-take");
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
  }, [strippedHomeSession]);

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
            placeholder="One sharp line — player, game, or price you care about…"
            pasteHintText="Paste a slip, line, or matchup."
            {...askBarCommon}
          />
          <p className="ur-home-ask-hint">{HOME_ASK_HINT}</p>
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
            3 free questions · No card · No signup
            <br />
            <span className="ur-first-session-foot-secondary">
              Email for 3 more per day (resets midnight UTC)
            </span>
          </p>
        </div>
      </main>
    );
  }

  const askPlaceholder = HOME_PLACEHOLDER_ROTATION[placeholderIdx] ?? HOME_PLACEHOLDER_ROTATION[0];

  return (
    <main className={`screen home-surface-premium home-surface-v1${hasDockedBar ? " has-msgs" : ""}`}>
      <p className="ur-home-promise">{HOME_ASK_PROMISE}</p>

      <AskBar
        inputRef={askInputRef}
        value={askInput}
        onChange={setAskInput}
        onSubmit={submitHome}
        placeholder={askPlaceholder}
        pasteHintText="Paste a slip, line, or matchup."
        {...askBarCommon}
      />
      <p className="ur-home-ask-hint">{HOME_ASK_HINT}</p>

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

      {wcHomePromoCard ? (
        <div
          className="ur-wc-home-promo"
          style={{
            marginTop: 6,
            marginBottom: 10,
            padding: "14px 14px 12px",
            borderRadius: 14,
            border: "1px solid rgba(0,245,233,0.35)",
            borderLeft: `4px solid ${wcHomePromoCard.accentColor || "#00F5E9"}`,
            background: "linear-gradient(180deg, rgba(0,245,233,0.1), rgba(255,255,255,0.02))",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: "var(--mono-font)",
                fontSize: 10,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: wcHomePromoCard.accentColor || "#00F5E9",
                fontWeight: 700,
              }}
            >
              {wcHomePromoCard.sportBadge || "WORLD CUP"}
            </span>
            {goWorldCup ? (
              <button
                type="button"
                onClick={() => goWorldCup()}
                style={{
                  fontFamily: "var(--mono-font)",
                  fontSize: 10,
                  letterSpacing: 0.08,
                  color: "var(--cyan-bright)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                  padding: 0,
                }}
              >
                Open hub →
              </button>
            ) : null}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
            {wcHomePromoCard.title}
          </div>
          {wcHomePromoCard.subtitle ? (
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>
              {wcHomePromoCard.subtitle}
            </div>
          ) : null}
          {wcHomePromoCard.trustLine ? (
            <div
              style={{
                fontSize: 11,
                color: "rgba(245,158,11,0.9)",
                marginBottom: 10,
                lineHeight: 1.45,
              }}
            >
              {wcHomePromoCard.trustLine}
            </div>
          ) : null}
          {goWorldCupMatchesToday ? (
            <button
              type="button"
              onClick={goWorldCupMatchesToday}
              style={{
                width: "100%",
                marginBottom: 10,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid rgba(0,245,233,0.45)",
                background: "rgba(0,245,233,0.14)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {wcHomePromoCard.matchesCta || "See today's matches"}
            </button>
          ) : null}
          <ul
            style={{
              margin: "0 0 10px",
              padding: "0 0 0 18px",
              fontSize: 12,
              color: "var(--soft)",
              lineHeight: 1.5,
            }}
          >
            {(wcHomePromoCard.highlights || []).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              const p = wcHomePromoCard.prompt;
              if (askWorldCup) askWorldCup(p);
              else firePrompt(p, wcHomePromoCard.sportHint || "worldcup", wcHomePromoCard.id);
            }}
            style={{
              width: "100%",
              textAlign: "left",
              background: "rgba(0,245,233,0.12)",
              border: "1px solid rgba(0,245,233,0.28)",
              borderRadius: 10,
              padding: "10px 12px",
              cursor: "pointer",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {wcHomePromoCard.text}
          </button>
        </div>
      ) : null}

      {starterQs.length > 0 ? (
        <section className="ur-home-starters" aria-labelledby="ur-home-starters-heading">
          <h2 id="ur-home-starters-heading" className="ur-home-starters-heading">
            Start here
          </h2>
          <div className="ask-cards ur-home-starter-cards">
            {starterQs.map((q) => (
              <div key={q.id} className="ask-card" onClick={() => firePrompt(q.prompt, q.sportHint || null, q.id)}>
                <div className="ask-card-bar" style={{ background: q.color }} />
                <div className="ask-card-text">{q.text}</div>
                <div className="ur-home-starter-chev" aria-hidden>
                  ›
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <LiveEdgeAlert alerts={nbaLiveEdgeAlerts || []} />

      <TickerRail
        collapsible
        isNflSlateActive={isNflSlateActive}
        goNfl={_goNfl}
        goNba={_goNba}
        goGolf={_goGolf}
        goMlb={_goMlb}
        goF1={_goF1}
        goTennis={_goTennis}
        tickerNbaGames={homeNbaGames}
        getSeriesLabel={getSeriesLabel}
        tennisTickerMatches={tennisTickerMatches}
        golfData={golfData}
        mlbGames={mlbGames}
        mlbData={mlbData}
        f1Data={f1Data}
      />

      {dailyPreview && prefillUrTakeQuestion ? (
        <section
          className="daily-edge-preview"
          style={{
            margin: "12px 0 14px",
            padding: "14px 14px 12px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "linear-gradient(180deg, rgba(0,212,168,0.06), rgba(255,255,255,0.02))",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono-font)",
              fontSize: 10,
              letterSpacing: "0.14em",
              color: "#00d4a8",
              marginBottom: 10,
              textTransform: "uppercase",
            }}
          >
            TODAY&apos;S EDGE — FREE PREVIEW
          </div>
          {dailyPreview.matchupLabel ? (
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{dailyPreview.matchupLabel}</div>
          ) : null}
          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", lineHeight: 1.35, marginBottom: 8 }}>
            {dailyPreview.headline}
          </div>
          {dailyPreview.bodyChunk ? (
            <div style={{ fontSize: 13, color: "var(--soft)", lineHeight: 1.45, marginBottom: 8 }}>
              {dailyPreview.bodyChunk}
            </div>
          ) : null}
          {dailyPreview.closing ? (
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--cyan-bright)", lineHeight: 1.4 }}>
              {dailyPreview.closing}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => prefillUrTakeQuestion(dailyPreview.question, dailyPreview.sportHint || null)}
            style={{
              marginTop: 12,
              width: "100%",
              textAlign: "left",
              background: "transparent",
              border: "none",
              padding: 0,
              fontFamily: "var(--mono-font)",
              fontSize: 12,
              letterSpacing: "0.06em",
              color: "#00d4a8",
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            Get the full take →
          </button>
        </section>
      ) : null}

      <TodaySlatePanel
        excludeEventKeys={liveSnapshotEventKeys}
        onDisplayedEventKeysChange={onTodaySlateDisplayedKeys}
        fallbackSports={slateFallbackSports}
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

      <div className="page-spacer" />
    </main>
  );
}
