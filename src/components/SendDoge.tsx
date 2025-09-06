import React, { useState, useEffect } from 'react';
import { WalletBalance } from '../types';

interface SendDogeProps {
  currentAddress: string;
  balance: WalletBalance | null;
  onSuccess: () => void;
}

interface SendDogeState {
  recipientAddress: string;
  amount: string;
  feeRate: number;
  customFeeRate: string;
  note: string;
  isCreating: boolean;
  isSigning: boolean;
  isBroadcasting: boolean;
  isConfirmed: boolean;
  error: string | null;
  txid: string | null;
  estimatedFee: number | null;
  totalCost: number | null;
  addressValid: boolean | null;
  amountValid: boolean | null;
}

const SendDoge: React.FC<SendDogeProps> = ({ currentAddress, balance, onSuccess }) => {
  const [state, setState] = useState<SendDogeState>({
    recipientAddress: '',
    amount: '',
    feeRate: 12, // Default 12 sat/byte for reliable confirmation
    customFeeRate: '',
    note: '',
    isCreating: false,
    isSigning: false,
    isBroadcasting: false,
    isConfirmed: false,
    error: null,
    txid: null,
    estimatedFee: null,
    totalCost: null,
    addressValid: null,
    amountValid: null
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Fee rate options
  const feeOptions = [
    { rate: 8, label: 'Slow', time: '30-60 min', description: 'Cheapest option' },
    { rate: 12, label: 'Standard', time: '10-20 min', description: 'Recommended' },
    { rate: 20, label: 'Fast', time: '5-10 min', description: 'Priority confirmation' },
    { rate: 50, label: 'Urgent', time: '1-3 min', description: 'Emergency only' }
  ];

  // Validate Dogecoin address
  const validateAddress = (address: string): boolean => {
    if (!address) return false;
    
    // Basic Dogecoin address validation
    const dogeAddressRegex = /^D[5-9A-HJ-NP-U][1-9A-HJ-NP-Za-km-z]{32}$/;
    return dogeAddressRegex.test(address);
  };

  // Validate amount
  const validateAmount = (amount: string): boolean => {
    if (!amount || !balance) return false;
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return false;
    
    // Check if amount exceeds available balance (accounting for fees)
    const estimatedFee = state.estimatedFee || 0.01; // Default estimate
    return numAmount + estimatedFee <= balance.confirmed;
  };

  // Calculate estimated fee
  const calculateFee = (amount: string, feeRate: number) => {
    if (!amount || !validateAmount(amount)) return null;
    
    // Estimate transaction size (1 input + 2 outputs = ~250 bytes)
    const estimatedSize = 250;
    const feeInSatoshis = estimatedSize * feeRate;
    const feeInDoge = feeInSatoshis / 100000000; // Convert satoshis to DOGE
    
    return feeInDoge;
  };

  // Update fee estimate when amount or fee rate changes
  useEffect(() => {
    const fee = calculateFee(state.amount, state.feeRate);
    const total = fee && state.amount ? parseFloat(state.amount) + fee : null;
    
    setState(prev => ({
      ...prev,
      estimatedFee: fee,
      totalCost: total
    }));
  }, [state.amount, state.feeRate]);

  // Update validation when inputs change
  useEffect(() => {
    setState(prev => ({
      ...prev,
      addressValid: state.recipientAddress ? validateAddress(state.recipientAddress) : null,
      amountValid: state.amount ? validateAmount(state.amount) : null
    }));
  }, [state.recipientAddress, state.amount, balance]);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const address = e.target.value;
    setState(prev => ({ ...prev, recipientAddress: address }));
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = e.target.value;
    // Allow only numbers and decimal point
    if (amount === '' || /^\d*\.?\d*$/.test(amount)) {
      setState(prev => ({ ...prev, amount }));
    }
  };

  const handleFeeRateChange = (rate: number) => {
    setState(prev => ({ 
      ...prev, 
      feeRate: rate,
      customFeeRate: rate.toString()
    }));
  };

  const handleCustomFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setState(prev => ({ ...prev, customFeeRate: value }));
      
      const rate = parseFloat(value);
      if (!isNaN(rate) && rate > 0) {
        setState(prev => ({ ...prev, feeRate: rate }));
      }
    }
  };

  const handleMaxAmount = () => {
    if (!balance) return;
    
    const fee = calculateFee('1', state.feeRate) || 0.01;
    const maxAmount = Math.max(0, balance.confirmed - fee);
    
    setState(prev => ({ ...prev, amount: maxAmount.toFixed(8) }));
  };

  const handleSend = async () => {
    if (!window.electronAPI || !state.addressValid || !state.amountValid) return;

    setState(prev => ({ 
      ...prev, 
      isCreating: true, 
      error: null,
      txid: null
    }));

    try {
      console.log('Creating DOGE transaction...');
      
      // Step 1: Create transaction
      const createResult = await window.electronAPI.createDogeTransaction({
        toAddress: state.recipientAddress,
        amount: parseFloat(state.amount),
        feeRate: state.feeRate
      });

      if (!createResult.success) {
        throw new Error(createResult.error);
      }

      setState(prev => ({ ...prev, isCreating: false, isSigning: true }));

      // Step 2: Sign transaction (already signed by createTransaction)
      const signResult = await window.electronAPI.signDogeTransaction({
        txHex: createResult.txHex
      });

      if (!signResult.success) {
        throw new Error(signResult.error);
      }

      setState(prev => ({ ...prev, isSigning: false, isBroadcasting: true }));

      // Step 3: Broadcast transaction
      const broadcastResult = await window.electronAPI.broadcastDogeTransaction({
        signedTxHex: signResult.signedTxHex
      });

      if (!broadcastResult.success) {
        throw new Error(broadcastResult.error);
      }

      // Success!
      setState(prev => ({ 
        ...prev, 
        isBroadcasting: false,
        isComplete: true,
        txid: broadcastResult.txid
      }));

      // Call success callback to refresh balance
      if (onSuccess) {
        onSuccess();
      }

      console.log('✅ DOGE transaction completed:', broadcastResult.txid);

    } catch (error) {
      console.error('Send DOGE error:', error);
      setState(prev => ({ 
        ...prev, 
        isCreating: false,
        isSigning: false,
        isBroadcasting: false,
        error: error instanceof Error ? error.message : 'Transaction failed'
      }));
    }
  };

  const isProcessing = state.isCreating || state.isSigning || state.isBroadcasting;
  const canSend = state.addressValid && state.amountValid && !isProcessing && !state.isConfirmed;

  return (
    <div className="send-doge">
      <div className="send-header">
        <h3>💰 Send DOGE</h3>
        <p>Send Dogecoin to another address</p>
      </div>

      {/* Recipient Address */}
      <div className="form-group">
        <label htmlFor="recipient">
          Recipient Address
          {state.addressValid === true && <span className="validation-success">✓</span>}
          {state.addressValid === false && <span className="validation-error">✗</span>}
        </label>
        <input
          id="recipient"
          type="text"
          value={state.recipientAddress}
          onChange={handleAddressChange}
          placeholder="D... (Dogecoin address)"
          disabled={isProcessing || state.isConfirmed}
          className={`
            ${state.addressValid === true ? 'valid' : ''}
            ${state.addressValid === false ? 'invalid' : ''}
          `}
        />
        {state.addressValid === false && (
          <small className="field-error">Please enter a valid Dogecoin address</small>
        )}
      </div>

      {/* Amount */}
      <div className="form-group">
        <label htmlFor="amount">
          Amount (DOGE)
          {state.amountValid === true && <span className="validation-success">✓</span>}
          {state.amountValid === false && <span className="validation-error">✗</span>}
        </label>
        <div className="amount-input-container">
          <input
            id="amount"
            type="text"
            value={state.amount}
            onChange={handleAmountChange}
            placeholder="0.00000000"
            disabled={isProcessing || state.isConfirmed}
            className={`
              ${state.amountValid === true ? 'valid' : ''}
              ${state.amountValid === false ? 'invalid' : ''}
            `}
          />
          <button 
            type="button" 
            className="max-btn"
            onClick={handleMaxAmount}
            disabled={isProcessing || state.isConfirmed || !balance}
          >
            MAX
          </button>
        </div>
        {balance && (
          <small className="balance-info">
            Available: {balance.confirmed.toFixed(8)} DOGE
          </small>
        )}
        {state.amountValid === false && (
          <small className="field-error">Amount exceeds available balance</small>
        )}
      </div>

      {/* Fee Selection */}
      <div className="form-group">
        <label>Transaction Fee</label>
        <div className="fee-options">
          {feeOptions.map((option) => (
            <button
              key={option.rate}
              type="button"
              className={`fee-btn ${state.feeRate === option.rate ? 'active' : ''}`}
              onClick={() => handleFeeRateChange(option.rate)}
              disabled={isProcessing || state.isConfirmed}
            >
              <div className="fee-label">{option.label}</div>
              <div className="fee-rate">{option.rate} sat/byte</div>
              <small className="fee-time">{option.time}</small>
            </button>
          ))}
        </div>
        
        {/* Advanced Controls */}
        <div className="advanced-controls">
          <button
            type="button"
            className="btn-link"
            onClick={() => setShowAdvanced(!showAdvanced)}
            disabled={isProcessing || state.isConfirmed}
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
          </button>
          
          {showAdvanced && (
            <div className="custom-fee">
              <label htmlFor="customFee">Custom Fee Rate (sat/byte)</label>
              <input
                id="customFee"
                type="text"
                value={state.customFeeRate}
                onChange={handleCustomFeeChange}
                placeholder="Enter custom fee rate"
                disabled={isProcessing || state.isConfirmed}
              />
            </div>
          )}
        </div>
      </div>

      {/* Note */}
      <div className="form-group">
        <label htmlFor="note">Note (Optional)</label>
        <input
          id="note"
          type="text"
          value={state.note}
          onChange={(e) => setState(prev => ({ ...prev, note: e.target.value }))}
          placeholder="Personal note for this transaction"
          disabled={isProcessing || state.isConfirmed}
        />
      </div>

      {/* Transaction Summary */}
      {state.estimatedFee && state.totalCost && (
        <div className="transaction-summary">
          <h4>Transaction Summary</h4>
          <div className="summary-row">
            <span>Amount:</span>
            <span>{state.amount} DOGE</span>
          </div>
          <div className="summary-row">
            <span>Network Fee:</span>
            <span>{state.estimatedFee.toFixed(8)} DOGE</span>
          </div>
          <div className="summary-row total">
            <span>Total Cost:</span>
            <span>{state.totalCost.toFixed(8)} DOGE</span>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {state.isCreating && (
        <div className="status-container creating">
          <div className="status-header">🔧 Creating Transaction</div>
          <div className="status-message">Building transaction with your specified parameters...</div>
        </div>
      )}

      {state.isSigning && (
        <div className="status-container signing">
          <div className="status-header">✍️ Signing Transaction</div>
          <div className="status-message">Cryptographically signing with your private key...</div>
        </div>
      )}

      {state.isBroadcasting && (
        <div className="status-container broadcasting">
          <div className="status-header">📡 Broadcasting Transaction</div>
          <div className="status-message">Sending to Dogecoin network...</div>
        </div>
      )}

      {state.isConfirmed && state.txid && (
        <div className="status-container confirmed">
          <div className="status-header">✅ Transaction Sent Successfully!</div>
          <div className="status-message">Your DOGE has been sent to the network</div>
          <div className="tx-details">
            <strong>Transaction ID:</strong><br />
            <a 
              href={`https://dogechain.info/tx/${state.txid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="explorer-link"
            >
              {state.txid}
            </a>
          </div>
        </div>
      )}

      {state.error && (
        <div className="status-container error">
          <div className="status-header">❌ Transaction Failed</div>
          <div className="status-message">{state.error}</div>
        </div>
      )}

      {/* Send Button */}
      <button
        type="button"
        className="btn-primary send-btn"
        onClick={handleSend}
        disabled={!canSend}
      >
        {isProcessing ? (
          <div className="loading">
            <div className="spinner"></div>
            Processing...
          </div>
        ) : state.isConfirmed ? (
          '✅ Transaction Sent'
        ) : (
          '💸 Send DOGE'
        )}
      </button>
    </div>
  );
};

export default SendDoge;
