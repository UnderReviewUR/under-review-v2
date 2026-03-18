import { useState, useEffect } from "react";
import { generateTennisTake } from "./lib/tennisEngine";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&display=swap');

  :root{
    --black:#080A0C;
    --surface:#0F1215;
    --surface-2:#0C1014;
    --border:#1E2328;
    --border-2:#2A3040;
    --cyan:#00F5E9;
    --magenta:#FF2D6B;
    --gold:#F5C842;
    --text:#E8EAF0;
    --muted:#AAB3C2;
    --soft:#D6DCE6;
    --green:#00E676;
    --red:#FF4444;
  }

  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:var(--black);color:var(--text);font-family:'DM Sans',sans-serif;}

  .app{min-height:100vh;background:var(--black);color:var(--text);display:flex;flex-direction:column;}

  .hdr{
    padding:14px 16px;border-bottom:1px solid var(--border);
    background:rgba(8,10,12,.97);display:flex;align-items:center;
    justify-content:space-between;position:sticky;top:0;z-index:20;
  }
  .logo-under{display:block;font-family:'Bebas Neue',sans-serif;font-size:10px;letter-spacing:5px;color:rgba(255,255,255,.6);margin-bottom:2px;}
  .logo-review{display:block;font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:2px;line-height:1;background:linear-gradient(90deg,var(--cyan),var(--magenta));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
  .pill-tag{font-family:'DM Mono',monospace;font-size:10px;color:var(--magenta);border:1px solid rgba(255,45,107,.25);padding:4px 9px;border-radius:999px;background:rgba(255,45,107,.06);}

  .screen{flex:1;overflow-y:auto;padding:16px;padding-bottom:88px;}

  .hero{padding:12px 2px 16px;text-align:center;}
  .hero-title{font-family:'Bebas Neue',sans-serif;font-size:34px;letter-spacing:1px;line-height:1;margin-bottom:8px;}
  .hero-sub{color:var(--soft);font-size:14px;line-height:1.55;max-width:360px;margin:0 auto;}

  .ask-shell{margin:12px 0 18px;display:flex;gap:8px;align-items:center;}
  .ask-bar{width:100%;border:1px solid var(--border-2);background:var(--surface-2);border-radius:18px;padding:12px 14px;color:var(--text);font-size:14px;outline:none;font-family:'DM Sans',sans-serif;}
  .ask-bar::placeholder{color:var(--muted);}
  .send-btn{width:44px;height:44px;border:none;border-radius:50%;background:var(--cyan);color:var(--black);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;}
  .send-btn:hover{background:var(--magenta);}

  .section{margin-top:18px;}
  .section-label{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;color:var(--muted);margin-bottom:10px;}

  .q-list{display:flex;flex-direction:column;gap:8px;}
  .q-card{width:100%;text-align:left;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:12px;cursor:pointer;color:var(--text);}
  .q-card:hover{border-color:var(--cyan);}
  .q-top{display:flex;align-items:center;gap:10px;}
  .q-accent{width:4px;height:30px;border-radius:2px;flex-shrink:0;}
  .q-text{font-size:14px;line-height:1.45;color:#D6DCE6;}

  .matchup-list{display:flex;flex-direction:column;gap:10px;}
  .matchup-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;cursor:pointer;}
  .matchup-card:hover{border-color:var(--cyan);}
  .matchup-top{padding:10px 12px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.01);}
  .matchup-league{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;}
  .matchup-time{font-family:'DM Mono',monospace;font-size:10px;color:var(--muted);}
  .matchup-body{padding:12px;}
  .matchup-title{font-size:16px;font-weight:600;margin-bottom:4px;}
  .matchup-meta{font-size:12px;color:var(--muted);margin-bottom:8px;}
  .matchup-blurb{font-size:13px;color:var(--soft);line-height:1.55;}

  .sport-chips{display:flex;gap:8px;flex-wrap:wrap;}
  .sport-chip{border:1px solid var(--border);background:var(--surface);color:var(--soft);border-radius:999px;padding:8px 14px;font-family:'DM Mono',monospace;font-size:11px;cursor:pointer;transition:all .15s;}
  .sport-chip.active,.sport-chip:hover{border-color:var(--cyan);color:var(--cyan);}

  .detail-back{background:none;border:none;color:var(--muted);font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;margin-bottom:12px;cursor:pointer;display:flex;align-items:center;gap:6px;}
  .detail-card{background:var(--surface);border:1px solid var(--border);border-radius:18px;overflow:hidden;margin-bottom:14px;}
  .detail-head{padding:12px 14px;border-bottom:1px solid var(--border);background:var(--surface-2);}
  .detail-league{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;margin-bottom:6px;}
  .detail-title{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:1px;line-height:1;margin-bottom:6px;}
  .detail-sub{font-size:12px;color:var(--muted);}
  .what-matters{padding:14px;}
  .wm-label{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;color:var(--cyan);margin-bottom:8px;}
  .wm-text{font-size:14px;line-height:1.7;color:#D6DCE6;}
  .quick-hitters{display:flex;gap:8px;flex-wrap:wrap;padding:0 14px 14px;}
  .quick-btn{border:1px solid var(--border-2);background:#101722;color:var(--soft);border-radius:999px;padding:8px 12px;font-size:12px;cursor:pointer;}
  .quick-btn:hover{border-color:var(--cyan);color:var(--cyan);}
  .mini-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:0 14px 14px;}
  .mini-stat{background:var(--surface-2);border:1px solid var(--border);border-radius:12px;padding:10px;text-align:center;}
  .mini-label{font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);margin-bottom:4px;}
  .mini-value{font-size:15px;font-weight:700;}

  .chat-thread{display:flex;flex-direction:column;gap:12px;margin-top:16px;}
  .bubble{max-width:88%;border-radius:18px;padding:13px 14px;font-size:14px;line-height:1.65;}
  .bubble.user{margin-left:auto;background:#1E2B38;border:1px solid #2A3A4A;color:var(--text);border-bottom-right-radius:6px;}
  .bubble.ai{margin-right:auto;background:var(--surface);border:1px solid var(--border);color:#D0D7E2;border-bottom-left-radius:6px;}

  .bottom-nav{position:fixed;left:0;right:0;bottom:0;background:rgba(8,10,12,.98);border-top:1px solid var(--border);display:grid;grid-template-columns:repeat(3,1fr);padding:10px 10px 12px;z-index:30;}
  .nav-btn{background:none;border:none;color:var(--muted);font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;cursor:pointer;padding:6px 0;}
  .nav-btn.active{color:var(--cyan);}

  .pro-card{background:var(--surface);border:1px solid rgba(255,45,107,.25);border-radius:18px;padding:18px;}
  .pro-title{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:2px;margin-bottom:8px;}
  .pro-copy{color:var(--soft);font-size:14px;line-height:1.7;margin-bottom:14px;}
  .pro-price{font-size:34px;font-family:'Bebas Neue',sans-serif;letter-spacing:1px;margin-bottom:12px;}
  .pro-btn{width:100%;border:none;border-radius:14px;padding:14px;cursor:pointer;font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:2px;color:var(--black);background:linear-gradient(90deg,var(--cyan),var(--magenta));}

  .tennis-tabs{display:flex;gap:0;margin-bottom:16px;border:1px solid var(--border);border-radius:12px;overflow:hidden;}
  .tennis-tab{flex:1;padding:10px;text-align:center;font-family:'DM Mono',monospace;font-size:11px;letter-spacing:2px;cursor:pointer;background:var(--surface-2);color:var(--muted);border:none;transition:all .15s;}
  .tennis-tab.active{background:var(--cyan);color:var(--black);font-weight:700;}

  .tournament-banner{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:16px;}
  .tournament-name{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:1px;color:var(--cyan);margin-bottom:4px;}
  .tournament-meta{font-family:'DM Mono',monospace;font-size:10px;color:var(--muted);margin-bottom:8px;}
  .tournament-note{font-size:13px;color:var(--soft);line-height:1.55;}

  .player-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;cursor:pointer;margin-bottom:10px;}
  .player-card:hover{border-color:var(--border-2);}
  .player-top{padding:12px 14px;display:flex;align-items:center;justify-content:space-between;}
  .player-rank{font-family:'Bebas Neue',sans-serif;font-size:32px;color:var(--muted);line-height:1;margin-right:12px;min-width:36px;}
  .player-info{flex:1;}
  .player-name{font-size:16px;font-weight:600;color:var(--text);margin-bottom:2px;}
  .player-style{font-size:12px;color:var(--muted);}
  .player-elo{text-align:right;}
  .player-elo-num{font-family:'DM Mono',monospace;font-size:16px;color:var(--cyan);display:block;}
  .player-elo-label{font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);}
  .player-stats{padding:0 14px 12px;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;}
  .pstat{background:var(--surface-2);border-radius:8px;padding:8px;text-align:center;}
  .pstat-label{font-family:'DM Mono',monospace;font-size:8px;color:var(--muted);margin-bottom:3px;}
  .pstat-value{font-family:'DM Mono',monospace;font-size:12px;font-weight:500;}

  .matchup-context{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:10px;cursor:pointer;}
  .matchup-context:hover{border-color:var(--border-2);}
  .mc-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
  .mc-title{font-size:15px;font-weight:600;color:var(--text);}
  .mc-h2h{font-family:'DM Mono',monospace;font-size:10px;color:var(--gold);}
  .mc-note{font-size:12px;color:var(--soft);line-height:1.5;margin-bottom:8px;}
  .mc-angle{font-size:12px;color:var(--cyan);line-height:1.4;}

  .ace-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:8px;}
  .ace-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}
  .ace-name{font-size:14px;font-weight:500;color:var(--text);}
  .ace-avg{font-family:'DM Mono',monospace;font-size:16px;color:var(--gold);}
  .ace-note{font-size:12px;color:var(--soft);line-height:1.4;}

  .loading-state{text-align:center;padding:40px 20px;}
  .loading-text{font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);letter-spacing:2px;}

  .surface-pills{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;}
  .surface-pill{font-family:'DM Mono',monospace;font-size:9px;padding:3px 8px;border-radius:6px;border:1px solid var(--border);}
  .surface-hard{color:var(--cyan);border-color:rgba(0,245,233,.3);}
  .surface-clay{color:var(--gold);border-color:rgba(245,200,66,.3);}
  .surface-grass{color:var(--green);border-color:rgba(0,230,118,.3);}

  .tennis-section-label{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;color:var(--muted);margin:16px 0 10px;}

  .form-badge{font-family:'DM Mono',monospace;font-size:9px;padding:2px 7px;border-radius:4px;background:rgba(0,245,233,.1);color:var(--cyan);border:1px solid rgba(0,245,233,.2);}
