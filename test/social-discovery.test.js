import test from "node:test";
import assert from "node:assert/strict";
import { parseRss } from "../src/services/social-discovery.js";

test("parses RSS announcements and decodes entities", () => {
  const xml = `<rss><channel><item><title>Solana token launch &amp; update</title><description><![CDATA[New project announced]]></description><link>https://example.com/story</link><pubDate>Sun, 01 Nov 2026 10:00:00 GMT</pubDate></item></channel></rss>`;
  const [item] = parseRss(xml, "example.com");
  assert.equal(item.title, "Solana token launch & update");
  assert.equal(item.text, "New project announced");
  assert.equal(item.url, "https://example.com/story");
  assert.equal(item.source, "example.com");
});

test("handles Atom feeds", () => {
  const xml = `<feed><entry><title>Solana project</title><summary>Token announcement</summary><link href="https://example.com/atom" /></entry></feed>`;
  const [item] = parseRss(xml);
  assert.equal(item.title, "Solana project");
  assert.equal(item.text, "Token announcement");
  assert.equal(item.url, "https://example.com/atom");
});
