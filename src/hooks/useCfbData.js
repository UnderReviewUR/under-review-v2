import { useState, useEffect, useRef } from "react";

const BOARD_POLL_MS = 3 * 60 * 1000;
const CONTEXT_POLL_MS = 15 * 60 * 1000;

/**
 * @param {{ enabled?: boolean }} [opts]
 */
export function useCfbData({ enabled = true } = {}) {
  const [cfbContextData, setCfbContextData] = useState(null);
  const [cfbBoard, setCfbBoard] = useState(null);
  const [cfbBoardLoading, setCfbBoardLoading] = useState(false);
  const hasBoardRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setCfbContextData(null);
      return undefined;
    }
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/ncaaf-context");
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (active) setCfbContextData(data);
      } catch {
        if (active) setCfbContextData(null);
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
      setCfbBoard(null);
      setCfbBoardLoading(false);
      return undefined;
    }
    let active = true;
    async function loadBoard() {
      try {
        const res = await fetch(`/api/ncaaf-board?includeProps=1&_ts=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (active) {
          hasBoardRef.current = Boolean(data?.games?.length);
          setCfbBoard(data?.ok === false ? null : data);
        }
      } catch {
        if (active) {
          hasBoardRef.current = false;
          setCfbBoard(null);
        }
      } finally {
        if (active) setCfbBoardLoading(false);
      }
    }
    if (!hasBoardRef.current) setCfbBoardLoading(true);
    loadBoard();
    const poll = window.setInterval(loadBoard, BOARD_POLL_MS);
    return () => {
      active = false;
      window.clearInterval(poll);
    };
  }, [enabled]);

  return {
    cfbContextData,
    cfbBoard,
    cfbBoardLoading,
    cfbGames: cfbBoard?.games || [],
    cfbPropLines: cfbBoard?.propLines || [],
    cfbBoardAsOf: cfbBoard?.asOf || null,
  };
}
