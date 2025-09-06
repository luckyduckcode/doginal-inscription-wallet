import React from 'react';
import { WalletBalance } from '../types';
import { useWallet } from '../hooks';

interface WalletDashboardProps {
  balance: WalletBalance | null;
  currentAddress: string;
  onRefresh: () => void;
}

const WalletDashboardMigrated: React.FC<WalletDashboardProps> = ({ 
  balance, 
  currentAddress, 
  onRefresh 
}) => {
  const { loading, error, addresses } = useWallet();

  const copyAddress = () => {
    navigator.clipboard.writeText(currentAddress);
    // Could add a toast notification here
  };

  const formatBalance = (satoshis: number) => {
    return (satoshis / 100000000).toFixed(8);
  };

  const getBalanceStatus = () => {
    if (!balance) return 'unknown';
    if (balance.total === 0) return 'empty';
    if (balance.total < 100000000) return 'low'; // Less than 1 DOGE
    if (balance.total < 300000000) return 'medium'; // Less than 3 DOGE
    return 'good';
  };

  const balanceStatus = getBalanceStatus();

  return (
    <div className="wallet-dashboard">
      <h2>📊 Dogecoin Wallet Dashboard 🚀</h2>
      
      {error && (
        <div className="error-message">
          <p>❌ {error}</p>
        </div>
      )}

      <div className="dashboard-grid">
        {/* Address Section */}
        <div className="dashboard-card">
          <h3>📍 Current Address</h3>
          <div className="address-display">
            <code className="address-text">{currentAddress}</code>
            <button 
              className="copy-btn"
              onClick={copyAddress}
              title="Copy address"
            >
              📋
            </button>
          </div>
          <small>Click to copy address</small>
        </div>

        {/* Balance Section */}
        <div className={`dashboard-card balance-card ${balanceStatus}`}>
          <h3>💰 Balance</h3>
          {loading ? (
            <div className="loading">
              <p>⏳ Loading balance...</p>
            </div>
          ) : balance ? (
            <div className="balance-details">
              <div className="balance-item">
                <span className="label">Confirmed:</span>
                <span className="value">{formatBalance(balance.confirmed)} DOGE</span>
              </div>
              {balance.unconfirmed > 0 && (
                <div className="balance-item">
                  <span className="label">Unconfirmed:</span>
                  <span className="value">{formatBalance(balance.unconfirmed)} DOGE</span>
                </div>
              )}
              <div className="balance-item total">
                <span className="label">Total:</span>
                <span className="value">{formatBalance(balance.total)} DOGE</span>
              </div>
            </div>
          ) : (
            <div className="no-balance">
              <p>❓ Balance unavailable</p>
            </div>
          )}
          
          <button 
            className="refresh-btn"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? '⏳' : '🔄'} Refresh
          </button>
        </div>

        {/* Status Section */}
        <div className="dashboard-card">
          <h3>🔍 Wallet Status</h3>
          <div className="status-items">
            <div className="status-item">
              <span className="status-label">Addresses:</span>
              <span className="status-value">{addresses.length}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Balance Status:</span>
              <span className={`status-value status-${balanceStatus}`}>
                {balanceStatus === 'empty' && '🚫 Empty'}
                {balanceStatus === 'low' && '⚠️ Low'}
                {balanceStatus === 'medium' && '📊 Medium'}
                {balanceStatus === 'good' && '✅ Good'}
                {balanceStatus === 'unknown' && '❓ Unknown'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Network:</span>
              <span className="status-value">🐕 Dogecoin Mainnet</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dashboard-card">
          <h3>⚡ Quick Actions</h3>
          <div className="quick-actions">
            <div className="action-item">
              <span className="action-icon">📝</span>
              <span className="action-text">Create Inscription</span>
              <span className="action-requirement">
                {balance && balance.total >= 300000000 ? '✅' : '❌ Need 3+ DOGE'}
              </span>
            </div>
            <div className="action-item">
              <span className="action-icon">💸</span>
              <span className="action-text">Send DOGE</span>
              <span className="action-requirement">
                {balance && balance.total > 100000000 ? '✅' : '❌ Need 1+ DOGE'}
              </span>
            </div>
            <div className="action-item">
              <span className="action-icon">📊</span>
              <span className="action-text">View History</span>
              <span className="action-requirement">✅</span>
            </div>
          </div>
        </div>

        {/* Funding Guide */}
        {balance && balance.total === 0 && (
          <div className="dashboard-card funding-alert">
            <h3>💡 Get Started</h3>
            <p>Your wallet is empty. To create inscriptions, you'll need to add some DOGE:</p>
            <ol>
              <li>Copy your address above</li>
              <li>Send DOGE from an exchange or another wallet</li>
              <li>Wait for confirmation (usually 1-6 blocks)</li>
              <li>Start creating inscriptions!</li>
            </ol>
            <p><strong>Minimum recommended:</strong> 3 DOGE for inscriptions</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletDashboardMigrated;
