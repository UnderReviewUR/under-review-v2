const homePositioningSection = (
  <div style={{ padding: '20px 16px 8px' }}>
    {/* HERO */}
    <section
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 24,
        padding: '24px 20px',
        background:
          'linear-gradient(180deg, rgba(0,245,233,0.08) 0%, rgba(255,45,107,0.06) 100%), rgba(255,255,255,0.03)',
        border: '1px solid rgba(0,245,233,0.18)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.02) inset',
        marginBottom: 18,
      }}
    >
      <div
        style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: 11,
          letterSpacing: '0.18em',
          color: '#00F5E9',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        Betting intelligence, without the extra work
      </div>

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
          lineHeight: 1.5,
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
          onClick={() => {
            setActiveTab('ASK');
          }}
        >
          Ask a question
        </button>

        <button
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
          onClick={() => {
            const prompt = "What are today’s best angles?";
            setMessages((prev) => [...prev, { role: 'user', content: prompt }]);
            handleAsk(prompt);
            setActiveTab('ASK');
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

    {/* WHAT THIS IS */}
    <section
      style={{
        borderRadius: 22,
        padding: '18px 16px',
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.06)',
        marginBottom: 14,
      }}
    >
      <div
        style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: 11,
          letterSpacing: '0.16em',
          color: '#00F5E9',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        What this is
      </div>

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

    {/* HOW IT WORKS */}
    <section
      style={{
        borderRadius: 22,
        padding: '18px 16px',
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.06)',
        marginBottom: 14,
      }}
    >
      <div
        style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: 11,
          letterSpacing: '0.16em',
          color: '#00F5E9',
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        How it works
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {[
          {
            num: '01',
            title: 'Ask anything',
            body: 'Props, matchups, slates—whatever you’re looking at.',
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

    {/* DIFFERENTIATION */}
    <section
      style={{
        borderRadius: 22,
        padding: '18px 16px',
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.06)',
        marginBottom: 14,
      }}
    >
      <div
        style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: 11,
          letterSpacing: '0.16em',
          color: '#00F5E9',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        Why Under Review
      </div>

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

    {/* EXAMPLE */}
    <section
      style={{
        borderRadius: 22,
        padding: '18px 16px',
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.06)',
        marginBottom: 14,
      }}
    >
      <div
        style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: 11,
          letterSpacing: '0.16em',
          color: '#00F5E9',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        UR TAKE example
      </div>

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

        <div
          style={{
            display: 'grid',
            gap: 10,
          }}
        >
          {[
            '• Sinner — UNDER 22.5 games — Zverev’s return numbers drop off vs elite servers',
            '• Sinner — 1st set winner — wins 68% of first sets on hard courts in 2026',
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

    {/* TRUST */}
    <section
      style={{
        borderRadius: 22,
        padding: '18px 16px',
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.06)',
        marginBottom: 14,
      }}
    >
      <div
        style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: 11,
          letterSpacing: '0.16em',
          color: '#00F5E9',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        Trust layer
      </div>

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
        matchup history—so you’re not betting blind.
      </p>
    </section>
  </div>
);
