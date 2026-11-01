import {getJson} from "./http.js";
const cache=new Map();
let blockedUntil=0;
const CACHE_MS=15*60*1000;
export async function getRugCheckReport(mint) {
 const now=Date.now(),cached=cache.get(mint);
 if(cached&&now-cached.at<CACHE_MS)return cached.report;
 if(now<blockedUntil)throw new Error("RugCheck rate-limit cooldown active; fail-closed");
 const encoded=encodeURIComponent(mint);
 try{
  const detail=await getJson(`https://api.rugcheck.xyz/v1/tokens/${encoded}/report`);
  const summary=await getJson(`https://api.rugcheck.xyz/v1/tokens/${encoded}/report/summary`);
  const report={...detail,...summary,token:detail.token??summary.token,topHolders:detail.topHolders??summary.topHolders};
  cache.set(mint,{at:Date.now(),report});
  if(cache.size>1000)cache.delete(cache.keys().next().value);
  return report;
 }catch(error){
  if(/HTTP 429/.test(error.message))blockedUntil=Date.now()+60000;
  throw error;
 }
}
const firstNumber=(...values)=>{for(const value of values){if(value===undefined||value===null||value==="")continue;const n=Number(value);if(Number.isFinite(n))return n;}return null;};
function authorityDisabled(value){return value===null?false:value;}
export function normalizeRugCheck(report){
 if(!report||typeof report!=="object")return null;
 const token=report.token??{},risks=Array.isArray(report.risks)?report.risks:null,holders=Array.isArray(report.topHolders)?report.topHolders:[];
 const firstHolderPct=firstNumber(holders[0]?.pct,holders[0]?.percentage);
 return{score:firstNumber(report.score_normalised,report.scoreNormalized),lpLockedPct:firstNumber(report.lpLockedPct,report.lp_locked_pct),topHolderPct:firstNumber(report.topHolderPct,report.top_holder_pct,report.topHoldersPct,firstHolderPct),mintAuthority:authorityDisabled("mintAuthority"in token?token.mintAuthority:("mintAuthority"in report?report.mintAuthority:report.mint_authority)),freezeAuthority:authorityDisabled("freezeAuthority"in token?token.freezeAuthority:("freezeAuthority"in report?report.freezeAuthority:report.freeze_authority)),risks,raw:report};
}
