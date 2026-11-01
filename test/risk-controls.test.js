import test from "node:test";
import assert from "node:assert/strict";
import {getPositionSize} from "../src/risk/risk-manager.js";
const config={maxOpenPositions:1,maxPositionPct:.1,maxRoundtripCostPct:.05,estimatedSlippageBps:100,estimatedDexFeeBps:30,dailyDrawdownLimitPct:.05,maxConsecutiveLosses:2,lossCooldownMs:1800000};
const base={cashUsd:2,config,openPositions:0,equityUsd:2,dayStartEquityUsd:2,now:10000000};
test("blocks entries after two consecutive daily losses",()=>{const trades=[{pnlUsd:-.1},{pnlUsd:-.05}];const r=getPositionSize({...base,trades});assert.equal(r.allowed,false);assert.match(r.reason,/Consecutive-loss/);});
test("blocks entries during post-loss cooldown",()=>{const r=getPositionSize({...base,trades:[],lastLossAt:9000000});assert.equal(r.allowed,false);assert.match(r.reason,/cooldown/);});
test("blocks entries at daily drawdown limit",()=>{const r=getPositionSize({...base,trades:[],equityUsd:1.89});assert.equal(r.allowed,false);assert.match(r.reason,/drawdown/);});
