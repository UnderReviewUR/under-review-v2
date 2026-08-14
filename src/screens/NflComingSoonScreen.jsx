/**
 * Off-season NFL UR Take gate — live board stays visible; Predictor remains the escape hatch.
 */
import NflSlateTakesCard from "../components/NflSlateTakesCard.jsx";
import { mapNflBoardPropLinesToGuide } from "../lib/mapNflBoardPropLines.js";
import NflGameBoardSection from "../features/nfl/NflGameBoardSection.jsx";
import NflPropGuideSection from "../features/nfl/NflPropGuideSection.jsx";

export default function NflComingSoonScreen({
  onOpenPredictor,
  onOpenWorldCup,
  onGoHome,
  nflGames = [],
  nflPropLines = [],
  nflBoardLoading = false,
  nflBoardAsOf = null,
  isUnlimited = false,
  onOpenUpgrade = null,
}) {
  const liveGuide = mapNflBoardPropLinesToGuide(nflPropLines, 16);

  return (
    <main
      className="screen nfl-coming-soon"
      style={{
        padding: "16px 16px 32px",
        maxWidth: 560,
        margin: "0 auto",
      }}
    >
      <NflSlateTakesCard
        games={nflGames}
        asOf={nflBoardAsOf}
        isUnlimited={isUnlimited}
        askLive={false}
        onOpenUpgrade={onOpenUpgrade}
      />
      <NflGameBoardSection
        games={nflGames}
        loading={nflBoardLoading}
        asOf={nflBoardAsOf}
        onSelectGame={null}
      />
      {liveGuide.length ? (
        <>
          <div className="section-divider">Live player props</div>
          <NflPropGuideSection guide={liveGuide} onSelectProp={null} />
        </>
      ) : null}

      <div
        style={{
          borderRadius: 16,
          border: "1px solid rgba(74,144,217,.35)",
          background: "linear-gradient(180deg, rgba(74,144,217,.12), rgba(8,10,12,.6))",
          padding: "22px 18px 20px",
          marginTop: liveGuide.length || nflGames.length ? 16 : 8,
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono-font)",
            fontSize: 10,
            letterSpacing: 1.6,
            color: "#4A90D9",
            marginBottom: 10,
          }}
        >
          NFL · UR TAKE
        </div>
        <h1
          style={{
            margin: "0 0 12px",
            fontSize: 22,
            lineHeight: 1.25,
            color: "#fff",
            fontWeight: 700,
          }}
        >
          Ask returns with the 2026 season
        </h1>
        <p
          style={{
            margin: "0 0 20px",
            fontSize: 14,
            lineHeight: 1.55,
            color: "var(--soft)",
          }}
        >
          Slate takes and live lines are up above. Weekly UR Take unlocks with Week 1 of the
          regular season. Until then, use the 2026 Predictor for season W/L boards, or jump to World
          Cup coverage.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            type="button"
            onClick={onOpenPredictor}
            style={{
              minHeight: 46,
              borderRadius: 10,
              border: "none",
              background: "rgba(0,245,233,.18)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Open 2026 Predictor
          </button>
          {onOpenWorldCup ? (
            <button
              type="button"
              onClick={onOpenWorldCup}
              style={{
                minHeight: 44,
                borderRadius: 10,
                border: "1px solid rgba(0,245,233,.45)",
                background: "transparent",
                color: "#00F5E9",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              World Cup picks
            </button>
          ) : null}
          {onGoHome ? (
            <button
              type="button"
              onClick={onGoHome}
              style={{
                minHeight: 40,
                border: "none",
                background: "transparent",
                color: "var(--muted)",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Back to Home
            </button>
          ) : null}
        </div>
      </div>
    </main>
  );
}
