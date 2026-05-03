/**
 * Clerk server client + JWT verification for API routes.
 * Set CLERK_SECRET_KEY (and VITE_CLERK_PUBLISHABLE_KEY on the client) to enable.
 */
import { createClerkClient, verifyToken } from "@clerk/backend";
import { getEnv } from "./_env.js";

let _client = null;

export function isClerkSecretConfigured() {
  return Boolean(getEnv("CLERK_SECRET_KEY"));
}

export function getClerkBackendClient() {
  const sk = getEnv("CLERK_SECRET_KEY");
  if (!sk) return null;
  if (!_client) {
    _client = createClerkClient({ secretKey: sk });
  }
  return _client;
}

/**
 * @param {string | undefined} authHeader e.g. "Bearer <jwt>"
 * @returns {Promise<string | null>} Clerk user id (`sub`) or null
 */
export async function getClerkUserIdFromAuthorizationHeader(authHeader) {
  const sk = getEnv("CLERK_SECRET_KEY");
  if (!sk || !authHeader || !String(authHeader).startsWith("Bearer ")) return null;
  const token = String(authHeader).slice(7).trim();
  if (!token) return null;
  try {
    const payload = await verifyToken(token, { secretKey: sk });
    return payload.sub || null;
  } catch (e) {
    console.error("[clerk] verifyToken failed:", e?.message || e);
    return null;
  }
}
