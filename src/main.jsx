import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@rainbow-me/rainbowkit/styles.css';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { ink } from 'wagmi/chains';
import App from './App.jsx';
import './styles.css';
import { config } from './wagmi.js';

const queryClient = new QueryClient();

const rainbowTheme = darkTheme({
  accentColor: '#F0A93E',
  accentColorForeground: '#14100A',
  borderRadius: 'medium',
  fontStack: 'system',
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rainbowTheme} initialChain={ink}>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
);
