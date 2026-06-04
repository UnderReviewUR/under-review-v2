/**
 * In-chat session structural edge — keeps THE PLAY aligned with an established thesis
 * (e.g. Rahm as value) instead of flipping to the live leaderboard leader (e.g. Smalley).
 */

const GOLF_NAME_RE = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\b/g;

const STRUCTURAL_MARKERS =
  /\b(structural\s+(?:edge|play|read|case)|value\s+play|chasing\s+script|major\s+pedigree|approach\s+game)\b/i;

function normalizePlayerName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ");
}

/** @param {string} name */
export function golferNameKey(name) {
  return normalizePlayerName(name).toLowerCase();
}

/** @param {string} a @param {string} b */
export function golfersNameMatch(a, b) {
  const ka = golferNameKey(a);
  const kb = golferNameKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  const la = ka.split(" ").pop() || "";
  const lb = kb.split(" ").pop() || "";
  return la.length >= 3 && la === lb;
}

/** @param {string} text */
function extractGolferNames(text) {
  const src = String(text || "");
  const names = new Set();
  let m;
  GOLF_NAME_RE.lastIndex = 0;
  while ((m = GOLF_NAME_RE.exec(src)) !== null) {
    const raw = normalizePlayerName(m[1]);
    if (!raw || raw.length < 5) continue;
    const lower = raw.toLowerCase();
    if (
      /^(the|and|for|with|this|that|from|over|under|live|odds|play|take|round|final|sunday|tonight|pga|golf)$/i.test(
        lower,
      )
    ) {
      continue;
    }
    if (/^(Step|Play|Call|Edge|Why|Confidence|Market|Leader|Value)$/i.test(raw)) continue;
    names.add(raw);
  }
  return [...names];
}

/** @param {object} turn */
function assistantBlob(turn) {
  const parts = [];
  const s = turn?.structured;
  if (s && typeof s === "object") {
    for (const k of ["call", "whyNow", "edge"]) {
      if (s[k]) parts.push(String(s[k]));
    }
  }
  parts.push(String(turn?.content || turn?.text || ""));
  return parts.join("\n");
}

/** @param {object} turn */
function pickPrimaryGolferFromTurn(turn) {
  const s = turn?.structured;
  if (s?.call) {
    const fromCall = extractGolferNames(String(s.call));
    if (fromCall[0]) return fromCall[0];
  }
  const blob = assistantBlob(turn);
  const names = extractGolferNames(blob);
  return names[0] || null;
}

/** @param {object} turn */
function turnLooksStructural(turn) {
  const s = turn?.structured;
  const blob = assistantBlob(turn);
  const sport = String(turn?.sport || "").toLowerCase();
  if (sport === "golf" && s?.call && String(s.call).trim().length >= 4) return true;
  if (STRUCTURAL_MARKERS.test(blob)) return true;
  if (s?.callType && /outright|top|make.?cut|matchup|value/i.test(String(s.callType))) return true;
  if (s?.call && STRUCTURAL_MARKERS.test(String(s.call))) return true;
  if (s?.whyNow && STRUCTURAL_MARKERS.test(String(s.whyNow))) return true;
  if (s?.edge && STRUCTURAL_MARKERS.test(String(s.edge))) return true;
  const conf = String(s?.confidence || "").trim();
  if (conf && !/^low$/i.test(conf) && s?.call) return true;
  return /\bTHE PLAY\b/i.test(blob) || /\bstructural\b/i.test(blob);
}

/**
 * @param {Array<{ name?: string, player?: string, position?: number | string, pos?: number | string }>} leaderboard
 */
export function pickLiveLeaderboardLeader(leaderboard) {
  const rows = Array.isArray(leaderboard) ? leaderboard : [];
  if (!rows.length) return null;

  const leaderRow =
    rows.find((r) => {
      const pos = r?.position ?? r?.pos ?? r?.rank;
      if (pos == null) return false;
      const p = String(pos).trim().toUpperCase();
      return p === "1" || p === "T1" || Number(pos) === 1;
    }) || rows[0];

  const name = String(leaderRow?.name ?? leaderRow?.player ?? leaderRow?.golfer ?? "").trim();
  return name || null;
}

/**
 * @param {string} player
 * @param {Array<{ player?: string, odds?: number | null }>} outrights
 * @param {(n: number) => string | null} formatOdds
 */
