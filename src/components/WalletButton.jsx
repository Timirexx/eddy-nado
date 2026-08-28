import { ConnectButton } from '@rainbow-me/rainbowkit';
import { WalletIcon } from './icons.jsx';

/**
 * The wallet control, shared by the desktop top bar and the mobile header so
 * both surfaces get identical connect / wrong-network / connected behaviour
 * from one place. `compact` only shortens the label — on a phone the full
 * "Connect Wallet" pushes the header into a second line.
 */
export default function WalletButton({ compact = false }) {
  return (
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
                {compact ? 'Connect' : 'Connect Wallet'}
              </button>
            ) : chain.unsupported ? (
              <button type="button" className="wallet-btn wrong-network" onClick={openChainModal}>
                {compact ? 'Wrong net' : 'Switch to Ink'}
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
  );
}
