import { useState, useRef, useEffect } from "react";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

  :root {
    --black: #080A0C;
    --surface: #0F1215;
    --surface2: #0C1014;
    --border: #1E2328;
    --border2: #2A3040;
    --cyan: #00F5E9;
    --magenta: #FF2D6B;
    --gold: #F5C842;
    --text: #E8EAF0;
    --muted: #5A6070;
    --sub: #9BA4B0;
    --win: #00E676;
    --loss: #FF4444;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body { background: var(--black); }

  .app {
    background: var(--black);
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
    min-height: 100vh;
    max-width: 480px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }

  /* HEADER */
  .hdr {
    padding: 14px 20px;
    border-bottom: 1px solid var(--border);
    background: var(--black);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    position: sticky;
    top: 0;
    z-index: 5;
  }
  .logo-u { font-size: 9px; letter-spacing: 0.35em; color: rgba(255,255,255,0.45); display: block; line-height: 1; }
  .logo-r { font-size: 20px; font-family: 'Bebas Neue', sans-serif; letter-spacing: 2px; background: linear-gradient(90deg, var(--cyan), var(--magenta)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; display: block; line-height: 1.1; }
  .live-tag { font-size: 9px; letter-spacing: 0.2em; color: var(--sub); border: 1px solid var(--border2); padding: 4px 10px; border-radius: 20px; }

  /* PAGES */
  .page { display: none; flex-direction: column; flex: 1; overflow: hidden; }
  .page.active { display: flex; }
  .scroll { overflow-y: auto; flex: 1; padding-bottom: 90px; }

  /* HERO */
  .hero { padding: 36px 20px 24px; text-align: center; }
  .hero-head { font-family: 'Bebas Neue', sans-serif; font-size: 36px; letter-spacing: 2px; color: var(--text); line-height: 1.1; margin-bottom: 8px; }
  .hero-head span { color: var(--cyan); }
  .hero-sub { font-size: 13px; color: var(--muted); margin-bottom: 22px; }

  .ask-bar {
    background: var(--surface);
    border: 1px solid var(--border2);
    border-radius: 28px;
    padding: 13px 14px 13px 18px;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    transition: border-color 0.2s;
  }
  .ask-bar:hover { border-color: var(--cyan); }
  .ask-bar-text { flex: 1; font-size: 13px; color: var(--muted); text-align: left; }
  .ask-send {
    width: 34px; height: 34px; border-radius: 50%;
    background: var(--cyan); border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: background 0.2s;
  }
  .ask-send:hover { background: var(--magenta); }

  .example-pills { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-top: 14px; }
  .epill {
    font-size: 11px; color: var(--sub);
    border: 1px solid var(--border); background: var(--surface);
    padding: 6px 12px; border-radius: 20px; cursor: pointer;
    transition: all 0.2s;
  }
  .epill:hover { border-color: var(--cyan); color: var(--cyan); }

  /* SECTIONS */
  .section { padding: 20px 20px 0; }
  .sec-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.3em; color: var(--muted); margin-bottom: 12px; }

  /* FEATURED GRID */
  .feat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .feat-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 14px; padding: 14px; cursor: pointer;
    transition: border-color 0.2s;
  }
  .feat-card:hover { border-color: var(--border2); }
  .feat-sport { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.2em; margin-bottom: 8px; }
  .feat-q { font-size: 12px; color: var(--text); line-height: 1.4; margin-bottom: 10px; font-weight: 500; }
  .feat-bar-wrap { height: 3px; background: var(--border); border-radius: 2px; margin-bottom: 5px; }
  .feat-bar { height: 3px; border-radius: 2px; }
  .feat-pct { font-family: 'DM Mono', monospace; font-size: 11px; }

  /* MATCHUP LIST */
  .matchup-list { display: flex; flex-direction: column; gap: 8px; }
  .mu-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 12px; padding: 13px 16px;
    display: flex; align-items: center; justify-content: space-between;
    cursor: pointer; transition: border-color 0.2s;
  }
  .mu-card:hover { border-color: var(--border2); }
  .mu-name { font-size: 14px; color: var(--text); font-weight: 500; }
  .mu-meta { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); margin-top: 3px; }
  .mu-right { display: flex; align-items: center; gap: 10px; }
  .mu-sport { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.15em; }
  .mu-arrow { color: var(--muted); font-size: 18px; }

  /* SPORT GRID */
  .sport-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
  .sport-btn {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 10px; padding: 12px 4px; text-align: center;
    cursor: pointer; font-family: 'DM Mono', monospace;
    font-size: 10px; color: var(--sub); letter-spacing: 0.05em;
    transition: all 0.2s;
  }
  .sport-btn:hover, .sport-btn.active {
    border-color: var(--cyan); color: var(--cyan);
    background: rgba(0,245,233,0.04);
  }

  /* NAV BAR */
  .nav-bar {
    border-top: 1px solid var(--border);
    background: var(--black);
    padding: 10px 0 16px;
    display: flex;
    justify-content: space-around;
    flex-shrink: 0;
  }
  .nav-item { text-align: center; cursor: pointer; padding: 6px 24px; }
  .nav-label { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.1em; color: var(--muted); transition: color 0.2s; }
  .nav-item.active .nav-label { color: var(--cyan); }

  /* DRAWER */
  .drawer-overlay {
    display: none; position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.65);
    z-index: 20;
  }
  .drawer-overlay.open { display: block; }
  .drawer {
    position: fixed; bottom: 0; left: 50%; transform: translateX(-50%) translateY(100%);
    width: 100%; max-width: 480px;
    background: var(--surface);
    border-radius: 20px 20px 0 0;
    border-top: 1px solid var(--border);
    z-index: 21;
    transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
    padding-bottom: 24px;
  }
  .drawer.open { transform: translateX(-50%) translateY(0); }
  .drawer-handle { width: 36px; height: 4px; background: var(--border2); border-radius: 2px; margin: 14px auto 18px; }
  .drawer-inner { padding: 0 20px; }
  .drawer-sport { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.25em; margin-bottom: 6px; }
  .drawer-title { font-family: 'Bebas Neue', sans-serif; font-size: 24px; letter-spacing: 1px; color: var(--text); margin-bottom: 4px; }
  .drawer-meta { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); margin-bottom: 18px; }
  .drawer-divider { height: 1px; background: var(--border); margin: 0 0 16px; }
  .bullet-list { display: flex; flex-direction: column; gap: 11px; margin-bottom: 18px; }
  .bullet { display: flex; align-items: flex-start; gap: 10px; }
  .bullet-dot { width: 5px; height: 5px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
  .bullet-text { font-size: 13px; color: var(--sub); line-height: 1.55; }
  .drawer-ask-bar {
    background: var(--surface2); border: 1px solid var(--border2);
    border-radius: 22px; padding: 11px 12px 11px 16px;
    display: flex; align-items: center; gap: 10px; cursor: pointer;
  }
  .drawer-ask-text { flex: 1; font-size: 12px; color: var(--muted); }

  /* ASK PAGE */
  .ask-page { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
  .ask-hero { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 16px; }
  .ask-hero-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.25em; color: var(--cyan); margin-bottom: 10px; }
  .ask-input-wrap {
    background: var(--surface2); border: 1px solid var(--border2);
    border-radius: 22px; padding: 12px 12px 12px 16px;
    display: flex; align-items: center; gap: 10px; cursor: pointer;
  }
  .ask-input-text { flex: 1; font-size: 13px; color: var(--muted); }

  .convo-list { display: flex; flex-direction: column; gap: 8px; }
  .convo-item { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 13px 14px; }
  .convo-q { font-size: 11px; color: var(--muted); margin-bottom: 6px; font-family: 'DM Mono', monospace; }
  .convo-a { font-size: 13px; color: var(--sub); line-height: 1.55; }

  .trending-list { display: flex; flex-direction: column; gap: 8px; }
  .trend-item {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 10px; padding: 12px 14px;
    display: flex; align-items: center; gap: 10px; cursor: pointer;
    transition: border-color 0.2s;
  }
  .trend-item:hover { border-color: var(--border2); }
  .trend-bar { width: 3px; height: 28px; border-radius: 2px; flex-shrink: 0; }
  .trend-text { font-size: 13px; color: var(--sub); }

  /* PRO PAGE */
  .pro-page { padding: 28px 20px; display: flex; flex-direction: column; gap: 20px; }
  .pro-tag { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.25em; color: var(--magenta); margin-bottom: 4px; }
  .pro-head { font-family: 'Bebas Neue', sans-serif; font-size: 32px; letter-spacing: 2px; color: var(--text); line-height: 1.1; }
  .pro-sub { font-size: 13px; color: var(--sub); line-height: 1.6; }
  .pro-features { display: flex; flex-direction: column; gap: 10px; }
  .pro-feat { display: flex; align-items: center; gap: 12px; }
  .pro-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--cyan); flex-shrink: 0; }
  .pro-feat-text { font-size: 14px; color: var(--sub); }
  .pro-price { text-align: center; padding: 8px 0; }
  .pro-amount { font-family: 'Bebas Neue', sans-serif; font-size: 52px; letter-spacing: 1px; color: var(--text); line-height: 1; }
  .pro-period { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.2em; color: var(--muted); margin-top: 4px; }
  .pro-btn {
    width: 100%; padding: 16px;
    background: var(--cyan); border: none; border-radius: 12px;
    font-family: 'Bebas Neue', sans-serif; font-size: 18px; letter-spacing: 3px;
    color: var(--black); cursor: pointer; transition: background 0.2s;
  }
  .pro-btn:hover { background: var(--magenta); color: var(--text); }
  .pro-reset { text-align: center; font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); }
