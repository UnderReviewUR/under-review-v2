import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { caught: false };
  }

  static getDerivedStateFromError() {
    return { caught: true };
  }

  componentDidCatch(err, info) {
    console.error("[ErrorBoundary] Uncaught render error:", err, info?.componentStack);
  }

  render() {
    if (!this.state.caught) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg, #080A0C)",
          padding: "32px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "var(--display-font, 'Bebas Neue', sans-serif)",
            fontSize: 28,
            letterSpacing: 2,
            color: "var(--text, #E8EAF0)",
            marginBottom: 10,
          }}
        >
          Something went wrong
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--muted, #AAB3C2)",
            lineHeight: 1.6,
            marginBottom: 28,
            maxWidth: 280,
          }}
        >
          The app hit an unexpected error. Your data is fine — tap below to reload.
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: "var(--cyan-bright, #00F5E9)",
            color: "#080A0C",
            border: "none",
            borderRadius: 12,
            padding: "14px 32px",
            fontFamily: "var(--display-font, 'Bebas Neue', sans-serif)",
            fontSize: 18,
            letterSpacing: 2,
            cursor: "pointer",
          }}
        >
          Tap to retry
        </button>
      </div>
    );
  }
}
