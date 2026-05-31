import { useEffect, useMemo, useRef, useState } from "react";

const MAX_PULL_PX = 96;
const TRIGGER_PX = 72;

function isMobileTouch(e) {
  return e?.touches && e.touches.length === 1;
}

function isAtTop(el) {
  return Boolean(el) && el.scrollTop <= 0;
}

export function usePullToRefresh({ scrollRef, enabled = true, onRefresh, targetKey = "" }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(null);
  const pullDistanceRef = useRef(0);
  const draggingRef = useRef(false);
  const enabledRef = useRef(enabled);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    enabledRef.current = enabled;
    onRefreshRef.current = onRefresh;
  }, [enabled, onRefresh]);

  useEffect(() => {
    const el = scrollRef?.current;
    if (!el) return undefined;

    const reset = () => {
      startYRef.current = null;
      draggingRef.current = false;
      pullDistanceRef.current = 0;
      setPullDistance(0);
    };

    const onTouchStart = (e) => {
      if (!enabledRef.current || refreshing || typeof onRefreshRef.current !== "function") return;
      if (!isMobileTouch(e) || !isAtTop(el)) return;
      startYRef.current = e.touches[0].clientY;
      draggingRef.current = true;
    };

    const onTouchMove = (e) => {
      if (!draggingRef.current || startYRef.current == null || !isMobileTouch(e)) return;
      if (!isAtTop(el)) {
        reset();
        return;
      }
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta <= 0) {
        pullDistanceRef.current = 0;
        setPullDistance(0);
        return;
      }
      const eased = Math.min(MAX_PULL_PX, Math.round(delta * 0.55));
      pullDistanceRef.current = eased;
      setPullDistance(eased);
      if (eased > 8) e.preventDefault();
    };

    const onTouchEnd = async () => {
      if (!draggingRef.current) return;
      const shouldRefresh = pullDistanceRef.current >= TRIGGER_PX && typeof onRefreshRef.current === "function";
      startYRef.current = null;
      draggingRef.current = false;
      if (!shouldRefresh) {
        pullDistanceRef.current = 0;
        setPullDistance(0);
        return;
      }
      setRefreshing(true);
      pullDistanceRef.current = TRIGGER_PX;
      setPullDistance(TRIGGER_PX);
      try {
        await onRefreshRef.current();
      } finally {
        setRefreshing(false);
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", reset, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", reset);
    };
  }, [scrollRef, refreshing, targetKey]);

  return useMemo(
    () => ({
      pullDistance,
      refreshing,
      armed: pullDistance >= TRIGGER_PX,
      visible: refreshing || pullDistance > 0,
    }),
    [pullDistance, refreshing],
  );
}
