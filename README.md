# Eddy for Nado

An AI trading assistant for [Nado](https://docs.nado.xyz) — a central-limit orderbook DEX on Ink (an Ethereum L2) offering spot and perpetuals under unified margin.

Eddy answers questions about how Nado works, trading concepts, market structure, and risk management, and can read charts, positions, and error messages that users paste in. It is grounded in Nado's own documentation, and is explicit about the difference between Nado-specific facts, general trading knowledge, and things it cannot know.

Live at **[eddy-nado.vercel.app](https://eddy-nado.vercel.app)**.

## How it works

```
Browser (React + Vite)
  │  POST /api/chat  — conversation + any attached images
  ▼
Vercel serverless function
  │  Claude Opus 5, streamed back as Server-Sent Events
  │  System prompt = Eddy's instructions + Nado's docs (~54K tokens, cached)
  ▼
Browser renders the stream as markdown
```

**Grounding.** `scripts/fetch-docs.mjs` pulls Nado's `llms-full.txt` and keeps the conceptual half — margin, liquidations, fees, funding, order types, market parameters, FAQs — stopping before the SDK reference, which is mostly code samples a trading assistant never needs. That corpus goes into the system prompt behind a cache breakpoint, so it is written to cache once and read at roughly a tenth of the price on every message after.

**Wallet.** RainbowKit + wagmi, restricted to Ink (chain 57073) so a wallet on any other network is prompted to switch rather than silently connecting somewhere Nado doesn't exist.

## Setup

```bash
npm install
```

Copy `.env.example` to `.env` and fill in:

- `ANTHROPIC_API_KEY` — from [console.anthropic.com](https://console.anthropic.com/settings/keys). Server-side only; note the deliberate absence of a `VITE_` prefix, since that prefix would inline the key into the browser bundle.
- `VITE_WALLETCONNECT_PROJECT_ID` — from [cloud.reown.com](https://cloud.reown.com). Public identifier, safe in the bundle.

Both must also be set in the Vercel project's environment variables for the deployment to work.

## Running

```bash
npm run dev
```

Vite alone serves the front end but **not** the `/api` functions, so the chat returns 404s. To exercise the whole thing locally, use the Vercel CLI, which runs both:

```bash
vercel dev
```

## Refreshing the knowledge base

Nado's parameters change — fee tiers, margin requirements, listed markets. Re-run this and redeploy to pick up the current docs:

```bash
node scripts/fetch-docs.mjs
```

It regenerates `api/_nado-knowledge.js` and stamps the retrieval date, which Eddy cites when a stale figure would matter.

## Layout

| Path | What it holds |
| --- | --- |
| `api/chat.js` | Streaming endpoint: validation, image handling, refusal and error paths |
| `api/_system-prompt.js` | Eddy's instructions and the cache breakpoint |
| `api/_nado-knowledge.js` | Generated — do not edit by hand |
| `scripts/fetch-docs.mjs` | Rebuilds the knowledge base from Nado's docs |
| `src/useChat.js` | Conversation state and the SSE reader |
| `src/wagmi.js` | Wallet config, Ink-only |

## Known gaps

- **No live market or account data.** Eddy reads the docs and whatever the user tells it; it cannot see prices, funding, or balances. Connecting Nado's indexer would let it answer "am I near liquidation?" with real numbers.
- **Rate limiting counts per instance by default.** `/api/chat` is limited per IP with an optional global daily cap, but without a shared store each serverless instance keeps its own counter, so the real limit is looser than configured. Create a KV store in the Vercel dashboard — `KV_REST_API_URL` and `KV_REST_API_TOKEN` are injected automatically and the limiter picks them up with no code change.
- **The sidebar account panel is sample data**, shown once a wallet connects. It is not wired to Nado.
- **Conversations are not persisted** — a reload clears the thread.
