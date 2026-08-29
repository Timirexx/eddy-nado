import { DocsIcon, SparkIcon, ChatIcon, GroundingIcon, WalletIcon, HelpIcon } from './icons.jsx';
import { chips } from '../data/conversation.js';

function Card({ icon: Icon, title, children }) {
  return (
    <section className="docs-card">
      <div className="docs-card-head">
        <span className="docs-card-icon">
          <Icon />
        </span>
        <h3>{title}</h3>
      </div>
      <div className="docs-card-body">{children}</div>
    </section>
  );
}

const FEATURES = [
  'Ask about Nado specifics — margin, liquidations, funding, fees, order types — or general trading concepts',
  'Paste in a chart, order ticket, or error message for Eddy to read',
  'Dictate a question instead of typing, with live voice-to-text',
  'Connect any EVM wallet on Ink to see a live snapshot of your equity, margin usage, and positions',
  'Every conversation is saved automatically and easy to reopen later',
  'A leaderboard ranks activity for anyone who connects a wallet',
  'Replies in 20 languages, chosen in Settings',
  'Light, dark, or system theme — fully responsive on desktop and mobile',
];

const FAQS = [
  {
    q: 'Does Eddy know my exact balance or open positions?',
    a: 'Not in the chat itself. Once you connect a wallet, a live snapshot of your equity, margin usage, and positions shows separately in the sidebar — pulled straight from Nado — but Eddy’s answers don’t use that data yet, so it won’t reference your account in a reply.',
  },
  {
    q: 'Does Eddy give financial advice?',
    a: 'No. It explains how things work — how liquidation price is calculated, what a strategy tends to do — and leaves the decision to you rather than telling you what to trade.',
  },
  {
    q: 'Can Eddy see live prices or funding rates?',
    a: 'No — it has no market data feed. For current numbers, check the Nado app directly; Eddy is best for the mechanics and reasoning around them.',
  },
  {
    q: 'Will connecting my wallet ever let Eddy sign or place a trade?',
    a: 'No. Eddy never initiates a transaction or asks for a signature. Connecting a wallet only identifies you for the leaderboard and unlocks the live account snapshot.',
  },
  {
    q: 'What happens if Eddy doesn’t know something?',
    a: 'It says so, rather than guessing. A wrong but confident-sounding number is worse than an honest "I don’t know" when it’s your money on the line.',
  },
  {
    q: 'Is my chat history private?',
    a: 'Yes — conversations are stored only in your browser (not on a server), so they stay on the device you used to chat.',
  },
  {
    q: 'Do I need to connect a wallet to use Eddy?',
    a: 'No. Chatting works fully without one. Connecting just adds the live account snapshot and a spot on the leaderboard.',
  },
];

export default function EddyDocs({ onBack }) {
  return (
    <div className="docs-page">
      <button type="button" className="docs-back" onClick={onBack}>
        <span aria-hidden="true">‹</span> Back to Settings
      </button>

      <header className="set-header">
        <DocsIcon />
        <div>
          <h2>Eddy Docs</h2>
          <p>A quick guide to what Eddy is, what it can do, and how to get the most out of it.</p>
        </div>
      </header>

      <Card icon={SparkIcon} title="What Eddy is">
        <p>
          Eddy is an AI trading copilot built specifically for Nado, a central-limit orderbook DEX on Ink. It
          answers questions about how Nado works and helps you reason through trading ideas, grounded in Nado's
          own documentation rather than guesswork.
        </p>
      </Card>

      <Card icon={GroundingIcon} title="How Eddy works">
        <p>
          Eddy keeps three kinds of knowledge separate, and tells you which one it's using:
        </p>
        <ul className="docs-list">
          <li><strong>Nado specifics</strong> — answered straight from Nado's documentation, its source of truth.</li>
          <li><strong>General trading knowledge</strong> — funding, order books, position sizing — answered from broader trading knowledge, made clear when it's shifted onto this ground.</li>
          <li><strong>Things it can't know</strong> — live prices, your balances, what a market will do next. Eddy says so plainly instead of inventing an answer.</li>
        </ul>
      </Card>

      <Card icon={ChatIcon} title="What you can ask Eddy">
        <ul className="docs-list">
          {chips.map((c) => (
            <li key={c.label}>{c.prompt}</li>
          ))}
        </ul>
        <p className="docs-note">
          You can also paste in a chart screenshot, an order ticket, or an error message, and Eddy will read
          what's actually on screen before explaining it.
        </p>
      </Card>

      <Card icon={SparkIcon} title="Eddy's main features">
        <ul className="docs-list">
          {FEATURES.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </Card>

      <Card icon={WalletIcon} title="How Eddy helps you use Nado">
        <p>
          Nado has real depth to it — unified margin, liquidation mechanics, funding, fee tiers — and Eddy exists
          to shorten the distance between "I don't understand this" and trading with confidence. Instead of
          digging through docs mid-trade, ask Eddy directly: it'll explain the mechanics, walk through a
          screenshot, or clarify an error message in plain language, so Nado feels less like a black box the
          longer you use it.
        </p>
      </Card>

      <section className="docs-card">
        <div className="docs-card-head">
          <span className="docs-card-icon">
            <HelpIcon />
          </span>
          <h3>FAQs</h3>
        </div>
        <div className="docs-faq">
          {FAQS.map((item) => (
            <div className="docs-faq-item" key={item.q}>
              <div className="docs-faq-q">{item.q}</div>
              <div className="docs-faq-a">{item.a}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
