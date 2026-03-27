import { useEffect, useState } from 'react';

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
  const [dataLoading, setDataLoading] = useState(true);

  const featuredPrompts = [
    'Best props tonight?',
    'Who wins Sinner vs Zverev?',
    'Best value on the Miami slate?',
    'What is the sharpest angle today?',
  ];

  const trendingAsks = [
    'Best props for Sinner vs Zverev',
    'Is Alcaraz overpriced today?',
    'Best ace props in Miami',
    'Who is live for an upset tonight?',
  ];

  const featuredMatchups = [
    {
      title: 'Sinner vs Zverev',
      subtitle: 'Miami Open • Hard Court',
      angle: 'Lean: Sinner in 2',
    },
    {
      title: 'Alcaraz vs Medvedev',
      subtitle: 'Miami Open • Hard Court',
      angle: 'Lean: Over 22.5 Games',
    },
    {
      title: 'Sabalenka vs Gauff',
      subtitle: 'Miami Open • WTA',
      angle: 'Lean: Sabalenka ML',
    },
  ];

  const miamiPrompts = [
    'Best props tonight?',
    'Who wins Sinner vs Zverev?',
    'Best ace props in Miami?',
    'Who is overpriced today?',
  ];

  useEffect(() => {
    async function loadData() {
      try {
        const [playersRes, contextRes, liveAtpRes, liveWtaRes] = await Promise.all([
          fetch('/api/tennis-players'),
          fetch('/api/tennis-context'),
          fetch('/api/tennis?tour=atp'),
          fetch('/api/tennis?tour=wta'),
        ]);

        const playersJson = await playersRes.json();
        const contextJson = await contextRes.json();
        const liveAtpJson = await liveAtpRes.json();
        const liveWtaJson = await liveWtaRes.json();

        setPlayerData(playersJson);
        setContextData(contextJson);
        setLiveMatches([
          ...(Array.isArray(liveAtpJson) ? liveAtpJson : []),
          ...(Array.isArray(liveWtaJson) ? liveWtaJson : []),
        ]);
      } catch (err) {
        console.error('Failed to load tennis data:', err);
      } finally {
        setDataLoading(false);
      }
    }

    loadData();
  }, []);

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

  async function handleAsk(promptOverride) {
    const prompt = (promptOverride || inputValue).trim();
    if (!prompt) return;

    if (!playerData || !contextData) {
      const userMessage = { role: 'user', content: prompt };
      const assistantMessage = {
        role: 'assistant',
        content: dataLoading
          ? 'Still loading the tennis database. Try again in a second.'
          : 'Tennis data did not load correctly. Check /api/tennis-players and /api/tennis-context.',
      };
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setInputValue('');
      setActiveTab('ASK');
      return;
    }

    const historyForApi = messages.map((msg) => ({
      role: msg.role,
      text: msg.content,
      loading: msg.loading || false,
    }));

    const userMessage = { role: 'user', content: prompt };
    const loadingMessage = { role: 'assistant', content: 'Thinking...', loading: true };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
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
          tour: 'tennis',
          history: historyForApi,
          matchupContext: null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Request failed');
      }

      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: 'assistant',
          content: data.response || 'No response returned.',
        };
        return next;
      });
    } catch (err) {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: 'assistant',
          content: `Couldn't get a response right now. ${err.message}`,
        };
        return next;
      });
    }
  }

  function renderMessage(content) {
    const lines = content.split('\n').filter(Boolean);
    const propLines = lines.filter((line) => line.trim().startsWith('•'));
    const normalLines = lines.filter((line) => !line.trim().startsWith('•'));

    return (
      <div style={{ display: 'grid', gap: 10 }}>
        {normalLines.map((line, idx) => (
          <div
            key={`${line}-${idx}`}
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 14,
              lineHeight: 1.6,
              color: 'rgba(247,248,250,0.88)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {line}
          </div>
        ))}

        {propLines.length > 0 && (
          <div style={{ display: 'grid', gap: 10 }}>
            {propLines.map((line, idx) => {
              const clean = line.replace(/^•\s*/, '');
              const parts = clean.split(' — ');

              const looksLikePropCard =
                parts.length >= 3 &&
                parts[0] &&
                parts[1] &&
                parts[1].length < 40 &&
                !parts[0].toLowerCase().includes('wimbledon') &&
                !parts[0].toLowerCase().includes('french open') &&
                !parts[0].toLowerCase().includes('us open');

              if (!looksLikePropCard) {
                return (
                  <div
                    key={`${clean}-${idx}`}
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 14,
                      lineHeight: 1.55,
                      color: 'rgba(247,248,250,0.82)',
                    }}
                  >
                    {line}
                  </div>
                );
              }

              const player = parts[0] || '';
              const prop = parts[1] || '';
              const reason = parts.slice(2).join(' — ') || '';

              return (
                <div
                  key={`${clean}-${idx}`}
                  style={{
                    border: '1px solid rgba(0,245,233,0.22)',
                    borderLeft: '3px solid #00F5E9',
                    borderRadius: 16,
                    padding: 12,
                    background: 'rgba(255,255,255,0.025)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      alignItems: 'center',
                      marginBottom: reason ? 8 : 0,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: 14,
                        fontWeight: 800,
                        color: '#F7F8FA',
                      }}
                    >
                      {player}
                    </span>
                    {prop ? (
                      <span
                        style={{
                          fontFamily: 'DM Mono, monospace',
                          fontSize: 11,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: '#080A0C',
                          background: '#00F5E9',
                          borderRadius: 999,
                          padding: '4px 8px',
                        }}
                      >
                        {prop}
                      </span>
                    ) : null}
                  </div>
                  {reason ? (
                    <div
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: 13,
                        lineHeight: 1.55,
                        color: 'rgba(247,248,250,0.76)',
                      }}
                    >
                      {reason}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const shellStyle = {
    minHeight: '100vh',
    background:
      'radial-gradient(circle at top, rgba(10,20,34,1) 0%, #080A0C 38%, #080A0C 100%)',
    color: '#F7F8FA',
  };

  const containerStyle = {
    width: '100%',
    maxWidth: 760,
    margin: '0 auto',
    paddingBottom: activeTab === 'ASK' ? 170 : 110,
  };

  const logoRule = (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
        <div style={{ width: 8, height: 8, borderRadius: 999, background: '#00F5E9', flexShrink: 0 }} />
        <div style={{ height: 2, flex: 1, borderRadius: 999, background: 'linear-gradient(90deg, #00F5E9 0%, #FF2D6B 100%)' }} />
        <div style={{ width: 8, height: 8, borderRadius: 999, background: '#FF2D6B', flexShrink: 0 }} />
      </div>
    </div>
  );

  const topHeader = (
    <div style={{ padding: '22px 16px 8px' }}>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div
          style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: 11,
            letterSpacing: '0.32em',
            color: 'rgba(247,248,250,0.7)',
            textTransform: 'uppercase',
            marginBottom: 2,
          }}
        >
          UNDER
        </div>
        <div
          style={{
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: 48,
            lineHeight: 0.95,
            letterSpacing: '0.03em',
            background: 'linear-gradient(90deg, #00F5E9 0%, #FF2D6B 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          REVIEW
        </div>
        {logoRule}
      </div>
    </div>
  );

  const askBar = (placeholder = 'Ask UR TAKE anything...') => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 52px',
        gap: 10,
        padding: '0 16px',
        marginBottom: 16,
      }}
    >
      <input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleAsk(); }}
        placeholder={placeholder}
        style={{
          height: 50,
          borderRadius: 999,
          border: '1px solid rgba(0,245,233,0.24)',
          background: 'rgba(255,255,255,0.03)',
          color: '#F7F8FA',
          padding: '0 16px',
          outline: 'none',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 14,
        }}
      />
      <button
        onClick={() => handleAsk()}
        style={{
          height: 50,
          border: 'none',
          borderRadius: 999,
          cursor: 'pointer',
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 800,
          fontSize: 18,
          color: '#080A0C',
          background: 'linear-gradient(90deg, #00F5E9 0%, #FF2D6B 100%)',
          boxShadow: '0 8px 24px rgba(0,245,233,0.14)',
        }}
        aria-label="Send"
      >
        ➜
      </button>
    </div>
  );

  const sectionEyebrow = (label, color = '#00F5E9') => (
    <div
      style={{
        fontFamily: 'DM Mono, monospace',
        fontSize: 11,
        letterSpacing: '0.16em',
        color,
        textTransform: 'uppercase',
        marginBottom: 10,
      }}
    >
      {label}
    </div>
  );

  const cardBase = {
    borderRadius: 22,
    padding: '18px 16px',
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.06)',
  };

  const homeScreen = (
    <>
      {askBar('Ask props, matchups, or slates...')}
      <div style={{ padding: '0 16px' }}>
        <section
          style={{
            ...cardBase,
            background:
              'linear-gradient(180deg, rgba(0,245,233,0.08) 0%, rgba(255,45,107,0.06) 100%), rgba(255,255,255,0.03)',
            border: '1px solid rgba(0,245,233,0.18)',
            marginBottom: 14,
          }}
        >
          {sectionEyebrow('Sharp, stat-backed betting takes')}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontFamily: 'Bebas Neue, sans-serif',
                  fontSize: 34,
                  lineHeight: 0.98,
                  letterSpacing: '0.02em',
                  color: '#F7F8FA',
                }}
              >
                Ask better.
                <br />
                Bet sharper.
              </h1>
              <p
                style={{
                  marginTop: 10,
                  marginBottom: 0,
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: 'rgba(247,248,250,0.78)',
                  maxWidth: 420,
                }}
              >
                Matchups, props, and slate angles — built for decisions, not dashboards.
              </p>
            </div>
            <button
              onClick={() => handleAsk("What are today's best angles?")}
              style={{
                borderRadius: 999,
                padding: '12px 16px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                color: '#F7F8FA',
                background: 'transparent',
                border: '1px solid rgba(247,248,250,0.14)',
              }}
            >
              Today&apos;s best angles
            </button>
          </div>
        </section>

        <section style={{ ...cardBase, marginBottom: 14 }}>
          {sectionEyebrow('Trending asks')}
          <div style={{ display: 'grid', gap: 10 }}>
            {trendingAsks.map((ask) => (
              <button
                key={ask}
                onClick={() => handleAsk(ask)}
                style={{
                  textAlign: 'left',
                  borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.025)',
                  color: '#F7F8FA',
                  padding: '14px 14px',
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {ask}
              </button>
            ))}
          </div>
        </section>

        <section style={{ ...cardBase, marginBottom: 14 }}>
          {sectionEyebrow('Featured matchups')}
          <div style={{ display: 'grid', gap: 12 }}>
            {featuredMatchups.map((matchup) => (
              <button
                key={matchup.title}
                onClick={() => handleAsk(`Who wins ${matchup.title}?`)}
                style={{
                  textAlign: 'left',
                  borderRadius: 18,
                  border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.025)',
                  padding: 14,
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 16, fontWeight: 800, color: '#F7F8FA', marginBottom: 4 }}>
                      {matchup.title}
                    </div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'rgba(247,248,250,0.66)' }}>
                      {matchup.subtitle}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#00F5E9' }}>
                    {matchup.angle}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </>
  );

  const miamiScreen = (
    <>
      <div style={{ padding: '0 16px', marginBottom: 14 }}>
        <section
          style={{
            ...cardBase,
            background: 'linear-gradient(180deg, rgba(245,200,66,0.12) 0%, rgba(255,255,255,0.025) 100%)',
            border: '1px solid rgba(245,200,66,0.28)',
          }}
        >
          {sectionEyebrow('Miami Open 2026', '#F5C842')}
          <h2 style={{ margin: 0, fontFamily: 'Bebas Neue, sans-serif', fontSize: 34, lineHeight: 1, letterSpacing: '0.03em', color: '#F7F8FA' }}>
            MIAMI
          </h2>
          <p style={{ marginTop: 10, marginBottom: 0, fontFamily: 'DM Sans, sans-serif', fontSize: 15, lineHeight: 1.6, color: 'rgba(247,248,250,0.8)' }}>
            Hard-court event. Premium hold-rate and first-strike edges. Best angles usually show up in ace props, first-set winners, and total-games spots.
          </p>
        </section>
      </div>

      {askBar('Ask Miami props, players, or matchups...')}

      <div style={{ padding: '0 16px' }}>
        <section style={{ ...cardBase, marginBottom: 14 }}>
          {sectionEyebrow('Quick asks', '#F5C842')}
          <div style={{ display: 'grid', gap: 10 }}>
            {miamiPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleAsk(prompt)}
                style={{
                  textAlign: 'left',
                  borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.025)',
                  color: '#F7F8FA',
                  padding: '14px 14px',
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
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
              <div
                key={item.title}
                style={{
                  borderRadius: 18,
                  padding: 14,
                  border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.025)',
                }}
              >
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 800, color: '#F7F8FA', marginBottom: 6 }}>
                  {item.title}
                </div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, lineHeight: 1.55, color: 'rgba(247,248,250,0.72)' }}>
                  {item.body}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ ...cardBase, marginBottom: 14 }}>
          {sectionEyebrow('ATP top players', '#F5C842')}
          <div style={{ display: 'grid', gap: 10 }}>
            {atpPlayers.map((player) => (
              <div key={player.name} style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.025)', padding: 14 }}>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 800, color: '#F7F8FA', marginBottom: 10 }}>
                  {player.name}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[['Elo', player.elo], ['Hold%', player.hold], ['DR', player.dr], ['TB%', player.tb]].map(([label, value]) => (
                    <div key={label} style={{ borderRadius: 12, padding: '10px 8px', background: '#0D1116', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(247,248,250,0.52)', marginBottom: 4 }}>
                        {label}
                      </div>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 800, color: '#F7F8FA' }}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ ...cardBase, marginBottom: 14 }}>
          {sectionEyebrow('WTA top players', '#F5C842')}
          <div style={{ display: 'grid', gap: 10 }}>
            {wtaPlayers.map((player) => (
              <div key={player.name} style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.025)', padding: 14 }}>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 800, color: '#F7F8FA', marginBottom: 10 }}>
                  {player.name}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[['Elo', player.elo], ['Hold%', player.hold], ['DR', player.dr], ['TB%', player.tb]].map(([label, value]) => (
                    <div key={label} style={{ borderRadius: 12, padding: '10px 8px', background: '#0D1116', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(247,248,250,0.52)', marginBottom: 4 }}>
                        {label}
                      </div>
                      <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 800, color: '#F7F8FA' }}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );

  const askScreen = (
    <>
      <div style={{ padding: '0 16px' }}>
        {messages.length <= 1 && (
          <section style={{ ...cardBase, marginBottom: 14 }}>
            {sectionEyebrow('Featured prompts')}
            <div style={{ display: 'grid', gap: 10 }}>
              {featuredPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleAsk(prompt)}
                  style={{
                    textAlign: 'left',
                    borderRadius: 16,
                    border: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(255,255,255,0.025)',
                    color: '#F7F8FA',
                    padding: '14px 14px',
                    cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </section>
        )}

        <div style={{ display: 'grid', gap: 12 }}>
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              style={{
                display: 'flex',
                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: message.role === 'user' ? 520 : '100%',
                  borderRadius: 20,
                  padding: '14px 14px',
                  background:
                    message.role === 'user'
                      ? 'linear-gradient(90deg, rgba(0,245,233,0.16) 0%, rgba(255,45,107,0.14) 100%)'
                      : 'rgba(255,255,255,0.025)',
                  border:
                    message.role === 'user'
                      ? '1px solid rgba(0,245,233,0.2)'
                      : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div
                  style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: message.role === 'user' ? '#F5C842' : '#00F5E9',
                    marginBottom: 8,
                  }}
                >
                  {message.role === 'user' ? 'You' : 'UR TAKE'}
                </div>
                {renderMessage(message.content)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const proScreen = (
    <div style={{ padding: '0 16px' }}>
      <section
        style={{
          ...cardBase,
          background: 'linear-gradient(180deg, rgba(0,245,233,0.08) 0%, rgba(255,45,107,0.08) 100%), rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,45,107,0.22)',
        }}
      >
        {sectionEyebrow('Pro', '#FF2D6B')}
        <h2 style={{ margin: 0, fontFamily: 'Bebas Neue, sans-serif', fontSize: 38, lineHeight: 1, color: '#F7F8FA', letterSpacing: '0.03em' }}>
          $9.99 / month
        </h2>
        <p style={{ marginTop: 12, marginBottom: 18, fontFamily: 'DM Sans, sans-serif', fontSize: 15, lineHeight: 1.6, color: 'rgba(247,248,250,0.82)' }}>
          Unlimited UR TAKE queries, deeper matchup cards, saved threads, and more premium betting intelligence.
        </p>
        <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
          {[
            'Unlimited UR TAKE queries',
            'Deeper matchup cards',
            'Saved threads',
            'Expanded player and surface data',
          ].map((feature) => (
            <div
              key={feature}
              style={{
                borderRadius: 14,
                padding: '12px 12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 14,
                fontWeight: 700,
                color: '#F7F8FA',
              }}
            >
              {feature}
            </div>
          ))}
        </div>
        <button
          style={{
            width: '100%',
            height: 50,
            border: 'none',
            borderRadius: 999,
            cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 15,
            fontWeight: 800,
            color: '#080A0C',
            background: 'linear-gradient(90deg, #00F5E9 0%, #FF2D6B 100%)',
          }}
        >
          Unlock Pro
        </button>
      </section>
    </div>
  );

  const bottomNavItems = [
    { key: 'HOME', label: 'HOME' },
    { key: 'MIAMI', label: 'MIAMI' },
    { key: 'ASK', label: 'ASK' },
    { key: 'PRO', label: 'PRO' },
  ];

  return (
    <div style={shellStyle}>
      <div style={containerStyle}>
        {topHeader}
        {activeTab === 'HOME' && homeScreen}
        {activeTab === 'MIAMI' && miamiScreen}
        {activeTab === 'ASK' && askScreen}
        {activeTab === 'PRO' && proScreen}
      </div>

      {activeTab === 'ASK' && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 80,
            zIndex: 10,
            display: 'flex',
            justifyContent: 'center',
            padding: '12px 16px 4px',
            background: 'linear-gradient(180deg, rgba(8,10,12,0) 0%, rgba(8,10,12,0.96) 35%)',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 760,
              display: 'grid',
              gridTemplateColumns: '1fr 52px',
              gap: 10,
            }}
          >
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAsk(); }}
              placeholder="Ask a follow-up..."
              style={{
                height: 50,
                borderRadius: 999,
                border: '1px solid rgba(0,245,233,0.24)',
                background: 'rgba(10,12,14,0.98)',
                color: '#F7F8FA',
                padding: '0 16px',
                outline: 'none',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 14,
              }}
            />
            <button
              onClick={() => handleAsk()}
              style={{
                height: 50,
                border: 'none',
                borderRadius: 999,
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 800,
                fontSize: 18,
                color: '#080A0C',
                background: 'linear-gradient(90deg, #00F5E9 0%, #FF2D6B 100%)',
              }}
              aria-label="Send"
            >
              ➜
            </button>
          </div>
        </div>
      )}

      <nav
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 20,
          display: 'flex',
          justifyContent: 'center',
          padding: '10px 16px',
          paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
          background: 'linear-gradient(180deg, rgba(8,10,12,0) 0%, rgba(8,10,12,0.88) 28%, rgba(8,10,12,0.98) 100%)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 760,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
            borderRadius: 22,
            padding: 10,
            background: 'rgba(255,255,255,0.035)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {bottomNavItems.map((item) => {
            const isActive = activeTab === item.key;
            const isMiami = item.key === 'MIAMI';
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                style={{
                  height: 48,
                  borderRadius: 16,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 12,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: isActive ? '#080A0C' : isMiami ? '#F5C842' : '#F7F8FA',
                  background: isActive
                    ? isMiami
                      ? '#F5C842'
                      : 'linear-gradient(90deg, #00F5E9 0%, #FF2D6B 100%)'
                    : 'rgba(255,255,255,0.03)',
                  fontWeight: 700,
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
