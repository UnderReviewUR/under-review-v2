import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { emitWcPropsMonitoringAlert } from "./_wcPropsMonitoringAlert.js";

describe("emitWcPropsMonitoringAlert", () => {
  it("logs structured wc_props_monitoring_alert without throwing when email not configured", () => {
    const prevResend = process.env.RESEND_API_KEY;
    const prevFrom = process.env.AUTH_EMAIL_FROM;
    delete process.env.RESEND_API_KEY;
    delete process.env.AUTH_EMAIL_FROM;
    try {
      assert.doesNotThrow(() =>
        emitWcPropsMonitoringAlert({ arm: "test_arm", wcEventId: "760441" }),
      );
    } finally {
      if (prevResend !== undefined) process.env.RESEND_API_KEY = prevResend;
      if (prevFrom !== undefined) process.env.AUTH_EMAIL_FROM = prevFrom;
    }
  });
});
