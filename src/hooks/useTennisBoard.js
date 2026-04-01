import { useEffect, useState } from "react";

export default function useTennisBoard() {
  const [players, setPlayers] = useState({ atp: {}, wta: {} });
  const [context, setContext] = useState(null);
  const [liveMatches, setLiveMatches] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedNflPlayer, setSelectedNflPlayer] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadContext() {
      try {
        const res = await fetch("/api/tennis-context");
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setContext(json);
      } catch {
        // Keep local defaults when API is unavailable.
      }
    }

    async function loadPlayers() {
      try {
        const res = await fetch("/api/tennis-players");
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) {
          setPlayers({
            atp: json?.atp || {},
            wta: json?.wta || {},
          });
        }
      } catch {
        // Keep empty local defaults when API is unavailable.
      }
    }

    async function loadLiveMatches() {
      try {
        const [atpRes, wtaRes] = await Promise.allSettled([
          fetch("/api/tennis?tour=atp"),
          fetch("/api/tennis?tour=wta"),
        ]);

        const parsed = [];

        if (atpRes.status === "fulfilled" && atpRes.value.ok) {
          const atpMatches = await atpRes.value.json();
          if (Array.isArray(atpMatches)) parsed.push(...atpMatches);
        }

        if (wtaRes.status === "fulfilled" && wtaRes.value.ok) {
          const wtaMatches = await wtaRes.value.json();
          if (Array.isArray(wtaMatches)) parsed.push(...wtaMatches);
        }

        if (!cancelled) setLiveMatches(parsed);
      } catch {
        // Keep empty list when API is unavailable.
      }
    }

    loadContext();
    loadPlayers();
    loadLiveMatches();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    players,
    context,
    liveMatches,
    selectedPlayer,
    setSelectedPlayer,
    selectedNflPlayer,
    setSelectedNflPlayer,
  };
}
