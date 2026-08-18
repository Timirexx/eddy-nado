import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { ink, mainnet } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Eddy for Nado',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [ink, mainnet],
  ssr: false,
});
