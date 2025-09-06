import React, { useState, useCallback, useEffect } from 'react';
import { WalletBalance, InscriptionRequest, InscriptionEstimate } from '../types';
import { useInscription } from '../hooks';
import { DogeElectrumWallet } from '../wallet/dogeElectrum';

interface InscriptionCreatorProps {
  currentAddress: string;
  balance: WalletBalance | null;
  onSuccess: () => void;
}

const InscriptionCreatorMigrated: React.FC<InscriptionCreatorProps> = ({ 
  currentAddress, 
  balance, 
  onSuccess 
}) => {
  // Use the inscription hook
  const {
    creating,
    estimating,
    error: hookError,
    progress,
    createInscription,
    estimateInscription,
    clearError
  } = useInscription();

  const [inscriptionData, setInscriptionData] = useState<InscriptionRequest>({
    content: '',
    contentType: 'text/plain',
    receivingAddress: currentAddress,
    feeRate: 10 // Updated to realistic Dogecoin fee rate
  });
  
  const [estimate, setEstimate] = useState<InscriptionEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [wallet] = useState(() => new DogeElectrumWallet()); // We'll need to get this from context

  // Update receiving address when current address changes
  useEffect(() => {
    setInscriptionData(prev => ({ ...prev, receivingAddress: currentAddress }));
  }, [currentAddress]);

  // Clear errors when component unmounts
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (400KB limit for Doginals)
    if (file.size > 400000) {
      setError('File too large. Maximum size is 400KB for Doginals.');
      return;
    }

    setSelectedFile(file);
    setError(null);
    clearError();

    // Read file content
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (content) {
        setInscriptionData(prev => ({
          ...prev,
          content: content as string,
          contentType: file.type || 'application/octet-stream'
        }));
      }
    };

    if (file.type.startsWith('text/') || file.type === 'application/json') {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  }, [clearError]);

  const handleTextInput = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = event.target.value;
    setInscriptionData(prev => ({
      ...prev,
      content,
      contentType: 'text/plain'
    }));
    setSelectedFile(null);
    setError(null);
    clearError();
  }, [clearError]);

  const handleEstimate = useCallback(async () => {
    const contentStr = typeof inscriptionData.content === 'string' ? inscriptionData.content : '';
    if (!contentStr.trim()) {
      setError('Please enter content or select a file');
      return;
    }

    try {
      setError(null);
      clearError();
      
      const estimateResult = await estimateInscription(inscriptionData, wallet);
      if (estimateResult) {
        setEstimate(estimateResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to estimate inscription');
    }
  }, [inscriptionData, estimateInscription, wallet, clearError]);

  const handleCreate = useCallback(async () => {
    const contentStr = typeof inscriptionData.content === 'string' ? inscriptionData.content : '';
    if (!contentStr.trim()) {
      setError('Please enter content or select a file');
      return;
    }

    if (!balance || balance.total < 300000000) { // 3 DOGE minimum
      setError('Insufficient balance. You need at least 3 DOGE to create an inscription.');
      return;
    }

    try {
      setError(null);
      clearError();
      
      const result = await createInscription(inscriptionData, wallet);
      if (result) {
        // Reset form
        setInscriptionData({
          content: '',
          contentType: 'text/plain',
          receivingAddress: currentAddress,
          feeRate: 10
        });
        setSelectedFile(null);
        setEstimate(null);
        
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create inscription');
    }
  }, [inscriptionData, balance, currentAddress, createInscription, wallet, onSuccess, clearError]);

  const isLoading = creating || estimating;
  const combinedError = error || hookError;
  const contentStr = typeof inscriptionData.content === 'string' ? inscriptionData.content : '';
  const hasContent = contentStr.trim().length > 0;

  return (
    <div className="inscription-creator">
      <h2>📝 Create Doginal Inscription</h2>
      
      {combinedError && (
        <div className="error-message">
          <p>❌ {combinedError}</p>
          <button onClick={() => { setError(null); clearError(); }}>
            Dismiss
          </button>
        </div>
      )}

      {progress && (
        <div className="progress-message">
          <p>⏳ {progress}</p>
        </div>
      )}

      <div className="inscription-form">
        <div className="form-group">
          <label>Content Type:</label>
          <div className="content-options">
            <button
              className={`option-btn ${!selectedFile ? 'active' : ''}`}
              onClick={() => {
                setSelectedFile(null);
                setInscriptionData(prev => ({ ...prev, content: '', contentType: 'text/plain' }));
              }}
            >
              📝 Text
            </button>
            <button
              className={`option-btn ${selectedFile ? 'active' : ''}`}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              📎 File
            </button>
          </div>
        </div>

        {!selectedFile ? (
          <div className="form-group">
            <label htmlFor="text-content">Text Content:</label>
            <textarea
              id="text-content"
              value={typeof inscriptionData.content === 'string' ? inscriptionData.content : ''}
              onChange={handleTextInput}
              placeholder="Enter your text content here..."
              rows={6}
              disabled={isLoading}
            />
          </div>
        ) : (
          <div className="form-group">
            <label>Selected File:</label>
            <div className="file-info">
              <p>📎 {selectedFile.name}</p>
              <p>📏 {(selectedFile.size / 1024).toFixed(2)} KB</p>
              <p>🔖 {selectedFile.type || 'Unknown type'}</p>
            </div>
          </div>
        )}

        <input
          id="file-input"
          type="file"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={isLoading}
        />

        <div className="form-group">
          <label htmlFor="receiving-address">Receiving Address:</label>
          <input
            id="receiving-address"
            type="text"
            value={inscriptionData.receivingAddress}
            onChange={(e) => setInscriptionData(prev => ({ 
              ...prev, 
              receivingAddress: e.target.value 
            }))}
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="fee-rate">Fee Rate (sat/byte):</label>
          <input
            id="fee-rate"
            type="number"
            value={inscriptionData.feeRate || 10}
            onChange={(e) => setInscriptionData(prev => ({ 
              ...prev, 
              feeRate: parseInt(e.target.value) || 10 
            }))}
            min="1"
            max="1000"
            disabled={isLoading}
          />
          <small>Recommended: 10 sat/byte for Dogecoin</small>
        </div>

        {estimate && (
          <div className="estimate-display">
            <h3>💰 Cost Estimate</h3>
            <p>Network Fee: {(estimate.networkFee / 100000000).toFixed(8)} DOGE</p>
            <p>Tax Fee: {(estimate.taxFee / 100000000).toFixed(8)} DOGE</p>
            <p><strong>Total Cost: {(estimate.totalCost / 100000000).toFixed(8)} DOGE</strong></p>
            <p>Inscription Size: {estimate.inscriptionSize} bytes</p>
            <p>Est. Confirmation: {estimate.estimatedConfirmationTime}</p>
          </div>
        )}

        <div className="action-buttons">
          <button
            onClick={handleEstimate}
            disabled={!hasContent || isLoading}
            className="estimate-btn"
          >
            {estimating ? '⏳ Estimating...' : '🧮 Estimate Cost'}
          </button>
          
          <button
            onClick={handleCreate}
            disabled={!hasContent || isLoading || !estimate}
            className="create-btn"
          >
            {creating ? '⏳ Creating...' : '🚀 Create Inscription'}
          </button>
        </div>

        {balance && (
          <div className="balance-info">
            <p>💰 Available Balance: {(balance.total / 100000000).toFixed(8)} DOGE</p>
            {estimate && balance.total < estimate.totalCost && (
              <p className="insufficient-funds">
                ⚠️ Insufficient funds for this inscription
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InscriptionCreatorMigrated;
