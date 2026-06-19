/**
 * Course character + overview copy for Golf tab and home surfaces.
 */

export function describeTournamentStyle(evt, golfData = null) {
  const course = String(
    evt?.courseName || evt?.course || evt?.tournament?.courseName || golfData?.course?.name || "",
  ).toLowerCase();
  const name = String(evt?.name || evt?.tournament?.name || golfData?.currentEvent?.name || "").toLowerCase();

  if (course.includes("augusta")) return "Augusta profile: elite irons, touch around greens, and patience under Sunday pressure.";
  if (course.includes("harbour") || course.includes("harbor")) return "Positional profile: fairways and approach precision matter more than pure power.";
  if (course.includes("pebble beach")) return "Links-adjacent profile: wind exposure, cliff edges, and scrambling define scoring windows.";
  if (course.includes("sawgrass") || course.includes("tpc sawgrass")) return "Precision profile: accuracy off the tee and iron precision matter more than raw distance.";
  if (course.includes("oakmont")) return "Brutal classic: speed and slope demand flawless ball-striking — no room for error.";
  if (course.includes("winged foot")) return "Penal rough profile: fairways or bogey — course demands precision above all else.";
  if (course.includes("bethpage")) return "Public-style monster: length and rough avoidance are prerequisites, not advantages.";
  if (course.includes("links")) return "Links profile: wind, trajectory control, and scrambling usually decide it.";

  if (name.includes("masters")) return "Augusta profile: elite irons, touch around greens, and patience under Sunday pressure.";
  if (name.includes("us open") || name.includes("u.s. open")) {
    return "Penal rough profile: fairways or bogey — precision and distance control beat aggressive lines.";
  }
  if (name.includes("open championship") || name.includes("british open")) return "Links profile: wind, trajectory control, and scrambling usually decide it.";
  if (name.includes("pga championship")) return "Power-parkland profile: length and approach play typically dominate.";

  return "Standard PGA profile: SG approach, fairway control, and putter variance are the main separators.";
}

/**
 * @param {Array} courseStats
 */
export function buildCourseStatsBlurb(courseStats) {
  if (!Array.isArray(courseStats) || courseStats.length < 2) return null;
  const rows = courseStats.filter((r) => r && typeof r === "object");
  if (rows.length < 2) return null;

  let sumDiff = 0;
  let nDiff = 0;
  let birdies = 0;
  let bogeys = 0;
  for (const r of rows) {
    const d = Number(r.scoringDiff);
    if (Number.isFinite(d)) {
      sumDiff += d;
      nDiff++;
    }
    birdies += Number(r.birdies) || 0;
    bogeys += Number(r.bogeys) || 0;
  }
  if (nDiff < 2) return null;
  const avgDiff = sumDiff / nDiff;
  const scoringEvents = birdies + bogeys;
  if (scoringEvents < 4) return null;

  const bogeyHeavy = bogeys >= birdies * 1.25 && avgDiff > 0.08;
  const birdieHeavy = birdies >= bogeys * 1.15 && avgDiff < -0.02;
  const tough = avgDiff > 0.12;

  if (bogeyHeavy && tough) {
    return "This course punishes mistakes — bogey avoidance matters more than raw birdie rate on the hardest holes.";
  }
  if (birdieHeavy) {
    return "Birdie chances matter here — scoring separation shows up on gettable holes.";
  }
  if (tough) {
    return "Tougher scoring setup — clean approach play and avoiding blow-up holes matter most.";
  }
  if (avgDiff < -0.05) {
    return "Relative scoring ease on key holes — pars stay on the card but birdies move you up.";
  }
  return null;
}

function formatGolfWeatherLine(golfData) {
  const snap = golfData?.course?.weatherSnapshot;
  const alert = golfData?.weatherAlert || golfData?.course?.weatherAlert || null;
  const parts = [];
  if (snap?.windSpeedMph != null && Number.isFinite(Number(snap.windSpeedMph))) {
    parts.push(`Wind ${Math.round(Number(snap.windSpeedMph))} mph`);
  }
  if (snap?.precipProbability != null && Number.isFinite(Number(snap.precipProbability))) {
    parts.push(`Rain risk ${Math.round(Number(snap.precipProbability))}%`);
  }
  const hasAlert = alert != null && typeof alert === "object";
  if (parts.length === 0 && !hasAlert) return null;
  const base = parts.join(" · ");
  if (hasAlert) return base ? `${base} · Weather alert active` : "Weather alert active";
  return base || null;
}

/**
 * @param {object | null | undefined} golfData
 */
export function buildGolfCourseOverview(golfData) {
  const evt = golfData?.currentEvent || golfData?.tournament || null;
  const course = golfData?.course || {};
  const courseName =
    String(evt?.course || evt?.courseName || course?.name || "").trim() || null;
  const par = course?.par ?? evt?.par ?? null;
  const yardage = course?.yardage ?? null;
  const architect = course?.architect ?? null;
  const location = String(evt?.location || course?.location || "").trim() || null;

  const facts = [];
  if (par != null) facts.push(`Par ${par}`);
  if (yardage != null) facts.push(`${Number(yardage).toLocaleString()} yds`);
  if (architect) facts.push(String(architect));

  return {
    eventName: evt?.shortName || evt?.name || "PGA Tour",
    round: evt?.round || null,
    courseName,
    location,
    factsLine: facts.length ? facts.join(" · ") : null,
    styleBlurb: describeTournamentStyle(evt, golfData),
    statsBlurb: buildCourseStatsBlurb(golfData?.courseStats),
    weatherLine: formatGolfWeatherLine(golfData),
    cutLineNote: golfData?.cutLineFeedNote || course?.cutLineFeedNote || null,
  };
}
