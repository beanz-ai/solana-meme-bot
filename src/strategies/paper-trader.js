import { getPositionSize } from "../risk/risk-manager.js";

export function markToMarket(state, prices, config) {
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
  const cost = sizing.sizeUsd * config.estimatedDexFeeBps / 10000;
  const spend = sizing.sizeUsd;
  const quantity = (spend - cost) / (price * (1 + config.estimatedSlippageBps / 10000));
  if (!(quantity > 0) || spend > state.cashUsd) return { opened: false, reason: "Invalid simulated fill" };
  state.cashUsd -= spend;
  state.positions.push({ mint, entryPrice: price, lastPrice: price, quantity, investedUsd: spend, openedAt: now.toISOString() });
  return { opened: true, quantity, spendUsd: spend };
}

export function updatePaperPositions(state, config, now = new Date()) {
  const closed = [];
  state.positions = state.positions.filter(p => {
    const change = (p.lastPrice - p.entryPrice) / p.entryPrice;
    let reason = null;
    if (change <= -config.stopLossPct) reason = "stop-loss";
    if (change >= config.takeProfitPct) reason = "take-profit";
    if (!reason) return true;
    const gross = p.quantity * p.lastPrice;
    const exitCost = gross * config.estimatedDexFeeBps / 10000;
    const proceeds = Math.max(0, gross - exitCost);
    state.cashUsd += proceeds;
    const trade = { mint: p.mint, entryPrice: p.entryPrice, exitPrice: p.lastPrice, investedUsd: p.investedUsd, proceedsUsd: proceeds, pnlUsd: proceeds - p.investedUsd, reason, closedAt: now.toISOString() };
    state.trades.push(trade);
    closed.push(trade);
    return false;
  });
  return closed;
}
