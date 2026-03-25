// src/components/PropCard.jsx

export default function PropCard({ player, prop, reason }) {
  const propLower = (prop || "").toLowerCase();

  const isOver =
    propLower.includes("over") ||
    propLower.includes("winner") ||
    propLower.includes("ml") ||
    propLower.includes("-1");

  const isUnder = propLower.includes("under");

  const badgeColor = isOver ? "#00F5E9" : isUnder ? "#FF2D6B" : "#F5C842";

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderLeft: `3px solid ${badgeColor}`,
        borderRadius: 16,
        padding: "14px 16px",
        marginBottom: 10,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      {/* Top row: Player name + prop badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: 14,
            fontWeight: 800,
            color: "#F7F8FA",
          }}
        >
          {player}
        </span>

        <span
          style={{
            background: badgeColor,
            color: "#080A0C",
            fontFamily: "DM Mono, monospace",
            fontSize: 11,
            fontWeight: 700,
            padding: "3px 10px",
            borderRadius: 999,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          {prop}
        </span>
      </div>

      {/* Reason line below */}
      {reason ? (
        <p
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: 13,
            color: "rgba(247,248,250,0.72)",
            margin: 0,
            lineHeight: 1.55,
          }}
        >
          {reason}
        </p>
      ) : null}
    </div>
  );
}
