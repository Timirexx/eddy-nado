import { StrictMode, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@rainbow-me/rainbowkit/styles.css';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { ink } from 'wagmi/chains';
import App from './App.jsx';
import { applyStoredThemeEarly } from './useTheme.js';
import { I18nProvider, applyStoredLocaleEarly } from './i18n/index.jsx';
import LandingPage from './landing/LandingPage.jsx';
import './styles.css';
import { config } from './wagmi.js';

// Before the first paint: a stored light preference would otherwise flash the
// dark palette for a frame while React mounts.
applyStoredThemeEarly();
// Same reasoning for direction: an RTL user would otherwise see one frame of
// left-to-right layout before React mounts.
applyStoredLocaleEarly();

const queryClient = new QueryClient();

const rainbowTheme = darkTheme({
  accentColor: '#F0A93E',
  accentColorForeground: '#14100A',
  borderRadius: 'medium',
  fontStack: 'system',
});

const CHAT_PATH = '/chat';

/**
 * Two routes, no router dependency: the landing page at / and the existing chat
 * app at /chat. Navigation uses the History API so the back button works and a
 * deep link to /chat loads straight into the app (vercel.json rewrites unknown
 * paths to index.html for that to hold on refresh).
 *
 * The app itself is rendered unchanged — this only decides which of the two is
 * on screen.
 */
function Root() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const goToChat = useCallback(() => {
    window.history.pushState({}, '', CHAT_PATH);
    setPath(CHAT_PATH);
    window.scrollTo(0, 0);
  }, []);

  const goToLanding = useCallback(() => {
    window.history.pushState({}, '', '/');
    setPath('/');
    window.scrollTo(0, 0);
  }, []);

  if (path === CHAT_PATH) return <App onGoHome={goToLanding} />;
  return <LandingPage onEnter={goToChat} />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rainbowTheme} initialChain={ink}>
          <I18nProvider>
            <Root />
          </I18nProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
);