`;

const featuredQuestions = [
  { id:"q1", color:"#00F5E9", text:"Will Sinner get 8 aces vs Medvedev?", prompt:"Will Sinner get 8 aces vs Medvedev?" },
  { id:"q2", color:"#FF2D6B", text:"Can Barca advance past Newcastle?", prompt:"Can Barca advance past Newcastle in the second leg?" },
  { id:"q3", color:"#F5C842", text:"How realistic is a Hamilton podium this weekend?", prompt:"How realistic is it that Lewis Hamilton finishes top 3 this weekend?" },
];

const featuredMatchups = [
  { id:"m1", league:"ATP", leagueColor:"#00F5E9", title:"Sinner vs Medvedev", time:"2:30 PM ET", network:"Tennis Channel", blurb:"Medvedev's return profile keeps this from feeling automatic. Sinner's serve and current form give him the edge if it stays on serve.", whatMatters:"Sinner has the cleaner serve profile and better recent form, but Medvedev can drag him into uncomfortable return-heavy stretches. If this stays on serve, Sinner is more trustworthy late.", quickHitters:["Will Sinner get 8 aces?","Is Medvedev a live dog?","Does this go 3 sets?"], stats:[{label:"UR CONF",value:"67%"},{label:"ACES LINE",value:"8.0"},{label:"SURFACE",value:"Hard"}] },
  { id:"m2", league:"UCL", leagueColor:"#FF2D6B", title:"Barca vs Newcastle", time:"3:00 PM ET", network:"Paramount+", blurb:"This is less about overall quality and more about whether Newcastle can turn the match chaotic early. First goal changes everything.", whatMatters:"Barca are the better side on paper but Newcastle's crowd and early pressure can make the first 25 minutes feel bigger than the talent gap. If Newcastle score first the tie becomes live immediately.", quickHitters:["Will Barca advance?","Do both teams score?","Is over 2.5 live?"], stats:[{label:"UR CONF",value:"71%"},{label:"TIE STATE",value:"Live"},{label:"ANGLE",value:"BTTS"}] },
  { id:"m3", league:"F1", leagueColor:"#F5C842", title:"Hamilton podium chances", time:"This weekend", network:"ESPN", blurb:"Top 3 is possible but depends more on qualifying and race pace than brand name. Top 5 feels cleaner than podium right now.", whatMatters:"Hamilton podium bets come down to two things: where he starts and whether the car has genuine long-run pace. If qualifying leaves him buried the podium path gets much thinner.", quickHitters:["Is top 3 realistic?","Safer: top 5?","What matters most?"], stats:[{label:"UR CONF",value:"38%"},{label:"LEAN",value:"Top 5"},{label:"KEY",value:"Quali"}] },
];

const ATP_PLAYERS = ["Alcaraz","Sinner","Djokovic","Zverev","Medvedev","De Minaur","Auger-Aliassime","Shelton","Fritz","Musetti","Tien","Draper","Fils","Bublik","Mensik","Ruud","Korda","Fonseca","Paul","Fokina","Rublev","Lehecka","Cerundolo","Norrie","Khachanov"];
const WTA_PLAYERS = ["Sabalenka","Rybakina","Swiatek","Pegula","Gauff","Mboko","Anisimova","Svitolina","Muchova","Bencic","Andreeva","Paolini","Keys","Osaka","Noskova","Kostyuk","Vondrousova","Kalinskaya","Mertens","Cirstea","Jovic","Alexandrova","Zheng","Kartal"];

export default function App() {
  const [tab, setTab] = useState("home");
  const [screen, setScreen] = useState("home");
  const [selectedMatchup, setSelectedMatchup] = useState(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [tennisTab, setTennisTab] = useState("atp");
  const [tennisSection, setTennisSection] = useState("matchups");
  const [players, setPlayers] = useState(null);
  const [context, setContext] = useState(null);
  const [tennisLoading, setTennisLoading] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [liveMatches, setLiveMatches] = useState([]);
  const [liveMatchesError, setLiveMatchesError] = useState(null);

  useEffect(() => {
    if (screen !== "tennis") return;

    setTennisLoading(true);
    setLiveMatchesError(null);

    Promise.all([
      fetch("/api/tennis-players").then((r) => r.json()),
      fetch("/api/tennis-context").then((r) => r.json()),
      fetch(`/api/tennis?tour=${tennisTab}`).then((r) => r.json()),
    ])
      .then(([p, c, live]) => {
        setPlayers(p);
        setContext(c);
        setLiveMatches(Array.isArray(live) ? live : []);
        setTennisLoading(false);
      })
      .catch((err) => {
        console.error("Tennis page load error:", err);
        setLiveMatches([]);
        setLiveMatchesError("Could not load live tennis matches.");
        setTennisLoading(false);
      });
  }, [screen, tennisTab]);

  function generateTake(inputText, matchup, extra = {}) {
    const q = (inputText || "").toLowerCase();

    const tennisKeywords = [
      "tennis","miami open","sinner","alcaraz","djokovic","medvedev","zverev",
      "fritz","shelton","musetti","sabalenka","swiatek","rybakina","pegula",
      "gauff","bencic","muchova","aces","ace","tiebreak","wta","atp"
    ];

    const isTennisQuestion =
      q.includes("tennis") ||
      tennisKeywords.some((word) => q.includes(word)) ||
      screen === "tennis" ||
      (matchup && matchup.league === "ATP") ||
      (matchup && matchup.league === "WTA");

    if (isTennisQuestion) {
      return generateTennisTake({
        input: inputText,
        selectedMatchup: matchup,
        liveMatches,
        players,
        context,
        tour: tennisTab,
        ...extra,
      });
    }

    return "Ask me about a matchup, player prop, or whether something feels realistic. The goal is a direct answer in plain English — not stats dumped back at you.";
  }

  function goHome() {
    setTab("home");
    setScreen("home");
    setSelectedMatchup(null);
    setSelectedPlayer(null);
  }

  function goAsk(prefill = "") {
    setTab("ask");
    setScreen("ask");
    setSelectedMatchup(null);
    setInput(prefill);
  }

  function goPro() {
    setTab("pro");
    setScreen("pro");
    setSelectedMatchup(null);
  }

  function goTennis() {
    setScreen("tennis");
    setTab("tennis");
    setSelectedMatchup(null);
    setSelectedPlayer(null);
  }

  function openMatchup(m) {
    setSelectedMatchup(m);
    setScreen("matchup");
    setTab("home");
    setInput("");
  }

  function openPlayer(name) {
    setSelectedPlayer(name);
    setScreen("player");
  }

  function submitAsk(forced) {
    const text = (forced ?? input).trim();
    if (!text) return;
    const aiText = generateTake(text, selectedMatchup);
    setMessages((prev) => [...prev, { role: "user", text }, { role: "ai", text: aiText }]);
    setInput("");
    setTab("ask");
    setScreen("ask");
  }

  function submitMatchupAsk(forced) {
    const text = (forced ?? input).trim();
    if (!text) return;
    const aiText = generateTake(text, selectedMatchup);
    setMessages((prev) => [...prev, { role: "user", text }, { role: "ai", text: aiText }]);
    setInput("");
    setTab("ask");
    setScreen("ask");
  }

  const tourPlayers = tennisTab === "atp" ? ATP_PLAYERS : WTA_PLAYERS;

  function getPlayer(name) {
    if (!players) return null;
    const tour = tennisTab === "atp" ? players.atp : players.wta;
    return tour?.[name] || null;
  }

  function getPlayerAny(name) {
    if (!players) return null;
    return players.atp?.[name] || players.wta?.[name] || null;
  }

  const PLAYER_SCREEN = screen === "player" && selectedPlayer;
  const pd = PLAYER_SCREEN ? getPlayerAny(selectedPlayer) : null;

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <header className="hdr">
          <div>
            <span className="logo-under">UNDER</span>
            <span className="logo-review">REVIEW</span>
          </div>
          <div>
            {screen === "tennis" && <span className="pill-tag">MIAMI OPEN</span>}
            {screen === "player" && <span className="pill-tag">{selectedPlayer?.toUpperCase()}</span>}
            {screen === "matchup" && selectedMatchup && <span className="pill-tag">{selectedMatchup.league}</span>}
            {screen === "ask" && <span className="pill-tag">UR TAKE</span>}
            {(screen === "home" || screen === "pro") && <span className="pill-tag">LIVE</span>}
          </div>
        </header>

        {screen === "home" && (
          <main className="screen">
            <section className="hero">
              <div className="hero-title">What do you want to know?</div>
              <div className="hero-sub">Sports, stats, predictions, context — in plain English.</div>
            </section>

            <div className="ask-shell">
              <input
                className="ask-bar"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask UR TAKE anything..."
                onKeyDown={(e) => e.key === "Enter" && submitAsk()}
              />
              <button className="send-btn" onClick={() => submitAsk()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
              </button>
            </div>

            <section className="section">
              <div className="section-label">TRENDING ASKS</div>
              <div className="q-list">
                {featuredQuestions.map((q) => (
                  <button key={q.id} className="q-card" onClick={() => goAsk(q.prompt)}>
                    <div className="q-top">
                      <div className="q-accent" style={{ background: q.color }} />
                      <div className="q-text">{q.text}</div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="section">
              <div className="section-label">MATCHUPS TO TAP INTO</div>
              <div className="matchup-list">
                {featuredMatchups.map((m) => (
                  <div key={m.id} className="matchup-card" onClick={() => openMatchup(m)}>
                    <div className="matchup-top">
                      <div className="matchup-league" style={{ color: m.leagueColor }}>{m.league}</div>
                      <div className="matchup-time">{m.time}</div>
                    </div>
                    <div className="matchup-body">
                      <div className="matchup-title">{m.title}</div>
                      <div className="matchup-meta">{m.network}</div>
                      <div className="matchup-blurb">{m.blurb}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="section">
              <div className="section-label">SPORTS</div>
              <div className="sport-chips">
                <button className="sport-chip">NFL</button>
                <button className="sport-chip">NBA</button>
                <button className="sport-chip active" onClick={goTennis}>Tennis</button>
                <button className="sport-chip">Soccer</button>
                <button className="sport-chip">F1</button>
              </div>
            </section>
          </main>
        )}

        {screen === "matchup" && selectedMatchup && (
          <main className="screen">
            <button className="detail-back" onClick={goHome}>← BACK</button>

            <div className="detail-card">
              <div className="detail-head">
                <div className="detail-league" style={{ color: selectedMatchup.leagueColor }}>{selectedMatchup.league}</div>
                <div className="detail-title">{selectedMatchup.title}</div>
                <div className="detail-sub">{selectedMatchup.time} · {selectedMatchup.network}</div>
              </div>

              <div className="what-matters">
                <div className="wm-label">HERE'S WHAT MATTERS</div>
                <div className="wm-text">{selectedMatchup.whatMatters}</div>
              </div>

              <div className="mini-grid">
                {selectedMatchup.stats.map((s) => (
                  <div key={s.label} className="mini-stat">
                    <div className="mini-label">{s.label}</div>
                    <div className="mini-value">{s.value}</div>
                  </div>
                ))}
              </div>

              <div className="quick-hitters">
                {selectedMatchup.quickHitters.map((q) => (
                  <button key={q} className="quick-btn" onClick={() => submitMatchupAsk(q)}>{q}</button>
                ))}
              </div>
            </div>

            <div className="ask-shell">
              <input
                className="ask-bar"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask about ${selectedMatchup.title}...`}
                onKeyDown={(e) => e.key === "Enter" && submitMatchupAsk()}
              />
              <button className="send-btn" onClick={() => submitMatchupAsk()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
              </button>
            </div>
          </main>
        )}

        {screen === "tennis" && (
          <main className="screen">
            <button className="detail-back" onClick={goHome}>← BACK</button>

            <div className="tennis-tabs">
              <button className={`tennis-tab${tennisTab === "atp" ? " active" : ""}`} onClick={() => setTennisTab("atp")}>ATP</button>
              <button className={`tennis-tab${tennisTab === "wta" ? " active" : ""}`} onClick={() => setTennisTab("wta")}>WTA</button>
            </div>

            {tennisLoading ? (
              <div className="loading-state">
                <div className="loading-text">LOADING MIAMI OPEN DATA...</div>
              </div>
            ) : (
              <>
                {context?.tournaments?.miami_open && (
                  <div className="tournament-banner">
                    <div className="tournament-name">Miami Open 2026</div>
                    <div className="tournament-meta">Hard Court · Medium-Fast · Miami, FL</div>
                    <div className="tournament-note">{context.tournaments.miami_open.note}</div>
                    <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>Favorites:</span>
                      <span style={{ fontSize: 12, color: "var(--cyan)", fontFamily: "'DM Mono',monospace" }}>
                        {tennisTab === "atp" ? context.tournaments.miami_open.atp_favorite : context.tournaments.miami_open.wta_favorite}
                      </span>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  {["matchups", "players", "aces"].map((s) => (
                    <button
                      key={s}
                      className={`sport-chip${tennisSection === s ? " active" : ""}`}
                      onClick={() => setTennisSection(s)}
                      style={{ padding: "6px 14px" }}
                    >
                      {s.toUpperCase()}
                    </button>
                  ))}
                </div>

                {tennisSection === "matchups" && (
                  <div>
                    <div className="tennis-section-label">LIVE MATCHUPS</div>

                    {liveMatchesError && (
                      <div style={{
                        marginBottom: 12,
                        padding: 12,
                        border: "1px solid rgba(255,68,68,.25)",
                        borderRadius: 12,
                        color: "#ffffff",
                        background: "rgba(255,68,68,.06)",
                        fontSize: 13,
                      }}>
                        {liveMatchesError}
                      </div>
                    )}

                    {!liveMatchesError && liveMatches.length === 0 && (
                      <div style={{
                        padding: 12,
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        color: "#ffffff",
                        background: "var(--surface)",
                        fontSize: 13,
                      }}>
                        No live matches found for {tennisTab.toUpperCase()} right now.
                      </div>
                    )}

                    {liveMatches.map((match, idx) => {
                      const p1 = match.home_team || "Player 1";
                      const p2 = match.away_team || "Player 2";

                      const status =
                        match.live === "1"
                          ? "LIVE"
                          : match.status || match.round || "Scheduled";

                      const tournament = match.tournament || "Tournament";

                      const matchTime = match.commence_time
                        ? new Date(match.commence_time).toLocaleString()
                        : "TBD";

                      return (
                        <div
                          key={match.id || `${p1}-${p2}-${idx}`}
                          className="matchup-context"
                          onClick={() => submitMatchupAsk(`Tell me about ${p1} vs ${p2} at the Miami Open`)}
                        >
                          <div className="mc-header">
                            <div className="mc-title">{p1} vs {p2}</div>
                            <div
                              className="mc-h2h"
                              style={{ color: match.live === "1" ? "var(--magenta)" : "var(--gold)" }}
                            >
                              {status}
                            </div>
                          </div>

                          <div className="mc-note" style={{ color: "#ffffff" }}>
                            {tournament} · {matchTime}
                          </div>

                          <div className="mc-angle">Tap for UR TAKE on this matchup.</div>

                          {match.score && match.score !== "-" && (
                            <div style={{
                              marginTop: 8,
                              fontSize: 11,
                              color: "var(--gold)",
                              fontFamily: "'DM Mono', monospace",
                            }}>
                              Score: {match.score}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {tennisSection === "players" && players && (
                  <div>
                    <div className="tennis-section-label">{tennisTab.toUpperCase()} TOP {tourPlayers.length}</div>
                    {tourPlayers.map((name, idx) => {
                      const p = getPlayer(name);
                      if (!p) return null;

                      return (
                        <div key={name} className="player-card" onClick={() => openPlayer(name)}>
                          <div className="player-top">
                            <div className="player-rank">#{idx + 1}</div>
                            <div className="player-info">
                              <div className="player-name">{name}</div>
                              <div className="player-style">{p.style}</div>
                              <div className="surface-pills">
                                <span className="surface-pill surface-hard">H:{p.hEloRank}</span>
                                <span className="surface-pill surface-clay">C:{p.cEloRank}</span>
                                <span className="surface-pill surface-grass">G:{p.gEloRank}</span>
                              </div>
                            </div>
                            <div className="player-elo">
                              <span className="player-elo-num">{p.elo}</span>
                              <span className="player-elo-label">ELO</span>
                              {p.yEloRank && <div className="form-badge" style={{ marginTop: 4 }}>#{p.yEloRank} 2026</div>}
                            </div>
                          </div>
                          <div className="player-stats">
                            <div className="pstat">
                              <div className="pstat-label">HOLD</div>
                              <div className="pstat-value">{p.serveStats?.split(",")[0]?.replace("Hold ", "")}</div>
                            </div>
                            <div className="pstat">
                              <div className="pstat-label">DR</div>
                              <div className="pstat-value" style={{ color: "var(--cyan)" }}>
                                {p.overallStats?.match(/DR[\s]*([\d.]+)/)?.[1] || "—"}
                              </div>
                            </div>
                            <div className="pstat">
                              <div className="pstat-label">TB%</div>
                              <div className="pstat-value">
                                {p.overallStats?.match(/Tiebreak\s*([\d.]+)/)?.[1] || "—"}%
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {tennisSection === "aces" && context?.ace_props && (
                  <div>
                    <div className="tennis-section-label">ACE PROP GUIDE · MIAMI OPEN</div>
                    {Object.entries(context.ace_props)
                      .filter(([name]) => {
                        const atpNames = ["Sinner", "Alcaraz", "Medvedev", "Fritz"];
                        const wtaNames = ["Rybakina", "Sabalenka"];
                        return tennisTab === "atp" ? atpNames.includes(name) : wtaNames.includes(name);
                      })
                      .map(([name, data]) => (
                        <div key={name} className="ace-card">
                          <div className="ace-top">
                            <div className="ace-name">{name}</div>
                            <div className="ace-avg">{data.avg_aces_hard} avg</div>
                          </div>
                          <div style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
                            <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'DM Mono',monospace" }}>ACE RATE</span>
                            <span style={{ fontSize: 12, color: "var(--cyan)", fontFamily: "'DM Mono',monospace" }}>{data.ace_rate}</span>
                          </div>
                          <div className="ace-note">{data.note}</div>
                        </div>
                      ))}

                    <div style={{ marginTop: 12, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 12 }}>
                      <div style={{ fontSize: 10, color: "var(--muted)", fontFamily: "'DM Mono',monospace", marginBottom: 6 }}>
                        ASK ABOUT A SPECIFIC PROP
                      </div>
                      <div className="ask-shell" style={{ margin: 0 }}>
                        <input
                          className="ask-bar"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder="e.g. Will Fritz get 12 aces?"
                          onKeyDown={(e) => e.key === "Enter" && submitAsk()}
                        />
                        <button className="send-btn" style={{ width: 38, height: 38 }} onClick={() => submitAsk()}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        )}

        {screen === "player" && pd && (
          <main className="screen">
            <button className="detail-back" onClick={() => { setScreen("tennis"); setSelectedPlayer(null); }}>
              ← BACK TO TENNIS
            </button>

            <div className="detail-card">
              <div className="detail-head">
                <div className="detail-league" style={{ color: "var(--cyan)" }}>
                  {tennisTab.toUpperCase()} · #{tourPlayers.indexOf(selectedPlayer) + 1} ELO
                </div>
                <div className="detail-title">{selectedPlayer}</div>
                <div className="detail-sub">{pd.style} · Elo {pd.elo}</div>
              </div>

              <div className="what-matters">
                <div className="wm-label">SURFACE ELO RANKS</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 8 }}>
                  <div className="mini-stat">
                    <div className="mini-label">HARD</div>
                    <div className="mini-value" style={{ color: "var(--cyan)" }}>#{pd.hEloRank}</div>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{pd.hElo?.toFixed(0)}</div>
                  </div>
                  <div className="mini-stat">
                    <div className="mini-label">CLAY</div>
                    <div className="mini-value" style={{ color: "var(--gold)" }}>#{pd.cEloRank}</div>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{pd.cElo?.toFixed(0)}</div>
                  </div>
                  <div className="mini-stat">
                    <div className="mini-label">GRASS</div>
                    <div className="mini-value" style={{ color: "var(--green)" }}>#{pd.gEloRank}</div>
                    <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{pd.gElo?.toFixed(0)}</div>
                  </div>
                </div>
              </div>

              <div style={{ padding: "0 14px 14px" }}>
                <div className="wm-label" style={{ marginBottom: 8 }}>2026 FORM</div>
                <div style={{ background: "var(--surface-2)", borderRadius: 10, padding: 10, fontSize: 13, color: "var(--soft)", lineHeight: 1.5 }}>
                  {pd.record2026 || pd.yElo2026}
                </div>
              </div>

              <div className="what-matters" style={{ paddingTop: 0 }}>
                <div className="wm-label">SERVE</div>
                <div style={{ fontSize: 13, color: "var(--soft)", lineHeight: 1.5 }}>{pd.serveStats}</div>
              </div>

              <div className="what-matters" style={{ paddingTop: 0 }}>
                <div className="wm-label">RETURN</div>
                <div style={{ fontSize: 13, color: "var(--soft)", lineHeight: 1.5 }}>{pd.returnStats}</div>
              </div>

              <div className="what-matters" style={{ paddingTop: 0 }}>
                <div className="wm-label">OVERALL</div>
                <div style={{ fontSize: 13, color: "var(--soft)", lineHeight: 1.5 }}>{pd.overallStats}</div>
              </div>

              {pd.miamiNote && (
                <div className="what-matters" style={{ paddingTop: 0 }}>
                  <div className="wm-label" style={{ color: "var(--magenta)" }}>MIAMI NOTE</div>
                  <div style={{ fontSize: 13, color: "var(--soft)", lineHeight: 1.55 }}>{pd.miamiNote}</div>
                </div>
              )}

              {pd.fullNote && (
                <div className="what-matters" style={{ paddingTop: 0 }}>
                  <div className="wm-label">UR TAKE</div>
                  <div style={{ fontSize: 13, color: "var(--soft)", lineHeight: 1.55 }}>{pd.fullNote}</div>
                </div>
              )}
            </div>

            <div className="ask-shell">
              <input
                className="ask-bar"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask about ${selectedPlayer}...`}
                onKeyDown={(e) => e.key === "Enter" && submitAsk()}
              />
              <button className="send-btn" onClick={() => submitAsk()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
              </button>
            </div>
          </main>
        )}

        {screen === "ask" && (
          <main className="screen">
            <section className="hero" style={{ paddingTop: 4 }}>
              <div className="hero-title">UR TAKE</div>
              <div className="hero-sub">Ask in plain English. Keep it broad or get weirdly specific.</div>
            </section>

            <div className="ask-shell">
              <input
                className="ask-bar"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="What do you want to know?"
                onKeyDown={(e) => e.key === "Enter" && submitAsk()}
              />
              <button className="send-btn" onClick={() => submitAsk()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
              </button>
            </div>

            {messages.length === 0 ? (
              <section className="section">
                <div className="section-label">TRY ONE</div>
                <div className="q-list">
                  {featuredQuestions.map((q) => (
                    <button key={q.id} className="q-card" onClick={() => setInput(q.prompt)}>
                      <div className="q-top">
                        <div className="q-accent" style={{ background: q.color }} />
                        <div className="q-text">{q.text}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ) : (
              <div className="chat-thread">
                {messages.map((m, i) => (
                  <div key={i} className={`bubble ${m.role}`}>{m.text}</div>
                ))}
              </div>
            )}
          </main>
        )}

        {screen === "pro" && (
          <main className="screen">
            <div className="pro-card">
              <div className="pro-title">UNDER REVIEW PRO</div>
              <div className="pro-copy">
                Unlimited UR TAKE queries, deeper matchup cards, saved threads, cleaner data views, and a more premium sports intelligence layer.
              </div>
              <div className="pro-price">$9.99 / month</div>
              <button className="pro-btn">UPGRADE</button>
            </div>
          </main>
        )}

        <nav className="bottom-nav">
          <button className={`nav-btn${(tab === "home" && screen === "home") ? " active" : ""}`} onClick={goHome}>HOME</button>
          <button className={`nav-btn${tab === "ask" ? " active" : ""}`} onClick={() => goAsk("")}>ASK</button>
          <button className={`nav-btn${tab === "pro" ? " active" : ""}`} onClick={goPro}>PRO</button>
        </nav>
      </div>
    </>
  );
}
