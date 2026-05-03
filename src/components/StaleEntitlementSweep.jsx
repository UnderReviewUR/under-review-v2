import { useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";

/**
 * Clears cached Pro token when the user is signed out so localStorage cannot act as authority alone.
 */
export default function StaleEntitlementSweep({ setAccessTier, setAccessToken }) {
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn !== false) return;
    try {
      localStorage.removeItem("ur_access_token");
    } catch {
      /* ignore */
    }
    setAccessTier("free");
    setAccessToken("");
  }, [isLoaded, isSignedIn, setAccessTier, setAccessToken]);

  return null;
}
