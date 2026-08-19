import { ConnectButton } from '@rainbow-me/rainbowkit';
import { GroundingIcon, WalletIcon } from './icons.jsx';

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
        <ConnectButton.Custom>
          {({ account, chain, openConnectModal, openAccountModal, openChainModal, mounted }) => {
            const ready = mounted;
            const connected = ready && account && chain;

            return (
              <div
                className="wallet-btn-slot"
                {...(!ready && { 'aria-hidden': true, style: { opacity: 0, pointerEvents: 'none' } })}
              >
                {!connected ? (
                  <button type="button" className="wallet-btn" onClick={openConnectModal}>
                    <WalletIcon />
                    Connect Wallet
                  </button>
                ) : chain.unsupported ? (
                  <button type="button" className="wallet-btn wrong-network" onClick={openChainModal}>
                    Switch to Ink
                  </button>
                ) : (
                  <button type="button" className="wallet-btn connected" onClick={openAccountModal}>
                    <span className="dot live" />
                    {account.displayName}
                  </button>
                )}
              </div>
            );
          }}
        </ConnectButton.Custom>
      </div>
    </header>
  );
}