export function findOutrightOddsDisplayForGolfer(player, outrights, formatOdds) {
  const list = Array.isArray(outrights) ? outrights : [];
  const row = list.find((o) => o?.player && golfersNameMatch(o.player, player));
  if (!row || row.odds == null || !Number.isFinite(Number(row.odds))) return null;
  return typeof formatOdds === "function" ? formatOdds(Number(row.odds)) : null;
}

/**
 * @param {object[]} history
 * @param {string} [sportHint]
 * @returns {{ player: string, play: string, rationale: string } | null}
 */
export function findEstablishedSessionStructuralEdge(history, sportHint = "") {
  if (!Array.isArray(history) || history.length === 0) return null;
  const sport = String(sportHint || "").trim().toLowerCase();
  if (sport === "worldcup") return null;
  const golfSession =
    sport === "golf" || history.some((h) => String(h?.sport || "").toLowerCase() === "golf");

  const assistants = history.filter((h) => h.role === "assistant" || h.role === "ai");
  if (!assistants.length) return null;

  for (let i = assistants.length - 1; i >= 0; i -= 1) {
    const turn = assistants[i];
    const turnSport = String(turn?.sport || "").toLowerCase();
    if (sport === "golf" && turnSport && turnSport !== "golf") continue;
    if (golfSession && turnSport && turnSport !== "golf") continue;

    if (!turnLooksStructural(turn)) continue;

    const player = pickPrimaryGolferFromTurn(turn);
    if (!player) continue;

    const s = turn?.structured;
    const play =
      (s?.call && String(s.call).trim()) ||
      assistantBlob(turn)
        .split("\n")
        .find((ln) => /play|lean|back/i.test(ln))
        ?.slice(0, 160) ||
      player;

    const rationale = [s?.whyNow, s?.edge].filter(Boolean).join(" ").trim().slice(0, 280);

    return {
      player,
      play: String(play).slice(0, 200),
      rationale: rationale || String(s?.edge || s?.whyNow || "").slice(0, 280),
    };
  }

  return null;
}

/**
 * Chip model for UI — only when structural edge differs from live leader.
 * @param {{ sessionHistory: object[], sportHint?: string, leaderboard?: object[], outrights?: object[], formatOdds?: (n: number) => string | null }} opts
 */
export function buildStructuralEdgeChipModel(opts = {}) {
  const sportHint = String(opts.sportHint || "").trim().toLowerCase();
  if (sportHint && sportHint !== "golf") return null;

  const edge = findEstablishedSessionStructuralEdge(opts.sessionHistory || [], sportHint || "golf");
  if (!edge?.player) return null;

  const leader = pickLiveLeaderboardLeader(opts.leaderboard);
  if (!leader) return null;
  if (golfersNameMatch(edge.player, leader)) return null;

  const oddsDisplay = findOutrightOddsDisplayForGolfer(
    edge.player,
    opts.outrights,
    opts.formatOdds,
  );

  return {
    player: edge.player,
    leader,
    oddsDisplay,
    label: oddsDisplay
      ? `The angle: ${edge.player} ${oddsDisplay}`
      : `The angle: ${edge.player}`,
  };
}

/**
 * @param {string} priorSummary
 * @param {object[]} history
 * @param {string} sportHint
 */
export function appendSessionStructuralEdgeBlock(priorSummary, history, sportHint = "") {
  const edge = findEstablishedSessionStructuralEdge(history, sportHint);
  if (!edge) return priorSummary || "";

  const sport = String(sportHint || "").trim().toLowerCase();
  const golfRules =
    sport === "golf"
      ? `
GOLF LEADER vs VALUE (mandatory when live leaderboard exists):
- The leaderboard leader is who is ahead right now — not automatically THE PLAY.
- If ${edge.player} was established as the structural / value edge earlier this session, keep that as the primary betting angle unless new data explicitly breaks the thesis (injury, WD, weather delay, round collapse).
- Frame dual truth when they differ: "[Leader name] has the lead; ${edge.player} is the value / structural play we flagged."
- Do NOT flip THE PLAY to the live leader solely because they are atop the board. Only change structural edge if you state what new evidence flipped the read.
`
      : "";

  const block = `SESSION STRUCTURAL EDGE (established earlier in this chat — maintain unless explicitly flipped)
- Structural play: ${edge.player}
- Prior angle: ${edge.play}${edge.rationale ? `\n- Thesis: ${edge.rationale}` : ""}
- Do not let live leaderboard position override this structural read without naming new evidence.
- If the user asks "who wins" or "best bet," answer with leader context AND the established structural edge — they are different lanes.
${golfRules}`;

  if (!priorSummary) return block;
  return `${priorSummary}\n\n${block}`;
}
