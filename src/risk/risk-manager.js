export function estimateRoundTripCostPct(config) {
  const bps = 2 * (config.estimatedSlippageBps + config.estimatedDexFeeBps);
  return bps / 10000;
}

export function getConsecutiveLosses(trades = []) {
  let count = 0;
  for (const trade of [...trades].reverse()) {
    if (Number(trade.pnlUsd) < 0) count++;
    else break;
  }
  return count;
}

export function getPositionSize({ cashUsd, config, openPositions, equityUsd, dayStartEquityUsd, trades = [], now = Date.now(), lastLossAt = 0 }) {
  if (openPositions >= config.maxOpenPositions) return { allowed: false, reason: "Open-position limit reached" };
  if (dayStartEquityUsd > 0 && (dayStartEquityUsd - equityUsd) / dayStartEquityUsd >= config.dailyDrawdownLimitPct) {
    return { allowed: false, reason: "Daily drawdown limit reached; entries paused" };
  }
  const losses = getConsecutiveLosses(trades);
  if (losses >= (config.maxConsecutiveLosses ?? 2)) return { allowed: false, reason: "Consecutive-loss limit reached; entries paused for today" };
  if (lastLossAt && now - lastLossAt < (config.lossCooldownMs ?? 1800000)) {
    const minutes = Math.ceil(((config.lossCooldownMs ?? 1800000) - (now - lastLossAt)) / 60000);
    return { allowed: false, reason: `Post-loss cooldown active (${minutes} min remaining)` };
  }
  const costPct = estimateRoundTripCostPct(config);
  if (costPct > config.maxRoundtripCostPct) return { allowed: false, reason: "Estimated round-trip costs exceed limit" };
  const sizeUsd = Math.max(0, cashUsd * config.maxPositionPct);
  if (sizeUsd <= 0) return { allowed: false, reason: "Insufficient paper cash" };
  return { allowed: true, sizeUsd, estimatedRoundTripCostPct: costPct };
}
