import { createContext, useContext, useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";

const defaultCtx = { getToken: null };

export const ClerkApiContext = createContext(defaultCtx);

function ClerkApiInner({ children }) {
  const { getToken } = useAuth();
  const value = useMemo(() => ({ getToken }), [getToken]);
  return <ClerkApiContext.Provider value={value}>{children}</ClerkApiContext.Provider>;
}

/** When Clerk is disabled (no publishable key), children render without JWT — Pro APIs require Clerk in production. */
export function ClerkApiProvider({ enabled, children }) {
  if (!enabled) return children;
  return <ClerkApiInner>{children}</ClerkApiInner>;
}

export function useClerkApi() {
  return useContext(ClerkApiContext);
}
