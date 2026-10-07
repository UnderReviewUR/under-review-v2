/**
 * Substance gate + lock-screen copy for Alabama owner alerts.
 * Drop topic-label blurbs ("coach updates", "injuries for starting players")
 * that name no one and carry no actionable fact.
 */

const OUTLET_TAIL =
  /\s*[-–—|]\s*(?:espn|cbs sports|athletic|ap news|associated press|reuters|usa today|al\.com|roll tide wire|touchdown alabama|on3|247sports|rivals|bleacher report|fox sports|nbc sports|yahoo sports|google news)(?:\.\w+)?\s*$/i;

/** Headlines that are only a topic label — no who / what. */
const VAGUE_TOPIC = [
  /\bcoach(?:ing)?\s+updates?\b/i,
  /\binjury\s+updates?\b/i,
  /\binjuries?\s+for\s+(?:the\s+)?(?:starting\s+)?players?\b/i,
  /\bwhat\s+we\s+know\s+about\b/i,
  /\blatest\s+(?:on\s+)?(?:alabama\s+)?(?:injury|injuries|coach|coaching|roster)\b/i,
  /\bavailability\s+updates?\b/i,
  /\bpractice\s+(?:report|notes?|updates?)\b/i,
  /\binjury\s+report\b/i,
  /\broster\s+updates?\b/i,
  /\bdepth\s+chart\s+updates?\b/i,
  /\bcoaching\s+(?:news|notes?|rumors?)\b/i,
  /\balabama\s+(?:football\s+)?(?:news|notes?|updates?)\b/i,
];

const ACTIONABLE =
  /\b(?:ruled out|questionable|doubtful|out for(?: the)? season|sidelined|surgery|acl|mcl|acl tear|concussion|enters?(?: the)? portal|hire[sd]?|fires?|fired|dismissed|names?|named (?:head |offensive |defensive )?(?:coach|coordinator)|inactive|cleared(?: to play)?|suspended|torn|fracture|broken)\b/i;

const ROLE_TOKEN =
  /\b(?:QB|WR|RB|TE|OL|DL|LB|CB|S|K|P|QB1|OC|DC|HC|offensive coordinator|defensive coordinator|head coach)\b/i;

const DETAIL =
  /\b(?:vs\.?|versus|ankle|knee|hamstring|shoulder|wrist|foot|toe|back|ribs?|thumb|elbow|hip|groin|quad|calf|achilles|season|portal)\b/i;

/** Proper-case spans that are teams / days / outlets — not people. */
const NAME_STOP = new Set([
  "alabama",
  "crimson",
  "tide",
  "georgia",
  "auburn",
  "florida",
  "tennessee",
  "lsu",
  "ole",
  "miss",
  "texas",
  "oklahoma",
  "michigan",
  "ohio",
  "state",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
  "espn",
  "athletic",
  "sports",
  "football",
  "coach",
  "coaching",
  "injury",
  "injuries",
  "update",
  "updates",
  "report",
  "reports",
  "practice",
  "roster",
  "starter",
  "starters",
  "starting",
  "players",
  "player",
  "season",
  "week",
  "game",
  "gameday",
  "kickoff",
  "transfer",
  "portal",
  "news",
  "notes",
  "latest",
  "google",
  "associated",
  "press",
  "roll",
  "tide",
]);

/**
 * @param {string} s
 */
function collapse(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string} title
 */
export function isVagueAlabamaTopic(title) {
  const t = collapse(title);
  if (!t) return true;
  return VAGUE_TOPIC.some((re) => re.test(t));
}

/**
 * Pull First Last(+optional Third) spans that look like people.
 * @param {string} text
 * @returns {string[]}
 */
