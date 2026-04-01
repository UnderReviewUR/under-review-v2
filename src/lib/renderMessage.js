import { createElement } from "react";

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// Minimal formatter for chat output.
// Preserves line breaks and keeps message rendering safe by default.
export default function renderMessage(text) {
  const escaped = escapeHtml(text || "");
  const html = escaped.replaceAll("\n", "<br />");
  return createElement("span", { dangerouslySetInnerHTML: { __html: html } });
}
