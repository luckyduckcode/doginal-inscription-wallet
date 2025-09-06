"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importStar(require("react"));
const InscriptionCreator = ({ currentAddress, balance, onSuccess }) => {
    const [inscriptionData, setInscriptionData] = (0, react_1.useState)({
        content: '',
        contentType: 'text/plain',
        receivingAddress: currentAddress,
        feeRate: 1000
    });
    const [estimate, setEstimate] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [creating, setCreating] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [selectedFile, setSelectedFile] = (0, react_1.useState)(null);
    // Update receiving address when current address changes
    react_1.default.useEffect(() => {
        setInscriptionData(prev => ({ ...prev, receivingAddress: currentAddress }));
    }, [currentAddress]);
    const handleFileSelect = (0, react_1.useCallback)((event) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
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
                    content: content,
                    contentType: file.type || 'application/octet-stream'
                }));
            }
        };
        // Read as base64 for binary files, or text for text files
        if (file.type.startsWith('text/')) {
            reader.readAsText(file);
        }
        else {
            reader.readAsDataURL(file);
        }
    }, []);
    const handleTextChange = (0, react_1.useCallback)((text) => {
        setInscriptionData(prev => ({
            ...prev,
            content: text,
            contentType: 'text/plain'
        }));
        setSelectedFile(null);
    }, []);
    const updateEstimate = (0, react_1.useCallback)(async () => {
        if (!inscriptionData.content || !window.electronAPI)
            return;
        try {
            setLoading(true);
            const result = await window.electronAPI.estimateInscription(inscriptionData);
            if (result.success && result.estimate) {
                setEstimate(result.estimate);
            }
            else {
                setError(result.error || 'Failed to estimate cost');
            }
        }
        catch (err) {
            setError('Failed to estimate inscription cost');
        }
        finally {
            setLoading(false);
        }
    }, [inscriptionData]);
    // Update estimate when content changes
    react_1.default.useEffect(() => {
        if (inscriptionData.content) {
            updateEstimate();
        }
    }, [inscriptionData.content, inscriptionData.contentType, updateEstimate]);
    const handleCreateInscription = async () => {
        if (!inscriptionData.content || !window.electronAPI)
            return;
        // Validate balance
        if (!balance || balance.confirmed < (estimate?.totalCost || 2.01)) {
            setError(`Insufficient balance. Required: ${estimate?.totalCost || 2.01} DOGE`);
            return;
        }
        setCreating(true);
        setError(null);
        try {
            const result = await window.electronAPI.createInscription(inscriptionData);
            if (result.success) {
                alert('Inscription created successfully!');
                // Reset form
                setInscriptionData({
                    content: '',
                    contentType: 'text/plain',
                    receivingAddress: currentAddress,
                    feeRate: 1000
                });
                setSelectedFile(null);
                setEstimate(null);
                onSuccess();
            }
            else {
                setError(result.error || 'Failed to create inscription');
            }
        }
        catch (err) {
            setError('Failed to create inscription');
        }
        finally {
            setCreating(false);
        }
    };
    const canCreate = inscriptionData.content &&
        inscriptionData.receivingAddress &&
        estimate &&
        balance &&
        balance.confirmed >= estimate.totalCost;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "inscription-creator", children: [(0, jsx_runtime_1.jsx)("h2", { children: "\u270D\uFE0F Create Doginal Inscription \uD83D\uDE80" }), (0, jsx_runtime_1.jsx)("p", { children: "Turn your content into a permanent Dogecoin inscription! Much creativity! \uD83C\uDFA8" }), error && ((0, jsx_runtime_1.jsx)("div", { className: "error-message", children: error })), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { children: "Content Type" }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: '1rem', marginBottom: '1rem' }, children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: `nav-btn ${!selectedFile ? 'active' : ''}`, onClick: () => {
                                    setSelectedFile(null);
                                    setInscriptionData(prev => ({ ...prev, content: '', contentType: 'text/plain' }));
                                }, children: "Text" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: `nav-btn ${selectedFile ? 'active' : ''}`, onClick: () => document.getElementById('file-input')?.click(), children: "File" })] })] }), !selectedFile ? ((0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "text-content", children: "Text Content" }), (0, jsx_runtime_1.jsx)("textarea", { id: "text-content", value: typeof inscriptionData.content === 'string' ? inscriptionData.content : '', onChange: (e) => handleTextChange(e.target.value), placeholder: "Enter your text content here...", rows: 6, style: {
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            resize: 'vertical'
                        } })] })) : ((0, jsx_runtime_1.jsxs)("div", { className: "file-upload", children: [(0, jsx_runtime_1.jsx)("input", { type: "file", id: "file-input", onChange: handleFileSelect, accept: "image/*,text/*,.json,.svg" }), (0, jsx_runtime_1.jsxs)("div", { children: ["\uD83D\uDCC1 Selected: ", selectedFile.name, (0, jsx_runtime_1.jsx)("br", {}), "Size: ", (selectedFile.size / 1024).toFixed(2), " KB", (0, jsx_runtime_1.jsx)("br", {}), "Type: ", selectedFile.type] })] })), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "receiving-address", children: "Receiving Address" }), (0, jsx_runtime_1.jsx)("input", { type: "text", id: "receiving-address", value: inscriptionData.receivingAddress, onChange: (e) => setInscriptionData(prev => ({ ...prev, receivingAddress: e.target.value })), placeholder: "Dogecoin address to receive the inscription" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-group", children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "fee-rate", children: "Fee Rate (satoshis per byte)" }), (0, jsx_runtime_1.jsx)("input", { type: "number", id: "fee-rate", value: inscriptionData.feeRate || 1000, onChange: (e) => setInscriptionData(prev => ({ ...prev, feeRate: parseInt(e.target.value) })), min: "100", max: "10000" })] }), estimate && ((0, jsx_runtime_1.jsxs)("div", { className: "cost-estimate", children: [(0, jsx_runtime_1.jsx)("h3", { children: "\uD83D\uDCB0 Cost Estimate" }), (0, jsx_runtime_1.jsxs)("div", { className: "cost-item", children: [(0, jsx_runtime_1.jsx)("span", { children: "Content Size:" }), (0, jsx_runtime_1.jsxs)("span", { children: [estimate.inscriptionSize, " bytes"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "cost-item", children: [(0, jsx_runtime_1.jsx)("span", { children: "Network Fee:" }), (0, jsx_runtime_1.jsxs)("span", { children: [estimate.networkFee.toFixed(8), " DOGE"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "cost-item", children: [(0, jsx_runtime_1.jsx)("span", { children: "Service Tax:" }), (0, jsx_runtime_1.jsxs)("span", { children: [estimate.taxFee.toFixed(1), " DOGE"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "cost-item cost-total", children: [(0, jsx_runtime_1.jsx)("span", { children: "Total Cost:" }), (0, jsx_runtime_1.jsxs)("span", { children: [estimate.totalCost.toFixed(8), " DOGE"] })] }), (0, jsx_runtime_1.jsxs)("div", { style: { fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.8 }, children: ["Estimated confirmation time: ", estimate.estimatedConfirmationTime] })] })), balance && ((0, jsx_runtime_1.jsxs)("div", { style: { margin: '1rem 0', fontSize: '0.9rem' }, children: ["Available Balance: ", balance.confirmed.toFixed(8), " DOGE"] })), (0, jsx_runtime_1.jsx)("button", { className: "btn-primary", onClick: handleCreateInscription, disabled: !canCreate || creating || loading, style: { marginTop: '1rem' }, children: creating ? ((0, jsx_runtime_1.jsxs)("div", { className: "loading", children: [(0, jsx_runtime_1.jsx)("div", { className: "spinner" }), "Creating Inscription..."] })) : (`Create Inscription ${estimate ? `(${estimate.totalCost.toFixed(8)} DOGE)` : ''}`) }), (0, jsx_runtime_1.jsxs)("div", { style: { marginTop: '1rem', fontSize: '0.9rem', opacity: 0.8 }, children: [(0, jsx_runtime_1.jsxs)("p", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Important:" }), " Creating an inscription will permanently embed your content on the Dogecoin blockchain."] }), (0, jsx_runtime_1.jsx)("p", { children: "A 2 DOGE service tax is charged for each inscription to cover operational costs." })] })] }));
};
exports.default = InscriptionCreator;
