const DEFAULT_FEEDS = [
  "https://www.coindesk.com/arc/outboundfeeds/rss/",
  "https://cointelegraph.com/rss"
];
const SOLANA_MINT = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;
const INTERESTING = /solana|memecoin|meme coin|token launch|launching|pump\.fun|airdrop|presale|ticker|\$[A-Z]{2,10}/i;

function decodeXml(value = "") {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function readTag(block, tag) {
  const match = block.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag + ">", "i"));
  return match ? decodeXml(match[1]).replace(/<[^>]+>/g, " ").trim() : "";
}

export function parseRss(xml, source = "RSS") {
  const blocks = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map(m => m[1]);
  const entries = blocks.length ? blocks : [...xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi)].map(m => m[1]);
  return entries.map(block => {
    const title = readTag(block, "title");
    const description = readTag(block, "description") || readTag(block, "summary") || readTag(block, "content");
    const link = readTag(block, "link") || (block.match(/<link[^>]+href=["']([^"']+)/i)?.[1] ?? "");
    const publishedAt = readTag(block, "pubDate") || readTag(block, "published") || readTag(block, "updated");
    return { id: link || title, source, title, text: description, url: link, publishedAt };
  }).filter(item => item.title);
}

async function fetchText(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { headers: { accept: "application/rss+xml, application/xml, text/xml" }, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).host}`);
    return await response.text();
  } finally { clearTimeout(timer); }
}

async function scanRss(config) {
  const feeds = config.socialRssFeeds?.length ? config.socialRssFeeds : DEFAULT_FEEDS;
  const results = await Promise.allSettled(feeds.map(async url => parseRss(await fetchText(url), new URL(url).hostname)));
  return results.flatMap(result => result.status === "fulfilled" ? result.value : []);
}

async function scanX(config, state) {
  if (!config.xApiEnabled || !config.xBearerToken) return { posts: [], fetched: 0 };
  const today = new Date().toISOString().slice(0, 10);
  if (state.xDailyDate !== today) { state.xDailyDate = today; state.xPostsToday = 0; }
  const remaining = Math.max(0, config.xMaxPostsPerDay - (state.xPostsToday ?? 0));
  // X recent-search requires at least 10 results; skip rather than exceed a smaller remaining daily allowance.
  if (remaining < 10) return { posts: [], fetched: 0 };
  const params = new URLSearchParams({
    query: '(Solana OR memecoin OR "meme coin" OR "token launch" OR pump.fun) -is:retweet',
    max_results: String(Math.max(10, Math.min(100, remaining))),
    "tweet.fields": "created_at,public_metrics,author_id"
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`https://api.x.com/2/tweets/search/recent?${params}`, {
      headers: { authorization: `Bearer ${config.xBearerToken}`, accept: "application/json" },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`X API HTTP ${response.status}`);
    const data = await response.json();
    const posts = (data.data ?? []).map(post => ({
      id: post.id, source: "X", title: "X post", text: post.text ?? "",
      url: `https://x.com/i/web/status/${post.id}`, publishedAt: post.created_at,
      metrics: post.public_metrics ?? {}
    }));
    state.xPostsToday += posts.length;
    return { posts, fetched: posts.length };
  } finally { clearTimeout(timer); }
}

export async function discoverSocialLeads(config, state) {
  const [rssPosts, xResult] = await Promise.all([
    scanRss(config),
    scanX(config, state).catch(error => {
      console.warn("X discovery unavailable:", error.message);
      return { posts: [], fetched: 0 };
    })
  ]);
  const posts = [...rssPosts, ...xResult.posts];
  const leads = [];
  const mints = new Set();
  state.seenSocialItems ??= [];
  for (const post of posts) {
    const text = `${post.title} ${post.text}`;
    if (!INTERESTING.test(text)) continue;
    const id = post.id || post.url || `${post.source}:${post.title}`;
    if (state.seenSocialItems.includes(id)) continue;
    state.seenSocialItems.push(id);
    const addresses = text.match(SOLANA_MINT) ?? [];
    for (const address of addresses) mints.add(address);
    leads.push({ ...post, addresses });
  }
  if (state.seenSocialItems.length > 5000) state.seenSocialItems = state.seenSocialItems.slice(-3000);
  return { leads, mints: [...mints], xPostsRead: xResult.fetched };
}
