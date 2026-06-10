import { buildWcCrossGroupValuePrebuiltStructured } from "../shared/wcGroupComposition.js";
import {
  buildWcCompactStructured,
  formatWcCompactDisplayText,
} from "../shared/wcUrTakeCompactDelivery.js";
import { normalizeWcStructuredForDelivery } from "../shared/wcUrTakeStructured.js";
import { WC_INTENT } from "../shared/wcUrTakeIntent.js";

const q =
  "What's the best group-stage value bet right now — one pick, direct answer?";
const pre = buildWcCrossGroupValuePrebuiltStructured({ question: q });
const compact = buildWcCompactStructured({
  question: q,
  wcIntent: WC_INTENT.STRUCTURAL,
  summary: pre.lean,
  deep: "",
  structuredSeed: pre,
});
const norm = normalizeWcStructuredForDelivery(compact, WC_INTENT.STRUCTURAL, q);
const text = formatWcCompactDisplayText(norm, "");
console.log(
  JSON.stringify(
    {
      preCallType: pre?.callType,
      compactCallType: compact?.callType,
      normCallType: norm?.callType,
      responseText: text,
    },
    null,
    2,
  ),
);
