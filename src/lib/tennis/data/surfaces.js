const surfaces = {
  miami_open: {
    name: "Miami Open",
    surface: "Hard",
    speed: "Medium-Fast",
    environment: {
      bigServerBoost: -0.08,
      returnerBoost: 0.05,
      rallyBoost: 0.05,
    },
    note:
      "Miami hard courts play a little slower than the fastest hard-court events. Big servers still matter, but returners get more neutral looks and rallies extend more often.",
  },

  french_open: {
    name: "French Open",
    surface: "Clay",
    speed: "Slow",
    environment: {
      bigServerBoost: -0.2,
      returnerBoost: 0.1,
      rallyBoost: 0.15,
    },
    note:
      "Roland Garros rewards endurance, shape, movement, and patience. Serve edges shrink and physical baseline tolerance matters more.",
  },

  wimbledon: {
    name: "Wimbledon",
    surface: "Grass",
    speed: "Fast",
    environment: {
      bigServerBoost: 0.15,
      returnerBoost: -0.08,
      rallyBoost: -0.1,
    },
    note:
      "Grass rewards serve quality, first-strike patterns, and short-point execution. Matches can turn quickly when servers are holding cleanly.",
  },

  us_open: {
    name: "US Open",
    surface: "Hard",
    speed: "Medium",
    environment: {
      bigServerBoost: 0.05,
      returnerBoost: 0.0,
      rallyBoost: 0.0,
    },
    note:
      "The US Open is a cleaner hard-court middle ground: serve still matters, but elite returners and shotmakers have room to impose too.",
  },
};

export default surfaces;
