import { useState, useEffect, useRef } from "react";

const BOARD_POLL_MS = 3 * 60 * 1000;
const CONTEXT_POLL_MS = 15 * 60 * 1000;

/**
 * @param {{ enabled?: boolean }} [opts]
 */
export function useLaligaData({ enabled = true } = {}) {
  const [laligaContextData, setLaligaContextData] = useState(null);
  const [laligaBoard, setLaligaBoard] = useState(null);
  const [laligaBoardLoading, setLaligaBoardLoading] = useState(false);
  const [laligaBoardUnavailable, setLaligaBoardUnavailable] = useState(false);
  const hasBoardRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setLaligaContextData(null);
      return undefined;
    }
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/laliga-context");
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (active) setLaligaContextData(data);
      } catch {
        if (active) setLaligaContextData(null);
      }
    }
    load();
    const poll = window.setInterval(load, CONTEXT_POLL_MS);
    return () => {
      active = false;
      window.clearInterval(poll);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      hasBoardRef.current = false;
      setLaligaBoard(null);
      setLaligaBoardLoading(false);
      setLaligaBoardUnavailable(false);
      return undefined;
    }
    let active = true;
    async function loadBoard() {
      try {
        const res = await fetch(`/api/laliga-board?includeProps=1&_ts=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (active) {
          const hasMatches = Boolean(data?.matches?.length);
          const feedFailed = data?.ok === false || Boolean(data?.error);
          hasBoardRef.current = hasMatches;
          setLaligaBoardUnavailable(feedFailed && !hasMatches);
          // Keep a successful empty payload (ok:true, no matches) so UI can say
          // "no fixtures yet" vs feed failure — only null on hard fetch errors.
          if (hasMatches) {
            setLaligaBoard(data);
          } else if (feedFailed) {
            setLaligaBoard(null);
          } else {
            setLaligaBoard(data && typeof data === "object" ? data : null);
          }
        }
      } catch {
        if (active) {
          hasBoardRef.current = false;
          setLaligaBoard(null);
          setLaligaBoardUnavailable(true);
        }
      } finally {
        if (active) setLaligaBoardLoading(false);
      }
    }
    if (!hasBoardRef.current) setLaligaBoardLoading(true);
    loadBoard();
    const poll = window.setInterval(loadBoard, BOARD_POLL_MS);
    return () => {
      active = false;
      window.clearInterval(poll);
    };
  }, [enabled]);

  return {
    laligaContextData,
    laligaBoard,
    laligaBoardLoading,
    laligaBoardUnavailable,
    laligaMatches: laligaBoard?.matches || [],
    laligaPropLines: laligaBoard?.propLines || [],
    laligaStandings: laligaBoard?.standings || [],
    laligaBoardAsOf: laligaBoard?.asOf || null,
  };
}
