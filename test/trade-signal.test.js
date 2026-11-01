import test from "node:test";
import assert from "node:assert/strict";
import {scoreTradeSignal} from "../src/security/trade-signal.js";
const good={priceChange:{m5:3,m15:8,h1:12},volume:{m5:2000,h1:10000},txns:{m5:{buys:12,sells:5}},liquidity:{usd:25000}};
test("approves a measured positive momentum setup",()=>{const r=scoreTradeSignal(good);assert.equal(r.approved,true);assert.ok(r.score>=70);});
test("fails closed when short-term evidence is missing",()=>{const r=scoreTradeSignal({priceChange:{h1:4},volume:{h1:1000},liquidity:{usd:20000}});assert.equal(r.approved,false);});
test("rejects overextended price moves",()=>{const r=scoreTradeSignal({...good,priceChange:{...good.priceChange,m5:35}});assert.equal(r.approved,false);});
test("rejects weak buyer pressure",()=>{const r=scoreTradeSignal({...good,txns:{m5:{buys:2,sells:20}}});assert.equal(r.approved,false);});
