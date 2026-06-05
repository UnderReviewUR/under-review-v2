/**
 * Reject non-allowed HTTP methods with 405.
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse} res
 * @param {string[]} [allowed] — defaults to ["GET"]
 * @returns {boolean} true if the method is allowed, false if the request was rejected
 */
export function allowMethods(req, res, allowed = ["GET"]) {
  if (allowed.includes(req.method)) return true;
  res.status(405).json({ error: "Method not allowed" });
  return false;
}
