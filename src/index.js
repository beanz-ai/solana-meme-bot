import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { scanCandidates } from "./strategies/scanner.js";
import { discoverSocialLeads } from "./services/social-discovery.js";
import { markToMarket, openPaperPosition, updatePaperPositions, getAccountSummary } from "./strategies/paper-trader.js";
import { getRecentWalletActivity } from "./strategies/wallet-monitor.js";
import { loadState, saveState } from "./storage/state.js";

const STATE_PATH = fileURLToPath(new URL("../data/state.json", import.meta.url));
const state = await loadState(STATE_PATH, config.startBalanceUsd);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let socialMints = [];

console.log("Solana Meme Bot — PAPER MODE ONLY");
console.log(`Starting paper cash: $${state.cashUsd.toFixed(4)}`);
console.log("Social discovery: RSS feeds active; X API " + (config.xApiEnabled ? "enabled with daily post cap " + config.xMaxPostsPerDay : "disabled (ready to activate)"));

async function cycle() {
  const today = new Date().toISOString().slice(0, 10);
  if (state.day !== today) {
    state.day = today;
    state.dayStartEquityUsd = state.cashUsd + state.positions.reduce((s, p) => s + p.quantity * p.lastPrice, 0);
  }

  if (!state.lastSocialScanAt || Date.now() - state.lastSocialScanAt >= config.socialScanIntervalMs) {
    try {
      const social = await discoverSocialLeads(config, state);
      socialMints = social.mints;
      state.lastSocialScanAt = Date.now();
      console.log(`SOCIAL DISCOVERY: ${social.leads.length} new leads, ${social.mints.length} Solana addresses, ${social.xPostsRead} X posts fetched`);
      for (const lead of social.leads.slice(0, 10)) {
        console.log("SOCIAL LEAD", lead.source, lead.title, lead.url || "");
        if (lead.addresses.length) console.log("SOCIAL TOKEN ADDRESSES", lead.addresses.join(", "));
      }
    } catch (error) {
      console.warn("Social discovery failed:", error.message);
    }
  }

  for (const address of config.watchWallets) {
    try {
      const activity = await getRecentWalletActivity(address, config.rpcUrl);
      console.log(`Wallet ${address.slice(0, 5)}…: ${activity.length} recent signatures (read-only)`);
    } catch (error) {
      console.warn("Wallet monitor:", error.message);
    }
  }

  const candidates = await scanCandidates(config, state, socialMints);
  for (const candidate of candidates) {
    if (!candidate.assessment.approved) {
      console.log("BLOCKED", candidate.mint, candidate.assessment.reasons.join("; "));
      continue;
    }
    const price = Number(candidate.pair.priceUsd);
    const result = openPaperPosition(state, { mint: candidate.mint, price, config });
    console.log(result.opened ? "PAPER BUY" : "SKIP", candidate.mint, result.reason ?? result.spendUsd);
    if (result.opened) break;
  }

  const prices = {};
  for (const position of state.positions) {
    try {
      const { getTokenPairs, chooseBestPair } = await import("./services/dexscreener.js");
      const pair = chooseBestPair(await getTokenPairs(position.mint));
      if (pair) prices[position.mint] = Number(pair.priceUsd);
    } catch (error) {
      console.warn("Price refresh failed:", position.mint, error.message);
    }
  }
  markToMarket(state, prices);
  const closed = updatePaperPositions(state, config);
  for (const trade of closed) {
    console.log(
      "PAPER SELL", trade.mint, trade.reason,
      `P/L: ${trade.pnlUsd.toFixed(4)} (${trade.pnlPct.toFixed(2)}%)`,
      `entry fill ${trade.entryFillPrice.toFixed(8)}`,
      `trigger ${trade.triggerPrice.toFixed(8)}`,
      `exit fill ${trade.exitFillPrice.toFixed(8)}`,
      `exit fee ${trade.exitFeeUsd.toFixed(4)}`,
      `exit slippage ${trade.exitSlippageUsd.toFixed(4)}`
    );
  }
  await saveState(STATE_PATH, state);
  const summary = getAccountSummary(state);
  console.log(
    `Cash ${summary.cashUsd.toFixed(4)} | Equity ${summary.equityUsd.toFixed(4)} | ` +
    `Realized P/L ${summary.realizedPnlUsd.toFixed(4)} | ` +
    `Unrealized P/L ${summary.unrealizedPnlUsd.toFixed(4)} | ` +
    `Open positions ${summary.openPositions}`
  );
}

while (true) {
  try { await cycle(); }
  catch (error) { console.error("Cycle failed:", error.message); }
  await sleep(config.scanIntervalMs);
}
