# Solana Meme Bot

Paper-trading-first Solana token discovery and monitoring prototype.

## Safety defaults
- Paper mode only; app exits if MODE is not paper.
- No private keys, wallet signing, swaps, launches, rug-pull controls or fake volume.
- Wallet monitoring is read-only. Missing security evidence blocks candidates.
- Prices and simulated fills are estimates; passing screening does not prove safety.

## Trading Intelligence 2.3
- DexScreener discovery, RSS/Atom feeds and optional X search (disabled by default).
- Independent token security and momentum checks; cached RugCheck checks fail closed.
- One open position maximum.
- 15% of account equity is the per-trade risk budget. Position size is calculated using the stop distance plus estimated round-trip fees/slippage, then capped at available cash. No leverage.
- Stop trigger 15%; daily drawdown entry lockout 15%; two consecutive losses lockout; minimum 60-minute post-loss cooldown.
- Two-stage exits: sell 50% at +50%; target +200% on remainder; activate 10% peak trailing exit after +150%.
- Stale prices pause exit evaluation and new entries; the bot does not invent fills.

## Setup
Requires Node.js 20.6 or newer.

```sh
npm test
npm start
```

Do not run the paper reset command during a test. It resets the simulated balance and clears local trade history. Never commit .env or store a seed phrase/private key in the project.

## Risk calculation
Position size = min(available cash, (account equity × 15%) ÷ (15% stop distance + estimated round-trip costs)). With default estimated round-trip costs of 2.6%, a fully funded position is approximately 85% of equity. Actual losses may exceed estimates due to gaps, liquidity loss and slippage; 15% is a target risk budget, not a guaranteed maximum.

## Limitations
The bot cannot prove a token safe. Rug pulls, sudden liquidity withdrawals, API outages and price gaps can cause losses beyond the estimate. Paper trading does not reproduce live latency, priority fees, market impact or execution. This repository deliberately has no live execution path.
