# Solana Meme Bot

A paper-trading-first Solana token discovery and monitoring prototype.

## Safety defaults

- **Paper mode only.** The app exits if `MODE` is anything other than `paper`.
- No private keys, seed phrases, wallet signing, swaps, token launches, rug-pull controls, fake volume or deceptive trading.
- Wallet monitoring is read-only and uses public Solana address activity.
- Missing security evidence blocks a candidate. Passing screening does not guarantee safety.
- Prices, liquidity and simulated fills are estimates, not executable quotes.
- Social popularity is discovery evidence only and never overrides token safety checks.

## Trading Intelligence 2.1

- Recent Solana token-profile discovery through DexScreener.
- RSS/Atom news and announcement feed monitoring; optional official X recent-post search is disabled by default.
- Independent token-security and momentum checks.
- Bounded token scanning and cached RugCheck reports; HTTP 429 triggers a cooldown and fails closed.
- One open position maximum; position size is capped at 5% of available paper cash.
- Daily drawdown lockout at 3%, two consecutive losses lockout, and at least a 60-minute post-loss cooldown.
- Stop, take-profit, break-even and trailing exit simulations. Stop triggers are not guaranteed fills.
- Stale price data pauses new entries and does not invent a simulated exit price.
- Existing positions are refreshed and managed before the bot scans for new entries.
- Trade journal reports realized/unrealized P/L and drawdown.

## Marriage fund objective

The project can track a separate J$400,000 marriage-fund goal, but this is a target, not a forecast or promise. Only realized net profits after fees count as potential contributions. Trading capital is kept separate, no profit is automatically withdrawn, and wedding savings should not be risked. A paper-trading profit is not real income.

## Setup

Requires Node.js 20.6 or newer.

```sh
npm test
npm run reset-paper
npm start
```

The reset command:
- backs up the existing local `data/state.json` paper history to a timestamped file in `data/`;
- resets the simulated balance and starting baseline to US$20;
- clears open paper positions and old trade history;
- sets `START_BALANCE_USD=20` in the local `.env`.

This does not touch real funds, a wallet or the blockchain. Run it only when you intentionally want a fresh paper test. Do not run it again during the test, or you will reset the results.

On iPad, open this repository in GitHub Codespaces. Never commit `.env`. Never put a seed phrase or private key in the project.

## Configuration

Defaults are conservative: US$20 paper starting balance, 5% maximum paper position, one open position, 3% daily drawdown entry lockout, 60-minute minimum cooldown, at least 75/100 trade signal score, US$15,000 reported liquidity, US$1,500 hourly volume, 20 hourly transactions, RugCheck risk score no higher than 25, and reported LP lock of at least 80%. The app clamps important risk settings so local `.env` values cannot raise position size above 5%, stop-loss trigger above 8%, daily drawdown limit above 3%, or cooldown below 60 minutes.

## Important limitations

Provider APIs can change, return incomplete data, rate-limit requests or be unavailable. The bot screens only the evidence it receives; it does not decode every Solana program or prove a token is safe. Rug pulls, sudden liquidity withdrawals, price gaps and unavailable price feeds can still happen. A simulated stop-loss is not a guaranteed fill. Paper trading does not reproduce real execution, latency, priority fees or market impact.

The $20 balance is simulated only. It does not mean the bot has earned money or that the same strategy will be profitable live. Complete a substantial, independently reviewed paper test and assess results after all modeled costs before considering any separate live-trading system. This repository deliberately contains no live execution path.
