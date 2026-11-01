export function assessToken({ pair, rug, config }) {
  const reasons = [];
  if (!pair || !rug) return { approved: false, score: 0, reasons: ["Missing pair or security report"] };

  const liquidity = Number(pair.liquidity?.usd);
  const volume = Number(pair.volume?.h1);
  const txns = Number(pair.txns?.h1?.buys ?? 0) + Number(pair.txns?.h1?.sells ?? 0);
  const price = Number(pair.priceUsd);

  if (![liquidity, volume, txns, price].every(Number.isFinite) || price <= 0) {
    reasons.push("Missing or invalid market data");
  }
  if (liquidity < config.minLiquidityUsd) reasons.push("Liquidity below minimum");
  if (volume < config.minVolumeH1Usd) reasons.push("Hourly volume below minimum");
  if (txns < config.minTxnsH1) reasons.push("Hourly transaction count below minimum");

  if (rug.score === null || rug.lpLockedPct === null ||
      rug.mintAuthority === null || rug.freezeAuthority === null || !Array.isArray(rug.risks)) {
    reasons.push("Security report lacks required evidence");
  } else {
    if (rug.score > config.maxRugScore) reasons.push("RugCheck risk score too high");
    if (rug.lpLockedPct < config.minLpLockedPct) reasons.push("Insufficient reported locked liquidity");
    if (rug.topHolderPct === null) reasons.push("Top-holder concentration unavailable");
    else if (rug.topHolderPct > config.maxTopHolderPct) reasons.push("Top-holder concentration too high");
    if (rug.mintAuthority !== null && rug.mintAuthority !== false && rug.mintAuthority !== "") reasons.push("Mint authority may remain enabled");
    if (rug.freezeAuthority !== null && rug.freezeAuthority !== false && rug.freezeAuthority !== "") reasons.push("Freeze authority may remain enabled");

    const hasDangerousRisk = rug.risks.some((risk) => {
      const description = String(risk.name ?? risk.description ?? "");
      return /honeypot|freeze|mint authority|mutable|withdraw|rug|blacklist/i.test(description);
    });
    if (hasDangerousRisk) reasons.push("Provider reports a potentially dangerous token risk");
  }

  const score = reasons.length === 0 ? 80 : Math.max(0, 80 - reasons.length * 15);
  return { approved: reasons.length === 0 && score >= config.minScore, score, reasons, liquidityUsd: liquidity };
}
