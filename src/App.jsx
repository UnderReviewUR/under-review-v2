import { useState, useRef } from "react";

import useTennisBoard from "./hooks/useTennisBoard";
import useImagePaste from "./hooks/useImagePaste";
import useAskEngine from "./hooks/useAskEngine";

import HomeScreen from "./screens/HomeScreen";
import TennisScreen from "./screens/TennisScreen";
import NflScreen from "./screens/NflScreen";
import AskScreen from "./screens/AskScreen";
import MatchupScreen from "./screens/MatchupScreen";
import PlayerScreen from "./screens/PlayerScreen";
import NflPlayerScreen from "./screens/NflPlayerScreen";
import ProScreen from "./screens/ProScreen";

import NavIcon from "./components/NavIcon";

export default function App() {
  const [screen, setScreen] = useState("home");
  const [tab, setTab] = useState("home");

  const fileInputRef = useRef(null);

  const tennis = useTennisBoard();
  const image = useImagePaste(fileInputRef);
  const ask = useAskEngine({
    ...tennis,
    ...image,
  });

  let content = null;

  if (screen === "home") {
  content = (
    <HomeScreen
      {...ask}
      pastedImage={image.pastedImage}
      clearImage={image.clearImage}
      processImageFile={image.processImageFile}
      fileInputRef={fileInputRef}
    />
  );
}

  } else if (screen === "tennis") {
  content = (
    <TennisScreen
      {...ask}
      pastedImage={image.pastedImage}
      clearImage={image.clearImage}
      processImageFile={image.processImageFile}
      fileInputRef={fileInputRef}
    />
  );
} else if (screen === "nfl") {
  content = (
    <NflScreen
      {...ask}
      pastedImage={image.pastedImage}
      clearImage={image.clearImage}
      processImageFile={image.processImageFile}
      fileInputRef={fileInputRef}
    />
  );
}
 } else if (screen === "matchup") {
  content = (
    <MatchupScreen
      {...ask}
      pastedImage={image.pastedImage}
      clearImage={image.clearImage}
      processImageFile={image.processImageFile}
      fileInputRef={fileInputRef}
    />
  );
} else if (screen === "player") {
  content = (
    <PlayerScreen
      {...ask}
      player={tennis.selectedPlayer}
      pastedImage={image.pastedImage}
      clearImage={image.clearImage}
      processImageFile={image.processImageFile}
      fileInputRef={fileInputRef}
    />
  );
} else if (screen === "nflplayer") {
  content = (
    <NflPlayerScreen
      {...ask}
      player={tennis.selectedNflPlayer}
      pastedImage={image.pastedImage}
      clearImage={image.clearImage}
      processImageFile={image.processImageFile}
      fileInputRef={fileInputRef}
    />
  );
} else if (screen === "pro") {
    content = <ProScreen />;
  }

  return (
    <div className="app">
      {content}

      <nav className="bottom-nav">
        <button onClick={() => { setScreen("home"); setTab("home"); }}>
          <NavIcon type="home" />
          <span>Home</span>
        </button>

        <button onClick={() => { setScreen("tennis"); setTab("tennis"); }}>
          <NavIcon type="tennis" />
          <span>Tennis</span>
        </button>

        <button onClick={() => { setScreen("nfl"); setTab("nfl"); }}>
          <NavIcon type="nfl" />
          <span>NFL</span>
        </button>

        <button onClick={() => { setScreen("ask"); setTab("ask"); }}>
          <NavIcon type="ask" />
          <span>Ask</span>
        </button>

        <button onClick={() => { setScreen("pro"); setTab("pro"); }}>
          <NavIcon type="pro" />
          <span>Pro</span>
        </button>
      </nav>
    </div>
  );
}
