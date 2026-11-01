import test from "node:test";
import assert from "node:assert/strict";
import {markToMarket,updatePaperPositions,openPaperPosition} from "../src/strategies/paper-trader.js";
const config={maxOpenPositions:1,maxPositionPct:.05,maxRoundtripCostPct:.05,estimatedSlippageBps:100,estimatedDexFeeBps:30,dailyDrawdownLimitPct:.03,maxConsecutiveLosses:2,lossCooldownMs:3600000,stopLossPct:.08,takeProfitPct:.20,breakEvenActivationPct:.10,trailingActivationPct:.15,trailingStopPct:.08};
test("new paper entries risk no more than five percent of available cash",()=>{const s={cashUsd:20,positions:[],trades:[],dayStartEquityUsd:20};const r=openPaperPosition(s,{mint:"TestMint",price:1,config});assert.equal(r.opened,true);assert.ok(r.spendUsd<=1.000001);});
test("stale price data pauses stop evaluation instead of inventing a fill",()=>{const s={cashUsd:19,positions:[{mint:"TestMint",entryFillPrice:1,lastPrice:1,highestPrice:1,quantity:1,investedUsd:1,stalePriceCycles:0}],trades:[]};markToMarket(s,{});const closed=updatePaperPositions(s,config);assert.equal(closed.length,0);assert.equal(s.positions.length,1);assert.equal(s.positions[0].stalePriceCycles,1);});
