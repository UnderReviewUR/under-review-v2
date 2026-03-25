// src/components/TournamentContextBar.jsx
import { TOURNAMENTS } from "../data/tournaments";
import TournamentBadge from "./TournamentBadge";

export default function TournamentContextBar({ activeTournamentId, onSelect }) {
  const active = TOURNAMENTS[activeTournamentId];

  return (
    <div style={{
      background: "#0D0F11",
      borderBottom: "1px solid #1E2124",
      padding: "12px 16px"
    }}>
      {/* Tournament selector row */}
      <div style={{
        display: "flex",
        gap: "8px",
        overflowX: "auto",
        paddingBottom: "10px",
        scrollbarWidth: "none"
      }}>
        {Object.values(TOURNAMENTS).map(t => (
          <TournamentBadge
            key={t.id}
            tournament={t}
            isActive={t.id === activeTournamentId}
            onClick={() => onSelect(t.id)}
          />
        ))}
      </div>

      {/* Active tournament context strip */}
      {active && (
        <div style={{
          display: "flex",
          gap: "16px",
          alignItems: "flex-start",
          paddingTop: "8px",
          flexWrap: "wrap"
        }}>
          <div>
            <p style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              color: "#9BA3AF",
              margin: "0 0 2px",
              letterSpacing: "0.06em"
            }}>ATP LEAN</p>
            <p style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "13px",
              color: "#00F5E9",
              margin: 0
            }}>{active.atp_favorite}</p>
          </div>

          <div>
            <p style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              color: "#9BA3AF",
              margin: "0 0 2px",
              letterSpacing: "0.06em"
            }}>WTA LEAN</p>
            <p style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "13px",
              color: "#FF2D6B",
              margin: 0
            }}>{active.wta_favorite}</p>
          </div>

          <div style={{ flex: 1, minWidth: "200px" }}>
            <p style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              color: "#9BA3AF",
              margin: "0 0 2px",
              letterSpacing: "0.06em"
            }}>SURFACE NOTE</p>
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "12px",
              color: "#9BA3AF",
              margin: 0,
              lineHeight: "1.5"
            }}>{active.note}</p>
          </div>
        </div>
      )}
    </div>
  );
}
