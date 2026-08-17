import { GroundingIcon, WalletIcon } from './icons.jsx';

export default function TopBar({ title, subtitle, signedIn, onToggleSignIn }) {
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
          className={signedIn ? 'signin-btn connected' : 'signin-btn'}
          onClick={onToggleSignIn}
        >
          {signedIn ? (
            <>
              <span className="dot live" />
              0x8f2c…c91a
            </>
          ) : (
            <>
              <WalletIcon />
              Sign in
            </>
          )}
        </button>
      </div>
    </header>
  );
}
