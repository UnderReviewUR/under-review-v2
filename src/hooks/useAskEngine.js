// ── UR TAKE ask engine ────────────────────────────────────────────────────────
import { useState, useCallback } from "react";
import { buildNflContext } from "../data/nflPlayers";

export default function useAskEngine({ players, context, liveMatches, clearImage }) {
  const [isAsking, setIsAsking] = useState(false);

  const askUrTake = useCallback(async ({ text, matchup, setMsgs, sportHint, pastedImage }) => {
    if (!text || isAsking) return;
    setIsAsking(true);

    const imgToSend = pastedImage;
    setMsgs(prev => [
      ...prev,
      { role: "user", text, image: imgToSend?.previewUrl || null },
      { role: "ai",   text: "THINKING...", loading: true },
    ]);
    clearImage();

    try {
      const body = {
        question:        text,
        players,
        context,
        liveMatches,
        history:         [],
        matchupContext:  matchup || null,
        nflContext:      buildNflContext(),
        sportHint:       sportHint || null,
      };
      if (imgToSend) {
        body.image = { base64: imgToSend.base64, mediaType: imgToSend.mediaType };
      }

      const res  = await fetch("/api/ur-take", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      setMsgs(prev => [
        ...prev.filter(m => !m.loading),
        { role: "ai", text: data.response || "Couldn't get a response — try again." },
      ]);
    } catch {
      setMsgs(prev => [
        ...prev.filter(m => !m.loading),
        { role: "ai", text: "Something went wrong — try again." },
      ]);
    } finally {
      setIsAsking(false);
    }
  }, [clearImage, context, isAsking, liveMatches, players]);

  return { isAsking, askUrTake };
}
