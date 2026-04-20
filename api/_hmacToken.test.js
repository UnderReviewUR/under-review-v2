import test from "node:test";
import assert from "node:assert/strict";
import { signToken, verifyToken } from "./_hmacToken.js";

test("signToken + verifyToken roundtrip", () => {
  const secret = "test-secret-key-for-unit-tests";
  const payload = { tier: "friend", code: "abc", issuedAt: "2026-01-01T00:00:00.000Z", expiresAt: null };
  const tok = signToken(payload, secret);
  const out = verifyToken(tok, secret);
  assert.deepEqual(out, payload);
});

test("verifyToken rejects tampered signature", () => {
  const secret = "a";
  const tok = signToken({ x: 1 }, secret);
  const bad = tok.slice(0, -4) + "ffff";
  assert.equal(verifyToken(bad, secret), null);
});

test("verifyToken rejects wrong secret", () => {
  const tok = signToken({ x: 1 }, "s1");
  assert.equal(verifyToken(tok, "s2"), null);
});

test("verifyToken returns null for malformed token (no dot)", () => {
  assert.equal(verifyToken("not-a-valid-token-format", "secret"), null);
});

test("verifyToken returns null for odd-length hex signature", () => {
  const secret = "secret";
  const payload = { a: 1 };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64");
  const badSig = "abc";
  assert.equal(verifyToken(`${data}.${badSig}`, secret), null);
});

test("verifyToken returns null for garbage after dot", () => {
  const data = Buffer.from(JSON.stringify({ x: 1 })).toString("base64");
  assert.equal(verifyToken(`${data}.nothexnothex`, "secret"), null);
});
