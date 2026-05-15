/**
 * Central coercion for values that may end up in React text nodes or string props.
 * Keeps JSX boundaries predictable (no object/symbol/function children).
 */
export function textOrEmpty(value, max = 500) {
  if (value == null) return "";
  if (typeof value === "string") return value.slice(0, max);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "bigint") return String(value).slice(0, max);
  if (typeof value === "symbol" || typeof value === "function") return "";
  try {
    return String(value).slice(0, max);
  } catch {
    return "";
  }
}

export function renderableArray(value) {
  return Array.isArray(value) ? value : [];
}

/** True if `v` is safe as a single React text child (primitive string/number/boolean or nullish). */
export function isReactTextChildSafe(v) {
  if (v == null) return true;
  const t = typeof v;
  return t === "string" || t === "number" || t === "boolean";
}

function valueKind(v) {
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  const t = typeof v;
  if (t === "object") {
    if (Array.isArray(v)) return `array(len=${v.length})`;
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? "Date(invalid)" : "Date(ok)";
    try {
      const keys = Object.keys(v);
      return `object(keys=${keys.slice(0, 12).join(",")}${keys.length > 12 ? "…" : ""})`;
    } catch {
      return "object";
    }
  }
  return t;
}

function pushIssue(out, index, m, path, v) {
  out.push({
    index,
    msgId: m?.msgId ?? null,
    role: m?.role ?? null,
    path,
    kind: valueKind(v),
  });
}

/**
 * Collect paths in UR Take chat rows where values are not safe as React text children.
 * Used in dev before `ChatThread` renders and in regression tests.
 */
export function collectUrTakeMsgsRenderIssues(msgs) {
  const issues = [];
  if (!Array.isArray(msgs)) return issues;

  msgs.forEach((m, index) => {
    if (m != null && typeof m !== "object") {
      pushIssue(issues, index, {}, "<row>", m);
      return;
    }
    if (m == null) {
      pushIssue(issues, index, m, "<row>", m);
      return;
    }

    ["text", "deepText", "sport", "msgId", "liveScore"].forEach((k) => {
      if (!(k in m)) return;
      const v = m[k];
      if (v == null) return;
      if (!isReactTextChildSafe(v)) pushIssue(issues, index, m, k, v);
    });

    if (Array.isArray(m.followUps)) {
      m.followUps.forEach((fu, j) => {
        if (fu != null && !isReactTextChildSafe(fu)) {
          pushIssue(issues, index, m, `followUps[${j}]`, fu);
        }
      });
    } else if (m.followUps != null && typeof m.followUps !== "undefined") {
      pushIssue(issues, index, m, "followUps", m.followUps);
    }

    const st = m.structured;
    if (st != null && typeof st === "object") {
      if (st.timestamp != null && typeof st.timestamp !== "number" && typeof st.timestamp !== "string") {
        pushIssue(issues, index, m, "structured.timestamp", st.timestamp);
      }
      ["sport", "call", "whyNow", "edge", "confidence", "callType", "parlayTotalOdds"].forEach((k) => {
        if (!(k in st)) return;
        const v = st[k];
        if (v == null) return;
        if (!isReactTextChildSafe(v)) pushIssue(issues, index, m, `structured.${k}`, v);
      });
      if (Array.isArray(st.caveats)) {
        st.caveats.forEach((c, j) => {
          if (c != null && !isReactTextChildSafe(c)) {
            pushIssue(issues, index, m, `structured.caveats[${j}]`, c);
          }
        });
      } else if (st.caveats != null) {
        pushIssue(issues, index, m, "structured.caveats", st.caveats);
      }
      if (Array.isArray(st.parlayLegs)) {
        st.parlayLegs.forEach((leg, j) => {
          if (!leg || typeof leg !== "object") {
            pushIssue(issues, index, m, `structured.parlayLegs[${j}]`, leg);
            return;
          }
          ["play", "rationale", "odds"].forEach((lk) => {
            if (!(lk in leg)) return;
            const v = leg[lk];
            if (v == null) return;
            if (!isReactTextChildSafe(v)) {
              pushIssue(issues, index, m, `structured.parlayLegs[${j}].${lk}`, v);
            }
          });
        });
      } else if (st.parlayLegs != null) {
        pushIssue(issues, index, m, "structured.parlayLegs", st.parlayLegs);
      }
    }

    const ee = m.estimatedEdge;
    if (ee != null && typeof ee === "object") {
      if (Array.isArray(ee.drivers)) {
        ee.drivers.forEach((d, j) => {
          if (d != null && !isReactTextChildSafe(d)) {
            pushIssue(issues, index, m, `estimatedEdge.drivers[${j}]`, d);
          }
        });
      }
    }

    const tm = m.takeMeta;
    if (tm != null && typeof tm === "object" && tm.trust && typeof tm.trust === "object") {
      const cq = tm.trust.contextQuality;
      if (cq != null && !isReactTextChildSafe(cq)) {
        pushIssue(issues, index, m, "takeMeta.trust.contextQuality", cq);
      }
    }
  });

  return issues;
}

/**
 * Dev-only: walk UR Take chat rows and nested payload slices; log paths where values are
 * not safe as React text children (the usual “invalid child” crash sources).
 */
export function logUrTakeMsgsRenderDiagnostics(msgs) {
  if (typeof import.meta === "undefined" || !import.meta.env?.DEV) return;
  const issues = collectUrTakeMsgsRenderIssues(msgs);
  if (issues.length) {
    console.warn("[urTakeRenderDiagnostics] non-text-safe values before ChatThread", issues);
  }
}

/** Saved-take list rows (retention strip) — same text-child rules as chat. */
export function collectSavedTakeRowIssues(savedTakes) {
  const issues = [];
  if (!Array.isArray(savedTakes)) return issues;
  savedTakes.forEach((t, index) => {
    if (!t || typeof t !== "object") {
      issues.push({ index, path: "<row>", kind: valueKind(t), id: null });
      return;
    }
    ["sport", "headlineSnippet"].forEach((k) => {
      if (!(k in t)) return;
      const v = t[k];
      if (v == null) return;
      if (!isReactTextChildSafe(v)) {
        issues.push({ index, path: k, kind: valueKind(v), id: t.id ?? null });
      }
    });
  });
  return issues;
}

export function logSavedTakesRenderDiagnostics(savedTakes) {
  if (typeof import.meta === "undefined" || !import.meta.env?.DEV) return;
  const issues = collectSavedTakeRowIssues(savedTakes);
  if (issues.length) {
    console.warn("[urTakeRenderDiagnostics] non-text-safe saved take rows", issues);
  }
}

/** Dev-only: one-line fingerprint when `/api/ur-take` JSON lands (before React state). */
export function logUrTakeApiEnvelopeDev(data) {
  if (typeof import.meta === "undefined" || !import.meta.env?.DEV) return;
  if (!data || typeof data !== "object") return;
  const structured = data.structured;
  let structuredKeys = [];
  if (structured && typeof structured === "object") {
    try {
      structuredKeys = Object.keys(structured).slice(0, 36);
    } catch {
      structuredKeys = ["<unreadable>"];
    }
  }
  console.log("[urTakeApiEnvelope]", {
    topKeys: Object.keys(data).slice(0, 40),
    sport: data.sport,
    structuredPresent: Boolean(structured && typeof structured === "object"),
    structuredKeys,
    followUps: Array.isArray(data.followUps) ? `array(${data.followUps.length})` : typeof data.followUps,
    estimatedEdge: data.estimatedEdge == null ? "null" : typeof data.estimatedEdge,
    takePresent: Boolean(data.take && typeof data.take === "object"),
  });
}
