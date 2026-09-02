/** Client abort for POST /api/ur-take — just under Vercel `maxDuration` (120s). */
export const UR_TAKE_CLIENT_ABORT_MS = 115_000;

/** Vercel function ceiling for ur-take (see vercel.json). */
export const UR_TAKE_SERVER_MAX_DURATION_MS = 120_000;
