import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App.jsx";
import { clerkPublishableKey } from "./clerkEnv.js";

const pk = String(clerkPublishableKey || "").trim();

function Root() {
  const inner = <App />;
  if (!pk) {
    return (
      <StrictMode>
        {inner}
        <Analytics />
      </StrictMode>
    );
  }
  return (
    <StrictMode>
      <ClerkProvider publishableKey={pk}>{inner}</ClerkProvider>
      <Analytics />
    </StrictMode>
  );
}

try {
  createRoot(document.getElementById("root")).render(<Root />);
} catch {
  document.getElementById("root").innerHTML =
    '<div style="padding:40px;color:white;' +
    'font-family:monospace;background:#050507;">' +
    "Something went wrong. Please refresh.</div>";
}
