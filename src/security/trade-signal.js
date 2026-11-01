// Scores trade timing separately from token safety. Missing short-term market
// evidence fails closed rather than treating a token as a momentum opportunity.
export function scoreTradeSignal(pair) {
  if (!pair) return { approved: false, score: 0, reasons: ["Missing market pair"] };
  const pc = pair.priceChange ?? {}, volume = pair.volume ?? {}, txns = pair.txns ?? {};
  const values = [pc.m5, pc.m15, pc.h1, volume.m5, volume.h1, txns.m5?.buys, txns.m5?.sells, pair.liquidity?.usd].map(Number);
  if (!values.every(Number.isFinite)) return { approved: false, score: 0, reasons: ["Missing short-term momentum, volume, transaction or liquidity evidence"] };
  const [m5Change,m15Change,h1Change,m5Volume,h1Volume,buys,sells,liquidity] = values;
  const reasons = [];
  if (liquidity <= 0 || h1Volume <= 0 || m5Volume <= 0 || buys+sells < 3) return { approved:false,score:0,reasons:["Insufficient recent market activity"] };
  let score=0;
  if(m5Change>0&&m5Change<=12) score+=20; else reasons.push("5-minute momentum is negative or overextended");
  if(m15Change>0&&m15Change<=25) score+=15; else reasons.push("15-minute momentum is negative or overextended");
  if(h1Change>-5&&h1Change<=40) score+=10; else reasons.push("Hourly trend is weak or overextended");
  const volumeRatio=m5Volume/h1Volume;
  if(volumeRatio>=0.03&&volumeRatio<=0.5) score+=15; else reasons.push("Recent volume pace is too weak or unusually concentrated");
  const buyRatio=buys/(buys+sells);
  if(buyRatio>=0.55) score+=20; else reasons.push("Buy pressure is not strong enough");
  if(liquidity>=20000) score+=10; else if(liquidity>=10000) score+=5; else reasons.push("Liquidity below trading-signal minimum");
  if(m5Change<8&&m15Change<18) score+=10; else reasons.push("Possible late entry after a sharp move");
  return {approved:score>=75&&m5Change>0&&m15Change>0&&buyRatio>=0.55,score,reasons,metrics:{m5Change,m15Change,h1Change,volumeRatio,buyRatio,liquidity}};
}
