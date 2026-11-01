import { getPositionSize } from "../risk/risk-manager.js";

export function markToMarket(state, prices) {
  for (const position of state.positions) {
    const price = Number(prices[position.mint]);
    if (Number.isFinite(price) && price > 0) position.lastPrice = price;
  }
  return state.cashUsd + state.positions.reduce((sum, p) => sum + p.quantity * p.lastPrice, 0);
}

export function openPaperPosition(state, { mint, price, config, now = new Date() }) {
  if (!mint || !Number.isFinite(price) || price <= 0) return { opened: false, reason: "Invalid mint or price" };
  if (state.positions.some(p => p.mint === mint)) return { opened: false, reason: "Already holding token" };
  const equity = state.cashUsd + state.positions.reduce((s, p) => s + p.quantity * p.lastPrice, 0);
  const sizing = getPositionSize({
    cashUsd: state.cashUsd, config, openPositions: state.positions.length,
    equityUsd: equity, dayStartEquityUsd: state.dayStartEquityUsd
  });
  if (!sizing.allowed) return { opened: false, reason: sizing.reason };
  const spend = sizing.sizeUsd;
  const entryFeeUsd = spend * config.estimatedDexFeeBps / 10000;
  const entryFillPrice = price * (1 + config.estimatedSlippageBps / 10000);
  const quantity = (spend - entryFeeUsd) / entryFillPrice;
  if (!(quantity > 0) || spend > state.cashUsd) return { opened: false, reason: "Invalid simulated fill" };
  state.cashUsd -= spend;
  state.positions.push({
    mint, referenceEntryPrice: price, entryFillPrice, lastPrice: price,
    quantity, investedUsd: spend, entryFeeUsd,
    openedAt: now.toISOString()
  });
  return { opened: true, quantity, spendUsd: spend };
}

export function updatePaperPositions(state, config, now = new Date()) {
  const closed = [];
  state.positions = state.positions.filter(position => {
    const change = (position.lastPrice - position.entryFillPrice) / position.entryFillPrice;
    let reason = null;
    if (change <= -config.stopLossPct) reason = "stop-loss";
    else if (change >= config.takeProfitPct) reason = "take-profit";
    if (!reason) return true;

    // A stop/target is a trigger, not a guaranteed fill. Model adverse exit
    // slippage and charge the DEX fee on the simulated filled value.
    const exitFillPrice = position.lastPrice * (1 - config.estimatedSlippageBps / 10000);
    const grossProceedsUsd = position.quantity * exitFillPrice;
    const exitFeeUsd = grossProceedsUsd * config.estimatedDexFeeBps / 10000;
    const proceedsUsd = Math.max(0, grossProceedsUsd - exitFeeUsd);
    const exitSlippageUsd = position.quantity * (position.lastPrice - exitFillPrice);
    state.cashUsd += proceedsUsd;

    const pnlUsd = proceedsUsd - position.investedUsd;
    const trade = {
      mint: position.mint,
      referenceEntryPrice: position.referenceEntryPrice,
      entryFillPrice: position.entryFillPrice,
      triggerPrice: position.lastPrice,
      exitFillPrice,
      quantity: position.quantity,
      investedUsd: position.investedUsd,
      entryFeeUsd: position.entryFeeUsd,
      exitFeeUsd,
      exitSlippageUsd,
      grossProceedsUsd,
      proceedsUsd,
      pnlUsd,
      pnlPct: position.investedUsd > 0 ? (pnlUsd / position.investedUsd) * 100 : 0,
      reason,
      closedAt: now.toISOString()
    };
    state.trades.push(trade);
    closed.push(trade);
    return false;
  });
  return closed;
}

export function getAccountSummary(state) {
  const openValueUsd = state.positions.reduce((sum, p) => sum + p.quantity * p.lastPrice, 0);
  const equityUsd = state.cashUsd + openValueUsd;
  const realizedPnlUsd = state.trades.reduce((sum, trade) => sum + trade.pnlUsd, 0);
  const unrealizedPnlUsd = state.positions.reduce(
    (sum, p) => sum + p.quantity * p.lastPrice - p.investedUsd, 0
  );
  return { cashUsd: state.cashUsd, openValueUsd, equityUsd, realizedPnlUsd, unrealizedPnlUsd, openPositions: state.positions.length };
}
