import { useState, useEffect, useMemo } from "react";
import { WC_2026_TEAMS } from "../data/wc2026Teams.js";
import { mergeWcTeamsWithOutrights } from "../../shared/wc2026OutrightOdds.js";

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
  const [outrightsKv, setOutrightsKv] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  const teams = useMemo(
    () => mergeWcTeamsWithOutrights(WC_2026_TEAMS, outrightsKv),
    [outrightsKv],
  );

  useEffect(() => {
    let isCurrent = true;
    let pollId = null;

    async function loadAll() {
      setWcLoading(true);
      try {
        const [groupsRes, matchesRes, outrightsRes, upcomingRes] = await Promise.all([
          fetch("/api/world-cup?view=groups", { cache: "no-store" }),
          fetch("/api/world-cup?view=matches", { cache: "no-store" }),
          fetch("/api/world-cup?view=outrights", { cache: "no-store" }),
          fetch("/api/world-cup?view=upcoming", { cache: "no-store" }),
        ]);
        const groupsData = groupsRes.ok ? await groupsRes.json() : null;
        const matchesData = matchesRes.ok ? await matchesRes.json() : null;
        const outrightsData = outrightsRes.ok ? await outrightsRes.json() : null;
        const upcomingData = upcomingRes.ok ? await upcomingRes.json() : null;
        if (!isCurrent) return;
        if (groupsData?.groups) setGroups(groupsData.groups);
        if (matchesData?.matches) {
          setMatches(matchesData.matches);
          setLiveMatches(matchesData.matches.filter((m) => isLiveStatus(m.status)));
        }
        if (upcomingData?.upcoming) {
          setUpcomingMatches(upcomingData.upcoming);
        } else if (matchesData?.matches) {
          setUpcomingMatches(
            matchesData.matches.filter((m) => isScheduled(m.status)).slice(0, 12),
          );
        }
        if (outrightsData?.outrights) setOutrightsKv(outrightsData.outrights);
        if (groupsData?.error || matchesData?.error) {
          setFetchError(groupsData?.error || matchesData?.error);
        } else {
          setFetchError(null);
        }
      } catch (e) {
        if (isCurrent) {
          console.warn("[useWorldCupData] fetch failed:", e?.message);
          setFetchError(e?.message || "fetch_failed");
        }
      } finally {
        if (isCurrent) setWcLoading(false);
      }
    }

    loadAll();
    pollId = window.setInterval(() => {
      fetch("/api/world-cup?view=live", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (!isCurrent) return;
          if (d?.live) setLiveMatches(d.live);
        })
        .catch(() => {});
    }, 60000);

    return () => {
      isCurrent = false;
      if (pollId) window.clearInterval(pollId);
    };
  }, []);

  return {
    wcLoading,
    groups,
    matches,
    liveMatches,
    upcomingMatches,
    teams,
    fetchError,
  };
}
