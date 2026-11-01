# Solana Meme Bot

A paper-trading-first Solana token discovery and monitoring prototype.

## Safety defaults

- **Paper mode only.** The app exits if `MODE` is anything other than `paper`.
- No private keys, seed phrases, wallet signing, swaps, token launches, rug-pull controls, fake volume or deceptive trading.
- Wallet monitoring is read-only and uses public Solana address activity.
- Missing security evidence blocks a candidate. Passing screening does not guarantee safety.
- Prices, liquidity and simulated fills are estimates, not executable quotes.
- Social popularity is discovery evidence only and never overrides token safety checks.

## Features

- Recent Solana token-profile discovery through DexScreener.
- Free RSS news and announcement feed monitoring, configurable through `SOCIAL_RSS_FEEDS`.
- Optional official X recent-post search integration, disabled by default and protected by a daily post-read cap.
- Social posts can surface Solana mint addresses; those addresses are independently checked through DexScreener and RugCheck.
- Pair data retrieval and liquidity/volume/activity filters.
- RugCheck report retrieval with fail-closed checks for risk score, reported locked liquidity, holder concentration, mint authority and freeze authority.
- Simulated entries, price marks, stop-loss and take-profit exits.
- Position sizing, one-position limit, daily drawdown guard and estimated cost ceiling.
- Read-only public wallet signature monitoring.
- Local state persistence and automated unit tests.

## Setup

Requires Node.js 20.6 or newer.

```sh
cp .env.example .env
npm test
npm start
```

On iPad, open this repository in GitHub Codespaces. Create `.env` from `.env.example` in the Codespaces editor, then run the commands in its terminal. Never commit `.env`.

## Social discovery configuration

RSS scanning is active by default and runs every 15 minutes. Default feeds are CoinDesk and Cointelegraph. You can replace/add comma-separated public RSS/Atom feed URLs with `SOCIAL_RSS_FEEDS`.

X integration is prepared but off by default:
- Create an app in the official X Developer Console and obtain an app bearer token.
- Set `X_API_ENABLED=true` and `X_BEARER_TOKEN` in your private Codespaces `.env` file.
- Keep `X_MAX_POSTS_PER_DAY` low. The default is 20 returned posts per UTC day.
- X recent search covers the previous seven days. X currently uses pay-per-use billing; consult its live pricing before enabling. A rough current published rate is US$0.005 per post read, so 20 returned posts could cost around US$0.10. Actual billing and taxes can differ.

Never put the bearer token in source code, GitHub commits, screenshots or chat. Do not enable X until the account's API billing and usage cap are understood.

Social posts without a Solana mint address are logged as leads only; the bot does not guess contract addresses from tickers or names. A discovered address still has to pass all existing independent market and security checks. RSS feeds can be delayed, promotional or inaccurate.

## Configuration

The default paper account starts at US$2, risks at most 20% of available paper cash per position and allows one open position. Default filters require US$10,000 liquidity, US$1,000 hourly volume, 15 hourly transactions, RugCheck score no higher than 25, and reported LP lock of at least 80%. The estimated round-trip fee/slippage ceiling is 5%.

A US$2 live account is not recommended: network fees, priority fees, pool fees and slippage can consume a large fraction of such a small trade. This repository deliberately contains no live execution path.

## Important limitations

Provider APIs can change, return incomplete data, rate-limit requests or be unavailable. The bot screens only the evidence it receives; it does not decode every Solana program or prove a token is safe. Rug pulls and rapid liquidity withdrawals can still happen. Treat every candidate as high risk and do not rely on a score as investment advice.

The first version is an MVP for testing data flow and strategy logic. Validate provider schemas, historical performance, execution costs and security assumptions before considering any separate live-trading system.
