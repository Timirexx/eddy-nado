export const account = {
  equity: '$12,480.32',
  health: 82,
  positions: [
    { symbol: 'BTC-PERP', side: 'long', pnl: '+$318.20' },
    { symbol: 'ETH-PERP', side: 'short', pnl: '−$96.40' },
  ],
};

export const chips = [
  {
    label: 'What is unified margin?',
    prompt: 'What is unified margin on Nado, and how does it differ from isolated margin?',
  },
  {
    label: 'How do liquidations work?',
    prompt: 'How do liquidations work on Nado? Walk me through what triggers one and what it costs.',
  },
  {
    label: 'Explain funding rates',
    prompt: 'Explain funding rates on Nado perpetuals — how they are calculated and who pays whom.',
  },
  {
    label: 'Order types available',
    prompt: 'What order types can I use on Nado, and when would I reach for each one?',
  },
  {
    label: 'Fees and rebates',
    prompt: 'How does the fee structure work on Nado, including maker rebates and tiers?',
  },
  {
    label: 'Managing liquidation risk',
    prompt:
      'What are the main ways to manage liquidation risk on a leveraged perpetual position? Cover the mechanics rather than telling me what to trade.',
  },
];
