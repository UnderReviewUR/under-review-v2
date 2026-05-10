import { useState } from "react";

function firstChunkText(bodyChunks) {
  const c0 = bodyChunks?.[0];
  if (typeof c0 === "string") return c0;
  if (c0 && typeof c0 === "object" && c0.text != null) return String(c0.text);
  return "";
}

/**
 * Subtle share / copy for UR Take cards (Web Share API or clipboard).
 */
export default function UrTakeShareButton({ headline, bodyChunks, confidence }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const body0 = firstChunkText(bodyChunks);
    const shareText = [
      headline,
      "",
      body0.slice(0, 200) + (body0.length > 200 ? "..." : ""),
      "",
      confidence ? `Confidence: ${confidence}` : "",
      "",
      "via under-review.app",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      if (navigator.share) {
        await navigator.share({ text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
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
