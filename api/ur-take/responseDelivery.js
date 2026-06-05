import { attachFreeQuotaMirrorToUrTakeResponse } from "../_gateQuota.js";

/**
 * Attach free-tier quota mirror fields and return the Express JSON response.
 * Caller should set gateQuotaDelivered = true when this completes a user-visible take.
 */
export async function sendUrTakeJson(res, body, quotaIds) {
  await attachFreeQuotaMirrorToUrTakeResponse(body, quotaIds);
  return res.status(200).json(body);
}
