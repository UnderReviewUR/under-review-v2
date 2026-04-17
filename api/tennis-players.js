import { applyCors } from "./_cors.js";
import surfaces from "../data/tennis/surfaces.js";
import atp from "../data/tennis/atp.js";
import wta from "../data/tennis/wta.js";
import expanded from "../data/tennis/expanded.js";

export default function handler(req, res) {
  if (!applyCors(req, res)) return;
  const mergedAtp = { ...(expanded?.atp || {}), ...(atp || {}) };
  const mergedWta = { ...(expanded?.wta || {}), ...(wta || {}) };

  return res.status(200).json({
    surfaces,
    atp: mergedAtp,
    wta: mergedWta,
    expandedMeta: {
      updatedAt: expanded?.updatedAt || null,
      atpExtra: Object.keys(expanded?.atp || {}).length,
      wtaExtra: Object.keys(expanded?.wta || {}).length,
    },
  });
}
