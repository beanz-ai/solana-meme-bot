# Solana Meme Bot

A paper-trading-first Solana token discovery and monitoring prototype.

## Safety defaults

- **Paper mode only.** The app exits if `MODE` is anything other than `paper`.
- No private keys, seed phrases, wallet signing, swaps, token launches, rug-pull controls, fake volume or deceptive trading.
- Wallet monitoring is read-only and uses public Solana address activity.
- Missing security evidence blocks a candidate. Passing screening does not guarantee safety.
- Prices, liquidity and simulated fills are estimates, not executable quotes.

## Features

- Recent Solana token-profile discovery through DexScreener.
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

## Configuration

The default paper account starts at US$2, risks at most 20% of available paper cash per position and allows one open position. Default filters require US$10,000 liquidity, US$1,000 hourly volume, 15 hourly transactions, RugCheck score no higher than 25, and reported LP lock of at least 80%. The estimated round-trip fee/slippage ceiling is 5%.

A US$2 live account is not recommended: network fees, priority fees, pool fees and slippage can consume a large fraction of such a small trade. This repository deliberately contains no live execution path.

## Important limitations

Provider APIs can change, return incomplete data, rate-limit requests or be unavailable. The bot screens only the evidence it receives; it does not decode every Solana program or prove a token is safe. Rug pulls and rapid liquidity withdrawals can still happen. Treat every candidate as high risk and do not rely on a score as investment advice.

The first version is an MVP for testing data flow and strategy logic. Validate provider schemas, historical performance, execution costs and security assumptions before considering any separate live-trading system.
