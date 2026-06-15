import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldResetWorldCupBrowseHome } from "./wcBrowseHomeNav.js";

test("shouldResetWorldCupBrowseHome when already on WC with active chat and no deep nav", () => {
  assert.equal(
    shouldResetWorldCupBrowseHome({ alreadyOnWc: true, wcMsgCount: 2, nav: null }),
    true,
  );
});

test("shouldResetWorldCupBrowseHome false when navigating to a match sub-tab", () => {
  assert.equal(
    shouldResetWorldCupBrowseHome({
      alreadyOnWc: true,
      wcMsgCount: 2,
      nav: { mainTab: "matches", matchSubTab: "today" },
    }),
    false,
  );
});

test("shouldResetWorldCupBrowseHome false when not yet on WC tab", () => {
  assert.equal(
    shouldResetWorldCupBrowseHome({ alreadyOnWc: false, wcMsgCount: 2, nav: null }),
    false,
  );
});
