import { useMemo, useState } from "react";

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
    --muted:#5A6070;
    --soft:#9BA4B0;
    --green:#00E676;
    --red:#FF4444;
  }

  *{box-sizing:border-box;margin:0;padding:0;}
  body{
    background:var(--black);
    color:var(--text);
    font-family:'DM Sans',sans-serif;
  }

  .app{
    min-height:100vh;
    background:var(--black);
    color:var(--text);
    display:flex;
    flex-direction:column;
  }

  .hdr{
    padding:14px 16px;
    border-bottom:1px solid var(--border);
    background:rgba(8,10,12,.97);
    display:flex;
    align-items:center;
    justify-content:space-between;
    position:sticky;
    top:0;
    z-index:20;
  }

  .logo{
    line-height:1;
  }

  .logo-under{
    display:block;
    font-family:'Bebas Neue',sans-serif;
    font-size:10px;
    letter-spacing:5px;
    color:rgba(255,255,255,.75);
    margin-bottom:2px;
  }

  .logo-review{
    display:block;
    font-family:'Bebas Neue',sans-serif;
    font-size:22px;
    letter-spacing:2px;
    line-height:1;
    background:linear-gradient(90deg,var(--cyan),var(--magenta));
    -webkit-background-clip:text;
    -webkit-text-fill-color:transparent;
    background-clip:text;
  }

  .hdr-right{
    display:flex;
    align-items:center;
    gap:10px;
  }

  .pill-live{
    font-family:'DM Mono',monospace;
    font-size:10px;
    color:var(--magenta);
    border:1px solid rgba(255,45,107,.25);
    padding:4px 9px;
    border-radius:999px;
    background:rgba(255,45,107,.06);
  }

  .screen{
    flex:1;
    overflow-y:auto;
    padding:16px;
    padding-bottom:88px;
  }

  .hero{
    padding:12px 2px 16px;
    text-align:center;
  }

  .hero-title{
    font-family:'Bebas Neue',sans-serif;
    font-size:34px;
    letter-spacing:1px;
    line-height:1;
    margin-bottom:8px;
  }

  .hero-sub{
    color:var(--soft);
    font-size:14px;
    line-height:1.55;
    max-width:360px;
    margin:0 auto;
  }

  .ask-bar{
    width:100%;
    border:1px solid var(--border-2);
    background:var(--surface-2);
    border-radius:18px;
    padding:12px 14px;
    color:var(--text);
    font-size:14px;
    outline:none;
  }

  .ask-bar::placeholder{
    color:var(--muted);
  }

  .ask-shell{
    margin:12px 0 18px;
    display:flex;
    gap:8px;
    align-items:center;
  }

  .send-btn{
    width:44px;
    height:44px;
    border:none;
    border-radius:50%;
    background:var(--cyan);
    color:var(--black);
    display:flex;
    align-items:center;
    justify-content:center;
    cursor:pointer;
    flex-shrink:0;
  }

  .send-btn:hover{
    background:var(--magenta);
    color:var(--black);
  }

  .section{
    margin-top:18px;
  }

  .section-label{
    font-family:'DM Mono',monospace;
    font-size:10px;
    letter-spacing:2px;
    color:var(--muted);
    margin-bottom:10px;
  }

  .q-list{
    display:flex;
    flex-direction:column;
    gap:8px;
  }

  .q-card{
    width:100%;
    text-align:left;
    background:var(--surface);
    border:1px solid var(--border);
    border-radius:14px;
    padding:12px;
    cursor:pointer;
    color:var(--text);
  }

  .q-card:hover{
    border-color:var(--cyan);
  }

  .q-top{
    display:flex;
    align-items:center;
    gap:10px;
  }

  .q-accent{
    width:4px;
    height:30px;
    border-radius:2px;
    flex-shrink:0;
  }

  .q-text{
    font-size:14px;
    line-height:1.45;
    color:#D6DCE6;
  }

  .matchup-list{
    display:flex;
    flex-direction:column;
    gap:10px;
  }

  .matchup-card{
    background:var(--surface);
    border:1px solid var(--border);
    border-radius:16px;
    overflow:hidden;
    cursor:pointer;
  }

  .matchup-card:hover{
    border-color:var(--cyan);
  }

  .matchup-top{
    padding:10px 12px;
    border-bottom:1px solid var(--border);
    display:flex;
    align-items:center;
    justify-content:space-between;
    background:rgba(255,255,255,.01);
  }

  .matchup-league{
    font-family:'DM Mono',monospace;
    font-size:10px;
    letter-spacing:2px;
  }

  .matchup-time{
    font-family:'DM Mono',monospace;
    font-size:10px;
    color:var(--muted);
  }

  .matchup-body{
    padding:12px;
  }

  .matchup-title{
    font-size:16px;
    font-weight:600;
    margin-bottom:4px;
  }

  .matchup-meta{
    font-size:12px;
    color:var(--muted);
    margin-bottom:8px;
  }

  .matchup-blurb{
    font-size:13px;
    color:var(--soft);
    line-height:1.55;
  }

  .sport-chips{
    display:flex;
    gap:8px;
    flex-wrap:wrap;
  }

  .sport-chip{
    border:1px solid var(--border);
    background:var(--surface);
    color:var(--soft);
    border-radius:999px;
    padding:8px 12px;
    font-family:'DM Mono',monospace;
    font-size:11px;
    cursor:pointer;
  }

  .sport-chip.active,
  .sport-chip:hover{
    border-color:var(--cyan);
    color:var(--cyan);
  }

  .detail-back{
    background:none;
    border:none;
    color:var(--muted);
    font-family:'DM Mono',monospace;
    font-size:11px;
    letter-spacing:1px;
    margin-bottom:12px;
    cursor:pointer;
  }

  .detail-card{
    background:var(--surface);
    border:1px solid var(--border);
    border-radius:18px;
    overflow:hidden;
    margin-bottom:14px;
  }

  .detail-head{
    padding:12px 14px;
    border-bottom:1px solid var(--border);
    background:var(--surface-2);
  }

  .detail-league{
    font-family:'DM Mono',monospace;
    font-size:10px;
    letter-spacing:2px;
    margin-bottom:6px;
  }

  .detail-title{
    font-family:'Bebas Neue',sans-serif;
    font-size:28px;
    letter-spacing:1px;
    line-height:1;
    margin-bottom:6px;
  }

  .detail-sub{
    font-size:12px;
    color:var(--muted);
  }

  .what-matters{
    padding:14px;
  }

  .wm-label{
    font-family:'DM Mono',monospace;
    font-size:10px;
    letter-spacing:2px;
    color:var(--cyan);
    margin-bottom:8px;
  }

  .wm-text{
    font-size:14px;
    line-height:1.7;
    color:#D6DCE6;
  }

  .quick-hitters{
    display:flex;
    gap:8px;
    flex-wrap:wrap;
    padding:0 14px 14px;
  }

  .quick-btn{
    border:1px solid var(--border-2);
    background:#101722;
    color:var(--soft);
    border-radius:999px;
    padding:8px 12px;
    font-size:12px;
    cursor:pointer;
  }

  .quick-btn:hover{
    border-color:var(--cyan);
    color:var(--cyan);
  }

  .mini-grid{
    display:grid;
    grid-template-columns:repeat(3,1fr);
    gap:8px;
    padding:0 14px 14px;
  }

  .mini-stat{
    background:var(--surface-2);
    border:1px solid var(--border);
    border-radius:12px;
    padding:10px;
    text-align:center;
  }

  .mini-label{
    font-family:'DM Mono',monospace;
    font-size:9px;
    color:var(--muted);
    margin-bottom:4px;
  }

  .mini-value{
    font-size:15px;
    font-weight:700;
  }

  .chat-thread{
    display:flex;
    flex-direction:column;
    gap:12px;
    margin-top:16px;
  }

  .bubble{
    max-width:88%;
    border-radius:18px;
    padding:13px 14px;
    font-size:14px;
    line-height:1.65;
  }

  .bubble.user{
    margin-left:auto;
    background:#1E2B38;
    border:1px solid #2A3A4A;
    color:var(--text);
    border-bottom-right-radius:6px;
  }

  .bubble.ai{
    margin-right:auto;
    background:var(--surface);
    border:1px solid var(--border);
    color:#D0D7E2;
    border-bottom-left-radius:6px;
  }

  .bubble.ai strong{
    color:var(--text);
  }

  .bottom-nav{
    position:fixed;
    left:0;
    right:0;
    bottom:0;
    background:rgba(8,10,12,.98);
    border-top:1px solid var(--border);
    display:grid;
    grid-template-columns:repeat(3,1fr);
    padding:10px 10px 12px;
    z-index:30;
  }

  .nav-btn{
    background:none;
    border:none;
    color:var(--muted);
    font-family:'DM Mono',monospace;
    font-size:11px;
    letter-spacing:1px;
    cursor:pointer;
    padding:6px 0;
  }

  .nav-btn.active{
    color:var(--cyan);
  }

  .pro-card{
    background:var(--surface);
    border:1px solid rgba(255,45,107,.25);
    border-radius:18px;
    padding:18px;
  }

  .pro-title{
    font-family:'Bebas Neue',sans-serif;
    font-size:28px;
    letter-spacing:2px;
    margin-bottom:8px;
  }

  .pro-copy{
    color:var(--soft);
    font-size:14px;
    line-height:1.7;
    margin-bottom:14px;
  }

  .pro-price{
    font-size:34px;
    font-family:'Bebas Neue',sans-serif;
    letter-spacing:1px;
    margin-bottom:12px;
  }

  .pro-btn{
    width:100%;
    border:none;
    border-radius:14px;
    padding:14px;
    cursor:pointer;
    font-family:'Bebas Neue',sans-serif;
    font-size:18px;
    letter-spacing:2px;
    color:var(--black);
    background:linear-gradient(90deg,var(--cyan),var(--magenta));
  }
