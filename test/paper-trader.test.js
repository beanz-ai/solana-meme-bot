import test from "node:test";
import assert from "node:assert/strict";
import { openPaperPosition, markToMarket, updatePaperPositions } from "../src/strategies/paper-trader.js";

const config = {
  maxOpenPositions: 1, maxPositionPct: 0.2, maxRoundtripCostPct: 0.05,
  estimatedSlippageBps: 100, estimatedDexFeeBps: 30,
  dailyDrawdownLimitPct: 0.1, stopLossPct: 0.15, takeProfitPct: 0.25
};
const freshState = () => ({ cashUsd: 2, positions: [], trades: [], dayStartEquityUsd: 2 });

test("paper entry spends no more than configured cash fraction", () => {
  const state = freshState();
  const result = openPaperPosition(state, { mint: "Mint111", price: 1, config });
  assert.equal(result.opened, true);
  assert.ok(result.spendUsd <= 0.4);
  assert.equal(state.positions.length, 1);
});

test("paper trader refuses a second simultaneous position", () => {
  const state = freshState();
  openPaperPosition(state, { mint: "Mint111", price: 1, config });
  const result = openPaperPosition(state, { mint: "Mint222", price: 1, config });
  assert.equal(result.opened, false);
});

test("take profit closes a paper position and records result", () => {
  const state = freshState();
  openPaperPosition(state, { mint: "Mint111", price: 1, config });
  markToMarket(state, { Mint111: 1.3 }, config);
  const closed = updatePaperPositions(state, config);
  assert.equal(closed.length, 1);
  assert.equal(closed[0].reason, "take-profit");
  assert.equal(state.positions.length, 0);
  assert.equal(state.trades.length, 1);
});
