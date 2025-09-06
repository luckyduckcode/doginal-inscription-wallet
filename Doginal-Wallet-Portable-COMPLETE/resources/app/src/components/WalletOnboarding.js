"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const WalletOnboarding = ({ onWalletReady, onConnect }) => {
    const [step, setStep] = (0, react_1.useState)('welcome');
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [seedPhrase, setSeedPhrase] = (0, react_1.useState)('');
    const [importSeed, setImportSeed] = (0, react_1.useState)('');
    const [showSeed, setShowSeed] = (0, react_1.useState)(false);
    const [backupConfirmed, setBackupConfirmed] = (0, react_1.useState)(false);
    const handleCreateWallet = async () => {
        if (!window.electronAPI) {
            console.error('Electron API not available');
            setError('Electron API not available. Please restart the application.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            console.log('Calling createWallet API...');
            const result = await window.electronAPI.createWallet();
            console.log('Wallet creation result:', result);
            if (result.success && result.seed && result.addresses) {
                console.log('Setting seed phrase:', result.seed.substring(0, 20) + '...');
                setSeedPhrase(result.seed);
                setStep('backup');
            }
            else {
                console.log('Wallet creation failed:', result);
                setError(result.error || 'Failed to create wallet');
            }
        }
        catch (err) {
            console.log('Wallet creation error:', err);
            setError('Failed to create wallet. Please try again.');
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
                setStep('connecting');
                onWalletReady(result.addresses);
                // Auto-connect to default config
                setTimeout(() => {
                    onConnect({
                        network: 'mainnet',
                        electrumServer: 'electrum1.cipig.net',
                        port: 10061
                    });
                }, 1000);
            }
            else {
                setError(result.error || 'Failed to import wallet');
            }
        }
        catch (err) {
            setError('Failed to import wallet. Please check your seed phrase.');
        }
        finally {
            setLoading(false);
        }
    };
    const handleBackupComplete = () => {
        setStep('connecting');
        // Get addresses and proceed
        window.electronAPI.getAddresses().then(result => {
            if (result.success && result.addresses) {
                onWalletReady(result.addresses, seedPhrase);
                // Auto-connect to default config with fallback
                setTimeout(() => {
                    console.log('Attempting to auto-connect to Electrum server...');
                    const connectWithFallback = async (servers) => {
                        for (const server of servers) {
                            try {
                                console.log(`Trying server: ${server.server}:${server.port}`);
                                await onConnect({
                                    network: 'mainnet',
                                    electrumServer: server.server,
                                    port: server.port
                                });
                                console.log(`Successfully connected to ${server.server}`);
                                return;
                            }
                            catch (error) {
                                console.warn(`Failed to connect to ${server.server}:`, error);
                            }
                        }
                        console.error('All Electrum servers failed');
                    };
                    connectWithFallback([
                        { server: 'electrum1.cipig.net', port: 10061 },
                        { server: 'electrum2.cipig.net', port: 10061 },
                        { server: 'electrum3.cipig.net', port: 10061 }
                    ]);
                }, 1000);
            }
        });
    };
    const copySeedToClipboard = () => {
        navigator.clipboard.writeText(seedPhrase).then(() => {
            alert('✅ Seed phrase copied! Store it safely offline.');
        }).catch(() => {
            alert('❌ Failed to copy. Please write it down manually.');
        });
    };
    if (step === 'welcome') {
        return ((0, jsx_runtime_1.jsx)("div", { className: "wallet-onboarding", children: (0, jsx_runtime_1.jsxs)("div", { className: "welcome-screen", children: [(0, jsx_runtime_1.jsx)("div", { className: "welcome-icon", children: "\uD83D\uDC15" }), (0, jsx_runtime_1.jsx)("h1", { children: "Welcome to Doginal Wallet!" }), (0, jsx_runtime_1.jsx)("p", { className: "welcome-subtitle", children: "Create permanent inscriptions on the Dogecoin blockchain" }), (0, jsx_runtime_1.jsxs)("div", { className: "welcome-features", children: [(0, jsx_runtime_1.jsxs)("div", { className: "feature", children: [(0, jsx_runtime_1.jsx)("span", { className: "feature-icon", children: "\uD83C\uDFA8" }), (0, jsx_runtime_1.jsx)("span", { children: "Create text & image inscriptions" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "feature", children: [(0, jsx_runtime_1.jsx)("span", { className: "feature-icon", children: "\uD83D\uDD12" }), (0, jsx_runtime_1.jsx)("span", { children: "Secure wallet with seed phrase backup" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "feature", children: [(0, jsx_runtime_1.jsx)("span", { className: "feature-icon", children: "\uD83D\uDE80" }), (0, jsx_runtime_1.jsx)("span", { children: "Easy funding with any Dogecoin wallet" })] })] }), (0, jsx_runtime_1.jsx)("button", { className: "btn-primary welcome-btn", onClick: () => setStep('choice'), children: "Get Started \uD83D\uDE80" }), (0, jsx_runtime_1.jsxs)("p", { className: "welcome-note", children: [(0, jsx_runtime_1.jsx)("strong", { children: "\uD83D\uDCA1 Tip:" }), " You'll need ~2 DOGE to create your first inscription"] })] }) }));
    }
    if (step === 'choice') {
        return ((0, jsx_runtime_1.jsx)("div", { className: "wallet-onboarding", children: (0, jsx_runtime_1.jsxs)("div", { className: "choice-screen", children: [(0, jsx_runtime_1.jsx)("h2", { children: "\uD83D\uDC15 Choose Your Path" }), (0, jsx_runtime_1.jsx)("p", { children: "How would you like to get started?" }), error && ((0, jsx_runtime_1.jsx)("div", { className: "error-message", children: error })), (0, jsx_runtime_1.jsxs)("div", { className: "choice-buttons", children: [(0, jsx_runtime_1.jsxs)("button", { className: "choice-btn create-btn", onClick: handleCreateWallet, disabled: loading, children: [(0, jsx_runtime_1.jsx)("div", { className: "choice-icon", children: "\uD83C\uDD95" }), (0, jsx_runtime_1.jsx)("div", { className: "choice-title", children: "Create New Wallet" }), (0, jsx_runtime_1.jsx)("div", { className: "choice-desc", children: "Generate a fresh wallet with new addresses" }), loading && (0, jsx_runtime_1.jsx)("div", { className: "loading", children: "Creating..." })] }), (0, jsx_runtime_1.jsxs)("button", { className: "choice-btn import-btn", onClick: () => setStep('import'), children: [(0, jsx_runtime_1.jsx)("div", { className: "choice-icon", children: "\uD83D\uDCE5" }), (0, jsx_runtime_1.jsx)("div", { className: "choice-title", children: "Import Existing Wallet" }), (0, jsx_runtime_1.jsx)("div", { className: "choice-desc", children: "Restore from your seed phrase" })] })] }), (0, jsx_runtime_1.jsx)("button", { className: "back-btn", onClick: () => setStep('welcome'), children: "\u2190 Back" })] }) }));
    }
    if (step === 'backup') {
        return ((0, jsx_runtime_1.jsx)("div", { className: "wallet-onboarding", children: (0, jsx_runtime_1.jsxs)("div", { className: "backup-screen", children: [(0, jsx_runtime_1.jsx)("h2", { children: "\uD83D\uDD10 Secure Your Wallet" }), (0, jsx_runtime_1.jsxs)("p", { className: "backup-warning", children: ["\u26A0\uFE0F ", (0, jsx_runtime_1.jsx)("strong", { children: "CRITICAL:" }), " Write down your seed phrase and store it safely!"] }), (0, jsx_runtime_1.jsxs)("div", { className: "seed-display", children: [(0, jsx_runtime_1.jsxs)("div", { className: "seed-header", children: [(0, jsx_runtime_1.jsx)("span", { children: "Your Seed Phrase:" }), (0, jsx_runtime_1.jsx)("button", { className: "toggle-seed-btn", onClick: () => setShowSeed(!showSeed), children: showSeed ? '🙈 Hide' : '👁️ Show' })] }), (0, jsx_runtime_1.jsx)("div", { className: `seed-phrase ${showSeed ? '' : 'blurred'}`, children: seedPhrase ? (seedPhrase.split(' ').map((word, index) => ((0, jsx_runtime_1.jsxs)("span", { className: "seed-word", children: [(0, jsx_runtime_1.jsxs)("span", { className: "word-number", children: [index + 1, "."] }), word] }, index)))) : ((0, jsx_runtime_1.jsxs)("div", { className: "seed-error", children: [(0, jsx_runtime_1.jsx)("p", { children: "\u274C Seed phrase not generated" }), (0, jsx_runtime_1.jsx)("p", { children: "Please check the browser console (F12) for error messages" }), (0, jsx_runtime_1.jsx)("p", { children: "Try clicking \"Create New Wallet\" again" })] })) })] }), (0, jsx_runtime_1.jsx)("div", { className: "backup-actions", children: (0, jsx_runtime_1.jsx)("button", { className: "copy-btn", onClick: copySeedToClipboard, children: "\uD83D\uDCCB Copy to Clipboard" }) }), (0, jsx_runtime_1.jsxs)("div", { className: "backup-tips", children: [(0, jsx_runtime_1.jsx)("h3", { children: "\uD83D\uDCA1 Safety Tips:" }), (0, jsx_runtime_1.jsxs)("ul", { children: [(0, jsx_runtime_1.jsx)("li", { children: "Write these 12 words on paper" }), (0, jsx_runtime_1.jsx)("li", { children: "Store in a safe, offline location" }), (0, jsx_runtime_1.jsx)("li", { children: "Never share with anyone" }), (0, jsx_runtime_1.jsx)("li", { children: "This phrase controls your DOGE" })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "backup-confirm", children: (0, jsx_runtime_1.jsxs)("label", { className: "checkbox-label", children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: backupConfirmed, onChange: (e) => setBackupConfirmed(e.target.checked) }), (0, jsx_runtime_1.jsx)("span", { children: "\u2705 I've safely backed up my seed phrase" })] }) }), (0, jsx_runtime_1.jsx)("button", { className: "btn-primary", onClick: handleBackupComplete, disabled: !backupConfirmed, children: "Continue to Wallet \uD83D\uDE80" }), (0, jsx_runtime_1.jsx)("button", { className: "back-btn", onClick: () => setStep('choice'), children: "\u2190 Back" })] }) }));
    }
    if (step === 'import') {
        return ((0, jsx_runtime_1.jsx)("div", { className: "wallet-onboarding", children: (0, jsx_runtime_1.jsxs)("div", { className: "import-screen", children: [(0, jsx_runtime_1.jsx)("h2", { children: "\uD83D\uDCE5 Import Your Wallet" }), (0, jsx_runtime_1.jsx)("p", { children: "Enter your 12-word seed phrase to restore your wallet" }), error && ((0, jsx_runtime_1.jsx)("div", { className: "error-message", children: error })), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { children: "Seed Phrase" }), (0, jsx_runtime_1.jsx)("textarea", { value: importSeed, onChange: (e) => setImportSeed(e.target.value), placeholder: "Enter your 12 words separated by spaces...", rows: 3, className: "seed-input" })] }), (0, jsx_runtime_1.jsx)("button", { className: "btn-primary", onClick: handleImportWallet, disabled: loading || !importSeed.trim(), children: loading ? 'Importing...' : '📥 Import Wallet' }), (0, jsx_runtime_1.jsx)("button", { className: "back-btn", onClick: () => setStep('choice'), children: "\u2190 Back" })] }) }));
    }
    if (step === 'connecting') {
        return ((0, jsx_runtime_1.jsx)("div", { className: "wallet-onboarding", children: (0, jsx_runtime_1.jsxs)("div", { className: "connecting-screen", children: [(0, jsx_runtime_1.jsx)("div", { className: "connecting-icon", children: "\uD83D\uDD17" }), (0, jsx_runtime_1.jsx)("h2", { children: "Connecting to Dogecoin Network..." }), (0, jsx_runtime_1.jsx)("p", { children: "Please wait while we connect to the blockchain" }), (0, jsx_runtime_1.jsx)("div", { className: "spinner" })] }) }));
    }
    return null;
};
exports.default = WalletOnboarding;
