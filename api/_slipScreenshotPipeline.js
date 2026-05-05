/**
 * Two-pass vision pipeline for betting-slip screenshots:
 * Pass 1 — segment/count cards (inventory only, no betting analysis).
 * Pass 2 — structured extraction per card + validation before downstream UR Take analysis.
 */

/** @typedef {{ type: string, text?: string, source?: object }} AnthropicContentBlock */

/**
 * @param {string} raw
 * @returns {object|null}
 */
export function parseJsonFromModelText(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const inner = fence ? fence[1].trim() : s;
  try {
    return JSON.parse(inner);
  } catch {
    return null;
  }
}

/**
 * @param {object} resultData - Anthropic message response body (top-level `content` array)
 */
export function extractAnthropicMessageText(resultData) {
  const blocks = resultData?.content;
  if (!Array.isArray(blocks)) return "";
  return blocks
    .filter((b) => b && b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/**
 * @param {object} inventory
 * @param {object} extraction
 * @returns {{ ok: boolean, warnings: string[] }}
 */
export function validateSlipCounts(inventory, extraction) {
  const warnings = [];
  const n = Number(inventory?.detectedCardCount);
  const slips = Array.isArray(extraction?.slips) ? extraction.slips : [];
  if (!Number.isFinite(n) || n < 1) {
    warnings.push("inventory.detectedCardCount missing or invalid");
    return { ok: false, warnings };
  }
  if (slips.length !== n) {
    warnings.push(
      `extracted slips (${slips.length}) !== detectedCardCount (${n}) — reconciliation required`,
    );
    return { ok: false, warnings };
  }
  return { ok: true, warnings };
}

const PASS1_SYSTEM = `You are a vision assistant for mobile betting-app screenshots (Underdog, PrizePicks, sportsbooks).
PASS 1 — VISUAL INVENTORY ONLY.

Rules:
- Identify EVERY distinct bet leg/card/row visible in the screenshot from TOP to BOTTOM.
- A parlay with multiple players stacked vertically = multiple cards/legs — count each one.
- Scroll-cropped images: count only what is visible; do not invent legs below the fold.
- Do NOT analyze betting merit, edges, or correlations.
- Do NOT output prose outside JSON.

Return ONLY valid JSON with this exact shape:
{
  "detectedCardCount": <positive integer>,
  "cards": [
    {
      "index": <1-based index, top to bottom>,
      "verticalBand": "top" | "upper" | "middle" | "lower" | "bottom",
      "shortDescriptor": "<8 words max — e.g. player surname + stat type visible>"
    }
  ]
}

The length of "cards" MUST equal "detectedCardCount".`;

const PASS2_SYSTEM = `You are a vision assistant for betting slip screenshots.
PASS 2 — STRUCTURED EXTRACTION ONLY (no betting analysis).

You receive:
1) The same screenshot.
2) Pass-1 inventory JSON (authoritative leg count and order).

Rules:
- Produce EXACTLY detectedCardCount entries in "slips", index 1..N matching top-to-bottom order.
- For each slip extract every visible field; if unreadable, still include the slip with readability "unclear" and rawVisibleText best-effort.
- Do NOT omit a slip because it is blurry — use readability "unclear".
- If confidence in a field is low, set confidence "low" and/or readability "unclear"; never fabricate numbers.
- If ANY critical text is too blurry to read reliably, set "needsUserCrop": true and explain in needsUserCropReason (single sentence).
- Do NOT output prose outside JSON.

Return ONLY valid JSON:
{
  "slips": [
    {
      "index": <int>,
      "playerOrTeam": <string|null>,
      "marketStat": <string|null>,
      "line": <string|number|null>,
      "side": "Higher"|"Lower"|"Over"|"Under"|"unknown"|null,
      "oddsOrPrice": <string|null>,
      "readability": "clear" | "unclear",
      "confidence": "high" | "medium" | "low",
      "rawVisibleText": <string>
    }
  ],
  "needsUserCrop": <boolean>,
  "needsUserCropReason": <string|null>
}

slips.length MUST equal inventory.detectedCardCount from the user message.`;

function buildImageUserContent(image, textBeforeImage) {
  const mediaType = image.mediaType || "image/png";
  const base64 = image.base64;
  return [
    { type: "text", text: textBeforeImage },
    {
      type: "image",
      source: { type: "base64", media_type: mediaType, data: base64 },
    },
  ];
}

/**
 * @param {{
 *   apiKey: string,
 *   model: string,
 *   image: { base64: string, mediaType?: string },
 *   callAnthropic: Function,
 *   slipRouteVia?: "explicit" | "keywords" | "vague" | null,
 * }} opts
 */
export async function runSlipScreenshotPipeline(opts) {
  const { apiKey, model, image, callAnthropic, slipRouteVia = null } = opts;
  if (!image?.base64) {
    return {
      ok: false,
      error: "no_image",
      inventory: null,
      extraction: null,
      validation: { ok: false, warnings: ["missing image"] },
      augmentationText: "",
    };
  }

  const pass1User = `Pass 1 task: produce the inventory JSON only.`;
  const pass1 = await callAnthropic({
    apiKey,
    model,
    system: PASS1_SYSTEM,
    messages: [{ role: "user", content: buildImageUserContent(image, pass1User) }],
    temperature: 0.1,
    max_tokens: 2048,
  });

  if (!pass1.ok) {
    return {
      ok: false,
      error: "pass1_upstream",
      inventory: null,
      extraction: null,
      validation: { ok: false, warnings: ["pass 1 vision request failed"] },
      augmentationText: "",
      upstream: pass1,
    };
  }

  const invText = extractAnthropicMessageText(pass1.data);
  const inventory = parseJsonFromModelText(invText);
  if (!inventory || typeof inventory.detectedCardCount !== "number") {
    return {
      ok: false,
      error: "pass1_parse",
      inventory: null,
      extraction: null,
      validation: { ok: false, warnings: ["failed to parse pass 1 JSON"] },
      augmentationText: "",
      rawPass1: invText?.slice(0, 800),
      slipRouteVia,
    };
  }

  /** Vague caption + non-slip photo — inventory decides before spending pass 2. */
  if (slipRouteVia === "vague" && Number(inventory.detectedCardCount) < 1) {
    return {
      ok: false,
      error: "vague_no_betting_ui",
      inventory,
      extraction: null,
      validation: { ok: false, warnings: ["pass 1: no betting cards detected for vague upload"] },
      augmentationText: "",
      slipRouteVia,
    };
  }

  let extraction = null;
  let pass2Attempts = 0;
  let lastPass2Raw = "";

  for (let attempt = 0; attempt < 2; attempt++) {
    pass2Attempts = attempt + 1;
    const retryHint =
      attempt === 0
        ? ""
        : `\n\nCRITICAL FIX: Your previous extraction had the wrong number of slips. inventory.detectedCardCount is ${inventory.detectedCardCount}. Return slips array with EXACTLY that many objects, indices 1..${inventory.detectedCardCount}, top-to-bottom order. No omissions.`;

    const pass2UserText = `Pass 1 inventory (authoritative leg count):\n${JSON.stringify(inventory, null, 2)}\n\nPass 2 task: extract structured slips matching every card.${retryHint}`;

    const pass2 = await callAnthropic({
      apiKey,
      model,
      system: PASS2_SYSTEM,
      messages: [{ role: "user", content: buildImageUserContent(image, pass2UserText) }],
      temperature: 0.1,
      max_tokens: 8192,
    });

    if (!pass2.ok) {
      return {
        ok: false,
        error: "pass2_upstream",
        inventory,
        extraction: null,
        validation: { ok: false, warnings: ["pass 2 vision request failed"] },
        augmentationText: buildPartialAugmentation(inventory, null, {
          ok: false,
          warnings: ["pass 2 failed"],
        }),
        upstream: pass2,
      };
    }

    lastPass2Raw = extractAnthropicMessageText(pass2.data);
    extraction = parseJsonFromModelText(lastPass2Raw);
    const slips = extraction?.slips;
    const countOk =
      Array.isArray(slips) && slips.length === Number(inventory.detectedCardCount);
    if (countOk) break;
  }

  const validation = validateSlipCounts(inventory, extraction || {});
  const augmentationText = buildSlipVisionAugmentationText({
    inventory,
    extraction,
    validation,
    needsUserCrop: Boolean(extraction?.needsUserCrop),
    needsUserCropReason: extraction?.needsUserCropReason || null,
    pass2Attempts,
  });

  return {
    ok: validation.ok && Boolean(extraction),
    inventory,
    extraction,
    validation,
    augmentationText,
    needsUserCrop: Boolean(extraction?.needsUserCrop),
    pass2Attempts,
    rawPass2Preview: lastPass2Raw?.slice(0, 1200),
    slipRouteVia,
  };
}

function buildPartialAugmentation(inventory, extraction, validation) {
  return buildSlipVisionAugmentationText({
    inventory,
    extraction,
    validation,
    needsUserCrop: false,
    needsUserCropReason: null,
    pass2Attempts: 0,
  });
}

/**
 * Human-readable block prepended to the main UR Take user prompt (after extraction).
 */
export function buildSlipVisionAugmentationText({
  inventory,
  extraction,
  validation,
  needsUserCrop,
  needsUserCropReason,
  pass2Attempts,
}) {
  const lines = [];
  lines.push("════════════════════════════════════════");
  lines.push("DETERMINISTIC SLIP VISION — READ BEFORE ANALYSIS");
  lines.push("════════════════════════════════════════");
  lines.push("");
  lines.push("Rules:");
  lines.push("- Do NOT re-count legs by eye alone from the image. Treat the JSON below as the authoritative slip list.");
  lines.push("- Your analysis MUST cover EVERY slip row below (same count as detectedCardCount).");
  lines.push("- If validation failed or a slip is unclear, say so in UNCERTAIN / MISSING — never silently drop legs.");
  lines.push("- Never claim there is only one leg/card when detectedCardCount > 1.");
  lines.push("- If needsUserCrop is true, tell the user to crop/zoom once; still analyze what is readable.");
  lines.push("- Do NOT output OPENING TAKE / SLIP VERDICT until you have acknowledged every extracted slip index.");
  lines.push(`- Pass-2 attempts used: ${pass2Attempts}`);
  lines.push("");
  lines.push("PASS 1 — INVENTORY JSON:");
  lines.push(JSON.stringify(inventory ?? {}, null, 2));
  lines.push("");
  lines.push("PASS 2 — EXTRACTION JSON:");
  lines.push(JSON.stringify(extraction ?? {}, null, 2));
  lines.push("");
  lines.push(
    `VALIDATION: ${validation?.ok ? "OK — slip count matches inventory." : "WARNING — count mismatch or parse issue."}`,
  );
  if (validation?.warnings?.length) {
    lines.push(`Warnings: ${validation.warnings.join(" | ")}`);
  }
  lines.push("");
  lines.push(`needsUserCrop: ${needsUserCrop ? "true" : "false"}`);
  if (needsUserCrop && needsUserCropReason) {
    lines.push(`needsUserCropReason: ${needsUserCropReason}`);
  }
  lines.push("════════════════════════════════════════");
  return lines.join("\n");
}
