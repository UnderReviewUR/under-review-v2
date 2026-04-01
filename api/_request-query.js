function getBaseUrl(req) {
  const host = req?.headers?.host || "localhost";
  const proto = req?.headers?.["x-forwarded-proto"] || "https";
  return `${proto}://${host}`;
}

export function getQueryParam(req, key, fallback = "") {
  try {
    const url = new URL(req?.url || "/", getBaseUrl(req));
    const value = url.searchParams.get(key);
    return value == null ? fallback : value;
  } catch {
    return fallback;
  }
}
