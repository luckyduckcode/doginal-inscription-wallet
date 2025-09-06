"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const WalletSetup = ({ onWalletCreated, onCancel }) => {
    const [mode, setMode] = (0, react_1.useState)('choice');
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [seedPhrase, setSeedPhrase] = (0, react_1.useState)('');
    const [importSeed, setImportSeed] = (0, react_1.useState)('');
    const [showSeed, setShowSeed] = (0, react_1.useState)(false);
    const handleCreateNewWallet = async () => {
        if (!window.electronAPI)
            return;
        setLoading(true);
        setError(null);
        try {
            const result = await window.electronAPI.createWallet();
            if (result.success && result.seed && result.addresses) {
                setSeedPhrase(result.seed);
                setMode('create');
            }
            else {
                setError(result.error || 'Failed to create wallet');
            }
        }
        catch (err) {
            setError('Failed to create wallet');
        }
        finally {
            setLoading(false);
        }
    };
    const handleImportWallet = async () => {
        if (!window.electronAPI || !importSeed.trim())
            return;
        setLoading(true);
        setError(null);
        try {
            const result = await window.electronAPI.importWallet(importSeed.trim());
            if (result.success && result.addresses) {
                onWalletCreated(result.addresses);
            }
            else {
                setError(result.error || 'Failed to import wallet');
            }
        }
        catch (err) {
            setError('Failed to import wallet');
        }
        finally {
            setLoading(false);
        }
    };
    const confirmNewWallet = () => {
        // In a real implementation, you'd verify the user has backed up their seed
        if (seedPhrase) {
            // Get addresses from the created wallet
            window.electronAPI.getAddresses().then(result => {
                if (result.success && result.addresses) {
                    onWalletCreated(result.addresses, seedPhrase);
                }
            });
        }
    };
    const copySeedToClipboard = () => {
        navigator.clipboard.writeText(seedPhrase).then(() => {
            alert('Seed phrase copied to clipboard!');
        }).catch(() => {
            alert('Failed to copy seed phrase');
        });
    };
    if (mode === 'choice') {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "wallet-connect", children: [(0, jsx_runtime_1.jsx)("h2", { children: "\uD83D\uDC15 Setup Your Dogecoin Wallet" }), (0, jsx_runtime_1.jsx)("p", { children: "Create a new wallet or import an existing one to start using Doginal inscriptions" }), error && ((0, jsx_runtime_1.jsx)("div", { className: "error-message", children: error })), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }, children: [(0, jsx_runtime_1.jsx)("button", { className: "btn-primary", onClick: handleCreateNewWallet, disabled: loading, style: { background: '#4CAF50' }, children: loading ? ((0, jsx_runtime_1.jsxs)("div", { className: "loading", children: [(0, jsx_runtime_1.jsx)("div", { className: "spinner" }), "Creating Wallet..."] })) : ('🆕 Create New Wallet') }), (0, jsx_runtime_1.jsx)("button", { className: "btn-primary", onClick: () => setMode('import'), style: { background: '#2196F3' }, children: "\uD83D\uDCE5 Import Existing Wallet" })] }), (0, jsx_runtime_1.jsxs)("div", { style: { fontSize: '0.9rem', opacity: 0.8 }, children: [(0, jsx_runtime_1.jsxs)("p", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "New to Dogecoin?" }), " Choose \"Create New Wallet\""] }), (0, jsx_runtime_1.jsxs)("p", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Have a seed phrase?" }), " Choose \"Import Existing Wallet\""] })] }), (0, jsx_runtime_1.jsx)("button", { onClick: onCancel, style: {
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.3)',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginTop: '1rem'
                    }, children: "Cancel" })] }));
    }
    if (mode === 'create') {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "wallet-connect", children: [(0, jsx_runtime_1.jsx)("h2", { children: "\uD83D\uDD10 Your New Wallet Seed Phrase" }), (0, jsx_runtime_1.jsx)("div", { style: {
                        background: '#ff9800',
                        color: 'white',
                        padding: '1rem',
                        borderRadius: '8px',
                        marginBottom: '1rem',
                        fontWeight: 'bold'
                    }, children: "\u26A0\uFE0F CRITICAL: Write down this seed phrase and store it safely!" }), (0, jsx_runtime_1.jsx)("div", { style: {
                        background: 'rgba(0,0,0,0.3)',
                        padding: '1.5rem',
                        borderRadius: '8px',
                        marginBottom: '1rem',
                        fontFamily: 'monospace',
                        fontSize: '1.1rem',
                        wordSpacing: '0.5rem',
                        lineHeight: '1.8',
                        filter: showSeed ? 'none' : 'blur(4px)',
                        cursor: showSeed ? 'text' : 'pointer'
                    }, children: seedPhrase }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: '1rem', marginBottom: '1rem' }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => setShowSeed(!showSeed), style: {
                                background: showSeed ? '#ff6b6b' : '#4CAF50',
                                color: 'white',
                                border: 'none',
                                padding: '0.5rem 1rem',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }, children: showSeed ? '🙈 Hide Seed' : '👁️ Show Seed' }), (0, jsx_runtime_1.jsx)("button", { onClick: copySeedToClipboard, style: {
                                background: '#2196F3',
                                color: 'white',
                                border: 'none',
                                padding: '0.5rem 1rem',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }, children: "\uD83D\uDCCB Copy Seed" })] }), (0, jsx_runtime_1.jsxs)("div", { style: { fontSize: '0.9rem', opacity: 0.8, marginBottom: '2rem' }, children: [(0, jsx_runtime_1.jsx)("p", { children: (0, jsx_runtime_1.jsx)("strong", { children: "Important:" }) }), (0, jsx_runtime_1.jsxs)("ul", { style: { textAlign: 'left' }, children: [(0, jsx_runtime_1.jsx)("li", { children: "This seed phrase is your wallet backup" }), (0, jsx_runtime_1.jsx)("li", { children: "Anyone with this phrase can access your DOGE" }), (0, jsx_runtime_1.jsx)("li", { children: "Store it offline in a safe place" }), (0, jsx_runtime_1.jsx)("li", { children: "Never share it with anyone" })] })] }), (0, jsx_runtime_1.jsx)("button", { className: "btn-primary", onClick: confirmNewWallet, style: { marginBottom: '1rem' }, children: "\u2705 I've Safely Stored My Seed Phrase" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setMode('choice'), style: {
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.3)',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }, children: "\u2190 Back" })] }));
    }
    if (mode === 'import') {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "wallet-connect", children: [(0, jsx_runtime_1.jsx)("h2", { children: "\uD83D\uDCE5 Import Existing Wallet" }), (0, jsx_runtime_1.jsx)("p", { children: "Enter your 12 or 24-word seed phrase to restore your wallet" }), error && ((0, jsx_runtime_1.jsx)("div", { className: "error-message", children: error })), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "import-seed", children: "Seed Phrase" }), (0, jsx_runtime_1.jsx)("textarea", { id: "import-seed", value: importSeed, onChange: (e) => setImportSeed(e.target.value), placeholder: "Enter your seed phrase (12 or 24 words separated by spaces)", rows: 4, style: {
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                borderRadius: '8px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                resize: 'vertical',
                                fontFamily: 'monospace'
                            } })] }), (0, jsx_runtime_1.jsx)("button", { className: "btn-primary", onClick: handleImportWallet, disabled: loading || !importSeed.trim(), style: { marginBottom: '1rem' }, children: loading ? ((0, jsx_runtime_1.jsxs)("div", { className: "loading", children: [(0, jsx_runtime_1.jsx)("div", { className: "spinner" }), "Importing Wallet..."] })) : ('📥 Import Wallet') }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setMode('choice'), style: {
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.3)',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }, children: "\u2190 Back" }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: '0.9rem', opacity: 0.8, marginTop: '1rem' }, children: (0, jsx_runtime_1.jsxs)("p", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Security tip:" }), " Make sure you're in a private location when entering your seed phrase."] }) })] }));
    }
    return null;
};
exports.default = WalletSetup;
