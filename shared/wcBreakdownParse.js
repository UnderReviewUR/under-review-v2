/**
 * Parse UR Take deep breakdown prose into labeled sections for WC cards.
 */

const LABELED_SECTION_MARKERS = [
  { key: "scoreboard", label: "Scoreboard", pattern: /\bSCOREBOARD SCRIPT:\s*/gi },
  { key: "winsIf", label: "Wins if", pattern: /\bWins-if:\s*/gi },
  { key: "diesIf", label: "Dies if", pattern: /\bDies-if:\s*/gi },
  { key: "watchFor", label: "Watch for", pattern: /\bWATCH FOR:\s*/gi },
];

/**
 * Drop duplicate paragraphs (e.g. Watch for repeated in breakdown assembly).
 * @param {string} text
 */
export function dedupeWcBreakdownParagraphs(text) {
  const paras = String(text || "")
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  /** @type {string[]} */
  const out = [];
  for (const para of paras) {
    const key = para.toLowerCase().replace(/\s+/g, " ").slice(0, 72);
    const dup = out.some((existing) => {
      const other = existing.toLowerCase().replace(/\s+/g, " ").slice(0, 72);
      return key === other || key.includes(other) || other.includes(key);
    });
    if (!dup) out.push(para);
  }
  return out.join("\n\n");
}

/**
 * @param {string} text
 * @returns {{ preamble: string, sections: Array<{ key: string, label: string, body: string }> }}
 */
export function parseWcBreakdownSections(text) {
  const raw = dedupeWcBreakdownParagraphs(String(text || "").trim());
  if (!raw) return { preamble: "", sections: [] };

  /** @type {Array<{ key: string, label: string, index: number, markerLen: number }>} */
  const hits = [];
  for (const spec of LABELED_SECTION_MARKERS) {
    const re = new RegExp(spec.pattern.source, spec.pattern.flags);
    let match = re.exec(raw);
    while (match) {
      hits.push({
        key: spec.key,
        label: spec.label,
        index: match.index,
        markerLen: match[0].length,
      });
      match = re.exec(raw);
    }
  }

  if (!hits.length) {
    return { preamble: raw, sections: [] };
  }

  hits.sort((a, b) => a.index - b.index);

  const preamble = raw.slice(0, hits[0].index).trim();
  /** @type {Array<{ key: string, label: string, body: string }>} */
  const sections = [];

  for (let i = 0; i < hits.length; i += 1) {
    const hit = hits[i];
    const start = hit.index + hit.markerLen;
    const end = i + 1 < hits.length ? hits[i + 1].index : raw.length;
    const body = raw.slice(start, end).trim();
    if (!body) continue;
    const prev = sections[sections.length - 1];
    if (prev && prev.key === hit.key) {
      prev.body = `${prev.body} ${body}`.trim();
      continue;
    }
    sections.push({ key: hit.key, label: hit.label, body });
  }

  return { preamble, sections };
}
