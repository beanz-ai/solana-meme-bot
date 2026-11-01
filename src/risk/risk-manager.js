export function estimateRoundTripCostPct(config) {
  return (2 * (config.estimatedSlippageBps + config.estimatedDexFeeBps)) / 10000;
}
export function getConsecutiveLosses(trades = []) {
  let count = 0;
  for (const trade of [...trades].reverse()) { if (Number(trade.pnlUsd) < 0) count++; else break; }
  return count;
}
export function getPositionSize({cashUsd,config,openPositions,equityUsd,dayStartEquityUsd,trades=[],now=Date.now(),lastLossAt=0}) {
  if (openPositions >= config.maxOpenPositions) return {allowed:false,reason:"Open-position limit reached"};
  const drawdown=dayStartEquityUsd>0?(dayStartEquityUsd-equityUsd)/dayStartEquityUsd:0;
  if (drawdown >= config.dailyDrawdownLimitPct) return {allowed:false,reason:"Daily drawdown limit reached; entries paused"};
  if (getConsecutiveLosses(trades) >= (config.maxConsecutiveLosses??2)) return {allowed:false,reason:"Consecutive-loss limit reached; entries paused for today"};
  if (lastLossAt && now-lastLossAt < (config.lossCooldownMs??3600000)) {
    const minutes=Math.ceil(((config.lossCooldownMs??3600000)-(now-lastLossAt))/60000);
    return {allowed:false,reason:`Post-loss cooldown active (${minutes} min remaining)`};
  }
  const costPct=estimateRoundTripCostPct(config);
  if (costPct>config.maxRoundtripCostPct) return {allowed:false,reason:"Estimated round-trip costs exceed limit"};
  const riskPerDollar=config.stopLossPct+costPct;
  if (!(riskPerDollar>0)||!(equityUsd>0)) return {allowed:false,reason:"Invalid risk or equity calculation"};
  const riskBudgetUsd=equityUsd*config.riskPerTradePct;
  const sizeUsd=Math.min(cashUsd,riskBudgetUsd/riskPerDollar);
  if (!(sizeUsd>0)) return {allowed:false,reason:"Insufficient paper cash"};
  return {allowed:true,sizeUsd,riskBudgetUsd,estimatedAccountRiskPct:(sizeUsd*riskPerDollar/equityUsd)*100,estimatedRoundTripCostPct:costPct};
}
