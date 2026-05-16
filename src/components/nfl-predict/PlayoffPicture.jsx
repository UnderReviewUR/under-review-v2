import { useEffect, useState } from "react";

const CONFETTI_COLORS = ["#00F5E9", "#FF2D6B", "#F59E0B", "#8B5CF6", "#22C55E", "#3B82F6", "#F97316", "#EC4899"];

function RowLogo({ team, size = 32 }) {
  const [bad, setBad] = useState(false);
  if (!team) return <div style={{ width: size, height: size, flexShrink: 0 }} />;
  const pc = team.primaryColor;
  const sc = team.secondaryColor;
  if (bad) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: pc,
          color: sc,
          fontWeight: 900,
          fontSize: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {team.abbr}
      </div>
    );
  }
  return (
    <img
      loading="lazy"
      width={size}
      height={size}
      src={team.logoUrl}
      alt=""
      style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }}
      onError={() => setBad(true)}
    />
  );
}

function SeedBadge({ seed }) {
  if (seed == null || seed <= 0) return null;
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 800,
        padding: "2px 6px",
        borderRadius: 4,
        background: "#222",
        color: "#aaa",
        flexShrink: 0,
      }}
    >
      #{seed}
    </span>
  );
}

function TbdRow({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.55, padding: "6px 0" }}>
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "#222",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          color: "#666",
          flexShrink: 0,
        }}
      >
        ?
      </span>
      <span style={{ fontSize: 12, color: "var(--nfl-predict-muted)", lineHeight: 1.35 }}>{label}</span>
    </div>
  );
}

function TeamPickRow({ slot, game, side, onPick, disabled }) {
  if (!slot?.team) return null;
  const t = slot.team;
  const isWinner = game.winner === t.abbr;
  const isLoser = game.winner && game.winner !== t.abbr;
  const pc = t.primaryColor || "#333";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPick(game.id, t.abbr)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "8px 10px",
        marginBottom: side === "home" ? 4 : 0,
        borderRadius: 8,
        border: isWinner ? `2px solid ${pc}` : "1px solid transparent",
        background: isWinner ? `${pc}55` : "transparent",
        opacity: isLoser ? 0.4 : 1,
        cursor: disabled ? "default" : "pointer",
        textAlign: "left",
        color: "var(--nfl-predict-text)",
      }}
    >
      <RowLogo team={t} size={32} />
      <span style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {t.shortName || t.fullName}
      </span>
      <SeedBadge seed={slot.seed} />
    </button>
  );
}

function wcWinnerLabel(g) {
  const h = g.home?.seed;
  const a = g.away?.seed;
  if (h && a) return `Winner of #${h} vs #${a}`;
  return "TBD";
}

/** @param {import("../../lib/nflPredictBracket.js").BracketGame} game @param {"home"|"away"} side @param {import("../../lib/nflPredictBracket.js").ConferenceBracket} [conf] */
function tbdLabelFor(game, side, conf) {
  if ((side === "home" && game.home?.team) || (side === "away" && game.away?.team)) return "TBD";
  if (!conf) return side === "home" ? "AFC Champion" : "NFC Champion";
  if (game.id.endsWith("-div-1") && side === "away") return wcWinnerLabel(conf.wildCard[0]);
  if (game.id.endsWith("-div-2")) {
    return side === "home" ? wcWinnerLabel(conf.wildCard[1]) : wcWinnerLabel(conf.wildCard[2]);
  }
  if (game.id.endsWith("-champ")) return "Awaiting Divisional winners";
  return "TBD";
}

function MatchupCard({ game, roundLabel, onPickGame, conf, gold = false, showConfetti = false }) {
  const homeReady = game.home?.team;
  const awayReady = game.away?.team;
  const canPick = homeReady && awayReady;

  return (
    <div
      style={{
        width: "100%",
        borderRadius: 12,
        border: gold ? "2px solid #F59E0B" : "1px solid var(--nfl-predict-border)",
        background: gold ? "linear-gradient(180deg, rgba(245,158,11,.12), rgba(20,20,20,.98))" : "var(--nfl-predict-surface)",
        padding: "12px 12px 10px",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {showConfetti ? (
        <div className="nfl-bracket-confetti" aria-hidden>
          {CONFETTI_COLORS.map((c, i) => (
            <span key={i} className="nfl-bracket-confetti-dot" style={{ background: c, left: `${8 + i * 11}%` }} />
          ))}
        </div>
      ) : null}
      <div style={{ fontSize: 10, color: "var(--nfl-predict-muted)", marginBottom: 8, letterSpacing: "0.04em" }}>{roundLabel}</div>
      {homeReady ? (
        <TeamPickRow slot={game.home} game={game} side="home" onPick={onPickGame} disabled={!canPick} />
      ) : (
        <TbdRow label={tbdLabelFor(game, "home", conf)} />
      )}
      <div style={{ textAlign: "center", fontSize: 11, color: "var(--nfl-predict-muted)", margin: "4px 0" }}>vs</div>
      {awayReady ? (
        <TeamPickRow slot={game.away} game={game} side="away" onPick={onPickGame} disabled={!canPick} />
      ) : (
        <TbdRow label={tbdLabelFor(game, "away", conf)} />
      )}
    </div>
  );
}

function ByeCard({ team, conference }) {
  if (!team) return null;
  return (
    <div
      style={{
        width: "100%",
        borderRadius: 10,
        border: "1px dashed #333",
        background: "#111",
        padding: "10px 12px",
        opacity: 0.85,
        boxSizing: "border-box",
      }}
    >
      <div style={{ fontSize: 10, color: "var(--nfl-predict-muted)", marginBottom: 6 }}>{conference} #1 seed</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <RowLogo team={team} size={32} />
        <span style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>{team.shortName || team.fullName}</span>
        <SeedBadge seed={1} />
      </div>
      <div style={{ fontSize: 11, color: "var(--nfl-predict-muted)", marginTop: 6 }}>BYE — First round bye</div>
    </div>
  );
}

function WildCardColumn({ conference, games, byeTeam, onPickGame }) {
  return (
    <div className="nfl-bracket-wc-col" style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
      <ByeCard team={byeTeam} conference={conference} />
      {games.map((g) => (
        <MatchupCard key={g.id} game={g} roundLabel={`${conference} Wild Card`} onPickGame={onPickGame} />
      ))}
    </div>
  );
}

function GameGrid({ children, className = "" }) {
  return (
    <div className={`nfl-bracket-game-grid ${className}`.trim()} style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontFamily: "var(--mono-font)",
        fontSize: 11,
        letterSpacing: "0.1em",
        color: "#00F5E9",
        textTransform: "uppercase",
        marginBottom: 10,
        marginTop: 4,
      }}
    >
      {children}
    </div>
  );
}

