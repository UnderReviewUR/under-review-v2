import { useCallback, useEffect, useRef, useState } from "react";

function isLiveStatus(status) {
  return ["live", "in_progress", "1h", "2h", "ht"].includes(String(status || "").toLowerCase());
}

function isScheduled(status) {
  const s = String(status || "").toLowerCase();
  return s === "ns" || s === "scheduled" || s === "not started" || s === "upcoming";
}

export function useWorldCupData() {
  const [wcLoading, setWcLoading] = useState(true);
  const [groups, setGroups] = useState(null);
  const [matches, setMatches] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [fetchError, setFetchError] = useState(null);
  const mountedRef = useRef(false);

  const refreshWorldCup = useCallback(async () => {
    setWcLoading(true);
    try {
      const [groupsRes, matchesRes] = await Promise.all([
        fetch(`/api/world-cup?view=groups&_ts=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/world-cup?view=matches&_ts=${Date.now()}`, { cache: "no-store" }),
      ]);
      const groupsData = groupsRes.ok ? await groupsRes.json() : null;
      const matchesData = matchesRes.ok ? await matchesRes.json() : null;
      if (!mountedRef.current) return;
      if (groupsData?.groups) setGroups(groupsData.groups);
      if (matchesData?.matches) {
        setMatches(matchesData.matches);
        setLiveMatches(matchesData.matches.filter((m) => isLiveStatus(m.status)));
        setUpcomingMatches(matchesData.matches.filter((m) => isScheduled(m.status)).slice(0, 12));
      }
      setFetchError(groupsData?.error || matchesData?.error || null);
    } catch (e) {
      if (mountedRef.current) {
        console.warn("[useWorldCupData] fetch failed:", e?.message);
        setFetchError(e?.message || "fetch_failed");
      }
    } finally {
      if (mountedRef.current) setWcLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    queueMicrotask(() => { void refreshWorldCup(); });
    const pollId = window.setInterval(() => {
      fetch("/api/world-cup?view=live", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (!mountedRef.current) return;
          if (d?.live) setLiveMatches(d.live);
        })
        .catch(() => {});
    }, 60000);

    return () => {
      mountedRef.current = false;
      window.clearInterval(pollId);
    };
  }, [refreshWorldCup]);

  return {
    wcLoading,
    groups,
    matches,
    liveMatches,
    upcomingMatches,
    fetchError,
    refreshWorldCup,
  };
}
