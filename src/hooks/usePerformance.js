import { useState, useEffect, useCallback } from "react";

/**
 * @param {string} userEmail
 * @param {() => Promise<Record<string, string>>} [getTakeAuthHeaders]
 */
export function usePerformance(userEmail, getTakeAuthHeaders) {
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
      const headers = { "Content-Type": "application/json" };
      if (typeof getTakeAuthHeaders === "function") {
        Object.assign(headers, await getTakeAuthHeaders());
      }
      const res = await fetch("/api/performance", {
        method: "POST",
        headers,
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load performance");
      setPerformanceData(data);
    } catch (err) {
      setPerformanceError(err?.message || "Failed to load performance");
    } finally {
      setPerformanceLoading(false);
    }
  }, [userEmail, getTakeAuthHeaders]);

  useEffect(() => {
    if (!userEmail) return;
    queueMicrotask(() => {
      void loadPerformanceSnapshot();
    });
  }, [loadPerformanceSnapshot, userEmail]);

  return {
    performanceData,
    performanceLoading,
    performanceError,
    loadPerformanceSnapshot,
  };
}
