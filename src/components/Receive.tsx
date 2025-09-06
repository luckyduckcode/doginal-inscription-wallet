import React, { useState, useEffect } from 'react';
import { WalletBalance } from '../types';

interface ReceiveProps {
  currentAddress: string;
  addresses: string[];
  balance: WalletBalance | null;
  onRefresh: () => void;
}

interface ReceiveState {
  selectedAddress: string;
  amount: string;
  note: string;
  showQR: boolean;
  isRefreshing: boolean;
  copySuccess: boolean;
}

const Receive: React.FC<ReceiveProps> = ({ currentAddress, addresses, balance, onRefresh }) => {
  const [state, setState] = useState<ReceiveState>({
    selectedAddress: currentAddress,
    amount: '',
    note: '',
    showQR: false,
    isRefreshing: false,
    copySuccess: false
  });

  useEffect(() => {
    setState(prev => ({ ...prev, selectedAddress: currentAddress }));
  }, [currentAddress]);

  const handleAddressChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setState(prev => ({ ...prev, selectedAddress: e.target.value }));
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = e.target.value;
    // Allow only numbers and decimal point
    if (amount === '' || /^\d*\.?\d*$/.test(amount)) {
      setState(prev => ({ ...prev, amount }));
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setState(prev => ({ ...prev, copySuccess: true }));
      setTimeout(() => {
        setState(prev => ({ ...prev, copySuccess: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const generatePaymentURI = () => {
    let uri = `dogecoin:${state.selectedAddress}`;
    const params = [];
    
    if (state.amount && parseFloat(state.amount) > 0) {
      params.push(`amount=${state.amount}`);
    }
    
    if (state.note.trim()) {
      params.push(`message=${encodeURIComponent(state.note.trim())}`);
    }
    
    if (params.length > 0) {
      uri += `?${params.join('&')}`;
    }
    
    return uri;
  };

  const generateQRCode = () => {
    const uri = generatePaymentURI();
    // For a real implementation, you'd use a QR code library
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uri)}`;
  };

  const handleRefresh = async () => {
    setState(prev => ({ ...prev, isRefreshing: true }));
    
    try {
      await onRefresh();
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    } finally {
      setState(prev => ({ ...prev, isRefreshing: false }));
    }
  };

  const formatBalance = (balance: WalletBalance | null) => {
    if (!balance) return '0.00000000';
    return balance.confirmed.toFixed(8);
  };

  return (
    <div className="receive-component">
      <div className="receive-header">
        <h3>📥 Receive DOGE & Inscriptions</h3>
        <p>Share your address to receive Dogecoin and inscriptions</p>
      </div>

      {/* Current Balance */}
      <div className="balance-display">
        <h4>💰 Current Balance</h4>
        <div className="balance-amount">
          {formatBalance(balance)} DOGE
          <button 
            className="refresh-btn"
            onClick={handleRefresh}
            disabled={state.isRefreshing}
            title="Refresh balance"
          >
            {state.isRefreshing ? '🔄' : '🔄'}
          </button>
        </div>
        {balance && balance.unconfirmed > 0 && (
          <div className="unconfirmed-balance">
            Unconfirmed: {balance.unconfirmed.toFixed(8)} DOGE
          </div>
        )}
      </div>

      {/* Address Selection */}
      <div className="form-group">
        <label htmlFor="addressSelect">Receiving Address</label>
        <select
          id="addressSelect"
          value={state.selectedAddress}
          onChange={handleAddressChange}
          className="address-select"
        >
          {addresses.map((address, index) => (
            <option key={address} value={address}>
              Address {index + 1}: {address}
            </option>
          ))}
        </select>
      </div>

      {/* Address Display */}
      <div className="address-section">
        <div className="address-display-container">
          <div className="address-display">
            <code>{state.selectedAddress}</code>
            <button
              className="copy-btn"
              onClick={() => copyToClipboard(state.selectedAddress)}
              title="Copy address"
            >
              {state.copySuccess ? '✅' : '📋'}
            </button>
          </div>
        </div>
      </div>

      {/* Payment Request Options */}
      <div className="payment-request">
        <h4>💸 Payment Request (Optional)</h4>
        
        <div className="form-group">
          <label htmlFor="amount">Request Amount (DOGE)</label>
          <input
            id="amount"
            type="text"
            value={state.amount}
            onChange={handleAmountChange}
            placeholder="0.00000000"
            className="amount-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="note">Payment Note</label>
          <input
            id="note"
            type="text"
            value={state.note}
            onChange={(e) => setState(prev => ({ ...prev, note: e.target.value }))}
            placeholder="What's this payment for?"
            className="note-input"
          />
        </div>

        {/* Payment URI */}
        {(state.amount || state.note) && (
          <div className="payment-uri">
            <h5>Payment URI</h5>
            <div className="uri-display">
              <code>{generatePaymentURI()}</code>
              <button
                className="copy-btn"
                onClick={() => copyToClipboard(generatePaymentURI())}
                title="Copy payment URI"
              >
                📋
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QR Code */}
      <div className="qr-section">
        <button
          className="qr-toggle-btn"
          onClick={() => setState(prev => ({ ...prev, showQR: !prev.showQR }))}
        >
          {state.showQR ? '🔽 Hide QR Code' : '📱 Show QR Code'}
        </button>

        {state.showQR && (
          <div className="qr-code-container">
            <div className="qr-code">
              <img 
                src={generateQRCode()} 
                alt="Payment QR Code"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE0cHgiPkVycm9yIGdlbmVyYXRpbmcgUVIgY29kZTwvdGV4dD48L3N2Zz4=';
                }}
              />
            </div>
            <p className="qr-help">
              Scan this QR code with a Dogecoin wallet to send payment
            </p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="instructions">
        <h4>📋 How to Receive</h4>
        <div className="instruction-cards">
          <div className="instruction-card">
            <div className="instruction-icon">💰</div>
            <div className="instruction-content">
              <h5>For DOGE</h5>
              <p>Share your address with the sender. Any amount of DOGE sent to this address will appear in your wallet.</p>
            </div>
          </div>
          
          <div className="instruction-card">
            <div className="instruction-icon">🎨</div>
            <div className="instruction-content">
              <h5>For Inscriptions</h5>
              <p>Inscriptions are sent to the same address. Use the "Find Inscriptions" tab to discover received inscriptions.</p>
            </div>
          </div>
          
          <div className="instruction-card">
            <div className="instruction-icon">⚡</div>
            <div className="instruction-content">
              <h5>Confirmation</h5>
              <p>Transactions typically confirm within 10-20 minutes. Refresh your balance to check for new payments.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="warning-box">
        <div className="warning-icon">⚠️</div>
        <div className="warning-content">
          <h5>Important Notes</h5>
          <ul>
            <li>Only send Dogecoin to this address</li>
            <li>Always verify the address before sharing</li>
            <li>Save your wallet seed phrase safely</li>
            <li>Check transaction confirmations before considering payments final</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Receive;
