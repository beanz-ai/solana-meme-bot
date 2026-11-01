import { getJson } from "./http.js";

// RugCheck exposes a detailed report and a compact summary. The summary
// supplies the normalized score/LP percentage; the detailed report supplies
// authorities and holder distribution. If either request fails, the caller
// fails closed rather than treating missing data as safe.
export async function getRugCheckReport(mint) {
  const encoded = encodeURIComponent(mint);
  const [detail, summary] = await Promise.all([
    getJson(`https://api.rugcheck.xyz/v1/tokens/${encoded}/report`),
    getJson(`https://api.rugcheck.xyz/v1/tokens/${encoded}/report/summary`)
  ]);
  return { ...detail, ...summary, token: detail.token ?? summary.token, topHolders: detail.topHolders ?? summary.topHolders };
}

const firstNumber = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
};

function authorityDisabled(value) {
  // RugCheck represents revoked authorities as explicit null. Preserve
  // missing/undefined as unknown so the security gate blocks it.
  return value === null ? false : value;
}

export function normalizeRugCheck(report) {
  if (!report || typeof report !== "object") return null;
  const token = report.token ?? {};
  const risks = Array.isArray(report.risks) ? report.risks : null;
  const holders = Array.isArray(report.topHolders) ? report.topHolders : [];
  const firstHolderPct = firstNumber(holders[0]?.pct, holders[0]?.percentage);
  return {
    score: firstNumber(report.score_normalised, report.scoreNormalized),
    lpLockedPct: firstNumber(report.lpLockedPct, report.lp_locked_pct),
    topHolderPct: firstNumber(report.topHolderPct, report.top_holder_pct, report.topHoldersPct, firstHolderPct),
    mintAuthority: authorityDisabled("mintAuthority" in token ? token.mintAuthority : ("mintAuthority" in report ? report.mintAuthority : report.mint_authority)),
    freezeAuthority: authorityDisabled("freezeAuthority" in token ? token.freezeAuthority : ("freezeAuthority" in report ? report.freezeAuthority : report.freeze_authority)),
    risks,
    raw: report
  };
}
