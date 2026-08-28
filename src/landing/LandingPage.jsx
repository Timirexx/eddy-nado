import EddyRobot from './EddyRobot.jsx';
import { EddyMark } from '../components/icons.jsx';
import './landing.css';

const FEATURES = [
  {
    title: 'Ask anything',
    body: 'Margin, liquidations, funding, order types — or how to place your first trade.',
    icon: (
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M3 4h14v9H7l-4 4V4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Grounded in Nado docs',
    body: "Answers come from Nado's official documentation, not guesswork.",
    icon: (
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M10 3 2.5 6.5 10 10l7.5-3.5L10 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M5 8.5v4.2c0 .6 2.2 2.3 5 2.3s5-1.7 5-2.3V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Reads your charts',
    body: 'Paste a screenshot of a chart, position, or error and ask about it.',
    icon: (
      <svg viewBox="0 0 20 20" fill="none">
        <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 13.5 8 10l3 2.5 2.5-2 2.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Says when it does not know',
    body: "It admits a gap rather than inventing a number you'd trade on.",
    icon: (
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M10 2.5 16.5 5.5V10c0 4.6-3.4 7-6.5 7.5C6.9 17 3.5 14.6 3.5 10V5.5L10 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="m7.5 10 1.8 1.8L13 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const EXAMPLES = [
  'What is unified margin and how does it differ from isolated?',
  'How do liquidations work, and what does one cost me?',
  'Explain funding rates — who pays whom, and how often?',
  'Which order type should I use to avoid taker fees?',
  "Here's my chart — what's the structure telling me?",
  'How do maker rebates work at higher volume tiers?',
];

export default function LandingPage({ onEnter }) {
  return (
    <div className="landing">
      <div className="landing-atmosphere" aria-hidden="true" />

      <header className="landing-nav">
        <a className="landing-brand" href="#top">
          <EddyMark className="landing-brand-mark" />
          <span>
            <span className="landing-brand-name">Eddy</span>
            <span className="landing-brand-tag">Copilot for Nado</span>
          </span>
        </a>
        <button type="button" className="btn btn-primary btn-sm" onClick={onEnter}>
          Start chatting
          <ChatGlyph />
        </button>
      </header>

      <main className="landing-hero" id="top">
        <div className="hero-copy">
          <span className="hero-badge">
            <SparkGlyph />
            AI assistant for Nado
          </span>
          <h1 className="hero-title">
            Your AI assistant for
            <br />
            <span className="hero-accent">everything Nado.</span>
          </h1>
          <p className="hero-sub">
            Ask anything about Nado — margin, liquidations, fees, funding, order types — plus
            trading concepts, market structure, and the chart you just screenshotted.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary" onClick={onEnter}>
              Start chatting
              <ChatGlyph />
            </button>
            <a className="btn btn-ghost" href="#what-you-can-ask">
              See what it can do
            </a>
          </div>
          <p className="hero-note">
            No sign-up. Connect a wallet only when you want account context.
          </p>
        </div>

        <div className="hero-robot">
          <EddyRobot />
        </div>
      </main>

      <section className="feature-strip">
        {FEATURES.map((f) => (
          <div className="feature" key={f.title}>
            <span className="feature-icon">{f.icon}</span>
            <div>
              <h2 className="feature-title">{f.title}</h2>
              <p className="feature-body">{f.body}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="examples" id="what-you-can-ask">
        <h2 className="section-title">What you can ask</h2>
        <p className="section-sub">
          Eddy reads Nado's documentation for platform specifics and answers general trading
          questions from its own knowledge — and it tells you which is which.
        </p>
        <div className="example-grid">
          {EXAMPLES.map((q) => (
            <button type="button" className="example" key={q} onClick={onEnter}>
              <span className="example-q">{q}</span>
              <ArrowGlyph />
            </button>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <p>
          Eddy explains Nado and trading concepts. It has no market data or account access, and
          doesn't give financial advice.
        </p>
        <button type="button" className="btn btn-primary" onClick={onEnter}>
          Start chatting
          <ChatGlyph />
        </button>
      </footer>
    </div>
  );
}

function ChatGlyph() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="btn-glyph">
      <path d="M2.5 3.5h11v7h-6l-3 2.6V3.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function SparkGlyph() {
  return (
    <svg viewBox="0 0 16 16" fill="none">
      <path d="M8 2.2 9.3 6 13 7.3 9.3 8.6 8 12.4 6.7 8.6 3 7.3 6.7 6 8 2.2z" fill="currentColor" />
    </svg>
  );
}

function ArrowGlyph() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="example-arrow">
      <path d="M3 8h9M8.5 4.2 12.5 8l-4 3.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
