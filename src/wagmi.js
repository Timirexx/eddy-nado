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

// RainbowKit silently swaps in a shared public demo projectId when this is
// missing. That demo relay is rate-limited to the point of being unusable, so
// QR and mobile connections fail with no visible error. Warn instead of
// letting it fail quietly. Browser-extension wallets are unaffected — they
// connect through the injected provider and never touch WalletConnect.
if (!projectId) {
  console.warn(
    '[eddy] No VITE_WALLETCONNECT_PROJECT_ID set. Browser-extension wallets ' +
      'will still connect, but QR-code and mobile wallet connections will be ' +
      'unreliable. Get a free project ID at https://cloud.reown.com and add it ' +
      'to .env (see .env.example) and to your Vercel environment variables.',
  );
}

export const config = getDefaultConfig({
  appName: 'Eddy for Nado',
  projectId: projectId || 'YOUR_PROJECT_ID',
  chains: [ink, mainnet],
  ssr: false,
  wallets: [
    {
      // injectedWallet connects to whatever extension owns window.ethereum,
      // which is the reliable path when several wallet extensions are fighting
      // over it and the branded connectors fail to detect themselves.
      groupName: 'Installed',
      wallets: [injectedWallet, metaMaskWallet, rabbyWallet, phantomWallet, coinbaseWallet],
    },
    {
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
    },
  ],
});
