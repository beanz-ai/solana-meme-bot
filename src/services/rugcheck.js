import { getJson } from "./http.js";

// Provider schemas can change. Preserve raw fields and only normalize explicitly known fields.
export async function getRugCheckReport(mint) {
  return getJson(`https://api.rugcheck.xyz/v1/tokens/${encodeURIComponent(mint)}/report`);
}

const firstNumber = (...values) => {
  for (const value of values) {
    const n = Number(value);
    if (value !== undefined && value !== null && Number.isFinite(n)) return n;
  }
  return null;
};

export function normalizeRugCheck(report) {
  if (!report || typeof report !== "object") return null;
  const risks = Array.isArray(report.risks) ? report.risks : null;
  return {
    score: firstNumber(report.score_normalised, report.scoreNormalized),
    lpLockedPct: firstNumber(report.lpLockedPct, report.lp_locked_pct),
    topHolderPct: firstNumber(report.topHolderPct, report.top_holder_pct),
    mintAuthority: report.mintAuthority ?? report.mint_authority ?? null,
    freezeAuthority: report.freezeAuthority ?? report.freeze_authority ?? null,
    risks,
    raw: report
  };
}
