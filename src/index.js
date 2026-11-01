import {fileURLToPath} from "node:url";
import {config} from "./config.js";
import {scanCandidates} from "./strategies/scanner.js";
import {discoverSocialLeads} from "./services/social-discovery.js";
import {markToMarket,openPaperPosition,updatePaperPositions,getAccountSummary} from "./strategies/paper-trader.js";
import {scoreTradeSignal} from "./security/trade-signal.js";
import {getRecentWalletActivity} from "./strategies/wallet-monitor.js";
import {loadState,saveState} from "./storage/state.js";
const STATE_PATH=fileURLToPath(new URL("../data/state.json",import.meta.url));
const state=await loadState(STATE_PATH,config.startBalanceUsd);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let socialMints=[];
console.log("Solana Meme Bot — TRADING INTELLIGENCE 2.1 — PAPER MODE ONLY");
console.log(`Paper cash: $${state.cashUsd.toFixed(4)} | Baseline: $${Number(state.initialBalanceUsd).toFixed(4)}`);
console.log("Marriage objective: track verified net profits separately; no profits are guaranteed or withdrawn automatically.");
console.log(`Risk: max ${(config.maxPositionPct*100).toFixed(1)}% per position, ${(config.dailyDrawdownLimitPct*100).toFixed(1)}% daily lockout, ${config.maxConsecutiveLosses} consecutive losses, ${Math.round(config.lossCooldownMs/60000)} min cooldown`);
async function cycle(){
 const today=new Date().toISOString().slice(0,10);
 if(state.day!==today){state.day=today;state.dayStartEquityUsd=state.cashUsd+state.positions.reduce((s,p)=>s+p.quantity*p.lastPrice,0);state.dayTradeStartIndex=state.trades.length;}
 // Refresh and manage existing positions before considering any new entry.
 const prices={};
 for(const p of state.positions){
  try{
   const {getTokenPairs,chooseBestPair}=await import("./services/dexscreener.js");
   const pair=chooseBestPair(await getTokenPairs(p.mint));
   const price=Number(pair?.priceUsd);
   if(Number.isFinite(price)&&price>0)prices[p.mint]=price;
   else console.warn("PRICE DATA UNAVAILABLE",p.mint,"— holding value is stale; new entries paused");
  }catch(error){console.warn("PRICE REFRESH FAILED",p.mint,error.message,"— new entries paused");}
 }
 markToMarket(state,prices);
 const closed=updatePaperPositions(state,config);
 for(const trade of closed)console.log("PAPER SELL",trade.mint,trade.reason,`P/L: ${trade.pnlUsd.toFixed(4)} (${trade.pnlPct.toFixed(2)}%)`);
 const summary=getAccountSummary(state);
 await saveState(STATE_PATH,state);
 const dayLocked=summary.dailyDrawdownPct>=config.dailyDrawdownLimitPct*100;
 const stalePosition=state.positions.some(p=>(p.stalePriceCycles??0)>0);
 if(dayLocked)console.warn("DAILY ENTRY LOCKOUT",`drawdown ${summary.dailyDrawdownPct.toFixed(2)}% reached the ${(config.dailyDrawdownLimitPct*100).toFixed(2)}% limit`);
 if(stalePosition)console.warn("ENTRY PAUSED — open position has stale price data");
 if(!dayLocked&&!stalePosition&&state.positions.length===0){
  if(!state.lastSocialScanAt||Date.now()-state.lastSocialScanAt>=config.socialScanIntervalMs){
   try{const social=await discoverSocialLeads(config,state);socialMints=social.mints;state.lastSocialScanAt=Date.now();console.log(`SOCIAL DISCOVERY: ${social.leads.length} new leads, ${social.mints.length} Solana addresses, ${social.xPostsRead} X posts fetched`);}
   catch(error){console.warn("Social discovery failed:",error.message);}
  }
  for(const address of config.watchWallets){try{const activity=await getRecentWalletActivity(address,config.rpcUrl);console.log(`Wallet ${address.slice(0,5)}…: ${activity.length} recent signatures (read-only)`);}catch(error){console.warn("Wallet monitor:",error.message);}}
  const candidates=await scanCandidates(config,state,socialMints);
  for(const candidate of candidates){
   if(!candidate.assessment.approved){console.log("BLOCKED",candidate.mint,candidate.assessment.reasons.join("; "));continue;}
   const signal=scoreTradeSignal(candidate.pair);
   if(!signal.approved||signal.score<config.minTradeSignalScore){console.log("NO TRADE",candidate.mint,`signal ${signal.score}/100`,signal.reasons.join("; "));continue;}
   const result=openPaperPosition(state,{mint:candidate.mint,price:Number(candidate.pair.priceUsd),config});
   console.log(result.opened?"PAPER BUY":"SKIP",candidate.mint,result.reason??`$${result.spendUsd.toFixed(4)}`,`signal ${signal.score}/100`);
   if(result.opened)break;
  }
 } else if(!dayLocked&&!stalePosition&&state.positions.length>0) console.log("ENTRY PAUSED — one paper position is already open");
 await saveState(STATE_PATH,state);
 const s=getAccountSummary(state);
 console.log(`Cash $${s.cashUsd.toFixed(4)} | Equity $${s.equityUsd.toFixed(4)} | Realized $${s.realizedPnlUsd.toFixed(4)} | Unrealized $${s.unrealizedPnlUsd.toFixed(4)} | Return ${s.totalReturnPct.toFixed(2)}% | Daily drawdown ${s.dailyDrawdownPct.toFixed(2)}% | Open ${s.openPositions}`);
}
while(true){try{await cycle();}catch(error){console.error("Cycle failed:",error.message);}await sleep(config.scanIntervalMs);}
