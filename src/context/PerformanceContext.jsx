import { createContext, useContext } from "react";

export const PerformanceContext = createContext(null);

export function usePerformanceContext() {
  return useContext(PerformanceContext);
}
