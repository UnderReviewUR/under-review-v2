import { useState, useEffect, useCallback } from "react";

export function usePerformance(userEmail) {
  const [performanceData, setPerformanceData] = useState(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performanceError, setPerformanceError] = useState("");

  const loadPerformanceSnapshot = useCallback(async () => {
    const email = String(userEmail || "").trim();
    if (!email) {
      setPerformanceData(null);
      return;
    }
    setPerformanceLoading(true);
    setPerformanceError("");
    try {
      const res = await fetch(`/api/performance?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load performance");
      setPerformanceData(data);
    } catch (err) {
      setPerformanceError(err?.message || "Failed to load performance");
    } finally {
      setPerformanceLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail) return;
    loadPerformanceSnapshot();
  }, [loadPerformanceSnapshot, userEmail]);

  return {
    performanceData,
    performanceLoading,
    performanceError,
    loadPerformanceSnapshot,
  };
}
