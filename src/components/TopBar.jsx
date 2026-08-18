import { GroundingIcon, WalletIcon } from './icons.jsx';

export default function TopBar({ title, subtitle, connected, onToggleConnect }) {
  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">{title}</div>
        <div className="topbar-sub">{subtitle}</div>
      </div>
      <div className="topbar-actions">
        <span className="grounding-pill">
          <GroundingIcon />
          Grounded in Nado docs + live account data
        </span>
        <button
          type="button"
          className={connected ? 'wallet-btn connected' : 'wallet-btn'}
          onClick={onToggleConnect}
        >
          {connected ? (
            <>
              <span className="dot live" />
              0x8f2c…c91a
            </>
          ) : (
            <>
              <WalletIcon />
              Connect Wallet
            </>
          )}
        </button>
      </div>
    </header>
  );
}
