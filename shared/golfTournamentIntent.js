/**
 * Map user questions to a specific PGA Tour event (majors, flagship weeks, etc.).
 * Used so UR Take does not answer "PGA Championship" with another week's live board.
 */

/** @typedef {{ slug: string, label: string, isMajor: boolean, phrases: string[] }} GolfTournamentIntentDef */

/** Longest phrases first at match time. */
export const GOLF_TOURNAMENT_INTENT_DEFS = [
  {
    slug: "pga_championship",
    label: "PGA Championship",
    isMajor: true,
    phrases: ["pga championship", "wanamaker trophy", "wanamaker"],
  },
  {
    slug: "us_open",
    label: "U.S. Open",
    isMajor: true,
    phrases: ["u.s. open", "us open", "united states open"],
  },
  {
    slug: "the_open",
    label: "The Open Championship",
    isMajor: true,
    phrases: ["the open championship", "open championship", "british open", "the open"],
  },
  {
    slug: "masters",
    label: "Masters Tournament",
    isMajor: true,
    phrases: [
      "masters tournament",
      "the masters",
      "masters week",
      "augusta national",
      "at augusta",
    ],
  },
  {
    slug: "players",
    label: "THE PLAYERS Championship",
    isMajor: false,
    phrases: ["the players championship", "players championship", "tpc sawgrass", "the players"],
  },
  {
    slug: "memorial",
    label: "Memorial Tournament",
    isMajor: false,
    phrases: ["memorial tournament", "muirfield village"],
  },
  {
    slug: "byron_nelson",
    label: "THE CJ CUP Byron Nelson",
    isMajor: false,
    phrases: [
      "cj cup byron nelson",
      "byron nelson",
      "tpc craig ranch",
      "craig ranch",
    ],
  },
  {
    slug: "rbc_heritage",
    label: "RBC Heritage",
    isMajor: false,
    phrases: ["rbc heritage", "harbour town", "hilton head"],
  },
  {
    slug: "genesis",
    label: "Genesis Invitational",
    isMajor: false,
    phrases: ["genesis invitational", "riviera country club", "at riviera"],
  },
  {
    slug: "pebble",
    label: "AT&T Pebble Beach Pro-Am",
    isMajor: false,
    phrases: ["pebble beach pro-am", "att pebble beach", "at&t pebble beach", "pebble beach"],
  },
  {
    slug: "wells_fargo",
    label: "Wells Fargo Championship",
    isMajor: false,
    phrases: ["wells fargo championship", "quail hollow"],
  },
  {
    slug: "farmers",
    label: "Farmers Insurance Open",
    isMajor: false,
    phrases: ["farmers insurance open", "torrey pines"],
  },
];

/** Course name fragments that belong to a different week — never keep these on the wrong intent. */
export const GOLF_INTENT_WRONG_COURSE_FRAGMENTS = {
  pga_championship: [
    "craig ranch",
    "byron nelson",
    "harbour town",
    "hilton head",
    "tpc scottsdale",
    "riviera country",
    "pebble beach",
    "bay hill",
  ],
  masters: ["craig ranch", "byron nelson", "quail hollow", "tpc sawgrass"],
  us_open: ["craig ranch", "augusta", "harbour town", "tpc sawgrass"],
  the_open: ["craig ranch", "augusta", "quail hollow", "pebble beach"],
  byron_nelson: ["quail hollow", "valhalla", "aronimink", "augusta national", "harbour town"],
  rbc_heritage: ["craig ranch", "quail hollow", "valhalla", "aronimink"],
};

export function normalizeGolfIntentText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugifyGolfLabel(value) {
  return normalizeGolfIntentText(value).replace(/[^a-z0-9]+/g, " ").trim();
}

