import React, { useState } from 'react';
import { WalletAddress } from '../types';

interface WalletOnboardingProps {
  onWalletReady: (addresses: WalletAddress[], seed?: string) => void;
  onConnect: (config: any) => void;
}

const WalletOnboarding: React.FC<WalletOnboardingProps> = ({ onWalletReady, onConnect }) => {
  const [step, setStep] = useState<'welcome' | 'choice' | 'create' | 'backup' | 'import' | 'connecting'>('welcome');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seedPhrase, setSeedPhrase] = useState('');
  const [importSeed, setImportSeed] = useState('');
  const [showSeed, setShowSeed] = useState(false);
  const [backupConfirmed, setBackupConfirmed] = useState(false);

  const handleCreateWallet = async () => {
    if (!window.electronAPI) {
      console.error('Electron API not available');
      setError('Electron API not available. Please restart the application.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Calling createWallet API...');
      const result = await window.electronAPI.createWallet();
      console.log('Wallet creation result:', result);

      if (result.success && result.seed && result.addresses) {
        console.log('Setting seed phrase:', result.seed.substring(0, 20) + '...');
        setSeedPhrase(result.seed);
        setStep('backup');
      } else {
        console.log('Wallet creation failed:', result);
        setError(result.error || 'Failed to create wallet');
      }
    } catch (err) {
      console.log('Wallet creation error:', err);
      setError('Failed to create wallet. Please try again.');
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
        setStep('connecting');
        onWalletReady(result.addresses);
        // Auto-connect to default config
        setTimeout(() => {
          onConnect({
            network: 'mainnet',
            electrumServer: 'electrum1.cipig.net',
            port: 10061
          });
        }, 1000);
      } else {
        setError(result.error || 'Failed to import wallet');
      }
    } catch (err) {
      setError('Failed to import wallet. Please check your seed phrase.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackupComplete = () => {
    setStep('connecting');
    // Get addresses and proceed
    window.electronAPI.getAddresses().then(result => {
      if (result.success && result.addresses) {
        onWalletReady(result.addresses, seedPhrase);
        // Auto-connect to default config with fallback
        setTimeout(() => {
          console.log('Attempting to auto-connect to Electrum server...');
          
          const connectWithFallback = async (servers: Array<{server: string, port: number}>) => {
            for (const server of servers) {
              try {
                console.log(`Trying server: ${server.server}:${server.port}`);
                await onConnect({
                  network: 'mainnet',
                  electrumServer: server.server,
                  port: server.port
                });
                console.log(`Successfully connected to ${server.server}`);
                return;
              } catch (error) {
                console.warn(`Failed to connect to ${server.server}:`, error);
              }
            }
            console.error('All Electrum servers failed');
          };
          
          connectWithFallback([
            { server: 'electrum1.cipig.net', port: 10061 },
            { server: 'electrum2.cipig.net', port: 10061 },
            { server: 'electrum3.cipig.net', port: 10061 }
          ]);
        }, 1000);
      }
    });
  };

  const copySeedToClipboard = () => {
    navigator.clipboard.writeText(seedPhrase).then(() => {
      alert('✅ Seed phrase copied! Store it safely offline.');
    }).catch(() => {
      alert('❌ Failed to copy. Please write it down manually.');
    });
  };

  if (step === 'welcome') {
    return (
      <div className="wallet-onboarding">
        <div className="welcome-screen">
          <div className="welcome-icon">🐕</div>
          <h1>Welcome to Doginal Wallet!</h1>
          <p className="welcome-subtitle">Create permanent inscriptions on the Dogecoin blockchain</p>

          <div className="welcome-features">
            <div className="feature">
              <span className="feature-icon">🎨</span>
              <span>Create text & image inscriptions</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🔒</span>
              <span>Secure wallet with seed phrase backup</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🚀</span>
              <span>Easy funding with any Dogecoin wallet</span>
            </div>
          </div>

          <button
            className="btn-primary welcome-btn"
            onClick={() => setStep('choice')}
          >
            Get Started 🚀
          </button>

          <p className="welcome-note">
            <strong>💡 Tip:</strong> You'll need ~2 DOGE to create your first inscription
          </p>
        </div>
      </div>
    );
  }

  if (step === 'choice') {
    return (
      <div className="wallet-onboarding">
        <div className="choice-screen">
          <h2>🐕 Choose Your Path</h2>
          <p>How would you like to get started?</p>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="choice-buttons">
            <button
              className="choice-btn create-btn"
              onClick={handleCreateWallet}
              disabled={loading}
            >
              <div className="choice-icon">🆕</div>
              <div className="choice-title">Create New Wallet</div>
              <div className="choice-desc">Generate a fresh wallet with new addresses</div>
              {loading && <div className="loading">Creating...</div>}
            </button>

            <button
              className="choice-btn import-btn"
              onClick={() => setStep('import')}
            >
              <div className="choice-icon">📥</div>
              <div className="choice-title">Import Existing Wallet</div>
              <div className="choice-desc">Restore from your seed phrase</div>
            </button>
          </div>

          <button
            className="back-btn"
            onClick={() => setStep('welcome')}
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  if (step === 'backup') {
    return (
      <div className="wallet-onboarding">
        <div className="backup-screen">
          <h2>🔐 Secure Your Wallet</h2>
          <p className="backup-warning">
            ⚠️ <strong>CRITICAL:</strong> Write down your seed phrase and store it safely!
          </p>

          <div className="seed-display">
            <div className="seed-header">
              <span>Your Seed Phrase:</span>
              <button
                className="toggle-seed-btn"
                onClick={() => setShowSeed(!showSeed)}
              >
                {showSeed ? '🙈 Hide' : '👁️ Show'}
              </button>
            </div>

            <div className={`seed-phrase ${showSeed ? '' : 'blurred'}`}>
              {seedPhrase ? (
                seedPhrase.split(' ').map((word, index) => (
                  <span key={index} className="seed-word">
                    <span className="word-number">{index + 1}.</span>
                    {word}
                  </span>
                ))
              ) : (
                <div className="seed-error">
                  <p>❌ Seed phrase not generated</p>
                  <p>Please check the browser console (F12) for error messages</p>
                  <p>Try clicking "Create New Wallet" again</p>
                </div>
              )}
            </div>
          </div>

          <div className="backup-actions">
            <button
              className="copy-btn"
              onClick={copySeedToClipboard}
            >
              📋 Copy to Clipboard
            </button>
          </div>

          <div className="backup-tips">
            <h3>💡 Safety Tips:</h3>
            <ul>
              <li>Write these 12 words on paper</li>
              <li>Store in a safe, offline location</li>
              <li>Never share with anyone</li>
              <li>This phrase controls your DOGE</li>
            </ul>
          </div>

          <div className="backup-confirm">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={backupConfirmed}
                onChange={(e) => setBackupConfirmed(e.target.checked)}
              />
              <span>✅ I've safely backed up my seed phrase</span>
            </label>
          </div>

          <button
            className="btn-primary"
            onClick={handleBackupComplete}
            disabled={!backupConfirmed}
          >
            Continue to Wallet 🚀
          </button>

          <button
            className="back-btn"
            onClick={() => setStep('choice')}
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  if (step === 'import') {
    return (
      <div className="wallet-onboarding">
        <div className="import-screen">
          <h2>📥 Import Your Wallet</h2>
          <p>Enter your 12-word seed phrase to restore your wallet</p>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label>Seed Phrase</label>
            <textarea
              value={importSeed}
              onChange={(e) => setImportSeed(e.target.value)}
              placeholder="Enter your 12 words separated by spaces..."
              rows={3}
              className="seed-input"
            />
          </div>

          <button
            className="btn-primary"
            onClick={handleImportWallet}
            disabled={loading || !importSeed.trim()}
          >
            {loading ? 'Importing...' : '📥 Import Wallet'}
          </button>

          <button
            className="back-btn"
            onClick={() => setStep('choice')}
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  if (step === 'connecting') {
    return (
      <div className="wallet-onboarding">
        <div className="connecting-screen">
          <div className="connecting-icon">🔗</div>
          <h2>Connecting to Dogecoin Network...</h2>
          <p>Please wait while we connect to the blockchain</p>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return null;
};

export default WalletOnboarding;
