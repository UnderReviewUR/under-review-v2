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
      return undefined;
    }
    let active = true;
    async function loadBoard() {
      try {
        if (active) setNflBoardLoading(true);
        const res = await fetch("/api/nfl-board?includeProps=1");
        if (!res.ok) throw new Error(`NFL board ${res.status}`);
        const data = await res.json();
        if (active) setNflBoard(data?.ok === false ? null : data);
      } catch {
        if (active) setNflBoard(null);
      } finally {
        if (active) setNflBoardLoading(false);
      }
    }
    loadBoard();
    const poll = window.setInterval(loadBoard, BOARD_POLL_MS);
    return () => {
      active = false;
      window.clearInterval(poll);
    };
  }, [enabled]);

  const effectiveNflContextData = enabled ? nflContextData : null;
  const effectiveNflBoard = enabled ? nflBoard : null;
  const effectiveNflBoardLoading = enabled ? nflBoardLoading : false;
  const nflGames = Array.isArray(effectiveNflBoard?.games) ? effectiveNflBoard.games : [];
  const nflPropLines = Array.isArray(effectiveNflBoard?.propLines)
    ? effectiveNflBoard.propLines
    : [];

  return {
    nflContextData: effectiveNflContextData,
    nflBoard: effectiveNflBoard,
    nflBoardLoading: effectiveNflBoardLoading,
    nflGames,
    nflPropLines,
  };
}
