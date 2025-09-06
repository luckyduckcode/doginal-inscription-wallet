"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
require("./App.css");
const WalletOnboarding_1 = __importDefault(require("./components/WalletOnboarding"));
const FundingGuide_1 = __importDefault(require("./components/FundingGuide"));
const QuickStartGuide_1 = __importDefault(require("./components/QuickStartGuide"));
const WalletDashboard_1 = __importDefault(require("./components/WalletDashboard"));
const InscriptionCreator_1 = __importDefault(require("./components/InscriptionCreator"));
const InscriptionHistory_1 = __importDefault(require("./components/InscriptionHistory"));
function App() {
    const [state, setState] = (0, react_1.useState)({
        hasWallet: false,
        isConnected: false,
        walletConfig: null,
        balance: null,
        addresses: [],
        currentAddress: '',
        activeTab: 'dashboard',
        showFundingGuide: false,
        showQuickStartGuide: false
    });
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    // Check if we're running in Electron
    const isElectron = window.electronAPI !== undefined;
    (0, react_1.useEffect)(() => {
        if (!isElectron) {
            setError('This application requires Electron to run properly.');
        }
    }, [isElectron]);
    const handleWalletCreated = (addresses, seed) => {
        setState((prev) => ({
            ...prev,
            hasWallet: true,
            addresses,
            currentAddress: addresses[0]?.address || '',
            userSeed: seed,
            showFundingGuide: true
        }));
    };
    const handleFundingComplete = () => {
        setState((prev) => ({
            ...prev,
            showFundingGuide: false,
            showQuickStartGuide: true
        }));
    };
    const handleFundingSkip = () => {
        setState((prev) => ({
            ...prev,
            showFundingGuide: false,
            showQuickStartGuide: true
        }));
    };
    const handleQuickStartDismiss = () => {
        setState((prev) => ({ ...prev, showQuickStartGuide: false }));
    };
    const handleConnect = async (config) => {
        if (!isElectron)
            return;
        setLoading(true);
        setError(null);
        console.log('Connecting to Electrum server:', config);
        try {
            const result = await window.electronAPI.connectWallet(config);
            console.log('Connection result:', result);
            if (result.success) {
                console.log('Successfully connected to Electrum server');
                // Update balance for current address
                let balance = null;
                if (state.currentAddress) {
                    console.log('Fetching balance for address:', state.currentAddress);
                    const balanceResult = await window.electronAPI.getBalance(state.currentAddress);
                    console.log('Balance result:', balanceResult);
                    if (balanceResult.success) {
                        balance = balanceResult.balance || null;
                        console.log('Balance retrieved:', balance);
                    }
                    else {
                        console.error('Failed to get balance:', balanceResult.error);
                    }
                }
                setState((prev) => ({
                    ...prev,
                    isConnected: true,
                    walletConfig: config,
                    balance
                }));
            }
            else {
                console.error('Connection failed:', result.error);
                setError(result.error || 'Failed to connect to wallet');
            }
        }
        catch (err) {
            console.error('Connection error:', err);
            setError('Connection failed. Please check your configuration.');
        }
        finally {
            setLoading(false);
        }
    };
    const handleDisconnect = () => {
        setState({
            hasWallet: false,
            isConnected: false,
            walletConfig: null,
            balance: null,
            addresses: [],
            currentAddress: '',
            activeTab: 'dashboard',
            showFundingGuide: false,
            showQuickStartGuide: false
        });
    };
    const refreshBalance = async () => {
        if (!isElectron || !state.currentAddress) {
            console.log('Cannot refresh balance: electron not available or no current address');
            return;
        }
        console.log('Refreshing balance for address:', state.currentAddress);
        try {
            const result = await window.electronAPI.getBalance(state.currentAddress);
            console.log('Balance result:', result);
            if (result.success) {
                setState((prev) => ({ ...prev, balance: result.balance || null }));
                console.log('Balance updated to:', result.balance);
            }
            else {
                console.error('Balance refresh failed:', result.error);
            }
        }
        catch (err) {
            console.error('Failed to refresh balance:', err);
        }
    };
    const handleTabChange = (tab) => {
        setState((prev) => ({ ...prev, activeTab: tab }));
    };
    if (!isElectron) {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "app-error", children: [(0, jsx_runtime_1.jsx)("h1", { children: "Doginal Inscription Wallet" }), (0, jsx_runtime_1.jsx)("p", { children: "This application requires Electron to run properly." }), (0, jsx_runtime_1.jsxs)("p", { children: ["Please run: ", (0, jsx_runtime_1.jsx)("code", { children: "npm run electron:dev" })] })] }));
    }
    if (!state.isConnected) {
        return ((0, jsx_runtime_1.jsx)("div", { className: "App", children: (0, jsx_runtime_1.jsx)(WalletOnboarding_1.default, { onWalletReady: handleWalletCreated, onConnect: handleConnect }) }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "App", children: [(0, jsx_runtime_1.jsx)("header", { className: "app-header", children: (0, jsx_runtime_1.jsxs)("div", { className: "header-content", children: [(0, jsx_runtime_1.jsx)("h1", { children: "\uD83D\uDC15 Doginal Inscription Wallet \uD83D\uDE80" }), (0, jsx_runtime_1.jsx)("button", { className: "disconnect-btn", onClick: handleDisconnect, children: "Disconnect \uD83D\uDE22" })] }) }), (0, jsx_runtime_1.jsxs)("nav", { className: "app-nav", children: [(0, jsx_runtime_1.jsx)("button", { className: `nav-btn ${state.activeTab === 'dashboard' ? 'active' : ''}`, onClick: () => handleTabChange('dashboard'), children: "\uD83D\uDCCA Dashboard" }), (0, jsx_runtime_1.jsx)("button", { className: `nav-btn ${state.activeTab === 'create' ? 'active' : ''}`, onClick: () => handleTabChange('create'), children: "\uD83C\uDFA8 Create Inscription" }), (0, jsx_runtime_1.jsx)("button", { className: `nav-btn ${state.activeTab === 'history' ? 'active' : ''}`, onClick: () => handleTabChange('history'), children: "\uD83D\uDCDA History" })] }), (0, jsx_runtime_1.jsxs)("main", { className: "app-main", children: [state.activeTab === 'dashboard' && ((0, jsx_runtime_1.jsx)(WalletDashboard_1.default, { balance: state.balance, currentAddress: state.currentAddress, onRefresh: refreshBalance })), state.activeTab === 'create' && ((0, jsx_runtime_1.jsx)(InscriptionCreator_1.default, { currentAddress: state.currentAddress, balance: state.balance, onSuccess: () => {
                            refreshBalance();
                            handleTabChange('history');
                        } })), state.activeTab === 'history' && ((0, jsx_runtime_1.jsx)(InscriptionHistory_1.default, {}))] }), (0, jsx_runtime_1.jsx)("footer", { className: "app-footer", children: (0, jsx_runtime_1.jsx)("p", { children: "Doginal Inscription Wallet v1.0.0 | 2 \uD83D\uDC15 DOGE tax per inscription \uD83D\uDCB0 | Much Wow! \uD83D\uDE80" }) }), state.showFundingGuide && state.currentAddress && ((0, jsx_runtime_1.jsx)(FundingGuide_1.default, { walletAddress: state.currentAddress, onComplete: handleFundingComplete, onSkip: handleFundingSkip })), state.showQuickStartGuide && ((0, jsx_runtime_1.jsx)(QuickStartGuide_1.default, { onDismiss: handleQuickStartDismiss }))] }));
}
exports.default = App;
