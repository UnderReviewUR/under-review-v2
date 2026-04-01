import { useMemo, useRef } from "react";
import AskBar from "../components/AskBar";
import ChatThread from "../components/ChatThread";
import TennisPlayerCard from "../components/TennisPlayerCard";
import MatchupCard from "../components/MatchupCard";
import { preferredTournamentScore } from "../lib/tennis";
import { ATP_PLAYERS, WTA_PLAYERS } from "../data/tennisPlayers";

export default function TennisScreen({
  players,
  context,
  liveMatches,
  tennisLoading,
  tennisMsgs,
  tennisInput,
  setTennisInput,
  pastedImage,
  clearImage,
  isAsking,
  processImageFile,
  fileInputRef,
  onSubmitTennis,
  onOpenMatchup,
  onOpenPlayer,
}) {
  const inputRef = useRef(null);

  const tennisLive = useMemo(
    () => liveMatches.filter((m) => String(m?.raw?.live || "0") === "1"),
    [liveMatches]
  );
  const tennisUpcoming = useMemo(
    () => liveMatches.filter((m) => String(m?.raw?.live || "0") !== "1"),
    [liveMatches]
  );
  const activeTournamentMatches = useMemo(
    () => liveMatches.filter((m) => preferredTournamentScore(m, context) > 0),
    [liveMatches, context]
  );

  const boardHeadline =
    context?.currentTournament?.name && activeTournamentMatches.length > 0
      ? context.currentTournament.name
      : "Tennis Board";
  const boardSubline =
    context?.currentTournament?.name && activeTournamentMatches.length > 0
      ? `${context.currentTournament.name.toUpperCase()} · LIVE + UPCOMING`
      : "CURRENT + UPCOMING TOUR MATCHES";

  const displayMatches = activeTournamentMatches.length > 0 ? activeTournamentMatches : liveMatches;
  const otherMatches =
    activeTournamentMatches.length > 0
      ? liveMatches.filter((m) => !activeTournamentMatches.some((x) => x.id === m.id))
      : [];

  function getPlayer(name, tour) {
    if (!players) return null;
    return (tour === "atp" ? players.atp : players.wta)?.[name] || null;
  }

  return (
    <main className="screen">
      <div className="tour-banner">
        <div className="banner-title">{boardHeadline}</div>
        <div className="banner-sub">{boardSubline}</div>
        <div className="banner-note">
          {liveMatches.length > 0
            ? `${tennisLive.length} live · ${tennisUpcoming.length} upcoming${
                activeTournamentMatches.length
                  ? ` · ${activeTournamentMatches.length} in active tournament`
                  : ""
              }`
            : "No current matches loaded right now."}
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "var(--cyan-bright)", fontFamily: "var(--mono-font)", letterSpacing: 2, marginBottom: 8, textTransform: "uppercase" }}>
          Ask Anything — Tennis
        </div>
        <AskBar
          inputRef={inputRef}
          fileInputRef={fileInputRef}
          value={tennisInput}
          onChange={setTennisInput}
          onSubmit={() => onSubmitTennis()}
          placeholder="Best tennis bet tonight? Which match is mispriced? Best live angle?"
          pastedImage={pastedImage}
          clearImage={clearImage}
          isAsking={isAsking}
          processImageFile={processImageFile}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            "Best tennis bets tonight?",
            "Which tennis match is mispriced?",
            "Best live tennis angle right now?",
            "What futures still have value?",
          ].map((q) => (
            <button key={q} className="quick-btn" onClick={() => onSubmitTennis(q)} style={{ fontSize: 11 }}>
              {q}
            </button>
          ))}
        </div>
      </div>

      <ChatThread msgs={tennisMsgs} />

      <div className="section-divider">
        {activeTournamentMatches.length > 0 && context?.currentTournament?.name
          ? `${context.currentTournament.name} Board`
          : "Live + Upcoming Matches"}
      </div>

      {tennisLoading ? (
        <div className="loading-state">
          <div className="loading-text">LOADING TENNIS BOARD...</div>
        </div>
      ) : liveMatches.length > 0 ? (
        <div className="matchup-list">
          {displayMatches.map((m) => (
            <div key={m.id} className="matchup-card" onClick={() => onOpenMatchup(m)}>
              <div className="matchup-top">
                <div className="matchup-league" style={{ color: m.leagueColor }}>
                  {m.league}
                </div>
                <div className="matchup-time">
                  {String(m?.raw?.live || "0") === "1" ? "LIVE" : m.raw?.status || m.time}
                </div>
              </div>
              <div className="matchup-body">
                <div className="matchup-title">{m.title}</div>
                <div className="matchup-meta">
                  {m.network}
                  {m.raw?.round ? ` · ${m.raw.round}` : ""}
                </div>
                <div className="matchup-blurb">
                  {m.raw?.score && m.raw.score !== "-" ? `Score: ${m.raw.score}. ` : ""}
                  {m.blurb}
                </div>
              </div>
            </div>
          ))}
          {otherMatches.length > 0 && (
            <>
              <div className="section-divider">Other Tour Matches</div>
              {otherMatches.map((m) => (
                <div key={m.id} className="matchup-card" onClick={() => onOpenMatchup(m)}>
                  <div className="matchup-top">
                    <div className="matchup-league" style={{ color: m.leagueColor }}>
                      {m.league}
                    </div>
                    <div className="matchup-time">
                      {String(m?.raw?.live || "0") === "1" ? "LIVE" : m.raw?.status || m.time}
                    </div>
                  </div>
                  <div className="matchup-body">
                    <div className="matchup-title">{m.title}</div>
                    <div className="matchup-meta">
                      {m.network}
                      {m.raw?.round ? ` · ${m.raw.round}` : ""}
                    </div>
                    <div className="matchup-blurb">{m.blurb}</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      ) : (
        <div className="loading-state">
          <div className="loading-text">NO CONFIRMED TENNIS MATCHES FOUND</div>
        </div>
      )}

      {context?.ace_props && (
        <>
          <div className="section-divider">Prop Guide</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            {Object.entries(context.ace_props).map(([name, data]) => (
              <div
                key={name}
                className="matchup-card"
                onClick={() => onSubmitTennis(`Tell me about ${name} ace props right now`)}
              >
                <div className="matchup-body">
                  <div className="matchup-title" style={{ fontSize: 15 }}>
                    {name}
                  </div>
                  <div className="matchup-meta">ACES</div>
                  <div className="matchup-blurb">
                    {data.avg_aces_hard} avg · {data.ace_rate}
                  </div>
                  <div className="matchup-blurb" style={{ marginTop: 6 }}>
                    {data.note || ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {players && (
        <>
          <div className="section-divider">ATP Top 25</div>
          {ATP_PLAYERS.map((name, idx) => (
            <TennisPlayerCard key={name} name={name} idx={idx} player={getPlayer(name, "atp")} onOpen={onOpenPlayer} />
          ))}
          <div className="section-divider">WTA Top 24</div>
          {WTA_PLAYERS.map((name, idx) => (
            <TennisPlayerCard key={name} name={name} idx={idx} player={getPlayer(name, "wta")} onOpen={onOpenPlayer} />
          ))}
        </>
      )}
      <div className="page-spacer" />
    </main>
  );
}
