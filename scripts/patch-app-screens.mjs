import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, "../src/App.jsx");
const raw = fs.readFileSync(appPath, "utf8");

const INDENT_8 = " {8}";
const homeBlock = new RegExp(
  `${INDENT_8}\\{/\\* ══ HOME ══ \\*/\\}\\s*\\n[\\s\\S]*?(?=\\n${INDENT_8}\\{/\\* ══ TENNIS ══ \\*/\\})`,
);
const tennisBlock = new RegExp(
  `${INDENT_8}\\{/\\* ══ TENNIS ══ \\*/\\}\\s*\\n[\\s\\S]*?(?=\\n${INDENT_8}\\{/\\* ══ NFL ══ \\*/\\})`,
);
const nflBlock = new RegExp(
  `${INDENT_8}\\{/\\* ══ NFL ══ \\*/\\}\\s*\\n[\\s\\S]*?(?=\\n${INDENT_8}\\{/\\* ══ NFL PLAYER DETAIL ══ \\*/\\})`,
);
const f1Block = new RegExp(
  `${INDENT_8}\\{/\\* ══ F1 ══ \\*/\\}\\s*\\n[\\s\\S]*?(?=\\n${INDENT_8}\\{/\\* ══ NBA ══ \\*/\\})`,
);
const nbaBlock = new RegExp(
  `${INDENT_8}\\{/\\* ══ NBA ══ \\*/\\}\\s*\\n[\\s\\S]*?(?=\\n${INDENT_8}\\{/\\* ══ MLB ══ \\*/\\})`,
);
const mlbBlock = new RegExp(
  `${INDENT_8}\\{/\\* ══ MLB ══ \\*/\\}\\s*\\n[\\s\\S]*?(?=\\n\\n${INDENT_8}\\{/\\* ══ GOLF ══ \\*/\\})`,
);
const golfBlock = new RegExp(
  `${INDENT_8}\\{/\\* ══ GOLF ══ \\*/\\}\\s*\\n[\\s\\S]*?(?=\\n${INDENT_8}\\{/\\* ══ PRO ══ \\*/\\})`,
);
const askBlock = new RegExp(
  `${INDENT_8}\\{/\\* ══ ASK ══ \\*/\\}\\s*\\n[\\s\\S]*?(?=\\n${INDENT_8}\\{/\\* ══ DOCKED INPUT BARS ══ \\*/\\})`,
);

let patched = raw;

patched = patched.replace(homeBlock, `        {/* ══ HOME ══ */}
        {screen==="home"&&(
          <HomeScreen
            hasDockedBar={hasDockedBar}
            askInput={askInput}
            setAskInput={setAskInput}
            submitHome={submitHome}
            askInputRef={askInputRef}
            askBarCommon={askBarCommon}
            goTennis={goTennis}
            goNfl={goNfl}
            goF1={goF1}
            goNba={goNba}
            goMlb={goMlb}
            goGolf={goGolf}
            dynamicHomeQuestions={dynamicHomeQuestions}
            firePrompt={firePrompt}
            isNflSlateActive={isNflSlateActive}
            tickerNbaGames={tickerNbaGames}
            getSeriesLabel={getSeriesLabel}
            tennisTickerMatches={tennisTickerMatches}
            golfData={golfData}
            mlbGames={mlbGames}
            mlbData={mlbData}
            f1Data={f1Data}
            homeCards={homeCards}
            openMatchup={openMatchup}
            golfScoreColor={golfScoreColor}
          />
        )}

`);

patched = patched.replace(tennisBlock, `        {/* ══ TENNIS ══ */}
        {screen==="tennis"&&(
          <TennisScreen
            tennisScreenRef={tennisScreenRef}
            hasDockedBar={hasDockedBar}
            tennisBoardHeadline={tennisBoardHeadline}
            tennisBoardSubline={tennisBoardSubline}
            liveMatches={liveMatches}
            tennisLiveMatches={tennisLiveMatches}
            tennisUpcomingMatches={tennisUpcomingMatches}
            activeTournamentMatches={activeTournamentMatches}
            tennisMsgs={tennisMsgs}
            tennisBarRef={tennisBarRef}
            tennisInputRef={tennisInputRef}
            tennisInput={tennisInput}
            setTennisInput={setTennisInput}
            submitTennis={submitTennis}
            askBarCommon={askBarCommon}
            context={context}
            tennisLoading={tennisLoading}
            openMatchup={openMatchup}
            players={players}
            wtaSectionOpen={wtaSectionOpen}
            setWtaSectionOpen={setWtaSectionOpen}
            wtaInputRef={wtaInputRef}
            wtaInput={wtaInput}
            setWtaInput={setWtaInput}
            submitWta={submitWta}
            openPlayer={openPlayer}
          />
        )}

`);

