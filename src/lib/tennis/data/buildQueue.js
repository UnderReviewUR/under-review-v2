const buildQueue = [
  {
    name: "Fabian Marozsan",
    tour: "ATP",
    status: "draft",
    priority: "high",
    source: "Tennis Abstract",
    raw: {
      summaryStats: {},
      notes: [],
    },
    interpreted: {
      style: [],
      strengths: [],
      provisionalNotes: {
        fullNote: "",
        miamiNote: "",
        surfaceNote: {
          hard: "",
          clay: "",
          grass: "",
        },
      },
    },
    gaps: ["serveStats", "returnStats", "fullNote", "miamiNote"],
    readyForPromotion: false,
  },

  {
    name: "Giovanni Mpetshi Perricard",
    tour: "ATP",
    status: "draft",
    priority: "high",
    source: "Tennis Abstract",
    raw: {
      summaryStats: {},
      notes: [],
    },
    interpreted: {
      style: ["big_server", "first_strike_baseliner"],
      strengths: ["ace_volume", "easy_holds", "short_point_tennis"],
      provisionalNotes: {
        fullNote:
          "Serve-first profile. If the first serve is landing, the match gets short fast and ace volume becomes the main story.",
        miamiNote:
          "Miami slightly mutes pure serve dominance relative to faster hard courts.",
        surfaceNote: {
          hard: "Dangerous when conditions reward cheap holds.",
          clay: "Less natural fit when rallies extend.",
          grass: "Serve becomes even more central on grass.",
        },
      },
    },
    gaps: ["verified holdPct", "verified acePct", "verified return stats"],
    readyForPromotion: false,
  },
];

export default buildQueue;