export function extractLikelyPersonNames(text) {
  const raw = String(text || "");
  const hits = raw.match(/\b[A-Z][a-z]+(?:[ '.][A-Z][a-z]+)+\b/g) || [];
  /** @type {string[]} */
  const out = [];
  for (const hit of hits) {
    const parts = hit.split(/[ '.]+/).filter(Boolean);
    if (parts.length < 2) continue;
    if (parts.every((p) => NAME_STOP.has(p.toLowerCase()))) continue;
    if (parts.some((p) => NAME_STOP.has(p.toLowerCase()) && parts.length === 2)) {
      // "Crimson Tide" / "Ole Miss" style — skip if both stop or first is stop team word
      if (NAME_STOP.has(parts[0].toLowerCase())) continue;
    }
    out.push(hit);
  }
  return [...new Set(out)];
}

/**
 * @param {string} text
 */
export function hasActionableAlabamaFact(text) {
  return ACTIONABLE.test(String(text || ""));
}

/**
 * True when the item names someone or carries a concrete status fact
 * (not a bare topic label).
 * @param {string} title
 * @param {string} [description]
 */
export function hasAlabamaSubstance(title, description = "") {
  const t = collapse(title);
  const d = collapse(String(description || "").replace(/<[^>]+>/g, " "));
  const blob = `${t} ${d}`;

  if (!t) return false;

  const names = extractLikelyPersonNames(blob);
  const actionable = hasActionableAlabamaFact(blob);
  const vagueTitle = isVagueAlabamaTopic(t);

  // Topic-label titles only survive if description salvages name + fact.
  if (vagueTitle) {
    return names.length > 0 && actionable;
  }

  if (names.length > 0 && actionable) return true;
  if (names.length > 0 && /\b(?:injured|injury|out|portal|suspended|starter|starting|inactive|limited)\b/i.test(blob)) {
    return true;
  }
  // Role + concrete status (+ detail) without a full name — e.g. "Alabama QB ruled out … ankle vs Georgia"
  if (ROLE_TOKEN.test(blob) && actionable && DETAIL.test(blob)) return true;
  if (actionable && DETAIL.test(blob) && /\balabama|crimson tide\b/i.test(blob)) return true;

  // Coaching hire/fire with a named person already covered above; bare "coach" keyword is not enough.
  if (
    /\b(?:hire[sd]?|fires?|fired|dismissed|names?|named)\b/i.test(blob) &&
    (names.length > 0 || ROLE_TOKEN.test(blob))
  ) {
    return true;
  }

  return false;
}

/**
 * @param {string} title
 */
export function stripAlabamaOutletTail(title) {
  let t = collapse(title);
  for (let i = 0; i < 3; i += 1) {
    const next = t.replace(OUTLET_TAIL, "");
    if (next === t) break;
    t = collapse(next);
  }
  return t;
}

/**
 * Lock-screen body: who / status / detail — never a generic topic chip.
 * @param {{ title?: string, description?: string, source?: string | null }} alert
 * @returns {string}
 */
export function formatAlabamaPushBody(alert) {
  let fact = stripAlabamaOutletTail(alert.title || "");
  const desc = collapse(
    String(alert.description || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " "),
  );

  const titleThin =
    !fact || isVagueAlabamaTopic(fact) || !hasAlabamaSubstance(fact, "");
  if (titleThin && desc) {
    const sentences = desc
      .split(/(?<=[.!?])\s+/)
      .map((s) => stripAlabamaOutletTail(s))
      .filter((s) => s.length >= 16);
    const better =
      sentences.find((s) => hasAlabamaSubstance(s, "")) ||
      sentences.find(
        (s) =>
          extractLikelyPersonNames(s).length > 0 && hasActionableAlabamaFact(s),
      ) ||
      (hasAlabamaSubstance(desc, "") ? stripAlabamaOutletTail(desc.split(/(?<=[.!?])\s+/)[0] || desc) : null);
    if (better) fact = collapse(better).replace(/[.]+$/, "");
  }

  fact = collapse(fact)
    .replace(/^["']+|["']+$/g, "")
    .replace(/[.]+$/, "");

  if (!fact) return "";

  // Keep one Alabama cue without "Alabama · Alabama …"
  if (/^(?:alabama|crimson tide)\b/i.test(fact)) {
    return fact.slice(0, 180);
  }
  return `Alabama · ${fact}`.slice(0, 180);
}