patched = patched.replace(nflBlock, `        {/* ══ NFL ══ */}
        {screen==="nfl"&&(
          <NflScreen
            nflScreenRef={nflScreenRef}
            hasDockedBar={hasDockedBar}
            nflSeasonMode={nflSeasonMode}
            nflMsgs={nflMsgs}
            nflBarRef={nflBarRef}
            nflInputRef={nflInputRef}
            nflInput={nflInput}
            setNflInput={setNflInput}
            submitNfl={submitNfl}
            askBarCommon={askBarCommon}
            nflPosFilter={nflPosFilter}
            setNflPosFilter={setNflPosFilter}
            filteredNflPlayers={filteredNflPlayers}
            openNflPlayer={openNflPlayer}
          />
        )}

`);

patched = patched.replace(f1Block, `        {/* ══ F1 ══ */}
        {screen==="f1"&&(
          <F1Screen
            f1ScreenRef={f1ScreenRef}
            hasDockedBar={hasDockedBar}
            f1Msgs={f1Msgs}
            f1BarRef={f1BarRef}
            f1InputRef={f1InputRef}
            f1Input={f1Input}
            setF1Input={setF1Input}
            submitF1={submitF1}
            askBarCommon={askBarCommon}
            f1Loading={f1Loading}
            f1Data={f1Data}
          />
        )}

`);

patched = patched.replace(nbaBlock, `        {/* ══ NBA ══ */}
        {screen==="nba"&&(
          <NbaScreen
            nbaScreenRef={nbaScreenRef}
            hasDockedBar={hasDockedBar}
            nbaGames={nbaGames}
            nbaMsgs={nbaMsgs}
            nbaBarRef={nbaBarRef}
            nbaInputRef={nbaInputRef}
            nbaInput={nbaInput}
            setNbaInput={setNbaInput}
            submitNba={submitNba}
            askBarCommon={askBarCommon}
            nbaLoading={nbaLoading}
          />
        )}

`);

patched = patched.replace(mlbBlock, `        {/* ══ MLB ══ */}
        {screen==="mlb"&&(
          <MlbScreen
            mlbScreenRef={mlbScreenRef}
            hasDockedBar={hasDockedBar}
            mlbMsgs={mlbMsgs}
            mlbBarRef={mlbBarRef}
            mlbInputRef={mlbInputRef}
            mlbInput={mlbInput}
            setMlbInput={setMlbInput}
            submitMlb={submitMlb}
            askBarCommon={askBarCommon}
            mlbLoading={mlbLoading}
            mlbGames={mlbGames}
            mlbData={mlbData}
          />
        )}

`);

patched = patched.replace(golfBlock, `        {/* ══ GOLF ══ */}
        {screen==="golf"&&(
          <GolfScreen
            golfScreenRef={golfScreenRef}
            hasDockedBar={hasDockedBar}
            golfData={golfData}
            golfLoading={golfLoading}
            golfMsgs={golfMsgs}
            golfBarRef={golfBarRef}
            golfInputRef={golfInputRef}
            golfInput={golfInput}
            setGolfInput={setGolfInput}
            submitGolf={submitGolf}
            askBarCommon={askBarCommon}
          />
        )}

`);

patched = patched.replace(askBlock, `        {/* ══ ASK ══ */}
        {screen==="ask"&&(
          <AskScreen
            askScreenRef={askScreenRef}
            hasDockedBar={hasDockedBar}
            askMsgs={askMsgs}
            askInputRef={askInputRef}
            askInput={askInput}
            setAskInput={setAskInput}
            submitAsk={submitAsk}
            askBarCommon={askBarCommon}
            dynamicHomeQuestions={dynamicHomeQuestions}
            firePrompt={firePrompt}
          />
        )}

`);

if (patched === raw) {
  console.error("No changes applied — regex did not match");
  process.exit(1);
}

fs.writeFileSync(appPath, patched);
console.log("Patched App.jsx");
