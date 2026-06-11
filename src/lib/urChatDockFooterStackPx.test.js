import assert from "node:assert/strict";
import test from "node:test";
import { measureUrChatDockFooterStackPx } from "./urChatDockFooterStackPx.js";

test("measureUrChatDockFooterStackPx returns visualViewport bottom minus dock top", () => {
  const originalDocument = global.document;
  const originalWindow = global.window;

  global.window = {
    innerHeight: 800,
    visualViewport: { offsetTop: 0, height: 740 },
  };
  global.document = {
    querySelector: () => ({
      getBoundingClientRect: () => ({ top: 580, height: 120 }),
    }),
  };

  try {
    assert.equal(measureUrChatDockFooterStackPx(), 160);
  } finally {
    global.document = originalDocument;
    global.window = originalWindow;
  }
});

test("measureUrChatDockFooterStackPx returns 0 when dock is absent", () => {
  const originalDocument = global.document;
  global.document = { querySelector: () => null };
  try {
    assert.equal(measureUrChatDockFooterStackPx(), 0);
  } finally {
    global.document = originalDocument;
  }
});
