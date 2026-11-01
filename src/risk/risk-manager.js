export function estimateRoundTripCostPct(config) {
  const bps = 2 * (config.estimatedSlippageBps + config.estimatedDexFeeBps);
  return bps / 10000;
}

export function getPositionSize({ cashUsd, config, openPositions, equityUsd, dayStartEquityUsd }) {
  if (openPositions >= config.maxOpenPositions) return { allowed: false, reason: "Open-position limit reached" };
  if (dayStartEquityUsd > 0 && (dayStartEquityUsd - equityUsd) / dayStartEquityUsd >= config.dailyDrawdownLimitPct) {
    return { allowed: false, reason: "Daily drawdown limit reached" };
  }
  const costPct = estimateRoundTripCostPct(config);
  if (costPct > config.maxRoundtripCostPct) return { allowed: false, reason: "Estimated round-trip costs exceed limit" };
  const sizeUsd = Math.max(0, cashUsd * config.maxPositionPct);
  if (sizeUsd <= 0) return { allowed: false, reason: "Insufficient paper cash" };
  return { allowed: true, sizeUsd, estimatedRoundTripCostPct: costPct };
}
