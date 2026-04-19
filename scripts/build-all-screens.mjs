import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const screens = path.join(root, "src/screens");

const readBody = (name) => fs.readFileSync(path.join(screens, `_${name}_body.txt`), "utf8");

const files = [
  {
    name: "TennisScreen",
    bodyFile: "tennis",
    imports: `import AskBar from "../components/AskBar.jsx";
import { ChatThread } from "../features/app/helpers.jsx";
import { ATP_PLAYERS, WTA_PLAYERS } from "../features/app/constants.js";
import { AtpMatchupCard } from "../components/cards/AtpMatchupCard.jsx";
import { TennisPlayerCard } from "../components/cards/TennisPlayerCard.jsx";`,
    props: `tennisScreenRef,
  hasDockedBar,
  tennisBoardHeadline,
  tennisBoardSubline,
  liveMatches,
  tennisLiveMatches,
  tennisUpcomingMatches,
  activeTournamentMatches,
  tennisMsgs,
  tennisBarRef,
  tennisInputRef,
  tennisInput,
  setTennisInput,
  submitTennis,
  askBarCommon,
  context,
  tennisLoading,
  openMatchup,
  players,
  wtaSectionOpen,
  setWtaSectionOpen,
  wtaInputRef,
  wtaInput,
  setWtaInput,
  submitWta,
  openPlayer`,
  },
  {
    name: "NflScreen",
    bodyFile: "nfl",
    imports: `import AskBar from "../components/AskBar.jsx";
import { ChatThread } from "../features/app/helpers.jsx";
import NflPropGuideSection from "../features/nfl/NflPropGuideSection.jsx";
import { NFL_POSITIONS, NFL_PROP_GUIDE } from "../features/app/constants.js";
import { NflPlayerCard } from "../components/cards/NflPlayerCard.jsx";`,
    props: `nflScreenRef,
  hasDockedBar,
  nflSeasonMode,
  nflMsgs,
  nflBarRef,
  nflInputRef,
  nflInput,
  setNflInput,
  submitNfl,
  askBarCommon,
  nflPosFilter,
  setNflPosFilter,
  filteredNflPlayers,
  openNflPlayer`,
  },
  {
    name: "F1Screen",
    bodyFile: "f1",
    imports: `import AskBar from "../components/AskBar.jsx";
import { ChatThread } from "../features/app/helpers.jsx";
import { resolveF1RaceStart } from "../features/f1/raceStart.js";`,
    props: `f1ScreenRef,
  hasDockedBar,
  f1Msgs,
  f1BarRef,
  f1InputRef,
  f1Input,
  setF1Input,
  submitF1,
  askBarCommon,
  f1Loading,
  f1Data`,
  },
  {
    name: "NbaScreen",
    bodyFile: "nba",
    imports: `import AskBar from "../components/AskBar.jsx";
import { ChatThread } from "../features/app/helpers.jsx";`,
    props: `nbaScreenRef,
  hasDockedBar,
  nbaGames,
  nbaMsgs,
  nbaBarRef,
  nbaInputRef,
  nbaInput,
  setNbaInput,
  submitNba,
  askBarCommon,
  nbaLoading`,
  },
  {
    name: "MlbScreen",
    bodyFile: "mlb",
    imports: `import AskBar from "../components/AskBar.jsx";
import { ChatThread } from "../features/app/helpers.jsx";`,
    props: `mlbScreenRef,
  hasDockedBar,
  mlbMsgs,
  mlbBarRef,
  mlbInputRef,
  mlbInput,
  setMlbInput,
  submitMlb,
  askBarCommon,
  mlbLoading,
  mlbGames,
  mlbData`,
  },
  {
    name: "GolfScreen",
    bodyFile: "golf",
    imports: `import AskBar from "../components/AskBar.jsx";
import { ChatThread } from "../features/app/helpers.jsx";`,
    props: `golfScreenRef,
  hasDockedBar,
  golfData,
  golfLoading,
  golfMsgs,
  golfBarRef,
  golfInputRef,
  golfInput,
  setGolfInput,
  submitGolf,
  askBarCommon`,
  },
  {
    name: "AskScreen",
    bodyFile: "ask",
    imports: `import AskBar from "../components/AskBar.jsx";
import { ChatThread } from "../features/app/helpers.jsx";`,
    props: `askScreenRef,
  hasDockedBar,
  askMsgs,
  askInputRef,
  askInput,
  setAskInput,
  submitAsk,
  askBarCommon,
  dynamicHomeQuestions,
  firePrompt`,
  },
];

for (const { name, bodyFile, imports, props } of files) {
  const body = readBody(bodyFile);
  const out = `${imports}

export default function ${name}({
  ${props},
}) {
  return (
${body}
  );
}
`;
  fs.writeFileSync(path.join(screens, `${name}.jsx`), out);
}
