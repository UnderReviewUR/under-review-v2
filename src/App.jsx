import { useEffect, useRef, useState } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('HOME');
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Ask a matchup, prop, or slate question and UR TAKE will give you the lean, the reason, and the angle.',
    },
  ]);

  const [playerData, setPlayerData] = useState(null);
  const [contextData, setContextData] = useState(null);
  const [liveMatches, setLiveMatches] = useState([]);
  const [tournamentResults, setTournamentResults] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // ─── Load all data on mount ───────────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const [
          playersRes, contextRes,
          liveAtpRes, liveWtaRes,
          resultsAtpRes, resultsWtaRes,
        ] = await Promise.all([
          fetch('/api/tennis-players'),
          fetch('/api/tennis-context'),
          fetch('/api/tennis?tour=atp'),
          fetch('/api/tennis?tour=wta'),
          fetch('/api/tennis-results?tour=atp'),
          fetch('/api/tennis-results?tour=wta'),
        ]);

        const [playersJson, contextJson, liveAtpJson, liveWtaJson, resultsAtpJson, resultsWtaJson] =
          await Promise.all([
            playersRes.json(), contextRes.json(),
            liveAtpRes.json(), liveWtaRes.json(),
            resultsAtpRes.json(), resultsWtaRes.json(),
          ]);

        setPlayerData(playersJson);
        setContextData(contextJson);
        setLiveMatches([
          ...(Array.isArray(liveAtpJson) ? liveAtpJson : []),
          ...(Array.isArray(liveWtaJson) ? liveWtaJson : []),
        ]);
        setTournamentResults([
          ...(Array.isArray(resultsAtpJson) ? resultsAtpJson : []),
          ...(Array.isArray(resultsWtaJson) ? resultsWtaJson : []),
        ]);
      } catch (err) {
        console.error('Failed to load tennis data:', err);
      } finally {
        setDataLoading(false);
      }
    }
    loadData();
  }, []);

  // ─── Poll results every 5 minutes to pick up finished matches ────────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [atpRes, wtaRes] = await Promise.all([
          fetch('/api/tennis-results?tour=atp'),
          fetch('/api/tennis-results?tour=wta'),
        ]);
        const [atpJson, wtaJson] = await Promise.all([atpRes.json(), wtaRes.json()]);
        setTournamentResults([
          ...(Array.isArray(atpJson) ? atpJson : []),
          ...(Array.isArray(wtaJson) ? wtaJson : []),
        ]);
      } catch { /* silent */ }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Derive dynamic home content from live data ───────────────────────────────
  // Live/upcoming matchup cards — only real matches from the API
  const liveTennisMatchups = liveMatches
    .filter((m) => m.home_team && m.away_team && m.home_team !== 'Player 1')
    .slice(0, 6)
    .map((m) => ({
      title: `${m.home_team} vs ${m.away_team}`,
      subtitle: `Miami Open • ${m.round || 'Hard Court'}`,
      status: m.live === '1' ? 'LIVE' : m.status || 'Upcoming',
      isLive: m.live === '1',
    }));

  // Recent results from the draw path — last 3 completed matches
  const recentResults = [...tournamentResults]
    .reverse()
    .slice(0, 3);

  // Dynamic trending asks built from real players in the draw
  function buildDynamicAsks() {
    const asks = [];

    // Pull most recent winner — if someone just won, ask about their next match
    if (recentResults.length > 0) {
      const latest = recentResults[0];
      asks.push(`What are ${latest.winner}'s best props in their next match?`);
      asks.push(`Break down ${latest.winner}'s path after beating ${latest.loser}`);
    }

    // Pull upcoming matches for matchup questions
    if (liveTennisMatchups.length > 0) {
      const first = liveTennisMatchups[0];
      asks.push(`Who wins ${first.title}?`);
    }
    if (liveTennisMatchups.length > 1) {
      const second = liveTennisMatchups[1];
      asks.push(`Best props for ${second.title}`);
    }

    // Fallback asks that are always tennis-relevant
    const fallbacks = [
      'Who has the best serve edge on today\'s slate?',
      'Best ace props today',
      'Who is live for an upset?',
      'What is the sharpest total games angle today?',
    ];

    // Fill up to 4, no duplicates
    for (const f of fallbacks) {
      if (asks.length >= 4) break;
      if (!asks.includes(f)) asks.push(f);
    }

    return asks.slice(0, 4);
  }

  const dynamicAsks = buildDynamicAsks();

  // Miami quick asks for the MIAMI tab — also dynamic
  const miamiPrompts = liveTennisMatchups.length > 0
    ? [
        liveTennisMatchups[0] ? `Who wins ${liveTennisMatchups[0].title}?` : null,
        liveTennisMatchups[1] ? `Best props for ${liveTennisMatchups[1].title}` : null,
        'Best ace props today',
        'Who is overpriced today?',
      ].filter(Boolean)
    : [
        'Best props today',
        'Who is live for an upset?',
        'Best ace props in Miami',
        'Who is overpriced today?',
      ];

  // Featured prompts on the ASK tab empty state — always tennis, never stale
  const featuredPrompts = [
    'Best props on today\'s slate',
    'Who has the biggest serve edge today?',
    'Best value bet on the board right now',
    'Walk me through today\'s key matchup',
  ];

  const atpPlayers = [
    { name: 'Jannik Sinner', elo: 2168, hold: '89.4%', dr: '1.19', tb: '63%' },
    { name: 'Carlos Alcaraz', elo: 2142, hold: '86.1%', dr: '1.16', tb: '58%' },
    { name: 'Alexander Zverev', elo: 2061, hold: '87.7%', dr: '1.09', tb: '61%' },
    { name: 'Daniil Medvedev', elo: 2038, hold: '84.8%', dr: '1.07', tb: '56%' },
    { name: 'Taylor Fritz', elo: 1986, hold: '88.2%', dr: '1.05', tb: '59%' },
  ];

  const wtaPlayers = [
    { name: 'Aryna Sabalenka', elo: 2108, hold: '74.8%', dr: '1.20', tb: '57%' },
    { name: 'Elena Rybakina', elo: 2054, hold: '76.2%', dr: '1.14', tb: '54%' },
    { name: 'Iga Swiatek', elo: 2036, hold: '71.1%', dr: '1.25', tb: '52%' },
    { name: 'Coco Gauff', elo: 1968, hold: '68.4%', dr: '1.10', tb: '51%' },
    { name: 'Jessica Pegula', elo: 1940, hold: '66.8%', dr: '1.08', tb: '49%' },
  ];

  // ─── handleAsk ────────────────────────────────────────────────────────────────
  async function handleAsk(promptOverride) {
    const prompt = (promptOverride || inputValue).trim();
    if (!prompt) return;

    if (!playerData || !contextData) {
      const msg = dataLoading
        ? 'Still loading the tennis database. Try again in a second.'
        : 'Tennis data did not load correctly.';
      setMessages((prev) => [...prev, { role: 'user', content: prompt }, { role: 'assistant', content: msg }]);
      setInputValue('');
      setActiveTab('ASK');
      return;
    }

    const historyForApi = messages.map((msg) => ({ role: msg.role, text: msg.content, loading: msg.loading || false }));
    setMessages((prev) => [...prev, { role: 'user', content: prompt }, { role: 'assistant', content: '...', loading: true }]);
    setInputValue('');
    setActiveTab('ASK');

    try {
      const response = await fetch('/api/ur-take', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: prompt,
          players: playerData,
          context: contextData,
          liveMatches,
          tournamentResults,
          tour: 'tennis',
          history: historyForApi,
          matchupContext: null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Request failed');

      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', content: data.response || 'No response returned.' };
        return next;
      });
    } catch (err) {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', content: `Couldn't get a response right now. ${err.message}` };
        return next;
      });
    }
  }

  // ─── Share card ───────────────────────────────────────────────────────────────
  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > maxWidth && line !== '') {
        ctx.fillText(line.trim(), x, currentY);
        line = word + ' ';
        currentY += lineHeight;
      } else {
        line = test;
      }
    }
    ctx.fillText(line.trim(), x, currentY);
  }

  async function shareCard(player, prop, reason) {
    const W = 1080; const H = 1080;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W / 2, -80, 0, W / 2, -80, 700);
    glow.addColorStop(0, 'rgba(0,245,233,0.18)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.045)'; roundRect(ctx, 72, 160, W - 144, 760, 32); ctx.fill();
    ctx.strokeStyle = 'rgba(0,245,233,0.28)'; ctx.lineWidth = 2; roundRect(ctx, 72, 160, W - 144, 760, 32); ctx.stroke();
    ctx.fillStyle = '#00F5E9'; roundRect(ctx, 72, 160, 7, 760, 4); ctx.fill();
    ctx.font = '500 30px monospace'; ctx.fillStyle = '#00F5E9'; ctx.fillText('UR TAKE', 126, 258);
    const divGrad = ctx.createLinearGradient(126, 0, 540, 0);
    divGrad.addColorStop(0, '#00F5E9'); divGrad.addColorStop(1, '#FF2D6B');
    ctx.fillStyle = divGrad; ctx.fillRect(126, 275, 414, 3);
    ctx.font = 'bold 86px sans-serif'; ctx.fillStyle = '#F7F8FA'; ctx.fillText(player, 126, 398);
    const badgeLabel = prop.toUpperCase();
    ctx.font = 'bold 34px monospace';
    const pillW = ctx.measureText(badgeLabel).width + 64;
    ctx.fillStyle = '#00F5E9'; roundRect(ctx, 126, 428, pillW, 60, 999); ctx.fill();
    ctx.fillStyle = '#000000'; ctx.fillText(badgeLabel, 158, 468);
    ctx.font = '400 40px sans-serif'; ctx.fillStyle = 'rgba(247,248,250,0.80)';
    wrapText(ctx, reason, 126, 568, W - 300, 58);
    ctx.font = '500 30px monospace'; ctx.fillStyle = 'rgba(247,248,250,0.42)'; ctx.fillText('UNDER', 126, 848);
    ctx.font = 'bold 78px sans-serif';
    const logoGrad = ctx.createLinearGradient(126, 0, 560, 0);
    logoGrad.addColorStop(0, '#00F5E9'); logoGrad.addColorStop(1, '#FF2D6B');
    ctx.fillStyle = logoGrad; ctx.fillText('REVIEW', 126, 928);
    const footGrad = ctx.createLinearGradient(120, 0, 700, 0);
    footGrad.addColorStop(0, '#00F5E9'); footGrad.addColorStop(1, '#FF2D6B');
    ctx.fillStyle = footGrad; ctx.fillRect(120, 942, 580, 3);
    ctx.beginPath(); ctx.arc(114, 943, 7, 0, Math.PI * 2); ctx.fillStyle = '#00F5E9'; ctx.fill();
    ctx.beginPath(); ctx.arc(706, 943, 7, 0, Math.PI * 2); ctx.fillStyle = '#FF2D6B'; ctx.fill();
    ctx.font = '400 26px monospace'; ctx.fillStyle = 'rgba(247,248,250,0.25)';
    ctx.fillText('under-review-v2.vercel.app', 126, 986);
    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'ur-take.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: `${player} — ${prop}`, text: `${reason}\n\nvia Under Review` }); }
        catch { downloadBlob(blob); }
      } else downloadBlob(blob);
    }, 'image/png');
  }

  function downloadBlob(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'ur-take.png'; a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Inline markdown ──────────────────────────────────────────────────────────
  function renderInlineMarkdown(text) {
    return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <span key={i} style={{ color: '#00F5E9', fontWeight: 700 }}>{part.slice(2, -2)}</span>
        : part
    );
  }

  // ─── Message renderer ──────────────────────────────────────────────────────────
  function renderMessage(content, isLoading) {
    if (isLoading) {
      return (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px 0' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#00F5E9', animation: `urPulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
          <style>{`@keyframes urPulse { 0%,80%,100%{opacity:.2;transform:scale(.85)} 40%{opacity:1;transform:scale(1)} }`}</style>
        </div>
      );
    }

    const lines = content.split('\n').filter(Boolean);
    const propLines = lines.filter((l) => l.trim().startsWith('•'));
    const normalLines = lines.filter((l) => !l.trim().startsWith('•'));

    return (
      <div style={{ display: 'grid', gap: 10 }}>
        {normalLines.map((line, idx) => (
          <div key={`${line}-${idx}`} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, lineHeight: 1.6, color: 'rgba(247,248,250,0.88)', whiteSpace: 'pre-wrap' }}>
            {renderInlineMarkdown(line)}
          </div>
        ))}
        {propLines.length > 0 && (
          <div style={{ display: 'grid', gap: 10 }}>
            {propLines.map((line, idx) => {
              const clean = line.replace(/^•\s*/, '').replace(/\*\*/g, '');
              const parts = clean.split(' — ');
              const looksLikePropCard = parts.length >= 3 && parts[0] && parts[1] && parts[1].length < 60
                && !parts[0].toLowerCase().includes('wimbledon')
                && !parts[0].toLowerCase().includes('french open')
                && !parts[0].toLowerCase().includes('us open');

              if (!looksLikePropCard) {
                return <div key={`${clean}-${idx}`} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, lineHeight: 1.55, color: 'rgba(247,248,250,0.82)' }}>{renderInlineMarkdown(line)}</div>;
              }

              const player = parts[0] || '';
              const prop = parts[1] || '';
              const reason = parts.slice(2).join(' — ') || '';

              return (
                <div key={`${clean}-${idx}`} style={{ border: '1px solid rgba(0,245,233,0.22)', borderLeft: '3px solid #00F5E9', borderRadius: 16, padding: 12, background: 'rgba(255,255,255,0.04)', position: 'relative' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: reason ? 8 : 0, paddingRight: 40 }}>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 800, color: '#F7F8FA' }}>{player}</span>
                    {prop && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#000000', background: '#00F5E9', borderRadius: 999, padding: '4px 8px' }}>{prop}</span>}
                  </div>
                  {reason && <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, lineHeight: 1.55, color: 'rgba(247,248,250,0.76)', paddingRight: 40 }}>{renderInlineMarkdown(reason)}</div>}
                  <button onClick={() => shareCard(player, prop, reason)} title="Share this take"
                    style={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: '50%', border: '1px solid rgba(0,245,233,0.3)', background: 'rgba(0,245,233,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, WebkitTapHighlightColor: 'transparent' }}>
                    <svg width="13" height="14" viewBox="0 0 13 14" fill="none"><path d="M6.5 1.5V9.5M6.5 1.5L4 4M6.5 1.5L9 4" stroke="#00F5E9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M1.5 9.5V12.5H11.5V9.5" stroke="#00F5E9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── Shared styles ────────────────────────────────────────────────────────────
  const shellStyle = { minHeight: '100vh', background: '#000000', color: '#F7F8FA' };
  const containerStyle = { width: '100%', maxWidth: 760, margin: '0 auto', paddingBottom: 110 };
  const cardBase = { borderRadius: 20, padding: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' };

  function sectionEyebrow(label, color = '#00F5E9') {
    return <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color, marginBottom: 12 }}>{label}</div>;
  }

  const logoRule = (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
        <div style={{ width: 8, height: 8, borderRadius: 999, background: '#00F5E9', flexShrink: 0 }} />
        <div style={{ height: 2, flex: 1, borderRadius: 999, background: 'linear-gradient(90deg, #00F5E9, #FF2D6B)' }} />
        <div style={{ width: 8, height: 8, borderRadius: 999, background: '#FF2D6B', flexShrink: 0 }} />
      </div>
    </div>
  );

  const topHeader = (
    <div style={{ padding: '22px 16px 8px' }}>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, letterSpacing: '0.32em', color: 'rgba(247,248,250,0.45)', textTransform: 'uppercase', marginBottom: 2 }}>UNDER</div>
        <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 48, lineHeight: 0.95, letterSpacing: '0.03em', background: 'linear-gradient(90deg, #00F5E9, #FF2D6B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>REVIEW</div>
        {logoRule}
      </div>
    </div>
  );

  const askBar = (placeholder = 'Ask UR TAKE anything...') => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 52px', gap: 10, padding: '0 16px', marginBottom: 16 }}>
      <input value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAsk(); }} placeholder={placeholder}
        style={{ height: 50, borderRadius: 999, border: '1px solid rgba(0,245,233,0.24)', background: 'rgba(255,255,255,0.05)', color: '#F7F8FA', padding: '0 16px', outline: 'none', fontFamily: 'DM Sans, sans-serif', fontSize: 16 }} />
      <button onClick={() => handleAsk()} style={{ height: 50, border: 'none', borderRadius: 999, cursor: 'pointer', fontWeight: 800, fontSize: 22, color: '#000000', background: 'linear-gradient(90deg, #00F5E9, #FF2D6B)' }}>↑</button>
    </div>
  );

  // ─── HOME — fully dynamic ─────────────────────────────────────────────────────
  const homeScreen = (
    <>
      {askBar('Ask UR TAKE anything...')}
      <div style={{ padding: '0 16px' }}>

        {/* Live + upcoming matchups — rendered only if data exists */}
        {liveTennisMatchups.length > 0 && (
          <section style={{ ...cardBase, marginBottom: 14 }}>
            {sectionEyebrow('On the board')}
            <div style={{ display: 'grid', gap: 10 }}>
              {liveTennisMatchups.map((matchup) => (
                <button key={matchup.title} onClick={() => handleAsk(`Who wins ${matchup.title}?`)}
                  style={{ textAlign: 'left', borderRadius: 16, border: `1px solid ${matchup.isLive ? 'rgba(255,45,107,0.35)' : 'rgba(255,255,255,0.07)'}`, background: matchup.isLive ? 'rgba(255,45,107,0.06)' : 'rgba(255,255,255,0.03)', padding: 14, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 800, color: '#F7F8FA', marginBottom: 3 }}>{matchup.title}</div>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'rgba(247,248,250,0.5)' }}>{matchup.subtitle}</div>
                    </div>
                    {matchup.isLive && (
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#080A0C', background: '#FF2D6B', borderRadius: 999, padding: '3px 8px', flexShrink: 0 }}>Live</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Recent results context — only if completed matches exist */}
        {recentResults.length > 0 && (
          <section style={{ ...cardBase, marginBottom: 14 }}>
            {sectionEyebrow('Recent results')}
            <div style={{ display: 'grid', gap: 8 }}>
              {recentResults.map((r, i) => (
                <button key={i} onClick={() => handleAsk(`What are ${r.winner}'s best props after beating ${r.loser}?`)}
                  style={{ textAlign: 'left', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.025)', padding: '10px 12px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <div>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 800, color: '#F7F8FA' }}>{r.winner}</span>
                    <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'rgba(247,248,250,0.5)' }}> def. {r.loser}</span>
                    {r.score && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'rgba(247,248,250,0.4)', marginLeft: 6 }}>{r.score}</span>}
                  </div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(247,248,250,0.35)' }}>{r.round}</div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Dynamic trending asks — always tennis-relevant, never stale */}
        <section style={{ ...cardBase, marginBottom: 14 }}>
          {sectionEyebrow('Ask UR TAKE')}
          <div style={{ display: 'grid', gap: 10 }}>
            {dynamicAsks.map((ask) => (
              <button key={ask} onClick={() => handleAsk(ask)}
                style={{ textAlign: 'left', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', color: '#F7F8FA', padding: '14px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 700, WebkitTapHighlightColor: 'transparent' }}>
                {ask}
              </button>
            ))}
          </div>
        </section>

        {/* Empty state — only shown when nothing has loaded yet */}
        {dataLoading && liveTennisMatchups.length === 0 && (
          <section style={{ ...cardBase, marginBottom: 14, textAlign: 'center', padding: '28px 16px' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#00F5E9', marginBottom: 8 }}>Loading</div>
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: 'rgba(247,248,250,0.5)' }}>Pulling today's slate...</div>
          </section>
        )}

      </div>
    </>
  );

  // ─── MIAMI ────────────────────────────────────────────────────────────────────
  const miamiScreen = (
    <>
      <div style={{ padding: '0 16px', marginBottom: 16 }}>
        <section style={{ ...cardBase }}>
          {sectionEyebrow('Miami Open 2026', '#FF2D6B')}
          <p style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: 14, lineHeight: 1.6, color: 'rgba(247,248,250,0.78)' }}>
            Hard court, medium-fast. Premium hold-rate and first-strike edges. Best angles usually show up in ace props, first-set winners, and total-games spots.
          </p>
        </section>
      </div>

      {askBar('Ask Miami props, players, or matchups...')}

      <div style={{ padding: '0 16px' }}>
        <section style={{ ...cardBase, marginBottom: 14 }}>
          {sectionEyebrow('Quick asks', '#F5C842')}
          <div style={{ display: 'grid', gap: 10 }}>
            {miamiPrompts.map((prompt) => (
              <button key={prompt} onClick={() => handleAsk(prompt)}
                style={{ textAlign: 'left', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', color: '#F7F8FA', padding: '14px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 700, WebkitTapHighlightColor: 'transparent' }}>
                {prompt}
              </button>
            ))}
          </div>
        </section>

        <section style={{ ...cardBase, marginBottom: 14 }}>
          {sectionEyebrow('Prop guide', '#F5C842')}
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              { title: 'Ace props', body: 'Most playable when hold stability and short-rally profile line up.' },
              { title: 'First set winners', body: 'Best in lopsided serve quality matchups where early pressure is predictable.' },
              { title: 'Total games', body: 'Strongest when both players hold clean or one player controls pace but not breaks.' },
            ].map((item) => (
              <div key={item.title} style={{ borderRadius: 18, padding: 14, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 800, color: '#F7F8FA', marginBottom: 6 }}>{item.title}</div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, lineHeight: 1.55, color: 'rgba(247,248,250,0.6)' }}>{item.body}</div>
              </div>
            ))}
          </div>
        </section>

        {[{ label: 'ATP top players', players: atpPlayers }, { label: 'WTA top players', players: wtaPlayers }].map(({ label, players }) => (
          <section key={label} style={{ ...cardBase, marginBottom: 14 }}>
            {sectionEyebrow(label, '#F5C842')}
            <div style={{ display: 'grid', gap: 10 }}>
              {players.map((player) => (
                <div key={player.name} style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', padding: 14 }}>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 800, color: '#F7F8FA', marginBottom: 10 }}>{player.name}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {[['Elo', player.elo], ['Hold%', player.hold], ['DR', player.dr], ['TB%', player.tb]].map(([lbl, val]) => (
                      <div key={lbl} style={{ borderRadius: 12, padding: '10px 8px', background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(247,248,250,0.4)', marginBottom: 4 }}>{lbl}</div>
                        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 800, color: '#F7F8FA' }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );

  // ─── ASK ──────────────────────────────────────────────────────────────────────
  const askScreen = (
    <>
      {askBar('Ask props, matchups, or slate questions...')}
      <div style={{ padding: '0 16px' }}>
        {messages.length <= 1 && (
          <section style={{ ...cardBase, marginBottom: 14 }}>
            {sectionEyebrow('Featured prompts')}
            <div style={{ display: 'grid', gap: 10 }}>
              {featuredPrompts.map((prompt) => (
                <button key={prompt} onClick={() => handleAsk(prompt)}
                  style={{ textAlign: 'left', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', color: '#F7F8FA', padding: '14px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 700, WebkitTapHighlightColor: 'transparent' }}>
                  {prompt}
                </button>
              ))}
            </div>
          </section>
        )}
        <div style={{ display: 'grid', gap: 12 }}>
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} style={{ display: 'flex', justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ width: '100%', maxWidth: message.role === 'user' ? 520 : '100%', borderRadius: 20, padding: '14px', background: message.role === 'user' ? 'linear-gradient(90deg, rgba(0,245,233,0.14), rgba(255,45,107,0.12))' : 'rgba(255,255,255,0.04)', border: message.role === 'user' ? '1px solid rgba(0,245,233,0.2)' : '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: message.role === 'user' ? '#F5C842' : '#00F5E9', marginBottom: 8 }}>
                  {message.role === 'user' ? 'You' : 'UR TAKE'}
                </div>
                {renderMessage(message.content, message.loading)}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </>
  );

  // ─── PRO ──────────────────────────────────────────────────────────────────────
  const proScreen = (
    <div style={{ padding: '0 16px' }}>
      <section style={{ ...cardBase, background: 'linear-gradient(180deg, rgba(0,245,233,0.07), rgba(255,45,107,0.07)), rgba(255,255,255,0.03)', border: '1px solid rgba(255,45,107,0.22)' }}>
        {sectionEyebrow('Pro', '#FF2D6B')}
        <h2 style={{ margin: 0, fontFamily: 'Bebas Neue, sans-serif', fontSize: 38, lineHeight: 1, color: '#F7F8FA', letterSpacing: '0.03em' }}>$9.99 / month</h2>
        <p style={{ marginTop: 12, marginBottom: 18, fontFamily: 'DM Sans, sans-serif', fontSize: 15, lineHeight: 1.6, color: 'rgba(247,248,250,0.78)' }}>
          Unlimited UR TAKE queries, deeper matchup cards, saved threads, and more premium betting intelligence.
        </p>
        <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
          {['Unlimited UR TAKE queries', 'Deeper matchup cards', 'Saved threads', 'Expanded player and surface data'].map((f) => (
            <div key={f} style={{ borderRadius: 14, padding: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 700, color: '#F7F8FA' }}>{f}</div>
          ))}
        </div>
        <button style={{ width: '100%', height: 50, border: 'none', borderRadius: 999, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 800, color: '#000000', background: 'linear-gradient(90deg, #00F5E9, #FF2D6B)' }}>Unlock Pro</button>
      </section>
    </div>
  );

  // ─── SHELL + NAV ──────────────────────────────────────────────────────────────
  return (
    <div style={shellStyle}>
      <div style={containerStyle}>
        {topHeader}
        {activeTab === 'HOME' && homeScreen}
        {activeTab === 'MIAMI' && miamiScreen}
        {activeTab === 'ASK' && askScreen}
        {activeTab === 'PRO' && proScreen}
      </div>

      <nav style={{ position: 'fixed', left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', padding: '12px 16px calc(18px + env(safe-area-inset-bottom))', background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.9) 30%, #000 100%)', backdropFilter: 'blur(10px)' }}>
        <div style={{ width: '100%', maxWidth: 760, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, borderRadius: 22, padding: 10, background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.09)' }}>
          {[{ key: 'HOME', label: 'HOME' }, { key: 'MIAMI', label: 'MIAMI' }, { key: 'ASK', label: 'ASK' }, { key: 'PRO', label: 'PRO' }].map((item) => {
            const isActive = activeTab === item.key;
            const isMiami = item.key === 'MIAMI';
            return (
              <button key={item.key} onClick={() => setActiveTab(item.key)}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                onTouchStart={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
                onTouchEnd={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                style={{ height: 48, borderRadius: 16, border: 'none', cursor: 'pointer', fontFamily: 'DM Mono, monospace', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: isActive ? '#000000' : isMiami ? '#F5C842' : '#F7F8FA', background: isActive ? (isMiami ? '#F5C842' : 'linear-gradient(90deg, #00F5E9, #FF2D6B)') : 'rgba(255,255,255,0.04)', fontWeight: 700, transition: 'transform 0.1s ease', WebkitTapHighlightColor: 'transparent' }}>
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
