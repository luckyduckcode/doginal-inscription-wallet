import React, { useState, useEffect } from 'react';
import { DoginalInscription } from '../types';

const InscriptionHistory: React.FC = () => {
  const [inscriptions, setInscriptions] = useState<DoginalInscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInscriptionHistory();
  }, []);

  const loadInscriptionHistory = async () => {
    if (!window.electronAPI) {
      setError('Electron API not available');
      setLoading(false);
      return;
    }

    try {
      const result = await window.electronAPI.getInscriptionHistory();
      
      if (result.success) {
        setInscriptions(result.history || []);
      } else {
        setError(result.error || 'Failed to load inscription history');
      }
    } catch (err) {
      setError('Failed to load inscription history');
    } finally {
      setLoading(false);
    }
  };

  const renderInscriptionPreview = (inscription: DoginalInscription) => {
    const { content, contentType } = inscription;

    if (contentType.startsWith('image/')) {
      const src = typeof content === 'string' ? content : `data:${contentType};base64,${Buffer.from(content).toString('base64')}`;
      return (
        <img 
          src={src} 
          alt="Inscription" 
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
      );
    } else if (contentType.startsWith('text/')) {
      const text = typeof content === 'string' ? content : Buffer.from(content).toString('utf8');
      return (
        <div style={{ 
          padding: '1rem', 
          fontSize: '0.8rem', 
          textAlign: 'left',
          overflow: 'auto',
          height: '100%'
        }}>
          {text.length > 200 ? `${text.substring(0, 200)}...` : text}
        </div>
      );
    } else {
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%'
        }}>
          <div style={{ fontSize: '2rem' }}>📄</div>
          <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
            {contentType}
          </div>
        </div>
      );
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy to clipboard');
    });
  };

  if (loading) {
    return (
      <div className="inscription-history">
        <h2>📜 Inscription History 🚀</h2>
        <p>View all your Doginal inscriptions. Such history! 📚</p>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="spinner" style={{ margin: '0 auto' }}></div>
          <p>Loading inscription history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="inscription-history">
        <h2>📜 Inscription History 🚀</h2>
        <p>View all your Doginal inscriptions. Such history! 📚</p>
        <div className="error-message">
          {error}
        </div>
        <button className="btn-primary" onClick={loadInscriptionHistory}>
          Retry
        </button>
      </div>
    );
  }

  if (inscriptions.length === 0) {
    return (
      <div className="inscription-history">
        <h2>📜 Inscription History 🚀</h2>
        <p>View all your Doginal inscriptions. Such history! 📚</p>
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          margin: '2rem 0'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏛️</div>
          <h3>No inscriptions yet</h3>
          <p>Create your first Doginal inscription to see it here!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="inscription-history">
      <h2>📜 Inscription History 🚀</h2>
      <p>View all your Doginal inscriptions. Such history! 📚</p>
      
      <div className="history-grid">
        {inscriptions.map((inscription) => (
          <div key={inscription.id} className="inscription-card">
            <div className="inscription-preview">
              {renderInscriptionPreview(inscription)}
            </div>
            
            <div style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Type:</strong> {inscription.contentType}
              </div>
              
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Size:</strong> {inscription.size} bytes
              </div>
              
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Created:</strong> {formatDate(inscription.createdAt)}
              </div>
              
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Fee:</strong> {inscription.fee.toFixed(8)} DOGE
              </div>
              
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Tax:</strong> {inscription.taxPaid.toFixed(1)} DOGE
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <strong>Transaction:</strong>
                <div 
                  className="inscription-id" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => copyToClipboard(inscription.txid)}
                  title="Click to copy transaction ID"
                >
                  {inscription.txid}
                </div>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <strong>Inscription ID:</strong>
                <div 
                  className="inscription-id" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => copyToClipboard(inscription.id)}
                  title="Click to copy inscription ID"
                >
                  {inscription.id}
                </div>
              </div>
              
              <div style={{ 
                display: 'flex', 
                gap: '0.5rem',
                fontSize: '0.8rem'
              }}>
                <button
                  style={{
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    padding: '0.3rem 0.6rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                  onClick={() => copyToClipboard(inscription.id)}
                >
                  Copy ID
                </button>
                
                <button
                  style={{
                    background: '#2196F3',
                    color: 'white',
                    border: 'none',
                    padding: '0.3rem 0.6rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                  onClick={() => {
                    const explorerUrl = `https://dogechain.info/tx/${inscription.txid}`;
                    window.electronAPI?.openExternal?.(explorerUrl);
                  }}
                >
                  View on Explorer
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ 
        textAlign: 'center', 
        marginTop: '2rem',
        fontSize: '0.9rem',
        opacity: 0.8 
      }}>
        <p>Total inscriptions created: {inscriptions.length}</p>
        <p>Total tax paid: {inscriptions.reduce((sum, i) => sum + i.taxPaid, 0).toFixed(1)} DOGE</p>
      </div>
    </div>
  );
};

export default InscriptionHistory;
