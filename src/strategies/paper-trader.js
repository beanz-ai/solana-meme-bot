import { getPositionSize } from "../risk/risk-manager.js";
export function markToMarket(state, prices) {
  for (const p of state.positions) { const price=Number(prices[p.mint]); if(Number.isFinite(price)&&price>0){p.lastPrice=price;p.highestPrice=Math.max(p.highestPrice??p.entryFillPrice,price);} }
  return state.cashUsd+state.positions.reduce((s,p)=>s+p.quantity*p.lastPrice,0);
}
export function openPaperPosition(state,{mint,price,config,now=new Date()}) {
  if(!mint||!Number.isFinite(price)||price<=0)return{opened:false,reason:"Invalid mint or price"};
  if(state.positions.some(p=>p.mint===mint))return{opened:false,reason:"Already holding token"};
  const equity=state.cashUsd+state.positions.reduce((s,p)=>s+p.quantity*p.lastPrice,0);
  const sizing=getPositionSize({cashUsd:state.cashUsd,config,openPositions:state.positions.length,equityUsd:equity,dayStartEquityUsd:state.dayStartEquityUsd,trades:state.trades.slice(state.dayTradeStartIndex??0),now:now.getTime(),lastLossAt:state.lastLossAt??0});
  if(!sizing.allowed)return{opened:false,reason:sizing.reason};
  const spend=sizing.sizeUsd,entryFeeUsd=spend*config.estimatedDexFeeBps/10000,entryFillPrice=price*(1+config.estimatedSlippageBps/10000),quantity=(spend-entryFeeUsd)/entryFillPrice;
  if(!(quantity>0)||spend>state.cashUsd)return{opened:false,reason:"Invalid simulated fill"};
  state.cashUsd-=spend;state.positions.push({mint,referenceEntryPrice:price,entryFillPrice,lastPrice:price,highestPrice:price,quantity,investedUsd:spend,entryFeeUsd,openedAt:now.toISOString()});
  return{opened:true,quantity,spendUsd:spend};
}
export function updatePaperPositions(state,config,now=new Date()) {
  const closed=[];
  state.positions=state.positions.filter(p=>{
    const change=(p.lastPrice-p.entryFillPrice)/p.entryFillPrice,peakChange=((p.highestPrice??p.lastPrice)-p.entryFillPrice)/p.entryFillPrice;
    let reason=null;
    if(change<=-config.stopLossPct)reason="stop-loss";
    else if(peakChange>=(config.breakEvenActivationPct??0.12)&&change<=0.01)reason="break-even-trailing-stop";
    else if(peakChange>=(config.trailingActivationPct??0.18)&&p.lastPrice<=(p.highestPrice??p.lastPrice)*(1-(config.trailingStopPct??0.10)))reason="trailing-stop";
    else if(change>=config.takeProfitPct)reason="take-profit";
    if(!reason)return true;
    const exitFillPrice=p.lastPrice*(1-config.estimatedSlippageBps/10000),grossProceedsUsd=p.quantity*exitFillPrice,exitFeeUsd=grossProceedsUsd*config.estimatedDexFeeBps/10000,proceedsUsd=Math.max(0,grossProceedsUsd-exitFeeUsd),exitSlippageUsd=p.quantity*(p.lastPrice-exitFillPrice);
    state.cashUsd+=proceedsUsd;const pnlUsd=proceedsUsd-p.investedUsd;
    const trade={mint:p.mint,referenceEntryPrice:p.referenceEntryPrice,entryFillPrice:p.entryFillPrice,triggerPrice:p.lastPrice,highestPrice:p.highestPrice,exitFillPrice,quantity:p.quantity,investedUsd:p.investedUsd,entryFeeUsd:p.entryFeeUsd,exitFeeUsd,exitSlippageUsd,grossProceedsUsd,proceedsUsd,pnlUsd,pnlPct:p.investedUsd>0?pnlUsd/p.investedUsd*100:0,reason,closedAt:now.toISOString()};
    state.trades.push(trade);if(pnlUsd<0)state.lastLossAt=now.getTime();closed.push(trade);return false;
  });
  return closed;
}
export function getAccountSummary(state) {
  const openValueUsd=state.positions.reduce((s,p)=>s+p.quantity*p.lastPrice,0),equityUsd=state.cashUsd+openValueUsd,realizedPnlUsd=state.trades.reduce((s,t)=>s+t.pnlUsd,0),unrealizedPnlUsd=state.positions.reduce((s,p)=>s+p.quantity*p.lastPrice-p.investedUsd,0),baseline=Number(state.initialBalanceUsd??state.startingBalanceUsd??2),dayStart=Number(state.dayStartEquityUsd??baseline);
  return{cashUsd:state.cashUsd,openValueUsd,equityUsd,realizedPnlUsd,unrealizedPnlUsd,openPositions:state.positions.length,totalReturnPct:baseline>0?(equityUsd-baseline)/baseline*100:0,dailyDrawdownPct:dayStart>0?Math.max(0,(dayStart-equityUsd)/dayStart)*100:0};
}
