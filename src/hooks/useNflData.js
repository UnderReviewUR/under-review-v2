import { useState, useEffect } from "react";

const BOARD_POLL_MS = 3 * 60 * 1000;
const CONTEXT_POLL_MS = 15 * 60 * 1000;

/**
 * @param {{ enabled?: boolean }} [opts]
 */
export function useNflData({ enabled = true } = {}) {
  const [nflContextData, setNflContextData] = useState(null);
  const [nflBoard, setNflBoard] = useState(null);
  const [nflBoardLoading, setNflBoardLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setNflContextData(null);
      return undefined;
    }
    let active = true;
    async function loadNflContext() {
      try {
        const res = await fetch("/api/nfl-context");
        if (!res.ok) throw new Error(`NFL context ${res.status}`);
        const data = await res.json();
        if (active) setNflContextData(data);
      } catch {
        if (active) setNflContextData(null);
      }
    }
    loadNflContext();
    const poll = window.setInterval(loadNflContext, CONTEXT_POLL_MS);
    return () => {
      active = false;
      window.clearInterval(poll);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setNflBoard(null);
      setNflBoardLoading(false);
      return undefined;
    }
    let active = true;
    async function loadBoard() {
      try {
        const res = await fetch(`/api/nfl-board?includeProps=1&_ts=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (!res.ok) throw new Error(`NFL board ${res.status}`);
        const data = await res.json();
        if (active) setNflBoard(data?.ok === false ? null : data);
      } catch {
        if (active) setNflBoard(null);
      } finally {
        if (active) setNflBoardLoading(false);
      }
    }
    setNflBoardLoading(true);
    loadBoard();
    const poll = window.setInterval(loadBoard, BOARD_POLL_MS);
    return () => {
      active = false;
      window.clearInterval(poll);
    };
  }, [enabled]);

  const nflGames = Array.isArray(nflBoard?.games) ? nflBoard.games : [];
  const nflPropLines = Array.isArray(nflBoard?.propLines) ? nflBoard.propLines : [];

  return {
    nflContextData,
    nflBoard,
    nflBoardLoading,
    nflGames,
    nflPropLines,
  };
}