export function slugOverlapsGolfLabels(a, b) {
  const x = slugifyGolfLabel(a || "");
  const y = slugifyGolfLabel(b || "");
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

/**
 * @param {string} question
 * @returns {{ slug: string, label: string, isMajor: boolean } | null}
 */
export function extractGolfTournamentIntentFromQuestion(question) {
  const q = normalizeGolfIntentText(question);
  if (!q) return null;

  const ranked = [...GOLF_TOURNAMENT_INTENT_DEFS].sort(
    (a, b) =>
      Math.max(...b.phrases.map((p) => p.length)) -
      Math.max(...a.phrases.map((p) => p.length)),
  );

  for (const def of ranked) {
    for (const phrase of def.phrases) {
      const p = normalizeGolfIntentText(phrase);
      if (!p) continue;
      if (q.includes(p)) {
        return { slug: def.slug, label: def.label, isMajor: Boolean(def.isMajor) };
      }
    }
  }

  return null;
}

/**
 * @param {string} name
 * @param {string} [shortName]
 * @param {{ slug: string, label: string }} intent
 */
export function golfLabelsMatchIntent(name, shortName, intent) {
  if (!intent) return false;
  const blob = normalizeGolfIntentText(`${name || ""} ${shortName || ""}`);
  if (!blob) return false;

  const def = GOLF_TOURNAMENT_INTENT_DEFS.find((d) => d.slug === intent.slug);
  if (!def) return false;

  for (const phrase of def.phrases) {
    const p = normalizeGolfIntentText(phrase);
    if (p && blob.includes(p)) return true;
  }

  const labelSlug = slugifyGolfLabel(intent.label);
  const blobSlug = slugifyGolfLabel(blob);
  if (labelSlug && blobSlug && (blobSlug.includes(labelSlug) || labelSlug.includes(blobSlug))) {
    return true;
  }

  return false;
}

/**
 * @param {{ name?: string, shortName?: string } | null | undefined} currentEvent
 * @param {{ slug: string, label: string } | null} intent
 */
export function golfCourseConflictsWithIntent(course, intent) {
  if (!intent || !course) return false;
  const c = slugifyGolfLabel(course);
  if (!c || c === "tbd") return false;
  const blocked = GOLF_INTENT_WRONG_COURSE_FRAGMENTS[intent.slug] || [];
  return blocked.some((frag) => {
    const f = slugifyGolfLabel(frag);
    return f && (c.includes(f) || f.includes(c));
  });
}

export function golfCurrentEventMatchesIntent(currentEvent, intent) {
  if (!intent) return true;
  if (!currentEvent) return false;
  if (!golfLabelsMatchIntent(currentEvent.name, currentEvent.shortName, intent)) return false;
  if (golfCourseConflictsWithIntent(currentEvent.course, intent)) return false;
  return true;
}

export function golfContextNeedsCourseResolution(currentEvent, intent) {
  if (!intent || !currentEvent) return false;
  if (!golfLabelsMatchIntent(currentEvent.name, currentEvent.shortName, intent)) return false;
  const course = String(currentEvent.course || "").trim();
  return !course || course === "TBD" || golfCourseConflictsWithIntent(course, intent);
}

/**
 * @param {Array<Record<string, unknown>> | null | undefined} tourSchedule
 * @param {{ slug: string, label: string, isMajor?: boolean }} intent
 */
export function findBestScheduleRowForIntent(tourSchedule, intent) {
  if (!intent || !Array.isArray(tourSchedule) || tourSchedule.length === 0) return null;

  const scored = tourSchedule
    .filter(Boolean)
    .map((row) => {
      let score = 0;
      if (golfLabelsMatchIntent(row.name, row.shortName, intent)) score += 10_000;
      if (intent.isMajor && /pga championship|masters|u\.?s\.? open|open championship/i.test(`${row.name} ${row.shortName}`)) {
        score += 500;
      }
      const st = normalizeGolfIntentText(row.status || row.rawStatus || "");
      if (st.includes("live") || st.includes("progress")) score += 200;
      const purse = Number(row.purse || 0);
      score += Math.min(purse / 1e6, 50);
      return { row, score };
    })
    .filter((x) => x.score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.row || null;
}

/**
 * @param {{ currentEvent?: { name?: string, shortName?: string } } | null} boardOrContext
 * @param {string} question
 */
export function golfQuestionNeedsEventRealign(boardOrContext, question) {
  const intent = extractGolfTournamentIntentFromQuestion(question);
  if (!intent) return false;
  const ev = boardOrContext?.currentEvent;
  if (!golfCurrentEventMatchesIntent(ev, intent)) return true;
  return golfContextNeedsCourseResolution(ev, intent);
}

/**
 * Build a currentEvent shell from a schedule row when ESPN has no board for that week yet.
 * @param {Record<string, unknown>} row
 * @param {{ name?: string, shortName?: string, course?: string, state?: string, round?: string, leaderboard?: unknown[] } | null} [preserveFrom]
 */
export function buildCurrentEventFromScheduleRow(row, preserveFrom = null) {
  if (!row || typeof row !== "object") return preserveFrom || null;

  const status = String(row.status || row.rawStatus || "").toLowerCase();
  const isLive = status.includes("live") || status.includes("progress") || status === "in";
  const isFinal = status.includes("final") || status.includes("complete") || status === "post";

  const sameEvent =
    preserveFrom &&
    (slugOverlapsGolfLabels(row.name, preserveFrom.name) ||
      slugOverlapsGolfLabels(row.shortName, preserveFrom.shortName) ||
      slugOverlapsGolfLabels(row.name, preserveFrom.shortName));

  const leaderboard =
    sameEvent && Array.isArray(preserveFrom.leaderboard) && preserveFrom.leaderboard.length > 0
      ? preserveFrom.leaderboard
      : [];

  return {
    id: row.id ?? preserveFrom?.id ?? null,
    name: row.name || row.shortName || preserveFrom?.name || "PGA Tour Event",
    shortName: row.shortName || row.name || preserveFrom?.shortName || "PGA Tour",
    course:
      row.courseName ||
      (typeof row.course === "string" ? row.course : null) ||
      preserveFrom?.course ||
      "TBD",
    location: row.location || preserveFrom?.location || "",
    round: isLive ? row.round || preserveFrom?.round || "Live" : isFinal ? "Final" : "Upcoming",
    state: isLive ? "in" : isFinal ? "post" : "pre",
    par: preserveFrom?.par ?? null,
    startDate: row.startDate || preserveFrom?.startDate || null,
    endDate: row.endDate != null && row.endDate !== "" ? row.endDate : preserveFrom?.endDate ?? null,
    displayDate: row.displayDate || preserveFrom?.displayDate || null,
    leaderboard,
  };
}

/**
 * Client-side align when tourSchedule is already on the golf board payload.
 * @param {Record<string, unknown> | null} golfData
 * @param {string} question
 */
/**
 * Drop leaderboard / odds tied to the wrong week when the question names a different event.
 * @param {Record<string, unknown>} golfData
 * @param {{ slug: string, label: string }} intent
 * @param {{ name?: string, shortName?: string, course?: string } | null} alignedCurrentEvent
 */
export function stripStaleGolfWeekArtifactsForIntent(
  golfData,
  intent,
  alignedCurrentEvent,
  wasRealigned = false,
) {
  if (!golfData || !intent) return golfData;
  const tournamentOk = golfLabelsMatchIntent(
    golfData.tournament?.name,
    golfData.tournament?.shortName,
    intent,
  );
  const eventOk =
    !wasRealigned && golfCurrentEventMatchesIntent(alignedCurrentEvent, intent);
  const courseBlob = String(
    (golfData.course && typeof golfData.course === "object"
      ? golfData.course.name || golfData.course.course
      : golfData.course) || "",
  );
  const courseOk = !golfCourseConflictsWithIntent(courseBlob, intent);

  return {
    ...golfData,
    tournament: tournamentOk ? golfData.tournament : null,
    odds: eventOk
      ? golfData.odds
      : {
          outrights: [],
          topFinish: {},
          makeCut: {},
          linesUnavailable: true,
          hasPostedLines: false,
          fieldUnavailableMessage:
            "Lines for that week are not loaded yet — ask about a player or matchup and I'll use schedule context.",
        },
    recentResults: tournamentOk ? golfData.recentResults : [],
    courseStats: courseOk ? golfData.courseStats : [],
  };
}

export function golfFeedUiMismatchesQuestionIntent(golfData, question) {
  const intent = extractGolfTournamentIntentFromQuestion(question);
  if (!intent || !golfData?.currentEvent) return false;
  return !golfCurrentEventMatchesIntent(golfData.currentEvent, intent);
}

/**
 * @param {Record<string, unknown> | null} golfData
 * @param {string} question
 */
export function alignGolfBoardSnapshotForQuestion(golfData, question) {
  if (!golfData || typeof golfData !== "object") return golfData;
  const intent = extractGolfTournamentIntentFromQuestion(question);
  if (!intent) return golfData;
  if (golfCurrentEventMatchesIntent(golfData.currentEvent, intent)) return golfData;

  const row = findBestScheduleRowForIntent(golfData.tourSchedule, intent);
  const preserve =
    golfLabelsMatchIntent(golfData.currentEvent?.name, golfData.currentEvent?.shortName, intent)
      ? golfData.currentEvent
      : null;

  const alignedEvent = row
    ? buildCurrentEventFromScheduleRow(row, preserve)
    : {
        id: null,
        name: intent.label,
        shortName: intent.label,
        course: "TBD",
        location: "",
        state: "pre",
        round: "Upcoming",
        leaderboard: [],
      };

  const aligned = {
    ...golfData,
    currentEvent: alignedEvent,
    questionEventAlignment: {
      requestedLabel: intent.label,
      requestedSlug: intent.slug,
      previousFeedEvent: golfData.currentEvent?.name || null,
      source: row ? "schedule" : "intent_only",
      contextScope: row ? "question_week" : "question_week_preview",
    },
  };

  return stripStaleGolfWeekArtifactsForIntent(aligned, intent, alignedEvent, true);
}
