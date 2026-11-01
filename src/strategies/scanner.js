import { getRecentSolanaProfiles, getTokenPairs, chooseBestPair } from "../services/dexscreener.js";
import { getRugCheckReport, normalizeRugCheck } from "../services/rugcheck.js";
import { assessToken } from "../security/token-risk.js";

export async function scanCandidates(config, state, socialMints = []) {
  const profiles = await getRecentSolanaProfiles();
  const combined = new Map();
  for (const profile of profiles) combined.set(profile.tokenAddress, profile);
  for (const mint of socialMints) {
    if (!combined.has(mint)) combined.set(mint, { tokenAddress: mint, source: "social" });
  }
  const candidates = [];
  for (const profile of [...combined.values()].slice(0, 50)) {
    const mint = profile.tokenAddress;
    if (state.seenMints.includes(mint)) continue;
    try {
      const [pairs, report] = await Promise.all([getTokenPairs(mint), getRugCheckReport(mint)]);
      const pair = chooseBestPair(pairs);
      const rug = normalizeRugCheck(report);
      const assessment = assessToken({ pair, rug, config });
      state.seenMints.push(mint);
      if (state.seenMints.length > 5000) state.seenMints = state.seenMints.slice(-3000);
      candidates.push({ mint, pair, rug, assessment, discoverySource: profile.source ?? "DexScreener" });
    } catch (error) {
      candidates.push({ mint, pair: null, rug: null, discoverySource: profile.source ?? "DexScreener", assessment: { approved: false, score: 0, reasons: [`Screening unavailable: ${error.message}`] } });
    }
  }
  return candidates;
}
