import React, { useState } from 'react';

interface FundingGuideProps {
  walletAddress: string;
  onComplete: () => void;
  onSkip: () => void;
}

const FundingGuide: React.FC<FundingGuideProps> = ({ walletAddress, onComplete, onSkip }) => {
  const [step, setStep] = useState(1);

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress).then(() => {
      alert('✅ Address copied! Send DOGE to this address.');
    }).catch(() => {
      alert('❌ Failed to copy. Please copy manually.');
    });
  };

  const nextStep = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="funding-guide">
      <div className="funding-modal">
        <div className="funding-header">
          <h2>💰 Fund Your Wallet</h2>
          <p>Follow these steps to add DOGE to your wallet</p>
        </div>

        <div className="funding-steps">
          <div className="step-indicator">
            {[1, 2, 3, 4].map(num => (
              <div
                key={num}
                className={`step-dot ${step >= num ? 'active' : ''}`}
              >
                {num}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="funding-step">
              <div className="step-icon">📋</div>
              <h3>Copy Your Address</h3>
              <p>Your unique Dogecoin address:</p>
              <div className="address-display">
                <code>{walletAddress}</code>
                <button className="copy-address-btn" onClick={copyAddress}>
                  📋 Copy
                </button>
              </div>
              <p className="step-note">
                This address is safe to share - it only receives DOGE
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="funding-step">
              <div className="step-icon">🏦</div>
              <h3>Choose Your Source</h3>
              <div className="funding-options">
                <div className="option">
                  <span className="option-icon">📱</span>
                  <div>
                    <strong>Exchange</strong>
                    <p>Binance, Coinbase, Kraken, etc.</p>
                  </div>
                </div>
                <div className="option">
                  <span className="option-icon">👛</span>
                  <div>
                    <strong>Another Wallet</strong>
                    <p>Send from existing Dogecoin wallet</p>
                  </div>
                </div>
                <div className="option">
                  <span className="option-icon">🎁</span>
                  <div>
                    <strong>Faucet</strong>
                    <p>Get small amounts for testing</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="funding-step">
              <div className="step-icon">💸</div>
              <h3>Send DOGE</h3>
              <div className="amount-guide">
                <div className="amount-item">
                  <span className="amount-label">Minimum for 1 inscription:</span>
                  <span className="amount-value">~2.002 DOGE</span>
                </div>
                <div className="amount-item">
                  <span className="amount-label">Recommended:</span>
                  <span className="amount-value">5+ DOGE</span>
                </div>
              </div>
              <div className="warning-box">
                <strong>⚠️ Important:</strong> Send only DOGE to this address.
                Sending other coins may result in permanent loss.
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="funding-step">
              <div className="step-icon">✅</div>
              <h3>Confirm Transaction</h3>
              <p>After sending DOGE:</p>
              <ul className="confirmation-steps">
                <li>Wait 1-5 minutes for confirmation</li>
                <li>Click "Refresh Balance" in the dashboard</li>
                <li>Your DOGE balance will appear</li>
                <li>You're ready to create inscriptions! 🎨</li>
              </ul>
            </div>
          )}
        </div>

        <div className="funding-actions">
          {step > 1 && (
            <button className="btn-secondary" onClick={prevStep}>
              ← Back
            </button>
          )}

          <div className="action-spacer"></div>

          <button className="btn-skip" onClick={onSkip}>
            Skip for Now
          </button>

          <button className="btn-primary" onClick={nextStep}>
            {step === 4 ? 'Done! 🎉' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FundingGuide;
