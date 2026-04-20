// api/_hmacToken.js — shared HMAC token sign/verify (access, pro-status, UR TAKE auth).
import crypto from "crypto";

export function signToken(payload, secret) {
  const data = JSON.stringify(payload);
  const sig = crypto.createHmac("sha256", secret).update(data).digest("hex");
  return Buffer.from(data).toString("base64") + "." + sig;
}

export function verifyToken(token, secret) {
  try {
    const [b64, sig] = String(token || "").split(".");
    if (!b64 || !sig) return null;
    const data = Buffer.from(b64, "base64").toString();
    const expected = crypto.createHmac("sha256", secret).update(data).digest("hex");
    const sigBuf = Buffer.from(sig, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}