`;

const featuredQuestions = [
  {
    id: "q1",
    color: "#00F5E9",
    text: "Will Sinner get 8 aces vs Medvedev?",
    prompt: "Will Sinner get 8 aces vs Medvedev?"
  },
  {
    id: "q2",
    color: "#FF2D6B",
    text: "Can Barca advance past Newcastle?",
    prompt: "Can Barca advance past Newcastle in the second leg?"
  },
  {
    id: "q3",
    color: "#F5C842",
    text: "How realistic is a Hamilton podium this weekend?",
    prompt: "How realistic is it that Lewis Hamilton finishes top 3 this weekend?"
  }
];

const featuredMatchups = [
  {
    id: "m1",
    league: "ATP",
    leagueColor: "#00F5E9",
    title: "Sinner vs Medvedev",
    time: "2:30 PM ET",
    network: "Tennis Channel",
    blurb:
      "Medvedev’s return profile is what keeps this from feeling automatic. If the match stretches, Sinner’s serve and current form still give him the edge.",
    whatMatters:
      "Sinner has the cleaner serve profile and better recent form, but Medvedev is one of the few players who can drag him into uncomfortable return-heavy stretches. If this stays on serve, Sinner is more trustworthy late.",
    quickHitters: [
      "Will Sinner get 8 aces?",
      "Is Medvedev a live dog?",
      "Does this go 3 sets?"
    ],
    stats: [
      { label: "UR CONF", value: "67%" },
      { label: "ACES LINE", value: "8.0" },
      { label: "SURFACE", value: "Hard" }
    ]
  },
  {
    id: "m2",
    league: "UCL",
    leagueColor: "#FF2D6B",
    title: "Barca vs Newcastle",
    time: "3:00 PM ET",
    network: "Paramount+",
    blurb:
      "This is less about overall quality and more about whether Newcastle can turn the match chaotic early. First goal changes everything.",
    whatMatters:
      "Barca are the better side on paper, but away pressure and Newcastle’s crowd can make the first 25 minutes feel bigger than the talent gap. If Newcastle score first, the tie becomes live immediately.",
    quickHitters: [
      "Will Barca advance?",
      "Do both teams score?",
      "Is over 2.5 live?"
    ],
    stats: [
      { label: "UR CONF", value: "71%" },
      { label: "TIE STATE", value: "Live" },
      { label: "ANGLE", value: "BTTS" }
    ]
  },
  {
    id: "m3",
    league: "F1",
    leagueColor: "#F5C842",
    title: "Hamilton podium chances",
    time: "This weekend",
    network: "ESPN",
    blurb:
      "Top 3 is possible, but it depends more on qualifying and race pace balance than brand name. Top 5 feels cleaner than podium right now.",
    whatMatters:
      "Hamilton podium bets usually come down to two things: where he starts and whether the car has genuine long-run pace. If qualifying leaves him buried, the podium path gets much thinner unless strategy chaos opens it.",
    quickHitters: [
      "Is top 3 realistic?",
      "Safer: top 5?",
      "What matters most?"
    ],
    stats: [
      { label: "UR CONF", value: "38%" },
      { label: "LEAN", value: "Top 5" },
      { label: "KEY", value: "Quali" }
    ]
  }
];

function generateTake(input, matchup) {
  const q = input.toLowerCase();

  if (q.includes("sinner") && q.includes("ace")) {
    return `**UR TAKE:** 8 is right around the sharp part of the number. Sinner absolutely has the serve to get there, but Medvedev is one of the toughest returners to rack up cheap ace volume against. I’d call it slightly under before I’d call it comfortably over.`;
  }

  if (q.includes("barca") && q.includes("advance")) {
    return `**UR TAKE:** Barca should still be favored to advance, but this is exactly the kind of second leg that gets uncomfortable if Newcastle score first. The quality edge is Barca. The emotional edge is Newcastle.`;
  }

  if (q.includes("hamilton") && q.includes("top 3")) {
    return `**UR TAKE:** A Hamilton podium is realistic, not likely. The clean way to think about it is this: top 5 is the fair baseline, top 3 needs either excellent qualifying or race chaos helping him jump one of the faster cars.`;
  }

  if (q.includes("mahomes") && q.includes("2 td")) {
    return `**UR TAKE:** Two passing touchdowns is the kind of number that sounds small but is often priced efficiently. The real question is game script: if Kansas City is forced to stay aggressive for four quarters, 2+ becomes much more realistic.`;
  }

  if (matchup) {
    return `**UR TAKE:** On this one, the first thing I’d focus on is ${matchup.whatMatters.toLowerCase()} Ask a little narrower — player prop, result, total, or “what matters most” — and the answer gets sharper immediately.`;
  }

  return `**UR TAKE:** The goal here is to give you a direct sports answer in plain English, not just stats dumped back at you. Ask me about a matchup, a player milestone, a prop-style question, or whether something feels realistic.`;
}

export default function App() {
  const [tab, setTab] = useState("home");
  const [screen, setScreen] = useState("home");
  const [selectedMatchup, setSelectedMatchup] = useState(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  const currentTitle = useMemo(() => {
    if (screen === "matchup" && selectedMatchup) return selectedMatchup.title;
    if (tab === "ask") return "UR TAKE";
    if (tab === "pro") return "PRO";
    return "Home";
  }, [screen, selectedMatchup, tab]);

  function goHome() {
    setTab("home");
    setScreen("home");
    setSelectedMatchup(null);
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

  function openMatchup(matchup) {
    setSelectedMatchup(matchup);
    setScreen("matchup");
    setTab("home");
    setInput("");
  }

  function submitAsk(forcedText) {
    const text = (forcedText ?? input).trim();
    if (!text) return;

    const userMsg = { role: "user", text };
    const aiMsg = {
      role: "ai",
      text: generateTake(text, selectedMatchup)
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput("");
    setTab("ask");
    setScreen("ask");
  }

  function submitMatchupAsk(forcedText) {
    const text = (forcedText ?? input).trim();
    if (!text) return;

    const userMsg = { role: "user", text };
    const aiMsg = {
      role: "ai",
      text: generateTake(text, selectedMatchup)
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput("");
    setTab("ask");
    setScreen("ask");
  }

  return (
    <>
      <style>{css}</style>

      <div className="app">
        <header className="hdr">
          <div className="logo">
            <span className="logo-under">UNDER</span>
            <span className="logo-review">REVIEW</span>
          </div>

          <div className="hdr-right">
            {screen === "matchup" && selectedMatchup ? (
              <div className="pill-live">{currentTitle}</div>
            ) : tab === "ask" ? (
              <div className="pill-live">UR TAKE</div>
            ) : (
              <div className="pill-live">LIVE</div>
            )}
          </div>
        </header>

        {screen === "home" && (
          <main className="screen">
            <section className="hero">
              <div className="hero-title">What do you want to know?</div>
              <div className="hero-sub">
                Sports, stats, predictions, context — in plain English.
              </div>
            </section>

            <div className="ask-shell">
              <input
                className="ask-bar"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask UR TAKE anything..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitAsk();
                }}
              />
              <button className="send-btn" onClick={() => submitAsk()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
                </svg>
              </button>
            </div>

            <section className="section">
              <div className="section-label">TRENDING ASKS</div>
              <div className="q-list">
                {featuredQuestions.map((q) => (
                  <button
                    key={q.id}
                    className="q-card"
                    onClick={() => goAsk(q.prompt)}
                  >
                    <div className="q-top">
                      <div
                        className="q-accent"
                        style={{ background: q.color }}
                      />
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
                  <div
                    key={m.id}
                    className="matchup-card"
                    onClick={() => openMatchup(m)}
                  >
                    <div className="matchup-top">
                      <div
                        className="matchup-league"
                        style={{ color: m.leagueColor }}
                      >
                        {m.league}
                      </div>
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
                <button className="sport-chip active">NFL</button>
                <button className="sport-chip">NBA</button>
                <button className="sport-chip">Tennis</button>
                <button className="sport-chip">Soccer</button>
                <button className="sport-chip">F1</button>
              </div>
            </section>
          </main>
        )}

        {screen === "matchup" && selectedMatchup && (
          <main className="screen">
            <button className="detail-back" onClick={goHome}>
              ← BACK
            </button>

            <div className="detail-card">
              <div className="detail-head">
                <div
                  className="detail-league"
                  style={{ color: selectedMatchup.leagueColor }}
                >
                  {selectedMatchup.league}
                </div>
                <div className="detail-title">{selectedMatchup.title}</div>
                <div className="detail-sub">
                  {selectedMatchup.time} · {selectedMatchup.network}
                </div>
              </div>

              <div className="what-matters">
                <div className="wm-label">HERE’S WHAT MATTERS</div>
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
                  <button
                    key={q}
                    className="quick-btn"
                    onClick={() => submitMatchupAsk(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="ask-shell">
              <input
                className="ask-bar"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask about ${selectedMatchup.title}...`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitMatchupAsk();
                }}
              />
              <button className="send-btn" onClick={() => submitMatchupAsk()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
                </svg>
              </button>
            </div>
          </main>
        )}

        {screen === "ask" && (
          <main className="screen">
            <section className="hero" style={{ paddingTop: 4 }}>
              <div className="hero-title">UR TAKE</div>
              <div className="hero-sub">
                Ask in plain English. Keep it broad or get weirdly specific.
              </div>
            </section>

            <div className="ask-shell">
              <input
                className="ask-bar"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="What do you want to know?"
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitAsk();
                }}
              />
              <button className="send-btn" onClick={() => submitAsk()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
                </svg>
              </button>
            </div>

            {messages.length === 0 ? (
              <section className="section">
                <div className="section-label">TRY ONE</div>
                <div className="q-list">
                  {featuredQuestions.map((q) => (
                    <button
                      key={q.id}
                      className="q-card"
                      onClick={() => setInput(q.prompt)}
                    >
                      <div className="q-top">
                        <div
                          className="q-accent"
                          style={{ background: q.color }}
                        />
                        <div className="q-text">{q.text}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ) : (
              <div className="chat-thread">
                {messages.map((m, i) => (
                  <div key={i} className={`bubble ${m.role}`}>
                    {m.text}
                  </div>
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
                Unlimited UR TAKE queries, deeper matchup cards, saved threads,
                cleaner data views, and a more premium sports intelligence layer.
              </div>
              <div className="pro-price">$9.99 / month</div>
              <button className="pro-btn">UPGRADE</button>
            </div>
          </main>
        )}

        <nav className="bottom-nav">
          <button
            className={`nav-btn ${tab === "home" && screen === "home" ? "active" : ""}`}
            onClick={goHome}
          >
            HOME
          </button>
          <button
            className={`nav-btn ${tab === "ask" ? "active" : ""}`}
            onClick={() => goAsk("")}
          >
            ASK
          </button>
          <button
            className={`nav-btn ${tab === "pro" ? "active" : ""}`}
            onClick={goPro}
          >
            PRO
          </button>
        </nav>
      </div>
    </>
  );
}