export default function PlayoffPicture({ bracket, onPickGame, showSbConfetti = false }) {
  const [wide, setWide] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 640px)");
    const apply = () => setWide(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  if (!bracket) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "var(--nfl-predict-muted)", fontSize: 14 }}>Loading bracket…</div>
    );
  }

  const b = bracket;
  const afc1 = b.afc.seeds.find((s) => s.seed === 1)?.team;
  const nfc1 = b.nfc.seeds.find((s) => s.seed === 1)?.team;
  const sbWinner =
    b.superBowl.winner && b.superBowl.home?.team?.abbr === b.superBowl.winner
      ? b.superBowl.home.team
      : b.superBowl.winner && b.superBowl.away?.team?.abbr === b.superBowl.winner
        ? b.superBowl.away.team
        : null;

  const wcGridStyle = wide
    ? { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: "100%" }
    : { display: "flex", flexDirection: "column", gap: 16, width: "100%" };

  return (
    <div className="nfl-bracket-root" style={{ padding: "10px 12px 16px", width: "100%", boxSizing: "border-box" }}>
      <style>{`
        .nfl-bracket-confetti { position: absolute; inset: 0; pointer-events: none; }
        .nfl-bracket-confetti-dot {
          position: absolute; top: 20%; width: 8px; height: 8px; border-radius: 50%;
          animation: nflConfettiPop 1.5s ease-out forwards;
        }
        @keyframes nflConfettiPop {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(80px) scale(0.3); opacity: 0; }
        }
        @media (min-width: 640px) {
          .nfl-bracket-wc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        }
      `}</style>

      <header style={{ marginBottom: 20 }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 900 }}>2026 NFL Playoffs</h2>
        <p style={{ margin: 0, fontSize: 13, color: "var(--nfl-predict-muted)" }}>Projected from your picks — tap teams to advance</p>
      </header>

      <SectionLabel>Wild Card</SectionLabel>
      <div className="nfl-bracket-wc-grid" style={wcGridStyle}>
        <WildCardColumn conference="AFC" games={b.afc.wildCard} byeTeam={afc1} onPickGame={onPickGame} />
        <WildCardColumn conference="NFC" games={b.nfc.wildCard} byeTeam={nfc1} onPickGame={onPickGame} />
      </div>

      <div
        style={{
          margin: "20px 0",
          padding: "10px 12px",
          borderRadius: 10,
          background: "#111",
          fontSize: 12,
          color: "var(--nfl-predict-muted)",
          lineHeight: 1.45,
        }}
      >
        🏆 #1 Seeds — {afc1?.shortName || "AFC"} and {nfc1?.shortName || "NFC"} — advance directly to Divisional Round
      </div>

      <SectionLabel>Divisional</SectionLabel>
      <GameGrid>
        {b.afc.divisional.map((g) => (
          <MatchupCard key={g.id} game={g} conf={b.afc} roundLabel="AFC Divisional" onPickGame={onPickGame} />
        ))}
        {b.nfc.divisional.map((g) => (
          <MatchupCard key={g.id} game={g} conf={b.nfc} roundLabel="NFC Divisional" onPickGame={onPickGame} />
        ))}
      </GameGrid>

      <SectionLabel>Conference Championships</SectionLabel>
      <GameGrid>
        <MatchupCard game={b.afc.championship} conf={b.afc} roundLabel="AFC Championship" onPickGame={onPickGame} />
        <MatchupCard game={b.nfc.championship} conf={b.nfc} roundLabel="NFC Championship" onPickGame={onPickGame} />
      </GameGrid>

      <SectionLabel>Super Bowl LXI</SectionLabel>
      <div style={{ maxWidth: 480, margin: "0 auto", width: "100%" }}>
        {sbWinner && showSbConfetti ? (
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <RowLogo team={sbWinner} size={64} />
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 10 }}>🏆 Super Bowl Champion</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: sbWinner.primaryColor }}>{sbWinner.fullName}</div>
          </div>
        ) : null}
        <MatchupCard
          game={b.superBowl}
          roundLabel="Super Bowl LXI"
          onPickGame={onPickGame}
          gold
          showConfetti={showSbConfetti && !!sbWinner}
        />
      </div>
    </div>
  );
}
