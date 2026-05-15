import { Component, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./App.jsx";
import { logUrBuildFingerprint } from "./lib/urBuildFingerprint.js";

logUrBuildFingerprint();

class RootErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError() {
    return { error: true };
  }

  componentDidCatch(err, info) {
    console.error("[RootErrorBoundary]", err, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100dvh",
            padding: 28,
            background: "#080a0c",
            color: "#e8eaf0",
            fontFamily: "system-ui,sans-serif",
            lineHeight: 1.55,
          }}
        >
          <p style={{ fontWeight: 700, marginBottom: 12 }}>Something broke in the app shell.</p>
          <p style={{ opacity: 0.85, marginBottom: 20 }}>Refresh the page. If this keeps happening, try another browser tab.</p>
          <button
            type="button"
            style={{
              padding: "12px 18px",
              borderRadius: 10,
              border: "none",
              background: "#00f5e9",
              color: "#080a0c",
              fontWeight: 700,
              cursor: "pointer",
            }}
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

try {
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
      <Analytics />
    </StrictMode>,
  );
} catch {
  document.getElementById("root").innerHTML =
    '<div style="padding:40px;color:white;' +
    'font-family:monospace;background:#050507;">' +
    "Something went wrong. Please refresh.</div>";
}
