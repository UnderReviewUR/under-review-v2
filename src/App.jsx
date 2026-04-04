import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import AskBar from "./components/AskBar";
import { NBA_PLAYERS } from "./data/nba/players.js";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&display=swap');

  :root{
    --cyan:#0891B2;
    --cyan-bright:#00F5E9;
    --mag:#E11D48;
    --magenta:#FF2D6B;
    --gold:#D97706;
    --green:#00E676;
    --red:#FF4444;
    --nfl:#FF6B35;
    --f1:#E10600;
    --nba:#FF6B00;
    --bg:#080A0C;
    --surface:#0F1215;
    --surface-2:#0C1014;
    --border:#1E2328;
    --border-2:#2A3040;
    --text:#E8EAF0;
    --muted:#AAB3C2;
    --soft:#D6DCE6;
    --header-bg:rgba(8,10,12,.97);
    --nav-bg:rgba(8,10,12,.98);
    --card-shadow:none;
    --card-shadow-hover:0 10px 30px rgba(0,0,0,.18);
    --body-font:'DM Sans',sans-serif;
    --mono-font:'DM Mono',monospace;
    --display-font:'Bebas Neue',sans-serif;
    --bottom-nav-height:74px;
  }

  *{box-sizing:border-box;margin:0;padding:0;}
  html,body,#root{height:100%;}
  body{background:var(--bg);color:var(--text);font-family:var(--body-font);min-height:100vh;-webkit-font-smoothing:antialiased;}

  .app{min-height:100vh;background:var(--bg);color:var(--text);display:flex;flex-direction:column;}

  .hdr{padding:14px 16px;border-bottom:1px solid var(--border);background:var(--header-bg);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:30;backdrop-filter:blur(10px);gap:14px;}
  .wordmark{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;min-width:fit-content;}
  .logo-under{display:block;font-family:var(--mono-font);font-size:10px;letter-spacing:5px;color:rgba(255,255,255,.6);margin-bottom:2px;text-transform:uppercase;}
  .logo-review{display:block;font-family:var(--display-font);font-size:22px;letter-spacing:2px;line-height:1;background:linear-gradient(90deg,var(--cyan-bright),var(--magenta));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
  .header-right{display:flex;align-items:center;gap:10px;min-width:0;}
  .pill-tag,.pill-live,.pill-nfl,.pill-f1,.pill-nba{font-family:var(--mono-font);font-size:10px;padding:4px 9px;border-radius:999px;white-space:nowrap;}
  .pill-tag{color:var(--magenta);border:1px solid rgba(255,45,107,.25);background:rgba(255,45,107,.06);}
  .pill-live{color:var(--cyan-bright);border:1px solid rgba(0,245,233,.25);background:rgba(0,245,233,.06);}
  .pill-nfl{color:var(--nfl);border:1px solid rgba(255,107,53,.25);background:rgba(255,107,53,.06);}
  .pill-f1{color:var(--f1);border:1px solid rgba(225,6,0,.25);background:rgba(225,6,0,.06);}
  .pill-nba{color:var(--nba);border:1px solid rgba(255,107,0,.25);background:rgba(255,107,0,.06);}

  .screen{flex:1;overflow-y:auto;padding:16px;padding-bottom:110px;}
  .hero{padding:12px 2px 16px;text-align:center;}
  .hero-title{font-family:var(--display-font);font-size:34px;letter-spacing:1px;line-height:1;margin-bottom:10px;}
  .hero-sub{color:var(--soft);font-size:14px;line-height:1.6;max-width:560px;margin:0 auto;}

  .ask-wrap{margin:12px 0 18px;}
  .ask-row{display:flex;gap:8px;align-items:flex-end;}
  .ask-col{flex:1;border:1px solid var(--border-2);background:var(--surface-2);border-radius:18px;overflow:hidden;transition:border-color .15s ease;}
  .ask-col:focus-within{border-color:rgba(0,245,233,.4);}
  .ask-img-preview{padding:8px 12px 0;display:flex;align-items:center;gap:8px;}
  .ask-img-thumb{width:48px;height:48px;border-radius:8px;object-fit:cover;border:1px solid var(--border-2);}
  .ask-img-remove{background:rgba(255,45,107,.15);border:1px solid rgba(255,45,107,.3);color:var(--magenta);border-radius:6px;padding:3px 8px;font-family:var(--mono-font);font-size:10px;cursor:pointer;}
  .ask-bar{width:100%;border:none;background:transparent;padding:12px 14px;color:var(--text);font-size:14px;outline:none;font-family:var(--body-font);}
  .ask-bar::placeholder{color:var(--muted);}
  .ask-hint{font-family:var(--mono-font);font-size:9px;color:var(--muted);letter-spacing:1px;padding:0 14px 8px;opacity:.65;}
  .send-btn{width:44px;height:44px;border:none;border-radius:50%;background:var(--cyan-bright);color:#080A0C;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;}
  .send-btn:hover{background:var(--magenta);}
  .send-btn:disabled{background:var(--border);cursor:not-allowed;color:var(--muted);}
  .attach-btn{width:36px;height:36px;border:1px solid var(--border-2);border-radius:50%;background:var(--surface);color:var(--muted);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:all .15s ease;}
  .attach-btn:hover{border-color:var(--cyan-bright);color:var(--cyan-bright);}
  .attach-btn.has-img{border-color:var(--cyan-bright);color:var(--cyan-bright);background:rgba(0,245,233,.08);}

  .section{margin-top:20px;}
  .section-label{font-family:var(--mono-font);font-size:10px;letter-spacing:2px;color:var(--muted);margin-bottom:10px;text-transform:uppercase;}

  .q-list{display:flex;flex-direction:column;gap:8px;}
  .q-card{width:100%;text-align:left;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:12px;cursor:pointer;color:var(--text);transition:all .18s ease;}
  .q-card:hover{border-color:var(--cyan-bright);transform:translateY(-1px);}
  .q-top{display:flex;align-items:center;gap:10px;}
  .q-accent{width:4px;height:30px;border-radius:2px;flex-shrink:0;}
  .q-text{font-size:14px;line-height:1.45;color:var(--soft);}

  .tour-banner,.nfl-banner{border-radius:16px;padding:16px;margin-bottom:16px;border:1px solid var(--border);background:var(--surface);}
  .tour-banner{background:linear-gradient(135deg,rgba(0,245,233,.08),rgba(245,200,66,.06));}
  .nfl-banner{background:linear-gradient(135deg,rgba(255,107,53,.08),rgba(255,45,107,.05));}
  .banner-title{font-family:var(--display-font);font-size:26px;letter-spacing:1px;margin-bottom:4px;}
  .banner-sub{font-family:var(--mono-font);font-size:10px;color:var(--muted);letter-spacing:2px;margin-bottom:8px;text-transform:uppercase;}
  .banner-note{font-size:13px;color:var(--soft);line-height:1.5;}

  .matchup-list{display:flex;flex-direction:column;gap:10px;}
  .matchup-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;cursor:pointer;transition:all .18s ease;position:relative;}
  .matchup-card:hover{border-color:var(--cyan-bright);transform:translateY(-1px);}
  .matchup-top{padding:10px 12px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.01);}
  .matchup-league{font-family:var(--mono-font);font-size:10px;letter-spacing:2px;text-transform:uppercase;}
  .matchup-time{font-family:var(--mono-font);font-size:10px;color:var(--muted);}
  .matchup-body{padding:12px;}
  .matchup-title{font-size:16px;font-weight:600;margin-bottom:4px;color:var(--text);}
  .matchup-meta{font-size:12px;color:var(--muted);margin-bottom:8px;}
  .matchup-blurb{font-size:13px;color:var(--soft);line-height:1.55;}

  .sport-chips{display:flex;gap:8px;flex-wrap:wrap;}
  .sport-chip{border:1px solid var(--border);background:var(--surface);color:var(--soft);border-radius:999px;padding:8px 14px;font-family:var(--mono-font);font-size:11px;cursor:pointer;transition:all .15s;}
  .sport-chip.active,.sport-chip:hover{border-color:var(--cyan-bright);color:var(--cyan-bright);}
  .sport-chip.nfl-chip.active,.sport-chip.nfl-chip:hover{border-color:var(--nfl);color:var(--nfl);}
  .sport-chip.f1-chip.active,.sport-chip.f1-chip:hover{border-color:var(--f1);color:var(--f1);}
  .sport-chip.nba-chip.active,.sport-chip.nba-chip:hover{border-color:var(--nba);color:var(--nba);}

  .detail-back{background:none;border:none;color:var(--muted);font-family:var(--mono-font);font-size:11px;letter-spacing:1px;margin-bottom:12px;cursor:pointer;display:flex;align-items:center;gap:6px;}
  .detail-card{background:var(--surface);border:1px solid var(--border);border-radius:18px;overflow:hidden;margin-bottom:14px;}
  .detail-head{padding:12px 14px;border-bottom:1px solid var(--border);background:var(--surface-2);}
  .detail-league{font-family:var(--mono-font);font-size:10px;letter-spacing:2px;margin-bottom:6px;text-transform:uppercase;}
  .detail-title{font-family:var(--display-font);font-size:28px;letter-spacing:1px;line-height:1;margin-bottom:6px;}
  .detail-sub{font-size:12px;color:var(--muted);}
  .what-matters{padding:14px;}
  .wm-label{font-family:var(--mono-font);font-size:10px;letter-spacing:2px;color:var(--cyan-bright);margin-bottom:8px;text-transform:uppercase;}
  .wm-text{font-size:14px;line-height:1.7;color:var(--soft);}
  .quick-hitters{display:flex;gap:8px;flex-wrap:wrap;padding:0 14px 14px;}
  .quick-btn{border:1px solid var(--border-2);background:var(--surface-2);color:var(--soft);border-radius:999px;padding:8px 12px;font-size:12px;cursor:pointer;transition:all .15s ease;}
  .quick-btn:hover{border-color:var(--cyan-bright);color:var(--cyan-bright);}
  .mini-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:0 14px 14px;}
  .mini-stat{background:var(--surface-2);border:1px solid var(--border);border-radius:12px;padding:10px;text-align:center;}
  .mini-label{font-family:var(--mono-font);font-size:9px;color:var(--muted);margin-bottom:4px;}
  .mini-value{font-size:15px;font-weight:700;}

  .chat-thread{display:flex;flex-direction:column;gap:12px;margin-top:8px;}
  .bubble{border-radius:18px;padding:13px 14px;font-size:14px;line-height:1.65;}
  .bubble.user{margin-left:auto;max-width:88%;background:#1E2B38;border:1px solid #2A3A4A;color:#E8EAF0;border-bottom-right-radius:6px;}
  .bubble.ai{margin-right:auto;max-width:96%;background:var(--surface);border:1px solid var(--border);color:var(--soft);border-bottom-left-radius:6px;}
  .bubble.loading{opacity:.5;font-family:var(--mono-font);font-size:12px;letter-spacing:2px;color:var(--muted);}
  .bubble-img{width:100%;max-width:200px;border-radius:10px;margin-bottom:6px;display:block;}

  .player-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;cursor:pointer;margin-bottom:10px;transition:all .18s ease;}
  .player-card:hover{border-color:var(--border-2);}
  .player-top{padding:12px 14px;display:flex;align-items:center;justify-content:space-between;}
  .player-rank{font-family:var(--display-font);font-size:32px;color:var(--muted);line-height:1;margin-right:12px;min-width:36px;}
  .player-info{flex:1;}
  .player-name{font-size:16px;font-weight:600;color:var(--text);margin-bottom:2px;}
  .player-style{font-size:12px;color:var(--muted);}
  .player-elo{text-align:right;}
  .player-elo-num{font-family:var(--mono-font);font-size:16px;color:var(--cyan-bright);display:block;}
  .player-elo-label{font-family:var(--mono-font);font-size:9px;color:var(--muted);}
  .player-stats{padding:0 14px 12px;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;}
  .pstat{background:var(--surface-2);border-radius:8px;padding:8px;text-align:center;}
  .pstat-label{font-family:var(--mono-font);font-size:8px;color:var(--muted);margin-bottom:3px;}
  .pstat-value{font-family:var(--mono-font);font-size:12px;font-weight:500;}
  .surface-pills{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;}
  .surface-pill{font-family:var(--mono-font);font-size:9px;padding:3px 8px;border-radius:6px;border:1px solid var(--border);}
  .surface-hard{color:var(--cyan-bright);border-color:rgba(0,245,233,.3);}
  .surface-clay{color:var(--gold);border-color:rgba(245,200,66,.3);}
  .surface-grass{color:var(--green);border-color:rgba(0,230,118,.3);}
  .form-badge{font-family:var(--mono-font);font-size:9px;padding:2px 7px;border-radius:4px;background:rgba(0,245,233,.1);color:var(--cyan-bright);border:1px solid rgba(0,245,233,.2);}

  .loading-state{text-align:center;padding:40px 20px;}
  .loading-text{font-family:var(--mono-font);font-size:11px;color:var(--muted);letter-spacing:2px;}

  .section-divider{font-family:var(--mono-font);font-size:10px;letter-spacing:3px;margin:20px 0 10px;display:flex;align-items:center;gap:8px;color:var(--muted);text-transform:uppercase;}
  .section-divider::after{content:'';flex:1;height:1px;background:var(--border);}

  .pos-tabs{display:flex;gap:6px;margin-bottom:14px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px;}
  .pos-tabs::-webkit-scrollbar{display:none;}
  .pos-tab{font-family:var(--mono-font);font-size:10px;letter-spacing:1px;border:1px solid var(--border);background:var(--surface);color:var(--muted);border-radius:999px;padding:6px 14px;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all .15s;}
  .pos-tab.active{border-color:var(--nfl);color:var(--nfl);background:rgba(255,107,53,.08);}

  .nfl-player-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:10px;cursor:pointer;transition:all .15s ease;}
  .nfl-player-card:hover{border-color:rgba(255,107,53,.4);}
  .nfl-player-top{padding:12px 14px;display:flex;align-items:center;justify-content:space-between;}
  .nfl-player-left{display:flex;align-items:center;gap:12px;flex:1;}
  .nfl-rank{font-family:var(--display-font);font-size:28px;color:var(--muted);line-height:1;min-width:32px;text-align:right;}
  .nfl-player-info{flex:1;}
  .nfl-player-name{font-size:15px;font-weight:700;color:var(--text);margin-bottom:1px;}
  .nfl-player-meta{font-family:var(--mono-font);font-size:10px;color:var(--muted);}
  .nfl-player-right{text-align:right;}
  .nfl-yds-pg{font-family:var(--mono-font);font-size:16px;color:var(--nfl);display:block;}
  .nfl-yds-label{font-family:var(--mono-font);font-size:9px;color:var(--muted);}
  .nfl-player-stats{padding:0 14px 12px;display:grid;grid-template-columns:repeat(4,1fr);gap:6px;}
  .nfl-stat{background:var(--surface-2);border-radius:8px;padding:7px;text-align:center;}
  .nfl-stat-label{font-family:var(--mono-font);font-size:8px;color:var(--muted);margin-bottom:3px;}
  .nfl-stat-value{font-family:var(--mono-font);font-size:12px;font-weight:600;}

  .nfl-prop-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:8px;cursor:pointer;transition:all .15s ease;}
  .nfl-prop-card:hover{border-color:rgba(255,107,53,.35);}
  .nfl-prop-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;}
  .nfl-prop-player{font-size:14px;font-weight:600;color:var(--text);}
  .nfl-prop-type{font-family:var(--mono-font);font-size:10px;color:var(--nfl);background:rgba(255,107,53,.1);padding:2px 8px;border-radius:4px;}
  .nfl-prop-line{font-family:var(--mono-font);font-size:11px;color:var(--gold);margin-bottom:3px;}
  .nfl-prop-lean{font-size:12px;color:var(--soft);line-height:1.4;}

  .nfl-detail-head{padding:14px;border-bottom:1px solid var(--border);background:var(--surface-2);}
  .nfl-detail-pos{font-family:var(--mono-font);font-size:10px;letter-spacing:2px;color:var(--nfl);margin-bottom:6px;text-transform:uppercase;}
  .nfl-detail-name{font-family:var(--display-font);font-size:28px;letter-spacing:1px;line-height:1;margin-bottom:6px;}
  .nfl-detail-sub{font-size:12px;color:var(--muted);}
  .nfl-detail-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:14px;}
  .nfl-detail-stat{background:var(--surface-2);border:1px solid var(--border);border-radius:12px;padding:10px;text-align:center;}
  .nfl-detail-label{font-family:var(--mono-font);font-size:9px;color:var(--muted);margin-bottom:4px;}
  .nfl-detail-value{font-size:15px;font-weight:700;}
  .nfl-detail-section{padding:0 14px 14px;}
  .nfl-detail-section-label{font-family:var(--mono-font);font-size:10px;letter-spacing:2px;color:var(--nfl);margin-bottom:8px;text-transform:uppercase;}
  .nfl-prop-block{background:rgba(255,107,53,.05);border:1px solid rgba(255,107,53,.15);border-radius:10px;padding:12px;}
  .nfl-prop-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
  .nfl-prop-row:last-child{margin-bottom:0;}
  .nfl-prop-name{font-family:var(--mono-font);font-size:11px;color:var(--muted);}
  .nfl-prop-val{font-family:var(--mono-font);font-size:11px;}
  .lean-over{color:var(--green);}
  .lean-fade{color:var(--red);}
  .lean-neutral{color:var(--gold);}
  .nfl-situation{background:var(--surface-2);border-radius:10px;padding:12px;font-size:13px;color:var(--soft);line-height:1.6;}
  .nfl-betting-angles{display:flex;flex-direction:column;gap:6px;}
  .nfl-angle-item{display:flex;align-items:flex-start;gap:8px;font-size:12px;color:var(--soft);line-height:1.5;}
  .nfl-angle-dot{width:5px;height:5px;border-radius:50%;background:var(--nfl);flex-shrink:0;margin-top:5px;}
  .nfl-ask-shell{background:var(--surface);border:1px solid rgba(255,107,53,.2);border-radius:14px;padding:14px;margin-bottom:16px;}
  .nfl-ask-label{font-family:var(--mono-font);font-size:10px;color:var(--nfl);letter-spacing:2px;margin-bottom:8px;text-transform:uppercase;}

  .bottom-nav{position:fixed;left:0;right:0;bottom:0;background:var(--nav-bg);border-top:1px solid var(--border);display:grid;grid-template-columns:repeat(6,1fr);padding:10px 4px max(12px,env(safe-area-inset-bottom));z-index:30;backdrop-filter:blur(10px);min-height:var(--bottom-nav-height);}
  .nav-btn{background:none;border:none;color:var(--muted);font-family:var(--mono-font);font-size:9px;letter-spacing:1px;cursor:pointer;padding:6px 0;display:flex;flex-direction:column;align-items:center;gap:4px;opacity:.85;}
  .nav-btn.active{color:var(--cyan-bright);}
  .nav-btn.tennis-active{color:var(--gold);}
  .nav-btn.nfl-active{color:var(--nfl);}
  .nav-btn.f1-active{color:var(--f1);}
  .nav-btn.nba-active{color:var(--nba);}

  .f1-banner{border-radius:16px;padding:16px;margin-bottom:16px;border:1px solid var(--border);background:linear-gradient(135deg,rgba(225,6,0,.08),rgba(255,107,53,.05));}
  .f1-standing-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:all .15s ease;}
  .f1-standing-card:hover{border-color:rgba(225,6,0,.4);}
  .f1-pos{font-family:var(--display-font);font-size:28px;color:var(--muted);min-width:32px;text-align:right;line-height:1;}
  .f1-driver-info{flex:1;}
  .f1-driver-name{font-size:15px;font-weight:700;color:var(--text);margin-bottom:1px;}
  .f1-driver-team{font-family:var(--mono-font);font-size:10px;color:var(--muted);}
  .f1-pts{text-align:right;}
  .f1-pts-num{font-family:var(--mono-font);font-size:16px;color:var(--f1);display:block;}
  .f1-pts-label{font-family:var(--mono-font);font-size:9px;color:var(--muted);}
  .f1-race-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:8px;transition:all .15s ease;}
  .f1-race-card.next-race{border-color:rgba(225,6,0,.4);background:linear-gradient(135deg,rgba(225,6,0,.06),var(--surface));}
  .f1-race-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;}
  .f1-race-name{font-size:15px;font-weight:600;color:var(--text);}
  .f1-race-date{font-family:var(--mono-font);font-size:10px;color:var(--muted);}
  .f1-race-location{font-size:12px;color:var(--muted);}
  .f1-race-badge{font-family:var(--mono-font);font-size:9px;padding:2px 7px;border-radius:4px;background:rgba(225,6,0,.1);color:var(--f1);border:1px solid rgba(225,6,0,.2);}
  .f1-ask-shell{background:var(--surface);border:1px solid rgba(225,6,0,.2);border-radius:14px;padding:14px;margin-bottom:16px;}
  .f1-ask-label{font-family:var(--mono-font);font-size:10px;color:var(--f1);letter-spacing:2px;margin-bottom:8px;text-transform:uppercase;}

  .nba-banner{border-radius:16px;padding:16px;margin-bottom:16px;border:1px solid rgba(255,107,0,.2);background:linear-gradient(135deg,rgba(255,107,0,.08),rgba(255,45,107,.04));}
  .nba-ask-shell{background:var(--surface);border:1px solid rgba(255,107,0,.2);border-radius:14px;padding:14px;margin-bottom:16px;}
  .nba-ask-label{font-family:var(--mono-font);font-size:10px;color:var(--nba);letter-spacing:2px;margin-bottom:8px;text-transform:uppercase;}
  .nba-player-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:all .15s ease;}
  .nba-player-card:hover{border-color:rgba(255,107,0,.4);}
  .nba-player-rank{font-family:var(--display-font);font-size:24px;color:var(--muted);min-width:28px;text-align:right;line-height:1;}
  .nba-player-info{flex:1;}
  .nba-player-name{font-size:15px;font-weight:700;color:var(--text);margin-bottom:1px;}
  .nba-player-meta{font-family:var(--mono-font);font-size:10px;color:var(--muted);}
  .nba-player-stats{text-align:right;}
  .nba-pts{font-family:var(--mono-font);font-size:16px;color:var(--nba);display:block;}
  .nba-pts-label{font-family:var(--mono-font);font-size:9px;color:var(--muted);}
  .nba-game-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:8px;cursor:pointer;transition:all .15s ease;}
  .nba-game-card:hover{border-color:rgba(255,107,0,.35);}
  .nba-game-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}
  .nba-game-teams{font-size:15px;font-weight:600;color:var(--text);}
  .nba-game-status{font-family:var(--mono-font);font-size:10px;color:var(--muted);}
  .nba-game-score{font-family:var(--mono-font);font-size:13px;color:var(--text);margin-bottom:4px;}
  .nba-game-records{font-size:11px;color:var(--muted);}
  .nba-live-badge{color:var(--green);font-family:var(--mono-font);font-size:10px;}

  .page-spacer{height:80px;}
