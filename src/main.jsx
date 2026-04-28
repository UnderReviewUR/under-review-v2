import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

try {
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} catch {
  document.getElementById("root").innerHTML =
    '<div style="padding:40px;color:white;' +
    'font-family:monospace;background:#050507;">' +
    "Something went wrong. Please refresh.</div>";
}
