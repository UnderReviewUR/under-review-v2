import { releaseGateQuota, releaseSessionQuota } from "../_gateQuota.js";

/** Release reserved quota when the handler exits without delivering a take. */
export async function releaseUrTakeGateQuotaIfNeeded(reservation, delivered) {
  if (!reservation || delivered) return;
  if (reservation.kind === "session") {
    await releaseSessionQuota(reservation.id, reservation.reservationTs);
  } else {
    await releaseGateQuota(reservation.id, reservation.reservationTs);
  }
}
