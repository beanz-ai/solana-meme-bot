import { getRecentSolanaProfiles, getTokenPairs, chooseBestPair } from "../services/dexscreener.js";
import { getRugCheckReport, normalizeRugCheck } from "../services/rugcheck.js";
import { assessToken } from "../security/token-risk.js";

export async function scanCandidates(config, state) {
  const profiles = await getRecentSolanaProfiles();
  const candidates = [];
  for (const profile of profiles.slice(0, 25)) {
    const mint = profile.tokenAddress;
    if (state.seenMints.includes(mint)) continue;
    try {
      const [pairs, report] = await Promise.all([getTokenPairs(mint), getRugCheckReport(mint)]);
      const pair = chooseBestPair(pairs);
      const rug = normalizeRugCheck(report);
      const assessment = assessToken({ pair, rug, config });
      state.seenMints.push(mint);
      if (state.seenMints.length > 5000) state.seenMints = state.seenMints.slice(-3000);
      candidates.push({ mint, pair, rug, assessment });
    } catch (error) {
      candidates.push({ mint, pair: null, rug: null, assessment: { approved: false, score: 0, reasons: [`Screening unavailable: ${error.message}`] } });
    }
  }
  return candidates;
}
