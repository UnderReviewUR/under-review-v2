/** True when VITE_CLERK_PUBLISHABLE_KEY is set (ClerkProvider wraps the app in main.jsx). */
export const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";
export const isClerkEnabled = Boolean(String(clerkPublishableKey).trim());
