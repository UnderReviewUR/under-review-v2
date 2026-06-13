import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { WC_2026_TEAMS } from "../data/wc2026Teams.js";
import { mergeWcTeamsWithOutrights } from "../../shared/wc2026OutrightOdds.js";
import { buildWcXiStatusMap, detectXiConfirmedTransitions } from "../../shared/wcXiStatusPoll.js";
import {
  resolveClientWcGroups,
  resolveClientWcMatches,
  resolveClientWcOutrightsKv,
  resolveClientWcOutrightsMeta,
  stripWcTeamInternalMeta,
} from "../../shared/wcClientResilience.js";
import { resolveWcMatchEtDate, wcTodayEtYmd } from "../../shared/wcKickoffDisplay.js";

const WC_POLL_INTERVAL_MS = 60 * 1000;
const WC_POLL_TIGHT_INTERVAL_MS = 30 * 1000;
const WC_NEAR_KICKOFF_MS = 90 * 60 * 1000;

function isLiveStatus(status) {
  return ["live", "in_progress", "1h", "2h", "ht"].includes(String(status || "").toLowerCase());
}

function wcPollIntervalMs(matchRows, nowMs = Date.now()) {
  const rows = Array.isArray(matchRows) ? matchRows : [];
  const todayEt = wcTodayEtYmd(nowMs);
  for (const m of rows) {
    if (isLiveStatus(m.status)) return WC_POLL_TIGHT_INTERVAL_MS;
    if (resolveWcMatchEtDate(m) !== todayEt) continue;
    const ts = Number(m.commenceTs);
    if (Number.isFinite(ts) && ts > nowMs && ts - nowMs <= WC_NEAR_KICKOFF_MS) {
      return WC_POLL_TIGHT_INTERVAL_MS;
    }
  }
  return WC_POLL_INTERVAL_MS;
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
  const [matchReadContext, setMatchReadContext] = useState(null);
  const [xiConfirmedNotice, setXiConfirmedNotice] = useState(null);
  const xiStatusMapRef = useRef(new Map());
  const loadGenerationRef = useRef(0);

  const teams = useMemo(
    () => stripWcTeamInternalMeta(mergeWcTeamsWithOutrights(WC_2026_TEAMS, outrightsKv)),
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

  const applyPayloads = useCallback(
    (groupsData, matchesData, outrightsData, upcomingData) => {
      const nowMs = Date.now();
      const resolvedGroups = resolveClientWcGroups(groupsData);
      const resolvedMatches = resolveClientWcMatches(matchesData, nowMs);
      const resolvedOutrights = resolveClientWcOutrightsKv(outrightsData);

      setGroups(resolvedGroups);
      setMatches(resolvedMatches);
      setLiveMatches(resolvedMatches.filter((m) => isLiveStatus(m.status)));
      ingestXiPoll(resolvedMatches);

      if (upcomingData?.upcoming?.length) {
        setUpcomingMatches(upcomingData.upcoming);
      } else {
        const todayEt = wcTodayEtYmd(nowMs);
        setUpcomingMatches(
          resolvedMatches
            .filter((m) => {
              if (!isScheduled(m.status)) return false;
              const etDate = resolveWcMatchEtDate(m);
              return etDate && etDate > todayEt;
            })
            .sort((a, b) => (Number(a.commenceTs) || 0) - (Number(b.commenceTs) || 0))
            .slice(0, 12),
        );
      }

      setOutrightsKv(resolvedOutrights);
      setOutrightsMeta(resolveClientWcOutrightsMeta(outrightsData));
    },
    [ingestXiPoll],
  );

  const loadAll = useCallback(async () => {
    const generation = ++loadGenerationRef.current;
    setWcLoading(true);
    try {
      const [groupsRes, matchesRes, outrightsRes, upcomingRes, matchReadRes] = await Promise.all([
        fetch("/api/world-cup?view=groups", { cache: "no-store" }),
        fetch("/api/world-cup?view=matches", { cache: "no-store" }),
        fetch("/api/world-cup?view=outrights", { cache: "no-store" }),
        fetch("/api/world-cup?view=upcoming", { cache: "no-store" }),
        fetch("/api/world-cup?view=match_read_context", { cache: "no-store" }),
      ]);
      fetch("/api/world-cup?view=context", { cache: "no-store" }).catch(() => {});

      const groupsData = groupsRes.ok ? await groupsRes.json().catch(() => null) : null;
      const matchesData = matchesRes.ok ? await matchesRes.json().catch(() => null) : null;
      const outrightsData = outrightsRes.ok ? await outrightsRes.json().catch(() => null) : null;
      const upcomingData = upcomingRes.ok ? await upcomingRes.json().catch(() => null) : null;
      const matchReadData = matchReadRes.ok ? await matchReadRes.json().catch(() => null) : null;

      if (generation !== loadGenerationRef.current) return;

      applyPayloads(groupsData, matchesData, outrightsData, upcomingData);
      if (matchReadData?.ok) {
        setMatchReadContext({
          teamStats: matchReadData.teamStats || null,
          bdlFutures: matchReadData.bdlFutures || null,
          ready: Boolean(matchReadData.ready),
        });
      }
    } catch (e) {
      if (generation === loadGenerationRef.current) {
        console.warn("[useWorldCupData] fetch failed:", e?.message);
        applyPayloads(null, null, null, null);
      }
    } finally {
      if (generation === loadGenerationRef.current) setWcLoading(false);
    }
  }, [applyPayloads]);

  const retryWcLoad = useCallback(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    let isCurrent = true;
    let pollId = null;
    const matchRowsRef = { current: [] };

    loadAll();

    async function pollWc() {
      try {
        const [liveRes, matchesRes] = await Promise.all([
          fetch("/api/world-cup?view=live", { cache: "no-store" }),
          fetch("/api/world-cup?view=matches", { cache: "no-store" }),
        ]);
        if (!isCurrent) return;
        const liveData = liveRes.ok ? await liveRes.json().catch(() => null) : null;
        const matchesData = matchesRes.ok ? await matchesRes.json().catch(() => null) : null;
        const resolvedMatches = resolveClientWcMatches(matchesData, Date.now());
        const liveRows = Array.isArray(liveData?.live) ? liveData.live : [];
        if (liveData?.live) setLiveMatches(liveData.live);
        if (resolvedMatches.length) {
          setMatches(resolvedMatches);
          ingestXiPoll([...resolvedMatches, ...liveRows]);
        } else if (liveRows.length) {
          ingestXiPoll(liveRows);
        }
        matchRowsRef.current = [...resolvedMatches, ...liveRows];
      } catch {
        /* silent poll — board keeps last good state */
      }
    }

    async function pollLoop() {
      await pollWc();
      if (!isCurrent) return;
      pollId = window.setTimeout(pollLoop, wcPollIntervalMs(matchRowsRef.current));
    }

    pollLoop();

    return () => {
      isCurrent = false;
      if (pollId) window.clearTimeout(pollId);
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
    matchReadContext,
    retryWcLoad,
    xiConfirmedNotice,
    dismissXiConfirmedNotice,
  };
}