`;

const FEATURED = [
  { sport: "ATP", sportColor: "#00F5E9", question: "Will Sinner get 8 aces vs Medvedev?", pct: 62, matchup: "sinner-med" },
  { sport: "UCL", sportColor: "#FF2D6B", question: "Can Barca advance past Newcastle?", pct: 71, matchup: "barca-new" },
  { sport: "F1", sportColor: "#F5C842", question: "Realistic Hamilton top 3 this weekend?", pct: 38, matchup: "hamilton" },
  { sport: "NBA", sportColor: "#00F5E9", question: "Tatum over 32.5 points tonight?", pct: 81, matchup: "celtics-heat" },
];

const MATCHUPS = [
  { name: "Sinner vs Medvedev", meta: "2:30 PM · ESPN · ATP Miami Open", sport: "ATP", sportColor: "#00F5E9", id: "sinner-med" },
  { name: "Barca vs Newcastle", meta: "3:00 PM · CBS · UCL 2nd leg", sport: "UCL", sportColor: "#FF2D6B", id: "barca-new" },
  { name: "Celtics vs Heat", meta: "7:30 PM ET · TNT · NBA", sport: "NBA", sportColor: "#00F5E9", id: "celtics-heat" },
  { name: "Mahomes season props", meta: "NFL · 2026 pre-season projection", sport: "NFL", sportColor: "#F5C842", id: "mahomes" },
];

const DRAWER_DATA = {
  "sinner-med": {
    sport: "ATP TENNIS",
    sportColor: "#00F5E9",
    title: "Sinner vs Medvedev",
    meta: "ATP Miami Open · 2:30 PM · ESPN",
    bullets: [
      { color: "#00F5E9", text: "Sinner's DR 1.49 is best on tour — he wins 49% more points than he loses overall." },
      { color: "#FF2D6B", text: "Medvedev wins only 42% of tiebreaks — worst in the top 10. A third set strongly favors Sinner." },
      { color: "#F5C842", text: "Sinner averages 8.1 aces per match on Miami hard courts. The 8-ace line is right at his median." },
    ],
  },
  "barca-new": {
    sport: "CHAMPIONS LEAGUE",
    sportColor: "#FF2D6B",
    title: "Barca vs Newcastle",
    meta: "UCL 2nd leg · 3:00 PM · CBS",
    bullets: [
      { color: "#FF2D6B", text: "Barca lead the tie. Newcastle need 2 goals — their home xG is 1.8/game, short of what's required." },
      { color: "#00F5E9", text: "Barca's defensive shape under pressure has been their most reliable asset this UCL run." },
      { color: "#F5C842", text: "71% confidence Barca advance. The real risk is a set-piece goal early in the match." },
    ],
  },
  "hamilton": {
    sport: "FORMULA 1",
    sportColor: "#F5C842",
    title: "Hamilton podium chances",
    meta: "Saudi Arabian GP · Saturday · ESPN",
    bullets: [
      { color: "#F5C842", text: "Ferrari pace looks genuine at Jeddah — qualifying position decides everything here." },
      { color: "#00F5E9", text: "Tire degradation at Jeddah is low, which opens Ferrari's strategy window considerably." },
      { color: "#9BA4B0", text: "38% podium probability. Top 3 is live from P3 on the grid. P5+ makes it unlikely." },
    ],
  },
  "celtics-heat": {
    sport: "NBA",
    sportColor: "#00F5E9",
    title: "Celtics vs Heat",
    meta: "NBA · 7:30 PM ET · TNT",
    bullets: [
      { color: "#00F5E9", text: "Tatum averages 34.2 points in his last 6 home games. The 32.5 line is 1.7 below that." },
      { color: "#FF2D6B", text: "Miami is missing Robinson — their perimeter defense is compromised without him." },
      { color: "#F5C842", text: "81% confidence on the over. Only risk is an early blowout leading to early rest." },
    ],
  },
  "mahomes": {
    sport: "NFL",
    sportColor: "#F5C842",
    title: "Mahomes season props",
    meta: "NFL · 2026 pre-season projection",
    bullets: [
      { color: "#F5C842", text: "Mahomes averaged 2.1 TD/game in full healthy seasons. The 2 TD prop is right at his baseline." },
      { color: "#00F5E9", text: "Chiefs' receiving corps intact — Kelce, Rice, and Worthy give him three red zone threats." },
      { color: "#9BA4B0", text: "58% confidence on 2+ TDs Week 1. Opponent matchup sharpens this when schedules release." },
    ],
  },
};

const TRENDING = [
  { color: "#00F5E9", text: "Will Sinner complete the Sunshine Double?" },
  { color: "#FF2D6B", text: "Best upset watch in tennis this week?" },
  { color: "#F5C842", text: "Who wins tonight and why?" },
  { color: "#9BA4B0", text: "Is Swiatek's slump statistically real?" },
];

const RECENTS = [
  { q: "Will Sinner complete the Sunshine Double?", a: "67% confidence. DR 1.49 best on tour, Miami hard courts suit him. Medvedev is the only real threat but his 42% tiebreak rate is a liability in long matches." },
  { q: "Can Barca advance past Newcastle?", a: "71% likely. They lead the tie and Newcastle's xG at home is 1.8/game — not enough to overturn the deficit without a defensive error." },
  { q: "Mahomes 2 TDs in Week 1 — realistic?", a: "58% confidence. He averaged 2.1 TDs per game in healthy seasons. Week 1 opponent matters — check the matchup when schedules release." },
];

const SPORTS = ["NFL", "NBA", "Tennis", "Soccer", "F1"];

export default function App() {
  const [page, setPage] = useState("home");
  const [activeSport, setActiveSport] = useState("NFL");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState(null);

  function openDrawer(id) {
    const d = DRAWER_DATA[id];
    if (!d) return;
    setDrawerData(d);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  function goAsk() {
    setPage("ask");
    setDrawerOpen(false);
  }

  return (
    <>
      <style>{css}</style>
      <div className="app">

        {/* HEADER */}
        <header className="hdr">
          <div>
            <span className="logo-u">UNDER</span>
            <span className="logo-r">REVIEW</span>
          </div>
          <div className="live-tag">LIVE SPORTS AI</div>
        </header>

        {/* HOME PAGE */}
        <div className={`page${page === "home" ? " active" : ""}`}>
          <div className="scroll">

            {/* HERO */}
            <div className="hero">
              <div className="hero-head">Ask <span>UR TAKE</span><br/>anything about sports</div>
              <div className="hero-sub">Predictions, matchups, probabilities — in plain English</div>
              <div className="ask-bar" onClick={goAsk}>
                <div className="ask-bar-text">Try: Will Sinner get 8 aces vs Medvedev?</div>
                <button className="ask-send">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#080A0C"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
                </button>
              </div>
              <div className="example-pills">
                <div className="epill" onClick={goAsk}>Hamilton podium?</div>
                <div className="epill" onClick={goAsk}>Barca advance?</div>
                <div className="epill" onClick={goAsk}>Mahomes 2 TDs?</div>
              </div>
            </div>

            {/* FEATURED */}
            <div className="section">
              <div className="sec-label">Featured questions</div>
              <div className="feat-grid">
                {FEATURED.map((f, i) => (
                  <div key={i} className="feat-card" onClick={() => openDrawer(f.matchup)}>
                    <div className="feat-sport" style={{ color: f.sportColor }}>{f.sport}</div>
                    <div className="feat-q">{f.question}</div>
                    <div className="feat-bar-wrap">
                      <div className="feat-bar" style={{ width: f.pct + "%", background: f.sportColor }} />
                    </div>
                    <div className="feat-pct" style={{ color: f.sportColor }}>{f.pct}% likely</div>
                  </div>
                ))}
              </div>
            </div>

            {/* MATCHUPS */}
            <div className="section" style={{ marginTop: 20 }}>
              <div className="sec-label">Tonight / this week</div>
              <div className="matchup-list">
                {MATCHUPS.map((m, i) => (
                  <div key={i} className="mu-card" onClick={() => openDrawer(m.id)}>
                    <div style={{ flex: 1 }}>
                      <div className="mu-name">{m.name}</div>
                      <div className="mu-meta">{m.meta}</div>
                    </div>
                    <div className="mu-right">
                      <div className="mu-sport" style={{ color: m.sportColor }}>{m.sport}</div>
                      <div className="mu-arrow">›</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SPORTS */}
            <div className="section" style={{ marginTop: 20, paddingBottom: 20 }}>
              <div className="sec-label">Sports</div>
              <div className="sport-grid">
                {SPORTS.map((s) => (
                  <div
                    key={s}
                    className={`sport-btn${activeSport === s ? " active" : ""}`}
                    onClick={() => setActiveSport(s)}
                  >
                    {s}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ASK PAGE */}
        <div className={`page${page === "ask" ? " active" : ""}`}>
          <div className="scroll">
            <div className="ask-page">

              <div className="ask-hero">
                <div className="ask-hero-label">UR TAKE</div>
                <div style={{ fontSize: 16, color: "var(--text)", marginBottom: 14, fontWeight: 500 }}>
                  Ask anything about sports
                </div>
                <div className="ask-input-wrap">
                  <div className="ask-input-text">How realistic is a Hamilton podium this weekend?</div>
                  <button className="ask-send" style={{ width: 30, height: 30 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#080A0C"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
                  </button>
                </div>
              </div>

              <div>
                <div className="sec-label">Recent asks</div>
                <div className="convo-list">
                  {RECENTS.map((r, i) => (
                    <div key={i} className="convo-item">
                      <div className="convo-q">{r.q}</div>
                      <div className="convo-a">{r.a}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="sec-label">Try these</div>
                <div className="trending-list">
                  {TRENDING.map((t, i) => (
                    <div key={i} className="trend-item">
                      <div className="trend-bar" style={{ background: t.color }} />
                      <div className="trend-text">{t.text}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* PRO PAGE */}
        <div className={`page${page === "pro" ? " active" : ""}`}>
          <div className="scroll">
            <div className="pro-page">
              <div>
                <div className="pro-tag">UR TAKE PRO</div>
                <div className="pro-head">Unlimited access.<br/>Sharper answers.</div>
              </div>
              <div className="pro-sub">
                3 free takes per day. Upgrade for unlimited queries, saved picks, full history, and high-confidence alerts across every sport.
              </div>
              <div className="pro-features">
                {[
                  "Unlimited UR TAKE queries",
                  "Saved picks and watchlist",
                  "Full conversation history",
                  "High-confidence alerts",
                  "Multi-sport access — NFL, NBA, Tennis, F1, Soccer",
                ].map((f, i) => (
                  <div key={i} className="pro-feat">
                    <div className="pro-dot" />
                    <div className="pro-feat-text">{f}</div>
                  </div>
                ))}
              </div>
              <div className="pro-price">
                <div className="pro-amount">$9.99</div>
                <div className="pro-period">PER MONTH · CANCEL ANYTIME</div>
              </div>
              <button className="pro-btn">UPGRADE TO PRO</button>
              <div className="pro-reset">Free takes reset every 24 hours</div>
            </div>
          </div>
        </div>

        {/* DRAWER OVERLAY */}
        <div
          className={`drawer-overlay${drawerOpen ? " open" : ""}`}
          onClick={closeDrawer}
        />

        {/* DRAWER */}
        <div className={`drawer${drawerOpen ? " open" : ""}`}>
          <div className="drawer-handle" />
          {drawerData && (
            <div className="drawer-inner">
              <div className="drawer-sport" style={{ color: drawerData.sportColor }}>
                {drawerData.sport}
              </div>
              <div className="drawer-title">{drawerData.title}</div>
              <div className="drawer-meta">{drawerData.meta}</div>
              <div className="drawer-divider" />
              <div className="bullet-list">
                {drawerData.bullets.map((b, i) => (
                  <div key={i} className="bullet">
                    <div className="bullet-dot" style={{ background: b.color }} />
                    <div className="bullet-text">{b.text}</div>
                  </div>
                ))}
              </div>
              <div className="drawer-ask-bar" onClick={goAsk}>
                <div className="drawer-ask-text">Ask about {drawerData.title}...</div>
                <button className="ask-send" style={{ width: 30, height: 30 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#080A0C"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* NAV BAR */}
        <nav className="nav-bar">
          {["home", "ask", "pro"].map((p) => (
            <div
              key={p}
              className={`nav-item${page === p ? " active" : ""}`}
              onClick={() => setPage(p)}
            >
              <div className="nav-label">{p === "ask" ? "ASK" : p === "pro" ? "PRO" : "HOME"}</div>
            </div>
          ))}
        </nav>

      </div>
    </>
  );
}
