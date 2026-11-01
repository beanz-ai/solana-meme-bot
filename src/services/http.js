export async function getJson(url, { timeoutMs = 10000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { "accept": "application/json", "user-agent": "solana-meme-bot-paper/0.1" },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).host}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}
