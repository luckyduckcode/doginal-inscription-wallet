"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const WalletConnect = ({ onConnect, loading, error }) => {
    const [config, setConfig] = (0, react_1.useState)({
        network: 'mainnet',
        rpcUrl: '',
        walletAddress: '',
        electrumServer: 'electrum1.cipig.net',
        port: 10061
    });
    const handleSubmit = (e) => {
        e.preventDefault();
        onConnect(config);
    };
    const handleInputChange = (field, value) => {
        setConfig(prev => ({
            ...prev,
            [field]: value
        }));
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "wallet-connect", children: [(0, jsx_runtime_1.jsx)("h2", { children: "\uD83D\uDC15 Connect to Dogecoin Wallet \uD83D\uDE80" }), (0, jsx_runtime_1.jsx)("p", { children: "Connect to your Doge-Electrum wallet to start creating Doginal inscriptions! Much wow! \uD83C\uDFA8" }), error && ((0, jsx_runtime_1.jsx)("div", { className: "error-message", children: error })), (0, jsx_runtime_1.jsxs)("form", { onSubmit: handleSubmit, children: [(0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "network", children: "Network" }), (0, jsx_runtime_1.jsxs)("select", { id: "network", value: config.network, onChange: (e) => handleInputChange('network', e.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "mainnet", children: "Mainnet" }), (0, jsx_runtime_1.jsx)("option", { value: "testnet", children: "Testnet" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "electrumServer", children: "Electrum Server" }), (0, jsx_runtime_1.jsx)("input", { type: "text", id: "electrumServer", value: config.electrumServer || '', onChange: (e) => handleInputChange('electrumServer', e.target.value), placeholder: "electrum1.cipig.net" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "port", children: "Port" }), (0, jsx_runtime_1.jsx)("input", { type: "number", id: "port", value: config.port || 50001, onChange: (e) => handleInputChange('port', parseInt(e.target.value)), placeholder: "10061" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "walletAddress", children: "Wallet Address (Optional)" }), (0, jsx_runtime_1.jsx)("input", { type: "text", id: "walletAddress", value: config.walletAddress, onChange: (e) => handleInputChange('walletAddress', e.target.value), placeholder: "Your Dogecoin address" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "rpcUrl", children: "RPC URL (Optional)" }), (0, jsx_runtime_1.jsx)("input", { type: "text", id: "rpcUrl", value: config.rpcUrl, onChange: (e) => handleInputChange('rpcUrl', e.target.value), placeholder: "http://localhost:22555" })] }), (0, jsx_runtime_1.jsx)("button", { type: "submit", className: "btn-primary", disabled: loading, children: loading ? ((0, jsx_runtime_1.jsxs)("div", { className: "loading", children: [(0, jsx_runtime_1.jsx)("div", { className: "spinner" }), "Connecting..."] })) : ('Connect Wallet') })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginTop: '2rem', fontSize: '0.9rem', opacity: 0.8 }, children: [(0, jsx_runtime_1.jsxs)("p", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Note:" }), " This wallet charges a 2 DOGE tax per inscription to cover service costs."] }), (0, jsx_runtime_1.jsx)("p", { children: "Make sure you have sufficient DOGE balance for inscriptions and fees." })] })] }));
};
exports.default = WalletConnect;
