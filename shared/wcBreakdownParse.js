/**
 * Parse UR Take deep breakdown prose into labeled sections for WC cards.
 */

const LABELED_SECTION_MARKERS = [
  { key: "match", label: "Match", pattern: /\bMatch:\s*/gi },
  { key: "lean", label: "Lean", pattern: /\bLean:\s*/gi },
  { key: "scoreboard", label: "Scoreboard", pattern: /\bSCOREBOARD SCRIPT:\s*/gi },
  { key: "simVsMarket", label: "Sim vs market", pattern: /\bSim vs market:\s*/gi },
  { key: "runnerUp", label: "Runner-up gap", pattern: /\bRunner-up gap:\s*/gi },
  { key: "bookLine", label: "Book line", pattern: /\bBook line:\s*/gi },
  { key: "matchOdds", label: "Match odds", pattern: /\b(?:MATCH ODDS|Match odds):\s*/gi },
  { key: "book", label: "Book", pattern: /\bBook:\s*/gi },
  { key: "pick", label: "Pick", pattern: /\bPick:\s*/gi },
  { key: "urSim", label: "UR sim", pattern: /\bUR sim:\s*/gi },
  { key: "urWinBar", label: "UR win bar", pattern: /\bUR model win bar:\s*/gi },
  { key: "groupPaths", label: "Group paths", pattern: /\bGroup paths:\s*/gi },
  { key: "groupContext", label: "Group context", pattern: /\bGroup [A-L] is four teams:\s*/gi },
  { key: "path", label: "Path", pattern: /\bPath:\s*/gi },
  { key: "coinFlip", label: "Coin-flip path", pattern: /\bCoin-flip path:\s*/gi },
  { key: "winsIf", label: "Wins if", pattern: /\b(?:Wins-if|WINS IF|This wins if):\s*/gi },
  { key: "diesIf", label: "Dies if", pattern: /\b(?:Dies-if|DIES IF|This dies if):\s*/gi },
  { key: "watchFor", label: "Watch for", pattern: /\b(?:WATCH FOR|Live trigger|Watch For|Watch for):\s*/gi },
  { key: "sharpAngle", label: "Sharp angle", pattern: /\b(?:SHARP ANGLE|Sharp angle):\s*/gi },
  { key: "context", label: "Context", pattern: /\bContext:\s*/gi },
  { key: "thePlay", label: "The play", pattern: /\bThe Play:\s*/gi },
  { key: "oneThing", label: "One thing", pattern: /\bOne Thing:\s*/gi },
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

/**
 * Split dense preamble paragraphs into scannable blocks when no labeled markers exist.
 * @param {string} preamble
 * @returns {string[]}
 */
export function splitWcBreakdownPreambleBlocks(preamble) {
  const raw = String(preamble || "").trim();
  if (!raw) return [];

  let parts = raw.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  /** @type {string[]} */
  const out = [];

  for (const part of parts) {
    if (part.length < 200 && !part.includes("Runner-up gap:")) {
      out.push(part);
      continue;
    }
    const sub = part
      .split(
        /(?=\bMatch:|\bLean:|\bSim vs market:|\bRunner-up gap:|\bBook line:|\b(?:MATCH ODDS|Match odds):|\bUR model win bar:|\bGroup paths:|\bGroup [A-L] is four teams:|\bPath:|\bCoin-flip path:|\b(?:Wins-if|WINS IF|Dies-if|DIES IF|This wins if|This dies if):|\bWATCH FOR:|\bSCOREBOARD SCRIPT:)/i,
      )
      .map((s) => s.trim())
      .filter(Boolean);
    out.push(...(sub.length ? sub : [part]));
  }
  return out;
}
