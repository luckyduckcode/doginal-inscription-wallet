import React, { useState } from 'react';
import { WalletBalance } from '../types';

interface SendInscriptionProps {
  currentAddress: string;
  balance: WalletBalance | null;
  onSuccess: () => void;
}

const SendInscription: React.FC<SendInscriptionProps> = ({ currentAddress, balance, onSuccess }) => {
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 2000);
  };

  return (
    <div className="send-inscription">
      <div className="send-header">
        <h3>🎨 Send Inscription</h3>
        <p>Transfer a Doginal inscription to another address</p>
      </div>

      <div className="inscription-scan">
        <button
          type="button"
          className="scan-button"
          onClick={handleScan}
          disabled={isScanning}
        >
          {isScanning ? (
            <div className="loading">
              <div className="spinner"></div>
              Scanning...
            </div>
          ) : (
            '🔍 Scan for Inscriptions'
          )}
        </button>
      </div>

      <div className="status-container error">
        <div className="status-header">🚧 Under Development</div>
        <div className="status-message">
          Inscription transfer functionality is under development. This feature requires specialized UTXO handling for ordinal transfers.
        </div>
      </div>
    </div>
  );
};

export default SendInscription;
