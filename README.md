# Eddy for Nado

UI mockup for **Eddy** — an AI-powered trading copilot for [Nado](https://docs.nado.xyz), a CLOB DEX on Ink L2.

Eddy answers trading questions grounded in Nado's docs and a user's live account state (positions, margin health, funding) — explaining, not executing. It never signs or places trades on its own.

## What's here

`index.html` is a static, interactive front-end mockup: a chat interface with a live-looking account sidebar, source-tagged AI responses (live account data vs. docs), and a glassmorphism visual treatment. The chat responses are pre-written for demo purposes — there's no real model or backend wired up yet.

Open `index.html` directly in a browser to view it.

## Planned backend

- Docs ingestion + RAG pipeline over `docs.nado.xyz`
- Live account reads via Nado's indexer/gateway API
- Chat orchestration layer combining both, with the user always confirming any suggested action
