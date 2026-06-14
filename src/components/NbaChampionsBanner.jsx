import { useEffect, useRef, useState } from "react";
import { runConfettiBurst } from "../lib/confettiBurst.js";

export const NBA_KNICKS_CHAMPS_BANNER_KEY = "ur_nba_knicks_champs_2026_seen";

const KNICKS_LOGO =
  "https://a.espncdn.com/i/teamlogos/nba/500/ny.png";

function readBannerSeen() {
  if (typeof localStorage === "undefined") return true;
  try {
    return localStorage.getItem(NBA_KNICKS_CHAMPS_BANNER_KEY) === "1";
  } catch {
    return true;
  }
}

function NbaTrophyIcon() {
  return (
    <svg
      className="ur-nba-champs-trophy"
      viewBox="0 0 64 96"
      role="img"
      aria-label="NBA championship trophy"
    >
      <defs>
        <linearGradient id="ur-nba-trophy-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF4C2" />
          <stop offset="45%" stopColor="#E8B923" />
          <stop offset="100%" stopColor="#B8860B" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="18" rx="22" ry="8" fill="url(#ur-nba-trophy-gold)" opacity="0.95" />
      <path
        d="M12 18 C12 42 18 58 32 58 C46 58 52 42 52 18 Z"
        fill="url(#ur-nba-trophy-gold)"
        stroke="#C9A227"
        strokeWidth="1.2"
      />
      <rect x="24" y="58" width="16" height="10" rx="2" fill="#D4AF37" />
      <rect x="18" y="68" width="28" height="8" rx="2" fill="#B8860B" />
      <rect x="14" y="76" width="36" height="10" rx="3" fill="#8B6914" />
      <path
        d="M8 24 C2 28 0 36 4 42 C8 36 10 30 12 24 Z M56 24 C62 28 64 36 60 42 C56 36 54 30 52 24 Z"
        fill="url(#ur-nba-trophy-gold)"
        opacity="0.88"
      />
    </svg>
  );
}

/**
 * One-time Knicks championship celebration — dismissed state in localStorage.
 */
export default function NbaChampionsBanner() {
  const [open, setOpen] = useState(() => !readBannerSeen());
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!open || !canvasRef.current) return undefined;
    const stop = runConfettiBurst(canvasRef.current, {
      durationMs: 4500,
      colors: ["#F58426", "#006BB6", "#F5C842", "#FFFFFF", "#1D428A", "#B8860B"],
    });
    return stop;
  }, [open]);

  const dismiss = () => {
    try {
      localStorage.setItem(NBA_KNICKS_CHAMPS_BANNER_KEY, "1");
    } catch {
      /* non-fatal */
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <>
      <canvas ref={canvasRef} className="ur-nba-champs-confetti" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ur-nba-champs-title"
        className="ur-nba-champs-backdrop"
      >
        <div className="ur-nba-champs-card">
          <div className="ur-nba-champs-visual" aria-hidden>
            <img
              className="ur-nba-champs-logo"
              src={KNICKS_LOGO}
              alt=""
              width={72}
              height={72}
              decoding="async"
            />
            <NbaTrophyIcon />
          </div>

          <p className="ur-nba-champs-eyebrow">2026 NBA Champions</p>
          <h2 id="ur-nba-champs-title" className="ur-nba-champs-title">
            Congratulations, New York Knicks
          </h2>
          <p className="ur-nba-champs-lead">
            On a great season and an unforgettable Finals run — Madison Square Garden earned every
            moment.
          </p>
          <p className="ur-nba-champs-sub">
            Come back next season for an even more enhanced NBA experience on Under Review.
          </p>

          <button type="button" className="ur-nba-champs-cta" onClick={dismiss}>
            Continue
          </button>
        </div>
      </div>
    </>
  );
}
