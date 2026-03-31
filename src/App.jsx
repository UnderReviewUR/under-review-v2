import { useState, useEffect, useRef, useCallback } from "react";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&display=swap');

  :root{
    --black:#080A0C;--surface:#0F1215;--surface-2:#0C1014;
    --border:#1E2328;--border-2:#2A3040;
    --cyan:#00F5E9;--magenta:#FF2D6B;--gold:#F5C842;--nfl:#FF6B35;
    --text:#E8EAF0;--muted:#AAB3C2;--soft:#D6DCE6;
    --green:#00E676;--red:#FF4444;
  }
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:var(--black);color:var(--text);font-family:'DM Sans',sans-serif;}
  .app{min-height:100vh;background:var(--black);color:var(--text);display:flex;flex-direction:column;}

  .hdr{padding:14px 16px;border-bottom:1px solid var(--border);background:rgba(8,10,12,.97);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:20;}
  .logo-under{display:block;font-family:'Bebas Neue',sans-serif;font-size:10px;letter-spacing:5px;color:rgba(255,255,255,.6);margin-bottom:2px;}
  .logo-review{display:block;font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:2px;line-height:1;background:linear-gradient(90deg,var(--cyan),var(--magenta));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
  .pill-tag{font-family:'DM Mono',monospace;font-size:10px;color:var(--magenta);border:1px solid rgba(255,45,107,.25);padding:4px 9px;border-radius:999px;background:rgba(255,45,107,.06);}
  .pill-live{font-family:'DM Mono',monospace;font-size:10px;color:var(--cyan);border:1px solid rgba(0,245,233,.25);padding:4px 9px;border-radius:999px;background:rgba(0,245,233,.06);}
  .pill-nfl{font-family:'DM Mono',monospace;font-size:10px;color:var(--nfl);border:1px solid rgba(255,107,53,.25);padding:4px 9px;border-radius:999px;background:rgba(255,107,53,.06);}

  .screen{flex:1;overflow-y:auto;padding:16px;padding-bottom:110px;}
  .hero{padding:12px 2px 16px;text-align:center;}
  .hero-title{font-family:'Bebas Neue',sans-serif;font-size:34px;letter-spacing:1px;line-height:1;margin-bottom:8px;}
  .hero-sub{color:var(--soft);font-size:14px;line-height:1.55;max-width:360px;margin:0 auto;}

  .ask-wrap{margin:12px 0 18px;}
  .ask-row{display:flex;gap:8px;align-items:flex-end;}
  .ask-col{flex:1;border:1px solid var(--border-2);background:var(--surface-2);border-radius:18px;overflow:hidden;transition:border-color .15s;}
  .ask-col:focus-within{border-color:rgba(0,245,233,.4);}
  .ask-img-preview{padding:8px 12px 0;display:flex;align-items:center;gap:8px;}
  .ask-img-thumb{width:48px;height:48px;border-radius:8px;object-fit:cover;border:1px solid var(--border-2);}
  .ask-img-remove{background:rgba(255,45,107,.15);border:1px solid rgba(255,45,107,.3);color:var(--magenta);border-radius:6px;padding:3px 8px;font-family:'DM Mono',monospace;font-size:10px;cursor:pointer;}
  .ask-bar{width:100%;border:none;background:transparent;padding:12px 14px;color:var(--text);font-size:14px;outline:none;font-family:'DM Sans',sans-serif;}
  .ask-bar::placeholder{color:var(--muted);}
  .ask-hint{font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);letter-spacing:1px;padding:0 14px 8px;opacity:.6;}
  .send-btn{width:44px;height:44px;border:none;border-radius:50%;background:var(--cyan);color:var(--black);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;}
  .send-btn:hover{background:var(--magenta);}
  .send-btn:disabled{background:var(--border);cursor:not-allowed;}
  .attach-btn{width:36px;height:36px;border:1px solid var(--border-2);border-radius:50%;background:var(--surface);color:var(--muted);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:all .15s;}
  .attach-btn:hover{border-color:var(--cyan);color:var(--cyan);}
  .attach-btn.has-img{border-color:var(--cyan);color:var(--cyan);background:rgba(0,245,233,.08);}

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
  .sport-chip.nfl-chip.active,.sport-chip.nfl-chip:hover{border-color:var(--nfl);color:var(--nfl);}

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

  .chat-thread{display:flex;flex-direction:column;gap:12px;margin-top:8px;}
  .bubble{border-radius:18px;padding:13px 14px;font-size:14px;line-height:1.65;}
  .bubble.user{margin-left:auto;max-width:88%;background:#1E2B38;border:1px solid #2A3A4A;color:var(--text);border-bottom-right-radius:6px;}
  .bubble.ai{margin-right:auto;max-width:96%;background:var(--surface);border:1px solid var(--border);color:#D0D7E2;border-bottom-left-radius:6px;}
  .bubble.loading{opacity:0.5;font-family:'DM Mono',monospace;font-size:12px;letter-spacing:2px;color:var(--muted);}
  .bubble-img{width:100%;max-width:200px;border-radius:10px;margin-bottom:6px;display:block;}

  .bottom-nav{position:fixed;left:0;right:0;bottom:0;background:rgba(8,10,12,.98);border-top:1px solid var(--border);display:grid;grid-template-columns:repeat(5,1fr);padding:10px 6px max(12px,env(safe-area-inset-bottom));z-index:30;}
  .nav-btn{background:none;border:none;color:var(--muted);font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;cursor:pointer;padding:6px 0;}
  .nav-btn.active{color:var(--cyan);}
  .nav-btn.miami-active{color:var(--gold);}
  .nav-btn.nfl-active{color:var(--nfl);}

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

  .miami-banner{background:linear-gradient(135deg,rgba(0,245,233,.08),rgba(245,200,66,.06));border:1px solid rgba(0,245,233,.2);border-radius:16px;padding:16px;margin-bottom:16px;}
  .miami-banner-title{font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:2px;color:var(--cyan);margin-bottom:2px;}
  .miami-banner-sub{font-family:'DM Mono',monospace;font-size:10px;color:var(--muted);letter-spacing:2px;margin-bottom:8px;}
  .miami-banner-note{font-size:13px;color:var(--soft);line-height:1.5;}
  .miami-section-title{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:3px;color:var(--gold);margin:20px 0 10px;display:flex;align-items:center;gap:8px;}
  .miami-section-title::after{content:'';flex:1;height:1px;background:rgba(245,200,66,.2);}

  .prop-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:8px;cursor:pointer;}
  .prop-card:hover{border-color:var(--border-2);}
  .prop-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;}
  .prop-player{font-size:14px;font-weight:600;color:var(--text);}
  .prop-type{font-family:'DM Mono',monospace;font-size:10px;color:var(--cyan);background:rgba(0,245,233,.1);padding:2px 8px;border-radius:4px;}
  .prop-stat{font-size:12px;color:var(--gold);font-family:'DM Mono',monospace;}
  .prop-note{font-size:12px;color:var(--soft);line-height:1.4;margin-top:4px;}

  .surface-pills{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;}
  .surface-pill{font-family:'DM Mono',monospace;font-size:9px;padding:3px 8px;border-radius:6px;border:1px solid var(--border);}
  .surface-hard{color:var(--cyan);border-color:rgba(0,245,233,.3);}
  .surface-clay{color:var(--gold);border-color:rgba(245,200,66,.3);}
  .surface-grass{color:var(--green);border-color:rgba(0,230,118,.3);}
  .form-badge{font-family:'DM Mono',monospace;font-size:9px;padding:2px 7px;border-radius:4px;background:rgba(0,245,233,.1);color:var(--cyan);border:1px solid rgba(0,245,233,.2);}

  .loading-state{text-align:center;padding:40px 20px;}
  .loading-text{font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);letter-spacing:2px;}

  .nfl-banner{background:linear-gradient(135deg,rgba(255,107,53,.08),rgba(255,45,107,.05));border:1px solid rgba(255,107,53,.25);border-radius:16px;padding:16px;margin-bottom:16px;}
  .nfl-banner-title{font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:2px;color:var(--nfl);margin-bottom:2px;}
  .nfl-banner-sub{font-family:'DM Mono',monospace;font-size:10px;color:var(--muted);letter-spacing:2px;margin-bottom:8px;}
  .nfl-banner-note{font-size:13px;color:var(--soft);line-height:1.5;}
  .nfl-section-title{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:3px;color:var(--nfl);margin:20px 0 10px;display:flex;align-items:center;gap:8px;}
  .nfl-section-title::after{content:'';flex:1;height:1px;background:rgba(255,107,53,.2);}

  .pos-tabs{display:flex;gap:6px;margin-bottom:14px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px;}
  .pos-tabs::-webkit-scrollbar{display:none;}
  .pos-tab{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;border:1px solid var(--border);background:var(--surface);color:var(--muted);border-radius:999px;padding:6px 14px;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all .15s;}
  .pos-tab.active{border-color:var(--nfl);color:var(--nfl);background:rgba(255,107,53,.08);}
  .pos-tab:hover{border-color:var(--nfl);color:var(--nfl);}

  .nfl-player-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:10px;cursor:pointer;transition:border-color .15s;}
  .nfl-player-card:hover{border-color:rgba(255,107,53,.4);}
  .nfl-player-top{padding:12px 14px;display:flex;align-items:center;justify-content:space-between;}
  .nfl-player-left{display:flex;align-items:center;gap:12px;flex:1;}
  .nfl-rank{font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--muted);line-height:1;min-width:32px;text-align:right;}
  .nfl-player-info{flex:1;}
  .nfl-player-name{font-size:15px;font-weight:700;color:var(--text);margin-bottom:1px;}
  .nfl-player-meta{font-family:'DM Mono',monospace;font-size:10px;color:var(--muted);}
  .nfl-player-right{text-align:right;}
  .nfl-yds-pg{font-family:'DM Mono',monospace;font-size:16px;color:var(--nfl);display:block;}
  .nfl-yds-label{font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);}
  .nfl-player-stats{padding:0 14px 12px;display:grid;grid-template-columns:repeat(4,1fr);gap:6px;}
  .nfl-stat{background:var(--surface-2);border-radius:8px;padding:7px;text-align:center;}
  .nfl-stat-label{font-family:'DM Mono',monospace;font-size:8px;color:var(--muted);margin-bottom:3px;}
  .nfl-stat-value{font-family:'DM Mono',monospace;font-size:12px;font-weight:600;}

  .nfl-prop-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:8px;cursor:pointer;transition:border-color .15s;}
  .nfl-prop-card:hover{border-color:rgba(255,107,53,.35);}
  .nfl-prop-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;}
  .nfl-prop-player{font-size:14px;font-weight:600;color:var(--text);}
  .nfl-prop-type{font-family:'DM Mono',monospace;font-size:10px;color:var(--nfl);background:rgba(255,107,53,.1);padding:2px 8px;border-radius:4px;}
  .nfl-prop-line{font-family:'DM Mono',monospace;font-size:11px;color:var(--gold);margin-bottom:3px;}
  .nfl-prop-lean{font-size:12px;color:var(--soft);line-height:1.4;}

  .nfl-detail-head{padding:14px;border-bottom:1px solid var(--border);background:var(--surface-2);}
  .nfl-detail-pos{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;color:var(--nfl);margin-bottom:6px;}
  .nfl-detail-name{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:1px;line-height:1;margin-bottom:6px;}
  .nfl-detail-sub{font-size:12px;color:var(--muted);}
  .nfl-detail-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:14px;}
  .nfl-detail-stat{background:var(--surface-2);border:1px solid var(--border);border-radius:12px;padding:10px;text-align:center;}
  .nfl-detail-label{font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);margin-bottom:4px;}
  .nfl-detail-value{font-size:15px;font-weight:700;}
  .nfl-detail-section{padding:0 14px 14px;}
  .nfl-detail-section-label{font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;color:var(--nfl);margin-bottom:8px;}
  .nfl-prop-block{background:rgba(255,107,53,.05);border:1px solid rgba(255,107,53,.15);border-radius:10px;padding:12px;}
  .nfl-prop-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
  .nfl-prop-row:last-child{margin-bottom:0;}
  .nfl-prop-name{font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);}
  .nfl-prop-val{font-family:'DM Mono',monospace;font-size:11px;}
  .lean-over{color:var(--green);}
  .lean-fade{color:var(--red);}
  .lean-neutral{color:var(--gold);}
  .nfl-situation{background:var(--surface-2);border-radius:10px;padding:12px;font-size:13px;color:var(--soft);line-height:1.6;}
  .nfl-betting-angles{display:flex;flex-direction:column;gap:6px;}
  .nfl-angle-item{display:flex;align-items:flex-start;gap:8px;font-size:12px;color:var(--soft);line-height:1.5;}
  .nfl-angle-dot{width:5px;height:5px;border-radius:50%;background:var(--nfl);flex-shrink:0;margin-top:5px;}
  .nfl-ask-shell{background:var(--surface);border:1px solid rgba(255,107,53,.2);border-radius:14px;padding:14px;margin-bottom:16px;}
  .nfl-ask-label{font-family:'DM Mono',monospace;font-size:10px;color:var(--nfl);letter-spacing:2px;margin-bottom:8px;}
