import { useState, useCallback, useRef } from "react";

export default function useAskEngine({
  pastedImage,
  clearImage,
  players,
  context,
  liveMatches,
}) {
  const [askInput, setAskInput] = useState("");
  const [askMsgs, setAskMsgs] = useState([]);
  const [isAsking, setIsAsking] = useState(false);

  const askInputRef = useRef(null);

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
  }, [askInput, isAsking, pastedImage, players, context, liveMatches, clearImage]);

  return {
    askInput,
    setAskInput,
    askMsgs,
    submitAsk,
    isAsking,
    askInputRef,
  };
}
