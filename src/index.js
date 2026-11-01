import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { scanCandidates } from "./strategies/scanner.js";
import { markToMarket, openPaperPosition, updatePaperPositions } from "./strategies/paper-trader.js";
import { getRecentWalletActivity } from "./strategies/wallet-monitor.js";
import { loadState, saveState } from "./storage/state.js";

const STATE_PATH = fileURLToPath(new URL("../data/state.json", import.meta.url));
const state = await loadState(STATE_PATH, config.startBalanceUsd);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

console.log("Solana Meme Bot — PAPER MODE ONLY");
console.log(`Starting paper cash: $${state.cashUsd.toFixed(4)}`);

async function cycle() {
  const today = new Date().toISOString().slice(0, 10);
  if (state.day !== today) {
    state.day = today;
    state.dayStartEquityUsd = state.cashUsd + state.positions.reduce((s, p) => s + p.quantity * p.lastPrice, 0);
  }

  for (const address of config.watchWallets) {
    try {
      const activity = await getRecentWalletActivity(address, config.rpcUrl);
      console.log(`Wallet ${address.slice(0, 5)}…: ${activity.length} recent signatures (read-only)`);
    } catch (error) {
      console.warn("Wallet monitor:", error.message);
    }
  }

  const candidates = await scanCandidates(config, state);
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
  const equity = markToMarket(state, prices, config);
  const closed = updatePaperPositions(state, config);
  for (const trade of closed) console.log("PAPER SELL", trade.mint, trade.reason, "P/L:", trade.pnlUsd.toFixed(4));
  await saveState(STATE_PATH, state);
  console.log(`Cash $${state.cashUsd.toFixed(4)} | Equity $${equity.toFixed(4)} | Open positions ${state.positions.length}`);
}

while (true) {
  try { await cycle(); }
  catch (error) { console.error("Cycle failed:", error.message); }
  await sleep(config.scanIntervalMs);
}
