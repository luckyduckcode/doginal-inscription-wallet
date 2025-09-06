import React, { useState } from 'react';
import { WalletAddress } from '../types';

interface WalletSetupProps {
  onWalletCreated: (addresses: WalletAddress[], seed?: string) => void;
  onCancel: () => void;
}

const WalletSetup: React.FC<WalletSetupProps> = ({ onWalletCreated, onCancel }) => {
  const [mode, setMode] = useState<'choice' | 'create' | 'import'>('choice');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seedPhrase, setSeedPhrase] = useState('');
  const [importSeed, setImportSeed] = useState('');
  const [showSeed, setShowSeed] = useState(false);

  const handleCreateNewWallet = async () => {
    if (!window.electronAPI) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await window.electronAPI.createWallet();
      
      if (result.success && result.seed && result.addresses) {
        setSeedPhrase(result.seed);
        setMode('create');
      } else {
        setError(result.error || 'Failed to create wallet');
      }
    } catch (err) {
      setError('Failed to create wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleImportWallet = async () => {
    if (!window.electronAPI || !importSeed.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await window.electronAPI.importWallet(importSeed.trim());
      
      if (result.success && result.addresses) {
        onWalletCreated(result.addresses);
      } else {
        setError(result.error || 'Failed to import wallet');
      }
    } catch (err) {
      setError('Failed to import wallet');
    } finally {
      setLoading(false);
    }
  };

  const confirmNewWallet = () => {
    // In a real implementation, you'd verify the user has backed up their seed
    if (seedPhrase) {
      // Get addresses from the created wallet
      window.electronAPI.getAddresses().then(result => {
        if (result.success && result.addresses) {
          onWalletCreated(result.addresses, seedPhrase);
        }
      });
    }
  };

  const copySeedToClipboard = () => {
    navigator.clipboard.writeText(seedPhrase).then(() => {
      alert('Seed phrase copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy seed phrase');
    });
  };

  if (mode === 'choice') {
    return (
      <div className="wallet-connect">
        <h2>🐕 Setup Your Dogecoin Wallet</h2>
        <p>Create a new wallet or import an existing one to start using Doginal inscriptions</p>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
          <button 
            className="btn-primary"
            onClick={handleCreateNewWallet}
            disabled={loading}
            style={{ background: '#4CAF50' }}
          >
            {loading ? (
              <div className="loading">
                <div className="spinner"></div>
                Creating Wallet...
              </div>
            ) : (
              '🆕 Create New Wallet'
            )}
          </button>
          
          <button 
            className="btn-primary"
            onClick={() => setMode('import')}
            style={{ background: '#2196F3' }}
          >
            📥 Import Existing Wallet
          </button>
        </div>

        <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
          <p><strong>New to Dogecoin?</strong> Choose "Create New Wallet"</p>
          <p><strong>Have a seed phrase?</strong> Choose "Import Existing Wallet"</p>
        </div>

        <button 
          onClick={onCancel}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '1rem'
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="wallet-connect">
        <h2>🔐 Your New Wallet Seed Phrase</h2>
        
        <div style={{ 
          background: '#ff9800', 
          color: 'white', 
          padding: '1rem', 
          borderRadius: '8px', 
          marginBottom: '1rem',
          fontWeight: 'bold'
        }}>
          ⚠️ CRITICAL: Write down this seed phrase and store it safely!
        </div>

        <div style={{
          background: 'rgba(0,0,0,0.3)',
          padding: '1.5rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontFamily: 'monospace',
          fontSize: '1.1rem',
          wordSpacing: '0.5rem',
          lineHeight: '1.8',
          filter: showSeed ? 'none' : 'blur(4px)',
          cursor: showSeed ? 'text' : 'pointer'
        }}>
          {seedPhrase}
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <button
            onClick={() => setShowSeed(!showSeed)}
            style={{
              background: showSeed ? '#ff6b6b' : '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {showSeed ? '🙈 Hide Seed' : '👁️ Show Seed'}
          </button>
          
          <button
            onClick={copySeedToClipboard}
            style={{
              background: '#2196F3',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            📋 Copy Seed
          </button>
        </div>

        <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '2rem' }}>
          <p><strong>Important:</strong></p>
          <ul style={{ textAlign: 'left' }}>
            <li>This seed phrase is your wallet backup</li>
            <li>Anyone with this phrase can access your DOGE</li>
            <li>Store it offline in a safe place</li>
            <li>Never share it with anyone</li>
          </ul>
        </div>

        <button 
          className="btn-primary"
          onClick={confirmNewWallet}
          style={{ marginBottom: '1rem' }}
        >
          ✅ I've Safely Stored My Seed Phrase
        </button>

        <button 
          onClick={() => setMode('choice')}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ← Back
        </button>
      </div>
    );
  }

  if (mode === 'import') {
    return (
      <div className="wallet-connect">
        <h2>📥 Import Existing Wallet</h2>
        <p>Enter your 12 or 24-word seed phrase to restore your wallet</p>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="import-seed">Seed Phrase</label>
          <textarea
            id="import-seed"
            value={importSeed}
            onChange={(e) => setImportSeed(e.target.value)}
            placeholder="Enter your seed phrase (12 or 24 words separated by spaces)"
            rows={4}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              resize: 'vertical',
              fontFamily: 'monospace'
            }}
          />
        </div>

        <button 
          className="btn-primary"
          onClick={handleImportWallet}
          disabled={loading || !importSeed.trim()}
          style={{ marginBottom: '1rem' }}
        >
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              Importing Wallet...
            </div>
          ) : (
            '📥 Import Wallet'
          )}
        </button>

        <button 
          onClick={() => setMode('choice')}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          ← Back
        </button>

        <div style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '1rem' }}>
          <p><strong>Security tip:</strong> Make sure you're in a private location when entering your seed phrase.</p>
        </div>
      </div>
    );
  }

  return null;
};

export default WalletSetup;
