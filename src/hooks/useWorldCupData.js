import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { WC_2026_TEAMS } from "../data/wc2026Teams.js";
import { mergeWcTeamsWithOutrights } from "../../shared/wc2026OutrightOdds.js";
import { buildWcXiStatusMap, detectXiConfirmedTransitions } from "../../shared/wcXiStatusPoll.js";

function isLiveStatus(status) {
  return ["live", "in_progress", "1h", "2h", "ht"].includes(String(status || "").toLowerCase());
}

function isScheduled(status) {
  const s = String(status || "").toLowerCase();
  return s === "ns" || s === "scheduled" || s === "not started" || s === "upcoming";
}

function wcXiSeenStorageKey(eventId) {
  return `wc_xi_confirmed_seen_${eventId}`;
}

function wcXiDismissStorageKey(eventId) {
  return `wc_xi_banner_dismiss_${eventId}`;
}

function shouldSurfaceXiNotice(eventId) {
  if (typeof sessionStorage === "undefined") return true;
  if (sessionStorage.getItem(wcXiDismissStorageKey(eventId))) return false;
  if (sessionStorage.getItem(wcXiSeenStorageKey(eventId))) return false;
  return true;
}

function markXiNoticeSeen(eventId) {
  try {
    sessionStorage?.setItem(wcXiSeenStorageKey(eventId), String(Date.now()));
  } catch {
    /* ignore */
  }
}

/**
 * @param {Array<Record<string, unknown>>} a
 * @param {Array<Record<string, unknown>>} b
 */
function mergeMatchRowsForXiPoll(...lists) {
  const byId = new Map();
  for (const list of lists) {
    for (const m of Array.isArray(list) ? list : []) {
      const id = m?.id != null ? String(m.id).trim() : "";
      if (!id) continue;
      byId.set(id, m);
    }
  }
  return [...byId.values()];
}

