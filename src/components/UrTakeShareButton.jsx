import { useState } from "react";
import { trackFunnelEvent } from "../lib/funnelAnalytics.js";

const SHARE_URL = "https://under-review.app";

const getShareBody = (bodyChunks) => {
  const c0 = bodyChunks?.[0];
  const full = typeof c0 === "string" ? c0 : c0?.text != null ? String(c0.text) : "";
  if (!String(full).trim()) return "";
  const match = full.match(/^.{20,}?[.!?](?=\s+[A-Z]|$)/);
  if (match) return match[0].trim();
  return full.slice(0, 200).replace(/\s+\S*$/, "").trim() + "...";
};

/**
 * Subtle share / copy for UR Take cards (Web Share API or clipboard).
 * Format: headline, first complete sentence from body, URL (no confidence line).
 */
export default function UrTakeShareButton({ headline, bodyChunks, sharePath = "" }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = sharePath
    ? `${SHARE_URL}${String(sharePath).startsWith("?") ? sharePath : `?${sharePath}`}`
    : SHARE_URL;

  const handleShare = async () => {
    const head = String(headline || "").trim();
    const body = getShareBody(bodyChunks);

    const finalText = body
      ? `${head}\n\n${body}\n\n${shareUrl}`
      : `${head}\n\n${shareUrl}`;

    try {
      if (navigator.share) {
        await navigator.share({ text: finalText });
        trackFunnelEvent("share_card_click", { shareMethod: "web_share" });
      } else {
        await navigator.clipboard.writeText(finalText);
        trackFunnelEvent("share_card_click", { shareMethod: "clipboard" });
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* user cancelled or error — fail silently */
    }
  };

  return (
    <button type="button" onClick={handleShare} className="ur-share-btn">
      {copied ? "Copied!" : "Share"}
    </button>
  );
}