`;

// ── Player data ──────────────────────────────────────────────────────────────
const ATP_PLAYERS = ["Alcaraz","Sinner","Djokovic","Zverev","Medvedev","De Minaur","Auger-Aliassime","Shelton","Fritz","Musetti","Tien","Draper","Fils","Bublik","Mensik","Ruud","Korda","Fonseca","Paul","Fokina","Rublev","Lehecka","Cerundolo","Norrie","Khachanov"];
const WTA_PLAYERS = ["Sabalenka","Rybakina","Swiatek","Pegula","Gauff","Mboko","Anisimova","Svitolina","Muchova","Bencic","Andreeva","Paolini","Keys","Osaka","Noskova","Kostyuk","Vondrousova","Kalinskaya","Mertens","Cirstea","Jovic","Alexandrova","Zheng","Kartal"];

const NFL_PLAYERS = {
  "James Cook":         { pos:"RB", team:"BUF", tier:"ELITE",  ydsPg:112.3, rec2025:{g:16,yds:1797,td:14,recPg:2.7,ydsPg:112.3,ypr:7.6},  props:{recYds:{floor:80,ceil:150,lean:"OVER"},td:{pg:0.88,lean:"OVER — 14 TDs, elite scorer"}},              situation:"Bills RB1. Every-down back. Volume guaranteed.", bettingAngles:["Rush yards OVER every week","TD scorer OVER — primary play","16g starter — volume locked in"] },
  "Jonathan Taylor":    { pos:"RB", team:"IND", tier:"ELITE",  ydsPg:105.1, rec2025:{g:17,yds:1786,td:14,recPg:3.2,ydsPg:105.1,ypr:4.6},  props:{recYds:{floor:75,ceil:145,lean:"OVER"},td:{pg:0.82,lean:"OVER 0.5 — elite red zone back"}},            situation:"Colts RB1. Richardson health is the only risk.", bettingAngles:["Rush yards OVER weekly","TD scorer OVER","Monitor Richardson health"] },
  "Derrick Henry":      { pos:"RB", team:"BAL", tier:"ELITE",  ydsPg:103.3, rec2025:{g:16,yds:1653,td:15,recPg:1.1,ydsPg:103.3,ypr:5.1},  props:{recYds:{floor:75,ceil:145,lean:"OVER"},td:{pg:0.94,lean:"OVER — 15 TDs, most on team"}},               situation:"Ravens RB1 and primary red zone weapon.", bettingAngles:["Rush yards OVER every week","TD scorer — highest rate in NFL","Fade receiving yards"] },
  "Bijan Robinson":     { pos:"RB", team:"ATL", tier:"ELITE",  ydsPg:100.8, rec2025:{g:17,yds:1713,td:11,recPg:3.8,ydsPg:100.8,ypr:5.3},  props:{recYds:{floor:70,ceil:140,lean:"OVER"},td:{pg:0.65,lean:"OVER in favorable matchups"}},                situation:"Falcons RB1. Every-down back with elite receiving role.", bettingAngles:["Rush yards OVER","Receiving yards OVER pass-heavy weeks","TD scorer reliable"] },
  "De'Von Achane":      { pos:"RB", team:"MIA", tier:"ELITE",  ydsPg:93.7,  rec2025:{g:14,yds:1312,td:12,recPg:5.4,ydsPg:93.7,ypr:6.3},   props:{recYds:{floor:65,ceil:135,lean:"OVER"},td:{pg:0.86,lean:"OVER — 12 TDs in 14g"}},                      situation:"Dolphins dual-threat RB. Health is the only risk.", bettingAngles:["Rush yards OVER when healthy","Receiving yards OVER","Hard fade when injured"] },
  "Puka Nacua":         { pos:"WR", team:"LAR", tier:"ELITE",  ydsPg:107.2, rec2025:{g:16,tgt:166,rec:129,yds:1715,td:0,recPg:8.1,ydsPg:107.2,ypr:13.3}, props:{recYds:{floor:75,ceil:140,lean:"OVER"},rec:{floor:6,ceil:11,lean:"OVER — 8.1/g"},td:{pg:0,lean:"FADE TD scorer — 0 TDs in 16g"}}, situation:"Rams WR1. Most receptions in NFL 2025. Zero TDs.", bettingAngles:["Receiving yards OVER every week","Catches OVER — elite volume","FADE TD scorer"] },
  "Ja'Marr Chase":      { pos:"WR", team:"CIN", tier:"ELITE",  ydsPg:88.3,  rec2025:{g:16,tgt:185,rec:125,yds:1412,td:10,recPg:7.8,ydsPg:88.3,ypr:11.3}, props:{recYds:{floor:65,ceil:125,lean:"OVER when Burrow healthy"},td:{pg:0.63,lean:"OVER 0.5 favorable matchups"}}, situation:"Bengals WR1. Burrow health is the only variable.", bettingAngles:["Rec yards OVER when Burrow active","TD scorer OVER in red zone games","Hard fade when Burrow out"] },
  "Jaxon Smith-Njigba": { pos:"WR", team:"SEA", tier:"ELITE",  ydsPg:105.5, rec2025:{g:17,tgt:163,rec:119,yds:1793,td:6,recPg:7.0,ydsPg:105.5,ypr:15.1}, props:{recYds:{floor:75,ceil:145,lean:"OVER"},td:{pg:0.35,lean:"Moderate"}}, situation:"Seahawks WR1. Led NFL in receiving yards 2025.", bettingAngles:["Receiving yards OVER","Volume locked regardless of QB","Market underrates him"] },
  "George Pickens":     { pos:"WR", team:"DAL", tier:"STRONG", ydsPg:84.1,  rec2025:{g:17,tgt:137,rec:93,yds:1429,td:8,recPg:5.5,ydsPg:84.1,ypr:15.4},   props:{recYds:{floor:65,ceil:125,lean:"OVER"},td:{pg:0.47,lean:"OVER 0.5 red zone games"}}, situation:"Cowboys WR. Deep threat.", bettingAngles:["Receiving yards OVER","TD scorer in red zone","Big play every game"] },
  "CeeDee Lamb":        { pos:"WR", team:"DAL", tier:"STRONG", ydsPg:76.9,  rec2025:{g:14,tgt:117,rec:75,yds:1077,td:6,recPg:5.4,ydsPg:76.9,ypr:14.4},   props:{recYds:{floor:60,ceil:115,lean:"OVER when healthy"},td:{pg:0.43,lean:"OVER favorable matchups"}}, situation:"Cowboys WR1 when healthy. Missed 3 games 2025.", bettingAngles:["OVER when active","Hard fade when injured","Monitor weekly"] },
  "Trey McBride":       { pos:"TE", team:"ARI", tier:"ELITE",  ydsPg:72.9,  rec2025:{g:17,tgt:169,rec:126,yds:1239,td:5,recPg:7.4,ydsPg:72.9,ypr:9.8},   props:{rec:{floor:5,ceil:10,lean:"OVER — 7.4/g leads all TEs"},recYds:{floor:55,ceil:100,lean:"OVER"},td:{pg:0.29,lean:"Moderate — 5 TDs only"}}, situation:"Best TE situation in football.", bettingAngles:["Catches OVER every week","Receiving yards OVER","FADE TD scorer"] },
  "Brock Bowers":       { pos:"TE", team:"LVR", tier:"ELITE",  ydsPg:56.7,  rec2025:{g:12,tgt:86,rec:64,yds:680,td:3,recPg:5.3,ydsPg:56.7,ypr:10.6},     props:{rec:{floor:4,ceil:8,lean:"OVER when healthy"},recYds:{lean:"OVER when healthy"},td:{pg:0.25,lean:"Moderate"}}, situation:"Raiders TE1. Health is the major variable.", bettingAngles:["Health monitor every week","OVER when active","Fade when on injury report"] },
  "Travis Kelce":       { pos:"TE", team:"KAN", tier:"ELITE",  ydsPg:50.1,  rec2025:{g:17,tgt:108,rec:76,yds:851,td:4,recPg:4.5,ydsPg:50.1,ypr:11.2},    props:{rec:{floor:3,ceil:7,lean:"OVER — Mahomes always finds him"},td:{pg:0.24,lean:"Moderate — age 37"}}, situation:"Chiefs TE1. Age 37. Declining but Mahomes keeps him relevant.", bettingAngles:["Catches OVER when Mahomes healthy","FADE receiving yards — 50 is the real base","Monitor usage"] },
  "Tyler Warren":       { pos:"TE", team:"IND", tier:"ELITE",  ydsPg:48.1,  rec2025:{g:17,tgt:112,rec:76,yds:817,td:5,recPg:4.5,ydsPg:48.1,ypr:10.7},    props:{rec:{floor:3,ceil:7,lean:"OVER"},td:{pg:0.29,lean:"OVER 0.5 favorable matchups"}}, situation:"Colts TE1. Elite rookie season. Richardson health key.", bettingAngles:["Catches OVER every week","Receiving yards OVER","Year 2 with Richardson"] },
};

const NFL_POSITIONS = ["ALL","RB","WR","TE"];
const NFL_PROP_GUIDE = [
  { player:"James Cook",    pos:"RB", team:"BUF", propType:"RUSH YDS",  line:"115.5", floor:80,  ceil:150, lean:"OVER — 112.3 avg, elite workload",           leanClass:"lean-over" },
  { player:"Puka Nacua",    pos:"WR", team:"LAR", propType:"REC YDS",   line:"85.5",  floor:75,  ceil:140, lean:"OVER — 107.2 yds/g leads NFL",                leanClass:"lean-over" },
  { player:"Trey McBride",  pos:"TE", team:"ARI", propType:"CATCHES",   line:"6.5",   floor:5,   ceil:10,  lean:"OVER — 7.4/g is historic TE production",       leanClass:"lean-over" },
  { player:"Ja'Marr Chase", pos:"WR", team:"CIN", propType:"REC YDS",   line:"75.5",  floor:65,  ceil:125, lean:"OVER when Burrow healthy",                     leanClass:"lean-over" },
  { player:"Derrick Henry", pos:"RB", team:"BAL", propType:"RUSH TDs",  line:"0.5",   floor:0,   ceil:2,   lean:"OVER — 0.94 TDs/g is elite",                  leanClass:"lean-over" },
  { player:"Travis Kelce",  pos:"TE", team:"KAN", propType:"REC YDS",   line:"52.5",  floor:35,  ceil:80,  lean:"FADE — real floor ~50, market overprices",     leanClass:"lean-fade" },
];

// ── Utils ────────────────────────────────────────────────────────────────────
function normalizeText(v) { return String(v || "").trim().toLowerCase(); }
function slugify(v) { return String(v||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,""); }
function isNflInSeason() { const m=new Date().getMonth(); return m>=8||m<=1; }
function isNflRampMode() { const m=new Date().getMonth(); return m>=6&&m<=7; }
function getDaypartLabel() { const h=new Date().getHours(); if(h<12)return"today"; if(h<18)return"this afternoon"; return"tonight"; }

function normalizeTennisMatch(match, fallbackTour="ATP", activeTournament=null) {
  if (!match) return null;
  const league = match.league || (normalizeText(match.league_name).includes("wta")||normalizeText(match.event_type_type).includes("women") ? "WTA" : fallbackTour);
  const home = String(match.home_team||match.event_first_player||"").trim();
  const away = String(match.away_team||match.event_second_player||"").trim();
  if (!home||!away) return null;
  const blocked = new Set(["player 1","player 2","tbd","unknown","n/a","-"]);
  if (blocked.has(home.toLowerCase())||blocked.has(away.toLowerCase())) return null;
  if (home.toLowerCase()===away.toLowerCase()) return null;
  const tournament = String(match.tournament||match.tournament_name||"").trim();
  if (!tournament) return null;
  const rawLive = String(match.live??match.event_live??"0");
  const isLive = rawLive==="1";
  let status = String(match.status||match.event_status||"Scheduled").trim();
  if (isLive) status="Live";
  const eventDate=String(match.event_date||"").trim();
  const eventTime=String(match.event_time||"").trim();
  const commenceTime = match.commence_time||(eventDate&&eventTime?`${eventDate}T${eventTime}:00`:eventDate?`${eventDate}T00:00:00`:null);
  return {
    id: match.id||match.event_key||`${home}-${away}-${league}-${eventDate||tournament}`,
    league, leagueColor: league==="WTA"?"#E11D48":"#0891B2",
    title:`${home} vs ${away}`, time:status, network:tournament,
    blurb:`${home} vs ${away}${match.round?` · ${match.round}`:""}${match.score&&match.score!=="-"?` · ${match.score}`:""}`,
    whatMatters:"Ask for the side, total, props, or live angle.",
    quickHitters:["Best angle here?","Moneyline or total?","Any live edge?"],
    confirmed:true,
    commenceTime,
    commenceTs: commenceTime ? new Date(commenceTime).getTime() : Number.MAX_SAFE_INTEGER,
    raw:{...match,live:rawLive,status,home,away,tournament,event_date:eventDate,event_time:eventTime},
  };
}

function preferredTournamentScore(match, context) {
  const active = context?.currentTournament;
  if (!active||!match) return 0;
  const tournamentSlug = slugify(match.network||match.raw?.tournament||"");
  const keySlug = slugify(active.key||"");
  const nameSlug = slugify(active.name||"");
  if (!tournamentSlug) return 0;
  if (nameSlug&&tournamentSlug.includes(nameSlug)) return 5;
  if (keySlug&&tournamentSlug.includes(keySlug)) return 5;
  if (nameSlug&&nameSlug.includes(tournamentSlug)) return 4;
  if (keySlug&&keySlug.includes(tournamentSlug)) return 4;
  return 0;
}

function getTournamentFetchParam(context) {
  const active = context?.currentTournament;
  if (!active) return "charleston";
  const candidates = [active.key,active.name,active.location].filter(Boolean);
  return candidates.map(v=>slugify(v)).join(",") || "charleston";
}

function buildNflContext() {
  return Object.entries(NFL_PLAYERS).map(([name,p]) => {
    const tdPg=p.props.td?.pg!==undefined?`${p.props.td.pg} TDs/g`:"";
    const total=p.rec2025.td!==undefined?`${p.rec2025.td} total TDs`:"";
    const games=p.rec2025.g!==undefined?`${p.rec2025.g}g`:"";
    const tdLean=p.props.td?.lean||"—";
    const yLean=p.props.recYds?.lean||p.props.rec?.lean||"—";
    const recPg=p.rec2025.recPg!==undefined?`, ${p.rec2025.recPg} rec/g`:"";
    const tgt=p.rec2025.tgt!==undefined?`, ${p.rec2025.tgt} tgt`:"";
    const ypr=p.rec2025.ypr!==undefined?`, ${p.rec2025.ypr} ypr`:"";
    return [`${name} | ${p.pos} | ${p.team} | ${p.tier}`,`  Stats: ${p.ydsPg} yds/g, ${total} in ${games}${recPg}${tgt}${ypr}`,`  TD rate: ${tdPg||"n/a"} | TD lean: ${tdLean}`,`  Volume lean: ${yLean}`,`  Situation: ${p.situation}`,`  Angles: ${p.bettingAngles.join(" | ")}`].join("\n");
  }).join("\n\n");
}

function formatServeStats(s) { if(!s)return"—"; const p=[]; if(s.holdPct!==undefined)p.push(`Hold ${s.holdPct}%`); if(s.acePct!==undefined)p.push(`Ace ${s.acePct}%`); if(s.dfPct!==undefined)p.push(`DF ${s.dfPct}%`); return p.length?p.join(", "):"—"; }
function formatReturnStats(s) { if(!s)return"—"; const p=[]; if(s.rpwPct!==undefined)p.push(`RPW ${s.rpwPct}%`); if(s.breakPct!==undefined)p.push(`Break ${s.breakPct}%`); return p.length?p.join(", "):"—"; }
function formatOverallStats(s) { if(!s)return"—"; const p=[]; if(s.dominanceRatio!==undefined)p.push(`DR ${s.dominanceRatio}`); if(s.totalPointsWonPct!==undefined)p.push(`TPW ${s.totalPointsWonPct}%`); if(s.tiebreakPct!==undefined)p.push(`Tiebreak ${s.tiebreakPct}%`); return p.length?p.join(", "):"—"; }
function getHoldValue(p) { return p?.serveStats?.holdPct!==undefined?`${p.serveStats.holdPct}%`:"—"; }
function getDrValue(p) { return p?.overallStats?.dominanceRatio!==undefined?`${p.overallStats.dominanceRatio}`:"—"; }
function getTbValue(p) { return p?.overallStats?.tiebreakPct!==undefined?`${p.overallStats.tiebreakPct}%`:"—"; }

function renderMessage(text) {
  if (!text) return null;
  const clean = String(text).replace(/\*\*([^*]+)\*\*/g,"$1").replace(/\*([^*]+)\*/g,"$1").trim();
  return clean.split(/\n{2,}/).map((para,i) => {
    const lines = para.split("\n").map(s=>s.trim()).filter(Boolean);
    const allBullets = lines.length>1&&lines.every(l=>l.startsWith("•")||(l.includes(" — ")&&!l.endsWith(".")));
    if (allBullets) {
      return (
        <div key={i} style={{display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
          {lines.map((line,j) => {
            const norm=line.startsWith("•")?line.slice(1).trim():line;
            const parts=norm.split("—").map(s=>s.trim());
            const head=parts[0]||""; const tail=parts.slice(1).join(" — ");
            return (<div key={j} style={{background:"rgba(8,145,178,.06)",border:"1px solid rgba(8,145,178,.12)",borderRadius:10,padding:"10px 12px"}}><div style={{fontWeight:600,color:"var(--text)",fontSize:13,marginBottom:tail?4:0}}>{head}</div>{tail&&<div style={{fontSize:12,color:"var(--soft)",lineHeight:1.55}}>{tail}</div>}</div>);
          })}
        </div>
      );
    }
    return <div key={i} style={{lineHeight:1.7,marginBottom:10}}>{para}</div>;
  });
}

function ChatThread({ msgs }) {
  if (!msgs||msgs.length===0) return null;
  return (
    <div className="chat-thread" style={{marginBottom:20}}>
      {msgs.map((m,i) => (
        <div key={i} className={`bubble ${m.role}${m.loading?" loading":""}`}>
          {m.image && <img src={m.image} alt="" className="bubble-img" />}
          {m.loading ? m.text : renderMessage(m.text)}
        </div>
      ))}
    </div>
  );
}

// ── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]                         = useState("home");
  const [screen, setScreen]                   = useState("home");
  const [selectedMatchup, setSelectedMatchup] = useState(null);
  const [selectedPlayer, setSelectedPlayer]   = useState(null);
  const [selectedNflPlayer, setSelectedNflPlayer] = useState(null);
  const [nflPosFilter, setNflPosFilter]       = useState("ALL");

  // Per-screen inputs — never shared — prevents 1-char typing bug
  const [homeInput, setHomeInput]       = useState("");
  const [askInput, setAskInput]         = useState("");
  const [tennisInput, setTennisInput]   = useState("");
  const [nflInput, setNflInput]         = useState("");
  const [f1Input, setF1Input]           = useState("");
  const [nbaInput, setNbaInput]         = useState("");
  const [matchupInput, setMatchupInput] = useState("");

  // Per-screen message threads
  const [askMsgs, setAskMsgs]         = useState([]);
  const [tennisMsgs, setTennisMsgs]   = useState([]);
  const [nflMsgs, setNflMsgs]         = useState([]);
  const [f1Msgs, setF1Msgs]           = useState([]);
  const [nbaMsgs, setNbaMsgs]         = useState([]);
  const [matchupMsgs, setMatchupMsgs] = useState([]);

  const [isAsking, setIsAsking]         = useState(false);
  const [players, setPlayers]           = useState(null);
  const [context, setContext]           = useState(null);
  const [liveMatches, setLiveMatches]   = useState([]);
  const [tennisLoading, setTennisLoading] = useState(false);
  const [pastedImage, setPastedImage]   = useState(null);
  const [f1Data, setF1Data]             = useState(null);
  const [f1Loading, setF1Loading]       = useState(false);
  const [nbaData, setNbaData]           = useState(null);
  const [nbaLoading, setNbaLoading]     = useState(false);

  // Separate inputRef per screen — critical for AskBar memo optimization
  const homeInputRef      = useRef(null);
  const askInputRef       = useRef(null);
  const tennisInputRef    = useRef(null);
  const nflInputRef       = useRef(null);
  const f1InputRef        = useRef(null);
  const nbaInputRef       = useRef(null);
  const matchupInputRef   = useRef(null);
  const playerInputRef    = useRef(null);
  const nflPlayerInputRef = useRef(null);
  const fileInputRef      = useRef(null);

  const nflSeasonMode = useMemo(() => isNflInSeason(), []);
  const nflRampMode   = useMemo(() => isNflRampMode(), []);

  // ── Tennis fetch ───────────────────────────────────────────────────────────
  const fetchTennisBoard = useCallback(async (activeContext=null) => {
    const tournamentParam = getTournamentFetchParam(activeContext);
    const [atpRes, wtaRes] = await Promise.all([
      fetch(`/api/tennis?tour=atp&activeTournament=${encodeURIComponent(tournamentParam)}`),
      fetch(`/api/tennis?tour=wta&activeTournament=${encodeURIComponent(tournamentParam)}`),
    ]);
    const [atpData, wtaData] = await Promise.all([atpRes.json(), wtaRes.json()]);
    const merged = [
      ...(Array.isArray(atpData)?atpData.map(m=>normalizeTennisMatch(m,"ATP",activeContext)):[]),
      ...(Array.isArray(wtaData)?wtaData.map(m=>normalizeTennisMatch(m,"WTA",activeContext)):[]),
    ].filter(Boolean);
    const seen=new Set(); const deduped=[];
    for (const m of merged) {
      const key=[normalizeText(m.league),normalizeText(m.raw?.home),normalizeText(m.raw?.away),normalizeText(m.network),normalizeText(m.raw?.round),normalizeText(m.raw?.event_date)].join("|");
      if (!seen.has(key)) { seen.add(key); deduped.push(m); }
    }
    return deduped.sort((a,b) => {
      const aLive=String(a?.raw?.live||"0")==="1"?1:0;
      const bLive=String(b?.raw?.live||"0")==="1"?1:0;
      if (aLive!==bLive) return bLive-aLive;
      const aPref=preferredTournamentScore(a,activeContext);
      const bPref=preferredTournamentScore(b,activeContext);
      if (aPref!==bPref) return bPref-aPref;
      const aTime=Number.isFinite(a.commenceTs)?a.commenceTs:Number.MAX_SAFE_INTEGER;
      const bTime=Number.isFinite(b.commenceTs)?b.commenceTs:Number.MAX_SAFE_INTEGER;
      return aTime-bTime;
    });
  }, []);

  useEffect(() => {
    let active=true; let pollId=null;
    async function loadAll() {
      setTennisLoading(true);
      try {
        const [pRes,cRes] = await Promise.all([fetch("/api/tennis-players"),fetch("/api/tennis-context")]);
        const [p,c] = await Promise.all([pRes.json(),cRes.json()]);
        if (!active) return;
        setPlayers(p); setContext(c);
        const board = await fetchTennisBoard(c);
        if (!active) return;
        setLiveMatches(board);
      } catch { if(active) setLiveMatches([]); }
      finally { if(active) setTennisLoading(false); }
    }
    loadAll();
    pollId = window.setInterval(() => {
      fetchTennisBoard(context).then(b=>{ if(active) setLiveMatches(b); }).catch(()=>{});
    }, 60000);
    return () => { active=false; if(pollId) window.clearInterval(pollId); };
  }, [fetchTennisBoard]);

  useEffect(() => {
    if (!context) return;
    let cancelled=false;
    fetchTennisBoard(context).then(b=>{ if(!cancelled) setLiveMatches(b); }).catch(()=>{});
    return () => { cancelled=true; };
  }, [context, fetchTennisBoard]);

  // ── F1 data fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    let active=true;
    async function loadF1() {
      setF1Loading(true);
      try {
        const res = await fetch("/api/f1");
        const data = await res.json();
        if (active) setF1Data(data);
      } catch { if (active) setF1Data(null); }
      finally { if (active) setF1Loading(false); }
    }
    loadF1();
    const poll = window.setInterval(() => {
      fetch("/api/f1").then(r=>r.json()).then(d=>{ if(active) setF1Data(d); }).catch(()=>{});
    }, 120000);
    return () => { active=false; window.clearInterval(poll); };
  }, []);

  // ── NBA data fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    let active=true;
    async function loadNba() {
      setNbaLoading(true);
      try {
        const res = await fetch("/api/nba?view=board");
        const data = await res.json();
        if (active) setNbaData(data);
      } catch { if (active) setNbaData(null); }
      finally { if (active) setNbaLoading(false); }
    }
    loadNba();
    const poll = window.setInterval(() => {
      fetch("/api/nba?view=board").then(r=>r.json()).then(d=>{ if(active) setNbaData(d); }).catch(()=>{});
    }, 300000); // 5 min
    return () => { active=false; window.clearInterval(poll); };
  }, []);

  // ── Image handling ─────────────────────────────────────────────────────────
  const processImageFile = useCallback(file => {
    if (!file||!file.type.startsWith("image/")) return;
    const reader=new FileReader();
    reader.onload=e => { const d=e.target.result; setPastedImage({base64:d.split(",")[1],mediaType:file.type,previewUrl:d}); };
    reader.readAsDataURL(file);
  }, []);

  const clearImage = useCallback(() => { setPastedImage(null); if(fileInputRef.current) fileInputRef.current.value=""; }, []);

  useEffect(() => {
    const handle=e => { const items=e.clipboardData?.items; if(!items)return; for(const item of items){ if(item.type.startsWith("image/")){ e.preventDefault(); const f=item.getAsFile(); if(f) processImageFile(f); break; } } };
    window.addEventListener("paste",handle);
    return ()=>window.removeEventListener("paste",handle);
  }, [processImageFile]);

  // ── Context builders ───────────────────────────────────────────────────────
  const buildF1Context = useCallback(() => {
    if (!f1Data) return null;
    const standings = (f1Data.standings || []).slice(0, 20).map(d =>
      `P${d.position ?? "?"} ${d.full_name || d.name_acronym || `#${d.driver_number}`} (${d.team_name || "Unknown"}) — ${d.points ?? 0} pts`
    ).join("\n");
    const nextRace = f1Data.schedule?.races?.find(r => r.is_next);
    const upcomingRaces = (f1Data.schedule?.races || [])
      .filter(r => new Date(r.date_start) > new Date())
      .slice(0, 5)
      .map(r => {
        const d = r.date_start ? new Date(r.date_start).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBD";
        return `${r.meeting_name || r.location} — ${d} — ${r.circuit_short_name || r.location || ""}${r.is_next ? " [NEXT RACE]" : ""}`;
      }).join("\n");
    const session = f1Data.session;
    const sessionStr = session
      ? `LATEST SESSION: ${session.session_name || session.session_type || "Unknown"} at ${session.meeting_name || session.location || "Unknown"} (${session.date_start ? new Date(session.date_start).toLocaleDateString() : "TBD"})`
      : "";
    return { standings, upcomingRaces, nextRace, sessionStr };
  }, [f1Data]);

  const buildNbaContext = useCallback((questionText) => {
    if (!nbaData) return null;
    return {
      seasonContext:   nbaData.seasonContext || {},
      todaysGames:     nbaData.todaysGames   || [],
      lastNight:       nbaData.lastNight     || [],
      lastNightStats:  nbaData.lastNightStats|| [],
      liveStats:       nbaData.liveStats     || [],
      playerStats:     nbaData.playerStats   || [],
      propLines:       nbaData.propLines     || [],
      playerDb:        NBA_PLAYERS,
      question:        questionText || "",
    };
  }, [nbaData]);

  // ── Core AI call ───────────────────────────────────────────────────────────
  const askUrTake = useCallback(async ({ text, matchup, setMsgs, sportHint }) => {
    if (!text||isAsking) return;
    setIsAsking(true);
    const imgToSend=pastedImage;
    setMsgs(prev=>[...prev,{role:"user",text,image:imgToSend?.previewUrl||null},{role:"ai",text:"THINKING...",loading:true}]);
    clearImage();
    try {
      const body={
        question: text,
        players,
        context,
        liveMatches,
        history: [],
        matchupContext: matchup || null,
        nflContext: buildNflContext(),
        f1Context: buildF1Context(),
        nbaContext: buildNbaContext(text),
        sportHint: sportHint || null,
      };
      if(imgToSend) body.image={base64:imgToSend.base64,mediaType:imgToSend.mediaType};
      const res=await fetch("/api/ur-take",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data=await res.json();
      setMsgs(prev=>[...prev.filter(m=>!m.loading),{role:"ai",text:data.response||"Couldn't get a response — try again."}]);
    } catch {
      setMsgs(prev=>[...prev.filter(m=>!m.loading),{role:"ai",text:"Something went wrong — try again."}]);
    } finally { setIsAsking(false); }
  }, [clearImage, context, isAsking, liveMatches, pastedImage, players, buildF1Context, buildNbaContext]);

  // ── Player lookups ─────────────────────────────────────────────────────────
  const getPlayer    = useCallback((name,tour="atp") => { if(!players)return null; return(tour==="atp"?players.atp:players.wta)?.[name]||null; }, [players]);
  const getPlayerAny = useCallback(name => { if(!players)return null; return players.atp?.[name]||players.wta?.[name]||null; }, [players]);

  const pd    = screen==="player"    && selectedPlayer    ? getPlayerAny(selectedPlayer)   : null;
  const nflPd = screen==="nflplayer" && selectedNflPlayer ? NFL_PLAYERS[selectedNflPlayer] : null;

  const filteredNflPlayers = useMemo(() => Object.entries(NFL_PLAYERS).filter(([,p])=>nflPosFilter==="ALL"||p.pos===nflPosFilter).sort((a,b)=>b[1].ydsPg-a[1].ydsPg), [nflPosFilter]);

  // ── Tennis derived state ───────────────────────────────────────────────────
  const tennisLiveMatches     = useMemo(()=>liveMatches.filter(m=>String(m?.raw?.live||"0")==="1"),[liveMatches]);
  const tennisUpcomingMatches = useMemo(()=>liveMatches.filter(m=>String(m?.raw?.live||"0")!=="1"),[liveMatches]);
  const activeTournamentMatches = useMemo(()=>liveMatches.filter(m=>preferredTournamentScore(m,context)>0),[liveMatches,context]);

  const tennisBoardHeadline = useMemo(() => {
    const n=context?.currentTournament?.name;
    if (activeTournamentMatches.length>0&&n) return n;
    return "Tennis Board";
  }, [activeTournamentMatches.length,context]);

  const tennisBoardSubline = useMemo(() => {
    const n=context?.currentTournament?.name;
    if (activeTournamentMatches.length>0&&n) return `${n.toUpperCase()} · LIVE + UPCOMING`;
    return "CURRENT + UPCOMING TOUR MATCHES";
  }, [activeTournamentMatches.length,context]);

  // ── Home cards ─────────────────────────────────────────────────────────────
  const homeTennisCards = useMemo(() => {
    const source = activeTournamentMatches.length>0 ? activeTournamentMatches : liveMatches;
    const liveCards = source.filter(m=>String(m?.raw?.live||"0")==="1");
    const upcomingCards = source.filter(m=>String(m?.raw?.live||"0")!=="1");
    const cards=[];
    if(liveCards[0]) cards.push({...liveCards[0],homeCategory:"Live Tennis"});
    if(upcomingCards[0]) cards.push({...upcomingCards[0],homeCategory:"Upcoming Tennis"});
    if(!cards.length&&liveMatches[0]) cards.push({...liveMatches[0],homeCategory:String(liveMatches[0]?.raw?.live||"0")==="1"?"Live Tennis":"Upcoming Tennis"});
    if(!cards.length) {
      cards.push({
        id:"tennis-ctx-1", league:"TENNIS", leagueColor:"#0891B2",
        title:context?.currentTournament?.name?`Best angle at ${context.currentTournament.name}`:"Tennis Futures — Value Plays",
        time:"Current Market", network:context?.currentTournament?.surface||"Tour Futures",
        blurb:context?.currentTournament?.context?context.currentTournament.context:"Player database, surface Elo, and futures context are loaded.",
        whatMatters:"Ask for the best current tennis future, matchup angle, or surface edge.",
        quickHitters:["Best tennis future right now?","Best clay angle?","Who has the best current value?"],
        confirmed:true,
      });
    }
    return cards.slice(0,2);
  }, [activeTournamentMatches,liveMatches,context]);

  const homeNflCards = useMemo(() => {
    if (nflSeasonMode) return [
      {id:"nfl-season-1",league:"NFL IN-SEASON",leagueColor:"#D97706",title:"Best weekly NFL prop board",time:"Weekly Market",network:"Weekly Props",blurb:"Usage, role changes, and current mispricing.",whatMatters:"Ask for the best current weekly NFL edge.",quickHitters:["Best prop this week?","Biggest role shift?","Best TD angle?"],confirmed:true},
      {id:"nfl-season-2",league:"NFL IN-SEASON",leagueColor:"#D97706",title:"Most mispriced in-season usage spot",time:"Weekly Market",network:"Role + Volume",blurb:"Where the market is lagging behind current role and usage.",whatMatters:"Ask for the cleanest role-driven edge.",quickHitters:["Which line is stale?","Best volume play?","Best role-based edge?"],confirmed:true},
    ];
    return [
      {id:"nfl-future-1",league:"NFL FUTURE",leagueColor:"#D97706",title:"Puka Nacua 2026 outlook",time:nflRampMode?"Season Approaching":"Futures Window",network:"Season Futures",blurb:"Led NFL in receptions 2025 with 129 catches. Zero TDs. Elite volume profile for futures.",whatMatters:"Yards and catches props are the play. TD regression is the variable.",quickHitters:["Best Puka future?","Yards or catches?","Is price fair yet?"],confirmed:true},
      {id:"nfl-future-2",league:"NFL FUTURE",leagueColor:"#D97706",title:"Derrick Henry TD future",time:nflRampMode?"Season Approaching":"Futures Window",network:"Season Futures",blurb:"15 TDs in 2025 at 0.94 per game. Most reliable TD-scorer profile in football.",whatMatters:"Ask whether the price still has value.",quickHitters:["Henry TD over?","Best RB TD future?","Most reliable scorer profile?"],confirmed:true},
    ];
  }, [nflSeasonMode, nflRampMode]);

  const homeF1Cards = useMemo(() => {
    const nextRace = f1Data?.schedule?.races?.find(r => r.is_next);
    const leader = f1Data?.standings?.[0];
    const cards = [];
    if (nextRace) {
      const dateStr = nextRace.date_start ? new Date(nextRace.date_start).toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "";
      cards.push({id:"f1-next-1",league:"F1",leagueColor:"#E10600",title:nextRace.meeting_name||"Next Grand Prix",time:dateStr,network:nextRace.circuit_short_name||nextRace.location||"",blurb:`${nextRace.location} — Ask for the best F1 angle.`,whatMatters:"Ask for race winner, podium, or qualifying prop edges.",quickHitters:["Best F1 bet this weekend?","Who wins qualifying?","Podium value play?"],confirmed:true});
    }
    if (leader) {
      cards.push({id:"f1-standings-1",league:"F1 CHAMPIONSHIP",leagueColor:"#E10600",title:`${leader.full_name||"Leader"} leads — ${leader.points||0} pts`,time:"2026 Season",network:"Driver Championship",blurb:`${leader.team_name||""} ${leader.full_name||""} leads the 2026 championship. Ask about title odds.`,whatMatters:"Ask about championship futures and driver head-to-heads.",quickHitters:["Who wins the 2026 WDC?","Best F1 future right now?","Constructor championship value?"],confirmed:true});
    }
    if (!cards.length) {
      cards.push({id:"f1-default",league:"F1",leagueColor:"#E10600",title:"Formula 1 — 2026 Season",time:"Active",network:"Grand Prix Racing",blurb:"New 2026 regulations. Mercedes resurgent. Red Bull fallen. Ask about any F1 angle.",whatMatters:"Ask about race winners, championship futures, or driver matchups.",quickHitters:["Best F1 future?","Who wins the WDC?","Best value bet?"],confirmed:true});
    }
    return cards.slice(0,1);
  }, [f1Data]);

  const homeNbaCards = useMemo(() => {
    const games = nbaData?.games || [];
    const liveGame = games.find(g => g.statusCode === 2);
    const nextGame = games.find(g => g.statusCode === 1);
    const cards = [];
    if (liveGame) {
      cards.push({id:"nba-live-1",league:"NBA LIVE",leagueColor:"#FF6B00",title:`${liveGame.awayTeam.tricode} vs ${liveGame.homeTeam.tricode}`,time:"LIVE",network:`${liveGame.awayTeam.score} — ${liveGame.homeTeam.score} · Q${liveGame.period}`,blurb:"Live game in progress. Ask for the best in-game prop or spread angle.",whatMatters:"Ask for live prop edges or game total angle.",quickHitters:["Best live prop right now?","Best spread angle?","Who covers?"],confirmed:true});
    } else if (nextGame) {
      cards.push({id:"nba-next-1",league:"NBA",leagueColor:"#FF6B00",title:`${nextGame.awayTeam.tricode} vs ${nextGame.homeTeam.tricode}`,time:nextGame.status,network:"Tonight's Slate",blurb:"Ask for the best prop angle on tonight's NBA slate.",whatMatters:"Ask for the safest PRA bet or best game total.",quickHitters:["Best prop tonight?","Safest PRA bet?","Best game total?"],confirmed:true});
    } else {
      cards.push({id:"nba-default",league:"NBA",leagueColor:"#FF6B00",title:"NBA Props — 2024-25",time:"Active",network:"Player Props",blurb:"80-player prop database with PRA floors, ceilings, and usage angles.",whatMatters:"Ask for the best prop on any player or tonight's slate.",quickHitters:["Best PRA bet tonight?","Safest prop right now?","Best usage spike play?"],confirmed:true});
    }
    return cards.slice(0,1);
  }, [nbaData]);

  const homeCards = useMemo(() => [...homeTennisCards,...homeNflCards,...homeF1Cards,...homeNbaCards].filter(Boolean), [homeTennisCards,homeNflCards,homeF1Cards,homeNbaCards]);

  // ── Dynamic home questions ─────────────────────────────────────────────────
  const dynamicHomeQuestions = useMemo(() => {
    const prompts=[]; const used=new Set(); const daypart=getDaypartLabel();
    const push=item=>{ if(!item||used.has(item.text))return; used.add(item.text); prompts.push(item); };
    const prefLive=activeTournamentMatches.find(m=>String(m?.raw?.live||"0")==="1")||tennisLiveMatches[0];
    const prefUpcoming=activeTournamentMatches.find(m=>String(m?.raw?.live||"0")!=="1")||tennisUpcomingMatches[0];
    if(prefLive){ const label=`${prefLive.raw?.home||""} vs ${prefLive.raw?.away||""}`; push({id:"q1",color:prefLive.league==="WTA"?"#E11D48":"#0891B2",text:`Best live angle for ${label}?`,prompt:`What is the best live betting angle for ${label} right now? Give me the strongest side, total, and any prop edge.`}); }
    if(prefUpcoming){ const label=`${prefUpcoming.raw?.home||""} vs ${prefUpcoming.raw?.away||""}`; push({id:"q2",color:prefUpcoming.league==="WTA"?"#E11D48":"#0891B2",text:`Best tennis bet in ${label} ${daypart}?`,prompt:`What is the best bet in ${label} ${daypart}? Cleanest angle and one sharper alternative.`}); }
    push({id:"q3",color:"#0891B2",text:context?.currentTournament?.name?`Best futures angle around ${context.currentTournament.name}?`:"Which tennis future still has value right now?",prompt:context?.currentTournament?.name?`What is the best current futures or tournament-value angle connected to ${context.currentTournament.name}?`:"Which tennis future still has value right now, and why has the market not fully priced it correctly?"});
    if(nflSeasonMode){ push({id:"q4",color:"#E11D48",text:"Which NFL weekly prop is most mispriced?",prompt:"Which NFL weekly player prop looks most mispriced right now based on current usage and the player database?"}); }
    else { push({id:"q4",color:"#E11D48",text:"Which NFL future looks most mispriced?",prompt:"Which NFL future looks the most mispriced right now based on the player database and team context?"}); }
    push({id:"q5",color:"#FF6B00",text:"Best NBA prop on tonight's slate?",prompt:"What is the safest and highest-confidence NBA prop bet on tonight's slate? Give me the top PRA play and one secondary angle."});
    push({id:"q6",color:"#E10600",text:"Best F1 betting angle this weekend?",prompt:"What is the best F1 betting angle for the next Grand Prix? Consider current standings, circuit type, and any relevant pace data."});
    return prompts.slice(0,5);
  }, [activeTournamentMatches,tennisLiveMatches,tennisUpcomingMatches,nflSeasonMode,context]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goHome   = useCallback(()=>{ setTab("home");  setScreen("home");  setSelectedMatchup(null); setSelectedPlayer(null); setSelectedNflPlayer(null); },[]);
  const goTennis = useCallback(()=>{ setTab("tennis");setScreen("tennis");setSelectedMatchup(null); setSelectedPlayer(null); setSelectedNflPlayer(null); },[]);
  const goNfl    = useCallback(()=>{ setTab("nfl");   setScreen("nfl");   setSelectedMatchup(null); setSelectedPlayer(null); setSelectedNflPlayer(null); },[]);
  const goF1     = useCallback(()=>{ setTab("f1");    setScreen("f1");    setSelectedMatchup(null); setSelectedPlayer(null); setSelectedNflPlayer(null); },[]);
  const goNba    = useCallback(()=>{ setTab("nba");   setScreen("nba");   setSelectedMatchup(null); setSelectedPlayer(null); setSelectedNflPlayer(null); },[]);
  const goAsk    = useCallback(()=>{ setTab("ask");   setScreen("ask");   setSelectedMatchup(null); },[]);

  const openMatchup   = useCallback(m=>{ if(!m?.title||!m?.network)return; setSelectedMatchup(m); setMatchupMsgs([]); setMatchupInput(""); setScreen("matchup"); setTab(m?.league?.includes("NFL")?"nfl":"tennis"); },[]);
  const openPlayer    = useCallback(name=>{ setSelectedPlayer(name); setScreen("player"); setTab("tennis"); },[]);
  const openNflPlayer = useCallback(name=>{ setSelectedNflPlayer(name); setScreen("nflplayer"); setTab("nfl"); },[]);
  const firePrompt    = useCallback(prompt=>{ setTab("ask"); setScreen("ask"); setAskInput(""); askUrTake({text:prompt,setMsgs:setAskMsgs}); },[askUrTake]);

  // ── Submit handlers ────────────────────────────────────────────────────────
  const submitHome    = useCallback(()=>{ const t=homeInput.trim();    if(!t||isAsking)return; setHomeInput(""); setAskInput(""); setTab("ask"); setScreen("ask"); askUrTake({text:t,setMsgs:setAskMsgs}); },[askUrTake,homeInput,isAsking]);
  const submitAsk     = useCallback(()=>{ const t=askInput.trim();     if(!t||isAsking)return; setAskInput(""); askUrTake({text:t,setMsgs:setAskMsgs}); },[askInput,askUrTake,isAsking]);
  const submitTennis  = useCallback(forced=>{ const t=(forced??tennisInput).trim(); if(!t||isAsking)return; if(!forced)setTennisInput(""); askUrTake({text:t,setMsgs:setTennisMsgs,sportHint:"tennis"}); },[askUrTake,isAsking,tennisInput]);
  const submitNfl     = useCallback(forced=>{ const t=(forced??nflInput).trim();    if(!t||isAsking)return; if(!forced)setNflInput("");   askUrTake({text:t,setMsgs:setNflMsgs,sportHint:"nfl"}); },[askUrTake,isAsking,nflInput]);
  const submitF1      = useCallback(forced=>{ const t=(forced??f1Input).trim();     if(!t||isAsking)return; if(!forced)setF1Input("");    askUrTake({text:t,setMsgs:setF1Msgs,sportHint:"f1"}); },[askUrTake,isAsking,f1Input]);
  const submitNba     = useCallback(forced=>{ const t=(forced??nbaInput).trim();    if(!t||isAsking)return; if(!forced)setNbaInput("");   askUrTake({text:t,setMsgs:setNbaMsgs,sportHint:"nba"}); },[askUrTake,isAsking,nbaInput]);
  const submitMatchup = useCallback(forced=>{ const t=(forced??matchupInput).trim(); if(!t||isAsking)return; if(!forced)setMatchupInput(""); const hint=selectedMatchup?.league?.includes("NFL")?"nfl":"tennis"; askUrTake({text:t,matchup:selectedMatchup,setMsgs:setMatchupMsgs,sportHint:hint}); },[askUrTake,isAsking,matchupInput,selectedMatchup]);

  // ── Sub-components ─────────────────────────────────────────────────────────
  function TennisPlayerCard({ name, idx, tour }) {
    const p=getPlayer(name,tour); if(!p)return null;
    return (
      <div className="player-card" onClick={()=>openPlayer(name)}>
        <div className="player-top">
          <div className="player-rank">#{idx+1}</div>
          <div className="player-info">
            <div className="player-name">{name}</div>
            <div className="player-style">{Array.isArray(p.style)?p.style.join(", ").replaceAll("_"," "):p.style}</div>
            <div className="surface-pills">{p.surfaceNote?.hard&&<span className="surface-pill surface-hard">HARD</span>}{p.surfaceNote?.clay&&<span className="surface-pill surface-clay">CLAY</span>}{p.surfaceNote?.grass&&<span className="surface-pill surface-grass">GRASS</span>}</div>
          </div>
          <div className="player-elo"><span className="player-elo-num">{p.elo}</span><span className="player-elo-label">ELO</span>{p.record2026&&<div className="form-badge" style={{marginTop:4}}>2026</div>}</div>
        </div>
        <div className="player-stats">
          <div className="pstat"><div className="pstat-label">HOLD</div><div className="pstat-value">{getHoldValue(p)}</div></div>
          <div className="pstat"><div className="pstat-label">DR</div><div className="pstat-value" style={{color:"var(--cyan-bright)"}}>{getDrValue(p)}</div></div>
          <div className="pstat"><div className="pstat-label">TB%</div><div className="pstat-value">{getTbValue(p)}</div></div>
        </div>
      </div>
    );
  }

  function NflPlayerCard({ name, player }) {
    return (
      <div className="nfl-player-card" onClick={()=>openNflPlayer(name)}>
        <div className="nfl-player-top">
          <div className="nfl-player-left"><div className="nfl-rank">{player.pos}</div><div className="nfl-player-info"><div className="nfl-player-name">{name}</div><div className="nfl-player-meta">{player.team} · {player.tier}</div></div></div>
          <div className="nfl-player-right"><span className="nfl-yds-pg">{player.ydsPg}</span><span className="nfl-yds-label">YDS/G</span></div>
        </div>
        <div className="nfl-player-stats">
          <div className="nfl-stat"><div className="nfl-stat-label">GAMES</div><div className="nfl-stat-value">{player.rec2025.g}</div></div>
          <div className="nfl-stat"><div className="nfl-stat-label">TDs</div><div className="nfl-stat-value" style={{color:"var(--nfl)"}}>{player.rec2025.td}</div></div>
          {player.rec2025.tgt?<div className="nfl-stat"><div className="nfl-stat-label">TGT</div><div className="nfl-stat-value">{player.rec2025.tgt}</div></div>:<div className="nfl-stat"><div className="nfl-stat-label">REC/G</div><div className="nfl-stat-value">{player.rec2025.recPg??"—"}</div></div>}
          <div className="nfl-stat"><div className="nfl-stat-label">YPR</div><div className="nfl-stat-value">{player.rec2025.ypr}</div></div>
        </div>
      </div>
    );
  }

  const askBarCommon = { fileInputRef, pastedImage, clearImage, isAsking, processImageFile };

  // ── Header pill ────────────────────────────────────────────────────────────
  const headerPill = (
    <>
      {screen==="tennis"&&<span className="pill-live">{context?.currentTournament?.name?context.currentTournament.name.toUpperCase():"TENNIS"}</span>}
      {screen==="nfl"&&<span className="pill-nfl">{nflSeasonMode?"NFL IN-SEASON":"NFL FUTURES"}</span>}
      {screen==="nflplayer"&&nflPd&&<span className="pill-nfl">{selectedNflPlayer?.toUpperCase()}</span>}
      {screen==="f1"&&<span className="pill-f1">F1 2026</span>}
      {screen==="nba"&&<span className="pill-nba">NBA PROPS</span>}
      {screen==="player"&&<span className="pill-tag">{selectedPlayer?.toUpperCase()}</span>}
      {screen==="matchup"&&selectedMatchup&&(selectedMatchup.league?.includes("NFL")?<span className="pill-nfl">{selectedMatchup.league}</span>:<span className="pill-tag">{selectedMatchup.network?.toUpperCase()||selectedMatchup.league}</span>)}
      {screen==="ask"&&<span className="pill-tag">UR TAKE</span>}
      {screen==="home"&&<span className="pill-live">LIVE</span>}
    </>
  );

  // ── NBA top players from live stats (sorted by pts) ────────────────────────
  const nbaTopPlayers = useMemo(() => {
    const stats = nbaData?.playerStats || [];
    return stats.slice(0, 20);
  }, [nbaData]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{css}</style>
      <div className="app">

        <header className="hdr">
          <div className="wordmark"><span className="logo-under">Under</span><span className="logo-review">Review</span></div>
          <div className="header-right">{headerPill}</div>
        </header>

        {/* ══ HOME ══ */}
        {screen==="home"&&(
          <main className="screen">
            <section className="hero">
              <div className="hero-title">What do you want to know?</div>
              <div className="hero-sub">Live tennis, NBA props, NFL, and F1 — all in one place.</div>
            </section>

            <AskBar inputRef={homeInputRef} value={homeInput} onChange={setHomeInput} onSubmit={submitHome} placeholder="Ask UR TAKE anything..." {...askBarCommon} />

            <section className="section">
              <div className="section-label">TRENDING ASKS</div>
              <div className="q-list">
                {dynamicHomeQuestions.map(q=>(
                  <button key={q.id} className="q-card" onClick={()=>firePrompt(q.prompt)}>
                    <div className="q-top"><div className="q-accent" style={{background:q.color}}/><div className="q-text">{q.text}</div></div>
                  </button>
                ))}
              </div>
            </section>

            <section className="section">
              <div className="section-label">MATCHUPS TO TAP INTO</div>
              <div className="matchup-list">
                {homeCards.map(m=>(
                  <div key={m.id} className="matchup-card" onClick={()=>openMatchup(m)}>
                    <div className="matchup-top"><div className="matchup-league" style={{color:m.leagueColor}}>{m.homeCategory||m.league}</div><div className="matchup-time">{m.time}</div></div>
                    <div className="matchup-body"><div className="matchup-title">{m.title}</div><div className="matchup-meta">{m.network}</div><div className="matchup-blurb">{m.blurb}</div></div>
                  </div>
                ))}
              </div>
            </section>

            <section className="section">
              <div className="section-label">SPORTS</div>
              <div className="sport-chips">
                <button className="sport-chip active" onClick={goTennis}>TENNIS</button>
                <button className="sport-chip nfl-chip active" onClick={goNfl}>{nflSeasonMode?"NFL IN-SEASON":"NFL"}</button>
                <button className="sport-chip f1-chip active" onClick={goF1}>F1</button>
                <button className="sport-chip nba-chip active" onClick={goNba}>NBA</button>
              </div>
            </section>
            <div className="page-spacer"/>
          </main>
        )}

        {/* ══ TENNIS ══ */}
        {screen==="tennis"&&(
          <main className="screen">
            <div className="tour-banner">
              <div className="banner-title">{tennisBoardHeadline}</div>
              <div className="banner-sub">{tennisBoardSubline}</div>
              <div className="banner-note">{liveMatches.length>0?`${tennisLiveMatches.length} live · ${tennisUpcomingMatches.length} upcoming${activeTournamentMatches.length?` · ${activeTournamentMatches.length} in active tournament focus`:""}`:"No current matches loaded right now."}</div>
            </div>

            <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:14,padding:14,marginBottom:16}}>
              <div style={{fontSize:10,color:"var(--cyan-bright)",fontFamily:"var(--mono-font)",letterSpacing:2,marginBottom:8,textTransform:"uppercase"}}>Ask Anything — Tennis</div>
              <AskBar inputRef={tennisInputRef} value={tennisInput} onChange={setTennisInput} onSubmit={()=>submitTennis()} placeholder="Best tennis bet tonight? Which match is mispriced? Best live angle?" {...askBarCommon} />
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {["Best tennis bets tonight?","Which tennis match is mispriced?","Best live tennis angle right now?","What futures still have value?"].map(q=>(
                  <button key={q} className="quick-btn" onClick={()=>submitTennis(q)} style={{fontSize:11}}>{q}</button>
                ))}
              </div>
            </div>

            <ChatThread msgs={tennisMsgs}/>

            <div className="section-divider">{activeTournamentMatches.length>0&&context?.currentTournament?.name?`${context.currentTournament.name} Board`:"Live + Upcoming Matches"}</div>

            {tennisLoading?(
              <div className="loading-state"><div className="loading-text">LOADING TENNIS BOARD...</div></div>
            ):liveMatches.length>0?(
              <div className="matchup-list">
                {(activeTournamentMatches.length>0?activeTournamentMatches:liveMatches).map(m=>(
                  <div key={m.id} className="matchup-card" onClick={()=>openMatchup(m)}>
                    <div className="matchup-top"><div className="matchup-league" style={{color:m.leagueColor}}>{m.league}</div><div className="matchup-time">{String(m?.raw?.live||"0")==="1"?"LIVE":(m.raw?.status||m.time)}</div></div>
                    <div className="matchup-body"><div className="matchup-title">{m.title}</div><div className="matchup-meta">{m.network}{m.raw?.round?` · ${m.raw.round}`:""}</div><div className="matchup-blurb">{m.raw?.score&&m.raw.score!=="-"?`Score: ${m.raw.score}. `:""}{m.blurb}</div></div>
                  </div>
                ))}
                {activeTournamentMatches.length>0&&liveMatches.length>activeTournamentMatches.length&&(
                  <>
                    <div className="section-divider">Other Tour Matches</div>
                    {liveMatches.filter(m=>!activeTournamentMatches.some(x=>x.id===m.id)).map(m=>(
                      <div key={m.id} className="matchup-card" onClick={()=>openMatchup(m)}>
                        <div className="matchup-top"><div className="matchup-league" style={{color:m.leagueColor}}>{m.league}</div><div className="matchup-time">{String(m?.raw?.live||"0")==="1"?"LIVE":(m.raw?.status||m.time)}</div></div>
                        <div className="matchup-body"><div className="matchup-title">{m.title}</div><div className="matchup-meta">{m.network}{m.raw?.round?` · ${m.raw.round}`:""}</div><div className="matchup-blurb">{m.raw?.score&&m.raw.score!=="-"?`Score: ${m.raw.score}. `:""}{m.blurb}</div></div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            ):(
              <div className="loading-state"><div className="loading-text">NO CONFIRMED TENNIS MATCHES FOUND</div></div>
            )}

            {context?.ace_props&&(
              <>
                <div className="section-divider">Prop Guide</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  {Object.entries(context.ace_props).map(([name,data])=>(
                    <div key={name} className="matchup-card" onClick={()=>submitTennis(`Tell me about ${name} ace props right now`)}>
                      <div className="matchup-body"><div className="matchup-title" style={{fontSize:15}}>{name}</div><div className="matchup-meta">ACES</div><div className="matchup-blurb">{data.avg_aces_hard} avg · {data.ace_rate}</div><div className="matchup-blurb" style={{marginTop:6}}>{data.note||""}</div></div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {players&&(
              <>
                <div className="section-divider">ATP Top 25</div>
                {ATP_PLAYERS.map((name,idx)=><TennisPlayerCard key={name} name={name} idx={idx} tour="atp"/>)}
                <div className="section-divider">WTA Top 24</div>
                {WTA_PLAYERS.map((name,idx)=><TennisPlayerCard key={name} name={name} idx={idx} tour="wta"/>)}
              </>
            )}
            <div className="page-spacer"/>
          </main>
        )}

        {/* ══ NFL ══ */}
        {screen==="nfl"&&(
          <main className="screen">
            <div className="nfl-banner">
              <div className="banner-title">{nflSeasonMode?"NFL In-Season Board":"NFL Futures Board"}</div>
              <div className="banner-sub">{nflSeasonMode?"WEEKLY PROPS · USAGE · PLAYER ANGLES":"FUTURES · PLAYER STATS · BETTING ANGLES"}</div>
              <div className="banner-note">{nflSeasonMode?"Current weekly props, role changes, usage shifts, and market edges.":"Skill positions database with per-game stats, TD rates, prop floors and ceilings."}</div>
            </div>
            <div className="nfl-ask-shell">
              <div className="nfl-ask-label">Ask Anything — NFL</div>
              <AskBar inputRef={nflInputRef} value={nflInput} onChange={setNflInput} onSubmit={()=>submitNfl()} placeholder={nflSeasonMode?"Best WR prop this week? Biggest role change?":"Which RB leads TDs in 2026? Best future?"} btnColor="var(--nfl)" {...askBarCommon} />
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {(nflSeasonMode?["Best WR props this week?","Biggest usage jump?","Best TD scorer angle?","Which line is stale?"]:["Best WR future?","Top TE by volume?","Fade or take Kelce?","Best RB rushing future?"]).map(q=>(
                  <button key={q} className="quick-btn" onClick={()=>submitNfl(q)} style={{fontSize:11}}>{q}</button>
                ))}
              </div>
            </div>
            <ChatThread msgs={nflMsgs}/>
            <div className="section-divider">{nflSeasonMode?"Top Weekly Leans":"Top Future Leans"}</div>
            {NFL_PROP_GUIDE.map(prop=>(
              <div key={`${prop.player}-${prop.propType}`} className="nfl-prop-card" onClick={()=>submitNfl(`Tell me about ${prop.player} ${prop.propType} prop — line is ${prop.line}`)}>
                <div className="nfl-prop-top"><div className="nfl-prop-player">{prop.player}</div><div className="nfl-prop-type">{prop.propType}</div></div>
                <div className="nfl-prop-line">Line: {prop.line} · Floor {prop.floor} / Ceil {prop.ceil}</div>
                <div className={`nfl-prop-lean ${prop.leanClass}`}>{prop.lean}</div>
              </div>
            ))}
            <div className="section-divider">Player Database</div>
            <div className="pos-tabs">{NFL_POSITIONS.map(pos=><button key={pos} className={`pos-tab${nflPosFilter===pos?" active":""}`} onClick={()=>setNflPosFilter(pos)}>{pos}</button>)}</div>
            {filteredNflPlayers.map(([name,player])=><NflPlayerCard key={name} name={name} player={player}/>)}
            <div className="page-spacer"/>
          </main>
        )}

        {/* ══ NFL PLAYER DETAIL ══ */}
        {screen==="nflplayer"&&nflPd&&(
          <main className="screen">
            <button className="detail-back" onClick={()=>{setScreen("nfl");setSelectedNflPlayer(null);}}>← BACK</button>
            <div className="detail-card">
              <div className="nfl-detail-head"><div className="nfl-detail-pos">{nflPd.pos} · {nflPd.team} · {nflPd.tier}</div><div className="nfl-detail-name">{selectedNflPlayer}</div><div className="nfl-detail-sub">{nflPd.ydsPg} yds/g · {nflPd.rec2025.g} games played</div></div>
              <div className="nfl-detail-grid">
                <div className="nfl-detail-stat"><div className="nfl-detail-label">YDS/G</div><div className="nfl-detail-value" style={{color:"var(--nfl)"}}>{nflPd.ydsPg}</div></div>
                <div className="nfl-detail-stat"><div className="nfl-detail-label">TDs</div><div className="nfl-detail-value" style={{color:"var(--gold)"}}>{nflPd.rec2025.td}</div></div>
                <div className="nfl-detail-stat"><div className="nfl-detail-label">YPR</div><div className="nfl-detail-value">{nflPd.rec2025.ypr}</div></div>
                {nflPd.rec2025.tgt&&<div className="nfl-detail-stat"><div className="nfl-detail-label">TARGETS</div><div className="nfl-detail-value">{nflPd.rec2025.tgt}</div></div>}
                {nflPd.rec2025.recPg&&<div className="nfl-detail-stat"><div className="nfl-detail-label">REC/G</div><div className="nfl-detail-value">{nflPd.rec2025.recPg}</div></div>}
                <div className="nfl-detail-stat"><div className="nfl-detail-label">GAMES</div><div className="nfl-detail-value">{nflPd.rec2025.g}</div></div>
              </div>
              <div className="nfl-detail-section">
                <div className="nfl-detail-section-label">Prop Breakdown</div>
                <div className="nfl-prop-block">
                  {nflPd.props.recYds&&(<><div className="nfl-prop-row"><span className="nfl-prop-name">REC YDS</span><span className="nfl-prop-val" style={{color:"var(--muted)"}}>Floor {nflPd.props.recYds.floor} / Ceil {nflPd.props.recYds.ceil}</span></div><div className="nfl-prop-row"><span className="nfl-prop-name">LEAN</span><span className={`nfl-prop-val ${nflPd.props.recYds.lean?.includes("OVER")?"lean-over":"lean-neutral"}`}>{nflPd.props.recYds.lean}</span></div></>)}
                  {nflPd.props.rec&&<div className="nfl-prop-row"><span className="nfl-prop-name">CATCHES</span><span className={`nfl-prop-val ${nflPd.props.rec.lean?.includes("OVER")?"lean-over":"lean-neutral"}`}>{nflPd.props.rec.lean}</span></div>}
                  {nflPd.props.td&&<div className="nfl-prop-row"><span className="nfl-prop-name">TD SCORER</span><span className={`nfl-prop-val ${nflPd.props.td.lean?.includes("OVER")?"lean-over":nflPd.props.td.lean?.includes("FADE")?"lean-fade":"lean-neutral"}`}>{nflPd.props.td.lean}</span></div>}
                </div>
              </div>
              <div className="nfl-detail-section"><div className="nfl-detail-section-label">Situation</div><div className="nfl-situation">{nflPd.situation}</div></div>
              <div className="nfl-detail-section"><div className="nfl-detail-section-label">Betting Angles</div><div className="nfl-betting-angles">{nflPd.bettingAngles.map((a,i)=><div key={i} className="nfl-angle-item"><div className="nfl-angle-dot"/><div>{a}</div></div>)}</div></div>
            </div>
            <AskBar inputRef={nflPlayerInputRef} value={nflInput} onChange={setNflInput} onSubmit={()=>submitNfl()} placeholder={`Ask about ${selectedNflPlayer}...`} btnColor="var(--nfl)" {...askBarCommon}/>
          </main>
        )}

        {/* ══ F1 ══ */}
        {screen==="f1"&&(
          <main className="screen">
            <div className="f1-banner">
              <div className="banner-title">Formula 1 — 2026</div>
              <div className="banner-sub">DRIVER STANDINGS · RACE CALENDAR · BETTING ANGLES</div>
              <div className="banner-note">{f1Data?.standings?.length ? `${f1Data.standings.length} drivers · ${f1Data.schedule?.races?.length||0} races` : "Loading F1 data..."}</div>
            </div>

            <div className="f1-ask-shell">
              <div className="f1-ask-label">Ask Anything — F1</div>
              <AskBar inputRef={f1InputRef} value={f1Input} onChange={setF1Input} onSubmit={()=>submitF1()} placeholder="Who wins the next Grand Prix? Best F1 future?" btnColor="var(--f1)" {...askBarCommon} />
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {["Who wins the next Grand Prix?","Best F1 future right now?","Is Antonelli for real?","Hamilton podium value?"].map(q=>(
                  <button key={q} className="quick-btn" onClick={()=>submitF1(q)} style={{fontSize:11}}>{q}</button>
                ))}
              </div>
            </div>

            <ChatThread msgs={f1Msgs}/>

            {f1Loading ? (
              <div className="loading-state"><div className="loading-text">LOADING F1 DATA...</div></div>
            ) : (
              <>
                {f1Data?.standings?.length > 0 && (
                  <>
                    <div className="section-divider">Driver Standings</div>
                    {f1Data.standings.map((d,i) => (
                      <div key={d.driver_number||i} className="f1-standing-card" onClick={()=>submitF1(`Tell me about ${d.full_name||d.name_acronym} — form, pace, and best betting angle`)}>
                        <div className="f1-pos">P{d.position||i+1}</div>
                        <div style={{width:4,height:30,borderRadius:2,background:`#${d.team_colour||'666'}`,flexShrink:0}}/>
                        <div className="f1-driver-info">
                          <div className="f1-driver-name">{d.full_name||d.name_acronym||`#${d.driver_number}`}</div>
                          <div className="f1-driver-team">{d.team_name||"—"}</div>
                        </div>
                        <div className="f1-pts"><span className="f1-pts-num">{d.points ?? "—"}</span><span className="f1-pts-label">PTS</span></div>
                      </div>
                    ))}
                  </>
                )}

                {f1Data?.schedule?.races?.length > 0 && (
                  <>
                    <div className="section-divider">Race Calendar</div>
                    {f1Data.schedule.races.filter(r => r.is_next || new Date(r.date_end) >= new Date(Date.now() - 7*86400000)).slice(0,10).map(race => {
                      const d = race.date_start ? new Date(race.date_start) : null;
                      const dateStr = d ? d.toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "";
                      return (
                        <div key={race.meeting_key} className={`f1-race-card${race.is_next?" next-race":""}`}>
                          <div className="f1-race-top">
                            <div className="f1-race-name">{race.meeting_name}</div>
                            <div>{race.is_next && <span className="f1-race-badge">NEXT</span>}</div>
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <div className="f1-race-location">{race.location} · {race.circuit_short_name}</div>
                            <div className="f1-race-date">{dateStr}</div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
            <div className="page-spacer"/>
          </main>
        )}

        {/* ══ NBA ══ */}
        {screen==="nba"&&(
          <main className="screen">
            <div className="nba-banner">
              <div className="banner-title">NBA — 2024-25</div>
              <div className="banner-sub">PLAYER PROPS · GAME TOTALS · BETTING ANGLES</div>
              <div className="banner-note">
                {nbaData?.games?.length
                  ? `${nbaData.games.length} games today · ${nbaData.playerStats?.length||0} players tracked`
                  : nbaLoading ? "Loading NBA data..." : "80-player prop database loaded"}
              </div>
            </div>

            <div className="nba-ask-shell">
              <div className="nba-ask-label">Ask Anything — NBA Props</div>
              <AskBar inputRef={nbaInputRef} value={nbaInput} onChange={setNbaInput} onSubmit={()=>submitNba()} placeholder="Jokic PRA over tonight? Best prop this slate?" btnColor="var(--nba)" {...askBarCommon} />
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {["Best prop on tonight's slate?","Safest PRA bet tonight?","Who has a usage spike today?","Best game total play?"].map(q=>(
                  <button key={q} className="quick-btn" onClick={()=>submitNba(q)} style={{fontSize:11}}>{q}</button>
                ))}
              </div>
            </div>

            <ChatThread msgs={nbaMsgs}/>

            {nbaLoading ? (
              <div className="loading-state"><div className="loading-text">LOADING NBA DATA...</div></div>
            ) : (
              <>
                {nbaData?.games?.length > 0 && (
                  <>
                    <div className="section-divider">Today's Games</div>
                    {nbaData.games.map((g,i) => (
                      <div key={g.gameId||i} className="nba-game-card" onClick={()=>submitNba(`Best prop angle for ${g.awayTeam.tricode} vs ${g.homeTeam.tricode} tonight?`)}>
                        <div className="nba-game-top">
                          <div className="nba-game-teams">{g.awayTeam.tricode} vs {g.homeTeam.tricode}</div>
                          <div>{g.statusCode===2 ? <span className="nba-live-badge">● LIVE Q{g.period}</span> : <span className="nba-game-status">{g.status}</span>}</div>
                        </div>
                        {g.statusCode===2 && (
                          <div className="nba-game-score">{g.awayTeam.score} — {g.homeTeam.score}</div>
                        )}
                        <div className="nba-game-records">{g.awayTeam.wins}-{g.awayTeam.losses} vs {g.homeTeam.wins}-{g.homeTeam.losses}</div>
                      </div>
                    ))}
                  </>
                )}

                <div className="section-divider">Top Prop Players</div>
                {nbaTopPlayers.length > 0 ? nbaTopPlayers.map((p,i) => (
                  <div key={p.playerId||i} className="nba-player-card" onClick={()=>submitNba(`Best prop angle for ${p.name} tonight? Give me the PRA line, floor, ceiling, and lean.`)}>
                    <div className="nba-player-rank">#{i+1}</div>
                    <div className="nba-player-info">
                      <div className="nba-player-name">{p.name}</div>
                      <div className="nba-player-meta">{p.team} · {p.min}min</div>
                    </div>
                    <div className="nba-player-stats">
                      <span className="nba-pts">{p.pts}</span>
                      <span className="nba-pts-label">{p.reb}r · {p.ast}a</span>
                    </div>
                  </div>
                )) : (
                  // Fallback: show curated profiles when live stats unavailable
                  Object.entries(NBA_PLAYERS).filter(([,p])=>p.tier==="ELITE"||p.tier==="STAR").slice(0,15).map(([name,p],i) => (
                    <div key={name} className="nba-player-card" onClick={()=>submitNba(`Best prop angle for ${name} tonight? Give me the PRA line, floor, ceiling, and lean.`)}>
                      <div className="nba-player-rank">#{i+1}</div>
                      <div className="nba-player-info">
                        <div className="nba-player-name">{name}</div>
                        <div className="nba-player-meta">{p.team} · {p.tier}</div>
                      </div>
                      <div className="nba-player-stats">
                        <span className="nba-pts">{p.pts}</span>
                        <span className="nba-pts-label">{p.reb}r · {p.ast}a</span>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
            <div className="page-spacer"/>
          </main>
        )}

        {/* ══ MATCHUP DETAIL ══ */}
        {screen==="matchup"&&selectedMatchup&&(
          <main className="screen">
            <button className="detail-back" onClick={()=>{setSelectedMatchup(null);setScreen(selectedMatchup?.league?.includes("NFL")?"nfl":"tennis");}}>← BACK</button>
            <div className="detail-card">
              <div className="detail-head"><div className="detail-league" style={{color:selectedMatchup.leagueColor}}>{selectedMatchup.league}</div><div className="detail-title">{selectedMatchup.title}</div><div className="detail-sub">{selectedMatchup.time} · {selectedMatchup.network}</div></div>
              <div className="what-matters"><div className="wm-label">Match Snapshot</div><div className="wm-text">{selectedMatchup.whatMatters||"Ask for the side, total, props, or live angle."}</div></div>
              {selectedMatchup.stats&&<div className="mini-grid">{selectedMatchup.stats.map(s=><div key={s.label} className="mini-stat"><div className="mini-label">{s.label}</div><div className="mini-value">{s.value}</div></div>)}</div>}
              {selectedMatchup.quickHitters&&<div className="quick-hitters">{selectedMatchup.quickHitters.map(q=><button key={q} className="quick-btn" onClick={()=>submitMatchup(q)}>{q}</button>)}</div>}
            </div>
            <ChatThread msgs={matchupMsgs}/>
            <AskBar inputRef={matchupInputRef} value={matchupInput} onChange={setMatchupInput} onSubmit={()=>submitMatchup()} placeholder={`Ask about ${selectedMatchup.title}...`} {...askBarCommon}/>
          </main>
        )}

        {/* ══ TENNIS PLAYER DETAIL ══ */}
        {screen==="player"&&pd&&(
          <main className="screen">
            <button className="detail-back" onClick={()=>setScreen("tennis")}>← BACK</button>
            <div className="detail-card">
              <div className="detail-head"><div className="detail-league" style={{color:"var(--cyan-bright)"}}>TENNIS PLAYER PROFILE</div><div className="detail-title">{selectedPlayer}</div><div className="detail-sub">{Array.isArray(pd.style)?pd.style.join(", ").replaceAll("_"," "):pd.style} · Elo {pd.elo}</div></div>
              <div className="what-matters"><div className="wm-label">Surface Notes</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:8}}><div className="mini-stat"><div className="mini-label">HARD</div><div className="mini-value" style={{color:"var(--cyan-bright)"}}>•</div><div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>{pd.surfaceNote?.hard||"—"}</div></div><div className="mini-stat"><div className="mini-label">CLAY</div><div className="mini-value" style={{color:"var(--gold)"}}>•</div><div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>{pd.surfaceNote?.clay||"—"}</div></div><div className="mini-stat"><div className="mini-label">GRASS</div><div className="mini-value" style={{color:"var(--green)"}}>•</div><div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>{pd.surfaceNote?.grass||"—"}</div></div></div></div>
              <div style={{padding:"0 14px 14px"}}><div className="wm-label" style={{marginBottom:8}}>2026 Form</div><div style={{background:"var(--surface-2)",borderRadius:10,padding:10,fontSize:13,color:"var(--soft)",lineHeight:1.5}}>{pd.record2026||"—"}</div></div>
              <div className="what-matters" style={{paddingTop:0}}><div className="wm-label">Serve</div><div style={{fontSize:13,color:"var(--soft)",lineHeight:1.5}}>{formatServeStats(pd.serveStats)}</div></div>
              <div className="what-matters" style={{paddingTop:0}}><div className="wm-label">Return</div><div style={{fontSize:13,color:"var(--soft)",lineHeight:1.5}}>{formatReturnStats(pd.returnStats)}</div></div>
              <div className="what-matters" style={{paddingTop:0}}><div className="wm-label">Overall</div><div style={{fontSize:13,color:"var(--soft)",lineHeight:1.5}}>{formatOverallStats(pd.overallStats)}</div></div>
              {pd.miamiNote&&<div className="what-matters" style={{paddingTop:0}}><div className="wm-label" style={{color:"var(--mag)"}}>Tournament Note</div><div style={{fontSize:13,color:"var(--soft)",lineHeight:1.55}}>{pd.miamiNote}</div></div>}
              {pd.fullNote&&<div className="what-matters" style={{paddingTop:0}}><div className="wm-label">UR Take</div><div style={{fontSize:13,color:"var(--soft)",lineHeight:1.55}}>{pd.fullNote}</div></div>}
            </div>
            <AskBar inputRef={playerInputRef} value={tennisInput} onChange={setTennisInput} onSubmit={()=>submitTennis()} placeholder={`Ask about ${selectedPlayer}...`} {...askBarCommon}/>
          </main>
        )}

        {/* ══ ASK ══ */}
        {screen==="ask"&&(
          <main className="screen">
            <section className="hero" style={{paddingTop:4}}><div className="hero-title">UR TAKE</div><div className="hero-sub">Ask in plain English. Paste a screenshot. Get weirdly specific.</div></section>
            <AskBar inputRef={askInputRef} value={askInput} onChange={setAskInput} onSubmit={submitAsk} placeholder="What do you want to know?" {...askBarCommon}/>
            {askMsgs.length===0?(
              <section className="section"><div className="section-label">TRY ONE</div><div className="q-list">{dynamicHomeQuestions.map(q=><button key={q.id} className="q-card" onClick={()=>firePrompt(q.prompt)}><div className="q-top"><div className="q-accent" style={{background:q.color}}/><div className="q-text">{q.text}</div></div></button>)}</div></section>
            ):(
              <ChatThread msgs={askMsgs}/>
            )}
          </main>
        )}

        {/* ══ NAV ══ */}
        <nav className="bottom-nav">
          <button className={`nav-btn${tab==="home"&&screen==="home"?" active":""}`} onClick={goHome}><span>Home</span></button>
          <button className={`nav-btn${tab==="tennis"?" tennis-active":""}`} onClick={goTennis}><span>Tennis</span></button>
          <button className={`nav-btn${tab==="nfl"?" nfl-active":""}`} onClick={goNfl}><span>NFL</span></button>
          <button className={`nav-btn${tab==="f1"?" f1-active":""}`} onClick={goF1}><span>F1</span></button>
          <button className={`nav-btn${tab==="nba"?" nba-active":""}`} onClick={goNba}><span>NBA</span></button>
          <button className={`nav-btn${tab==="ask"?" active":""}`} onClick={goAsk}><span>Ask</span></button>
        </nav>

      </div>
    </>
  );
}
