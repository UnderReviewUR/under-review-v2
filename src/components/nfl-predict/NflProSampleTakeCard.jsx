import ProCheckoutCTA from "../ProCheckoutCTA.jsx";

const SUBSCRIBE_BTN_STYLE = {
  display: "block",
  width: "100%",
  padding: "14px 0",
  background: "#00F5E9",
  color: "#080a0c",
  fontWeight: 800,
  fontSize: 15,
  borderRadius: 10,
  textAlign: "center",
  border: "none",
  cursor: "pointer",
  letterSpacing: "0.02em",
};

/**
 * Canonical SAMPLE PRO TAKE card — Super Bowl overlay + playoff footer.
 */
export default function NflProSampleTakeCard({
  isPro = false,
  restoreProEntitlement,
  setUserEmail,
  onSubscribePro,
  showDivider = false,
}) {
  if (isPro) return null;

  const subscribeControl =
    restoreProEntitlement && setUserEmail ? (
      <ProCheckoutCTA restoreProEntitlement={restoreProEntitlement} setUserEmail={setUserEmail}>
        <span style={SUBSCRIBE_BTN_STYLE}>Subscribe to PRO →</span>
      </ProCheckoutCTA>
    ) : (
      <button type="button" onClick={onSubscribePro} style={SUBSCRIBE_BTN_STYLE}>
        Subscribe to PRO →
      </button>
    );

  return (
    <>
      {showDivider ? <div style={{ borderTop: "1px solid #2a2a2a", margin: "20px 0 0", paddingTop: 20 }} /> : null}

      <div
        style={{
          background: "#0d1f1e",
          border: "1px solid #00F5E940",
          borderRadius: 12,
          padding: 16,
          marginTop: showDivider ? 0 : 16,
          textAlign: "left",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span
            style={{
              background: "#00F5E920",
              color: "#00F5E9",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.12em",
              padding: "3px 8px",
              borderRadius: 20,
            }}
          >
            SAMPLE PRO TAKE
          </span>
          <span style={{ fontSize: 11, color: "#666" }}>NFL · Props</span>
        </div>

        <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginTop: 10 }}>
          Will Josh Allen throw over 2.5 passing TDs vs the Rams?
        </div>

        <p style={{ fontSize: 13, lineHeight: 1.6, color: "#ccc", marginTop: 8, marginBottom: 0 }}>
          Allen vs Stafford sets up as a shootout on paper — but LA&apos;s reworked secondary has been stingier in
          the red zone. Count on Josh to land two TDs max; the fireworks come between the 20s, not in the end zone.
        </p>

        <div style={{ marginTop: 10 }}>
          <span
            style={{
              display: "inline-block",
              background: "#FF2D6B20",
              color: "#FF2D6B",
              fontSize: 11,
              fontWeight: 800,
              padding: "4px 12px",
              borderRadius: 20,
            }}
          >
            LEAN: UNDER 2.5 PASS TDs
          </span>
        </div>

        <p style={{ fontSize: 12, color: "#666", marginTop: 8, marginBottom: 0 }}>
          Sub to chat with Under Review — get takes like this for NFL, NBA, MLB, tennis, F1, and golf.
        </p>

        <div style={{ marginTop: 14 }}>{subscribeControl}</div>
      </div>
    </>
  );
}
