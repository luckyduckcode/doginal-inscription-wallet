"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const InscriptionHistory = () => {
    const [inscriptions, setInscriptions] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
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
            }
            else {
                setError(result.error || 'Failed to load inscription history');
            }
        }
        catch (err) {
            setError('Failed to load inscription history');
        }
        finally {
            setLoading(false);
        }
    };
    const renderInscriptionPreview = (inscription) => {
        const { content, contentType } = inscription;
        if (contentType.startsWith('image/')) {
            const src = typeof content === 'string' ? content : `data:${contentType};base64,${Buffer.from(content).toString('base64')}`;
            return ((0, jsx_runtime_1.jsx)("img", { src: src, alt: "Inscription", style: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' } }));
        }
        else if (contentType.startsWith('text/')) {
            const text = typeof content === 'string' ? content : Buffer.from(content).toString('utf8');
            return ((0, jsx_runtime_1.jsx)("div", { style: {
                    padding: '1rem',
                    fontSize: '0.8rem',
                    textAlign: 'left',
                    overflow: 'auto',
                    height: '100%'
                }, children: text.length > 200 ? `${text.substring(0, 200)}...` : text }));
        }
        else {
            return ((0, jsx_runtime_1.jsxs)("div", { style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%'
                }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: '2rem' }, children: "\uD83D\uDCC4" }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: '0.8rem', marginTop: '0.5rem' }, children: contentType })] }));
        }
    };
    const formatDate = (date) => {
        return new Date(date).toLocaleString();
    };
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            alert('Copied to clipboard!');
        }).catch(() => {
            alert('Failed to copy to clipboard');
        });
    };
    if (loading) {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "inscription-history", children: [(0, jsx_runtime_1.jsx)("h2", { children: "\uD83D\uDCDC Inscription History \uD83D\uDE80" }), (0, jsx_runtime_1.jsx)("p", { children: "View all your Doginal inscriptions. Such history! \uD83D\uDCDA" }), (0, jsx_runtime_1.jsxs)("div", { style: { textAlign: 'center', padding: '2rem' }, children: [(0, jsx_runtime_1.jsx)("div", { className: "spinner", style: { margin: '0 auto' } }), (0, jsx_runtime_1.jsx)("p", { children: "Loading inscription history..." })] })] }));
    }
    if (error) {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "inscription-history", children: [(0, jsx_runtime_1.jsx)("h2", { children: "\uD83D\uDCDC Inscription History \uD83D\uDE80" }), (0, jsx_runtime_1.jsx)("p", { children: "View all your Doginal inscriptions. Such history! \uD83D\uDCDA" }), (0, jsx_runtime_1.jsx)("div", { className: "error-message", children: error }), (0, jsx_runtime_1.jsx)("button", { className: "btn-primary", onClick: loadInscriptionHistory, children: "Retry" })] }));
    }
    if (inscriptions.length === 0) {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "inscription-history", children: [(0, jsx_runtime_1.jsx)("h2", { children: "\uD83D\uDCDC Inscription History \uD83D\uDE80" }), (0, jsx_runtime_1.jsx)("p", { children: "View all your Doginal inscriptions. Such history! \uD83D\uDCDA" }), (0, jsx_runtime_1.jsxs)("div", { style: {
                        textAlign: 'center',
                        padding: '3rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '16px',
                        margin: '2rem 0'
                    }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: '3rem', marginBottom: '1rem' }, children: "\uD83C\uDFDB\uFE0F" }), (0, jsx_runtime_1.jsx)("h3", { children: "No inscriptions yet" }), (0, jsx_runtime_1.jsx)("p", { children: "Create your first Doginal inscription to see it here!" })] })] }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "inscription-history", children: [(0, jsx_runtime_1.jsx)("h2", { children: "\uD83D\uDCDC Inscription History \uD83D\uDE80" }), (0, jsx_runtime_1.jsx)("p", { children: "View all your Doginal inscriptions. Such history! \uD83D\uDCDA" }), (0, jsx_runtime_1.jsx)("div", { className: "history-grid", children: inscriptions.map((inscription) => ((0, jsx_runtime_1.jsxs)("div", { className: "inscription-card", children: [(0, jsx_runtime_1.jsx)("div", { className: "inscription-preview", children: renderInscriptionPreview(inscription) }), (0, jsx_runtime_1.jsxs)("div", { style: { textAlign: 'left' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: '0.5rem' }, children: [(0, jsx_runtime_1.jsx)("strong", { children: "Type:" }), " ", inscription.contentType] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: '0.5rem' }, children: [(0, jsx_runtime_1.jsx)("strong", { children: "Size:" }), " ", inscription.size, " bytes"] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: '0.5rem' }, children: [(0, jsx_runtime_1.jsx)("strong", { children: "Created:" }), " ", formatDate(inscription.createdAt)] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: '0.5rem' }, children: [(0, jsx_runtime_1.jsx)("strong", { children: "Fee:" }), " ", inscription.fee.toFixed(8), " DOGE"] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: '0.5rem' }, children: [(0, jsx_runtime_1.jsx)("strong", { children: "Tax:" }), " ", inscription.taxPaid.toFixed(1), " DOGE"] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: '1rem' }, children: [(0, jsx_runtime_1.jsx)("strong", { children: "Transaction:" }), (0, jsx_runtime_1.jsx)("div", { className: "inscription-id", style: { cursor: 'pointer' }, onClick: () => copyToClipboard(inscription.txid), title: "Click to copy transaction ID", children: inscription.txid })] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: '1rem' }, children: [(0, jsx_runtime_1.jsx)("strong", { children: "Inscription ID:" }), (0, jsx_runtime_1.jsx)("div", { className: "inscription-id", style: { cursor: 'pointer' }, onClick: () => copyToClipboard(inscription.id), title: "Click to copy inscription ID", children: inscription.id })] }), (0, jsx_runtime_1.jsxs)("div", { style: {
                                        display: 'flex',
                                        gap: '0.5rem',
                                        fontSize: '0.8rem'
                                    }, children: [(0, jsx_runtime_1.jsx)("button", { style: {
                                                background: '#4CAF50',
                                                color: 'white',
                                                border: 'none',
                                                padding: '0.3rem 0.6rem',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem'
                                            }, onClick: () => copyToClipboard(inscription.id), children: "Copy ID" }), (0, jsx_runtime_1.jsx)("button", { style: {
                                                background: '#2196F3',
                                                color: 'white',
                                                border: 'none',
                                                padding: '0.3rem 0.6rem',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem'
                                            }, onClick: () => {
                                                const explorerUrl = `https://dogechain.info/tx/${inscription.txid}`;
                                                window.electronAPI?.openExternal?.(explorerUrl);
                                            }, children: "View on Explorer" })] })] })] }, inscription.id))) }), (0, jsx_runtime_1.jsxs)("div", { style: {
                    textAlign: 'center',
                    marginTop: '2rem',
                    fontSize: '0.9rem',
                    opacity: 0.8
                }, children: [(0, jsx_runtime_1.jsxs)("p", { children: ["Total inscriptions created: ", inscriptions.length] }), (0, jsx_runtime_1.jsxs)("p", { children: ["Total tax paid: ", inscriptions.reduce((sum, i) => sum + i.taxPaid, 0).toFixed(1), " DOGE"] })] })] }));
};
exports.default = InscriptionHistory;
