import React, { useState, useEffect } from 'react';
import './App.css';
import WalletOnboarding from './components/WalletOnboarding';
import FundingGuide from './components/FundingGuide';
import QuickStartGuide from './components/QuickStartGuide';
import WalletDashboard from './components/WalletDashboard';
import InscriptionCreator from './components/InscriptionCreator';
import InscriptionHistory from './components/InscriptionHistory';
import { WalletConfig, WalletAddress } from './types';
import { useWallet, useInscription } from './hooks';

/// <reference path="./types/index.ts" />

interface AppState {
  hasWallet: boolean;
  activeTab: 'dashboard' | 'create' | 'history';
  userSeed?: string;
  showFundingGuide: boolean;
  showQuickStartGuide: boolean;
}

function App() {
  // Use new hooks for state management
  const {
    isConnected,
    balance,
    addresses,
    currentAddress,
    loading: walletLoading,
    error: walletError,
    connect,
    disconnect,
    refreshBalance,
    setCurrentAddress
  } = useWallet();

  const {
    creating: inscriptionCreating,
    estimating: inscriptionEstimating,
    history: inscriptionHistory,
    error: inscriptionError,
    progress: inscriptionProgress,
    createInscription,
    estimateInscription,
    loadHistory,
    clearError: clearInscriptionError
  } = useInscription();

  const [state, setState] = useState<AppState>({
    hasWallet: false,
    activeTab: 'dashboard',
    showFundingGuide: false,
    showQuickStartGuide: false
  });

  const [error, setError] = useState<string | null>(null);

  // Check if we're running in Electron
  const isElectron = window.electronAPI !== undefined;

  useEffect(() => {
    if (!isElectron) {
      setError('This application requires Electron to run properly.');
    }
  }, [isElectron]);

  // Load inscription history when component mounts
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleWalletCreated = (addresses: WalletAddress[], seed?: string) => {
    setState((prev: AppState) => ({
      ...prev,
      hasWallet: true,
      userSeed: seed,
      showFundingGuide: addresses.length > 0 && addresses[0].balance.total === 0,
      showQuickStartGuide: !seed // Show guide for imported wallets
    }));

    // Set the first address as current
    if (addresses.length > 0) {
      setCurrentAddress(addresses[0].address);
    }
  };

  const handleWalletConnect = async (config: WalletConfig) => {
    try {
      setError(null);
      const success = await connect(config);
      
      if (success) {
        setState(prev => ({
          ...prev,
          hasWallet: true,
          showFundingGuide: false,
          showQuickStartGuide: false
        }));
      } else {
        setError('Failed to connect to wallet');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setState({
      hasWallet: false,
      activeTab: 'dashboard',
      showFundingGuide: false,
      showQuickStartGuide: false
    });
    setError(null);
  };

  const handleFundingComplete = () => {
    setState(prev => ({ ...prev, showFundingGuide: false }));
    refreshBalance(); // Refresh balance after funding
  };

  const handleTabChange = (tab: 'dashboard' | 'create' | 'history') => {
    setState(prev => ({ ...prev, activeTab: tab }));
    clearInscriptionError(); // Clear any inscription errors when changing tabs
  };

  const handleInscriptionSuccess = () => {
    refreshBalance(); // Refresh balance after inscription
    loadHistory(); // Reload history
    setState(prev => ({ ...prev, activeTab: 'history' })); // Switch to history tab
  };

  // Combine errors from different sources
  const combinedError = error || walletError || inscriptionError;
  const isLoading = walletLoading || inscriptionCreating || inscriptionEstimating;

  if (!isElectron) {
    return (
      <div className="App">
        <div className="app-error">
          <h2>⚠️ Electron Required</h2>
          <p>This application requires Electron to run properly.</p>
          <code>npm run electron:dev</code>
        </div>
      </div>
    );
  }

  if (!state.hasWallet || !isConnected) {
    return (
      <div className="App">
        <WalletOnboarding
          onWalletReady={handleWalletCreated}
          onConnect={handleWalletConnect}
        />
        {combinedError && (
          <div className="app-error">
            <p>{combinedError}</p>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}
      </div>
    );
  }

  if (state.showFundingGuide && currentAddress) {
    return (
      <div className="App">
        <FundingGuide
          walletAddress={currentAddress}
          onComplete={handleFundingComplete}
          onSkip={() => setState(prev => ({ ...prev, showFundingGuide: false }))}
        />
      </div>
    );
  }

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <h1>🐕 Doginal Inscription Wallet</h1>
          <button className="disconnect-btn" onClick={handleDisconnect}>
            🔌 Disconnect
          </button>
        </div>
      </header>

      <nav className="app-nav">
        <button
          className={`nav-btn ${state.activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => handleTabChange('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={`nav-btn ${state.activeTab === 'create' ? 'active' : ''}`}
          onClick={() => handleTabChange('create')}
        >
          📝 Create Inscription
        </button>
        <button
          className={`nav-btn ${state.activeTab === 'history' ? 'active' : ''}`}
          onClick={() => handleTabChange('history')}
        >
          📚 History
        </button>
      </nav>

      <main className="app-main">
        {combinedError && (
          <div className="app-error">
            <p>{combinedError}</p>
            <button onClick={() => {
              setError(null);
              clearInscriptionError();
            }}>
              Dismiss
            </button>
          </div>
        )}

        {inscriptionProgress && (
          <div className="progress-indicator">
            <p>{inscriptionProgress}</p>
          </div>
        )}

        {isLoading && (
          <div className="loading-indicator">
            <p>⏳ {walletLoading ? 'Loading wallet...' : 'Processing inscription...'}</p>
          </div>
        )}

        {state.activeTab === 'dashboard' && (
          <WalletDashboard
            balance={balance}
            currentAddress={currentAddress}
            onRefresh={refreshBalance}
          />
        )}

        {state.activeTab === 'create' && (
          <InscriptionCreator
            currentAddress={currentAddress}
            balance={balance}
            onSuccess={handleInscriptionSuccess}
          />
        )}

        {state.activeTab === 'history' && (
          <InscriptionHistory />
        )}
      </main>

      {state.showQuickStartGuide && (
        <QuickStartGuide
          onDismiss={() => setState(prev => ({ ...prev, showQuickStartGuide: false }))}
        />
      )}
    </div>
  );
}

export default App;
