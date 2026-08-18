export const account = {
  equity: '$12,480.32',
  health: 82,
  positions: [
    { symbol: 'BTC-PERP', side: 'long', pnl: '+$318.20' },
    { symbol: 'ETH-PERP', side: 'short', pnl: '−$96.40' },
  ],
};

export const initialMessages = [
  {
    id: 'm1',
    role: 'user',
    paragraphs: ['Am I at risk of liquidation on my ETH short?'],
  },
  {
    id: 'm2',
    role: 'ai',
    paragraphs: [
      'Not right now. Your ETH-PERP short is holding **82% margin health** — comfortably clear of liquidation.',
    ],
    stats: [
      { label: 'Position', value: '1.1 ETH short' },
      { label: 'Liq. price', value: '$3,940' },
      { label: 'Mark price', value: '$3,174' },
      { label: 'Funding (8h)', value: '0.006%' },
    ],
    followUp: 'If ETH breaks above $3,600, health drops to roughly 54%. Want me to model adding margin or trimming size?',
    source: { kind: 'live', label: 'Live · subaccount 0x8f2c…c91a' },
  },
  {
    id: 'm3',
    role: 'user',
    paragraphs: ["what's unified margin again"],
  },
  {
    id: 'm4',
    role: 'ai',
    paragraphs: [
      "It pools your whole account — spot, perps, and future asset types — into one collateral base. A spot ETH holding can offset your ETH-PERP short, so you're not posting margin twice for related risk.",
      "That's different from **isolated margin**, where each position keeps its own collateral and nothing crosses over.",
    ],
    source: { kind: 'docs', label: 'Nado Docs · Margin Types' },
  },
];

export const chips = [
  { label: 'Explain funding rate', prompt: 'Walk me through the funding rate on ETH-PERP right now.' },
  { label: 'Compare margin types', prompt: 'Compare unified margin and isolated margin for a basis trade.' },
  { label: 'Draft a hedge', prompt: 'Draft a hedge for my ETH-PERP short using spot BTC.' },
  { label: 'How do Builder Codes work?', prompt: 'How do Builder Codes work and how would I register one?' },
];

export const cannedReplies = [
  {
    paragraphs: [
      'ETH-PERP funding is currently **0.006% / 8h**, paid by shorts to longs — the market is mildly long-skewed right now.',
      'On your 1.1 ETH short, that costs about **$1.90** every 8 hours at the current mark.',
    ],
    source: { kind: 'live', label: 'Live · ETH-PERP funding feed' },
  },
  {
    paragraphs: [
      '**Unified margin** nets related positions together — a spot BTC hold can offset a BTC-PERP short, reducing total margin required.',
      "**Isolated margin** keeps each position walled off with its own collateral, so a loss on one can't touch another — useful for capping risk on a single high-conviction trade.",
    ],
    source: { kind: 'docs', label: 'Nado Docs · Margin Types' },
  },
  {
    paragraphs: [
      'One option: hold your existing 1.1 ETH short and add a small spot BTC position sized to your recent BTC-PERP long, tightening the net delta on the account rather than closing anything outright.',
      'I can lay out the exact size if you tell me how much of the ETH exposure you want left open.',
    ],
    source: { kind: 'live', label: 'Live · portfolio composition' },
  },
  {
    paragraphs: [
      'Builder Codes attribute trades to your app — register to get a 16-bit Builder ID, then include it and your fee rate in the order appendix when you place trades. A cut of the fee routes to you automatically.',
      'Fees accrue on-chain; you claim them periodically to your subaccount, then withdraw.',
    ],
    source: { kind: 'docs', label: 'Nado Docs · Builder Integration' },
  },
];
