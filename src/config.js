const num=(key,fallback)=>{const value=Number(process.env[key]??fallback);if(!Number.isFinite(value))throw new Error(`Invalid numeric setting: ${key}`);return value;};
export const config=Object.freeze({
 mode:process.env.MODE??"paper",startBalanceUsd:num("START_BALANCE_USD",20),
 riskPerTradePct:Math.min(0.15,Math.max(0.001,num("RISK_PER_TRADE_PCT",0.15))),
 maxOpenPositions:Math.max(1,Math.floor(num("MAX_OPEN_POSITIONS",1))),
 stopLossPct:Math.min(0.15,Math.max(0.01,num("STOP_LOSS_PCT",0.15))),takeProfitPct:num("TAKE_PROFIT_PCT",0.20),
 takeProfitStage1Pct:Math.max(0.01,num("TAKE_PROFIT_STAGE1_PCT",0.50)),takeProfitStage1SellPct:Math.min(1,Math.max(0.01,num("TAKE_PROFIT_STAGE1_SELL_PCT",0.50))),
 takeProfitStage2Pct:Math.max(0.02,num("TAKE_PROFIT_STAGE2_PCT",2.00)),takeProfitTrailingActivationPct:Math.max(1.5,num("TAKE_PROFIT_TRAILING_ACTIVATION_PCT",1.50)),takeProfitTrailingStopPct:Math.min(0.10,Math.max(0.01,num("TAKE_PROFIT_TRAILING_STOP_PCT",0.10))),
 dailyDrawdownLimitPct:Math.min(0.15,Math.max(0.01,num("DAILY_DRAWDOWN_LIMIT_PCT",0.15))),maxConsecutiveLosses:Math.min(2,Math.max(1,Math.floor(num("MAX_CONSECUTIVE_LOSSES",2)))),
 lossCooldownMs:Math.max(num("LOSS_COOLDOWN_MS",3600000),3600000),breakEvenActivationPct:num("BREAK_EVEN_ACTIVATION_PCT",0.10),
 trailingActivationPct:num("TRAILING_ACTIVATION_PCT",0.15),trailingStopPct:num("TRAILING_STOP_PCT",0.08),
 minTradeSignalScore:Math.max(75,num("MIN_TRADE_SIGNAL_SCORE",75)),
 minScore:Math.max(80,num("MIN_SCORE",80)),minLiquidityUsd:Math.max(15000,num("MIN_LIQUIDITY_USD",15000)),
 minVolumeH1Usd:Math.max(1500,num("MIN_VOLUME_H1_USD",1500)),minTxnsH1:Math.max(20,Math.floor(num("MIN_TXNS_H1",20))),
 maxRugScore:Math.min(25,num("MAX_RUG_SCORE",25)),minLpLockedPct:Math.max(80,num("MIN_LP_LOCKED_PCT",80)),
 maxTopHolderPct:Math.min(20,num("MAX_TOP_HOLDER_PCT",20)),maxRoundtripCostPct:Math.min(0.05,num("MAX_ROUNDTRIP_COST_PCT",0.05)),
 estimatedSlippageBps:num("ESTIMATED_SLIPPAGE_BPS",100),estimatedDexFeeBps:num("ESTIMATED_DEX_FEE_BPS",30),
 scanIntervalMs:num("SCAN_INTERVAL_MS",60000),socialScanIntervalMs:num("SOCIAL_SCAN_INTERVAL_MS",900000),
 socialRssFeeds:(process.env.SOCIAL_RSS_FEEDS??"").split(",").map(x=>x.trim()).filter(Boolean),
 xApiEnabled:(process.env.X_API_ENABLED??"false").toLowerCase()==="true",xBearerToken:process.env.X_BEARER_TOKEN??"",
 xMaxPostsPerDay:Math.max(0,Math.floor(num("X_MAX_POSTS_PER_DAY",20))),
 rpcUrl:process.env.SOLANA_RPC_URL??"https://api.mainnet-beta.solana.com",
 watchWallets:(process.env.WATCH_WALLETS??"").split(",").map(x=>x.trim()).filter(Boolean)
});
if(config.mode!=="paper")throw new Error("Only MODE=paper is supported. Live trading is disabled.");
if(config.startBalanceUsd<=0||config.riskPerTradePct<=0)throw new Error("Balance and risk settings are outside safe bounds.");
if(config.xApiEnabled&&!config.xBearerToken)throw new Error("X_API_ENABLED=true requires X_BEARER_TOKEN.");
