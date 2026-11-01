import test from "node:test";
import assert from "node:assert/strict";
import { assessToken } from "../src/security/token-risk.js";
import { estimateRoundTripCostPct, getPositionSize } from "../src/risk/risk-manager.js";

const config = {
  minLiquidityUsd: 10000, minVolumeH1Usd: 1000, minTxnsH1: 15,
  maxRugScore: 25, minLpLockedPct: 80, maxTopHolderPct: 20, minScore: 80,
  maxOpenPositions: 1, maxPositionPct: 0.2, maxRoundtripCostPct: 0.05,
  estimatedSlippageBps: 100, estimatedDexFeeBps: 30, dailyDrawdownLimitPct: 0.1
};
const goodPair = { liquidity: { usd: 20000 }, volume: { h1: 5000 }, txns: { h1: { buys: 20, sells: 10 } }, priceUsd: "0.001" };
// Explicit false means the mint and freeze authorities are confirmed disabled.
const goodRug = { score: 10, lpLockedPct: 90, topHolderPct: 10, mintAuthority: false, freezeAuthority: false, risks: [] };

test("missing security report fails closed", () => {
  assert.equal(assessToken({ pair: goodPair, rug: null, config }).approved, false);
});
test("insufficient liquidity blocks candidate", () => {
  const result = assessToken({ pair: { ...goodPair, liquidity: { usd: 1 } }, rug: goodRug, config });
  assert.equal(result.approved, false);
});
test("risk checks approve only when required evidence passes", () => {
  assert.equal(assessToken({ pair: goodPair, rug: goodRug, config }).approved, true);
});
test("round trip estimate includes entry and exit assumptions", () => {
  assert.equal(estimateRoundTripCostPct(config), 0.026);
});
test("position sizing respects one-position limit", () => {
  const result = getPositionSize({ cashUsd: 2, config, openPositions: 1, equityUsd: 2, dayStartEquityUsd: 2 });
  assert.equal(result.allowed, false);
});
