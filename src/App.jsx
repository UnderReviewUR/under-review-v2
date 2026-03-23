import { useState } from 'react';

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

  function generateMockResponse(prompt) {
    const lower = prompt.toLowerCase();

    if (lower.includes('sinner') && lower.includes('zverev')) {
      return `Sinner in 2

• Sinner — UNDER 22.5 games — Zverev’s return numbers flatten out against elite first-strike hard-court servers
• Sinner — 1st set winner — he controls early tempo better and wins first sets at a higher clip on hard courts
• Sinner — OVER 10.5 aces — clean hold profile and likely scoreboard pressure points to volume

UR TAKE: Sinner is the cleaner hard-court problem right now. Better baseline control, better scoreboard pressure, fewer loose service games.`;
    }

    if (lower.includes('best props') || lower.includes('best angles')) {
      return `Tonight’s sharpest angles

• Sinner — UNDER 22.5 games — edge comes from serve protection and cleaner baseline starts
• Sabalenka — OVER 7.5 aces — live hold profile and aggressive first-ball patterns
• Alcaraz — OVER 22.5 games — opponent style creates longer neutral exchanges

UR TAKE: Start with the spots where serve profile and matchup pace line up. That is where the cleanest value usually sits.`;
    }

    if (lower.includes('ace')) {
      return `Best ace angles

• Sinner — OVER 10.5 aces — hard-court hold profile supports volume
• Fritz — OVER 9.5 aces — free-point upside stays live all match
• Sabalenka — OVER 7.5 aces — first-strike patterns create ceiling

UR TAKE: Ace props are strongest when hold stability and short rally profile are both in play.`;
    }

    return `UR TAKE

• Best angle — Wait for the cleanest mismatch in hold rate, return pressure, and surface comfort
• Prop angle — Look for first-set and total-games spots where the matchup shape is obvious
• Value note — The best plays are the ones you can explain in one sentence with one stat

UR TAKE: Under Review is built for decisions, not dashboards. Ask the exact matchup, prop, or slate spot you want attacked.`;
  }

  function handleAsk(promptOverride) {
    const prompt = (promptOverride || inputValue).trim();
    if (!prompt) return;

    const userMessage = { role: 'user', content: prompt };
    const assistantMessage = {
      role: 'assistant',
      content: generateMockResponse(prompt),
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInputValue('');
    setActiveTab('ASK');
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
    paddingBottom: 110,
  };

  const logoRule = (
    <div style={{ marginTop: 10 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: '#00F5E9',
            flexShrink: 0,
          }}
        />
        <div
          style={{
            height: 2,
            flex: 1,
            borderRadius: 999,
            background: 'linear-gradient(90deg, #00F5E9 0%, #FF2D6B 100%)',
          }}
        />
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: '#FF2D6B',
            flexShrink: 0,
          }}
        />
      </div>
    </div>
  );

  const topHeader = (
    <div style={{ padding: '22px 16px 8px' }}>
      <div
        style={{
          textAlign: 'center',
          marginBottom: 14,
        }}
      >
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

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 8,
        }}
      >
        {['NFL', 'NBA', 'Tennis', 'Soccer', 'F1'].map((sport) => (
          <div
            key={sport}
            style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: sport === 'Tennis' ? '#080A0C' : 'rgba(247,248,250,0.72)',
              background: sport === 'Tennis' ? '#F5C842' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${
                sport === 'Tennis'
                  ? 'rgba(245,200,66,0.8)'
                  : 'rgba(255,255,255,0.08)'
              }`,
              borderRadius: 999,
              padding: '7px 10px',
            }}
          >
            {sport}
          </div>
        ))}
      </div>
    </div>
  );

  const askBar = (placeholder = 'Ask UR TAKE anything...') => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 48px',
        gap: 10,
        padding: '0 16px',
        marginBottom: 16,
      }}
    >
      <input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleAsk();
        }}
        placeholder={placeholder}
        style={{
          height: 48,
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
          height: 48,
          border: 'none',
          borderRadius: 999,
          cursor: 'pointer',
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 800,
          color: '#080A0C',
          background: 'linear-gradient(90deg, #00F5E9 0%, #FF2D6B 100%)',
        }}
      >
        →
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
            position: 'relative',
            overflow: 'hidden',
            background:
              'linear-gradient(180deg, rgba(0,245,233,0.08) 0%, rgba(255,45,107,0.06) 100%), rgba(255,255,255,0.03)',
            border: '1px solid rgba(0,245,233,0.18)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.02) inset',
            marginBottom: 14,
          }}
        >
          {sectionEyebrow('Betting intelligence, without the extra work')}

          <h1
            style={{
              margin: 0,
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: 44,
              lineHeight: 0.95,
              letterSpacing: '0.02em',
              color: '#F7F8FA',
            }}
          >
            Stop researching.
            <br />
            Start betting smarter.
          </h1>

          <p
            style={{
              marginTop: 14,
              marginBottom: 18,
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 16,
              lineHeight: 1.55,
              color: 'rgba(247,248,250,0.82)',
              maxWidth: 560,
            }}
          >
            Under Review gives you sharp, stat-backed takes instantly—no models to
            build, no dashboards to decode.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              marginBottom: 16,
            }}
          >
            <button
              onClick={() => setActiveTab('ASK')}
              style={{
                border: 'none',
                borderRadius: 999,
                padding: '12px 18px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                color: '#080A0C',
                background: 'linear-gradient(90deg, #00F5E9 0%, #FF2D6B 100%)',
              }}
            >
              Ask a question
            </button>

            <button
              onClick={() => handleAsk("What are today's best angles?")}
              style={{
                borderRadius: 999,
                padding: '12px 18px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                color: '#F7F8FA',
                background: 'transparent',
                border: '1px solid rgba(247,248,250,0.16)',
              }}
            >
              See today&apos;s best angles
            </button>
          </div>

          <div
            style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: 12,
              color: '#F5C842',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            The fastest way from question → answer → bet.
          </div>
        </section>

        <section style={{ ...cardBase, marginBottom: 14 }}>
          {sectionEyebrow('What this is')}

          <h2
            style={{
              margin: '0 0 10px',
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: 28,
              lineHeight: 1,
              color: '#F7F8FA',
              letterSpacing: '0.03em',
            }}
          >
            This isn&apos;t a tool. It&apos;s your edge.
          </h2>

          <p
            style={{
              margin: 0,
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 15,
              lineHeight: 1.65,
              color: 'rgba(247,248,250,0.8)',
            }}
          >
            Most platforms give you data and expect you to figure it out. Under
            Review does the opposite. You ask a question. You get a clear,
            confident answer—backed by real stats and matchup context. No
            spreadsheets. No model tuning. No guesswork.
          </p>
        </section>

        <section style={{ ...cardBase, marginBottom: 14 }}>
          {sectionEyebrow('How it works')}

          <div style={{ display: 'grid', gap: 12 }}>
            {[
              {
                num: '01',
                title: 'Ask anything',
                body: 'Props, matchups, slates—whatever you are looking at.',
              },
              {
                num: '02',
                title: 'Get UR TAKE',
                body: 'A sharp lean, key stats, and real reasoning—instantly.',
              },
              {
                num: '03',
                title: 'Make the play',
                body: 'No second-guessing. No digging through data.',
              },
            ].map((item) => (
              <div
                key={item.num}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '44px 1fr',
                  gap: 12,
                  alignItems: 'start',
                  padding: '12px 0',
                  borderTop:
                    item.num === '01'
                      ? '1px solid rgba(255,255,255,0.06)'
                      : '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'DM Mono, monospace',
                    fontSize: 12,
                    color: '#080A0C',
                    background: '#F5C842',
                  }}
                >
                  {item.num}
                </div>

                <div>
                  <div
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 16,
                      fontWeight: 700,
                      color: '#F7F8FA',
                      marginBottom: 4,
                    }}
                  >
                    {item.title}
                  </div>
                  <div
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 14,
                      lineHeight: 1.55,
                      color: 'rgba(247,248,250,0.75)',
                    }}
                  >
                    {item.body}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ ...cardBase, marginBottom: 14 }}>
          {sectionEyebrow('Why Under Review')}

          <h2
            style={{
              margin: '0 0 14px',
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: 28,
              lineHeight: 1,
              color: '#F7F8FA',
              letterSpacing: '0.03em',
            }}
          >
            Built for decisions, not dashboards
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
            }}
          >
            <div
              style={{
                borderRadius: 18,
                padding: 14,
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                style={{
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  color: 'rgba(247,248,250,0.55)',
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}
              >
                Other platforms
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                {[
                  'Build your own models',
                  'Show probabilities and raw data',
                  'Leave the final call to you',
                ].map((text) => (
                  <div
                    key={text}
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 14,
                      lineHeight: 1.45,
                      color: 'rgba(247,248,250,0.65)',
                    }}
                  >
                    {text}
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                borderRadius: 18,
                padding: 14,
                background:
                  'linear-gradient(180deg, rgba(0,245,233,0.10) 0%, rgba(255,45,107,0.08) 100%)',
                border: '1px solid rgba(0,245,233,0.22)',
              }}
            >
              <div
                style={{
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  color: '#00F5E9',
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}
              >
                Under Review
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                {[
                  'Gives you the lean immediately',
                  'Explains it with the right stats',
                  'Tells you exactly where the value is',
                ].map((text) => (
                  <div
                    key={text}
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 14,
                      lineHeight: 1.45,
                      color: '#F7F8FA',
                      fontWeight: 700,
                    }}
                  >
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section style={{ ...cardBase, marginBottom: 14 }}>
          {sectionEyebrow('UR TAKE example')}

          <h2
            style={{
              margin: '0 0 12px',
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: 28,
              lineHeight: 1,
              color: '#F7F8FA',
              letterSpacing: '0.03em',
            }}
          >
            What a real answer looks like
          </h2>

          <div
            style={{
              borderRadius: 18,
              padding: 14,
              background: '#0D1116',
              border: '1px solid rgba(0,245,233,0.18)',
            }}
          >
            <div
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 18,
                fontWeight: 800,
                color: '#F7F8FA',
                marginBottom: 12,
              }}
            >
              Sinner in 2 sets
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              {[
                '• Sinner — UNDER 22.5 games — Zverev return numbers drop off vs elite servers',
                '• Sinner — 1st set winner — wins first sets at a higher clip on hard courts',
              ].map((line) => (
                <div
                  key={line}
                  style={{
                    borderLeft: '2px solid #00F5E9',
                    paddingLeft: 12,
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: 'rgba(247,248,250,0.82)',
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>

          <p
            style={{
              marginTop: 12,
              marginBottom: 0,
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 14,
              lineHeight: 1.55,
              color: 'rgba(247,248,250,0.72)',
            }}
          >
            No fluff. Just the angle and the reason.
          </p>
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
                <div
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 16,
                    fontWeight: 800,
                    color: '#F7F8FA',
                    marginBottom: 4,
                  }}
                >
                  {matchup.title}
                </div>

                <div
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 13,
                    color: 'rgba(247,248,250,0.66)',
                    marginBottom: 8,
                  }}
                >
                  {matchup.subtitle}
                </div>

                <div
                  style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#00F5E9',
                  }}
                >
                  {matchup.angle}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section style={{ ...cardBase, marginBottom: 14 }}>
          {sectionEyebrow('Trust layer')}

          <h2
            style={{
              margin: '0 0 10px',
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: 28,
              lineHeight: 1,
              color: '#F7F8FA',
              letterSpacing: '0.03em',
            }}
          >
            Not guesses. Data-backed takes.
          </h2>

          <p
            style={{
              margin: 0,
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 15,
              lineHeight: 1.65,
              color: 'rgba(247,248,250,0.8)',
            }}
          >
            Every UR TAKE is built on player performance data, surface context, and
            matchup history—so you are not betting blind.
          </p>
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
            background:
              'linear-gradient(180deg, rgba(245,200,66,0.12) 0%, rgba(255,255,255,0.025) 100%)',
            border: '1px solid rgba(245,200,66,0.28)',
          }}
        >
          {sectionEyebrow('Miami Open 2026', '#F5C842')}

          <h2
            style={{
              margin: 0,
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: 34,
              lineHeight: 1,
              letterSpacing: '0.03em',
              color: '#F7F8FA',
            }}
          >
            MIAMI
          </h2>

          <p
            style={{
              marginTop: 10,
              marginBottom: 0,
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 15,
              lineHeight: 1.6,
              color: 'rgba(247,248,250,0.8)',
            }}
          >
            Hard-court event. Premium hold-rate and first-strike edges. Best angles
            usually show up in ace props, first-set winners, and total-games spots.
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
              {
                title: 'Ace props',
                body: 'Most playable when hold stability and short-rally profile line up.',
              },
              {
                title: 'First set winners',
                body: 'Best in lopsided serve quality matchups where early pressure is predictable.',
              },
              {
                title: 'Total games',
                body: 'Strongest when both players hold clean or one player controls pace but not breaks.',
              },
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
                <div
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 15,
                    fontWeight: 800,
                    color: '#F7F8FA',
                    marginBottom: 6,
                  }}
                >
                  {item.title}
                </div>
                <div
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: 'rgba(247,248,250,0.72)',
                  }}
                >
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
              <div
                key={player.name}
                style={{
                  borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.025)',
                  padding: 14,
                }}
              >
                <div
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 15,
                    fontWeight: 800,
                    color: '#F7F8FA',
                    marginBottom: 10,
                  }}
                >
                  {player.name}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 8,
                  }}
                >
                  {[
                    ['Elo', player.elo],
                    ['Hold%', player.hold],
                    ['DR', player.dr],
                    ['TB%', player.tb],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      style={{
                        borderRadius: 12,
                        padding: '10px 8px',
                        background: '#0D1116',
                        border: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <div
                        style={{
                          fontFamily: 'DM Mono, monospace',
                          fontSize: 10,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: 'rgba(247,248,250,0.52)',
                          marginBottom: 4,
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: 14,
                          fontWeight: 800,
                          color: '#F7F8FA',
                        }}
                      >
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
              <div
                key={player.name}
                style={{
                  borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.025)',
                  padding: 14,
                }}
              >
                <div
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 15,
                    fontWeight: 800,
                    color: '#F7F8FA',
                    marginBottom: 10,
                  }}
                >
                  {player.name}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 8,
                  }}
                >
                  {[
                    ['Elo', player.elo],
                    ['Hold%', player.hold],
                    ['DR', player.dr],
                    ['TB%', player.tb],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      style={{
                        borderRadius: 12,
                        padding: '10px 8px',
                        background: '#0D1116',
                        border: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <div
                        style={{
                          fontFamily: 'DM Mono, monospace',
                          fontSize: 10,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: 'rgba(247,248,250,0.52)',
                          marginBottom: 4,
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: 14,
                          fontWeight: 800,
                          color: '#F7F8FA',
                        }}
                      >
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
      {askBar('Ask props, matchups, or slate questions...')}

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
          background:
            'linear-gradient(180deg, rgba(0,245,233,0.08) 0%, rgba(255,45,107,0.08) 100%), rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,45,107,0.22)',
        }}
      >
        {sectionEyebrow('Pro', '#FF2D6B')}

        <h2
          style={{
            margin: 0,
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: 38,
            lineHeight: 1,
            color: '#F7F8FA',
            letterSpacing: '0.03em',
          }}
        >
          $9.99 / month
        </h2>

        <p
          style={{
            marginTop: 12,
            marginBottom: 18,
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 15,
            lineHeight: 1.6,
            color: 'rgba(247,248,250,0.82)',
          }}
        >
          Unlimited UR TAKE queries, deeper matchup cards, saved threads, and more
          premium betting intelligence.
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

      <nav
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          justifyContent: 'center',
          padding: '12px 16px 18px',
          background:
            'linear-gradient(180deg, rgba(8,10,12,0) 0%, rgba(8,10,12,0.86) 28%, rgba(8,10,12,0.98) 100%)',
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
