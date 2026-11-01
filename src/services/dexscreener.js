import { getJson } from "./http.js";

const BASE = "https://api.dexscreener.com";

export async function getRecentSolanaProfiles() {
  const data = await getJson(`${BASE}/token-profiles/latest/v1`);
  if (!Array.isArray(data)) return [];
  return data.filter(x => x.chainId === "solana" && typeof x.tokenAddress === "string");
}

export async function getTokenPairs(mint) {
  const data = await getJson(`${BASE}/token-pairs/v1/solana/${encodeURIComponent(mint)}`);
  if (!Array.isArray(data)) return [];
  return data.filter(p => p.chainId === "solana" && p.baseToken?.address === mint);
}

export function chooseBestPair(pairs) {
  return [...pairs].sort((a, b) => Number(b.liquidity?.usd ?? 0) - Number(a.liquidity?.usd ?? 0))[0] ?? null;
}
