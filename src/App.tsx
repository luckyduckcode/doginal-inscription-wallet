import React, { useState, useEffect } from 'react';
import './App.css';
import WalletOnboarding from './components/WalletOnboarding';
import FundingGuide from './components/FundingGuide';
import QuickStartGuide from './components/QuickStartGuide';
import WalletDashboard from './components/WalletDashboard';
import InscriptionCreator from './components/InscriptionCreator';
import InscriptionHistory from './components/InscriptionHistory';
import InscriptionViewer from './components/InscriptionViewer';
import SendDoge from './components/SendDoge';
import SendInscription from './components/SendInscription';
import Receive from './components/Receive';
import { WalletConfig, WalletBalance, WalletAddress } from './types';
/// <reference path="./types/index.ts" />

interface AppState {
  hasWallet: boolean;
  isConnected: boolean;
  walletConfig: WalletConfig | null;
  balance: WalletBalance | null;
  addresses: WalletAddress[];
  currentAddress: string;
  activeTab: 'dashboard' | 'create' | 'history' | 'viewer' | 'send-doge' | 'send-inscription' | 'receive';
  userSeed?: string;
  showFundingGuide: boolean;
  showQuickStartGuide: boolean;
}

function App() {
  const [state, setState] = useState<AppState>({
    hasWallet: false,
    isConnected: false,
    walletConfig: null,
    balance: null,
    addresses: [],
    currentAddress: '',
    activeTab: 'dashboard',
    showFundingGuide: false,
    showQuickStartGuide: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if we're running in Electron
  const isElectron = window.electronAPI !== undefined;

  useEffect(() => {
    if (!isElectron) {
      setError('This application requires Electron to run properly.');
    }
  }, [isElectron]);

  const handleWalletCreated = (addresses: WalletAddress[], seed?: string) => {
    setState((prev: AppState) => ({
      ...prev,
      hasWallet: true,
      addresses,
      currentAddress: addresses[0]?.address || '',
      userSeed: seed,
      showFundingGuide: true
    }));
  };

  const handleFundingComplete = () => {
    setState((prev: AppState) => ({
      ...prev,
      showFundingGuide: false,
      showQuickStartGuide: true
    }));
  };

  const handleFundingSkip = () => {
    setState((prev: AppState) => ({
      ...prev,
      showFundingGuide: false,
      showQuickStartGuide: true
    }));
  };

  const handleQuickStartDismiss = () => {
    setState((prev: AppState) => ({ ...prev, showQuickStartGuide: false }));
  };

  const handleConnect = async (config: WalletConfig) => {
    if (!isElectron) return;
    
    setLoading(true);
    setError(null);
    
    console.log('Connecting to Electrum server:', config);
    
    try {
      const result = await window.electronAPI.connectWallet(config);
      console.log('Connection result:', result);
      
      if (result.success) {
        console.log('Successfully connected to Electrum server');
        
        // Update balance for current address
        let balance: WalletBalance | null = null;
        if (state.currentAddress) {
          console.log('Fetching balance for address:', state.currentAddress);
          const balanceResult = await window.electronAPI.getBalance(state.currentAddress);
          console.log('Balance result:', balanceResult);
          
          if (balanceResult.success && balanceResult.balance) {
            balance = balanceResult.balance;
            console.log('Balance retrieved:', balance);
          } else {
            console.error('Failed to get balance:', balanceResult.error);
            // Keep balance as null, but don't overwrite if there was a previous balance
            balance = state.balance; // Preserve existing balance if any
          }
        }
        
        setState((prev: AppState) => ({
          ...prev,
          isConnected: true,
          walletConfig: config,
          balance
        }));
      } else {
        console.error('Connection failed:', result.error);
        setError(result.error || 'Failed to connect to wallet');
      }
    } catch (err) {
      console.error('Connection error:', err);
      setError('Connection failed. Please check your configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    setState({
      hasWallet: false,
      isConnected: false,
      walletConfig: null,
      balance: null,
      addresses: [],
      currentAddress: '',
      activeTab: 'dashboard',
      showFundingGuide: false,
      showQuickStartGuide: false
    });
  };

  const refreshBalance = async () => {
    if (!isElectron || !state.currentAddress) {
      console.log('Cannot refresh balance: electron not available or no current address');
      return;
    }

    console.log('Refreshing balance for address:', state.currentAddress);

    try {
      const result = await window.electronAPI.getBalance(state.currentAddress);
      console.log('Balance result:', result);

      if (result.success && result.balance) {
        console.log('Setting balance to:', result.balance);
        setState((prev: AppState) => ({ 
          ...prev, 
          balance: result.balance 
        }));
        console.log('Balance updated successfully');
      } else {
        console.error('Balance refresh failed:', result.error);
        // Don't clear existing balance on error, just log it
        console.log('Keeping existing balance due to error');
      }
    } catch (err) {
      console.error('Failed to refresh balance:', err);
      // Don't clear existing balance on error
    }
  };

  const handleTabChange = (tab: 'dashboard' | 'create' | 'history' | 'viewer' | 'send-doge' | 'send-inscription' | 'receive') => {
    setState((prev: AppState) => ({ ...prev, activeTab: tab }));
  };

  if (!isElectron) {
    return (
      <div className="app-error">
        <h1>Doginal Inscription Wallet</h1>
        <p>This application requires Electron to run properly.</p>
        <p>Please run: <code>npm run electron:dev</code></p>
      </div>
    );
  }

  if (!state.isConnected) {
    return (
      <div className="App">
        <WalletOnboarding
          onWalletReady={handleWalletCreated}
          onConnect={handleConnect}
        />
      </div>
    );
  }

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <h1>🐕 Doginal Inscription Wallet 🚀</h1>
          <button className="disconnect-btn" onClick={handleDisconnect}>
            Disconnect 😢
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
          className={`nav-btn ${state.activeTab === 'receive' ? 'active' : ''}`}
          onClick={() => handleTabChange('receive')}
        >
          📥 Receive
        </button>
        <button 
          className={`nav-btn ${state.activeTab === 'send-doge' ? 'active' : ''}`}
          onClick={() => handleTabChange('send-doge')}
        >
          💰 Send DOGE
        </button>
        <button 
          className={`nav-btn ${state.activeTab === 'send-inscription' ? 'active' : ''}`}
          onClick={() => handleTabChange('send-inscription')}
        >
          🎨 Send Inscription
        </button>
        <button 
          className={`nav-btn ${state.activeTab === 'create' ? 'active' : ''}`}
          onClick={() => handleTabChange('create')}
        >
          ✍️ Create Inscription
        </button>
        <button 
          className={`nav-btn ${state.activeTab === 'viewer' ? 'active' : ''}`}
          onClick={() => handleTabChange('viewer')}
        >
          🔍 Find Inscriptions
        </button>
        <button 
          className={`nav-btn ${state.activeTab === 'history' ? 'active' : ''}`}
          onClick={() => handleTabChange('history')}
        >
          📚 History
        </button>
      </nav>

      <main className="app-main">
        {state.activeTab === 'dashboard' && (
          <WalletDashboard 
            balance={state.balance}
            currentAddress={state.currentAddress}
            onRefresh={refreshBalance}
          />
        )}
        
        {state.activeTab === 'receive' && (
          <Receive 
            currentAddress={state.currentAddress}
            addresses={state.addresses.map(addr => addr.address)}
            balance={state.balance}
            onRefresh={refreshBalance}
          />
        )}
        
        {state.activeTab === 'send-doge' && (
          <SendDoge 
            currentAddress={state.currentAddress}
            balance={state.balance}
            onSuccess={() => {
              refreshBalance();
              handleTabChange('dashboard');
            }}
          />
        )}
        
        {state.activeTab === 'send-inscription' && (
          <SendInscription 
            currentAddress={state.currentAddress}
            balance={state.balance}
            onSuccess={() => {
              refreshBalance();
              handleTabChange('dashboard');
            }}
          />
        )}
        
        {state.activeTab === 'create' && (
          <InscriptionCreator 
            currentAddress={state.currentAddress}
            balance={state.balance}
            onSuccess={() => {
              refreshBalance();
              handleTabChange('history');
            }}
          />
        )}
        
        {state.activeTab === 'viewer' && (
          <InscriptionViewer 
            currentAddress={state.currentAddress} 
            addresses={state.addresses.map(addr => addr.address)}
          />
        )}
        
        {state.activeTab === 'history' && (
          <InscriptionHistory />
        )}
      </main>

      <footer className="app-footer">
        <p>Doginal Inscription Wallet v1.0.0 | 2 🐕 DOGE tax per inscription 💰 | Much Wow! 🚀</p>
      </footer>

      {state.showFundingGuide && state.currentAddress && (
        <FundingGuide
          walletAddress={state.currentAddress}
          onComplete={handleFundingComplete}
          onSkip={handleFundingSkip}
        />
      )}

      {state.showQuickStartGuide && (
        <QuickStartGuide
          onDismiss={handleQuickStartDismiss}
        />
      )}
    </div>
  );
}

export default App;
