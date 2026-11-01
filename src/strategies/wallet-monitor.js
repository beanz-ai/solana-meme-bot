import { getJson } from "../services/http.js";

// Read-only public address monitoring. This does not sign or submit transactions.
export async function getRecentWalletActivity(address, rpcUrl, limit = 5) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getSignaturesForAddress", params: [address, { limit }] })
  });
  if (!response.ok) throw new Error(`Solana RPC HTTP ${response.status}`);
  const json = await response.json();
  if (json.error) throw new Error(json.error.message ?? "Solana RPC error");
  return Array.isArray(json.result) ? json.result : [];
}
