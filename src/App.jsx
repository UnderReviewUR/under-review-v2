import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";

// ── Inlined AskBar component ──────────────────────────────────────────────────
const AskBar = memo(function AskBar({
  inputRef, fileInputRef, value, onChange, onSubmit,
  placeholder, btnColor, pastedImage, clearImage, isAsking, processImageFile,
}) {
  const handleKeyDown = useCallback((e) => { if (e.key === "Enter") onSubmit(); }, [onSubmit]);
  const handleFile = useCallback((e) => { if (e.target.files?.[0]) processImageFile(e.target.files[0]); }, [processImageFile]);
  return (
    <div className="ask-wrap">
      <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>
      <div className="ask-row">
        <div className="ask-col">
          {pastedImage && (
            <div className="ask-img-preview">
              <img src={pastedImage.previewUrl} className="ask-img-thumb" alt=""/>
              <button onClick={clearImage} type="button" className="ask-img-remove">✕ Remove</button>
            </div>
          )}
          <input ref={inputRef} className="ask-bar" value={value}
            onChange={(e) => onChange(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={pastedImage ? "Ask about this image..." : placeholder} disabled={isAsking}/>
          {!pastedImage && <div className="ask-hint">PASTE IMAGE OR TAP ATTACH</div>}
        </div>
        <button className={`attach-btn${pastedImage ? " has-img" : ""}`}
          onClick={() => fileInputRef.current?.click()} type="button">📎</button>
        <button className="send-btn" style={btnColor ? {background:btnColor} : undefined}
          onClick={onSubmit} disabled={isAsking} type="button">➤</button>
      </div>
    </div>
  );
});

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
    --mlb:#1DB954;
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
    --bottom-nav-height:48px;
  }

  *{box-sizing:border-box;margin:0;padding:0;}
  html,body,#root{height:100%;}
  body{background:var(--bg);color:var(--text);font-family:var(--body-font);min-height:100vh;-webkit-font-smoothing:antialiased;}

  .app{min-height:100vh;background:var(--bg);color:var(--text);display:flex;flex-direction:column;}

  .hdr{padding:10px 14px;border-bottom:1px solid var(--border);background:var(--header-bg);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:30;backdrop-filter:blur(10px);gap:14px;}
  .wordmark{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;min-width:fit-content;cursor:pointer;}
  .logo-under{display:block;font-family:var(--mono-font);font-size:9px;letter-spacing:4px;color:rgba(255,255,255,.45);margin-bottom:2px;text-transform:uppercase;}
  .logo-review{display:block;font-family:var(--display-font);font-size:26px;letter-spacing:2px;line-height:1;background:linear-gradient(90deg,var(--cyan-bright),var(--magenta));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
  .header-right{display:flex;align-items:center;gap:10px;min-width:0;}
  .pill-tag,.pill-live,.pill-nfl,.pill-f1,.pill-nba,.pill-tennis{font-family:var(--mono-font);font-size:9px;padding:3px 8px;border-radius:999px;white-space:nowrap;}
  .pill-tag{color:var(--magenta);border:1px solid rgba(255,45,107,.25);background:rgba(255,45,107,.06);}
  .pill-live{color:var(--cyan-bright);border:1px solid rgba(0,245,233,.25);background:rgba(0,245,233,.06);}
  .pill-tennis{color:#FFE600;border:1px solid rgba(255,230,0,.35);background:rgba(255,230,0,.06);}
  .pill-nfl{color:#4A90D9;border:1px solid rgba(74,144,217,.3);background:rgba(74,144,217,.06);}
  .pill-f1{color:var(--f1);border:1px solid rgba(225,6,0,.25);background:rgba(225,6,0,.06);}
  .pill-nba{color:#FF6B00;border:1px solid rgba(255,107,0,.3);background:rgba(255,107,0,.06);}
  .pill-mlb{color:#1DB954;border:1px solid rgba(29,185,84,.3);background:rgba(29,185,84,.06);}
  .hdr-tagline{font-family:var(--mono-font);font-size:10px;color:rgba(255,255,255,.45);letter-spacing:0.5px;white-space:nowrap;}

  .screen{flex:1;overflow-y:auto;padding:10px 12px;padding-bottom:70px;}
  .screen.has-msgs{padding-bottom:140px;}
  .docked-bar{position:fixed;left:0;right:0;bottom:var(--bottom-nav-height);background:var(--nav-bg);border-top:1px solid var(--border);padding:8px 12px;z-index:25;backdrop-filter:blur(12px);}
  .docked-bar-label{font-family:var(--mono-font);font-size:9px;letter-spacing:2px;margin-bottom:6px;text-transform:uppercase;opacity:.7;}
  .hero{padding:6px 2px 8px;text-align:center;}
  .hero-title{font-family:var(--display-font);font-size:28px;letter-spacing:1px;line-height:1;margin-bottom:6px;}
  .hero-sub{color:var(--soft);font-size:13px;line-height:1.5;max-width:560px;margin:0 auto;}

  /* ── Home sport rail ── */
  .sport-rail{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:0 0 2px;margin-bottom:14px;}
  .sport-rail::-webkit-scrollbar{display:none;}
  .sport-pill{flex-shrink:0;border-radius:999px;padding:8px 20px;font-family:var(--display-font);font-size:15px;letter-spacing:2px;cursor:pointer;border:1.5px solid;transition:all .15s;background:transparent;}
  .sport-pill-tennis{color:#FFE600;border-color:#FFE600;}
  .sport-pill-mlb{color:#1DB954;border-color:#1DB954;}
  .sport-pill-nfl{color:#4A90D9;border-color:#4A90D9;}
  .sport-pill-f1{color:#E10600;border-color:#E10600;}
  .sport-pill-nba{color:#FF6B00;border-color:#FF6B00;}
  .sport-pill:active{opacity:.7;transform:scale(.97);}

  /* ── Live game ticker ── */
  .game-ticker{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin-bottom:16px;}
  .game-ticker::-webkit-scrollbar{display:none;}
  .ticker-card{flex-shrink:0;background:var(--surface);border-radius:10px;padding:8px 12px;cursor:pointer;min-width:120px;border:1px solid var(--border);}
  .ticker-card.live{border-color:rgba(0,230,118,.35);}
  .ticker-status{font-family:var(--mono-font);font-size:8px;letter-spacing:1.5px;margin-bottom:3px;}
  .ticker-teams{font-size:13px;font-weight:600;color:var(--text);}
  .ticker-score{font-family:var(--mono-font);font-size:11px;color:var(--soft);margin-top:2px;}

  /* ── Ask cards (replace q-list) ── */
  .ask-cards{display:flex;flex-direction:column;gap:6px;margin-bottom:16px;}
  .ask-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 14px;cursor:pointer;display:flex;align-items:center;gap:10px;transition:border-color .15s;}
  .ask-card:active{opacity:.8;}
  .ask-card-bar{width:3px;border-radius:2px;flex-shrink:0;align-self:stretch;min-height:18px;}
  .ask-card-text{font-size:14px;color:var(--soft);line-height:1.35;}

  /* ── Spotlight card (replaces matchup cards) ── */
  .spotlight-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;cursor:pointer;margin-bottom:8px;transition:border-color .15s;}
  .spotlight-card:active{opacity:.85;}
  .spotlight-top{padding:10px 14px 0;display:flex;align-items:center;justify-content:space-between;}
  .spotlight-sport{font-family:var(--mono-font);font-size:9px;letter-spacing:2px;font-weight:500;}
  .spotlight-time{font-family:var(--mono-font);font-size:9px;color:var(--muted);}
  .spotlight-title{padding:6px 14px 4px;font-size:16px;font-weight:700;color:var(--text);line-height:1.3;}
  .spotlight-edge{padding:0 14px 12px;font-size:12px;color:var(--muted);line-height:1.4;}

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

  .section{margin-top:10px;}
  .section-label{font-family:var(--mono-font);font-size:9px;letter-spacing:2px;color:var(--muted);margin-bottom:6px;text-transform:uppercase;}

  .q-list{display:flex;flex-direction:column;gap:4px;}
  .q-card{width:100%;text-align:left;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:9px 10px;cursor:pointer;color:var(--text);transition:all .18s ease;}
  .q-card:hover{border-color:var(--cyan-bright);transform:translateY(-1px);}
  .q-top{display:flex;align-items:center;gap:8px;}
  .q-accent{width:3px;height:22px;border-radius:2px;flex-shrink:0;}
  .q-text{font-size:13px;line-height:1.35;color:var(--soft);}

  .tour-banner,.nfl-banner{border-radius:12px;padding:12px;margin-bottom:10px;border:1px solid var(--border);background:var(--surface);}
  .tour-banner{background:linear-gradient(135deg,rgba(0,245,233,.08),rgba(245,200,66,.06));}
  .nfl-banner{background:linear-gradient(135deg,rgba(255,107,53,.08),rgba(255,45,107,.05));}
  .banner-title{font-family:var(--display-font);font-size:22px;letter-spacing:1px;margin-bottom:2px;}
  .banner-sub{font-family:var(--mono-font);font-size:9px;color:var(--muted);letter-spacing:2px;margin-bottom:4px;text-transform:uppercase;}
  .banner-note{font-size:12px;color:var(--soft);line-height:1.4;}

  .matchup-list{display:flex;flex-direction:column;gap:6px;}
  .matchup-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;overflow:hidden;cursor:pointer;transition:all .18s ease;position:relative;}
  .matchup-card:hover{border-color:var(--cyan-bright);transform:translateY(-1px);}
  .matchup-top{padding:7px 10px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.01);}
  .matchup-league{font-family:var(--mono-font);font-size:9px;letter-spacing:2px;text-transform:uppercase;}
  .matchup-time{font-family:var(--mono-font);font-size:9px;color:var(--muted);}
  .matchup-body{padding:8px 10px;}
  .matchup-title{font-size:14px;font-weight:600;margin-bottom:2px;color:var(--text);}
  .matchup-meta{font-size:11px;color:var(--muted);margin-bottom:4px;}
  .matchup-blurb{font-size:12px;color:var(--soft);line-height:1.45;}

  .sport-chips{display:grid;grid-template-columns:1fr 1fr;gap:6px;}
  .sport-chip{border:1px solid var(--border-2);background:var(--surface);color:var(--soft);border-radius:12px;padding:16px 12px;font-family:var(--display-font);font-size:18px;letter-spacing:2px;cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center;}
  .sport-chip.active,.sport-chip:hover{border-color:#FFE600;color:#FFE600;background:rgba(255,230,0,.06);}
  .sport-chip.nfl-chip.active,.sport-chip.nfl-chip:hover{border-color:#4A90D9;color:#4A90D9;background:rgba(74,144,217,.06);}
  .sport-chip.f1-chip.active,.sport-chip.f1-chip:hover{border-color:var(--f1);color:var(--f1);background:rgba(225,6,0,.06);}
  .sport-chip.nba-chip.active,.sport-chip.nba-chip:hover{border-color:#FF6B00;color:#FF6B00;background:rgba(255,107,0,.06);}
  .sport-chip.mlb-chip.active,.sport-chip.mlb-chip:hover{border-color:#1DB954;color:#1DB954;background:rgba(29,185,84,.06);}

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

  .bottom-nav{position:fixed;left:0;right:0;bottom:0;background:var(--nav-bg);border-top:1px solid var(--border);display:grid;grid-template-columns:repeat(8,1fr);padding:2px 0 max(6px,env(safe-area-inset-bottom));z-index:30;backdrop-filter:blur(10px);}
  .nav-btn{background:none;border:none;color:var(--muted);font-family:var(--mono-font);font-size:10px;letter-spacing:0.5px;cursor:pointer;padding:6px 2px;display:flex;flex-direction:column;align-items:center;gap:2px;opacity:.9;text-transform:uppercase;}
  .nav-btn.active{color:var(--cyan-bright);}
  .nav-btn.tennis-active{color:#F5C842;}
  .nav-btn.nfl-active{color:#4A90D9;}
  .nav-btn.f1-active{color:var(--f1);}
  .nav-btn.nba-active{color:#FF6B00;}
  .nav-btn.mlb-active{color:#1DB954;}
  .nav-btn.pro-active{color:#F5C842;}
  .pro-banner{border-radius:16px;padding:20px;margin-bottom:16px;border:1px solid rgba(245,200,66,.3);background:linear-gradient(135deg,rgba(245,200,66,.08),rgba(255,45,107,.04));text-align:center;}
  .pro-feature{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:8px;display:flex;align-items:flex-start;gap:12px;}
  .pro-feature-dot{width:8px;height:8px;border-radius:50%;background:#F5C842;flex-shrink:0;margin-top:4px;}
  .pro-cta{width:100%;padding:16px;border:none;border-radius:14px;background:linear-gradient(135deg,#F5C842,#FF2D6B);color:#080A0C;font-family:var(--display-font);font-size:20px;letter-spacing:2px;cursor:pointer;margin-top:8px;transition:opacity .15s;}
  .pro-cta:hover{opacity:.9;}

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
  .mlb-banner{border-radius:16px;padding:16px;margin-bottom:16px;border:1px solid rgba(29,185,84,.2);background:linear-gradient(135deg,rgba(29,185,84,.08),rgba(0,100,40,.04));}
  .mlb-ask-shell{background:var(--surface);border:1px solid rgba(29,185,84,.2);border-radius:14px;padding:14px;margin-bottom:16px;}
  .mlb-ask-label{font-family:var(--mono-font);font-size:10px;color:var(--mlb);letter-spacing:2px;margin-bottom:8px;text-transform:uppercase;}
  .mlb-game-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:8px;cursor:pointer;transition:all .15s ease;}
  .mlb-game-card:hover{border-color:rgba(29,185,84,.35);}
  .mlb-game-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}
  .mlb-game-teams{font-size:15px;font-weight:600;color:var(--text);}
  .mlb-game-status{font-family:var(--mono-font);font-size:10px;color:var(--muted);}
  .mlb-game-score{font-family:var(--mono-font);font-size:13px;color:var(--text);margin-bottom:4px;}
  .mlb-pitcher{font-size:11px;color:var(--muted);}
  .mlb-live-badge{color:var(--green);font-family:var(--mono-font);font-size:10px;}
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

  .page-spacer{height:20px;}
  /* Golf tab */
  .nav-btn.golf-active{color:#FFFFFF;}
  .golf-banner{border-radius:16px;padding:16px;margin-bottom:16px;border:1px solid rgba(255,255,255,.15);background:linear-gradient(135deg,rgba(255,255,255,.06),rgba(255,255,255,.02));}
  .golf-ask-shell{background:var(--surface);border:1px solid rgba(255,255,255,.15);border-radius:14px;padding:14px;margin-bottom:16px;}
  .golf-ask-label{font-family:var(--mono-font);font-size:10px;color:#FFFFFF;letter-spacing:2px;margin-bottom:8px;text-transform:uppercase;opacity:.85;}
  .golf-leaderboard-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:10px 14px;margin-bottom:6px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:all .15s;}
  .golf-leaderboard-card:hover{border-color:rgba(255,255,255,.3);}
  .golf-pos{font-family:var(--display-font);font-size:22px;color:var(--muted);min-width:36px;text-align:right;line-height:1;}
  .golf-player-info{flex:1;}
  .golf-player-name{font-size:14px;font-weight:700;color:var(--text);margin-bottom:1px;}
  .golf-player-country{font-family:var(--mono-font);font-size:9px;color:var(--muted);}
  .golf-score{text-align:right;}
  .golf-score-num{font-family:var(--mono-font);font-size:16px;color:#FFFFFF;display:block;}
  .golf-score-label{font-family:var(--mono-font);font-size:9px;color:var(--muted);}
  .golf-odds-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:10px 14px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;transition:all .15s;}
  .golf-odds-card:hover{border-color:rgba(255,255,255,.3);}
  .golf-player-odds{font-family:var(--mono-font);font-size:14px;color:#FFFFFF;}
`;

// ── NBA Player data ─────────────────────────────────────────────────────────
const NBA_PLAYERS = {

  "Nikola Jokic": {
    team:"DEN", pos:"C", tier:"ELITE",
    pts:29.6, reb:12.7, ast:10.2,
    props:{
      pts:{floor:22,ceil:45,lean:"OVER — triple-double machine, usage never dips"},
      reb:{floor:10,ceil:18,lean:"OVER — elite rebounder, sets own floor"},
      ast:{floor:7,ceil:15,lean:"OVER — best passing big in NBA history"},
      pra:{floor:45,ceil:70,lean:"OVER on PRA totals — safest bet in the NBA"},
    },
    usage:"37.2%",
    bettingAngles:[
      "PRA over is the safest prop in basketball — consistent 50+ nights",
      "Assists over in fast-paced games or vs weak defensive teams",
      "Rebounds over when Murray or Porter are out — he does everything",
      "Fade his pts line vs elite rim protection — PRA stays elite even then",
    ],
    note:"The most reliable prop player in the NBA. His floor is elite even on off nights.",
  },

  "Shai Gilgeous-Alexander": {
    team:"OKC", pos:"G", tier:"ELITE",
    pts:32.7, reb:5.1, ast:6.4,
    props:{
      pts:{floor:25,ceil:50,lean:"OVER — MVP-level scorer, gets to line at will"},
      reb:{floor:4,ceil:8,lean:"LEAN OVER — underrated rebounder for a guard"},
      ast:{floor:4,ceil:9,lean:"NEUTRAL — varies with pace and game script"},
      pra:{floor:38,ceil:58,lean:"OVER"},
    },
    usage:"34.1%",
    bettingAngles:[
      "Points over is the primary play — he gets to the line 8-10 times per game",
      "Free throw attempts prop: OVER almost every game",
      "PRA safer than pts alone — his reb/ast pad the line reliably",
    ],
    note:"2024-25 MVP frontrunner. Most efficient high-volume scorer in the league.",
  },

  "Luka Doncic": {
    team:"LAL", pos:"G", tier:"ELITE",
    pts:28.1, reb:8.2, ast:8.0,
    props:{
      pts:{floor:20,ceil:45,lean:"OVER — elite creator, but inconsistent nights exist"},
      reb:{floor:6,ceil:12,lean:"OVER — massive for a guard"},
      ast:{floor:6,ceil:13,lean:"OVER in pace-up games"},
      pra:{floor:38,ceil:60,lean:"OVER"},
    },
    usage:"36.8%",
    bettingAngles:[
      "PRA over is the safest play — even quiet scoring nights produce big all-around lines",
      "Assists over when LeBron/AD are limiting his scoring load",
      "Fade pts line vs elite perimeter defenders",
    ],
    note:"Trade to Lakers adds uncertainty. Monitor usage split with LeBron early season.",
  },

  "Jayson Tatum": {
    team:"BOS", pos:"F", tier:"ELITE",
    pts:26.9, reb:8.1, ast:4.9,
    props:{
      pts:{floor:20,ceil:42,lean:"OVER in playoff spots, NEUTRAL in blowouts"},
      reb:{floor:6,ceil:12,lean:"OVER"},
      ast:{floor:3,ceil:7,lean:"NEUTRAL"},
      pra:{floor:35,ceil:55,lean:"OVER"},
    },
    usage:"32.1%",
    bettingAngles:[
      "Points floor is high — scores 20+ in 70%+ of games",
      "Fade in big blowouts — Celtics rest starters early",
      "Back in elimination/must-win spots — elite performer under pressure",
    ],
    note:"High floor, massive ceiling. PRA is more reliable than pts alone.",
  },

  "Giannis Antetokounmpo": {
    team:"MIL", pos:"F", tier:"ELITE",
    pts:30.4, reb:11.5, ast:6.5,
    props:{
      pts:{floor:24,ceil:50,lean:"OVER — unstoppable in paint"},
      reb:{floor:9,ceil:16,lean:"OVER"},
      ast:{floor:4,ceil:10,lean:"NEUTRAL"},
      pra:{floor:44,ceil:65,lean:"OVER"},
    },
    usage:"35.7%",
    bettingAngles:[
      "PRA over is elite — 50+ PRA in over 40% of games",
      "FT volume makes pts props viable even on off nights",
      "Fade vs teams with multiple physical rim protectors",
    ],
    note:"All-time great. PRA is the safest market.",
  },

  "Anthony Edwards": {
    team:"MIN", pos:"G", tier:"ELITE",
    pts:27.8, reb:5.4, ast:5.1,
    props:{
      pts:{floor:20,ceil:44,lean:"OVER — explosive scorer, big ceiling"},
      reb:{floor:4,ceil:8,lean:"NEUTRAL"},
      ast:{floor:3,ceil:8,lean:"NEUTRAL"},
      pra:{floor:32,ceil:52,lean:"OVER"},
    },
    usage:"33.4%",
    bettingAngles:[
      "Points over is the primary market — he goes off in big games",
      "Back in rivalry/national TV games — elevates for big moments",
      "Fade vs elite perimeter defenders",
    ],
    note:"Best athlete in the league. Ceiling plays more reliable than floor plays.",
  },

  "Victor Wembanyama": {
    team:"SAS", pos:"C", tier:"ELITE",
    pts:24.5, reb:10.6, ast:3.9,
    props:{
      pts:{floor:18,ceil:40,lean:"OVER — unique offensive skill set"},
      reb:{floor:8,ceil:15,lean:"OVER"},
      ast:{floor:2,ceil:6,lean:"NEUTRAL"},
      blk:{floor:2,ceil:6,lean:"OVER — elite shot blocker"},
    },
    usage:"30.2%",
    bettingAngles:[
      "Blocks over is the unique angle — 3.5 per game pace, best in the league",
      "PRA over in pace-up matchups",
      "Points ceiling is massive — 40+ point games are real",
    ],
    note:"Generational talent. Blocks prop is the best differentiating angle.",
  },

  "Karl-Anthony Towns": {
    team:"NYK", pos:"C", tier:"STAR",
    pts:24.3, reb:13.7, ast:3.2,
    props:{
      pts:{floor:18,ceil:38,lean:"OVER"},
      reb:{floor:11,ceil:18,lean:"OVER — elite rebounder"},
      ast:{floor:2,ceil:5,lean:"NEUTRAL"},
      pra:{floor:38,ceil:55,lean:"OVER"},
    },
    usage:"28.7%",
    bettingAngles:[
      "Rebounds over is the primary play",
      "Back in MSG — home crowd lifts his performance",
      "PRA and rebounds are the reliable markets",
    ],
    note:"Elite rebounder, stretch big. PRA and rebounds are the consistent markets.",
  },

  "Tyrese Haliburton": {
    team:"IND", pos:"G", tier:"STAR",
    pts:20.1, reb:3.9, ast:10.9,
    props:{
      pts:{floor:14,ceil:32,lean:"NEUTRAL — scoring varies with game script"},
      reb:{floor:3,ceil:6,lean:"NEUTRAL"},
      ast:{floor:8,ceil:16,lean:"OVER — elite passer, primary creator"},
      pra:{floor:30,ceil:48,lean:"OVER"},
    },
    usage:"25.4%",
    bettingAngles:[
      "Assists over is the primary play — top-3 assist rate in the league",
      "Back in fast-paced games — Pacers run and his assists spike",
      "Injury history is the main risk — monitor reports",
    ],
    note:"Best pure point guard prop player for assists.",
  },

  "Donovan Mitchell": {
    team:"CLE", pos:"G", tier:"STAR",
    pts:26.1, reb:4.4, ast:5.4,
    props:{
      pts:{floor:19,ceil:42,lean:"OVER"},
      reb:{floor:3,ceil:7,lean:"NEUTRAL"},
      ast:{floor:3,ceil:8,lean:"NEUTRAL"},
      pra:{floor:30,ceil:50,lean:"OVER"},
    },
    usage:"30.8%",
    bettingAngles:[
      "Points over is the primary play — explosive scorer",
      "Back in national TV/big market games",
      "Fade vs elite perimeter defenders",
    ],
    note:"One of the most explosive scorers in the East.",
  },

  "Bam Adebayo": {
    team:"MIA", pos:"C", tier:"STAR",
    pts:19.2, reb:10.4, ast:4.4,
    props:{
      pts:{floor:14,ceil:28,lean:"NEUTRAL"},
      reb:{floor:8,ceil:14,lean:"OVER"},
      ast:{floor:3,ceil:7,lean:"OVER in pace-up games"},
      pra:{floor:30,ceil:46,lean:"OVER"},
    },
    usage:"25.1%",
    bettingAngles:[
      "PRA over is the consistent play",
      "Rebounds over in slow, physical games",
      "Fade pts vs elite rim protectors",
    ],
    note:"Elite two-way player. PRA is the reliable market.",
  },

  "LeBron James": {
    team:"LAL", pos:"F", tier:"STAR",
    pts:23.7, reb:8.0, ast:8.2,
    props:{
      pts:{floor:18,ceil:38,lean:"NEUTRAL — age-related variance increasing"},
      reb:{floor:6,ceil:11,lean:"OVER"},
      ast:{floor:6,ceil:12,lean:"OVER"},
      pra:{floor:36,ceil:55,lean:"OVER"},
    },
    usage:"29.4%",
    bettingAngles:[
      "PRA over is the safest play — contributes across all categories even at 40",
      "Fade pts on back-to-backs — rest management is real",
      "Doncic trade changes dynamics — monitor usage split",
    ],
    note:"Age-related variance is real. PRA safer than pts alone.",
  },

  "Stephen Curry": {
    team:"GSW", pos:"G", tier:"STAR",
    pts:26.4, reb:4.5, ast:6.1,
    props:{
      pts:{floor:18,ceil:50,lean:"OVER — massive ceiling on hot nights"},
      reb:{floor:3,ceil:7,lean:"NEUTRAL"},
      ast:{floor:4,ceil:9,lean:"NEUTRAL"},
      threes:{floor:2,ceil:10,lean:"OVER — best shooter in NBA history"},
    },
    usage:"30.5%",
    bettingAngles:[
      "3-pointers made over is the signature play — 5+ three nights are routine",
      "Points ceiling is massive — 50+ point games are still real",
      "Back in Chase Center — home crowd lifts his shooting",
    ],
    note:"3-pointers made prop is the unique differentiating market.",
  },

  "Kevin Durant": {
    team:"PHX", pos:"F", tier:"STAR",
    pts:27.1, reb:6.8, ast:4.2,
    props:{
      pts:{floor:22,ceil:45,lean:"OVER — elite scorer, most efficient in the league"},
      reb:{floor:5,ceil:10,lean:"NEUTRAL"},
      ast:{floor:2,ceil:6,lean:"NEUTRAL"},
      pra:{floor:33,ceil:55,lean:"OVER"},
    },
    usage:"31.8%",
    bettingAngles:[
      "Points over is the primary play — elite efficiency means consistent scoring",
      "Back when Booker is out — usage spikes significantly",
      "Fade in blowout losses — DNP risk in garbage time",
    ],
    note:"Most efficient scorer in the league. Points props are the most reliable market.",
  },

  "Devin Booker": {
    team:"PHX", pos:"G", tier:"STAR",
    pts:25.4, reb:4.3, ast:6.8,
    props:{
      pts:{floor:18,ceil:40,lean:"OVER"},
      reb:{floor:3,ceil:7,lean:"NEUTRAL"},
      ast:{floor:5,ceil:10,lean:"OVER"},
      pra:{floor:32,ceil:50,lean:"OVER"},
    },
    usage:"30.1%",
    bettingAngles:[
      "Points over is primary — elite scorer, gets to the line well",
      "Assists over when Durant is on a minutes restriction",
      "Back in nationally televised games",
    ],
    note:"Elite scorer. PRA and points are the consistent markets.",
  },

  "Ja Morant": {
    team:"MEM", pos:"G", tier:"STAR",
    pts:24.7, reb:5.1, ast:8.1,
    props:{
      pts:{floor:18,ceil:42,lean:"OVER when healthy"},
      reb:{floor:4,ceil:8,lean:"NEUTRAL"},
      ast:{floor:6,ceil:12,lean:"OVER"},
      pra:{floor:33,ceil:52,lean:"OVER"},
    },
    usage:"30.9%",
    bettingAngles:[
      "Health is the primary risk — monitor injury reports closely",
      "Points over when fully healthy — explosive scorer",
      "Fade on back-to-backs or after any injury concern",
    ],
    note:"Injury history is the main variable. Health check is mandatory.",
  },

  "Zion Williamson": {
    team:"NOP", pos:"F", tier:"STAR",
    pts:23.8, reb:5.8, ast:4.1,
    props:{
      pts:{floor:18,ceil:38,lean:"OVER when healthy"},
      reb:{floor:4,ceil:9,lean:"NEUTRAL"},
      ast:{floor:3,ceil:6,lean:"NEUTRAL"},
      pra:{floor:28,ceil:46,lean:"OVER when playing"},
    },
    usage:"32.4%",
    bettingAngles:[
      "Health check is non-negotiable — confirm active before any bet",
      "FT volume: draws contact at elite rate",
      "Fade on minutes restriction games",
    ],
    note:"Highest injury risk on this list. Never bet without confirming active status.",
  },

  "Pascal Siakam": {
    team:"IND", pos:"F", tier:"STAR",
    pts:21.3, reb:7.8, ast:4.4,
    props:{
      pts:{floor:16,ceil:32,lean:"OVER"},
      reb:{floor:6,ceil:11,lean:"OVER"},
      ast:{floor:3,ceil:7,lean:"NEUTRAL"},
      pra:{floor:30,ceil:48,lean:"OVER"},
    },
    usage:"27.3%",
    bettingAngles:[
      "PRA over is the consistent play — contributes across all three categories",
      "Pacers fast pace benefits his athleticism",
      "Back alongside Haliburton",
    ],
    note:"Underrated prop player. PRA is the most consistent market.",
  },

  "De'Aaron Fox": {
    team:"SAC", pos:"G", tier:"STAR",
    pts:24.8, reb:4.1, ast:6.8,
    props:{
      pts:{floor:18,ceil:40,lean:"OVER"},
      reb:{floor:3,ceil:7,lean:"NEUTRAL"},
      ast:{floor:5,ceil:10,lean:"OVER"},
      pra:{floor:30,ceil:48,lean:"OVER"},
    },
    usage:"29.7%",
    bettingAngles:[
      "Points over in pace-up games — elite in transition",
      "Check game total and opponent defensive pace before betting",
      "Back in home games",
    ],
    note:"Pace-dependent scorer. Game total is the key contextual signal.",
  },

  "Darius Garland": {
    team:"CLE", pos:"G", tier:"STAR",
    pts:21.6, reb:2.8, ast:7.9,
    props:{
      pts:{floor:15,ceil:32,lean:"OVER"},
      reb:{floor:2,ceil:5,lean:"NEUTRAL"},
      ast:{floor:6,ceil:12,lean:"OVER"},
      pra:{floor:27,ceil:44,lean:"OVER"},
    },
    usage:"26.2%",
    bettingAngles:[
      "Assists over is the primary play — elite creator alongside Mitchell",
      "Points over in games where Mitchell is limited",
      "Back in pace-up matchups",
    ],
    note:"Elite passer. Assists are the primary market.",
  },

  "Cade Cunningham": {
    team:"DET", pos:"G", tier:"STAR",
    pts:25.2, reb:6.1, ast:9.0,
    props:{
      pts:{floor:19,ceil:38,lean:"OVER"},
      reb:{floor:5,ceil:9,lean:"OVER"},
      ast:{floor:7,ceil:13,lean:"OVER"},
      pra:{floor:36,ceil:54,lean:"OVER"},
    },
    usage:"31.5%",
    bettingAngles:[
      "PRA over is a strong play — elite all-around contributor",
      "Assists over — top-5 playmaker in the league",
      "Detroit rebuilding around him — usage locked in",
    ],
    note:"Undervalued prop player. PRA and assists are the consistent markets.",
  },

  "Paolo Banchero": {
    team:"ORL", pos:"F", tier:"STAR",
    pts:24.6, reb:7.4, ast:5.8,
    props:{
      pts:{floor:18,ceil:38,lean:"OVER"},
      reb:{floor:5,ceil:10,lean:"OVER"},
      ast:{floor:4,ceil:8,lean:"NEUTRAL"},
      pra:{floor:33,ceil:52,lean:"OVER"},
    },
    usage:"30.2%",
    bettingAngles:[
      "PRA over — young star contributing across all three categories",
      "Points over in pace-up matchups",
      "Orlando's clear #1 option — usage is maximized",
    ],
    note:"Ascending star. PRA is the most reliable market.",
  },

  "Scottie Barnes": {
    team:"TOR", pos:"F", tier:"STAR",
    pts:21.8, reb:8.5, ast:6.2,
    props:{
      pts:{floor:16,ceil:32,lean:"NEUTRAL"},
      reb:{floor:7,ceil:12,lean:"OVER"},
      ast:{floor:4,ceil:9,lean:"OVER"},
      pra:{floor:32,ceil:48,lean:"OVER"},
    },
    usage:"27.8%",
    bettingAngles:[
      "PRA over is the primary play",
      "Rebounds over in physical matchups",
      "Toronto rebuilding around him — usage maximized",
    ],
    note:"Underrated prop player. PRA and rebounds are the most reliable markets.",
  },

  "Franz Wagner": {
    team:"ORL", pos:"F", tier:"STAR",
    pts:22.4, reb:5.2, ast:4.8,
    props:{
      pts:{floor:16,ceil:35,lean:"OVER"},
      reb:{floor:4,ceil:8,lean:"NEUTRAL"},
      ast:{floor:3,ceil:7,lean:"NEUTRAL"},
      pra:{floor:26,ceil:44,lean:"OVER"},
    },
    usage:"27.1%",
    bettingAngles:[
      "Points over is the primary market — consistent scorer alongside Banchero",
      "Back in games where Banchero draws double teams",
      "PRA over in pace-up matchups",
    ],
    note:"Reliable second scorer. Points are the consistent market.",
  },

  "Alperen Sengun": {
    team:"HOU", pos:"C", tier:"STAR",
    pts:21.1, reb:9.4, ast:5.1,
    props:{
      pts:{floor:16,ceil:32,lean:"OVER"},
      reb:{floor:7,ceil:14,lean:"OVER"},
      ast:{floor:3,ceil:8,lean:"OVER — elite passer for a center"},
      pra:{floor:32,ceil:50,lean:"OVER"},
    },
    usage:"26.4%",
    bettingAngles:[
      "PRA over is the primary play — elite all-around big man",
      "Assists over — rare playmaking ability for his position",
      "Most underrated prop player at the center position",
    ],
    note:"Most underrated prop player at center. PRA and assists are the edges.",
  },

  "Jalen Brunson": {
    team:"NYK", pos:"G", tier:"STAR",
    pts:26.6, reb:3.4, ast:7.5,
    props:{
      pts:{floor:20,ceil:42,lean:"OVER"},
      reb:{floor:2,ceil:5,lean:"NEUTRAL"},
      ast:{floor:5,ceil:11,lean:"OVER"},
      pra:{floor:30,ceil:50,lean:"OVER"},
    },
    usage:"32.6%",
    bettingAngles:[
      "Points over is the primary play — elite scorer with no clear weakness",
      "Back at MSG — home crowd elevates his performance",
      "Assists over in pace-up games",
    ],
    note:"Top-5 scoring prop player. Points and assists are both reliable markets.",
  },

  "Jaylen Brown": {
    team:"BOS", pos:"F", tier:"STAR",
    pts:23.0, reb:5.5, ast:3.6,
    props:{
      pts:{floor:17,ceil:36,lean:"OVER"},
      reb:{floor:4,ceil:8,lean:"NEUTRAL"},
      ast:{floor:2,ceil:5,lean:"NEUTRAL"},
      pra:{floor:28,ceil:44,lean:"OVER"},
    },
    usage:"28.1%",
    bettingAngles:[
      "Points over is primary — elite scorer in Boston's championship system",
      "Back in elimination/playoff games",
      "Fade in blowouts — Boston rests starters when ahead big",
    ],
    note:"Championship-level performer. Points and PRA are the consistent markets.",
  },

  "Trae Young": {
    team:"ATL", pos:"G", tier:"STAR",
    pts:23.7, reb:2.8, ast:11.4,
    props:{
      pts:{floor:17,ceil:38,lean:"OVER"},
      reb:{floor:2,ceil:5,lean:"NEUTRAL"},
      ast:{floor:9,ceil:16,lean:"OVER — top-3 assists in the league"},
      pra:{floor:32,ceil:52,lean:"OVER"},
    },
    usage:"31.2%",
    bettingAngles:[
      "Assists over is the primary play — consistently top-3 in the NBA",
      "Points over in pace-up games",
      "Atlanta rebuilding gives him maximum usage",
    ],
    note:"Most reliable assists prop player alongside Haliburton.",
  },

  "Damian Lillard": {
    team:"MIL", pos:"G", tier:"STAR",
    pts:24.1, reb:4.2, ast:7.4,
    props:{
      pts:{floor:18,ceil:40,lean:"OVER"},
      reb:{floor:3,ceil:6,lean:"NEUTRAL"},
      ast:{floor:5,ceil:11,lean:"OVER"},
      threes:{floor:2,ceil:7,lean:"OVER"},
    },
    usage:"29.8%",
    bettingAngles:[
      "Points over when Giannis is limited — usage spikes",
      "3-pointers made: elite from deep, especially from logo range",
      "Back in big games — elite clutch performer",
    ],
    note:"Elite scorer. Points and 3-pointers made are the primary markets.",
  },

  "LaMelo Ball": {
    team:"CHA", pos:"G", tier:"STAR",
    pts:22.4, reb:5.2, ast:8.5,
    props:{
      pts:{floor:16,ceil:36,lean:"NEUTRAL"},
      reb:{floor:4,ceil:8,lean:"NEUTRAL"},
      ast:{floor:6,ceil:12,lean:"OVER"},
      pra:{floor:30,ceil:50,lean:"OVER"},
    },
    usage:"28.6%",
    bettingAngles:[
      "Assists over is the primary play — elite playmaker",
      "Health check required — injury history is real",
      "PRA over when fully healthy",
    ],
    note:"Health-dependent. When healthy, assists and PRA are the reliable markets.",
  },

  "Anthony Davis": {
    team:"LAL", pos:"C", tier:"STAR",
    pts:24.7, reb:12.1, ast:3.4,
    props:{
      pts:{floor:18,ceil:38,lean:"OVER when healthy"},
      reb:{floor:9,ceil:16,lean:"OVER"},
      blk:{floor:1,ceil:4,lean:"OVER"},
      pra:{floor:36,ceil:54,lean:"OVER"},
    },
    usage:"28.9%",
    bettingAngles:[
      "PRA over is the primary play — elite rebounder and scorer",
      "Health check required — history of missing games",
      "Fade when on minutes restriction",
    ],
    note:"Health and minutes are the variables. When fully playing, stats are elite.",
  },

  "Rudy Gobert": {
    team:"MIN", pos:"C", tier:"SOLID",
    pts:13.4, reb:12.0, ast:1.4,
    props:{
      pts:{floor:10,ceil:20,lean:"NEUTRAL"},
      reb:{floor:10,ceil:17,lean:"OVER — elite rebounder"},
      blk:{floor:1,ceil:4,lean:"OVER"},
      pra:{floor:24,ceil:36,lean:"NEUTRAL"},
    },
    usage:"17.8%",
    bettingAngles:[
      "Rebounds over is the primary play — consistently top-3 in the NBA",
      "Double-double prop: strong play, hits it 70%+ of games",
      "Fade pts — low usage, below-average FT shooter",
    ],
    note:"Rebounds and double-double props are the only consistent markets.",
  },

  "Jaren Jackson Jr.": {
    team:"MEM", pos:"C", tier:"SOLID",
    pts:22.1, reb:6.0, ast:1.6,
    props:{
      pts:{floor:16,ceil:34,lean:"OVER"},
      reb:{floor:4,ceil:9,lean:"NEUTRAL"},
      blk:{floor:2,ceil:5,lean:"OVER — Defensive Player of the Year caliber"},
      pra:{floor:26,ceil:42,lean:"OVER"},
    },
    usage:"27.4%",
    bettingAngles:[
      "Blocks over is the unique angle — one of the top-2 shot blockers in the league",
      "Points over in games where he's featured offensively alongside Ja",
      "Back when Ja is healthy — their pairing opens his offensive role",
    ],
    note:"Blocks prop is the differentiating market.",
  },

  "Desmond Bane": {
    team:"MEM", pos:"G", tier:"SOLID",
    pts:21.4, reb:4.2, ast:5.1,
    props:{
      pts:{floor:15,ceil:32,lean:"OVER"},
      reb:{floor:3,ceil:7,lean:"NEUTRAL"},
      threes:{floor:2,ceil:6,lean:"OVER"},
      pra:{floor:26,ceil:44,lean:"OVER"},
    },
    usage:"25.6%",
    bettingAngles:[
      "3-pointers made: elite shooter — back this prop in any pace-up game",
      "Points over when Ja is limited — usage spikes significantly",
      "Back in high-scoring games",
    ],
    note:"Elite shooter. 3-pointers made and points are the primary markets.",
  },

  "Kyrie Irving": {
    team:"DAL", pos:"G", tier:"SOLID",
    pts:24.2, reb:4.0, ast:5.3,
    props:{
      pts:{floor:18,ceil:40,lean:"OVER"},
      reb:{floor:3,ceil:6,lean:"NEUTRAL"},
      ast:{floor:4,ceil:8,lean:"NEUTRAL"},
      pra:{floor:28,ceil:48,lean:"OVER"},
    },
    usage:"29.4%",
    bettingAngles:[
      "Points over in games where he's the primary creator",
      "Health check required — availability has been inconsistent",
      "Dallas situation uncertain post-Doncic trade",
    ],
    note:"Dallas situation uncertain. Monitor team context carefully.",
  },

  "Brandon Ingram": {
    team:"NOP", pos:"F", tier:"SOLID",
    pts:22.3, reb:5.4, ast:5.8,
    props:{
      pts:{floor:16,ceil:34,lean:"OVER"},
      reb:{floor:4,ceil:8,lean:"NEUTRAL"},
      ast:{floor:4,ceil:8,lean:"NEUTRAL"},
      pra:{floor:28,ceil:46,lean:"OVER"},
    },
    usage:"28.1%",
    bettingAngles:[
      "Points over is primary — elite mid-range scorer",
      "Back when Zion is out — becomes the clear #1 option",
      "Fade when Zion is healthy and dominating usage",
    ],
    note:"Reliable scorer. Best value when Zion is limited or out.",
  },

  "Tyler Herro": {
    team:"MIA", pos:"G", tier:"SOLID",
    pts:22.8, reb:5.1, ast:5.2,
    props:{
      pts:{floor:16,ceil:36,lean:"OVER"},
      reb:{floor:4,ceil:8,lean:"NEUTRAL"},
      ast:{floor:3,ceil:8,lean:"NEUTRAL"},
      pra:{floor:28,ceil:46,lean:"OVER"},
    },
    usage:"27.8%",
    bettingAngles:[
      "Points over is primary — elite shooter with high-volume usage",
      "Back when Jimmy Butler is out — usage spikes massively",
      "Fade when full Miami roster is healthy",
    ],
    note:"Best value when Butler is limited. Monitor Butler status.",
  },

  "Jalen Williams": {
    team:"OKC", pos:"F", tier:"SOLID",
    pts:22.5, reb:4.5, ast:5.8,
    props:{
      pts:{floor:16,ceil:34,lean:"OVER"},
      reb:{floor:3,ceil:7,lean:"NEUTRAL"},
      ast:{floor:4,ceil:8,lean:"OVER"},
      pra:{floor:28,ceil:46,lean:"OVER"},
    },
    usage:"26.8%",
    bettingAngles:[
      "Points over when SGA is limited — usage spikes",
      "PRA over — elite all-around second option",
      "SGA usage is the primary variable",
    ],
    note:"Reliable second option. Best prop value when SGA is limited.",
  },

  "Evan Mobley": {
    team:"CLE", pos:"C", tier:"SOLID",
    pts:18.6, reb:9.4, ast:2.9,
    props:{
      pts:{floor:14,ceil:28,lean:"OVER"},
      reb:{floor:7,ceil:14,lean:"OVER"},
      blk:{floor:1,ceil:4,lean:"OVER"},
      pra:{floor:28,ceil:44,lean:"OVER"},
    },
    usage:"23.8%",
    bettingAngles:[
      "PRA over is the consistent play — elite all-around big man",
      "Rebounds over in physical interior matchups",
      "Blocks over — one of the best shot blockers in the East",
    ],
    note:"Undervalued prop player. PRA and rebounds are the reliable markets.",
  },

  "Josh Hart": {
    team:"NYK", pos:"G", tier:"SOLID",
    pts:12.4, reb:9.8, ast:4.6,
    props:{
      pts:{floor:8,ceil:22,lean:"NEUTRAL"},
      reb:{floor:8,ceil:14,lean:"OVER — elite rebounder for a guard"},
      ast:{floor:3,ceil:7,lean:"NEUTRAL"},
      pra:{floor:24,ceil:38,lean:"OVER"},
    },
    usage:"17.2%",
    bettingAngles:[
      "Rebounds over is the primary play — anomalous for his position",
      "PRA over — contributes across all three categories",
      "Elite rebounder for a guard — market often underprices this",
    ],
    note:"Rebounds are the standout prop. Market often underprices his rebounding.",
  },

  "Mikal Bridges": {
    team:"NYK", pos:"F", tier:"SOLID",
    pts:18.2, reb:4.1, ast:3.6,
    props:{
      pts:{floor:13,ceil:28,lean:"NEUTRAL"},
      reb:{floor:3,ceil:6,lean:"NEUTRAL"},
      stl:{floor:1,ceil:3,lean:"OVER"},
      pra:{floor:22,ceil:36,lean:"NEUTRAL"},
    },
    usage:"22.4%",
    bettingAngles:[
      "Steals over is the unique differentiating prop — elite on-ball defender",
      "Fade pts — fourth scoring option in Knicks system",
      "Back on 3-pointers made when getting open looks",
    ],
    note:"Defensive stats (steals) are the prop angle. Scoring ceiling is capped.",
  },

  "OG Anunoby": {
    team:"NYK", pos:"F", tier:"SOLID",
    pts:16.8, reb:5.1, ast:2.1,
    props:{
      pts:{floor:12,ceil:26,lean:"NEUTRAL"},
      reb:{floor:4,ceil:8,lean:"NEUTRAL"},
      stl:{floor:1,ceil:3,lean:"OVER"},
      pra:{floor:22,ceil:36,lean:"NEUTRAL"},
    },
    usage:"21.6%",
    bettingAngles:[
      "Steals over is the unique differentiating prop",
      "Back when Brunson/Towns are drawing attention",
      "Fade pts — fourth scoring option in Knicks system",
    ],
    note:"Defensive stats (steals) are the prop angle.",
  },

  "Amen Thompson": {
    team:"HOU", pos:"F", tier:"SOLID",
    pts:15.8, reb:7.6, ast:4.9,
    props:{
      pts:{floor:11,ceil:24,lean:"NEUTRAL"},
      reb:{floor:6,ceil:11,lean:"OVER"},
      ast:{floor:3,ceil:7,lean:"NEUTRAL"},
      pra:{floor:24,ceil:40,lean:"OVER"},
    },
    usage:"21.4%",
    bettingAngles:[
      "PRA over — contributes across all three categories",
      "Ascending player — props may be undervalued as he develops",
      "Back alongside Sengun",
    ],
    note:"Ascending player. PRA is the reliable market as his role expands.",
  },

  "Jamal Murray": {
    team:"DEN", pos:"G", tier:"SOLID",
    pts:20.8, reb:4.2, ast:6.3,
    props:{
      pts:{floor:14,ceil:34,lean:"OVER"},
      reb:{floor:3,ceil:7,lean:"NEUTRAL"},
      ast:{floor:4,ceil:9,lean:"OVER"},
      pra:{floor:28,ceil:46,lean:"OVER"},
    },
    usage:"24.6%",
    bettingAngles:[
      "Points over in playoff-important games — elite clutch performer",
      "Health check required — injury history is real",
      "PRA over when healthy alongside Jokic",
    ],
    note:"Elite playoff performer. Health check is mandatory before betting.",
  },

  "Anfernee Simons": {
    team:"POR", pos:"G", tier:"SOLID",
    pts:21.7, reb:3.4, ast:5.4,
    props:{
      pts:{floor:15,ceil:35,lean:"OVER"},
      reb:{floor:2,ceil:5,lean:"NEUTRAL"},
      threes:{floor:2,ceil:6,lean:"OVER"},
      pra:{floor:26,ceil:44,lean:"OVER"},
    },
    usage:"27.8%",
    bettingAngles:[
      "Points over — primary option on rebuilding Portland",
      "3-pointers made: elite from deep with high volume",
      "Back in high game totals",
    ],
    note:"High-volume scorer on a weak team. Game total and defense are the variables.",
  },

  "Lauri Markkanen": {
    team:"UTA", pos:"F", tier:"SOLID",
    pts:23.2, reb:8.2, ast:2.4,
    props:{
      pts:{floor:17,ceil:34,lean:"OVER"},
      reb:{floor:6,ceil:12,lean:"OVER"},
      threes:{floor:2,ceil:5,lean:"OVER"},
      pra:{floor:28,ceil:46,lean:"OVER"},
    },
    usage:"26.4%",
    bettingAngles:[
      "PRA over is the consistent play — elite all-around stretch big",
      "3-pointers made: elite shooter from the 4 position",
      "Utah rebuilding — his usage is maximized",
    ],
    note:"Undervalued prop player. PRA and 3-pointers are the reliable markets.",
  },

  "Immanuel Quickley": {
    team:"TOR", pos:"G", tier:"SOLID",
    pts:18.4, reb:4.1, ast:7.2,
    props:{
      pts:{floor:13,ceil:28,lean:"OVER as starter"},
      reb:{floor:3,ceil:6,lean:"NEUTRAL"},
      ast:{floor:5,ceil:10,lean:"OVER"},
      pra:{floor:26,ceil:42,lean:"OVER"},
    },
    usage:"24.1%",
    bettingAngles:[
      "Assists over is the primary play",
      "PRA over — contributes across all three categories",
      "Toronto rebuilding — usage maximized",
    ],
    note:"Undervalued. PRA and assists are reliable with Toronto's system.",
  },

  "Dejounte Murray": {
    team:"NOP", pos:"G", tier:"SOLID",
    pts:20.4, reb:5.2, ast:7.8,
    props:{
      pts:{floor:14,ceil:30,lean:"OVER"},
      reb:{floor:4,ceil:8,lean:"NEUTRAL"},
      ast:{floor:5,ceil:11,lean:"OVER"},
      pra:{floor:30,ceil:46,lean:"OVER"},
    },
    usage:"25.7%",
    bettingAngles:[
      "PRA over is the primary play — elite all-around contributor",
      "Steals prop: elite on-ball defender, averages 1.5+ per game",
      "Back when Zion/Ingram are limited",
    ],
    note:"Reliable all-around player. PRA, assists, and steals are the markets.",
  },

  "Nikola Vucevic": {
    team:"CHI", pos:"C", tier:"SOLID",
    pts:18.2, reb:10.6, ast:3.4,
    props:{
      pts:{floor:13,ceil:26,lean:"NEUTRAL"},
      reb:{floor:8,ceil:14,lean:"OVER"},
      ast:{floor:2,ceil:5,lean:"NEUTRAL"},
      pra:{floor:28,ceil:42,lean:"OVER"},
    },
    usage:"22.7%",
    bettingAngles:[
      "Rebounds over is the primary play",
      "Double-double prop: strong play, hits 65%+ of games",
      "Fade pts vs elite rim protectors",
    ],
    note:"Reliable rebounder. Rebounds and double-double are the markets.",
  },

  "Zach LaVine": {
    team:"CHI", pos:"G", tier:"SOLID",
    pts:22.8, reb:4.7, ast:4.2,
    props:{
      pts:{floor:16,ceil:36,lean:"OVER"},
      reb:{floor:3,ceil:7,lean:"NEUTRAL"},
      threes:{floor:2,ceil:6,lean:"OVER"},
      pra:{floor:26,ceil:42,lean:"OVER"},
    },
    usage:"28.4%",
    bettingAngles:[
      "Points over when Chicago needs scoring",
      "3-pointers made: elite shooter, back when getting volume",
      "Fade in slow games where Chicago's offense stagnates",
    ],
    note:"Scorer first. Points and 3-pointers are the primary markets.",
  },

  "Draymond Green": {
    team:"GSW", pos:"F", tier:"ROLE",
    pts:9.0, reb:7.2, ast:6.8,
    props:{
      pts:{floor:6,ceil:16,lean:"NEUTRAL"},
      reb:{floor:5,ceil:10,lean:"OVER"},
      ast:{floor:4,ceil:9,lean:"OVER"},
      pra:{floor:20,ceil:34,lean:"OVER"},
    },
    usage:"13.8%",
    bettingAngles:[
      "PRA over — contributes across all three categories despite low scoring",
      "Assists over in Golden State's system",
      "Fade pts — scoring is not his role",
    ],
    note:"Scoring props are fades. PRA and assists are the only reliable markets.",
  },

  "Jordan Poole": {
    team:"WAS", pos:"G", tier:"ROLE",
    pts:18.1, reb:2.8, ast:5.3,
    props:{
      pts:{floor:13,ceil:30,lean:"OVER as primary option"},
      reb:{floor:2,ceil:5,lean:"NEUTRAL"},
      threes:{floor:2,ceil:6,lean:"OVER"},
      pra:{floor:22,ceil:40,lean:"OVER"},
    },
    usage:"27.1%",
    bettingAngles:[
      "Points over — Washington gives him maximum usage",
      "3-pointers made: high volume from deep",
      "Back in high game totals — Washington games tend to be high-scoring",
    ],
    note:"Primary option on a weak team — usage is maximized.",
  },

  "Michael Porter Jr.": {
    team:"DEN", pos:"F", tier:"ROLE",
    pts:16.4, reb:6.8, ast:1.6,
    props:{
      pts:{floor:11,ceil:28,lean:"NEUTRAL"},
      reb:{floor:5,ceil:10,lean:"OVER"},
      threes:{floor:1,ceil:5,lean:"OVER"},
      pra:{floor:22,ceil:38,lean:"NEUTRAL"},
    },
    usage:"20.4%",
    bettingAngles:[
      "3-pointers made: elite shooter off Jokic gravity",
      "Rebounds over in games where Jokic is playing high usage",
      "Health check required — significant injury history",
    ],
    note:"Injury-prone. 3-pointers made is the prop angle.",
  },

  "Kristaps Porzingis": {
    team:"BOS", pos:"C", tier:"ROLE",
    pts:17.9, reb:6.8, ast:1.8,
    props:{
      pts:{floor:12,ceil:28,lean:"OVER when healthy"},
      reb:{floor:5,ceil:10,lean:"OVER"},
      blk:{floor:1,ceil:3,lean:"OVER"},
      threes:{floor:1,ceil:4,lean:"OVER"},
    },
    usage:"23.4%",
    bettingAngles:[
      "Health check required — significant injury history",
      "Points over when healthy — elite stretch big",
      "Fade on any minutes restriction signal",
    ],
    note:"Health is the overriding variable. Never bet without confirming full health.",
  },

  "Andrew Wiggins": {
    team:"GSW", pos:"F", tier:"ROLE",
    pts:15.8, reb:4.4, ast:2.1,
    props:{
      pts:{floor:11,ceil:24,lean:"NEUTRAL"},
      reb:{floor:3,ceil:7,lean:"NEUTRAL"},
      threes:{floor:1,ceil:4,lean:"NEUTRAL"},
      pra:{floor:18,ceil:32,lean:"NEUTRAL"},
    },
    usage:"20.2%",
    bettingAngles:[
      "Back pts when Curry has heavy usage night — opens kick-out threes",
      "Fade in games where Curry is cold",
      "PRA UNDER often value",
    ],
    note:"Role player. Only clear matchup or Curry correlation plays.",
  },

};


// ── Golf Player data ─────────────────────────────────────────────────────────
const PGA_PLAYERS = {

  // ── TIER 1: WORLD TOP 5 ──────────────────────────────────────────────────

  "Scottie Scheffler": {
    tier: "ELITE", rank: 1, country: "USA",
    sg: { total: 4.1, ott: 1.1, app: 1.6, arg: 0.6, putt: 0.8 },
    stats: { drivingDist: 308, fairwayPct: 62, girPct: 74, scrambling: 68, top10Rate: 0.62, cutRate: 0.89, winRate: 0.18 },
    courseTypes: { links: "A", parkland: "A+", desert: "A", coastal: "A", treelined: "A+" },
    markets: { outright: "Always overpriced — bet top-5/top-10 instead", top5: "Best market — 62% top-10 rate", top10: "Strong value when 6/1 or better", makecut: "Near-lock — only fade extreme links courses" },
    form: "Best player in the world by a significant margin. Iron play is generational. Putting elevated in 2024.",
    bestAt: ["Augusta National", "TPC Sawgrass", "Riviera", "Bay Hill", "East Lake"],
    fade: ["Links courses — lower on the list vs US parkland"],
    note: "Don't bet outright — the juice is never there. Top-5 at 7/2 or better is the play every week.",
    comps: ["Tiger Woods 2000-era dominance in consistency metrics"],
  },

  "Rory McIlroy": {
    tier: "ELITE", rank: 2, country: "NIR",
    sg: { total: 2.8, ott: 1.4, app: 0.9, arg: 0.2, putt: 0.3 },
    stats: { drivingDist: 326, fairwayPct: 58, girPct: 71, scrambling: 60, top10Rate: 0.48, cutRate: 0.82, winRate: 0.11 },
    courseTypes: { links: "A+", parkland: "A", desert: "B+", coastal: "A", treelined: "A" },
    markets: { outright: "Value at 12/1 or better", top5: "Solid market — elite ball-striker", top10: "Strong value at 5/1 or better", makecut: "Reliable — fade desert only" },
    form: "Elevated after 2024 Masters. Finally closed at Augusta. Driver is a weapon on wide-open courses.",
    bestAt: ["Augusta National", "TPC Sawgrass", "Quail Hollow", "Valhalla", "Royal Portrush"],
    fade: ["Accurate, tight driving layouts — his miss rate is too high"],
    note: "Best value in majors when the course suits his power. Don't fade him on links — grew up on them.",
    comps: ["Dustin Johnson in prime on power-friendly setups"],
  },

  "Xander Schauffele": {
    tier: "ELITE", rank: 3, country: "USA",
    sg: { total: 2.4, ott: 0.8, app: 1.0, arg: 0.3, putt: 0.3 },
    stats: { drivingDist: 315, fairwayPct: 64, girPct: 72, scrambling: 63, top10Rate: 0.51, cutRate: 0.85, winRate: 0.10 },
    courseTypes: { links: "A", parkland: "A", desert: "A-", coastal: "A", treelined: "A" },
    markets: { outright: "Value at 14/1 or better", top5: "Best market — elite consistency", top10: "Strong any week", makecut: "Near-lock" },
    form: "Won PGA Championship and The Open 2024. Clutch performer. One of the most consistent players on tour.",
    bestAt: ["Oakmont", "Augusta National", "Royal Troon", "TPC Sawgrass"],
    fade: ["Extremely tight driving corridors — accuracy is above-average but not elite"],
    note: "His SG:APP is elite — approach play wins at premium courses. Top-5 is the money market.",
    comps: ["Justin Thomas in consistency and all-around SG profile"],
  },

  "Collin Morikawa": {
    tier: "ELITE", rank: 4, country: "USA",
    sg: { total: 2.1, ott: 0.3, app: 1.5, arg: 0.1, putt: 0.2 },
    stats: { drivingDist: 299, fairwayPct: 72, girPct: 76, scrambling: 64, top10Rate: 0.44, cutRate: 0.87, winRate: 0.09 },
    courseTypes: { links: "A+", parkland: "A", desert: "A", coastal: "A+", treelined: "A" },
    markets: { outright: "Value at 16/1 or better", top5: "Strong — elite GIR percentage", top10: "Best market every week", makecut: "Near-lock" },
    form: "Iron play is best on tour. Multiple major winner. Rebounding in 2025 after inconsistent 2024.",
    bestAt: ["Augusta National", "Royal Birkdale", "Wentworth"],
    fade: ["Par-5 heavy courses — not a power player"],
    note: "SG:APP leader most seasons. Premium on approach-heavy setups. The most reliable iron player in the world.",
    comps: ["Luke Donald in iron precision — but more athletic"],
  },

  "Viktor Hovland": {
    tier: "ELITE", rank: 5, country: "NOR",
    sg: { total: 1.9, ott: 0.7, app: 0.8, arg: 0.2, putt: 0.2 },
    stats: { drivingDist: 318, fairwayPct: 60, girPct: 69, scrambling: 58, top10Rate: 0.42, cutRate: 0.78, winRate: 0.08 },
    courseTypes: { links: "A", parkland: "A-", desert: "B+", coastal: "A", treelined: "B+" },
    markets: { outright: "Value at 18/1 or better", top5: "Strong on power/links setups", top10: "Reliable", makecut: "Good — fade if cold putter" },
    form: "Elite ball-striker with sometimes-volatile putting. When putter is hot, top-5 caliber any week.",
    bestAt: ["East Lake", "DP World venues", "The Open Championship"],
    fade: ["When putter is cold — his SG:P can dip negative easily"],
    note: "Track his putting stats week to week. Top-10 on pure ball-striking setups is solid every time.",
    comps: ["Justin Rose in ball-striking profile"],
  },

  // ── TIER 2: TOUR ELITE ────────────────────────────────────────────────────

  "Patrick Cantlay": {
    tier: "TOUR_ELITE", rank: 7, country: "USA",
    sg: { total: 1.8, ott: 0.4, app: 0.8, arg: 0.4, putt: 0.6 },
    stats: { drivingDist: 302, fairwayPct: 66, girPct: 70, scrambling: 66, top10Rate: 0.44, cutRate: 0.84, winRate: 0.07 },
    courseTypes: { links: "B+", parkland: "A", desert: "A", coastal: "A", treelined: "A" },
    markets: { outright: "Value at 20/1 or better", top5: "Strong on patient, shot-making setups", top10: "Reliable", makecut: "Strong" },
    form: "Methodical, precision-based player. Elite at courses rewarding positioning over power.",
    bestAt: ["Riviera", "TPC Summerlin", "Olympia Fields"],
    fade: ["Wide-open bombers' paradise — he can't out-drive the field"],
    note: "Premium on difficult, precision setups. Riviera is his best venue on tour.",
    comps: ["Bryson DeChambeau without the power — pure precision"],
  },

  "Jon Rahm": {
    tier: "TOUR_ELITE", rank: 8, country: "ESP",
    sg: { total: 2.0, ott: 0.7, app: 0.9, arg: 0.3, putt: 0.5 },
    stats: { drivingDist: 312, fairwayPct: 61, girPct: 69, scrambling: 64, top10Rate: 0.50, cutRate: 0.82, winRate: 0.09 },
    courseTypes: { links: "A+", parkland: "A", desert: "A", coastal: "A", treelined: "A" },
    markets: { outright: "Value at 14/1 or better on LIV eligible events", top5: "Strong on any setup", top10: "Reliable", makecut: "Strong" },
    form: "On LIV Golf 2024-25 — limited PGA/major access. Elite when eligible. Clay-specialist comp doesn't apply — he's an all-surface A+ player.",
    bestAt: ["Augusta National", "US Open setups", "Spanish/Mediterranean courses"],
    fade: ["Limited PGA Tour schedule — eligibility check required"],
    note: "When eligible, top-5 caliber at majors. His LIV schedule means fewer data points.",
    comps: ["Seve Ballesteros in fight and imagination around the green"],
  },

  "Ludvig Aberg": {
    tier: "TOUR_ELITE", rank: 9, country: "SWE",
    sg: { total: 1.7, ott: 0.9, app: 0.7, arg: 0.1, putt: 0.0 },
    stats: { drivingDist: 319, fairwayPct: 60, girPct: 68, scrambling: 60, top10Rate: 0.38, cutRate: 0.76, winRate: 0.05 },
    courseTypes: { links: "A", parkland: "A-", desert: "B+", coastal: "A", treelined: "A-" },
    markets: { outright: "Value at 25/1 or better", top5: "Strong when driver is clicking", top10: "Solid any week", makecut: "Good" },
    form: "Rapid ascent. Top-5 at 2024 Masters as a rookie. Elite ball-striker, short game developing.",
    bestAt: ["Augusta National", "Power-friendly setups"],
    fade: ["Tight driving corridors — miss rate needs to improve"],
    note: "Elite ceiling. Short game is the only limiting factor. If it clicks, top-5 any major.",
    comps: ["Young Rory McIlroy in trajectory and power profile"],
  },

  "Tom Kim": {
    tier: "TOUR_ELITE", rank: 12, country: "KOR",
    sg: { total: 1.4, ott: 0.5, app: 0.6, arg: 0.2, putt: 0.1 },
    stats: { drivingDist: 305, fairwayPct: 62, girPct: 67, scrambling: 62, top10Rate: 0.35, cutRate: 0.78, winRate: 0.06 },
    courseTypes: { links: "B+", parkland: "A-", desert: "B+", coastal: "A-", treelined: "A-" },
    markets: { outright: "Value at 30/1 or better", top5: "Streaky — strong when hot", top10: "Best market", makecut: "Good" },
    form: "Multiple PGA wins before age 23. Volatile but elite ceiling.",
    bestAt: ["Shriners Children's Open", "Bermuda Open setups"],
    fade: ["Tough precision setups — drives it well but not consistent enough"],
    note: "Age 22-23 — best value is top-10/top-20. His floor is lower than his ceiling suggests.",
    comps: ["Young Jordan Spieth in raw ability"],
  },

  "Jordan Spieth": {
    tier: "TOUR_ELITE", rank: 14, country: "USA",
    sg: { total: 1.2, ott: -0.1, app: 0.6, arg: 0.5, putt: 0.6 },
    stats: { drivingDist: 296, fairwayPct: 60, girPct: 65, scrambling: 68, top10Rate: 0.40, cutRate: 0.80, winRate: 0.07 },
    courseTypes: { links: "A+", parkland: "A", desert: "A-", coastal: "A+", treelined: "A" },
    markets: { outright: "Value at 20/1 or better on major/links setups", top5: "Strong at premium venues", top10: "Reliable", makecut: "Strong" },
    form: "Clutch putter and scrambler. Short game is top-3 on tour. Driver is the liability.",
    bestAt: ["Augusta National", "Royal Birkdale", "TPC San Antonio", "Pebble Beach"],
    fade: ["Wide-open, power-heavy setups — can't keep up off the tee"],
    note: "His ARG + putting combo wins at premium venues. Top-5 at Augusta and links majors is the play.",
    comps: ["Phil Mickelson in short game creativity"],
  },

  "Justin Thomas": {
    tier: "TOUR_ELITE", rank: 16, country: "USA",
    sg: { total: 1.5, ott: 0.5, app: 0.7, arg: 0.2, putt: 0.1 },
    stats: { drivingDist: 312, fairwayPct: 62, girPct: 70, scrambling: 63, top10Rate: 0.38, cutRate: 0.79, winRate: 0.07 },
    courseTypes: { links: "A-", parkland: "A", desert: "A", coastal: "A-", treelined: "A" },
    markets: { outright: "Value at 22/1 or better", top5: "Streaky — strong when clicking", top10: "Best market", makecut: "Good" },
    form: "Elite when healthy and hot. Multiple major winner. Inconsistent 2024 but returning to form.",
    bestAt: ["Quail Hollow", "Kapalua", "TPC Sawgrass"],
    fade: ["When putting is cold — top-15 ceiling only"],
    note: "His driver + iron combo is elite. Watch his SG:P stats in the lead-up week.",
    comps: ["Rory McIlroy with more precision, less power"],
  },

  "Max Homa": {
    tier: "TOUR_ELITE", rank: 17, country: "USA",
    sg: { total: 1.3, ott: 0.3, app: 0.7, arg: 0.2, putt: 0.1 },
    stats: { drivingDist: 303, fairwayPct: 65, girPct: 68, scrambling: 62, top10Rate: 0.36, cutRate: 0.80, winRate: 0.06 },
    courseTypes: { links: "B+", parkland: "A", desert: "A", coastal: "A-", treelined: "A" },
    markets: { outright: "Value at 28/1 or better", top5: "Best on his best courses", top10: "Reliable", makecut: "Strong" },
    form: "Riviera specialist. Multiple wins at Riviera Country Club. Smart, positioning-based player.",
    bestAt: ["Riviera", "Nicklaus-designed courses"],
    fade: ["Links and coastal — not his best surface"],
    note: "Riviera is one of the best course-player angle in golf. Back him there aggressively.",
    comps: ["Patrick Cantlay in patient course management approach"],
  },

  "Matt Fitzpatrick": {
    tier: "TOUR_ELITE", rank: 18, country: "ENG",
    sg: { total: 1.3, ott: 0.1, app: 0.7, arg: 0.3, putt: 0.2 },
    stats: { drivingDist: 295, fairwayPct: 70, girPct: 70, scrambling: 64, top10Rate: 0.38, cutRate: 0.82, winRate: 0.06 },
    courseTypes: { links: "A", parkland: "A", desert: "A-", coastal: "A", treelined: "A" },
    markets: { outright: "Value at 25/1 or better at precision setups", top5: "Strong at US Open-style courses", top10: "Reliable", makecut: "Strong" },
    form: "US Open champion 2022. Precision-based, elite iron player. Short hitter who maximizes every yard.",
    bestAt: ["US Open setups", "Brookline", "tight parkland"],
    fade: ["Power-heavy setups — 295 avg distance is a liability on bombers tracks"],
    note: "Premium at narrow, demanding setups that punish inaccuracy. Fade at wide-open tracks.",
    comps: ["Luke Donald in precision and course management"],
  },

  "Tommy Fleetwood": {
    tier: "TOUR_ELITE", rank: 19, country: "ENG",
    sg: { total: 1.4, ott: 0.4, app: 0.8, arg: 0.1, putt: 0.1 },
    stats: { drivingDist: 305, fairwayPct: 63, girPct: 70, scrambling: 60, top10Rate: 0.40, cutRate: 0.81, winRate: 0.06 },
    courseTypes: { links: "A+", parkland: "A", desert: "A-", coastal: "A+", treelined: "A-" },
    markets: { outright: "Value at 22/1 or better at links/major setups", top5: "Strong at The Open", top10: "Reliable", makecut: "Strong" },
    form: "Elite links player. Multiple top-5 finishes at The Open Championship. Elite in European conditions.",
    bestAt: ["The Open Championship", "European Tour venues", "Scottish courses"],
    fade: ["Desert courses — not his best conditions"],
    note: "Best value at The Open or links-style US Open setups. Underpriced every time.",
    comps: ["Ian Poulter in European conditions mastery"],
  },

  "Shane Lowry": {
    tier: "TOUR_ELITE", rank: 20, country: "IRL",
    sg: { total: 1.2, ott: 0.2, app: 0.6, arg: 0.3, putt: 0.1 },
    stats: { drivingDist: 298, fairwayPct: 63, girPct: 68, scrambling: 63, top10Rate: 0.36, cutRate: 0.79, winRate: 0.06 },
    courseTypes: { links: "A+", parkland: "A-", desert: "B", coastal: "A+", treelined: "B+" },
    markets: { outright: "Value at 25/1 or better at links", top5: "Strong at The Open", top10: "Reliable at links setups", makecut: "Good" },
    form: "Open Championship winner. Bred for links golf. Great in wind and tough conditions.",
    bestAt: ["Royal Portrush", "The Open Championship venues", "tough-weather events"],
    fade: ["Desert / warm-weather US Tour events — not his element"],
    note: "If it's windy and links-style, back Shane Lowry. He's made for it.",
    comps: ["Padraig Harrington in grit and links mastery"],
  },

  "Hideki Matsuyama": {
    tier: "TOUR_ELITE", rank: 21, country: "JPN",
    sg: { total: 1.5, ott: 0.4, app: 0.8, arg: 0.2, putt: 0.1 },
    stats: { drivingDist: 308, fairwayPct: 59, girPct: 70, scrambling: 62, top10Rate: 0.40, cutRate: 0.79, winRate: 0.07 },
    courseTypes: { links: "A-", parkland: "A", desert: "A", coastal: "A", treelined: "A" },
    markets: { outright: "Value at 20/1 or better", top5: "Strong — especially Augusta", top10: "Reliable", makecut: "Good" },
    form: "Masters champion. Methodical ball-striker. Driver can be wild but iron play saves him.",
    bestAt: ["Augusta National", "Zozo Championship"],
    fade: ["Putting-dependent fast greens — his SG:P is inconsistent"],
    note: "Augusta specialist — the draw suits Masters perfectly. Back him there every year.",
    comps: ["Tiger Woods in patience and course management strategy"],
  },

  "Brian Harman": {
    tier: "SOLID", rank: 28, country: "USA",
    sg: { total: 0.9, ott: 0.0, app: 0.4, arg: 0.3, putt: 0.2 },
    stats: { drivingDist: 287, fairwayPct: 70, girPct: 65, scrambling: 65, top10Rate: 0.28, cutRate: 0.78, winRate: 0.04 },
    courseTypes: { links: "A+", parkland: "A-", desert: "B+", coastal: "A", treelined: "B+" },
    markets: { outright: "Value at 40/1 or better at links", top5: "Strong at The Open", top10: "Good at precision setups", makecut: "Reliable" },
    form: "Open Championship winner 2023. Won by 6 shots. Elite links player despite short drives.",
    bestAt: ["Hoylake", "Links venues", "tough-conditions events"],
    fade: ["Power-heavy setups — shortest driver in elite tier"],
    note: "Don't fade him at links just because he's short. He's won The Open. Accuracy > distance there.",
    comps: ["Zach Johnson in grinding out results from nowhere"],
  },

  "Cameron Young": {
    tier: "SOLID", rank: 30, country: "USA",
    sg: { total: 0.9, ott: 0.8, arg: 0.1, app: 0.2, putt: -0.2 },
    stats: { drivingDist: 326, fairwayPct: 54, girPct: 65, scrambling: 60, top10Rate: 0.28, cutRate: 0.73, winRate: 0.03 },
    courseTypes: { links: "B", parkland: "A-", desert: "A-", coastal: "B+", treelined: "B+" },
    markets: { outright: "Value at 45/1 or better on bombers tracks", top5: "Power setups only", top10: "Best market", makecut: "Volatile" },
    form: "Elite distance off the tee — top-5 on tour. Putting and scrambling are liabilities.",
    bestAt: ["Kapalua", "wide-open bombers tracks"],
    fade: ["Precision courses — his miss rate is too high without putter saving him"],
    note: "Top-10 on power tracks is the play. Fade on tight, demanding setups.",
    comps: ["Dustin Johnson without the consistency"],
  },

  "Wyndham Clark": {
    tier: "SOLID", rank: 22, country: "USA",
    sg: { total: 1.1, ott: 0.5, app: 0.4, arg: 0.1, putt: 0.1 },
    stats: { drivingDist: 314, fairwayPct: 60, girPct: 67, scrambling: 61, top10Rate: 0.32, cutRate: 0.76, winRate: 0.06 },
    courseTypes: { links: "B+", parkland: "A-", desert: "A-", coastal: "B+", treelined: "A-" },
    markets: { outright: "Value at 30/1 or better", top5: "Streaky", top10: "Reliable", makecut: "Good" },
    form: "US Open champion 2023. Power player with improving course management.",
    bestAt: ["Los Angeles Country Club", "power-friendly setups"],
    fade: ["Traditional links — not his best surface"],
    note: "Value at US Open setups — his power + accuracy combo suits them well.",
    comps: ["Dustin Johnson in power and inconsistency pattern"],
  },

  "Patrick Reed": {
    tier: "SOLID", rank: 35, country: "USA",
    sg: { total: 0.8, ott: 0.1, app: 0.3, arg: 0.3, putt: 0.3 },
    stats: { drivingDist: 298, fairwayPct: 62, girPct: 65, scrambling: 65, top10Rate: 0.25, cutRate: 0.74, winRate: 0.04 },
    courseTypes: { links: "A-", parkland: "A", desert: "A", coastal: "A-", treelined: "A" },
    markets: { outright: "Value at 50/1 or better", top5: "Best at Augusta-style setups", top10: "Reliable", makecut: "Good" },
    form: "On LIV Golf. Masters champion. Clutch, combative style. Short game is elite.",
    bestAt: ["Augusta National", "Ryder Cup/team formats"],
    fade: ["Power-dependent setups"],
    note: "When eligible at majors, Augusta is always a top-10 angle. Elite putter and scrambler.",
    comps: ["Seve Ballesteros in short game and combativeness"],
  },

  "Russell Henley": {
    tier: "SOLID", rank: 26, country: "USA",
    sg: { total: 1.0, ott: 0.2, app: 0.5, arg: 0.2, putt: 0.1 },
    stats: { drivingDist: 296, fairwayPct: 66, girPct: 68, scrambling: 63, top10Rate: 0.30, cutRate: 0.80, winRate: 0.04 },
    courseTypes: { links: "B+", parkland: "A", desert: "A-", coastal: "A-", treelined: "A" },
    markets: { outright: "Value at 45/1 or better", top5: "Best market", top10: "Reliable", makecut: "Strong" },
    form: "Quiet but consistent. Elite iron player who shows up at premium venues.",
    bestAt: ["Augusta National", "US Open setups"],
    fade: ["Power courses — can't bomb it"],
    note: "Underrated at precision setups. Watch for top-20/top-10 value at major venues.",
    comps: ["Matt Fitzpatrick in precision and quietness"],
  },

  "Akshay Bhatia": {
    tier: "SOLID", rank: 29, country: "USA",
    sg: { total: 0.9, ott: 0.5, arg: 0.2, app: 0.3, putt: -0.1 },
    stats: { drivingDist: 316, fairwayPct: 57, girPct: 64, scrambling: 60, top10Rate: 0.28, cutRate: 0.70, winRate: 0.05 },
    courseTypes: { links: "B", parkland: "A-", desert: "A-", coastal: "B", treelined: "B+" },
    markets: { outright: "Value at 45/1 or better", top5: "Upside plays only", top10: "Best market", makecut: "Volatile" },
    form: "Young gun. Big hitter with high ceiling. Short game still developing.",
    bestAt: ["Power-friendly setups", "Valero Texas Open"],
    fade: ["Precision courses — his miss rate is high"],
    note: "Top-20 value every week. Back him on power tracks at 40/1 or better for outright value.",
    comps: ["Young Dustin Johnson in power with inconsistency"],
  },

  "Chris Kirk": {
    tier: "SOLID", rank: 32, country: "USA",
    sg: { total: 0.8, ott: 0.2, app: 0.4, arg: 0.1, putt: 0.1 },
    stats: { drivingDist: 295, fairwayPct: 66, girPct: 66, scrambling: 62, top10Rate: 0.25, cutRate: 0.78, winRate: 0.04 },
    courseTypes: { links: "B+", parkland: "A-", desert: "A-", coastal: "B+", treelined: "A-" },
    markets: { outright: "Value at 60/1 or better", top5: "Low percentage", top10: "Best market", makecut: "Reliable" },
    form: "Reliable, veteran presence. Best value in top-10 markets at weaker events.",
    bestAt: ["Honda Classic", "Bermuda setups"],
    fade: ["Majors — ceiling not high enough"],
    note: "Value play at non-majors. Look for top-20 or make-cut markets.",
    comps: ["Kevin Kisner in grit without the personality"],
  },

  "Sahith Theegala": {
    tier: "SOLID", rank: 27, country: "USA",
    sg: { total: 1.0, ott: 0.5, app: 0.4, arg: 0.1, putt: 0.0 },
    stats: { drivingDist: 314, fairwayPct: 58, girPct: 66, scrambling: 61, top10Rate: 0.32, cutRate: 0.76, winRate: 0.04 },
    courseTypes: { links: "B", parkland: "A-", desert: "A-", coastal: "B+", treelined: "A-" },
    markets: { outright: "Value at 50/1 or better", top5: "Upside plays", top10: "Best market", makecut: "Good" },
    form: "Power player. Short game is developing. Elite ceiling in right conditions.",
    bestAt: ["Power-friendly setups", "warm-weather California swing"],
    fade: ["Links — not his game"],
    note: "FedEx Cup points player. Top-10 every week at softer events.",
    comps: ["Cameron Young in power/inconsistency profile"],
  },
};

// ── Course Database ───────────────────────────────────────────────────────────
const PGA_COURSES = {

  "Augusta National": {
    location: "Augusta, GA", type: "parkland",
    premiums: ["driver accuracy", "iron precision", "lag putting", "course management"],
    penalizes: ["short hitters in places", "poor iron play", "bad chipping around greens"],
    advantages: ["Right-to-left ball flight (draw)", "premium approach play", "patience"],
    history: "Scheffler, Morikawa, Spieth, Matsuyama all elite here. Bombers with draws win.",
    note: "Best draw players win Augusta. Approach play to undulating greens is the separator.",
  },

  "Pebble Beach": {
    location: "Pebble Beach, CA", type: "coastal links-style",
    premiums: ["driver accuracy (small fairways)", "wind management", "iron from rough"],
    penalizes: ["wild drivers — out of bounds everywhere"],
    advantages: ["Links-style experience helps", "precision over power"],
    note: "Small fairways penalize big hitters. Accurate, smart players win here.",
  },

  "TPC Sawgrass": {
    location: "Ponte Vedra Beach, FL", type: "parkland, water everywhere",
    premiums: ["iron precision", "composure under pressure", "accurate tee shots"],
    penalizes: ["aggressive play near water", "wild drivers"],
    advantages: ["17th Island Green separates pretenders — back clutch putters"],
    note: "Players' Championship venue. All-around skill required. Best players win.",
  },

  "Riviera": {
    location: "Pacific Palisades, CA", type: "classic parkland",
    premiums: ["accurate driving", "iron play to Poa annua greens", "scrambling"],
    penalizes: ["power over accuracy", "poor putting on slow Poa greens"],
    advantages: ["Course knowledge huge — experience here matters"],
    note: "Max Homa venue. Patrick Cantlay. Precision specialists win.",
  },

  "Quail Hollow": {
    location: "Charlotte, NC", type: "parkland",
    premiums: ["distance (challenging long holes)", "iron play", "putting"],
    penalizes: ["short hitters — the final stretch (Green Mile) is brutal"],
    advantages: ["Power players have edge on back nine"],
    note: "Rory McIlroy venue. Power + iron play required. The Green Mile finishes 16-18.",
  },

  "Torrey Pines South": {
    location: "La Jolla, CA", type: "coastal",
    premiums: ["accuracy", "iron play", "rough recovery"],
    penalizes: ["wild drivers into thick rough"],
    advantages: ["California coastal conditions favor ball-strikers"],
    note: "Farmers Insurance host. Classic US Open setup — accuracy and iron play.",
  },

  "East Lake": {
    location: "Atlanta, GA", type: "parkland",
    premiums: ["all-around game", "putting on difficult greens", "consistency"],
    penalizes: ["flawed parts of the game — no place to hide at Tour Championship"],
    advantages: ["Top-30 players only — best field in golf"],
    note: "Tour Championship. FedEx Cup points matter for starting scores. Season-long data most predictive.",
  },

  "Royal Portrush": {
    location: "N. Ireland", type: "links",
    premiums: ["wind management", "bump-and-run", "patience", "flight the ball"],
    penalizes: ["high ball flight", "aggressive target golf"],
    advantages: ["Northern European players have links-DNA advantage"],
    note: "Rory's home course. Tommy Fleetwood, Shane Lowry elite here.",
  },
};

// ── Golf Markets Reference ────────────────────────────────────────────────────
const GOLF_MARKETS = {
  outright: {
    description: "Win the tournament outright",
    bestUse: "Elite players at home courses. Value above 20/1.",
    avoid: "Scheffler outright — always juiced. Short prices in weak fields.",
  },
  top5: {
    description: "Finish top 5",
    bestUse: "Elite players any week. Scheffler top-5 is the best recurring play.",
    avoid: "Volatile players — Cameron Young types",
  },
  top10: {
    description: "Finish top 10",
    bestUse: "Best default market. Solid players in good form any week.",
    avoid: "Majors for tier-2 players — field quality kills the percentage",
  },
  top20: {
    description: "Finish top 20",
    bestUse: "Best value market for mid-tier plays. Consistent players at soft events.",
    avoid: "Overpriced favorites",
  },
  makecut: {
    description: "Make the 36-hole cut",
    bestUse: "Elite players, especially when form is strong. Near-certainty for top-10 players.",
    avoid: "Volatile drivers — anyone with >45% miss fairway rate",
  },
  matchup: {
    description: "Head-to-head matchup bet",
    bestUse: "Course-specialist vs similar-priced generic player. Use SG splits.",
    avoid: "Volatile players against consistent ones when priced even",
  },
  firstRoundLeader: {
    description: "Lead after round 1",
    bestUse: "Morning draw + power player + hot putter. Low probability but high value.",
    avoid: "Afternoon draw in wind",
  },
};


// ── Tennis/NFL Player data ───────────────────────────────────────────────────
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

function LoadingBubble({ sport }) {
  const emoji = sport === "nba" ? "🏀" : sport === "nfl" ? "🏈" : sport === "f1" ? "🏎️" : sport === "tennis" ? "🎾" : sport === "mlb" ? "⚾" : sport === "golf" ? "⛳" : "⚡";
  const isF1 = sport === "f1";
  return (
    <div className="bubble ai loading" style={{display:"flex",alignItems:"center",gap:12,minHeight:44}}>
      <style>{`
        @keyframes ur-bounce {
          0%,100%{transform:translateX(0) translateY(0);}
          25%{transform:translateX(24px) translateY(-5px);}
          50%{transform:translateX(48px) translateY(0);}
          75%{transform:translateX(24px) translateY(-5px);}
        }
        @keyframes ur-drive {
          0%  {left:0;   transform:scaleX(1);}
          44% {left:52px;transform:scaleX(1);}
          50% {left:52px;transform:scaleX(-1);}
          94% {left:0;   transform:scaleX(-1);}
          100%{left:0;   transform:scaleX(1);}
        }
        .ur-track{position:relative;width:72px;height:28px;flex-shrink:0;}
        .ur-emoji{position:absolute;top:50%;margin-top:-11px;font-size:20px;line-height:1;}
        .ur-emoji.driving{animation:ur-drive 1.4s ease-in-out infinite;}
        .ur-emoji.bouncing{animation:ur-bounce 0.9s ease-in-out infinite;left:0;}
      `}</style>
      <div className="ur-track">
        <span className={`ur-emoji ${isF1 ? "driving" : "bouncing"}`}>{emoji}</span>
      </div>
      <span style={{fontFamily:"var(--mono-font)",fontSize:11,letterSpacing:2,color:"var(--muted)"}}>ANALYZING...</span>
    </div>
  );
}

function ChatThread({ msgs }) {
  if (!msgs||msgs.length===0) return null;
  return (
    <div className="chat-thread" style={{marginBottom:20}}>
      {msgs.map((m,i) => (
        m.loading
          ? <LoadingBubble key={i} sport={m.sport} />
          : <div key={i} className={`bubble ${m.role}`}>
              {m.image && <img src={m.image} alt="" className="bubble-img" />}
              {renderMessage(m.text)}
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
  const [mlbInput, setMlbInput]         = useState("");
  const [matchupInput, setMatchupInput] = useState("");

  // Per-screen message threads
  const [askMsgs, setAskMsgs]         = useState([]);
  const [tennisMsgs, setTennisMsgs]   = useState([]);
  const [nflMsgs, setNflMsgs]         = useState([]);
  const [f1Msgs, setF1Msgs]           = useState([]);
  const [nbaMsgs, setNbaMsgs]         = useState([]);
  const [mlbMsgs, setMlbMsgs]         = useState([]);
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
  const [mlbData, setMlbData]           = useState(null);
  const [mlbLoading, setMlbLoading]     = useState(false);
  const [golfData, setGolfData]         = useState(null);
  const [golfLoading, setGolfLoading]   = useState(false);
  const [golfInput, setGolfInput]       = useState("");
  const [golfMsgs, setGolfMsgs]         = useState([]);

  // Separate inputRef per screen — critical for AskBar memo optimization
  const homeInputRef      = useRef(null);
  const askInputRef       = useRef(null);
  const askBarBottomRef   = useRef(null);
  const tennisInputRef    = useRef(null);
  const nflInputRef       = useRef(null);
  const f1InputRef        = useRef(null);
  const nbaInputRef       = useRef(null);
  const mlbInputRef       = useRef(null);
  const golfInputRef      = useRef(null);
  const golfBarRef        = useRef(null);
  const matchupInputRef   = useRef(null);
  const playerInputRef    = useRef(null);
  const nflPlayerInputRef = useRef(null);
  const fileInputRef      = useRef(null);

  const nflRampMode   = useMemo(() => isNflRampMode(), []);
  const nflSeasonMode = useMemo(() => isNflInSeason(), []);

  // Detect Stripe redirect back to app
  const [proSuccess, setProSuccess] = useState(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("pro");
      if (p === "success") {
        window.history.replaceState({}, "", window.location.pathname);
        return true;
      }
    }
    return false;
  });

  // ── Access tier ─────────────────────────────────────────────────────────────
  // tier: "free" | "friend" | "owner" | "pro"
  const [accessTier, setAccessTier] = useState(() => {
    if (typeof window === "undefined") return "free";
    try {
      const token = localStorage.getItem("ur_access_token");
      if (token) {
        const b64 = token.split(".")[0];
        const payload = JSON.parse(atob(b64));
        if (!payload.expiresAt || new Date() < new Date(payload.expiresAt)) {
          return payload.tier || "free";
        }
      }
    } catch {}
    return "free";
  });
  const [accessToken, setAccessToken] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("ur_access_token") || "" : ""
  );

  // ── Email gate ──────────────────────────────────────────────────────────────
  const [userEmail, setUserEmail] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("ur_email") || "" : ""
  );
  const [weeklyUsed, setWeeklyUsed]     = useState(0);
  const [showEmailGate, setShowEmailGate] = useState(false);
  const [showCodeEntry, setShowCodeEntry] = useState(false);
  const [gateEmail, setGateEmail]         = useState("");
  const [codeInput, setCodeInput]         = useState("");
  const [codeError, setCodeError]         = useState("");
  const [codeLoading, setCodeLoading]     = useState(false);

  const isUnlimited = accessTier === "owner" || accessTier === "friend" || accessTier === "pro";
  const FREE_LIMIT  = 5;

  // Load weekly usage on mount
  useEffect(() => {
    if (isUnlimited) return;
    const used = JSON.parse(localStorage.getItem("ur_queries") || "[]");
    const now  = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    const recent = used.filter(t => now - t < week);
    setWeeklyUsed(recent.length);
    localStorage.setItem("ur_queries", JSON.stringify(recent));
  }, [isUnlimited]);

  // Redeem access code
  const redeemCode = useCallback(async () => {
    if (!codeInput.trim()) return;
    setCodeLoading(true); setCodeError("");
    try {
      const res  = await fetch("/api/access", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ code: codeInput.trim() }) });
      const data = await res.json();
      if (data.valid) {
        localStorage.setItem("ur_access_token", data.token);
        setAccessToken(data.token);
        setAccessTier(data.tier);
        setShowCodeEntry(false);
        setCodeInput("");
      } else {
        setCodeError(data.error || "Invalid code. Check with whoever shared it.");
      }
    } catch {
      setCodeError("Something went wrong. Try again.");
    }
    setCodeLoading(false);
  }, [codeInput]);

  // Check if user can ask — called before every query
  const canAsk = useCallback(() => {
    if (isUnlimited) return true;
    if (!userEmail) { setShowEmailGate(true); return false; }
    if (weeklyUsed >= FREE_LIMIT) { goPro(); return false; }
    return true;
  }, [isUnlimited, userEmail, weeklyUsed]);

  // Record a query use
  const recordQuery = useCallback(() => {
    if (isUnlimited) return;
    const used = JSON.parse(localStorage.getItem("ur_queries") || "[]");
    used.push(Date.now());
    localStorage.setItem("ur_queries", JSON.stringify(used));
    setWeeklyUsed(prev => prev + 1);
    // Fire-and-forget server record
    if (userEmail) {
      fetch("/api/gate", { method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ action:"consume", email:userEmail }) }).catch(()=>{});
    }
  }, [isUnlimited, userEmail]);

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
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch("/api/f1", { signal: controller.signal });
        clearTimeout(timeout);
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
  const [nbaGames, setNbaGames] = useState([]);

  useEffect(() => {
    let active = true;
    async function loadNba() {
      setNbaLoading(true);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch("/api/nba?view=board", { signal: controller.signal });
        clearTimeout(timeout);
        const data = await res.json();
        if (active) setNbaData(data);
      } catch { if (active) setNbaData(null); }
      finally { if (active) setNbaLoading(false); }
    }
    loadNba();
    const poll = window.setInterval(() => {
      fetch("/api/nba?view=board").then(r=>r.json()).then(d=>{ if(active) setNbaData(d); }).catch(()=>{});
    }, 300000);
    return () => { active=false; window.clearInterval(poll); };
  }, []);

  // Fetch NBA games — browser-side ESPN fetch, no auth needed
  useEffect(() => {
    let active = true;
    async function loadGames() {
      try {
        const res = await fetch(
          "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error("ESPN " + res.status);
        const data = await res.json();
        const events = data?.events || [];

        // Get today's date in ET
        const nowET = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
        const todayStr = `${nowET.getFullYear()}-${String(nowET.getMonth()+1).padStart(2,"0")}-${String(nowET.getDate()).padStart(2,"0")}`;

        const games = events
          .filter(e => {
            // ESPN date is UTC — convert to ET date for comparison
            const gET = new Date(new Date(e.date).toLocaleString("en-US", { timeZone: "America/New_York" }));
            const gStr = `${gET.getFullYear()}-${String(gET.getMonth()+1).padStart(2,"0")}-${String(gET.getDate()).padStart(2,"0")}`;
            return gStr === todayStr;
          })
          .map(e => {
            const comp = e.competitions?.[0];
            const home = comp?.competitors?.find(c => c.homeAway === "home");
            const away = comp?.competitors?.find(c => c.homeAway === "away");
            const status = e.status?.type;
            return {
              id: e.id,
              status: status?.shortDetail || status?.description || "Scheduled",
              state: status?.state || "pre",
              period: e.status?.period || 0,
              homeTeam: { name: home?.team?.shortDisplayName, abbr: home?.team?.abbreviation, score: parseInt(home?.score || "0") },
              awayTeam: { name: away?.team?.shortDisplayName, abbr: away?.team?.abbreviation, score: parseInt(away?.score || "0") },
            };
          });

        if (active && games.length > 0) {
          setNbaGames(games);
          return;
        }

        // If ESPN returned nothing for today, try NBA CDN
        const cdn = await fetch("https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json", { cache: "no-store" });
        if (!cdn.ok) throw new Error("CDN " + cdn.status);
        const cdnData = await cdn.json();
        const cdnGames = (cdnData?.scoreboard?.games || []).map(g => ({
          id: g.gameId,
          status: g.gameStatusText,
          state: g.gameStatus === 2 ? "in" : g.gameStatus === 3 ? "post" : "pre",
          period: g.period,
          homeTeam: { name: g.homeTeam?.teamName, abbr: g.homeTeam?.teamTricode, score: g.homeTeam?.score },
          awayTeam: { name: g.awayTeam?.teamName, abbr: g.awayTeam?.teamTricode, score: g.awayTeam?.score },
        }));
        if (active && cdnGames.length > 0) setNbaGames(cdnGames);

      } catch(err) {
        console.log("Games fetch failed:", err.message);
      }
    }
    loadGames();
    const poll = window.setInterval(loadGames, 60000);
    return () => { active=false; window.clearInterval(poll); };
  }, []);

  // ── MLB data fetch ────────────────────────────────────────────────────────
  const [mlbGames, setMlbGames] = useState([]);

  useEffect(() => {
    let active = true;
    async function loadMlb() {
      setMlbLoading(true);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch("/api/mlb?view=board", { signal: controller.signal });
        clearTimeout(timeout);
        const data = await res.json();
        if (active) setMlbData(data);
      } catch { if (active) setMlbData(null); }
      finally { if (active) setMlbLoading(false); }
    }
    loadMlb();
    const poll = window.setInterval(() => {
      fetch("/api/mlb?view=board").then(r=>r.json()).then(d=>{ if(active) setMlbData(d); }).catch(()=>{});
    }, 180000);
    return () => { active=false; window.clearInterval(poll); };
  }, []);

  // ── MLB games — browser-side ESPN fetch (bypasses server cache) ────────────
  useEffect(() => {
    let active = true;
    async function loadMlbGames() {
      try {
        const res = await fetch(
          "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard",
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error("ESPN MLB " + res.status);
        const data = await res.json();
        const events = data?.events || [];
        const nowET = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
        const todayStr = `${nowET.getFullYear()}-${String(nowET.getMonth()+1).padStart(2,"0")}-${String(nowET.getDate()).padStart(2,"0")}`;
        const games = events
          .filter(e => {
            const gET = new Date(new Date(e.date).toLocaleString("en-US", { timeZone: "America/New_York" }));
            const gStr = `${gET.getFullYear()}-${String(gET.getMonth()+1).padStart(2,"0")}-${String(gET.getDate()).padStart(2,"0")}`;
            return gStr === todayStr;
          })
          .map(e => {
            const comp   = e.competitions?.[0];
            const home   = comp?.competitors?.find(c => c.homeAway === "home");
            const away   = comp?.competitors?.find(c => c.homeAway === "away");
            const status = e.status?.type;
            const isLive = status?.state === "in";
            const isFinal = status?.state === "post";
            const gameTime = e.date
              ? new Date(e.date).toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit", timeZone:"America/New_York" }) + " ET"
              : "TBD";
            return {
              id:       e.id,
              status:   isFinal ? "Final" : isLive ? (status?.detail || "Live") : gameTime,
              state:    isFinal ? "post" : isLive ? "in" : "pre",
              homeTeam: { name: home?.team?.displayName, abbr: home?.team?.abbreviation, score: isFinal||isLive ? parseInt(home?.score||"0") : null },
              awayTeam: { name: away?.team?.displayName, abbr: away?.team?.abbreviation, score: isFinal||isLive ? parseInt(away?.score||"0") : null },
            };
          });
        if (active && games.length > 0) setMlbGames(games);
      } catch(err) { console.log("MLB ESPN fetch failed:", err.message); }
    }
    loadMlbGames();
    const poll = window.setInterval(loadMlbGames, 60000);
    return () => { active=false; window.clearInterval(poll); };
  }, []);


  // ── Golf data fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    async function loadGolf() {
      setGolfLoading(true);
      try {
        const res = await fetch("/api/golf?view=board");
        if (!res.ok) throw new Error("Golf " + res.status);
        const data = await res.json();
        if (active) setGolfData(data);
      } catch { if (active) setGolfData(null); }
      finally { if (active) setGolfLoading(false); }
    }
    loadGolf();
    const poll = window.setInterval(() => {
      fetch("/api/golf?view=board").then(r=>r.json()).then(d=>{ if(active) setGolfData(d); }).catch(()=>{});
    }, 8 * 60 * 1000);
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
    return {
      seasonContext:   nbaData?.seasonContext || {},
      todaysGames:     nbaGames.length > 0 ? nbaGames : (nbaData?.todaysGames || []),
      lastNight:       nbaData?.lastNight     || [],
      lastNightStats:  nbaData?.lastNightStats|| [],
      liveStats:       nbaData?.liveStats     || [],
      playerStats:     nbaData?.playerStats   || [],
      propLines:       nbaData?.propLines     || [],
      injuries:        nbaData?.injuries      || [],
      recentForm:      nbaData?.recentForm    || "",
      h2hSplits:       nbaData?.h2hSplits     || [],
      gameTotals:      nbaData?.gameTotals     || {},
      playerDb:        NBA_PLAYERS,
      question:        questionText || "",
    };
  }, [nbaData, nbaGames]);

  const buildMlbContext = useCallback((questionText) => {
    const allGames = mlbGames.length > 0 ? mlbGames : (mlbData?.games || []);
    // Trim each game to essentials only — avoid oversized payload
    const trimmedGames = allGames.map(g => ({
      id: g.id,
      state: g.state,
      status: g.status,
      inning: g.inning || null,
      inningHalf: g.inningHalf || null,
      homeTeam: { abbr: g.homeTeam?.abbr, name: g.homeTeam?.name, score: g.homeTeam?.score ?? null, pitcher: g.homeTeam?.pitcher || null },
      awayTeam: { abbr: g.awayTeam?.abbr, name: g.awayTeam?.name, score: g.awayTeam?.score ?? null, pitcher: g.awayTeam?.pitcher || null },
    }));
    return {
      seasonContext: mlbData?.seasonContext || {},
      games:         trimmedGames,
      propLines:     (mlbData?.propLines || []).slice(0, 40),
      gameTotals:    mlbData?.gameTotals   || {},
      question:      questionText || "",
    };
  }, [mlbData, mlbGames]);


  const buildGolfContext = useCallback((questionText) => {
    return {
      currentEvent: golfData?.currentEvent || null,
      rankings:     golfData?.rankings     || [],
      odds:         golfData?.odds         || {},
      playerDb:     PGA_PLAYERS,
      courseDb:     PGA_COURSES,
      markets:      GOLF_MARKETS,
      question:     questionText || "",
    };
  }, [golfData]);

  // ── Core AI call ───────────────────────────────────────────────────────────
  const askUrTake = useCallback(async ({ text, matchup, setMsgs, sportHint }) => {
    if (!text||isAsking) return;
    if (!canAsk()) return;   // gate check
    recordQuery();            // record usage
    setIsAsking(true);
    const imgToSend=pastedImage;
    setMsgs(prev=>[...prev,{role:"user",text,image:imgToSend?.previewUrl||null},{role:"ai",text:"ANALYZING...",loading:true,sport:sportHint}]);
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
        mlbContext: buildMlbContext(text),
        golfContext: buildGolfContext(text),
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
    const games = nbaGames.length > 0 ? nbaGames : (nbaData?.todaysGames || []);
    const liveGame = games.find(g => g.state === "in");
    const nextGame = games.find(g => g.state === "pre");
    const cards = [];
    if (liveGame) {
      const away = liveGame.awayTeam?.abbr || liveGame.awayTeam?.name || "Away";
      const home = liveGame.homeTeam?.abbr || liveGame.homeTeam?.name || "Home";
      cards.push({id:"nba-live-1",league:"NBA LIVE",leagueColor:"#FF6B00",title:`${away} vs ${home}`,time:"LIVE",network:`${liveGame.awayTeam?.score||0} — ${liveGame.homeTeam?.score||0}`,blurb:"Live game in progress. Ask for the best prop or spread angle.",whatMatters:"Ask for live prop edges or game total angle.",quickHitters:["Best live prop right now?","Best spread angle?","Who covers?"],confirmed:true});
    } else if (nextGame) {
      const away = nextGame.awayTeam?.abbr || nextGame.awayTeam?.name || "Away";
      const home = nextGame.homeTeam?.abbr || nextGame.homeTeam?.name || "Home";
      cards.push({id:"nba-next-1",league:"NBA",leagueColor:"#FF6B00",title:`${away} vs ${home}`,time:nextGame.status,network:"Tonight's Slate",blurb:"Ask for the best prop angle on tonight's NBA slate.",whatMatters:"Ask for the safest PRA bet or best game total.",quickHitters:["Best prop tonight?","Safest PRA bet?","Best game total?"],confirmed:true});
    } else if (games.length > 0) {
      // All games final — show tomorrow preview
      cards.push({id:"nba-tomorrow",league:"NBA",leagueColor:"#FF6B00",title:"Tonight's slate is done",time:"Check back tomorrow",network:"NBA Props",blurb:"All games final. Ask for the best plays on tomorrow's slate.",whatMatters:"Ask for tomorrow's best prop plays.",quickHitters:["Best prop tomorrow?","Safest PRA bet tomorrow?","Top plays for tomorrow?"],confirmed:true});
    } else {
      cards.push({id:"nba-default",league:"NBA",leagueColor:"#FF6B00",title:"NBA Props",time:"Active",network:"Player Props",blurb:"Ask about any player prop, PRA bet, or game total.",whatMatters:"Ask for the best prop on any player or tonight's slate.",quickHitters:["Best PRA bet tonight?","Safest prop right now?","Best usage spike play?"],confirmed:true});
    }
    return cards.slice(0,1);
  }, [nbaData, nbaGames]);

  const homeMlbCards = useMemo(() => {
    const games = mlbData?.games || [];
    const liveGame = games.find(g => g.state === "in");
    const nextGame = games.find(g => g.state === "pre");
    if (liveGame) {
      const away = liveGame.awayTeam?.abbr || "Away";
      const home = liveGame.homeTeam?.abbr || "Home";
      return [{ id:"mlb-live-1", league:"MLB LIVE", leagueColor:"#1DB954", title:`${away} @ ${home}`, time:"LIVE", network:`${liveGame.awayTeam?.score||0} — ${liveGame.homeTeam?.score||0}`, blurb:"Live game. Ask for best live prop or total angle.", whatMatters:"Ask for live K prop, batter hit, or first-5 angle.", quickHitters:["Best live prop?","Pitcher still rolling?","Back the OVER or UNDER?"], confirmed:true }];
    }
    if (nextGame) {
      const away = nextGame.awayTeam?.abbr || "Away";
      const home = nextGame.homeTeam?.abbr || "Home";
      const awayP = nextGame.awayTeam?.pitcher ? ` [${nextGame.awayTeam.pitcher.split(" ").pop()}]` : "";
      const homeP = nextGame.homeTeam?.pitcher ? ` [${nextGame.homeTeam.pitcher.split(" ").pop()}]` : "";
      return [{ id:"mlb-next-1", league:"MLB", leagueColor:"#1DB954", title:`${away}${awayP} @ ${home}${homeP}`, time:nextGame.status, network:"Today's Slate", blurb:"Ask for the starter matchup, game total lean, or best batter prop.", whatMatters:"Pitcher K prop, game total, or correlated batter play.", quickHitters:["Best prop tonight?","Game total lean?","Best K prop?"], confirmed:true }];
    }
    return [{ id:"mlb-default", league:"MLB", leagueColor:"#1DB954", title:"MLB Props", time:"Active", network:"Player Props", blurb:"Ask about any pitcher K prop, batter hit, or game total.", whatMatters:"Ask for the best MLB prop on today's slate.", quickHitters:["Best K prop?","Best batter prop?","Best game total?"], confirmed:true }];
  }, [mlbData]);

  const homeCards = useMemo(() => [...homeTennisCards,...homeNflCards,...homeF1Cards,...homeNbaCards,...homeMlbCards].filter(Boolean), [homeTennisCards,homeNflCards,homeF1Cards,homeNbaCards,homeMlbCards]);

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
  const goMlb    = useCallback(()=>{ setTab("mlb");   setScreen("mlb");   setSelectedMatchup(null); setSelectedPlayer(null); setSelectedNflPlayer(null); },[]);
  const goAsk    = useCallback(()=>{ setTab("ask");   setScreen("ask");   setSelectedMatchup(null); },[]);
  const goPro    = useCallback(()=>{ setTab("pro");   setScreen("pro");   setSelectedMatchup(null); setSelectedPlayer(null); setSelectedNflPlayer(null); },[]);

  const goGolf   = useCallback(()=>{ setTab("golf");  setScreen("golf"); setSelectedMatchup(null); setSelectedPlayer(null); setSelectedNflPlayer(null); },[]);
  const openMatchup   = useCallback(m=>{ if(!m?.title||!m?.network)return; setSelectedMatchup(m); setMatchupMsgs([]); setMatchupInput(""); setScreen("matchup"); setTab(m?.league?.includes("NFL")?"nfl":"tennis"); },[]);
  const openPlayer    = useCallback(name=>{ setSelectedPlayer(name); setScreen("player"); setTab("tennis"); },[]);
  const openNflPlayer = useCallback(name=>{ setSelectedNflPlayer(name); setScreen("nflplayer"); setTab("nfl"); },[]);
  const firePrompt    = useCallback(prompt=>{ setTab("ask"); setScreen("ask"); setAskInput(""); askUrTake({text:prompt,setMsgs:setAskMsgs}); },[askUrTake]);

  // ── Submit handlers ────────────────────────────────────────────────────────
  const submitHome    = useCallback(()=>{ const t=homeInput.trim();    if(!t||isAsking)return; setHomeInput(""); setAskInput(""); setTab("ask"); setScreen("ask"); askUrTake({text:t,setMsgs:setAskMsgs}); },[askUrTake,homeInput,isAsking]);
  const submitAsk     = useCallback(()=>{ const t=askInput.trim();     if(!t||isAsking)return; setAskInput(""); askUrTake({text:t,setMsgs:setAskMsgs}); setTimeout(()=>{ askBarBottomRef.current?.scrollIntoView({behavior:"smooth",block:"end"}); },100); },[askInput,askUrTake,isAsking,askBarBottomRef]);
  const tennisBarRef  = useRef(null);
  const submitTennis  = useCallback(forced=>{ const t=(forced??tennisInput).trim(); if(!t||isAsking)return; if(!forced)setTennisInput(""); askUrTake({text:t,setMsgs:setTennisMsgs,sportHint:"tennis"}); setTimeout(()=>{ tennisBarRef.current?.scrollIntoView({behavior:"smooth",block:"end"}); },100); },[askUrTake,isAsking,tennisInput]);
  const nflBarRef     = useRef(null);
  const submitNfl     = useCallback(forced=>{ const t=(forced??nflInput).trim();    if(!t||isAsking)return; if(!forced)setNflInput("");   askUrTake({text:t,setMsgs:setNflMsgs,sportHint:"nfl"}); setTimeout(()=>{ nflBarRef.current?.scrollIntoView({behavior:"smooth",block:"end"}); },100); },[askUrTake,isAsking,nflInput]);
  const f1BarRef      = useRef(null);
  const submitF1      = useCallback(forced=>{ const t=(forced??f1Input).trim();     if(!t||isAsking)return; if(!forced)setF1Input("");    askUrTake({text:t,setMsgs:setF1Msgs,sportHint:"f1"}); setTimeout(()=>{ f1BarRef.current?.scrollIntoView({behavior:"smooth",block:"end"}); },100); },[askUrTake,isAsking,f1Input]);
  const nbaBarRef     = useRef(null);
  const submitNba     = useCallback(forced=>{ const t=(forced??nbaInput).trim();    if(!t||isAsking)return; if(!forced)setNbaInput("");   askUrTake({text:t,setMsgs:setNbaMsgs,sportHint:"nba"}); setTimeout(()=>{ nbaBarRef.current?.scrollIntoView({behavior:"smooth",block:"end"}); },100); },[askUrTake,isAsking,nbaInput]);
  const mlbBarRef     = useRef(null);
  const submitMlb     = useCallback(forced=>{ const t=(forced??mlbInput).trim();    if(!t||isAsking)return; if(!forced)setMlbInput("");   askUrTake({text:t,setMsgs:setMlbMsgs,sportHint:"mlb"}); setTimeout(()=>{ mlbBarRef.current?.scrollIntoView({behavior:"smooth",block:"end"}); },100); },[askUrTake,isAsking,mlbInput]);

  const golfBarRefLocal = golfBarRef;
  const submitGolf = useCallback(forced=>{ const t=(forced??golfInput).trim(); if(!t||isAsking)return; if(!forced)setGolfInput(""); askUrTake({text:t,setMsgs:setGolfMsgs,sportHint:"golf"}); setTimeout(()=>{ golfBarRefLocal.current?.scrollIntoView({behavior:"smooth",block:"end"}); },100); },[askUrTake,isAsking,golfInput,golfBarRefLocal]);
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
      {screen==="tennis"&&<span className="pill-tennis">{context?.currentTournament?.name?context.currentTournament.name.toUpperCase():"TENNIS"}</span>}
      {screen==="nfl"&&<span className="pill-nfl">{nflSeasonMode?"NFL IN-SEASON":"NFL FUTURES"}</span>}
      {screen==="nflplayer"&&nflPd&&<span className="pill-nfl">{selectedNflPlayer?.toUpperCase()}</span>}
      {screen==="f1"&&<span className="pill-f1">F1 2026</span>}
      {screen==="nba"&&<span className="pill-nba">NBA PROPS</span>}
      {screen==="player"&&<span className="pill-tag">{selectedPlayer?.toUpperCase()}</span>}
      {screen==="matchup"&&selectedMatchup&&(selectedMatchup.league?.includes("NFL")?<span className="pill-nfl">{selectedMatchup.league}</span>:<span className="pill-tag">{selectedMatchup.network?.toUpperCase()||selectedMatchup.league}</span>)}
      {screen==="ask"&&<span className="pill-tag">UR TAKE</span>}
      {screen==="pro"&&<span className="pill-tag" style={{color:"#F5C842",borderColor:"rgba(245,200,66,.3)"}}>PRO</span>}
      {screen==="mlb"&&<span className="pill-mlb">MLB PROPS</span>}
      {screen==="golf"&&<span style={{fontFamily:"var(--mono-font)",fontSize:9,padding:"3px 8px",borderRadius:999,color:"#FFFFFF",border:"1px solid rgba(255,255,255,.25)",background:"rgba(255,255,255,.06)",whiteSpace:"nowrap"}}>{golfData?.currentEvent?.shortName||"PGA TOUR"}</span>}
      {screen==="home"&&<span className="hdr-tagline">Sharp takes. Real data.</span>}
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
          <div className="wordmark" onClick={goHome}><span className="logo-under">Under</span><span className="logo-review">Review</span></div>
          <div className="header-right">{headerPill}</div>
        </header>

        {/* ══ HOME ══ */}
        {screen==="home"&&(
          <main className="screen" style={{padding:"8px 12px 70px"}}>

            {/* Ask bar — leads immediately, no hero copy */}
            <AskBar inputRef={homeInputRef} value={homeInput} onChange={setHomeInput} onSubmit={submitHome} placeholder="Ask about any player, game, or bet..." {...askBarCommon} />

            {/* Sport pill rail — horizontal scroll, feels like tabs */}
            <div className="sport-rail">
              <button className="sport-pill sport-pill-tennis" onClick={goTennis}>TENNIS</button>
              <button className="sport-pill sport-pill-nfl" onClick={goNfl}>NFL</button>
              <button className="sport-pill sport-pill-f1" onClick={goF1}>F1</button>
              <button className="sport-pill sport-pill-nba" onClick={goNba}>NBA</button>
              <button className="sport-pill sport-pill-mlb" onClick={goMlb}>MLB</button>
              <button className="sport-pill" style={{color:"#FFFFFF",borderColor:"rgba(255,255,255,.5)"}} onClick={goGolf}>GOLF</button>
            </div>

            {/* NBA games ticker — only when games exist */}
            {(()=>{
              // Priority: live games first, then next upcoming. Max 5 cards + See All.
              const nbaLive = nbaGames.filter(g=>g.state==="in");
              const nbaNext = nbaGames.filter(g=>g.state==="pre").slice(0,2);
              const allMlb  = mlbGames.length > 0 ? mlbGames : (mlbData?.games||[]);
              const mlbLive = allMlb.filter(g=>g.state==="in");
              const mlbNext = allMlb.filter(g=>g.state==="pre").slice(0,1);
              const cards   = [...nbaLive,...nbaNext,...mlbLive,...mlbNext].slice(0,5);
              const hasMore = allMlb.length > mlbLive.length + mlbNext.length || nbaGames.length > nbaLive.length + nbaNext.length;
              if (cards.length === 0) return null;
              return (
                <div style={{display:"flex",gap:8,overflowX:"auto",scrollbarWidth:"none",marginBottom:14,alignItems:"stretch"}}>
                  {cards.map((g,i)=>{
                    const isNba  = nbaGames.includes(g);
                    const away   = g.awayTeam?.abbr||"AWAY";
                    const home   = g.homeTeam?.abbr||"HOME";
                    const isLive = g.state==="in";
                    const accent = isNba?"#FF6B00":"#1DB954";
                    return (
                      <div key={i} onClick={isNba?goNba:goMlb} style={{
                        flexShrink:0,background:"var(--surface)",
                        border:`1px solid ${isLive?"rgba(0,230,118,.3)":"var(--border)"}`,
                        borderRadius:10,padding:"8px 11px",cursor:"pointer",minWidth:100,
                      }}>
                        <div style={{fontFamily:"var(--mono-font)",fontSize:7,letterSpacing:1.5,
                          color:isLive?"#00E676":accent,marginBottom:3}}>
                          {isNba?"":"⚾ "}{isLive?"● LIVE":g.status}
                        </div>
                        <div style={{fontSize:12,fontWeight:700,color:"var(--text)",lineHeight:1.2}}>{away}</div>
                        <div style={{fontSize:11,color:"var(--muted)"}}>@ {home}</div>
                        {isLive && g.awayTeam?.score!=null &&
                          <div style={{fontFamily:"var(--mono-font)",fontSize:11,color:"var(--soft)",marginTop:2}}>
                            {g.awayTeam.score}-{g.homeTeam.score}
                          </div>}
                      </div>
                    );
                  })}
                  {hasMore && (
                    <div onClick={goMlb} style={{
                      flexShrink:0,background:"transparent",border:"1px solid var(--border-2)",
                      borderRadius:10,padding:"8px 11px",cursor:"pointer",minWidth:72,
                      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                    }}>
                      <div style={{fontSize:11,color:"var(--muted)"}}>See</div>
                      <div style={{fontSize:11,color:"var(--muted)"}}>all →</div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Ask cards — sharp, action-oriented, colored accent bars */}
            <div className="ask-cards">
              {dynamicHomeQuestions.map(q=>(
                <div key={q.id} className="ask-card" onClick={()=>firePrompt(q.prompt)}>
                  <div className="ask-card-bar" style={{background:q.color}}/>
                  <div className="ask-card-text">{q.text}</div>
                  <div style={{color:"var(--muted)",fontSize:16,flexShrink:0}}>›</div>
                </div>
              ))}
            </div>

            {/* Spotlight cards — tight, sport-colored, edge-focused */}
            {homeCards.map(m=>(
              <div key={m.id} className="spotlight-card" onClick={()=>openMatchup(m)}>
                <div className="spotlight-top">
                  <span className="spotlight-sport" style={{color:m.leagueColor}}>{m.homeCategory||m.league}</span>
                  <span className="spotlight-time">{m.time}</span>
                </div>
                <div className="spotlight-title">{m.title}</div>
                <div className="spotlight-edge">{m.blurb}</div>
              </div>
            ))}

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

            {tennisMsgs.length===0&&(
              <div ref={tennisBarRef} style={{background:"var(--surface)",border:"1px solid rgba(255,230,0,.2)",borderRadius:14,padding:14,marginBottom:16}}>
                <div style={{fontSize:10,color:"#FFE600",fontFamily:"var(--mono-font)",letterSpacing:2,marginBottom:8,textTransform:"uppercase"}}>Ask Anything — Tennis</div>
                <AskBar inputRef={tennisInputRef} value={tennisInput} onChange={setTennisInput} onSubmit={()=>submitTennis()} placeholder="Best tennis bet? Which match is mispriced?" {...askBarCommon} />
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {["Best tennis bet tonight?","Which match is mispriced?","Best live angle?","Best futures value?"].map(q=>(
                    <button key={q} className="quick-btn" onClick={()=>submitTennis(q)} style={{fontSize:11}}>{q}</button>
                  ))}
                </div>
              </div>
            )}

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
            {nflMsgs.length===0&&(
              <div className="nfl-ask-shell" ref={nflBarRef}>
              <AskBar inputRef={nflInputRef} value={nflInput} onChange={setNflInput} onSubmit={()=>submitNfl()} placeholder={nflSeasonMode?"Best WR prop this week? Biggest role change?":"Which RB leads TDs in 2026? Best future?"} btnColor="#4A90D9" {...askBarCommon} />
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {(nflSeasonMode?["Best WR props this week?","Biggest usage jump?","Best TD scorer angle?","Which line is stale?"]:["Best WR future?","Top TE by volume?","Fade or take Kelce?","Best RB rushing future?"]).map(q=>(
                  <button key={q} className="quick-btn" onClick={()=>submitNfl(q)} style={{fontSize:11}}>{q}</button>
                ))}
              </div>
              </div>
            )}
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

            {f1Msgs.length===0&&(
              <div className="f1-ask-shell" ref={f1BarRef}>
                <div className="f1-ask-label">Ask Anything — F1</div>
                <AskBar inputRef={f1InputRef} value={f1Input} onChange={setF1Input} onSubmit={()=>submitF1()} placeholder="Who wins the next Grand Prix? Best F1 future?" btnColor="var(--f1)" {...askBarCommon} />
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {["Who wins the next Grand Prix?","Best F1 future right now?","Is Antonelli for real?","Hamilton podium value?"].map(q=>(
                    <button key={q} className="quick-btn" onClick={()=>submitF1(q)} style={{fontSize:11}}>{q}</button>
                  ))}
                </div>
              </div>
            )}
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
              <div className="banner-title">NBA</div>
              <div className="banner-sub">PLAYER PROPS · GAME TOTALS · BETTING ANGLES</div>
              <div className="banner-note">
                {nbaGames.length > 0
                  ? `${nbaGames.filter(g=>g.state==="in").length > 0 ? nbaGames.filter(g=>g.state==="in").length + " live · " : ""}${nbaGames.length} games today`
                  : nbaLoading ? "Loading..." : "Ask anything about NBA props"}
              </div>
            </div>

            {nbaMsgs.length===0&&(
              <div className="nba-ask-shell" ref={nbaBarRef}>
              <AskBar inputRef={nbaInputRef} value={nbaInput} onChange={setNbaInput} onSubmit={()=>submitNba()} placeholder="Jokic PRA over tonight? Best prop this slate?" btnColor="var(--nba)" {...askBarCommon} />
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {["Best prop on tonight's slate?","Safest PRA bet tonight?","Who has a usage spike today?","Best game total play?"].map(q=>(
                  <button key={q} className="quick-btn" onClick={()=>submitNba(q)} style={{fontSize:11}}>{q}</button>
                ))}
              </div>
              </div>
            )}

            <ChatThread msgs={nbaMsgs}/>

            {nbaLoading ? (
              <div className="loading-state"><div className="loading-text">LOADING NBA DATA...</div></div>
            ) : (
              <>
                {nbaGames.length > 0 && (
                  <>
                    <div className="section-divider">
                      {nbaGames.filter(g=>g.state==="in").length > 0 ? "🔴 Live Games" : "Today's Games"}
                    </div>
                    {nbaGames.map((g,i) => {
                      const away = g.awayTeam?.abbr || g.awayTeam?.name || "Away";
                      const home = g.homeTeam?.abbr || g.homeTeam?.name || "Home";
                      const isLive = g.state === "in";
                      const isFinal = g.state === "post";
                      return (
                        <div key={g.id||i} className="nba-game-card" onClick={()=>submitNba(`Best prop angle for ${away} vs ${home} tonight?`)}>
                          <div className="nba-game-top">
                            <div className="nba-game-teams">{away} vs {home}</div>
                            <div>{isLive ? <span className="nba-live-badge">● LIVE</span> : <span className="nba-game-status">{isFinal ? "FINAL" : g.status}</span>}</div>
                          </div>
                          {(isLive || isFinal) && g.awayTeam?.score != null && (
                            <div className="nba-game-score">{g.awayTeam.score} — {g.homeTeam.score}</div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}

                <div className="section-divider">Quick Prop Angles</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"0 0 12px"}}>
                  {[
                    ["Best PRA bet tonight?", "Who has the highest floor PRA on tonight's slate? Give me floor, ceiling, and lean."],
                    ["Best 3PM prop?", "Who should I bet OVER on 3-pointers made tonight? Give me the play with volume and efficiency context."],
                    ["Injury replacement edge?", "Who has a usage spike tonight due to injury? Find the replacement play with the best prop value."],
                    ["Best game total?", "Which game total on tonight's slate has the sharpest OVER or UNDER? Give me the pace matchup and lean."],
                    ["Safest prop tonight?", "What is the single safest, highest-confidence NBA prop on tonight's slate? One play, full reasoning."],
                    ["Best points prop?", "Who has the best points OVER tonight? Give me the matchup, defensive ranking they're facing, and lean."],
                  ].map(([label, q]) => (
                    <button key={label} className="quick-btn" onClick={()=>submitNba(q)} style={{fontSize:11}}>{label}</button>
                  ))}
                </div>

                <div className="section-divider">Ask About Any Player</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"0 0 8px"}}>
                  {["Jokic","SGA","Luka","Tatum","Giannis","Wembanyama","Brunson","Edwards","KAT","Curry","Haliburton","Mitchell","KD","Booker","Ja Morant"].map(name => (
                    <button key={name} className="quick-btn" onClick={()=>submitNba(`Best prop angle for ${name} tonight? PRA line, floor, ceiling, and lean.`)} style={{fontSize:11}}>{name}</button>
                  ))}
                </div>
              </>
            )}
            <div className="page-spacer"/>
          </main>
        )}

        {/* ══ MLB ══ */}
        {screen==="mlb"&&(
          <main className="screen">
            <div style={{borderRadius:16,padding:16,marginBottom:16,border:"1px solid rgba(29,185,84,.2)",background:"linear-gradient(135deg,rgba(29,185,84,.08),rgba(0,100,40,.04))"}}>
              <div style={{fontFamily:"var(--display-font)",fontSize:28,letterSpacing:1,marginBottom:2}}>MLB</div>
              <div style={{fontFamily:"var(--mono-font)",fontSize:9,color:"var(--muted)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>PROPS / GAME TOTALS / PITCHER ANGLES</div>
              <div style={{fontSize:12,color:"var(--soft)"}}>
                {mlbLoading ? "Loading..." : mlbGames.length > 0 ? `${mlbGames.length} games today` : (mlbData?.games?.length > 0) ? `${mlbData.games.length} games today` : "MLB Season Active — Ask about any game or player"}
              </div>
            </div>

            {mlbMsgs.length===0&&(
              <div style={{background:"var(--surface)",border:"1px solid rgba(29,185,84,.2)",borderRadius:14,padding:14,marginBottom:16}} ref={mlbBarRef}>
                <div style={{fontFamily:"var(--mono-font)",fontSize:10,color:"#1DB954",letterSpacing:2,marginBottom:8,textTransform:"uppercase"}}>Ask Anything -- MLB</div>
                <AskBar inputRef={mlbInputRef} value={mlbInput} onChange={setMlbInput} onSubmit={()=>submitMlb()} placeholder="Best K prop tonight? Park factor angle? Best game total?" btnColor="#1DB954" {...askBarCommon}/>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
                  {["Best pitcher K prop?","Best batter hits prop?","Best game total?","Best home run prop?"].map(q=>(
                    <button key={q} className="quick-btn" onClick={()=>submitMlb(q)} style={{fontSize:11}}>{q}</button>
                  ))}
                </div>
              </div>
            )}

            <ChatThread msgs={mlbMsgs}/>

            {mlbLoading && mlbGames.length === 0 ? (
              <div className="loading-state"><div className="loading-text">LOADING MLB DATA...</div></div>
            ) : (
              <>
                {(mlbGames.length > 0 || mlbData?.games?.length > 0) && (
                  <>
                    {(()=>{
                      const src = mlbGames.length > 0 ? mlbGames : (mlbData?.games||[]);
                      const liveCount = src.filter(g=>g.state==="in").length;
                      const finalCount = src.filter(g=>g.state==="post").length;
                      const preCount = src.filter(g=>g.state==="pre").length;
                      return <div className="section-divider">{liveCount>0?`${liveCount} Live`:""}{liveCount>0&&(finalCount+preCount>0)?" · ":""}{finalCount>0?`${finalCount} Final`:""}{preCount>0&&(liveCount+finalCount>0)?" · ":""}{preCount>0?`${preCount} Upcoming`:""}</div>;
                    })()}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:4}}>
                    {(mlbGames.length > 0 ? mlbGames : (mlbData?.games || [])).map((g,i) => {
                      const away = g.awayTeam;
                      const home = g.homeTeam;
                      const isLive = g.state === "in";
                      const isFinal = g.state === "post";
                      const isPre = g.state === "pre";
                      const matchupStr = `${away.abbr||away.name} @ ${home.abbr||home.name}`;
                      return (
                        <div key={g.id||i} style={{
                          background:"var(--surface)",
                          border:`1px solid ${isLive?"rgba(0,230,118,.3)":"var(--border)"}`,
                          borderRadius:10,padding:"9px 10px",cursor:"pointer",transition:"border-color .15s",
                        }} onClick={()=>submitMlb(`Best prop angle for ${matchupStr} today? Give me the sharpest K prop, game total lean, and best batter play.`)}>
                          <div style={{fontFamily:"var(--mono-font)",fontSize:7,letterSpacing:1.5,marginBottom:4,
                            color:isLive?"#00E676":isFinal?"var(--muted)":"#1DB954"}}>
                            {isLive?"● LIVE":isFinal?"FINAL":g.status?.replace(" ET","ET")||""}
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                            <div>
                              <div style={{fontSize:13,fontWeight:700,color:"var(--text)",lineHeight:1.15}}>{away.abbr||away.name}</div>
                              <div style={{fontSize:11,color:"var(--muted)",lineHeight:1.15}}>@ {home.abbr||home.name}</div>
                            </div>
                            {(isLive||isFinal) && away.score!=null ? (
                              <div style={{fontFamily:"var(--mono-font)",textAlign:"right"}}>
                                <div style={{fontSize:14,fontWeight:700,color:isLive?"var(--text)":"var(--soft)",lineHeight:1.15}}>{away.score}</div>
                                <div style={{fontSize:14,fontWeight:700,color:isLive?"var(--text)":"var(--soft)",lineHeight:1.15}}>{home.score}</div>
                              </div>
                            ) : (
                              <div style={{fontSize:9,fontFamily:"var(--mono-font)",color:"var(--muted)",textAlign:"right",lineHeight:1.4}}>
                                TAP<br/>ANGLE
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </>
                )}
                <div className="section-divider">Quick Prop Angles</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"0 0 12px"}}>
                  {[
                    ["Best K prop?","Who is the best pitcher strikeout OVER tonight? K/9, opposing lineup, confidence."],
                    ["Best hits prop?","Best batter hits OVER tonight? Batting average, pitcher ERA, park factor."],
                    ["Best game total?","Which MLB game total has the sharpest angle tonight? Run environment and lean."],
                    ["Best HR prop?","Best home run prop tonight? Barrel rate, launch angle, pitcher HR/FB rate."],
                    ["Park factor edge?","Which game tonight has the biggest park factor edge? Coors, Petco, extreme parks."],
                    ["Best SGP?","Build the sharpest MLB same game parlay tonight. Pitcher K over + batter prop."],
                  ].map(([label,q]) => (
                    <button key={label} className="quick-btn" onClick={()=>submitMlb(q)} style={{fontSize:11}}>{label}</button>
                  ))}
                </div>
                <div className="section-divider">Ask About Any Player</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"0 0 8px"}}>
                  {["Ohtani","Judge","Freeman","Betts","Acuna","Lindor","Seager","Harper","Guerrero","Ramirez","J. Rodriguez","Carroll","Henderson","Pete Alonso","Corbin Burnes","Zack Wheeler","Paul Skenes","Hunter Greene"].map(name => (
                    <button key={name} className="quick-btn" onClick={()=>submitMlb(`Best prop angle for ${name} today? Line, floor, ceiling, and lean.`)} style={{fontSize:11}}>{name}</button>
                  ))}
                </div>
              </>
            )}
            <div className="page-spacer"/>
          </main>
        )}


        {/* ══ GOLF ══ */}
        {screen==="golf"&&(
          <main className="screen">
            <div className="golf-banner">
              <div style={{fontFamily:"var(--display-font)",fontSize:28,letterSpacing:1,marginBottom:2}}>{golfData?.currentEvent?.name||"PGA TOUR"}</div>
              <div style={{fontFamily:"var(--mono-font)",fontSize:9,color:"var(--muted)",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>OUTRIGHTS / PROPS / MATCHUP EDGES</div>
              <div style={{fontSize:12,color:"var(--soft)"}}>
                {golfLoading?"Loading...":golfData?.currentEvent
                  ?`${golfData.currentEvent.course} — ${golfData.currentEvent.round}`
                  :"Ask about any player, tournament, or prop"}
              </div>
            </div>

            {golfMsgs.length===0&&(
              <div className="golf-ask-shell" ref={golfBarRef}>
                <div className="golf-ask-label">Ask Anything — Golf</div>
                <AskBar inputRef={golfInputRef} value={golfInput} onChange={setGolfInput} onSubmit={()=>submitGolf()} placeholder="Scheffler top 5? Best make-cut play? Matchup angle?" btnColor="#FFFFFF" {...askBarCommon}/>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
                  {["Best outright value?","Safest make-cut play?","Best top-10 play?","Best matchup H2H?"].map(q=>(
                    <button key={q} className="quick-btn" onClick={()=>submitGolf(q)} style={{fontSize:11}}>{q}</button>
                  ))}
                </div>
              </div>
            )}

            <ChatThread msgs={golfMsgs}/>

            {/* Live leaderboard */}
            {golfData?.currentEvent?.leaderboard?.length > 0 && (
              <>
                <div className="section-divider">{golfData.currentEvent.name} — {golfData.currentEvent.round}</div>
                {golfData.currentEvent.leaderboard.slice(0,20).map((player,i)=>(
                  <div key={i} className="golf-leaderboard-card" onClick={()=>submitGolf(`Best betting angle on ${player.name} right now? Outright, top-10, or matchup?`)}>
                    <div className="golf-pos">{player.position||i+1}</div>
                    <div className="golf-player-info">
                      <div className="golf-player-name">{player.name}</div>
                      <div className="golf-player-country">{player.country}</div>
                    </div>
                    <div className="golf-score">
                      <span className="golf-score-num" style={{color:player.score&&player.score.startsWith("-")?"#00E676":player.score==="E"?"var(--text)":"#FF4444"}}>{player.score||"—"}</span>
                      <span className="golf-score-label">{player.thru&&player.thru!=="—"?`THRU ${player.thru}`:""}</span>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Outright odds */}
            {golfData?.odds?.outrights?.length > 0 && (
              <>
                <div className="section-divider">Outright Odds — This Week</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
                  {golfData.odds.outrights.slice(0,20).map((o,i)=>(
                    <div key={i} className="golf-odds-card" onClick={()=>submitGolf(`Best angle on ${o.player}? Outright, top 10, or matchup — give me the sharpest play.`)}>
                      <div style={{fontSize:13,color:"var(--text)",fontWeight:600}}>{o.player}</div>
                      <div className="golf-player-odds">{o.odds>0?"+":""}{o.odds}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="section-divider">Quick Angles</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"0 0 12px"}}>
              {[
                ["Best outright value?","Who has the best outright value at this week's PGA Tour event? Consider field strength, course fit, and SG profile."],
                ["Best top-10 play?","Who is the best top-10 bet at this week's PGA Tour event? Give me the highest-confidence play with reasoning."],
                ["Safest make-cut?","Who is the safest make-cut bet at this week's event? Prioritize players with 80%+ cut-making history and good current form."],
                ["Best matchup H2H?","Build the sharpest head-to-head matchup play at this week's event. Consider SG splits and course fit."],
                ["Best FRL play?","Who is the best first round leader bet? Consider power players, morning draws, and current form."],
                ["Who to fade?","Who should I fade this week? Tell me the player overpriced relative to their SG profile and course fit."],
              ].map(([label,prompt])=>(
                <button key={label} className="quick-btn" onClick={()=>submitGolf(prompt)} style={{fontSize:11}}>{label}</button>
              ))}
            </div>

            <div className="section-divider">Ask About Any Player</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"0 0 8px"}}>
              {["Scheffler","Rory","Schauffele","Morikawa","Hovland","Cantlay","Rahm","Ludvig Aberg","Tom Kim","Spieth","JT","Fleetwood","Fitzpatrick","Hatton","Lowry","Matsuyama","Brian Harman","Cameron Young","Wyndham Clark","Sahith Theegala"].map(name=>(
                <button key={name} className="quick-btn" onClick={()=>submitGolf(`Best betting angle for ${name} this week? Top 10, matchup, outright, or make cut?`)} style={{fontSize:11}}>{name}</button>
              ))}
            </div>

            <div className="page-spacer"/>
          </main>
        )}

        {/* ══ PRO ══ */}
        {screen==="pro"&&(
          <main className="screen" style={{padding:"0 0 80px"}}>

            {/* Already unlocked banner */}
            {(accessTier==="owner"||accessTier==="friend")&&!proSuccess&&(
              <div style={{background:"linear-gradient(135deg,rgba(0,245,233,.08),rgba(0,245,233,.04))",border:"1px solid rgba(0,245,233,.2)",borderRadius:14,padding:"14px 20px",margin:"12px 16px 0",display:"flex",alignItems:"center",gap:12}}>
                <div style={{fontSize:18}}>🔓</div>
                <div>
                  <div style={{fontFamily:"var(--mono-font)",fontSize:10,color:"var(--cyan-bright)",letterSpacing:2,marginBottom:2}}>{accessTier==="owner"?"OWNER ACCESS":"FRIEND ACCESS"}</div>
                  <div style={{fontSize:12,color:"var(--muted)"}}>{accessTier==="owner"?"Full access. No limits.":"Unlocked via access code. Enjoy."}</div>
                </div>
              </div>
            )}

            {/* Success banner */}
            {proSuccess&&(
              <div style={{background:"linear-gradient(135deg,rgba(0,230,118,.12),rgba(29,185,84,.06))",border:"1px solid rgba(0,230,118,.3)",borderRadius:14,padding:"16px 20px",margin:"12px 16px 0",textAlign:"center"}}>
                <div style={{fontSize:20,marginBottom:4}}>🎉</div>
                <div style={{fontFamily:"var(--display-font)",fontSize:22,letterSpacing:1,color:"#00E676",marginBottom:4}}>YOU'RE IN</div>
                <div style={{fontSize:13,color:"var(--soft)"}}>Welcome to Under Review Pro. Every edge is unlocked.</div>
              </div>
            )}

            {/* Hero — full-width, bold, no fluff */}
            <div style={{
              background:"linear-gradient(160deg,rgba(245,200,66,.1) 0%,rgba(255,45,107,.06) 60%,var(--bg) 100%)",
              borderBottom:"1px solid rgba(245,200,66,.15)",
              padding:"32px 20px 28px",textAlign:"center",marginBottom:4,
            }}>
              <div style={{fontFamily:"var(--mono-font)",fontSize:9,letterSpacing:4,color:"rgba(245,200,66,.6)",marginBottom:12,textTransform:"uppercase"}}>Under Review</div>
              <div style={{fontFamily:"var(--display-font)",fontSize:52,letterSpacing:2,lineHeight:1,marginBottom:10,background:"linear-gradient(135deg,#F5C842,#FF8C00)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>PRO</div>
              <div style={{fontSize:15,color:"var(--soft)",lineHeight:1.6,maxWidth:280,margin:"0 auto 20px"}}>
                The sharpest betting intelligence on any sport. Yours for less than one bad bet.
              </div>
              <div style={{display:"inline-flex",alignItems:"baseline",gap:4,marginBottom:6}}>
                <span style={{fontFamily:"var(--display-font)",fontSize:42,color:"#F5C842",letterSpacing:1}}>$9.99</span>
                <span style={{fontFamily:"var(--mono-font)",fontSize:11,color:"var(--muted)"}}>/month</span>
              </div>
              <div style={{fontFamily:"var(--mono-font)",fontSize:9,letterSpacing:2,color:"rgba(245,200,66,.5)",marginBottom:24}}>7 DAYS FREE — NO CARD CHARGED UNTIL TRIAL ENDS</div>
              <button className="pro-cta" style={{maxWidth:340,margin:"0 auto",display:"block"}} onClick={async ()=>{
                try {
                  const res = await fetch("/api/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({})});
                  const data = await res.json();
                  if (data.url) window.location.href = data.url;
                  else alert("Could not start checkout. Try again.");
                } catch { alert("Something went wrong. Try again."); }
              }}>START FREE TRIAL</button>
              <div style={{fontFamily:"var(--mono-font)",fontSize:9,color:"var(--muted)",marginTop:10,letterSpacing:1}}>Cancel anytime. No commitment.</div>
              <div style={{marginTop:14}}>
                <button onClick={()=>setShowCodeEntry(true)} style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:11,fontFamily:"var(--body-font)",textDecoration:"underline",textUnderlineOffset:3}}>Have an access code? Enter it here</button>
              </div>
            </div>

            {/* Features — what you actually get */}
            <div style={{padding:"20px 16px 0"}}>
              <div style={{fontFamily:"var(--mono-font)",fontSize:9,letterSpacing:3,color:"var(--muted)",marginBottom:14,textTransform:"uppercase"}}>What you get</div>

              {[
                {
                  sport:"TENNIS",color:"#FFE600",
                  title:"Deep Tennis Intelligence",
                  body:"ATP/WTA Elo ratings across every surface. Rally profiles, serve baselines, and draw-path edges. The only tool that tells you when a clay specialist is mispriced on a hard court."
                },
                {
                  sport:"MLB",color:"#1DB954",
                  title:"MLB Pitcher & Batter Props",
                  body:"Park-adjusted K props, platoon splits, and barrel rate context. When lines drop, you'll know exactly which pitcher is overvalued and which batter is facing a weak arm."
                },
                {
                  sport:"NBA",color:"#FF6B00",
                  title:"NBA Prop Edges",
                  body:"PRA floors and ceilings calibrated to pace and matchup. Injury replacement plays surfaced in real time. The plays that move before the public catches up."
                },
                {
                  sport:"NFL",color:"#4A90D9",
                  title:"NFL Skill Position Database",
                  body:"Per-game stats, TD rates, prop floors and ceilings for every relevant RB, WR, and TE. Built for the futures window and in-season weekly props."
                },
                {
                  sport:"F1",color:"#E10600",
                  title:"F1 Race & Qualifying Angles",
                  body:"Full 2026 driver grid with circuit-specific edges. Street circuit vs power circuit edges. Antonelli, Russell, and the fades that the market hasn't priced yet."
                },
              ].map(f=>(
                <div key={f.sport} style={{
                  background:"var(--surface)",border:"1px solid var(--border)",
                  borderRadius:14,padding:"14px 16px",marginBottom:8,
                  borderLeft:`3px solid ${f.color}`,
                }}>
                  <div style={{fontFamily:"var(--mono-font)",fontSize:8,letterSpacing:2,color:f.color,marginBottom:6}}>{f.sport}</div>
                  <div style={{fontSize:15,fontWeight:700,color:"var(--text)",marginBottom:4}}>{f.title}</div>
                  <div style={{fontSize:13,color:"var(--muted)",lineHeight:1.6}}>{f.body}</div>
                </div>
              ))}

              {/* Social proof strip */}
              <div style={{
                background:"rgba(245,200,66,.04)",border:"1px solid rgba(245,200,66,.12)",
                borderRadius:12,padding:"14px 16px",marginTop:16,marginBottom:8,textAlign:"center"
              }}>
                <div style={{fontSize:13,color:"var(--soft)",lineHeight:1.7,fontStyle:"italic"}}>
                  "Less than the cost of one bad prop bet. More edge than most services charging 10x this."
                </div>
              </div>

              <div style={{textAlign:"center",padding:"16px 0 4px",fontFamily:"var(--mono-font)",fontSize:9,color:"var(--muted)",letterSpacing:1}}>
                Powered by Stripe. Secure checkout. Cancel anytime.
              </div>
            </div>
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
            <div ref={askBarBottomRef} style={{height:1}}/>
            {askMsgs.length===0?(
              <section className="section"><div className="section-label">TRY ONE</div><div className="q-list">{dynamicHomeQuestions.map(q=><button key={q.id} className="q-card" onClick={()=>firePrompt(q.prompt)}><div className="q-top"><div className="q-accent" style={{background:q.color}}/><div className="q-text">{q.text}</div></div></button>)}</div></section>
            ):(
              <ChatThread msgs={askMsgs}/>
            )}
          </main>
        )}

        {/* ══ DOCKED INPUT BARS ══ */}
        {screen==="tennis"&&tennisMsgs.length>0&&(
          <div className="docked-bar" style={{borderTopColor:"rgba(255,230,0,.25)"}}>
            <div className="docked-bar-label" style={{color:"#FFE600"}}>Tennis · Ask another</div>
            <AskBar inputRef={tennisInputRef} value={tennisInput} onChange={setTennisInput} onSubmit={()=>submitTennis()} placeholder="Ask another..." {...askBarCommon}/>
          </div>
        )}
        {screen==="nfl"&&nflMsgs.length>0&&(
          <div className="docked-bar" style={{borderTopColor:"rgba(74,144,217,.25)"}}>
            <div className="docked-bar-label" style={{color:"#4A90D9"}}>NFL · Ask another</div>
            <AskBar inputRef={nflInputRef} value={nflInput} onChange={setNflInput} onSubmit={()=>submitNfl()} placeholder="Ask another..." btnColor="#4A90D9" {...askBarCommon}/>
          </div>
        )}
        {screen==="f1"&&f1Msgs.length>0&&(
          <div className="docked-bar" style={{borderTopColor:"rgba(225,6,0,.25)"}}>
            <div className="docked-bar-label" style={{color:"var(--f1)"}}>F1 · Ask another</div>
            <AskBar inputRef={f1InputRef} value={f1Input} onChange={setF1Input} onSubmit={()=>submitF1()} placeholder="Ask another..." btnColor="var(--f1)" {...askBarCommon}/>
          </div>
        )}
        {screen==="nba"&&nbaMsgs.length>0&&(
          <div className="docked-bar" style={{borderTopColor:"rgba(255,107,0,.25)"}}>
            <div className="docked-bar-label" style={{color:"var(--nba)"}}>NBA · Ask another</div>
            <AskBar inputRef={nbaInputRef} value={nbaInput} onChange={setNbaInput} onSubmit={()=>submitNba()} placeholder="Ask another..." btnColor="var(--nba)" {...askBarCommon}/>
          </div>
        )}
        {screen==="mlb"&&mlbMsgs.length>0&&(
          <div className="docked-bar" style={{borderTopColor:"rgba(29,185,84,.25)"}}>
            <div className="docked-bar-label" style={{color:"var(--mlb)"}}>MLB · Ask another</div>
            <AskBar inputRef={mlbInputRef} value={mlbInput} onChange={setMlbInput} onSubmit={()=>submitMlb()} placeholder="Ask another..." btnColor="var(--mlb)" {...askBarCommon}/>
          </div>
        )}
        {screen==="golf"&&golfMsgs.length>0&&(
          <div className="docked-bar" style={{borderTopColor:"rgba(255,255,255,.2)"}}>
            <div className="docked-bar-label" style={{color:"#FFFFFF"}}>Golf · Ask another</div>
            <AskBar inputRef={golfInputRef} value={golfInput} onChange={setGolfInput} onSubmit={()=>submitGolf()} placeholder="Ask another..." btnColor="#FFFFFF" {...askBarCommon}/>
          </div>
        )}
        {screen==="ask"&&askMsgs.length>0&&(
          <div className="docked-bar">
            <AskBar inputRef={askInputRef} value={askInput} onChange={setAskInput} onSubmit={submitAsk} placeholder="Ask another..." {...askBarCommon}/>
          </div>
        )}

        {/* ══ EMAIL GATE MODAL ══ */}
        {showEmailGate&&(
          <div style={{position:"fixed",inset:0,background:"rgba(8,10,12,.92)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
            <div style={{background:"var(--surface)",border:"1px solid var(--border-2)",borderRadius:20,padding:28,maxWidth:360,width:"100%",textAlign:"center"}}>
              <div style={{fontSize:28,marginBottom:8}}>⚡</div>
              <div style={{fontFamily:"var(--display-font)",fontSize:26,letterSpacing:1,marginBottom:6}}>FREE ACCESS</div>
              <div style={{fontSize:13,color:"var(--muted)",lineHeight:1.6,marginBottom:20}}>
                Enter your email to get <strong style={{color:"var(--text)"}}>{FREE_LIMIT} free questions per week</strong>. No password. No spam.
              </div>
              <input
                type="email"
                placeholder="your@email.com"
                value={gateEmail}
                onChange={e=>setGateEmail(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter"&&gateEmail.includes("@")){ localStorage.setItem("ur_email",gateEmail); setUserEmail(gateEmail); setShowEmailGate(false); fetch("/api/gate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"register",email:gateEmail})}).catch(()=>{}); } }}
                style={{width:"100%",background:"var(--surface-2)",border:"1px solid var(--border-2)",borderRadius:10,padding:"12px 14px",color:"var(--text)",fontSize:14,fontFamily:"var(--body-font)",outline:"none",marginBottom:12}}
                autoFocus
              />
              <button
                disabled={!gateEmail.includes("@")}
                onClick={()=>{ localStorage.setItem("ur_email",gateEmail); setUserEmail(gateEmail); setShowEmailGate(false); fetch("/api/gate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"register",email:gateEmail})}).catch(()=>{}); }}
                style={{width:"100%",padding:"13px",border:"none",borderRadius:10,background:gateEmail.includes("@")?"var(--cyan-bright)":"var(--border)",color:"#080A0C",fontFamily:"var(--display-font)",fontSize:18,letterSpacing:2,cursor:gateEmail.includes("@")?"pointer":"not-allowed",marginBottom:12}}
              >UNLOCK FREE ACCESS</button>
              <div style={{fontSize:11,color:"var(--muted)"}}>Already have a code? <button onClick={()=>{setShowEmailGate(false);setShowCodeEntry(true);}} style={{background:"none",border:"none",color:"var(--cyan-bright)",cursor:"pointer",fontSize:11,fontFamily:"var(--body-font)"}}>Enter it here →</button></div>
            </div>
          </div>
        )}

        {/* ══ CODE ENTRY MODAL ══ */}
        {showCodeEntry&&(
          <div style={{position:"fixed",inset:0,background:"rgba(8,10,12,.92)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
            <div style={{background:"var(--surface)",border:"1px solid var(--border-2)",borderRadius:20,padding:28,maxWidth:360,width:"100%",textAlign:"center"}}>
              <div style={{fontFamily:"var(--display-font)",fontSize:24,letterSpacing:1,marginBottom:6}}>ENTER ACCESS CODE</div>
              <div style={{fontSize:13,color:"var(--muted)",lineHeight:1.6,marginBottom:20}}>Got a code from someone? Enter it below for unlocked access.</div>
              <input
                type="text"
                placeholder="Access code"
                value={codeInput}
                onChange={e=>{setCodeInput(e.target.value);setCodeError("");}}
                onKeyDown={e=>{ if(e.key==="Enter") redeemCode(); }}
                style={{width:"100%",background:"var(--surface-2)",border:`1px solid ${codeError?"var(--red)":"var(--border-2)"}`,borderRadius:10,padding:"12px 14px",color:"var(--text)",fontSize:14,fontFamily:"var(--mono-font)",letterSpacing:2,outline:"none",marginBottom:codeError?6:12,textTransform:"uppercase"}}
                autoFocus
              />
              {codeError&&<div style={{fontSize:11,color:"var(--red)",marginBottom:12,textAlign:"left"}}>{codeError}</div>}
              <button
                disabled={!codeInput.trim()||codeLoading}
                onClick={redeemCode}
                style={{width:"100%",padding:"13px",border:"none",borderRadius:10,background:codeInput.trim()?"var(--cyan-bright)":"var(--border)",color:"#080A0C",fontFamily:"var(--display-font)",fontSize:18,letterSpacing:2,cursor:codeInput.trim()?"pointer":"not-allowed",marginBottom:12}}
              >{codeLoading?"CHECKING...":"UNLOCK"}</button>
              <button onClick={()=>{setShowCodeEntry(false);setCodeInput("");setCodeError("");}} style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:12,fontFamily:"var(--body-font)"}}>Cancel</button>
            </div>
          </div>
        )}

        {/* ══ QUERY COUNTER — shows when not unlimited ══ */}
        {!isUnlimited&&userEmail&&weeklyUsed>0&&(
          <div style={{position:"fixed",top:52,right:10,zIndex:20,background:"rgba(8,10,12,.85)",border:"1px solid var(--border)",borderRadius:999,padding:"3px 10px",fontFamily:"var(--mono-font)",fontSize:9,color:weeklyUsed>=FREE_LIMIT?"var(--red)":weeklyUsed>=FREE_LIMIT-1?"var(--gold)":"var(--muted)",letterSpacing:1,backdropFilter:"blur(8px)",cursor:"pointer"}} onClick={weeklyUsed>=FREE_LIMIT?goPro:undefined}>
            {weeklyUsed>=FREE_LIMIT?"LIMIT REACHED — GO PRO":`${FREE_LIMIT-weeklyUsed} FREE LEFT THIS WEEK`}
          </div>
        )}

        {/* ══ NAV ══ */}
        <nav className="bottom-nav">
          <button className={`nav-btn${tab==="home"&&screen==="home"?" active":""}`} onClick={goHome}><span>Home</span></button>
          <button className={`nav-btn${tab==="tennis"?" tennis-active":""}`} onClick={goTennis}><span>Tennis</span></button>
          <button className={`nav-btn${tab==="nfl"?" nfl-active":""}`} onClick={goNfl}><span>NFL</span></button>
          <button className={`nav-btn${tab==="f1"?" f1-active":""}`} onClick={goF1}><span>F1</span></button>
          <button className={`nav-btn${tab==="nba"?" nba-active":""}`} onClick={goNba}><span>NBA</span></button>
          <button className={`nav-btn${tab==="mlb"?" mlb-active":""}`} onClick={goMlb}><span>MLB</span></button>
          <button className={`nav-btn${tab==="golf"?" golf-active":""}`} onClick={goGolf}><span>Golf</span></button>
          <button className={`nav-btn pro-active`} onClick={goPro}><span>Pro</span></button>
        </nav>

      </div>
    </>
  );
}