export function useWorldCupData() {
  const [wcLoading, setWcLoading] = useState(true);
  const [groups, setGroups] = useState(null);
  const [matches, setMatches] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [outrightsKv, setOutrightsKv] = useState(null);
  const [outrightsMeta, setOutrightsMeta] = useState(null);
  const [dataHealth, setDataHealth] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [xiConfirmedNotice, setXiConfirmedNotice] = useState(null);
  const xiStatusMapRef = useRef(new Map());
  const loadGenerationRef = useRef(0);

  const teams = useMemo(
    () => mergeWcTeamsWithOutrights(WC_2026_TEAMS, outrightsKv),
    [outrightsKv],
  );

  const ingestXiPoll = useCallback((matchRows) => {
    const merged = mergeMatchRowsForXiPoll(matchRows);
    const hits = detectXiConfirmedTransitions(xiStatusMapRef.current, merged);
    xiStatusMapRef.current = buildWcXiStatusMap(merged);
    for (const hit of hits) {
      if (!shouldSurfaceXiNotice(hit.eventId)) continue;
      markXiNoticeSeen(hit.eventId);
      setXiConfirmedNotice(hit);
      break;
    }
  }, []);

  const dismissXiConfirmedNotice = useCallback((notice) => {
    const eventId = notice?.eventId != null ? String(notice.eventId).trim() : "";
    if (eventId) {
      try {
        sessionStorage?.setItem(wcXiDismissStorageKey(eventId), "1");
      } catch {
        /* ignore */
      }
    }
    setXiConfirmedNotice(null);
  }, []);

  const loadAll = useCallback(async () => {
    const generation = ++loadGenerationRef.current;
    setWcLoading(true);
    setFetchError(null);
    try {
      const [groupsRes, matchesRes, outrightsRes, upcomingRes] = await Promise.all([
        fetch("/api/world-cup?view=groups", { cache: "no-store" }),
        fetch("/api/world-cup?view=matches", { cache: "no-store" }),
        fetch("/api/world-cup?view=outrights", { cache: "no-store" }),
        fetch("/api/world-cup?view=upcoming", { cache: "no-store" }),
      ]);
      fetch("/api/world-cup?view=context", { cache: "no-store" }).catch(() => {});

      const groupsData = groupsRes.ok ? await groupsRes.json() : null;
      const matchesData = matchesRes.ok ? await matchesRes.json() : null;
      const outrightsData = outrightsRes.ok ? await outrightsRes.json() : null;
      const upcomingData = upcomingRes.ok ? await upcomingRes.json() : null;

      if (generation !== loadGenerationRef.current) return;

      const groupsOk = groupsRes.ok && groupsData?.groups;
      const matchesOk = matchesRes.ok && Array.isArray(matchesData?.matches);

      if (groupsOk) setGroups(groupsData.groups);
      if (matchesOk) {
        setMatches(matchesData.matches);
        setLiveMatches(matchesData.matches.filter((m) => isLiveStatus(m.status)));
        ingestXiPoll(matchesData.matches);
        setDataHealth(matchesData.dataHealth || null);
      }
      if (upcomingRes.ok && upcomingData?.upcoming) {
        setUpcomingMatches(upcomingData.upcoming);
      } else if (matchesOk) {
        setUpcomingMatches(
          matchesData.matches.filter((m) => isScheduled(m.status)).slice(0, 12),
        );
      }
      if (outrightsRes.ok && outrightsData?.outrights && Object.keys(outrightsData.outrights).length) {
        setOutrightsKv(outrightsData.outrights);
      } else if (outrightsRes.ok) {
        setOutrightsKv(null);
      }
      setOutrightsMeta({
        stale: Boolean(outrightsData?.stale),
        ageMinutes: outrightsData?.ageMinutes ?? null,
        lastUpdated: outrightsData?.lastUpdated ?? null,
        source: outrightsData?.source ?? null,
      });

      if (!groupsOk && !matchesOk) {
        setFetchError(
          groupsData?.error ||
            matchesData?.error ||
            `World Cup data unavailable (${groupsRes.status}/${matchesRes.status})`,
        );
      } else {
        setFetchError(null);
      }
    } catch (e) {
      if (generation === loadGenerationRef.current) {
        console.warn("[useWorldCupData] fetch failed:", e?.message);
        setFetchError(e?.message || "fetch_failed");
      }
    } finally {
      if (generation === loadGenerationRef.current) setWcLoading(false);
    }
  }, [ingestXiPoll]);

  const retryWcLoad = useCallback(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    let isCurrent = true;
    let pollId = null;

    loadAll();

    async function pollWc() {
      try {
        const [liveRes, matchesRes] = await Promise.all([
          fetch("/api/world-cup?view=live", { cache: "no-store" }),
          fetch("/api/world-cup?view=matches", { cache: "no-store" }),
        ]);
        if (!isCurrent) return;
        const liveData = liveRes.ok ? await liveRes.json() : null;
        const matchesData = matchesRes.ok ? await matchesRes.json() : null;
        if (liveData?.live) setLiveMatches(liveData.live);
        if (matchesData?.matches) {
          setMatches(matchesData.matches);
          ingestXiPoll([...(matchesData.matches || []), ...(liveData?.live || [])]);
        } else if (liveData?.live) {
          ingestXiPoll(liveData.live);
        }
      } catch {
        /* ignore poll errors */
      }
    }

    pollId = window.setInterval(pollWc, 60000);

    return () => {
      isCurrent = false;
      if (pollId) window.clearInterval(pollId);
    };
  }, [loadAll, ingestXiPoll]);

  return {
    wcLoading,
    groups,
    matches,
    liveMatches,
    upcomingMatches,
    teams,
    outrightsMeta,
    dataHealth,
    fetchError,
    retryWcLoad,
    xiConfirmedNotice,
    dismissXiConfirmedNotice,
  };
}
