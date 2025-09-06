"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const QuickStartGuide = ({ onDismiss }) => {
    const [currentTip, setCurrentTip] = (0, react_1.useState)(0);
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
        }
        else {
            onDismiss();
        }
    };
    const prevTip = () => {
        if (currentTip > 0) {
            setCurrentTip(currentTip - 1);
        }
    };
    return ((0, jsx_runtime_1.jsx)("div", { className: "quick-start-guide", children: (0, jsx_runtime_1.jsxs)("div", { className: "quick-start-modal", children: [(0, jsx_runtime_1.jsxs)("div", { className: "quick-start-header", children: [(0, jsx_runtime_1.jsx)("h2", { children: "\uD83C\uDFAF Quick Start Guide" }), (0, jsx_runtime_1.jsx)("p", { children: "You're all set! Here's how to use your wallet" })] }), (0, jsx_runtime_1.jsx)("div", { className: "tip-navigation", children: tips.map((_, index) => ((0, jsx_runtime_1.jsx)("div", { className: `tip-dot ${currentTip === index ? 'active' : ''}`, onClick: () => setCurrentTip(index) }, index))) }), (0, jsx_runtime_1.jsxs)("div", { className: "current-tip", children: [(0, jsx_runtime_1.jsx)("div", { className: "tip-icon", children: tips[currentTip].icon }), (0, jsx_runtime_1.jsx)("h3", { children: tips[currentTip].title }), (0, jsx_runtime_1.jsx)("p", { children: tips[currentTip].description })] }), (0, jsx_runtime_1.jsx)("div", { className: "tip-progress", children: (0, jsx_runtime_1.jsxs)("span", { children: [currentTip + 1, " of ", tips.length] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "quick-start-actions", children: [currentTip > 0 && ((0, jsx_runtime_1.jsx)("button", { className: "btn-secondary", onClick: prevTip, children: "\u2190 Back" })), (0, jsx_runtime_1.jsx)("div", { className: "action-spacer" }), (0, jsx_runtime_1.jsx)("button", { className: "btn-skip", onClick: onDismiss, children: "Skip All" }), (0, jsx_runtime_1.jsx)("button", { className: "btn-primary", onClick: nextTip, children: currentTip === tips.length - 1 ? 'Got it! 🎉' : 'Next →' })] })] }) }));
};
exports.default = QuickStartGuide;
