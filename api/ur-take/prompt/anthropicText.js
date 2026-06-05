/** Extract plain text from Anthropic Messages API response payloads. */
export function extractAnthropicText(data) {
  if (!data) return "";
  if (Array.isArray(data.content)) {
    const parts = [];
    for (const block of data.content) {
      if (!block || typeof block !== "object") continue;
      if (block.type === "text" && typeof block.text === "string") parts.push(block.text);
      else if (block.type === "output_text" && typeof block.text === "string") parts.push(block.text);
    }
    if (parts.length) return parts.join("\n").trim();
  }
  if (typeof data.text === "string" && data.text.trim()) return data.text.trim();
  return "";
}
