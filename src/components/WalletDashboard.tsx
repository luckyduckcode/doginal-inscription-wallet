import React from 'react';
import { WalletBalance } from '../types';

interface WalletDashboardProps {
  balance: WalletBalance | null;
  currentAddress: string;
  onRefresh: () => void;
}

const WalletDashboard: React.FC<WalletDashboardProps> = ({ balance, currentAddress, onRefresh }) => {
  return (
    <div className="wallet-dashboard">
      <h2>📊 Dogecoin Wallet Dashboard 🚀</h2>
      <p>View your Dogecoin balance and transaction history. To the moon! 🌕</p>
      <div className="balance-card">
        <h3>💰 Wallet Balance</h3>
        {balance ? (
          <>
            <div className="balance-amount">
              {balance.total.toFixed(8)} DOGE
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              <div>Confirmed: {balance.confirmed.toFixed(8)} DOGE</div>
              <div>Unconfirmed: {balance.unconfirmed.toFixed(8)} DOGE</div>
            </div>
          </>
        ) : (
          <div className="balance-amount">Loading...</div>
        )}
        <button className="btn-primary" onClick={onRefresh} style={{ marginTop: '1rem' }}>
          Refresh Balance
        </button>
      </div>

      <div className="address-card">
        <h3>📍 Current Address</h3>
        <div className="address-display">
          {currentAddress || 'No address selected'}
        </div>
        <div style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '1rem' }}>
          <p><strong>Inscription Cost Breakdown:</strong></p>
          <p>• Network Fee: ~0.001 - 0.01 DOGE</p>
          <p>• Service Tax: 2.0 DOGE</p>
          <p>• Total per inscription: ~2.001 - 2.01 DOGE</p>
        </div>
      </div>
    </div>
  );
};

export default WalletDashboard;
