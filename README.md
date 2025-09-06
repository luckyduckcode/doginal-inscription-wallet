# 🐕 Doginal Inscription Wallet

A professional desktop application for creating Doginal inscriptions on the Dogecoin blockchain. Built with Electron, React, and TypeScript.

## ✨ Features

- **🔧 Complete Wallet Management**: Create new wallets or import existing ones
- **📝 Doginal Inscriptions**: Create inscriptions with any file type
- **�️ Professional GUI**: Modern desktop interface with tabs and real-time updates
- **💰 Built-in Revenue System**: 2 DOGE tax per inscription (developer fee)
- **🔐 Secure**: HD wallet support with seed phrase backup
- **� Real-time Balance**: Live balance checking and transaction history
- **🎯 Easy Setup**: One-click installer and launcher scripts

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Dogecoin wallet with sufficient balance

### Installation

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd inscription-wallet
   npm install
   ```

2. **Configure your tax wallet address** in `electron/main.js`:
   ```javascript
   const TAX_WALLET_ADDRESS = 'DYourWalletAddressHere123456789';
   ```

3. **Run the application**:
   ```bash
   npm run electron:dev
   ```

## 🏗️ Project Structure

```
inscription-wallet/
├── electron/                 # Electron main process
│   ├── main.js              # Main Electron app
│   └── preload.js           # Secure API bridge
├── src/                     # React frontend source
│   ├── components/          # UI components
│   │   ├── WalletConnect.tsx
│   │   ├── WalletDashboard.tsx
│   │   ├── InscriptionCreator.tsx
│   │   └── InscriptionHistory.tsx
│   ├── wallet/              # Doge-Electrum integration
│   │   └── dogeElectrum.ts  # Wallet operations
│   ├── inscriptions/        # Doginal inscription logic
│   │   ├── doginal.ts       # Main inscription manager
│   │   └── index.ts         # Exports
│   ├── types/               # TypeScript definitions
│   │   └── index.ts         # Interface definitions
│   ├── App.tsx              # Main React app
│   ├── App.css              # Application styles
│   └── index.tsx            # React entry point
├── public/                  # Static assets
│   ├── index.html           # HTML template
│   └── manifest.json        # PWA manifest
├── build/                   # Production build output
├── dist/                    # Electron build output
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript config
├── tsconfig.electron.json   # Electron TypeScript config
├── SETUP.md                 # Detailed setup guide
└── README.md               # This file
```

## 💰 Cost Structure

Each Doginal inscription costs:
- **Network Fee**: ~0.001 - 0.01 DOGE (varies by size and fee rate)
- **Service Tax**: 2.0 DOGE (goes to configured tax wallet)
- **Total**: ~2.001 - 2.01 DOGE per inscription

## 🔧 Usage

### 1. Connect Wallet
- Launch the application
- Enter your Electrum server details
- Default: `electrum.dogecoin.com:50001`
- Click "Connect Wallet"

### 2. Check Balance
- View your DOGE balance on the dashboard
- Ensure you have sufficient funds for inscriptions

### 3. Create Inscription
- Go to "Create Inscription" tab
- Choose text or file content (max 400KB)
- Enter receiving address
- Set fee rate (default: 1000 satoshis/byte)
- Review cost estimate
- Click "Create Inscription"

### 4. View History
- Go to "History" tab
- See all your created inscriptions
- Click to copy IDs or view on block explorer

## 🛠️ Development

### Available Scripts

- `npm run electron:dev` - Start development mode
- `npm run build` - Build for production
- `npm run build:react` - Build React frontend only
- `npm run build:electron` - Build Electron backend only
- `npm run electron:pack` - Package desktop app

### Tech Stack

- **Frontend**: React 18 + TypeScript
- **Desktop**: Electron 22
- **Blockchain**: bitcoinjs-lib for transaction handling
- **Styling**: Custom CSS with modern design
- **Build**: React Scripts + Electron Builder

## 🔐 Security Features

- **IPC Security**: Secure communication between renderer and main process
- **Context Isolation**: Frontend runs in isolated context
- **No Remote Module**: Enhanced security with preload scripts
- **Private Key Safety**: Keys never leave the Electrum wallet

## 📝 Supported Content Types

### Text Content
- Plain text
- JSON data
- HTML documents
- CSS stylesheets
- JavaScript code
- Any UTF-8 text

### File Content
- **Images**: PNG, JPG, GIF, SVG, WebP
- **Documents**: PDF, TXT, JSON, XML
- **Media**: Any file up to 400KB
- **Code**: Source code files

## 🌐 Network Support

- **Mainnet**: Production Dogecoin network
- **Testnet**: Testing environment
- **Custom Electrum servers**: Configurable endpoints

## ⚠️ Important Notes

1. **Tax Configuration**: Update `TAX_WALLET_ADDRESS` before deployment
2. **File Size Limit**: Maximum 400KB per inscription (Doginal standard)
3. **Permanent Storage**: Inscriptions are permanent and cannot be deleted
4. **Fee Estimation**: Network fees vary based on blockchain congestion
5. **Backup Wallets**: Always backup your wallet files and private keys

## 🐛 Troubleshooting

### Common Issues

**"npm not found"**
- Install Node.js from [nodejs.org](https://nodejs.org/)

**Wallet connection fails**
- Check Electrum server accessibility
- Verify firewall settings
- Try alternative servers

**Inscription creation fails**
- Ensure sufficient balance (fee + tax)
- Check file size limits
- Verify address format

**Build errors**
- Run `npm install` to update dependencies
- Clear node_modules and reinstall

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Dogecoin Official](https://dogecoin.com/)
- [Electrum Dogecoin](https://github.com/spesmilo/electrum)
- [Doginal Protocol](https://doginals.com/)
- [Node.js Download](https://nodejs.org/)

---

**Happy Doginal Creation!** 🚀🐕

*Remember: This application charges a 2 DOGE tax per inscription to cover operational costs.*