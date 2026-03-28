import { useEffect, useRef, useState } from ‘react’;

export default function App() {
const [activeTab, setActiveTab] = useState(‘HOME’);
const [inputValue, setInputValue] = useState(’’);
const [messages, setMessages] = useState([
{
role: ‘assistant’,
content:
‘Ask a matchup, prop, or slate question and UR TAKE will give you the lean, the reason, and the angle.’,
},
]);

const [playerData, setPlayerData] = useState(null);
const [contextData, setContextData] = useState(null);
const [liveMatches, setLiveMatches] = useState([]);
const [tournamentResults, setTournamentResults] = useState([]);
const [dataLoading, setDataLoading] = useState(true);
const messagesEndRef = useRef(null);

// — Load all data on mount —————————————————
useEffect(() => {
async function loadData() {
try {
const [
playersRes, contextRes,
liveAtpRes, liveWtaRes,
resultsAtpRes, resultsWtaRes,
] = await Promise.all([
fetch(’/api/tennis-players’),
fetch(’/api/tennis-context’),
fetch(’/api/tennis?tour=atp’),
fetch(’/api/tennis?tour=wta’),
fetch(’/api/tennis-results?tour=atp’),
fetch(’/api/tennis-results?tour=wta’),
]);

```
    const [
      playersJson, contextJson,
      liveAtpJson, liveWtaJson,
      resultsAtpJson, resultsWtaJson,
    ] = await Promise.all([
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
```

}, []);

// — Poll results every 5 minutes ––––––––––––––––––––––
useEffect(() => {
const interval = setInterval(async () => {
try {
const [atpRes, wtaRes] = await Promise.all([
fetch(’/api/tennis-results?tour=atp’),
fetch(’/api/tennis-results?tour=wta’),
]);
const [atpJson, wtaJson] = await Promise.all([atpRes.json(), wtaRes.json()]);
setTournamentResults([
…(Array.isArray(atpJson) ? atpJson : []),
…(Array.isArray(wtaJson) ? wtaJson : []),
]);
} catch { /* silent */ }
}, 5 * 60 * 1000);
return () => clearInterval(interval);
}, []);

// Auto-scroll on new message
useEffect(() => {
messagesEndRef.current?.scrollIntoView({ behavior: ‘smooth’ });
}, [messages]);

// — Label helpers ————————————————————
function abbreviateRound(round) {
if (!round) return ‘’;
const r = round.toLowerCase();
if (r.includes(‘final’) && !r.includes(‘semi’) && !r.includes(‘quarter’)) return ‘Final’;
if (r.includes(‘semi’)) return ‘SF’;
if (r.includes(‘quarter’)) return ‘QF’;
if (r.includes(‘round of 16’) || r.includes(‘4th round’)) return ‘R16’;
if (r.includes(‘round of 32’) || r.includes(‘3rd round’)) return ‘R32’;
if (r.includes(‘round of 64’) || r.includes(‘2nd round’)) return ‘R64’;
if (r.includes(‘round of 128’) || r.includes(‘1st round’)) return ‘R128’;
return round;
}

function abbreviateTour(match) {
const combined = `${match.event_type_type || ''} ${match.league_name || ''}`.toLowerCase();
const isWTA = combined.includes(‘women’) || combined.includes(‘wta’);
const isDoubles = combined.includes(‘double’);
let label = isWTA ? ‘WTA’ : ‘ATP’;
if (isDoubles) label += ’ Doubles’;
const round = abbreviateRound(match.round || ‘’);
return round ? `${label} - ${round}` : label;
}

// — Derive dynamic home content ———————————————
const liveTennisMatchups = liveMatches
.filter((m) => m.home_team && m.away_team && m.home_team !== ‘Player 1’)
.slice(0, 6)
.map((m) => ({
title: `${m.home_team} vs ${m.away_team}`,
subtitle: abbreviateTour(m),
isLive: m.live === ‘1’,
}));

const recentResults = […tournamentResults].reverse().slice(0, 3);

function buildDynamicAsks() {
const asks = [];
if (recentResults.length > 0) {
asks.push(`Best props for ${recentResults[0].winner} in their next match`);
}
if (liveTennisMatchups.length > 0) asks.push(`Who wins ${liveTennisMatchups[0].title}?`);
if (liveTennisMatchups.length > 1) asks.push(`Best props for ${liveTennisMatchups[1].title}`);
const fallbacks = [
“Best ace props today”,
“Who has the biggest serve edge on the slate?”,
“Who is live for an upset?”,
“Best total games angle today”,
];
for (const f of fallbacks) {
if (asks.length >= 4) break;
if (!asks.includes(f)) asks.push(f);
}
return asks.slice(0, 4);
}

const dynamicAsks = buildDynamicAsks();

const miamiPrompts = liveTennisMatchups.length > 0
? [
liveTennisMatchups[0] ? `Who wins ${liveTennisMatchups[0].title}?` : null,
liveTennisMatchups[1] ? `Best props for ${liveTennisMatchups[1].title}` : null,
‘Best ace props today’,
‘Who is overpriced today?’,
].filter(Boolean)
: [‘Best props today’, ‘Who is live for an upset?’, ‘Best ace props’, ‘Who is overpriced?’];

const featuredPrompts = [
“Best props on today’s slate”,
“Who has the biggest serve edge today?”,
“Best value bet on the board right now”,
“Walk me through today’s key matchup”,
];

const atpPlayers = [
{ name: ‘Jannik Sinner’, elo: 2168, hold: ‘89.4%’, dr: ‘1.19’, tb: ‘63%’ },
{ name: ‘Carlos Alcaraz’, elo: 2142, hold: ‘86.1%’, dr: ‘1.16’, tb: ‘58%’ },
{ name: ‘Alexander Zverev’, elo: 2061, hold: ‘87.7%’, dr: ‘1.09’, tb: ‘61%’ },
{ name: ‘Daniil Medvedev’, elo: 2038, hold: ‘84.8%’, dr: ‘1.07’, tb: ‘56%’ },
{ name: ‘Taylor Fritz’, elo: 1986, hold: ‘88.2%’, dr: ‘1.05’, tb: ‘59%’ },
];

const wtaPlayers = [
{ name: ‘Aryna Sabalenka’, elo: 2108, hold: ‘74.8%’, dr: ‘1.20’, tb: ‘57%’ },
{ name: ‘Elena Rybakina’, elo: 2054, hold: ‘76.2%’, dr: ‘1.14’, tb: ‘54%’ },
{ name: ‘Iga Swiatek’, elo: 2036, hold: ‘71.1%’, dr: ‘1.25’, tb: ‘52%’ },
{ name: ‘Coco Gauff’, elo: 1968, hold: ‘68.4%’, dr: ‘1.10’, tb: ‘51%’ },
{ name: ‘Jessica Pegula’, elo: 1940, hold: ‘66.8%’, dr: ‘1.08’, tb: ‘49%’ },
];

// — handleAsk ––––––––––––––––––––––––––––––––
async function handleAsk(promptOverride) {
const prompt = (promptOverride || inputValue).trim();
if (!prompt) return;

```
if (!playerData || !contextData) {
  const msg = dataLoading
    ? 'Still loading the tennis database. Try again in a second.'
    : 'Tennis data did not load correctly.';
  setMessages((prev) => [...prev,
    { role: 'user', content: prompt },
    { role: 'assistant', content: msg },
  ]);
  setInputValue('');
  setActiveTab('ASK');
  return;
}

const historyForApi = messages.map((m) => ({ role: m.role, text: m.content, loading: m.loading || false }));
setMessages((prev) => [...prev,
  { role: 'user', content: prompt },
  { role: 'assistant', content: '...', loading: true },
]);
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
```

}

// — Share card —————————————————————
function roundRectPath(ctx, x, y, w, h, r) {
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
const words = text.split(’ ’);
let line = ‘’;
let currentY = y;
for (const word of words) {
const test = line + word + ’ ’;
if (ctx.measureText(test).width > maxWidth && line !== ‘’) {
ctx.fillText(line.trim(), x, currentY);
line = word + ’ ’;
currentY += lineHeight;
} else {
line = test;
}
}
ctx.fillText(line.trim(), x, currentY);
}

async function shareCard(player, prop, reason) {
const W = 1080; const H = 1080;
const canvas = document.createElement(‘canvas’);
canvas.width = W; canvas.height = H;
const ctx = canvas.getContext(‘2d’);
ctx.fillStyle = ‘#000’; ctx.fillRect(0, 0, W, H);
const glow = ctx.createRadialGradient(W / 2, -80, 0, W / 2, -80, 700);
glow.addColorStop(0, ‘rgba(0,245,233,0.18)’); glow.addColorStop(1, ‘rgba(0,0,0,0)’);
ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
ctx.fillStyle = ‘rgba(255,255,255,0.045)’; roundRectPath(ctx, 72, 160, W - 144, 760, 32); ctx.fill();
ctx.strokeStyle = ‘rgba(0,245,233,0.28)’; ctx.lineWidth = 2; roundRectPath(ctx, 72, 160, W - 144, 760, 32); ctx.stroke();
ctx.fillStyle = ‘#00F5E9’; roundRectPath(ctx, 72, 160, 7, 760, 4); ctx.fill();
ctx.font = ‘500 30px monospace’; ctx.fillStyle = ‘#00F5E9’; ctx.fillText(‘UR TAKE’, 126, 258);
const dg = ctx.createLinearGradient(126, 0, 540, 0);
dg.addColorStop(0, ‘#00F5E9’); dg.addColorStop(1, ‘#FF2D6B’);
ctx.fillStyle = dg; ctx.fillRect(126, 275, 414, 3);
ctx.font = ‘bold 86px sans-serif’; ctx.fillStyle = ‘#F7F8FA’; ctx.fillText(player, 126, 398);
const bl = prop.toUpperCase();
ctx.font = ‘bold 34px monospace’;
const pw = ctx.measureText(bl).width + 64;
ctx.fillStyle = ‘#00F5E9’; roundRectPath(ctx, 126, 428, pw, 60, 999); ctx.fill();
ctx.fillStyle = ‘#000’; ctx.fillText(bl, 158, 468);
ctx.font = ‘400 40px sans-serif’; ctx.fillStyle = ‘rgba(247,248,250,0.80)’;
wrapText(ctx, reason, 126, 568, W - 300, 58);
ctx.font = ‘500 30px monospace’; ctx.fillStyle = ‘rgba(247,248,250,0.42)’; ctx.fillText(‘UNDER’, 126, 848);
ctx.font = ‘bold 78px sans-serif’;
const lg = ctx.createLinearGradient(126, 0, 560, 0);
lg.addColorStop(0, ‘#00F5E9’); lg.addColorStop(1, ‘#FF2D6B’);
ctx.fillStyle = lg; ctx.fillText(‘REVIEW’, 126, 928);
const fg = ctx.createLinearGradient(120, 0, 700, 0);
fg.addColorStop(0, ‘#00F5E9’); fg.addColorStop(1, ‘#FF2D6B’);
ctx.fillStyle = fg; ctx.fillRect(120, 942, 580, 3);
ctx.beginPath(); ctx.arc(114, 943, 7, 0, Math.PI * 2); ctx.fillStyle = ‘#00F5E9’; ctx.fill();
ctx.beginPath(); ctx.arc(706, 943, 7, 0, Math.PI * 2); ctx.fillStyle = ‘#FF2D6B’; ctx.fill();
ctx.font = ‘400 26px monospace’; ctx.fillStyle = ‘rgba(247,248,250,0.25)’;
ctx.fillText(‘under-review-v2.vercel.app’, 126, 986);
canvas.toBlob(async (blob) => {
const file = new File([blob], ‘ur-take.png’, { type: ‘image/png’ });
if (navigator.share && navigator.canShare?.({ files: [file] })) {
try { await navigator.share({ files: [file], title: `${player} - ${prop}`, text: `${reason}\n\nvia Under Review` }); }
catch { downloadBlob(blob); }
} else downloadBlob(blob);
}, ‘image/png’);
}

function downloadBlob(blob) {
const url = URL.createObjectURL(blob);
const a = document.createElement(‘a’); a.href = url; a.download = ‘ur-take.png’; a.click();
URL.revokeObjectURL(url);
}

// — Inline markdown –––––––––––––––––––––––––––––
function renderInlineMarkdown(text) {
return text.split(/(**[^*]+**)/g).map((part, i) =>
part.startsWith(’**’) && part.endsWith(’**’)
? <span key={i} style={{ color: ‘#00F5E9’, fontWeight: 700 }}>{part.slice(2, -2)}</span>
: part
);
}

// — Message renderer ———————————————————
function renderMessage(content, isLoading) {
if (isLoading) {
return (
<div style={{ display: ‘flex’, gap: 6, alignItems: ‘center’, padding: ‘4px 0’ }}>
{[0, 1, 2].map((i) => (
<div key={i} style={{ width: 7, height: 7, borderRadius: ‘50%’, background: ‘#00F5E9’, animation: `urPulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
))}
<style>{`@keyframes urPulse{0%,80%,100%{opacity:.2;transform:scale(.85)}40%{opacity:1;transform:scale(1)}}`}</style>
</div>
);
}

```
const lines = content.split('\n').filter(Boolean);
const propLines = lines.filter((l) => l.trim().startsWith('\u2022'));
const normalLines = lines.filter((l) => !l.trim().startsWith('\u2022'));

return (
  <div style={{ display: 'grid', gap: 10 }}>
    {normalLines.map((line, idx) => (
      <div key={`${line}-${idx}`} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, lineHeight: 1.6, color: 'rgba(247,248,250,0.88)', whiteSpace: 'pre-wrap' }}>
        {renderInlineMarkdown(line)}
      </div>
    ))}
    {propLines.length > 0 && (
      <div style={{ display: 'grid', gap: 8 }}>
        {propLines.map((line, idx) => {
          const clean = line.replace(/^\u2022\s*/, '').replace(/\*\*/g, '');
          const parts = clean.split(' - ');
          const looksLikePropCard = parts.length >= 3 && parts[0] && parts[1] && parts[1].length < 60
            && !parts[0].toLowerCase().includes('wimbledon')
            && !parts[0].toLowerCase().includes('french open')
            && !parts[0].toLowerCase().includes('us open');

          if (!looksLikePropCard) {
            return (
              <div key={`${clean}-${idx}`} style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, lineHeight: 1.55, color: 'rgba(247,248,250,0.82)' }}>
                {renderInlineMarkdown(line)}
              </div>
            );
          }

          const player = parts[0] || '';
          const prop = parts[1] || '';
          const reason = parts.slice(2).join(' - ') || '';

          return (
            <div key={`${clean}-${idx}`} style={{ borderLeft: '2px solid rgba(0,245,233,0.5)', borderRadius: '0 12px 12px 0', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', position: 'relative' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center', marginBottom: reason ? 7 : 0, paddingRight: 34 }}>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 800, color: '#F7F8FA' }}>{player}</span>
                {prop && (
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#000', background: '#00F5E9', borderRadius: 999, padding: '3px 8px' }}>{prop}</span>
                )}
              </div>
              {reason && (
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, lineHeight: 1.55, color: 'rgba(247,248,250,0.62)', paddingRight: 34 }}>
                  {renderInlineMarkdown(reason)}
                </div>
              )}
              <button onClick={() => shareCard(player, prop, reason)} title="Share"
                style={{ position: 'absolute', top: 9, right: 9, width: 26, height: 26, borderRadius: '50%', border: '1px solid rgba(0,245,233,0.22)', background: 'rgba(0,245,233,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, WebkitTapHighlightColor: 'transparent' }}>
                <svg width="11" height="12" viewBox="0 0 13 14" fill="none"><path d="M6.5 1.5V9.5M6.5 1.5L4 4M6.5 1.5L9 4" stroke="#00F5E9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M1.5 9.5V12.5H11.5V9.5" stroke="#00F5E9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          );
        })}
      </div>
    )}
  </div>
);
```

}

// — Style B primitives —————————————————––
const S = {
shell: { minHeight: ‘100vh’, background: ‘#040404’, color: ‘#F7F8FA’ },
container: { width: ‘100%’, maxWidth: 760, margin: ‘0 auto’, paddingBottom: 110 },
// Left-accent card: left border only - all other sides explicitly none
card: (live, ask) => ({
borderTop: ‘none’,
borderRight: ‘none’,
borderBottom: ‘none’,
borderLeft: `2px solid ${live ? '#FF2D6B' : ask ? 'rgba(245,200,66,0.38)' : 'rgba(0,245,233,0.42)'}`,
background: live ? ‘rgba(255,45,107,0.05)’ : ask ? ‘rgba(245,200,66,0.025)’ : ‘rgba(255,255,255,0.03)’,
borderRadius: ‘0 10px 10px 0’,
padding: ‘10px 12px’,
marginBottom: 5,
cursor: ‘pointer’,
WebkitTapHighlightColor: ‘transparent’,
outline: ‘none’,
}),
title: { fontFamily: ‘DM Sans, sans-serif’, fontSize: 13, fontWeight: 700, color: ‘#F7F8FA’, marginBottom: 2 },
sub: { fontFamily: ‘DM Mono, monospace’, fontSize: 9, color: ‘rgba(247,248,250,0.3)’, letterSpacing: ‘0.04em’ },
};

function Eyebrow({ label, color = ‘rgba(0,245,233,0.6)’ }) {
return (
<div style={{ fontFamily: ‘DM Mono, monospace’, fontSize: 9, letterSpacing: ‘0.18em’, textTransform: ‘uppercase’, color, marginBottom: 9 }}>
{label}
</div>
);
}

// — Logo (full version for HOME/MIAMI) –––––––––––––––––––
const LogoFull = () => (
<div style={{ textAlign: ‘center’, padding: ‘22px 0 14px’ }}>
<div style={{ fontFamily: ‘DM Mono, monospace’, fontSize: 10, letterSpacing: ‘0.3em’, textTransform: ‘uppercase’, color: ‘rgba(247,248,250,0.36)’, marginBottom: 2 }}>Under</div>
<div style={{ fontFamily: ‘Bebas Neue, sans-serif’, fontSize: 46, lineHeight: 0.95, letterSpacing: ‘0.03em’, background: ‘linear-gradient(90deg, #00F5E9, #FF2D6B)’, WebkitBackgroundClip: ‘text’, WebkitTextFillColor: ‘transparent’ }}>REVIEW</div>
<div style={{ display: ‘flex’, alignItems: ‘center’, gap: 7, width: 88, margin: ‘6px auto 0’ }}>
<div style={{ width: 5, height: 5, borderRadius: ‘50%’, background: ‘#00F5E9’, flexShrink: 0 }} />
<div style={{ flex: 1, height: 1.5, background: ‘linear-gradient(90deg, #00F5E9, #FF2D6B)’ }} />
<div style={{ width: 5, height: 5, borderRadius: ‘50%’, background: ‘#FF2D6B’, flexShrink: 0 }} />
</div>
</div>
);

// — Logo (slim inline for ASK/PRO header) ———————————–
const LogoSlim = () => (
<div style={{ display: ‘flex’, alignItems: ‘center’, gap: 8, padding: ‘14px 16px 6px’ }}>
<div style={{ fontFamily: ‘DM Mono, monospace’, fontSize: 8, letterSpacing: ‘0.24em’, textTransform: ‘uppercase’, color: ‘rgba(247,248,250,0.32)’ }}>Under</div>
<div style={{ fontFamily: ‘Bebas Neue, sans-serif’, fontSize: 20, lineHeight: 1, background: ‘linear-gradient(90deg, #00F5E9, #FF2D6B)’, WebkitBackgroundClip: ‘text’, WebkitTextFillColor: ‘transparent’ }}>REVIEW</div>
</div>
);

// — Get UR Take bar –––––––––––––––––––––––––––––
const GetUrTakeBar = ({ placeholder = ‘ask anything’ }) => (
<div style={{ padding: ‘0 16px 14px’ }}>
<div style={{ display: ‘flex’, alignItems: ‘center’, height: 46, borderRadius: 999, background: ‘rgba(255,255,255,0.04)’, border: ‘1px solid rgba(0,245,233,0.2)’, padding: ‘0 5px 0 14px’, gap: 8 }}>
<input
value={inputValue}
onChange={(e) => setInputValue(e.target.value)}
onKeyDown={(e) => { if (e.key === ‘Enter’) handleAsk(); }}
placeholder={placeholder}
style={{ flex: 1, background: ‘transparent’, border: ‘none’, outline: ‘none’, fontFamily: ‘DM Sans, sans-serif’, fontSize: 16, color: ‘#F7F8FA’ }}
/>
<button onClick={() => handleAsk()} style={{ width: 34, height: 34, borderRadius: ‘50%’, border: ‘none’, cursor: ‘pointer’, background: ‘linear-gradient(90deg, #00F5E9, #FF2D6B)’, color: ‘#000’, fontWeight: 800, fontSize: 16, display: ‘flex’, alignItems: ‘center’, justifyContent: ‘center’, flexShrink: 0, WebkitTapHighlightColor: ‘transparent’ }}>↑</button>
</div>
<div style={{ textAlign: ‘center’, marginTop: 6 }}>
<span style={{ fontFamily: ‘DM Mono, monospace’, fontSize: 8.5, letterSpacing: ‘0.14em’, textTransform: ‘uppercase’, color: ‘rgba(247,248,250,0.24)’ }}>
Get <span style={{ color: ‘#00F5E9’ }}>UR</span> Take
</span>
</div>
</div>
);

// — HOME ———————————————————————
const homeScreen = (
<>
<LogoFull />
<GetUrTakeBar placeholder="Ask a prop, matchup, or slate question..." />

```
  <div style={{ padding: '0 16px' }}>

    {liveTennisMatchups.length > 0 && (
      <div style={{ marginBottom: 18 }}>
        <Eyebrow label="On the board" />
        {liveTennisMatchups.map((m) => (
          <div key={m.title} onClick={() => handleAsk(`Who wins ${m.title}?`)} style={S.card(m.isLive, false)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <div style={S.title}>{m.title}</div>
                <div style={S.sub}>{m.subtitle}</div>
              </div>
              {m.isLive && (
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 7.5, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#FF2D6B', color: '#000', borderRadius: 3, padding: '2px 6px', fontWeight: 700, flexShrink: 0 }}>Live</span>
              )}
            </div>
          </div>
        ))}
      </div>
    )}

    {recentResults.length > 0 && (
      <div style={{ marginBottom: 18 }}>
        <Eyebrow label="Results" />
        {recentResults.map((r, i) => (
          <div key={i} onClick={() => handleAsk(`Best props for ${r.winner} after beating ${r.loser}`)} style={S.card(false, false)}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, minWidth: 0, overflow: 'hidden' }}>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 700, color: '#F7F8FA', whiteSpace: 'nowrap' }}>{r.winner}</span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: 'rgba(247,248,250,0.38)', whiteSpace: 'nowrap' }}>def. {r.loser}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexShrink: 0 }}>
                {r.score && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9.5, color: 'rgba(247,248,250,0.26)' }}>{r.score}</span>}
                {r.round && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8.5, letterSpacing: '0.06em', color: 'rgba(247,248,250,0.18)', textTransform: 'uppercase' }}>{abbreviateRound(r.round)}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    )}

    <div style={{ marginBottom: 18 }}>
      <Eyebrow label="Ask" color="rgba(245,200,66,0.55)" />
      {dynamicAsks.map((ask) => (
        <div key={ask} onClick={() => handleAsk(ask)} style={S.card(false, true)}>
          <div style={S.title}>{ask}</div>
        </div>
      ))}
    </div>

    {dataLoading && liveTennisMatchups.length === 0 && (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(247,248,250,0.25)' }}>Loading slate...</div>
      </div>
    )}
  </div>
</>
```

);

// — MIAMI ––––––––––––––––––––––––––––––––––
const miamiScreen = (
<>
<LogoFull />
<div style={{ padding: ‘0 16px 4px’ }}>
<Eyebrow label="Miami Open 2026" color="rgba(255,45,107,0.65)" />
<div style={{ fontFamily: ‘DM Sans, sans-serif’, fontSize: 13, lineHeight: 1.6, color: ‘rgba(247,248,250,0.55)’, marginBottom: 14 }}>
Hard court, medium-fast. Best angles in ace props, first-set winners, and total-games spots.
</div>
</div>

```
  <GetUrTakeBar placeholder="Ask Miami props, players, or matchups..." />

  <div style={{ padding: '0 16px' }}>
    <div style={{ marginBottom: 18 }}>
      <Eyebrow label="Quick asks" color="rgba(245,200,66,0.55)" />
      {miamiPrompts.map((p) => (
        <div key={p} onClick={() => handleAsk(p)} style={S.card(false, true)}>
          <div style={S.title}>{p}</div>
        </div>
      ))}
    </div>

    <div style={{ marginBottom: 18 }}>
      <Eyebrow label="Prop guide" color="rgba(245,200,66,0.55)" />
      {[
        { title: 'Ace props', body: 'Most playable when hold stability and short-rally profile line up.' },
        { title: 'First set winners', body: 'Best in lopsided serve quality matchups where early pressure is predictable.' },
        { title: 'Total games', body: 'Strongest when both players hold clean or one player controls pace but not breaks.' },
      ].map((item) => (
        <div key={item.title} style={{ ...S.card(false, false), cursor: 'default' }}>
          <div style={{ ...S.title, marginBottom: 4 }}>{item.title}</div>
          <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, lineHeight: 1.5, color: 'rgba(247,248,250,0.48)' }}>{item.body}</div>
        </div>
      ))}
    </div>

    {[{ label: 'ATP - top players', players: atpPlayers }, { label: 'WTA - top players', players: wtaPlayers }].map(({ label, players }) => (
      <div key={label} style={{ marginBottom: 18 }}>
        <Eyebrow label={label} color="rgba(245,200,66,0.55)" />
        {players.map((player) => (
          <div key={player.name} style={{ ...S.card(false, false), cursor: 'default' }}>
            <div style={{ ...S.title, marginBottom: 8 }}>{player.name}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5 }}>
              {[['Elo', player.elo], ['Hold%', player.hold], ['DR', player.dr], ['TB%', player.tb]].map(([lbl, val]) => (
                <div key={lbl} style={{ background: '#080808', borderRadius: 7, padding: '6px 6px' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 8.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(247,248,250,0.32)', marginBottom: 3 }}>{lbl}</div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 800, color: '#F7F8FA' }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    ))}
  </div>
</>
```

);

// — ASK –––––––––––––––––––––––––––––––––––
const askScreen = (
<>
<LogoSlim />
<GetUrTakeBar placeholder="Ask props, matchups, or slate questions..." />
<div style={{ padding: ‘0 16px’ }}>
{messages.length <= 1 && (
<div style={{ marginBottom: 18 }}>
<Eyebrow label="Featured prompts" />
{featuredPrompts.map((p) => (
<div key={p} onClick={() => handleAsk(p)} style={S.card(false, true)}>
<div style={S.title}>{p}</div>
</div>
))}
</div>
)}

```
    <div style={{ display: 'grid', gap: 10 }}>
      {messages.map((message, index) => (
        <div key={`${message.role}-${index}`} style={{ display: 'flex', justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}>
          <div style={{
            width: '100%',
            maxWidth: message.role === 'user' ? 520 : '100%',
            borderRadius: message.role === 'user' ? 16 : '0 14px 14px 0',
            padding: '12px 14px',
            background: message.role === 'user'
              ? 'linear-gradient(90deg, rgba(0,245,233,0.12), rgba(255,45,107,0.1))'
              : 'rgba(255,255,255,0.03)',
            border: message.role === 'user' ? '1px solid rgba(0,245,233,0.18)' : 'none',
            borderLeft: message.role === 'assistant' ? '2px solid rgba(0,245,233,0.35)' : undefined,
          }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: message.role === 'user' ? '#F5C842' : '#00F5E9', marginBottom: 7 }}>
              {message.role === 'user' ? 'You' : 'UR Take'}
            </div>
            {renderMessage(message.content, message.loading)}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  </div>
</>
```

);

// — PRO –––––––––––––––––––––––––––––––––––
const proScreen = (
<>
<LogoSlim />
<div style={{ padding: ‘8px 16px’ }}>
<div style={{ borderLeft: ‘2px solid rgba(255,45,107,0.5)’, borderRadius: ‘0 14px 14px 0’, background: ‘linear-gradient(180deg, rgba(0,245,233,0.04), rgba(255,45,107,0.04)), rgba(255,255,255,0.025)’, padding: 18 }}>
<Eyebrow label="Pro" color="rgba(255,45,107,0.7)" />
<h2 style={{ margin: 0, fontFamily: ‘Bebas Neue, sans-serif’, fontSize: 38, lineHeight: 1, color: ‘#F7F8FA’, letterSpacing: ‘0.03em’ }}>$9.99 / month</h2>
<p style={{ marginTop: 10, marginBottom: 16, fontFamily: ‘DM Sans, sans-serif’, fontSize: 14, lineHeight: 1.6, color: ‘rgba(247,248,250,0.62)’ }}>
Unlimited UR TAKE queries, deeper matchup cards, saved threads, and more premium betting intelligence.
</p>
<div style={{ display: ‘grid’, gap: 5, marginBottom: 16 }}>
{[‘Unlimited UR TAKE queries’, ‘Deeper matchup cards’, ‘Saved threads’, ‘Expanded player and surface data’].map((f) => (
<div key={f} style={{ borderLeft: ‘2px solid rgba(0,245,233,0.28)’, borderRadius: ‘0 8px 8px 0’, padding: ‘9px 12px’, background: ‘rgba(255,255,255,0.03)’, fontFamily: ‘DM Sans, sans-serif’, fontSize: 13, fontWeight: 700, color: ‘#F7F8FA’ }}>{f}</div>
))}
</div>
<button style={{ width: ‘100%’, height: 48, border: ‘none’, borderRadius: 999, cursor: ‘pointer’, fontFamily: ‘DM Sans, sans-serif’, fontSize: 15, fontWeight: 800, color: ‘#000’, background: ‘linear-gradient(90deg, #00F5E9, #FF2D6B)’ }}>
Unlock Pro
</button>
</div>
</div>
</>
);

// — SHELL + NAV –––––––––––––––––––––––––––––––
return (
<div style={S.shell}>
<style>{`*,*::before,*::after{box-sizing:border-box} button{border:none;background:none;padding:0;margin:0;outline:none;-webkit-tap-highlight-color:transparent} input{border:none;outline:none;background:none} div[role=button],div[onClick]{outline:none}`}</style>
<div style={S.container}>
{activeTab === ‘HOME’ && homeScreen}
{activeTab === ‘MIAMI’ && miamiScreen}
{activeTab === ‘ASK’ && askScreen}
{activeTab === ‘PRO’ && proScreen}
</div>

```
  {/* Style B nav: solid background, single hairline top, no pill, no gradient */}
  <nav style={{ position: 'fixed', left: 0, right: 0, bottom: 0, display: 'flex', justifyContent: 'center', padding: '0 16px calc(10px + env(safe-area-inset-bottom))', background: '#040404', borderTop: '0.5px solid rgba(255,255,255,0.1)' }}>
    <div style={{ width: '100%', maxWidth: 760, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
      {[
        { key: 'HOME', label: 'Home' },
        { key: 'MIAMI', label: 'Miami' },
        { key: 'ASK', label: 'Ask' },
        { key: 'PRO', label: 'Pro' },
      ].map((item) => {
        const isActive = activeTab === item.key;
        const isMiami = item.key === 'MIAMI';
        return (
          <button
            key={item.key}
            onClick={() => setActiveTab(item.key)}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onTouchStart={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
            onTouchEnd={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            style={{
              background: 'none',
              border: 'none',
              borderTop: isActive ? '1.5px solid #00F5E9' : '1.5px solid transparent',
              cursor: 'pointer',
              fontFamily: 'DM Mono, monospace',
              fontSize: 10,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: isActive ? '#F7F8FA' : isMiami ? '#F5C842' : 'rgba(247,248,250,0.28)',
              padding: '9px 0 5px',
              transition: 'transform 0.1s ease',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  </nav>
</div>
```

);
}