import React, { useState, useCallback } from 'react';
import { WalletBalance, InscriptionRequest, InscriptionEstimate } from '../types';

interface InscriptionCreatorProps {
  currentAddress: string;
  balance: WalletBalance | null;
  onSuccess: () => void;
}

interface TransactionStatus {
  step: 'creating' | 'signing' | 'broadcasting' | 'confirmed' | 'error';
  message: string;
  txid?: string;
  blockHeight?: number;
}

const InscriptionCreator: React.FC<InscriptionCreatorProps> = ({ currentAddress, balance, onSuccess }) => {
  const [inscriptionData, setInscriptionData] = useState<InscriptionRequest>({
    content: '',
    contentType: 'text/plain',
    receivingAddress: currentAddress,
    feeRate: 12 // Default to 12 sat/byte for reliable confirmation
  });
  
  const [estimate, setEstimate] = useState<InscriptionEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [txStatus, setTxStatus] = useState<TransactionStatus | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update receiving address when current address changes
  React.useEffect(() => {
    setInscriptionData(prev => ({ ...prev, receivingAddress: currentAddress }));
  }, [currentAddress]);

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

    // Read as base64 for binary files, or text for text files
    if (file.type.startsWith('text/')) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  }, []);

  const handleTextChange = useCallback((text: string) => {
    setInscriptionData(prev => ({
      ...prev,
      content: text,
      contentType: 'text/plain'
    }));
    setSelectedFile(null);
  }, []);

  const updateEstimate = useCallback(async () => {
    if (!inscriptionData.content || !window.electronAPI) return;

    try {
      setLoading(true);
      const result = await window.electronAPI.estimateInscription(inscriptionData);
      
      if (result.success && result.estimate) {
        setEstimate(result.estimate);
      } else {
        setError(result.error || 'Failed to estimate cost');
      }
    } catch (err) {
      setError('Failed to estimate inscription cost');
    } finally {
      setLoading(false);
    }
  }, [inscriptionData]);

  // Update estimate when content changes
  React.useEffect(() => {
    if (inscriptionData.content) {
      updateEstimate();
    }
  }, [inscriptionData.content, inscriptionData.contentType, updateEstimate]);

  const handleCreateInscription = async () => {
    if (!inscriptionData.content || !window.electronAPI) return;

    // Validate balance
    if (!balance || balance.confirmed < (estimate?.totalCost || 2.01)) {
      setError(`Insufficient balance. Required: ${estimate?.totalCost || 2.01} DOGE`);
      return;
    }

    setCreating(true);
    setError(null);
    setTxStatus({ step: 'creating', message: 'Creating inscription transaction...' });

    try {
      // Update status manually through the creation process
      setTxStatus({ step: 'signing', message: 'Signing transaction with your private key...' });
      
      // Small delay to show signing status
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setTxStatus({ step: 'broadcasting', message: 'Broadcasting transaction to Dogecoin network...' });

      const result = await window.electronAPI.createInscription(inscriptionData);
      
      if (result.success && result.inscription) {
        setTxStatus({ 
          step: 'confirmed', 
          message: 'Inscription created and broadcast successfully!',
          txid: result.inscription.txid,
          blockHeight: result.inscription.blockHeight
        });
        
        // Reset form after 3 seconds
        setTimeout(() => {
          setInscriptionData({
            content: '',
            contentType: 'text/plain',
            receivingAddress: currentAddress,
            feeRate: 12
          });
          setSelectedFile(null);
          setEstimate(null);
          setTxStatus(null);
          onSuccess();
        }, 3000);
      } else {
        setTxStatus({ 
          step: 'error', 
          message: result.error || 'Failed to create inscription' 
        });
        setError(result.error || 'Failed to create inscription');
      }
    } catch (err) {
      setTxStatus({ 
        step: 'error', 
        message: 'Failed to create inscription - please try again' 
      });
      setError('Failed to create inscription');
    } finally {
      setCreating(false);
    }
  };

  const getFeeRateRecommendation = (feeRate: number) => {
    if (feeRate < 8) return { level: 'low', text: '⚠️ Very Low - May take hours or fail', color: '#ff4444' };
    if (feeRate < 12) return { level: 'medium', text: '⏱️ Medium - May take 30-60 minutes', color: '#ffaa00' };
    if (feeRate < 20) return { level: 'recommended', text: '✅ Recommended - 10-30 minutes', color: '#44ff44' };
    return { level: 'high', text: '⚡ Fast - 5-15 minutes', color: '#44ff44' };
  };

  const feeRecommendation = getFeeRateRecommendation(inscriptionData.feeRate);

  const canCreate = inscriptionData.content && 
                   inscriptionData.receivingAddress && 
                   estimate && 
                   balance && 
                   balance.confirmed >= estimate.totalCost;

  return (
    <div className="inscription-creator">
      <h2>✍️ Create Doginal Inscription 🚀</h2>
      <p>Turn your content into a permanent Dogecoin inscription! Much creativity! 🎨</p>
      
      {error && !txStatus && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Transaction Status Display */}
      {txStatus && (
        <div className={`status-container ${txStatus.step}`}>
          <div className="status-header">
            {txStatus.step === 'creating' && '🔄 Creating Transaction...'}
            {txStatus.step === 'signing' && '🔐 Signing Transaction...'}
            {txStatus.step === 'broadcasting' && '📡 Broadcasting to Network...'}
            {txStatus.step === 'confirmed' && '✅ Success!'}
            {txStatus.step === 'error' && '❌ Error'}
          </div>
          <div className="status-message">{txStatus.message}</div>
          {txStatus.txid && (
            <div className="tx-details">
              <div><strong>Transaction ID:</strong> {txStatus.txid}</div>
              <div><strong>Status:</strong> Broadcast to network</div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.9em', opacity: 0.8 }}>
                💡 Your transaction has been sent to the network. It may take 10-30 minutes to appear in block explorers depending on network activity.
              </div>
            </div>
          )}
        </div>
      )}

      <div className="form-group">
        <label>Content Type</label>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <button 
            type="button"
            className={`nav-btn ${!selectedFile ? 'active' : ''}`}
            onClick={() => {
              setSelectedFile(null);
              setInscriptionData(prev => ({ ...prev, content: '', contentType: 'text/plain' }));
            }}
            disabled={creating}
          >
            Text
          </button>
          <button 
            type="button"
            className={`nav-btn ${selectedFile ? 'active' : ''}`}
            onClick={() => document.getElementById('file-input')?.click()}
            disabled={creating}
          >
            File
          </button>
        </div>
      </div>

      {!selectedFile ? (
        <div className="form-group">
          <label htmlFor="text-content">Text Content</label>
          <textarea
            id="text-content"
            value={typeof inscriptionData.content === 'string' ? inscriptionData.content : ''}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Enter your text content here..."
            rows={6}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              resize: 'vertical'
            }}
          />
        </div>
      ) : (
        <div className="file-upload">
          <input
            type="file"
            id="file-input"
            onChange={handleFileSelect}
            accept="image/*,text/*,.json,.svg"
          />
          <div>
            📁 Selected: {selectedFile.name}
            <br />
            Size: {(selectedFile.size / 1024).toFixed(2)} KB
            <br />
            Type: {selectedFile.type}
          </div>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="receiving-address">Receiving Address</label>
        <input
          type="text"
          id="receiving-address"
          value={inscriptionData.receivingAddress}
          onChange={(e) => setInscriptionData(prev => ({ ...prev, receivingAddress: e.target.value }))}
          placeholder="Dogecoin address to receive the inscription"
        />
      </div>

      {/* Advanced Fee Controls */}
      <div className="form-group">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <label>Transaction Priority</label>
          <button 
            type="button" 
            className="btn-link"
            onClick={() => setShowAdvanced(!showAdvanced)}
            disabled={creating}
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced
          </button>
        </div>
        
        {/* Quick Fee Selection */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button
            type="button"
            className={`fee-btn ${inscriptionData.feeRate === 8 ? 'active' : ''}`}
            onClick={() => setInscriptionData(prev => ({ ...prev, feeRate: 8 }))}
            disabled={creating}
          >
            Low<br/><small>8 sat/byte</small>
          </button>
          <button
            type="button"
            className={`fee-btn ${inscriptionData.feeRate === 12 ? 'active' : ''}`}
            onClick={() => setInscriptionData(prev => ({ ...prev, feeRate: 12 }))}
            disabled={creating}
          >
            Normal<br/><small>12 sat/byte</small>
          </button>
          <button
            type="button"
            className={`fee-btn ${inscriptionData.feeRate === 20 ? 'active' : ''}`}
            onClick={() => setInscriptionData(prev => ({ ...prev, feeRate: 20 }))}
            disabled={creating}
          >
            Fast<br/><small>20 sat/byte</small>
          </button>
        </div>

        {/* Fee Rate Indicator */}
        <div 
          className="fee-indicator"
          style={{ 
            padding: '0.5rem', 
            borderRadius: '6px', 
            background: 'rgba(255,255,255,0.1)',
            marginBottom: '1rem',
            border: `2px solid ${feeRecommendation.color}`
          }}
        >
          <div style={{ color: feeRecommendation.color, fontWeight: 'bold' }}>
            {feeRecommendation.text}
          </div>
          <div style={{ fontSize: '0.9em', opacity: 0.8, marginTop: '0.25rem' }}>
            Current fee rate: {inscriptionData.feeRate} sat/byte
          </div>
        </div>

        {/* Advanced Controls */}
        {showAdvanced && (
          <div className="advanced-controls">
            <label htmlFor="custom-fee-rate">Custom Fee Rate (sat/byte)</label>
            <input
              type="number"
              id="custom-fee-rate"
              value={inscriptionData.feeRate}
              onChange={(e) => setInscriptionData(prev => ({ ...prev, feeRate: parseInt(e.target.value) || 12 }))}
              min="1"
              max="100"
              disabled={creating}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white'
              }}
            />
            <div style={{ fontSize: '0.85em', opacity: 0.7, marginTop: '0.5rem' }}>
              💡 Recommended: 8-12 sat/byte for normal confirmation, 15+ for faster confirmation
            </div>
          </div>
        )}
      </div>

      {estimate && (
        <div className="cost-estimate">
          <h3>💰 Cost Estimate</h3>
          <div className="cost-item">
            <span>Content Size:</span>
            <span>{estimate.inscriptionSize} bytes</span>
          </div>
          <div className="cost-item">
            <span>Network Fee:</span>
            <span>{estimate.networkFee.toFixed(8)} DOGE</span>
          </div>
          <div className="cost-item">
            <span>Service Tax:</span>
            <span>{estimate.taxFee.toFixed(1)} DOGE</span>
          </div>
          <div className="cost-item cost-total">
            <span>Total Cost:</span>
            <span>{estimate.totalCost.toFixed(8)} DOGE</span>
          </div>
          <div style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.8 }}>
            Estimated confirmation time: {estimate.estimatedConfirmationTime}
          </div>
        </div>
      )}

      {balance && (
        <div style={{ margin: '1rem 0', fontSize: '0.9rem' }}>
          Available Balance: {balance.confirmed.toFixed(8)} DOGE
        </div>
      )}

      <button
        className="btn-primary"
        onClick={handleCreateInscription}
        disabled={!canCreate || creating || loading}
        style={{ marginTop: '1rem' }}
      >
        {creating ? (
          <div className="loading">
            <div className="spinner"></div>
            Creating Inscription...
          </div>
        ) : (
          `Create Inscription ${estimate ? `(${estimate.totalCost.toFixed(8)} DOGE)` : ''}`
        )}
      </button>

      <div style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>
        <p><strong>Important:</strong> Creating an inscription will permanently embed your content on the Dogecoin blockchain.</p>
        <p>A 2 DOGE service tax is charged for each inscription to cover operational costs.</p>
      </div>
    </div>
  );
};

export default InscriptionCreator;