`;

const ATP_PLAYERS = ["Alcaraz","Sinner","Djokovic","Zverev","Medvedev","De Minaur","Auger-Aliassime","Shelton","Fritz","Musetti","Tien","Draper","Fils","Bublik","Mensik","Ruud","Korda","Fonseca","Paul","Fokina","Rublev","Lehecka","Cerundolo","Norrie","Khachanov"];
const WTA_PLAYERS = ["Sabalenka","Rybakina","Swiatek","Pegula","Gauff","Mboko","Anisimova","Svitolina","Muchova","Bencic","Andreeva","Paolini","Keys","Osaka","Noskova","Kostyuk","Vondrousova","Kalinskaya","Mertens","Cirstea","Jovic","Alexandrova","Zheng","Kartal"];

const NFL_PLAYERS = {
  "James Cook":         { pos:"RB", team:"BUF", tier:"ELITE",  ydsPg:112.3, rec2025:{g:16,yds:1797,td:14,recPg:2.7,ydsPg:112.3,ypr:7.6},  props:{recYds:{floor:80,ceil:150,lean:"OVER"},                          td:{pg:0.88,lean:"OVER — 14 TDs, elite scorer"}},              situation:"Bills RB1 with Josh Allen. Allen's rushing is the only ceiling check but Cook is the every-down back.", bettingAngles:["Rush yards OVER every week","TD scorer OVER is the primary play","Volume is guaranteed — 16g starter"] },
  "Jonathan Taylor":    { pos:"RB", team:"IND", tier:"ELITE",  ydsPg:105.1, rec2025:{g:17,yds:1786,td:14,recPg:3.2,ydsPg:105.1,ypr:4.6},  props:{recYds:{floor:75,ceil:145,lean:"OVER — 105 yds/g base"},         td:{pg:0.82,lean:"OVER 0.5 — elite red zone back"}},            situation:"Colts RB1. Taylor owns the ground game. Richardson health is the only risk.", bettingAngles:["Rush yards OVER weekly","TD scorer OVER — 82% rate is elite","Monitor Richardson health"] },
  "Derrick Henry":      { pos:"RB", team:"BAL", tier:"ELITE",  ydsPg:103.3, rec2025:{g:16,yds:1653,td:15,recPg:1.1,ydsPg:103.3,ypr:5.1},  props:{recYds:{floor:75,ceil:145,lean:"OVER"},                          td:{pg:0.94,lean:"OVER — 15 TDs, most on team"}},               situation:"Ravens RB1 and primary red zone weapon. Lamar Jackson's legs open massive running lanes.", bettingAngles:["Rush yards OVER is the clearest play","TD scorer every week","Fade receiving yards — he does not catch passes"] },
  "Bijan Robinson":     { pos:"RB", team:"ATL", tier:"ELITE",  ydsPg:100.8, rec2025:{g:17,yds:1713,td:11,recPg:3.8,ydsPg:100.8,ypr:5.3},  props:{recYds:{floor:70,ceil:140,lean:"OVER"},                          td:{pg:0.65,lean:"OVER in favorable matchups"}},                situation:"Falcons RB1 with Penix. Every-down back with elite receiving role.", bettingAngles:["Rush yards OVER — elite volume","Receiving yards OVER on pass-heavy weeks","TD scorer reliable but not elite rate"] },
  "De'Von Achane":      { pos:"RB", team:"MIA", tier:"ELITE",  ydsPg:93.7,  rec2025:{g:14,yds:1312,td:12,recPg:5.4,ydsPg:93.7,ypr:6.3},   props:{recYds:{floor:65,ceil:135,lean:"OVER"},                          td:{pg:0.86,lean:"OVER — 12 TDs in 14 games"}},                 situation:"Dolphins dual-threat RB. Receives 5+ per game. Missed 3 games — health is the only risk.", bettingAngles:["Rush yards OVER when healthy","Receiving yards OVER — 5+ rec/g","Hard fade when injury report shows anything"] },
  "Puka Nacua":         { pos:"WR", team:"LAR", tier:"ELITE",  ydsPg:107.2, rec2025:{g:16,tgt:166,rec:129,yds:1715,td:0,recPg:8.1,ydsPg:107.2,ypr:13.3}, props:{recYds:{floor:75,ceil:140,lean:"OVER — 107.2 base leads WRs"}, rec:{floor:6,ceil:11,lean:"OVER — 8.1 rec/g"}, td:{pg:0,lean:"FADE TD scorer — zero TDs in 16g"}}, situation:"Rams WR1 with Stafford. Most receptions in NFL 2025. TD regression coming but timing unknown.", bettingAngles:["Receiving yards OVER every week","Catches OVER is elite volume play","FADE TD scorer until proven otherwise"] },
  "Ja'Marr Chase":      { pos:"WR", team:"CIN", tier:"ELITE",  ydsPg:88.3,  rec2025:{g:16,tgt:185,rec:125,yds:1412,td:10,recPg:7.8,ydsPg:88.3,ypr:11.3}, props:{recYds:{floor:65,ceil:125,lean:"OVER when Burrow healthy"}, td:{pg:0.63,lean:"OVER 0.5 in favorable matchups"}}, situation:"Bengals WR1. Most talented WR in football. Burrow health is the only variable.", bettingAngles:["Receiving yards OVER when Burrow active","TD scorer OVER in red zone games","Hard fade when Burrow out"] },
  "Jaxon Smith-Njigba": { pos:"WR", team:"SEA", tier:"ELITE",  ydsPg:105.5, rec2025:{g:17,tgt:163,rec:119,yds:1793,td:6,recPg:7.0,ydsPg:105.5,ypr:15.1}, props:{recYds:{floor:75,ceil:145,lean:"OVER — led NFL in receiving yards"}, td:{pg:0.35,lean:"Moderate"}}, situation:"Seahawks WR1. Led the NFL in receiving yards in 2025.", bettingAngles:["Receiving yards OVER is the primary lean","Volume locked in regardless of QB","Market may underrate him"] },
  "George Pickens":     { pos:"WR", team:"DAL", tier:"STRONG", ydsPg:84.1,  rec2025:{g:17,tgt:137,rec:93,yds:1429,td:8,recPg:5.5,ydsPg:84.1,ypr:15.4},   props:{recYds:{floor:65,ceil:125,lean:"OVER"}, td:{pg:0.47,lean:"OVER 0.5 in red zone games"}}, situation:"Cowboys WR with Prescott. Targets him downfield consistently.", bettingAngles:["Receiving yards OVER","TD scorer when Cowboys in red zone","Deep threat — big play every game"] },
  "CeeDee Lamb":        { pos:"WR", team:"DAL", tier:"STRONG", ydsPg:76.9,  rec2025:{g:14,tgt:117,rec:75,yds:1077,td:6,recPg:5.4,ydsPg:76.9,ypr:14.4},   props:{recYds:{floor:60,ceil:115,lean:"OVER when healthy"}, td:{pg:0.43,lean:"OVER in favorable matchups"}}, situation:"Cowboys WR1 when healthy. Missed 3 games in 2025.", bettingAngles:["OVER when active — elite talent","Hard fade when any injury report","Monitor weekly"] },
  "Trey McBride":       { pos:"TE", team:"ARI", tier:"ELITE",  ydsPg:72.9,  rec2025:{g:17,tgt:169,rec:126,yds:1239,td:5,recPg:7.4,ydsPg:72.9,ypr:9.8},   props:{rec:{floor:5,ceil:10,lean:"OVER — 7.4 rec/g leads all TEs"}, recYds:{floor:55,ceil:100,lean:"OVER"}, td:{pg:0.29,lean:"Moderate — 5 TDs only"}}, situation:"Best TE situation in football. Murray-McBride is the most reliable QB-TE connection in the NFL.", bettingAngles:["Catches OVER every week — 7.4/g is the floor","Receiving yards OVER is reliable","FADE TD scorer"] },
  "Brock Bowers":       { pos:"TE", team:"LVR", tier:"ELITE",  ydsPg:56.7,  rec2025:{g:12,tgt:86,rec:64,yds:680,td:3,recPg:5.3,ydsPg:56.7,ypr:10.6},     props:{rec:{floor:4,ceil:8,lean:"OVER when healthy"}, recYds:{lean:"OVER when healthy"}, td:{pg:0.25,lean:"Moderate"}}, situation:"Raiders TE1. Historic rookie 2024. Health is the major variable — missed 5 games in 2025.", bettingAngles:["Health monitor every week","OVER immediately when active","Fade anything when injury report shows anything"] },
  "Travis Kelce":       { pos:"TE", team:"KAN", tier:"ELITE",  ydsPg:50.1,  rec2025:{g:17,tgt:108,rec:76,yds:851,td:4,recPg:4.5,ydsPg:50.1,ypr:11.2},    props:{rec:{floor:3,ceil:7,lean:"OVER — Mahomes always finds him"}, td:{pg:0.24,lean:"Moderate — age 37 concern"}}, situation:"Chiefs TE1 but age 37 in 2026. Declining production is real. Mahomes connection keeps him relevant.", bettingAngles:["Catches OVER when Mahomes healthy","FADE receiving yards — 50 is the real base","Monitor usage as season progresses"] },
  "Tyler Warren":       { pos:"TE", team:"IND", tier:"ELITE",  ydsPg:48.1,  rec2025:{g:17,tgt:112,rec:76,yds:817,td:5,recPg:4.5,ydsPg:48.1,ypr:10.7},    props:{rec:{floor:3,ceil:7,lean:"OVER — 4.5/g is elite TE volume"}, td:{pg:0.29,lean:"OVER 0.5 in favorable matchups"}}, situation:"Colts TE1. Elite rookie season. Richardson health is the key variable.", bettingAngles:["Catches OVER every week","Receiving yards OVER as Richardson improves","Year 2 with Richardson should be elite"] },
};

const NFL_POSITIONS = ["ALL","RB","WR","TE"];

const NFL_PROP_GUIDE = [
  { player:"James Cook",    pos:"RB", team:"BUF", propType:"RUSH YDS",  line:"115.5", floor:80,  ceil:150, lean:"OVER — 112.3 avg, elite workload",            leanClass:"lean-over" },
  { player:"Puka Nacua",    pos:"WR", team:"LAR", propType:"REC YDS",   line:"85.5",  floor:75,  ceil:140, lean:"OVER — 107.2 yds/g leads NFL",                 leanClass:"lean-over" },
  { player:"Trey McBride",  pos:"TE", team:"ARI", propType:"CATCHES",   line:"6.5",   floor:5,   ceil:10,  lean:"OVER — 7.4/g is historic TE production",        leanClass:"lean-over" },
  { player:"Ja'Marr Chase", pos:"WR", team:"CIN", propType:"REC YDS",   line:"75.5",  floor:65,  ceil:125, lean:"OVER when Burrow healthy",                      leanClass:"lean-over" },
  { player:"Derrick Henry", pos:"RB", team:"BAL", propType:"RUSH TDs",  line:"0.5",   floor:0,   ceil:2,   lean:"OVER — 0.94 TDs/g is elite",                   leanClass:"lean-over" },
  { player:"Travis Kelce",  pos:"TE", team:"KAN", propType:"REC YDS",   line:"52.5",  floor:35,  ceil:80,  lean:"FADE — real floor is ~50, market overprices",   leanClass:"lean-fade" },
];

const featuredQuestions = [
  { id:"q1", color:"#00F5E9", text:"Best ace props at Miami Open tonight?", prompt:"What are the best ace props at Miami Open tonight based on the player data?" },
  { id:"q2", color:"#FF2D6B", text:"Who wins Alcaraz vs Sinner on hard court?", prompt:"Who wins Alcaraz vs Sinner on hard court and what are the betting angles?" },
  { id:"q3", color:"#FF6B35", text:"Will Puka Nacua go over 1,500 receiving yards in 2026?", prompt:"Will Puka Nacua go over 1,500 receiving yards in 2026? Give me the lean and the reasoning." },
  { id:"q4", color:"#F5C842", text:"Which RB scores the most TDs in 2026?", prompt:"Based on the NFL player database, which running back is most likely to lead the NFL in touchdowns in 2026?" },
  { id:"q5", color:"#FF2D6B", text:"Which 2026 NFL Draft rookie has the biggest betting impact?", prompt:"Among rookies entering the NFL in the 2026 NFL Draft (April 2026 draft), which player will have the biggest immediate impact on team win totals, player props, and betting markets in the 2026 season? Consider QB situations, team needs, and how quickly each position typically contributes." },
];

const fallbackMatchups = [
  {
    id:"m3", league:"NFL FUTURE", leagueColor:"#FF6B35",
    title:"Puka Nacua — 2026 Season Total",
    time:"2026 NFL Season · Opens Soon",
    network:"Underdog / DK",
    blurb:"Led the NFL in receptions in 2025 with 129 catches for 1,715 yards. Zero touchdowns. The question is whether 2026 brings TD regression.",
    whatMatters:"107.2 receiving yards per game. Zero TDs in 2025 is the red flag but also the regression opportunity. Catches and yards props are the play — not TDs.",
    quickHitters:["Nacua over 1,500 yards?","Is TD regression coming?","Best Nacua prop?"],
    stats:[{label:"YDS/G 2025",value:"107.2"},{label:"REC 2025",value:"129"},{label:"TDs 2025",value:"0 (!)"}],
    confirmed: true,
  },
  {
    id:"m4", league:"NFL FUTURE", leagueColor:"#FF6B35",
    title:"Derrick Henry — TD Season Total",
    time:"2026 NFL Season · Opens Soon",
    network:"Underdog / DK",
    blurb:"15 TDs in 2025 at 0.94 per game. Most reliable TD-scorer profile in football. Baltimore's scheme and Lamar's rushing open lanes nobody else gets.",
    whatMatters:"Henry's TD rate (0.94/g) is elite — the question is whether he stays healthy 16+ games. Primary red zone weapon in the best run-blocking offense in football.",
    quickHitters:["Henry over 12 TDs in 2026?","Reliable scorer prop weekly?","How much does Lamar affect carries?"],
    stats:[{label:"TDs/G 2025",value:"0.94"},{label:"YDS/G",value:"103.3"},{label:"LEAN",value:"TD OVER"}],
    confirmed: true,
  },
];

function formatServeStats(s) {
  if (!s) return "—";
  const p = [];
  if (s.holdPct !== undefined) p.push(`Hold ${s.holdPct}%`);
  if (s.acePct  !== undefined) p.push(`Ace ${s.acePct}%`);
  if (s.dfPct   !== undefined) p.push(`DF ${s.dfPct}%`);
  return p.length ? p.join(", ") : "—";
}
function formatReturnStats(s) {
  if (!s) return "—";
  const p = [];
  if (s.rpwPct   !== undefined) p.push(`RPW ${s.rpwPct}%`);
  if (s.breakPct !== undefined) p.push(`Break ${s.breakPct}%`);
  return p.length ? p.join(", ") : "—";
}
function formatOverallStats(s) {
  if (!s) return "—";
  const p = [];
  if (s.dominanceRatio    !== undefined) p.push(`DR ${s.dominanceRatio}`);
  if (s.totalPointsWonPct !== undefined) p.push(`TPW ${s.totalPointsWonPct}%`);
  if (s.tiebreakPct       !== undefined) p.push(`Tiebreak ${s.tiebreakPct}%`);
  return p.length ? p.join(", ") : "—";
}
function getHoldValue(p) { return p?.serveStats?.holdPct !== undefined ? `${p.serveStats.holdPct}%` : "—"; }
function getDrValue(p)   { return p?.overallStats?.dominanceRatio !== undefined ? `${p.overallStats.dominanceRatio}` : "—"; }
function getTbValue(p)   { return p?.overallStats?.tiebreakPct !== undefined ? `${p.overallStats.tiebreakPct}%` : "—"; }

function buildNflContext() {
  return Object.entries(NFL_PLAYERS).map(([name, p]) => {
    const tdPg   = p.props.td?.pg   !== undefined ? `${p.props.td.pg} TDs/g` : "";
    const total  = p.rec2025.td     !== undefined ? `${p.rec2025.td} total TDs` : "";
    const games  = p.rec2025.g      !== undefined ? `${p.rec2025.g}g` : "";
    const tdLean = p.props.td?.lean || "—";
    const yLean  = p.props.recYds?.lean || p.props.rec?.lean || "—";
    const recPg  = p.rec2025.recPg  !== undefined ? `, ${p.rec2025.recPg} rec/g` : "";
    const tgt    = p.rec2025.tgt    !== undefined ? `, ${p.rec2025.tgt} tgt` : "";
    const ypr    = p.rec2025.ypr    !== undefined ? `, ${p.rec2025.ypr} ypr` : "";
    return [
      `${name} | ${p.pos} | ${p.team} | ${p.tier}`,
      `  Stats: ${p.ydsPg} yds/g, ${total} in ${games}${recPg}${tgt}${ypr}`,
      `  TD rate: ${tdPg || "n/a"} | TD lean: ${tdLean}`,
      `  Volume lean: ${yLean}`,
      `  Situation: ${p.situation}`,
      `  Angles: ${p.bettingAngles.join(" | ")}`,
    ].join("\n");
  }).join("\n\n");
}

function renderMessage(text) {
  if (!text) return null;
  const clean = String(text)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
  const paragraphs = clean.split(/\n{2,}/);
  return paragraphs.map((para, i) => {
    const lines = para.split("\n").map(s => s.trim()).filter(Boolean);
    const allBullets = lines.length > 1 && lines.every(l => l.startsWith("•") || (l.includes(" — ") && !l.endsWith(".")));
    if (allBullets) {
      return (
        <div key={i} style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:10 }}>
          {lines.map((line, j) => {
            const norm  = line.startsWith("•") ? line.slice(1).trim() : line;
            const parts = norm.split("—").map(s => s.trim());
            const head  = parts[0] || "";
            const tail  = parts.slice(1).join(" — ");
            return (
              <div key={j} style={{ background:"rgba(0,245,233,.05)", border:"1px solid rgba(0,245,233,.15)", borderRadius:10, padding:"10px 12px" }}>
                <div style={{ fontWeight:600, color:"var(--text)", fontSize:13, marginBottom: tail ? 4 : 0 }}>{head}</div>
                {tail && <div style={{ fontSize:12, color:"var(--soft)", lineHeight:1.55 }}>{tail}</div>}
              </div>
            );
          })}
        </div>
      );
    }
    return <div key={i} style={{ lineHeight:1.7, marginBottom:10 }}>{para}</div>;
  });
}

function AskBar({
  value,
  onChange,
  onSubmit,
  placeholder,
  btnColor,
  pastedImage,
  clearImage,
  isAsking,
  fileInputRef,
  processImageFile,
}) {
  return (
    <div className="ask-wrap">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display:"none" }}
        onChange={(e) => {
          if (e.target.files[0]) processImageFile(e.target.files[0]);
        }}
      />
      <div className="ask-row">
        <div className="ask-col">
          {pastedImage && (
            <div className="ask-img-preview">
              <img src={pastedImage.previewUrl} alt="Attached" className="ask-img-thumb" />
              <button className="ask-img-remove" onClick={clearImage} type="button">
                ✕ Remove
              </button>
            </div>
          )}

          <input
            className="ask-bar"
            value={value}
            onChange={onChange}
            placeholder={pastedImage ? "Ask about this image..." : placeholder}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmit();
            }}
            disabled={isAsking}
            autoComplete="off"
          />

          {!pastedImage && (
            <div className="ask-hint">PASTE IMAGE OR TAP 📎 TO ATTACH</div>
          )}
        </div>

        <button
          className={`attach-btn${pastedImage ? " has-img" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
        </button>

        <button
          className="send-btn"
          onClick={onSubmit}
          disabled={isAsking}
          type="button"
          style={btnColor ? { background: btnColor } : {}}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

function ChatThread({ msgs }) {
  if (!msgs || msgs.length === 0) return null;

  return (
    <div className="chat-thread" style={{ marginBottom:20 }}>
      {msgs.map((m, i) => (
        <div key={i} className={`bubble ${m.role}${m.loading ? " loading" : ""}`}>
          {m.image && <img src={m.image} alt="" className="bubble-img" />}
          {m.loading ? m.text : renderMessage(m.text)}
        </div>
      ))}
    </div>
  );
}

function normalizeTennisMatch(match, fallbackLeague = "ATP") {
  if (!match) return null;

  const home = match.home_team || "Player 1";
  const away = match.away_team || "Player 2";
  const tournament = match.tournament || "Miami";
  const round = match.round ? ` · ${match.round}` : "";
  const statusRaw = String(match.status || "Scheduled");
  const live = String(match.live || "0") === "1";

  let timeLabel = statusRaw;
  if (!live && match.commence_time) {
    const d = new Date(match.commence_time);
    if (!Number.isNaN(d.getTime())) {
      timeLabel = d.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    }
  } else if (live) {
    timeLabel = `Live · ${statusRaw}`;
  }

  const leagueGuess = fallbackLeague;
  const leagueColor = leagueGuess === "WTA" ? "#FF2D6B" : "#00F5E9";

  const p1Odds = match.bookmakers?.[0]?.markets?.[0]?.outcomes?.[0]?.price ?? "N/A";
  const p2Odds = match.bookmakers?.[0]?.markets?.[0]?.outcomes?.[1]?.price ?? "N/A";

  return {
    id: match.id || `${leagueGuess}-${home}-${away}-${match.commence_time || ""}`,
    league: leagueGuess,
    leagueColor,
    title: `${home} vs ${away}`,
    time: `${timeLabel} · ${tournament}${round}`,
    network: match.score && match.score !== "-" ? `Score: ${match.score}` : "Confirmed Match",
    blurb: live
      ? `Live Miami match. Current status: ${statusRaw}.`
      : `Upcoming confirmed Miami match on the ${leagueGuess} side.`,
    whatMatters: `${home} vs ${away} at the Miami Open. Moneyline snapshot: ${home} ${p1Odds} / ${away} ${p2Odds}. Use UR TAKE for side, games, ace props, and matchup-specific angles.`,
    quickHitters: [
      `Who wins ${home} vs ${away}?`,
      `Best props for ${home} vs ${away}?`,
      `Total games lean for ${home} vs ${away}?`,
    ],
    stats: [
      { label: "TOUR", value: leagueGuess },
      { label: "STATUS", value: live ? "LIVE" : "UPCOMING" },
      { label: "ODDS", value: `${p1Odds} / ${p2Odds}` },
    ],
    confirmed: true,
    raw: match,
  };
}

export default function App() {
  const [tab, setTab]                         = useState("home");
  const [screen, setScreen]                   = useState("home");
  const [selectedMatchup, setSelectedMatchup] = useState(null);
  const [selectedPlayer, setSelectedPlayer]   = useState(null);
  const [selectedNflPlayer, setSelectedNflPlayer] = useState(null);
  const [nflPosFilter, setNflPosFilter]       = useState("ALL");

  const [homeInput,    setHomeInput]    = useState("");
  const [askInput,     setAskInput]     = useState("");
  const [miamiInput,   setMiamiInput]   = useState("");
  const [nflInput,     setNflInput]     = useState("");
  const [matchupInput, setMatchupInput] = useState("");

  const [askMsgs,     setAskMsgs]     = useState([]);
  const [miamiMsgs,   setMiamiMsgs]   = useState([]);
  const [nflMsgs,     setNflMsgs]     = useState([]);
  const [matchupMsgs, setMatchupMsgs] = useState([]);

  const [isAsking, setIsAsking] = useState(false);
  const [players, setPlayers] = useState(null);
  const [context, setContext] = useState(null);
  const [liveMatches, setLiveMatches] = useState([]);
  const [tennisLoading, setTennisLoading] = useState(false);

  const [pastedImage, setPastedImage] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setTennisLoading(true);

    Promise.all([
      fetch("/api/tennis-players").then(r => r.json()),
      fetch("/api/tennis-context").then(r => r.json()),
      fetch("/api/tennis?tour=atp").then(r => r.json()),
      fetch("/api/tennis?tour=wta").then(r => r.json()),
    ])
      .then(([p, c, atpRaw, wtaRaw]) => {
        setPlayers(p);
        setContext(c);

        const atpMatches = Array.isArray(atpRaw) ? atpRaw.map(m => normalizeTennisMatch(m, "ATP")).filter(Boolean) : [];
        const wtaMatches = Array.isArray(wtaRaw) ? wtaRaw.map(m => normalizeTennisMatch(m, "WTA")).filter(Boolean) : [];

        const merged = [...atpMatches, ...wtaMatches].sort((a, b) => {
          const aLive = a?.raw?.live === "1" ? 1 : 0;
          const bLive = b?.raw?.live === "1" ? 1 : 0;
          if (aLive !== bLive) return bLive - aLive;

          const aTime = new Date(a?.raw?.commence_time || 0).getTime();
          const bTime = new Date(b?.raw?.commence_time || 0).getTime();
          return aTime - bTime;
        });

        setLiveMatches(merged);
        setTennisLoading(false);
      })
      .catch(() => {
        setLiveMatches([]);
        setTennisLoading(false);
      });
  }, []);

  const processImageFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setPastedImage({ base64: dataUrl.split(",")[1], mediaType: file.type, previewUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  }, []);

  const clearImage = useCallback(() => {
    setPastedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) processImageFile(file);
          break;
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [processImageFile]);

  async function askUrTake({ text, matchup, setMsgs, sportHint }) {
    if (!text || isAsking) return;
    setIsAsking(true);

    const imgToSend = pastedImage;
    const userMsg   = { role:"user", text, image: imgToSend?.previewUrl || null };
    const thinkMsg  = { role:"ai",   text:"THINKING...", loading:true };

    setMsgs(prev => [...prev, userMsg, thinkMsg]);
    clearImage();

    try {
      const body = {
        question: text,
        players,
        context,
        liveMatches,
        tour: "atp",
        history: [],
        matchupContext: matchup || null,
        nflContext: buildNflContext(),
        sportHint: sportHint || null,
      };

      if (imgToSend) {
        body.image = { base64: imgToSend.base64, mediaType: imgToSend.mediaType };
      }

      const res = await fetch("/api/ur-take", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      const aiText = data.response || "Couldn't get a response — try again.";
      setMsgs(prev => [...prev.filter(m => !m.loading), { role:"ai", text:aiText }]);
    } catch {
      setMsgs(prev => [...prev.filter(m => !m.loading), { role:"ai", text:"Something went wrong — try again." }]);
    } finally {
      setIsAsking(false);
    }
  }

  function goHome()  { setTab("home");  setScreen("home");  setSelectedMatchup(null); setSelectedPlayer(null); setSelectedNflPlayer(null); }
  function goMiami() { setTab("miami"); setScreen("miami"); setSelectedMatchup(null); setSelectedPlayer(null); setSelectedNflPlayer(null); }
  function goNfl()   { setTab("nfl");   setScreen("nfl");   setSelectedMatchup(null); setSelectedPlayer(null); setSelectedNflPlayer(null); }
  function goAsk()   { setTab("ask");   setScreen("ask");   setSelectedMatchup(null); }
  function goPro()   { setTab("pro");   setScreen("pro");   setSelectedMatchup(null); }

  function openMatchup(m) {
    setSelectedMatchup(m);
    setMatchupMsgs([]);
    setMatchupInput("");
    setScreen("matchup");
    setTab("home");
  }
  function openPlayer(name)    { setSelectedPlayer(name);    setScreen("player"); }
  function openNflPlayer(name) { setSelectedNflPlayer(name); setScreen("nflplayer"); }

  function submitHome() {
    const t = homeInput.trim();
    if (!t || isAsking) return;
    setHomeInput("");
    setAskInput("");
    setTab("ask");
    setScreen("ask");
    askUrTake({ text: t, setMsgs: setAskMsgs });
  }

  function submitAsk() {
    const t = askInput.trim();
    if (!t || isAsking) return;
    setAskInput("");
    askUrTake({ text: t, setMsgs: setAskMsgs });
  }

  function submitMiami(forced) {
    const t = (forced ?? miamiInput).trim();
    if (!t || isAsking) return;
    if (!forced) setMiamiInput("");
    askUrTake({ text: t, setMsgs: setMiamiMsgs, sportHint:"tennis" });
  }

  function submitNfl(forced) {
    const t = (forced ?? nflInput).trim();
    if (!t || isAsking) return;
    if (!forced) setNflInput("");
    askUrTake({ text: t, setMsgs: setNflMsgs, sportHint:"nfl" });
  }

  function submitMatchup(forced) {
    const t = (forced ?? matchupInput).trim();
    if (!t || isAsking) return;
    if (!forced) setMatchupInput("");
    const hint = selectedMatchup?.league.includes("NFL") ? "nfl" : "tennis";
    askUrTake({ text: t, matchup: selectedMatchup, setMsgs: setMatchupMsgs, sportHint: hint });
  }

  function firePrompt(prompt) {
    setTab("ask");
    setScreen("ask");
    setAskInput("");
    askUrTake({ text: prompt, setMsgs: setAskMsgs });
  }

  function getPlayer(name, tour = "atp") {
    if (!players) return null;
    return (tour === "atp" ? players.atp : players.wta)?.[name] || null;
  }
  function getPlayerAny(name) {
    if (!players) return null;
    return players.atp?.[name] || players.wta?.[name] || null;
  }

  const pd    = (screen === "player"    && selectedPlayer)    ? getPlayerAny(selectedPlayer)   : null;
  const nflPd = (screen === "nflplayer" && selectedNflPlayer) ? NFL_PLAYERS[selectedNflPlayer] : null;

  const filteredNflPlayers = Object.entries(NFL_PLAYERS)
    .filter(([, p]) => nflPosFilter === "ALL" || p.pos === nflPosFilter)
    .sort((a, b) => b[1].ydsPg - a[1].ydsPg);

  const homeTennisCards = liveMatches.slice(0, 6);
  const homeCards = homeTennisCards.length > 0 ? [...homeTennisCards, ...fallbackMatchups] : fallbackMatchups;

  function TennisPlayerCard({ name, idx, tour }) {
    const p = getPlayer(name, tour);
    if (!p) return null;
    return (
      <div className="player-card" onClick={() => openPlayer(name)}>
        <div className="player-top">
          <div className="player-rank">#{idx + 1}</div>
          <div className="player-info">
            <div className="player-name">{name}</div>
            <div className="player-style">{Array.isArray(p.style) ? p.style.join(", ").replaceAll("_"," ") : p.style}</div>
            <div className="surface-pills">
              {p.surfaceNote?.hard  && <span className="surface-pill surface-hard">HARD</span>}
              {p.surfaceNote?.clay  && <span className="surface-pill surface-clay">CLAY</span>}
              {p.surfaceNote?.grass && <span className="surface-pill surface-grass">GRASS</span>}
            </div>
          </div>
          <div className="player-elo">
            <span className="player-elo-num">{p.elo}</span>
            <span className="player-elo-label">ELO</span>
            {p.record2026 && <div className="form-badge" style={{ marginTop:4 }}>2026</div>}
          </div>
        </div>
        <div className="player-stats">
          <div className="pstat"><div className="pstat-label">HOLD</div><div className="pstat-value">{getHoldValue(p)}</div></div>
          <div className="pstat"><div className="pstat-label">DR</div><div className="pstat-value" style={{ color:"var(--cyan)" }}>{getDrValue(p)}</div></div>
          <div className="pstat"><div className="pstat-label">TB%</div><div className="pstat-value">{getTbValue(p)}</div></div>
        </div>
      </div>
    );
  }

  function NflPlayerCard({ name, player }) {
    return (
      <div className="nfl-player-card" onClick={() => openNflPlayer(name)}>
        <div className="nfl-player-top">
          <div className="nfl-player-left">
            <div className="nfl-rank">{player.pos}</div>
            <div className="nfl-player-info">
              <div className="nfl-player-name">{name}</div>
              <div className="nfl-player-meta">{player.team} · {player.tier}</div>
            </div>
          </div>
          <div className="nfl-player-right">
            <span className="nfl-yds-pg">{player.ydsPg}</span>
            <span className="nfl-yds-label">YDS/G</span>
          </div>
        </div>
        <div className="nfl-player-stats">
          <div className="nfl-stat"><div className="nfl-stat-label">GAMES</div><div className="nfl-stat-value">{player.rec2025.g}</div></div>
          <div className="nfl-stat"><div className="nfl-stat-label">TDs</div><div className="nfl-stat-value" style={{ color:"var(--nfl)" }}>{player.rec2025.td}</div></div>
          {player.rec2025.tgt && <div className="nfl-stat"><div className="nfl-stat-label">TGT</div><div className="nfl-stat-value">{player.rec2025.tgt}</div></div>}
          <div className="nfl-stat"><div className="nfl-stat-label">YPR</div><div className="nfl-stat-value">{player.rec2025.ypr}</div></div>
        </div>
      </div>
    );
  }

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
            {screen === "miami"     && <span className="pill-live">MIAMI OPEN</span>}
            {screen === "nfl"       && <span className="pill-nfl">NFL 2026</span>}
            {screen === "nflplayer" && nflPd && <span className="pill-nfl">{selectedNflPlayer?.toUpperCase()}</span>}
            {screen === "player"    && <span className="pill-tag">{selectedPlayer?.toUpperCase()}</span>}
            {screen === "matchup"   && selectedMatchup && <span className="pill-tag">{selectedMatchup.league}</span>}
            {screen === "ask"       && <span className="pill-tag">UR TAKE</span>}
            {(screen === "home" || screen === "pro") && <span className="pill-tag">LIVE</span>}
          </div>
        </header>

        {screen === "home" && (
          <main className="screen">
            <section className="hero">
              <div className="hero-title">What do you want to know?</div>
              <div className="hero-sub">Tennis, NFL, stats, props, predictions — in plain English.</div>
            </section>

            <AskBar
              value={homeInput}
              onChange={e => setHomeInput(e.target.value)}
              onSubmit={submitHome}
              placeholder="Ask UR TAKE anything..."
              pastedImage={pastedImage}
              clearImage={clearImage}
              isAsking={isAsking}
              fileInputRef={fileInputRef}
              processImageFile={processImageFile}
            />

            <section className="section">
              <div className="section-label">TRENDING ASKS</div>
              <div className="q-list">
                {featuredQuestions.map((q) => (
                  <button key={q.id} className="q-card" onClick={() => firePrompt(q.prompt)}>
                    <div className="q-top">
                      <div className="q-accent" style={{ background: q.color }} />
                      <div className="q-text">{q.text}</div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="section">
              <div className="section-label">
                {homeTennisCards.length > 0 ? "CURRENT / UPCOMING TENNIS MATCHES" : "MATCHUPS TO TAP INTO"}
              </div>
              <div className="matchup-list">
                {homeCards.map((m) => (
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
                <button className="sport-chip nfl-chip active" onClick={goNfl}>NFL</button>
                <button className="sport-chip active" onClick={goMiami}>Tennis</button>
              </div>
            </section>
          </main>
        )}

        {screen === "miami" && (
          <main className="screen">
            <div className="miami-banner">
              <div className="miami-banner-title">Miami Open 2026</div>
              <div className="miami-banner-sub">Hard Court · Medium-Fast · Miami, FL</div>
              <div className="miami-banner-note">
                {context?.tournaments?.miami_open?.note || "Hard courts play slightly slower than US Open. Big servers still have an edge but rallies run longer."}
              </div>
              {context?.tournaments?.miami_open && (
                <div style={{ marginTop:10, display:"flex", gap:16 }}>
                  <div>
                    <span style={{ fontSize:10, color:"var(--muted)", fontFamily:"'DM Mono',monospace" }}>ATP FAV </span>
                    <span style={{ fontSize:12, color:"var(--cyan)", fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{context.tournaments.miami_open.atp_favorite}</span>
                  </div>
                  <div>
                    <span style={{ fontSize:10, color:"var(--muted)", fontFamily:"'DM Mono',monospace" }}>WTA FAV </span>
                    <span style={{ fontSize:12, color:"var(--magenta)", fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{context.tournaments.miami_open.wta_favorite}</span>
                  </div>
                </div>
              )}
            </div>

            <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, padding:14, marginBottom:16 }}>
              <div style={{ fontSize:10, color:"var(--cyan)", fontFamily:"'DM Mono',monospace", letterSpacing:2, marginBottom:8 }}>ASK ANYTHING — MIAMI OPEN</div>
              <AskBar
                value={miamiInput}
                onChange={e => setMiamiInput(e.target.value)}
                onSubmit={() => submitMiami()}
                placeholder="e.g. Best props tonight? Who wins Alcaraz vs Sinner?"
                pastedImage={pastedImage}
                clearImage={clearImage}
                isAsking={isAsking}
                fileInputRef={fileInputRef}
                processImageFile={processImageFile}
              />
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {["Best props tonight?","Who wins Sinner vs Zverev?","Sabalenka aces over 4.5?","Top value plays?"].map((q) => (
                  <button key={q} className="quick-btn" onClick={() => submitMiami(q)} style={{ fontSize:11 }}>{q}</button>
                ))}
              </div>
            </div>

            <ChatThread msgs={miamiMsgs} />

            {liveMatches.length > 0 && (
              <>
                <div className="miami-section-title">CONFIRMED MATCHES</div>
                <div className="matchup-list">
                  {liveMatches.map((m) => (
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
              </>
            )}

            {context?.ace_props && (
              <>
                <div className="miami-section-title">PROP GUIDE</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                  {Object.entries(context.ace_props).map(([name, data]) => (
                    <div key={name} className="prop-card" onClick={() => submitMiami(`Tell me about ${name} ace props at Miami`)}>
                      <div className="prop-top">
                        <div className="prop-player">{name}</div>
                        <div className="prop-type">ACES</div>
                      </div>
                      <div className="prop-stat">{data.avg_aces_hard} avg · {data.ace_rate}</div>
                      <div className="prop-note">{data.note}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {tennisLoading ? (
              <div className="loading-state"><div className="loading-text">LOADING PLAYER DATA...</div></div>
            ) : players && (
              <>
                <div className="miami-section-title">ATP TOP 25</div>
                {ATP_PLAYERS.map((name, idx) => <TennisPlayerCard key={name} name={name} idx={idx} tour="atp" />)}
                <div className="miami-section-title">WTA TOP 24</div>
                {WTA_PLAYERS.map((name, idx) => <TennisPlayerCard key={name} name={name} idx={idx} tour="wta" />)}
              </>
            )}
          </main>
        )}

        {screen === "nfl" && (
          <main className="screen">
            <div className="nfl-banner">
              <div className="nfl-banner-title">NFL 2026 Season</div>
              <div className="nfl-banner-sub">Props · Player Stats · Betting Angles</div>
              <div className="nfl-banner-note">Skill positions database: WR, RB, TE tiers with per-game stats, TD rates, prop floors and ceilings.</div>
            </div>

            <div className="nfl-ask-shell">
              <div className="nfl-ask-label">ASK ANYTHING — NFL</div>
              <AskBar
                value={nflInput}
                onChange={e => setNflInput(e.target.value)}
                onSubmit={() => submitNfl()}
                placeholder="e.g. Which RB leads TDs in 2026? Best WR prop this week?"
                btnColor="var(--nfl)"
                pastedImage={pastedImage}
                clearImage={clearImage}
                isAsking={isAsking}
                fileInputRef={fileInputRef}
                processImageFile={processImageFile}
              />
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {["Best WR props this week?","Top TE by volume?","Fade or take Kelce?","Best RB rushing prop?"].map((q) => (
                  <button key={q} className="quick-btn" onClick={() => submitNfl(q)} style={{ fontSize:11 }}>{q}</button>
                ))}
              </div>
            </div>

            <ChatThread msgs={nflMsgs} />

            <div className="nfl-section-title">TOP PROP LEANS</div>
            {NFL_PROP_GUIDE.map((prop) => (
              <div key={`${prop.player}-${prop.propType}`} className="nfl-prop-card" onClick={() => submitNfl(`Tell me about ${prop.player} ${prop.propType} prop — line is ${prop.line}`)}>
                <div className="nfl-prop-top">
                  <div className="nfl-prop-player">{prop.player}</div>
                  <div className="nfl-prop-type">{prop.propType}</div>
                </div>
                <div className="nfl-prop-line">Line: {prop.line} · Floor {prop.floor} / Ceil {prop.ceil}</div>
                <div className={`nfl-prop-lean ${prop.leanClass}`}>{prop.lean}</div>
              </div>
            ))}

            <div className="nfl-section-title">PLAYER DATABASE</div>
            <div className="pos-tabs">
              {NFL_POSITIONS.map((pos) => (
                <button key={pos} className={`pos-tab${nflPosFilter === pos ? " active" : ""}`} onClick={() => setNflPosFilter(pos)}>{pos}</button>
              ))}
            </div>
            {filteredNflPlayers.map(([name, player]) => (
              <NflPlayerCard key={name} name={name} player={player} />
            ))}
          </main>
        )}

        {screen === "nflplayer" && nflPd && (
          <main className="screen">
            <button className="detail-back" onClick={() => { setScreen("nfl"); setSelectedNflPlayer(null); }}>← BACK</button>
            <div className="detail-card">
              <div className="nfl-detail-head">
                <div className="nfl-detail-pos">{nflPd.pos} · {nflPd.team} · {nflPd.tier}</div>
                <div className="nfl-detail-name">{selectedNflPlayer}</div>
                <div className="nfl-detail-sub">{nflPd.ydsPg} yds/g · {nflPd.rec2025.g} games played</div>
              </div>
              <div className="nfl-detail-grid">
                <div className="nfl-detail-stat"><div className="nfl-detail-label">YDS/G</div><div className="nfl-detail-value" style={{ color:"var(--nfl)" }}>{nflPd.ydsPg}</div></div>
                <div className="nfl-detail-stat"><div className="nfl-detail-label">TDs</div><div className="nfl-detail-value" style={{ color:"var(--gold)" }}>{nflPd.rec2025.td}</div></div>
                <div className="nfl-detail-stat"><div className="nfl-detail-label">YPR</div><div className="nfl-detail-value">{nflPd.rec2025.ypr}</div></div>
                {nflPd.rec2025.tgt   && <div className="nfl-detail-stat"><div className="nfl-detail-label">TARGETS</div><div className="nfl-detail-value">{nflPd.rec2025.tgt}</div></div>}
                {nflPd.rec2025.recPg && <div className="nfl-detail-stat"><div className="nfl-detail-label">REC/G</div><div className="nfl-detail-value">{nflPd.rec2025.recPg}</div></div>}
                <div className="nfl-detail-stat"><div className="nfl-detail-label">GAMES</div><div className="nfl-detail-value">{nflPd.rec2025.g}</div></div>
              </div>
              <div className="nfl-detail-section">
                <div className="nfl-detail-section-label">PROP BREAKDOWN</div>
                <div className="nfl-prop-block">
                  {nflPd.props.recYds && (
                    <>
                      <div className="nfl-prop-row"><span className="nfl-prop-name">REC YDS</span><span className="nfl-prop-val" style={{ color:"var(--muted)" }}>Floor {nflPd.props.recYds.floor} / Ceil {nflPd.props.recYds.ceil}</span></div>
                      <div className="nfl-prop-row"><span className="nfl-prop-name">LEAN</span><span className={`nfl-prop-val ${nflPd.props.recYds.lean?.includes("OVER") ? "lean-over" : "lean-neutral"}`}>{nflPd.props.recYds.lean}</span></div>
                    </>
                  )}
                  {nflPd.props.rec && <div className="nfl-prop-row"><span className="nfl-prop-name">CATCHES</span><span className={`nfl-prop-val ${nflPd.props.rec.lean?.includes("OVER") ? "lean-over" : "lean-neutral"}`}>{nflPd.props.rec.lean}</span></div>}
                  {nflPd.props.td  && <div className="nfl-prop-row"><span className="nfl-prop-name">TD SCORER</span><span className={`nfl-prop-val ${nflPd.props.td.lean?.includes("OVER") ? "lean-over" : nflPd.props.td.lean?.includes("FADE") ? "lean-fade" : "lean-neutral"}`}>{nflPd.props.td.lean}</span></div>}
                </div>
              </div>
              <div className="nfl-detail-section">
                <div className="nfl-detail-section-label">SITUATION 2026</div>
                <div className="nfl-situation">{nflPd.situation}</div>
              </div>
              <div className="nfl-detail-section">
                <div className="nfl-detail-section-label">BETTING ANGLES</div>
                <div className="nfl-betting-angles">
                  {nflPd.bettingAngles.map((angle, i) => (
                    <div key={i} className="nfl-angle-item"><div className="nfl-angle-dot" /><div>{angle}</div></div>
                  ))}
                </div>
              </div>
            </div>
            <AskBar
              value={nflInput}
              onChange={e => setNflInput(e.target.value)}
              onSubmit={() => submitNfl()}
              placeholder={`Ask about ${selectedNflPlayer}...`}
              btnColor="var(--nfl)"
              pastedImage={pastedImage}
              clearImage={clearImage}
              isAsking={isAsking}
              fileInputRef={fileInputRef}
              processImageFile={processImageFile}
            />
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
                  <button key={q} className="quick-btn" onClick={() => submitMatchup(q)}>{q}</button>
                ))}
              </div>
            </div>
            <ChatThread msgs={matchupMsgs} />
            <AskBar
              value={matchupInput}
              onChange={e => setMatchupInput(e.target.value)}
              onSubmit={() => submitMatchup()}
              placeholder={`Ask about ${selectedMatchup.title}...`}
              pastedImage={pastedImage}
              clearImage={clearImage}
              isAsking={isAsking}
              fileInputRef={fileInputRef}
              processImageFile={processImageFile}
            />
          </main>
        )}

        {screen === "player" && pd && (
          <main className="screen">
            <button className="detail-back" onClick={() => setScreen("miami")}>← BACK</button>
            <div className="detail-card">
              <div className="detail-head">
                <div className="detail-league" style={{ color:"var(--cyan)" }}>MIAMI OPEN 2026</div>
                <div className="detail-title">{selectedPlayer}</div>
                <div className="detail-sub">{Array.isArray(pd.style) ? pd.style.join(", ").replaceAll("_"," ") : pd.style} · Elo {pd.elo}</div>
              </div>
              <div className="what-matters">
                <div className="wm-label">SURFACE NOTES</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginTop:8 }}>
                  <div className="mini-stat"><div className="mini-label">HARD</div><div className="mini-value" style={{ color:"var(--cyan)" }}>•</div><div style={{ fontSize:10, color:"var(--muted)", marginTop:2 }}>{pd.surfaceNote?.hard || "—"}</div></div>
                  <div className="mini-stat"><div className="mini-label">CLAY</div><div className="mini-value" style={{ color:"var(--gold)" }}>•</div><div style={{ fontSize:10, color:"var(--muted)", marginTop:2 }}>{pd.surfaceNote?.clay || "—"}</div></div>
                  <div className="mini-stat"><div className="mini-label">GRASS</div><div className="mini-value" style={{ color:"var(--green)" }}>•</div><div style={{ fontSize:10, color:"var(--muted)", marginTop:2 }}>{pd.surfaceNote?.grass || "—"}</div></div>
                </div>
              </div>
              <div style={{ padding:"0 14px 14px" }}>
                <div className="wm-label" style={{ marginBottom:8 }}>2026 FORM</div>
                <div style={{ background:"var(--surface-2)", borderRadius:10, padding:10, fontSize:13, color:"var(--soft)", lineHeight:1.5 }}>{pd.record2026 || "—"}</div>
              </div>
              <div className="what-matters" style={{ paddingTop:0 }}><div className="wm-label">SERVE</div><div style={{ fontSize:13, color:"var(--soft)", lineHeight:1.5 }}>{formatServeStats(pd.serveStats)}</div></div>
              <div className="what-matters" style={{ paddingTop:0 }}><div className="wm-label">RETURN</div><div style={{ fontSize:13, color:"var(--soft)", lineHeight:1.5 }}>{formatReturnStats(pd.returnStats)}</div></div>
              <div className="what-matters" style={{ paddingTop:0 }}><div className="wm-label">OVERALL</div><div style={{ fontSize:13, color:"var(--soft)", lineHeight:1.5 }}>{formatOverallStats(pd.overallStats)}</div></div>
              {pd.miamiNote && <div className="what-matters" style={{ paddingTop:0 }}><div className="wm-label" style={{ color:"var(--magenta)" }}>MIAMI NOTE</div><div style={{ fontSize:13, color:"var(--soft)", lineHeight:1.55 }}>{pd.miamiNote}</div></div>}
              {pd.fullNote  && <div className="what-matters" style={{ paddingTop:0 }}><div className="wm-label">UR TAKE</div><div style={{ fontSize:13, color:"var(--soft)", lineHeight:1.55 }}>{pd.fullNote}</div></div>}
            </div>
            <AskBar
              value={miamiInput}
              onChange={e => setMiamiInput(e.target.value)}
              onSubmit={() => submitMiami()}
              placeholder={`Ask about ${selectedPlayer}...`}
              pastedImage={pastedImage}
              clearImage={clearImage}
              isAsking={isAsking}
              fileInputRef={fileInputRef}
              processImageFile={processImageFile}
            />
          </main>
        )}

        {screen === "ask" && (
          <main className="screen">
            <section className="hero" style={{ paddingTop:4 }}>
              <div className="hero-title">UR TAKE</div>
              <div className="hero-sub">Ask in plain English. Paste a screenshot. Get weirdly specific.</div>
            </section>
            <AskBar
              value={askInput}
              onChange={e => setAskInput(e.target.value)}
              onSubmit={submitAsk}
              placeholder="What do you want to know?"
              pastedImage={pastedImage}
              clearImage={clearImage}
              isAsking={isAsking}
              fileInputRef={fileInputRef}
              processImageFile={processImageFile}
            />
            {askMsgs.length === 0 ? (
              <section className="section">
                <div className="section-label">TRY ONE</div>
                <div className="q-list">
                  {featuredQuestions.map((q) => (
                    <button key={q.id} className="q-card" onClick={() => firePrompt(q.prompt)}>
                      <div className="q-top">
                        <div className="q-accent" style={{ background: q.color }} />
                        <div className="q-text">{q.text}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ) : (
              <ChatThread msgs={askMsgs} />
            )}
          </main>
        )}

        {screen === "pro" && (
          <main className="screen">
            <div style={{ textAlign:"center", padding:"20px 4px 16px" }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, letterSpacing:1, lineHeight:1.1, marginBottom:10 }}>
                Stop Guessing.<br />
                <span style={{ background:"linear-gradient(90deg,var(--cyan),var(--magenta))", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
                  Start Beating the Line.
                </span>
              </div>
              <div style={{ fontSize:13, color:"var(--soft)", lineHeight:1.55, maxWidth:340, margin:"0 auto" }}>
                You're leaving edges on the table every single slate. UR TAKE Pro closes the gap.
              </div>
            </div>

            <div style={{ background:"var(--surface)", border:"1px solid rgba(0,245,233,.2)", borderRadius:20, padding:"20px 18px", marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"flex-end", gap:8, marginBottom:4 }}>
                <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:42, letterSpacing:1, lineHeight:1, color:"var(--text)" }}>$9.99</span>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:12, color:"var(--muted)", marginBottom:6 }}>/month</span>
              </div>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:"var(--cyan)", marginBottom:16, letterSpacing:1 }}>
                LESS THAN ONE BAD BET
              </div>
              <button style={{ width:"100%", border:"none", borderRadius:14, padding:"15px 0", cursor:"pointer", fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:3, color:"var(--black)", background:"linear-gradient(90deg,var(--cyan),var(--magenta))" }}>
                UNLOCK MY EDGE
              </button>
              <div style={{ display:"flex", justifyContent:"center", gap:20, marginTop:12 }}>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:"var(--muted)" }}>CANCEL ANYTIME</span>
                <span style={{ fontFamily:"'DM Mono',monospace", fontSize:10, color:"var(--muted)" }}>NO COMMITMENT</span>
              </div>
            </div>
          </main>
        )}

        <nav className="bottom-nav">
          <button className={`nav-btn${tab === "home"  && screen === "home"  ? " active"       : ""}`} onClick={goHome}>HOME</button>
          <button className={`nav-btn${tab === "miami"                        ? " miami-active" : ""}`} onClick={goMiami}>TENNIS</button>
          <button className={`nav-btn${tab === "nfl"                          ? " nfl-active"   : ""}`} onClick={goNfl}>NFL</button>
          <button className={`nav-btn${tab === "ask"                          ? " active"       : ""}`} onClick={goAsk}>ASK</button>
          <button className={`nav-btn${tab === "pro"                          ? " active"       : ""}`} onClick={goPro}>PRO</button>
        </nav>
      </div>
    </>
  );
}
