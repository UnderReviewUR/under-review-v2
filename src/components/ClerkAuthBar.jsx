import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";

/**
 * Header account controls — only render when inside ClerkProvider (main.jsx gates this).
 */
export default function ClerkAuthBar() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <SignedOut>
        <SignInButton mode="modal">
          <button
            type="button"
            style={{
              fontFamily: "var(--mono-font)",
              fontSize: 10,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: "var(--cyan-bright)",
              background: "rgba(0,245,233,0.08)",
              border: "1px solid rgba(0,245,233,0.25)",
              borderRadius: 8,
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            Sign in
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: { width: 28, height: 28 } } }} />
      </SignedIn>
    </div>
  );
}
