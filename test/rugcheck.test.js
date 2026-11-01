import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRugCheck } from "../src/services/rugcheck.js";

test("normalizes RugCheck summary and nested detailed report fields", () => {
  const result = normalizeRugCheck({
    score_normalised: 12,
    lpLockedPct: 92,
    risks: [],
    token: { mintAuthority: null, freezeAuthority: null },
    topHolders: [{ pct: 14.5 }]
  });
  assert.equal(result.score, 12);
  assert.equal(result.lpLockedPct, 92);
  assert.equal(result.topHolderPct, 14.5);
  assert.equal(result.mintAuthority, false);
  assert.equal(result.freezeAuthority, false);
  assert.deepEqual(result.risks, []);
});

test("does not treat missing authority or score as safe evidence", () => {
  const result = normalizeRugCheck({ risks: [] });
  assert.equal(result.score, null);
  assert.equal(result.mintAuthority, undefined);
  assert.equal(result.freezeAuthority, undefined);
  assert.equal(result.topHolderPct, null);
});

test("keeps an active authority enabled", () => {
  const result = normalizeRugCheck({
    risks: [],
    token: { mintAuthority: "SomeAuthority", freezeAuthority: null }
  });
  assert.equal(result.mintAuthority, "SomeAuthority");
  assert.equal(result.freezeAuthority, false);
});
