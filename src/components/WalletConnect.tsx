import React, { useState } from 'react';
import { WalletConfig } from '../types';

interface WalletConnectProps {
  onConnect: (config: WalletConfig) => void;
  loading: boolean;
  error: string | null;
}

const WalletConnect: React.FC<WalletConnectProps> = ({ onConnect, loading, error }) => {
  const [config, setConfig] = useState<WalletConfig>({
    network: 'mainnet',
    rpcUrl: '',
    walletAddress: '',
    electrumServer: 'electrum1.cipig.net',
    port: 10061
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConnect(config);
  };

  const handleInputChange = (field: keyof WalletConfig, value: string | number) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="wallet-connect">
      <h2>🐕 Connect to Dogecoin Wallet 🚀</h2>
      <p>Connect to your Doge-Electrum wallet to start creating Doginal inscriptions! Much wow! 🎨</p>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="network">Network</label>
          <select
            id="network"
            value={config.network}
            onChange={(e) => handleInputChange('network', e.target.value)}
          >
            <option value="mainnet">Mainnet</option>
            <option value="testnet">Testnet</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="electrumServer">Electrum Server</label>
          <input
            type="text"
            id="electrumServer"
            value={config.electrumServer || ''}
            onChange={(e) => handleInputChange('electrumServer', e.target.value)}
            placeholder="electrum1.cipig.net"
          />
        </div>

        <div className="form-group">
          <label htmlFor="port">Port</label>
          <input
            type="number"
            id="port"
            value={config.port || 50001}
            onChange={(e) => handleInputChange('port', parseInt(e.target.value))}
            placeholder="10061"
          />
        </div>

        <div className="form-group">
          <label htmlFor="walletAddress">Wallet Address (Optional)</label>
          <input
            type="text"
            id="walletAddress"
            value={config.walletAddress}
            onChange={(e) => handleInputChange('walletAddress', e.target.value)}
            placeholder="Your Dogecoin address"
          />
        </div>

        <div className="form-group">
          <label htmlFor="rpcUrl">RPC URL (Optional)</label>
          <input
            type="text"
            id="rpcUrl"
            value={config.rpcUrl}
            onChange={(e) => handleInputChange('rpcUrl', e.target.value)}
            placeholder="http://localhost:22555"
          />
        </div>

        <button 
          type="submit" 
          className="btn-primary"
          disabled={loading}
        >
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              Connecting...
            </div>
          ) : (
            'Connect Wallet'
          )}
        </button>
      </form>

      <div style={{ marginTop: '2rem', fontSize: '0.9rem', opacity: 0.8 }}>
        <p><strong>Note:</strong> This wallet charges a 2 DOGE tax per inscription to cover service costs.</p>
        <p>Make sure you have sufficient DOGE balance for inscriptions and fees.</p>
      </div>
    </div>
  );
};

export default WalletConnect;
