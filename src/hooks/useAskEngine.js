import { useState, useCallback, useRef } from "react";

export default function useAskEngine({
  pastedImage,
  clearImage,
  players,
  context,
  liveMatches,
}) {
  // ─────────────────────────
  // Global ask state
  // ─────────────────────────
  const [isAsking, setIsAsking] = useState(false);

  // ─────────────────────────
  // Home / Ask tab
  // ─────────────────────────
  const [askInput, setAskInput] = useState("");
  const [askMsgs, setAskMsgs] = useState([]);
  const askInputRef = useRef(null);

  // ─────────────────────────
  // Tennis tab
  // ─────────────────────────
  const [tennisInput, setTennisInput] = useState("");
  const [tennisMsgs, setTennisMsgs] = useState([]);
  const tennisInputRef = useRef(null);

  // ─────────────────────────
  // Submit: generic Ask
  // ─────────────────────────
  const submitAsk = useCallback(async () => {
    const text = askInput.trim();
    if (!text || isAsking) return;

    setIsAsking(true);

    const img = pastedImage;
    const userMsg = { role: "user", text, image: img?.previewUrl || null };
    const thinking = { role: "ai", text: "THINKING...", loading: true };

    setAskMsgs((prev) => [...prev, userMsg, thinking]);
    setAskInput("");
    clearImage?.();

    try {
      const body = {
        question: text,
        players,
        context,
        liveMatches,
        history: [],
      };

      if (img?.base64) {
        body.image = {
          base64: img.base64,
          mediaType: img.mediaType,
        };
      }

      const res = await fetch("/api/ur-take", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      setAskMsgs((prev) => [
        ...prev.filter((m) => !m.loading),
        { role: "ai", text: data.response || "No response." },
      ]);
    } catch {
      setAskMsgs((prev) => [
        ...prev.filter((m) => !m.loading),
        { role: "ai", text: "Something went wrong." },
      ]);
    } finally {
      setIsAsking(false);
    }
  }, [
    askInput,
    isAsking,
    pastedImage,
    players,
    context,
    liveMatches,
    clearImage,
  ]);

  // ─────────────────────────
  // Submit: Tennis
  // ─────────────────────────
  const submitTennis = useCallback(async () => {
    const text = tennisInput.trim();
    if (!text || isAsking) return;

    setIsAsking(true);

    const userMsg = { role: "user", text };
    const thinking = { role: "ai", text: "THINKING...", loading: true };

    setTennisMsgs((prev) => [...prev, userMsg, thinking]);
    setTennisInput("");

    try {
      const res = await fetch("/api/ur-take", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          sportHint: "tennis",
          players,
          context,
          liveMatches,
          history: [],
        }),
      });

      const data = await res.json();

      setTennisMsgs((prev) => [
        ...prev.filter((m) => !m.loading),
        { role: "ai", text: data.response || "No response." },
      ]);
    } catch {
      setTennisMsgs((prev) => [
        ...prev.filter((m) => !m.loading),
        { role: "ai", text: "Something went wrong." },
      ]);
    } finally {
      setIsAsking(false);
    }
  }, [tennisInput, isAsking, players, context, liveMatches]);

  // ─────────────────────────
  // Submit: Home prompt card
  // ─────────────────────────
  const submitAskFromText = useCallback(async (rawText) => {
    const text = String(rawText || "").trim();
    if (!text || isAsking) return;

    setIsAsking(true);

    const userMsg = { role: "user", text };
    const thinking = { role: "ai", text: "THINKING...", loading: true };

    setAskMsgs((prev) => [...prev, userMsg, thinking]);
    setAskInput("");
    clearImage?.();

    try {
      const res = await fetch("/api/ur-take", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          players,
          context,
          liveMatches,
          history: [],
        }),
      });

      const data = await res.json();

      setAskMsgs((prev) => [
        ...prev.filter((m) => !m.loading),
        { role: "ai", text: data.response || "No response." },
      ]);
    } catch {
      setAskMsgs((prev) => [
        ...prev.filter((m) => !m.loading),
        { role: "ai", text: "Something went wrong." },
      ]);
    } finally {
      setIsAsking(false);
    }
  }, [isAsking, clearImage, players, context, liveMatches]);

  // ─────────────────────────
  // Public API
  // ─────────────────────────
  return {
    // Ask / Home
    askInput,
    setAskInput,
    askMsgs,
    submitAsk,
    submitAskFromText,
    askInputRef,

    // Tennis
    tennisInput,
    setTennisInput,
    tennisMsgs,
    submitTennis,
    tennisInputRef,

    // Shared
    isAsking,
  };
}
