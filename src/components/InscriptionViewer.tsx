import React, { useState, useEffect } from 'react';
import { InscriptionDetector, DetectedInscription } from '../wallet/inscriptionDetector';

interface InscriptionViewerProps {
    addresses: string[];
    currentAddress: string;
}

export const InscriptionViewer: React.FC<InscriptionViewerProps> = ({ addresses, currentAddress }) => {
    const [inscriptions, setInscriptions] = useState<DetectedInscription[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scanMode, setScanMode] = useState<'current' | 'all'>('current');
    const [progress, setProgress] = useState<string>('');

    const detectInscriptions = async () => {
        setLoading(true);
        setError(null);
        setProgress('Initializing inscription detector...');
        
        try {
            let found: DetectedInscription[] = [];
            
            if (scanMode === 'current') {
                setProgress(`Scanning current address: ${currentAddress.substring(0, 10)}...`);
                found = await InscriptionDetector.detectInscriptions([currentAddress]);
            } else {
                setProgress(`Scanning ${addresses.length} wallet addresses...`);
                found = await InscriptionDetector.detectInscriptions(addresses);
            }
            
            setInscriptions(found);
            setProgress(`Scan complete! Found ${found.length} inscriptions.`);
            
            if (found.length === 0) {
                setError('No inscriptions found. They may be at different addresses or in unrecognized format.');
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            setError(`Detection failed: ${errorMsg}`);
            setProgress('');
        } finally {
            setLoading(false);
        }
    };

    const formatContent = (content: string | undefined, contentType: string | undefined): JSX.Element => {
        if (!content) {
            return <div className="no-content">No content available</div>;
        }
        
        if (contentType && contentType.startsWith('image/')) {
            // For images, show as base64 if it's encoded, otherwise show as text
            if (content.startsWith('data:') || content.match(/^[A-Za-z0-9+/=]+$/)) {
                return <img src={content.startsWith('data:') ? content : `data:${contentType};base64,${content}`} alt="Inscription" style={{maxWidth: '100%', maxHeight: '200px'}} />;
            }
        }
        
        if (contentType === 'application/json') {
            try {
                const parsed = JSON.parse(content);
                return <pre>{JSON.stringify(parsed, null, 2)}</pre>;
            } catch {
                return <pre>{content}</pre>;
            }
        }
        
        return <pre className="inscription-content-text">{content}</pre>;
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text).then(() => {
            alert(`${label} copied to clipboard!`);
        }).catch(() => {
            alert('Failed to copy to clipboard');
        });
    };

    return (
        <div className="inscription-viewer">
            <div className="viewer-header">
                <h3>🔍 Inscription Detection & Viewer</h3>
                <p className="viewer-description">
                    Scan your wallet for Doginal inscriptions using advanced pattern detection.
                    This tool can find inscriptions that other wallets might miss.
                </p>
                
                <div className="scan-controls">
                    <div className="scan-mode">
                        <label>
                            <input 
                                type="radio" 
                                value="current" 
                                checked={scanMode === 'current'} 
                                onChange={(e) => setScanMode(e.target.value as 'current' | 'all')}
                                disabled={loading}
                            />
                            Scan Current Address Only
                        </label>
                        <label>
                            <input 
                                type="radio" 
                                value="all" 
                                checked={scanMode === 'all'} 
                                onChange={(e) => setScanMode(e.target.value as 'current' | 'all')}
                                disabled={loading}
                            />
                            Scan All Wallet Addresses ({addresses.length} total)
                        </label>
                    </div>
                    
                    <button 
                        className="scan-button"
                        onClick={detectInscriptions} 
                        disabled={loading}
                    >
                        {loading ? '🔄 Scanning...' : '🔍 Start Inscription Scan'}
                    </button>
                </div>
            </div>

            {progress && (
                <div className="scan-progress">
                    <div className="progress-message">📊 {progress}</div>
                </div>
            )}

            {error && (
                <div className="error-message">
                    <div className="error-icon">❌</div>
                    <div className="error-text">{error}</div>
                </div>
            )}

            {inscriptions.length > 0 && (
                <div className="inscriptions-found">
                    <div className="inscriptions-header">
                        <h4>✅ Found {inscriptions.length} Inscription{inscriptions.length !== 1 ? 's' : ''}:</h4>
                        <p>Your inscriptions are successfully stored on the Dogecoin blockchain!</p>
                    </div>
                    
                    {inscriptions.map((inscription, index) => (
                        <div key={`${inscription.txid}-${inscription.vout}`} className="inscription-card">
                            <div className="inscription-header">
                                <div className="inscription-title">
                                    <strong>📜 Inscription #{index + 1}</strong>
                                    {inscription.contentType && <span className="content-type-badge">{inscription.contentType}</span>}
                                </div>
                                {inscription.inscriptionNumber && (
                                    <div className="inscription-number">
                                        Inscription #{inscription.inscriptionNumber}
                                    </div>
                                )}
                            </div>
                            
                            <div className="inscription-content-container">
                                <div className="content-label">Content:</div>
                                <div className="inscription-content">
                                    {formatContent(inscription.content, inscription.contentType)}
                                </div>
                            </div>
                            
                            <div className="inscription-details">
                                <div className="detail-row">
                                    <strong>Transaction ID:</strong>
                                    <span className="detail-value">
                                        {inscription.txid}
                                        <button 
                                            className="copy-btn"
                                            onClick={() => copyToClipboard(inscription.txid, 'Transaction ID')}
                                        >
                                            📋 Copy
                                        </button>
                                    </span>
                                </div>
                                
                                <div className="detail-row">
                                    <strong>Output Index:</strong>
                                    <span className="detail-value">{inscription.vout}</span>
                                </div>
                                
                                <div className="detail-row">
                                    <strong>Address:</strong>
                                    <span className="detail-value">
                                        {inscription.address}
                                        <button 
                                            className="copy-btn"
                                            onClick={() => copyToClipboard(inscription.address, 'Address')}
                                        >
                                            📋 Copy
                                        </button>
                                    </span>
                                </div>
                                
                                <div className="detail-row">
                                    <strong>Value:</strong>
                                    <span className="detail-value">{inscription.value} satoshis</span>
                                </div>
                                
                                {inscription.inscriptionId && (
                                    <div className="detail-row">
                                        <strong>Inscription ID:</strong>
                                        <span className="detail-value">
                                            {inscription.inscriptionId}
                                            <button 
                                                className="copy-btn"
                                                onClick={() => copyToClipboard(inscription.inscriptionId!, 'Inscription ID')}
                                            >
                                                📋 Copy
                                            </button>
                                        </span>
                                    </div>
                                )}
                                
                                <div className="detail-row">
                                    <strong>Blockchain Explorer:</strong>
                                    <span className="detail-value">
                                        <a 
                                            href={`https://dogechain.info/tx/${inscription.txid}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="explorer-link"
                                        >
                                            🔗 View on DogeChain
                                        </a>
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && inscriptions.length === 0 && !error && (
                <div className="no-scan-yet">
                    <div className="placeholder-icon">🔍</div>
                    <p>Click "Start Inscription Scan" to search for inscriptions in your wallet.</p>
                    <p className="help-text">
                        This advanced scanner can detect inscriptions that other wallets might miss,
                        including those created with custom formats or older inscription methods.
                    </p>
                </div>
            )}
        </div>
    );
};

export default InscriptionViewer;
