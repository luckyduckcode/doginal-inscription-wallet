import React, { useState } from 'react';

interface QuickStartGuideProps {
  onDismiss: () => void;
}

const QuickStartGuide: React.FC<QuickStartGuideProps> = ({ onDismiss }) => {
  const [currentTip, setCurrentTip] = useState(0);

  const tips = [
    {
      icon: '📊',
      title: 'Check Your Balance',
      description: 'Click "Refresh Balance" to see your DOGE amount'
    },
    {
      icon: '🎨',
      title: 'Create Inscriptions',
      description: 'Go to "Create Inscription" to make your first Doginal'
    },
    {
      icon: '📚',
      title: 'View History',
      description: 'Check "History" to see all your inscriptions'
    },
    {
      icon: '🔒',
      title: 'Stay Safe',
      description: 'Never share your seed phrase and keep backups safe'
    }
  ];

  const nextTip = () => {
    if (currentTip < tips.length - 1) {
      setCurrentTip(currentTip + 1);
    } else {
      onDismiss();
    }
  };

  const prevTip = () => {
    if (currentTip > 0) {
      setCurrentTip(currentTip - 1);
    }
  };

  return (
    <div className="quick-start-guide">
      <div className="quick-start-modal">
        <div className="quick-start-header">
          <h2>🎯 Quick Start Guide</h2>
          <p>You're all set! Here's how to use your wallet</p>
        </div>

        <div className="tip-navigation">
          {tips.map((_, index) => (
            <div
              key={index}
              className={`tip-dot ${currentTip === index ? 'active' : ''}`}
              onClick={() => setCurrentTip(index)}
            />
          ))}
        </div>

        <div className="current-tip">
          <div className="tip-icon">{tips[currentTip].icon}</div>
          <h3>{tips[currentTip].title}</h3>
          <p>{tips[currentTip].description}</p>
        </div>

        <div className="tip-progress">
          <span>{currentTip + 1} of {tips.length}</span>
        </div>

        <div className="quick-start-actions">
          {currentTip > 0 && (
            <button className="btn-secondary" onClick={prevTip}>
              ← Back
            </button>
          )}

          <div className="action-spacer"></div>

          <button className="btn-skip" onClick={onDismiss}>
            Skip All
          </button>

          <button className="btn-primary" onClick={nextTip}>
            {currentTip === tips.length - 1 ? 'Got it! 🎉' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickStartGuide;
