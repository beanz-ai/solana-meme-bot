import {getRecentSolanaProfiles,getTokenPairs,chooseBestPair} from "../services/dexscreener.js";
import {getRugCheckReport,normalizeRugCheck} from "../services/rugcheck.js";
import {assessToken} from "../security/token-risk.js";
export async function scanCandidates(config,state,socialMints=[]) {
 const profiles=await getRecentSolanaProfiles(),combined=new Map();
 for(const profile of profiles)combined.set(profile.tokenAddress,profile);
 for(const mint of socialMints)if(!combined.has(mint))combined.set(mint,{tokenAddress:mint,source:"social"});
 const candidates=[];
 // Keep request volume bounded; a failed provider response is never treated as safe.
 for(const profile of [...combined.values()].slice(0,15)){
  const mint=profile.tokenAddress;
  if(state.seenMints.includes(mint))continue;
  try{
   const pairs=await getTokenPairs(mint);
   const report=await getRugCheckReport(mint);
   const pair=chooseBestPair(pairs),rug=normalizeRugCheck(report),assessment=assessToken({pair,rug,config});
   state.seenMints.push(mint);if(state.seenMints.length>5000)state.seenMints=state.seenMints.slice(-3000);
   candidates.push({mint,pair,rug,assessment,discoverySource:profile.source??"DexScreener"});
  }catch(error){candidates.push({mint,pair:null,rug:null,discoverySource:profile.source??"DexScreener",assessment:{approved:false,score:0,reasons:[`Screening unavailable: ${error.message}`]}});}
 }
 return candidates;
}
