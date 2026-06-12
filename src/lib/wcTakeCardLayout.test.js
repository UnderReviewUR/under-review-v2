import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveWcTakeCardDisplayMode,
  wcCallTypeUsesCompactCard,
  wcTakeCardIsCollapsed,
  wcTakeCardUsesFocusLayout,
} from "./wcTakeCardLayout.js";

const groupSlate = {
  sport: "worldcup",
  callType: "group_slate",
  lean: "Lean: Paraguay to advance in Group D.",
};

test("wcCallTypeUsesCompactCard — group slate is compact-eligible", () => {
  assert.equal(wcCallTypeUsesCompactCard("group_slate"), true);
  assert.equal(wcCallTypeUsesCompactCard("rules"), false);
});

test("resolveWcTakeCardDisplayMode — docked latest WC card is compact", () => {
  const msgs = [
    { role: "user", text: "Best group value?" },
    { role: "ai", text: "Lean: Paraguay", loading: false },
  ];
  assert.equal(
    resolveWcTakeCardDisplayMode(groupSlate, {
      docked: true,
      msgs,
      msgIndex: 1,
      message: msgs[1],
    }),
    "compact",
  );
  assert.equal(wcTakeCardUsesFocusLayout("compact"), true);
});

test("resolveWcTakeCardDisplayMode — older AI turns collapse in dock", () => {
  const msgs = [
    { role: "user", text: "First?" },
    { role: "ai", text: "Lean: first", loading: false },
    { role: "user", text: "Runner-up?" },
    { role: "ai", text: "Lean: second", loading: false },
  ];
  const mode = resolveWcTakeCardDisplayMode(groupSlate, {
    docked: true,
    msgs,
    msgIndex: 1,
    message: msgs[1],
  });
  assert.equal(mode, "collapsed");
  assert.equal(wcTakeCardIsCollapsed(mode), true);
});
