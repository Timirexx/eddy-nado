import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  injectedWallet,
  metaMaskWallet,
  rabbyWallet,
  phantomWallet,
  coinbaseWallet,
  rainbowWallet,
  trustWallet,
  okxWallet,
  zerionWallet,
  uniswapWallet,
  bitgetWallet,
  safeWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { ink, mainnet } from 'wagmi/chains';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

export const hasWalletConnect = Boolean(projectId);

// Without a projectId, RainbowKit silently substitutes a shared public demo
// projectId whose relay is rate-limited to the point of being unusable. Every
// WalletConnect route then fails with no visible error: the wallet simply
// never receives the request and never opens. Injected wallets are unaffected
// — they talk to the extension directly and never touch WalletConnect.
if (!hasWalletConnect) {
  console.warn(
    '[eddy] No VITE_WALLETCONNECT_PROJECT_ID set. Only browser-extension ' +
      'wallets are offered; QR-code and mobile wallets are hidden because ' +
      'they cannot connect without a project ID. Get a free one at ' +
      'https://cloud.reown.com, then add it to .env (see .env.example) and to ' +
      'your Vercel environment variables.',
  );
}

// Extension wallets reach the browser through the injected provider, so they
// work with or without WalletConnect. injectedWallet ("Browser Wallet") is
// first because it connects to whatever extension owns window.ethereum, which
// is the reliable path when several extensions compete for it and the branded
// connectors fail to detect themselves.
const installedWallets = {
  groupName: 'Installed',
  wallets: [injectedWallet, metaMaskWallet, rabbyWallet, phantomWallet, coinbaseWallet],
};

// These reach the wallet over the WalletConnect relay, so they are only
// listed when a real projectId exists. Offering them without one produces a
// dead end: the user picks a wallet, nothing opens, and no error explains why.
const walletConnectWallets = {
  groupName: 'More wallets',
  wallets: [
    rainbowWallet,
    trustWallet,
    okxWallet,
    zerionWallet,
    uniswapWallet,
    bitgetWallet,
    safeWallet,
    walletConnectWallet,
  ],
};

export const config = getDefaultConfig({
  appName: 'Eddy for Nado',
  projectId: projectId || 'YOUR_PROJECT_ID',
  chains: [ink, mainnet],
  ssr: false,
  wallets: hasWalletConnect ? [installedWallets, walletConnectWallets] : [installedWallets],
});
