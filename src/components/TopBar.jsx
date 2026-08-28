import { GroundingIcon } from './icons.jsx';
import WalletButton from './WalletButton.jsx';

export default function TopBar({ title, subtitle }) {
  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">{title}</div>
        <div className="topbar-sub">{subtitle}</div>
      </div>
      <div className="topbar-actions">
        <span className="grounding-pill">
          <GroundingIcon />
          Grounded in Nado's documentation
        </span>
        <WalletButton />
      </div>
    </header>
  );
}
