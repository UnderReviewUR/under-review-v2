/**
 * Client-side structured UR Take UI flag.
 * Enable with VITE_STRUCTURED_UR_TAKE=1 or REACT_APP_STRUCTURED_UR_TAKE=1 (see vite.config envPrefix).
 */
export function isStructuredUrTakeUiEnabled() {
  return (
    import.meta.env.VITE_STRUCTURED_UR_TAKE === "1" ||
    import.meta.env.REACT_APP_STRUCTURED_UR_TAKE === "1"
  );
}
