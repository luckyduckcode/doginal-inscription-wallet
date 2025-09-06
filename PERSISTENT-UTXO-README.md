# Doginal Wallet - Persistent UTXO Detection

## 🚀 New Feature: Persistent UTXO Detection

This version includes **intelligent UTXO detection** that automatically finds available UTXOs for inscription creation, even when you have zero balance initially.

### ✨ Key Features

- **🔄 Persistent Retry Logic**: Automatically retries with increasing delays (5s → 10s → 30s → 60s)
- **🔍 Multi-Address Scanning**: Checks all your wallet addresses for available UTXOs
- **📊 Real-Time Balance Monitoring**: Detects incoming transactions immediately
- **💬 Progress Updates**: Shows detailed progress during the waiting process
- **🎯 Smart Detection**: Stops automatically when UTXOs are found

### 📋 How It Works

1. **Click "Create Inscription"** - The wallet starts looking for UTXOs
2. **Checks all addresses** - Scans every address in your wallet
3. **Shows progress** - Updates you on what's happening
4. **Waits for funds** - If no UTXOs found, waits and monitors balance
5. **Auto-creates** - When funds arrive, inscription is created automatically

### 🎨 User Experience

```
🔄 Starting inscription creation...
🔍 Checking 5 wallet addresses for UTXOs...
⏳ No UTXOs found. Waiting for funds...
💰 Current balance: 0 DOGE
🔄 Retrying in 10 seconds... (2/20)
💰 Send DOGE to any of these addresses:
   D6jyTpA4Jj5CEwz9EsYZWP1qsEFAmiDjjP
   D8kYpM3nVxQrW2sH7cNfT9gJ4mL8pXwK
   ...
✅ Found 2 UTXO(s) on address: D6jyTpA4Jj5CE...
📝 Creating inscription transaction...
📡 Broadcasting transaction to network...
✅ Inscription created! TXID: a1b2c3d4...
```

### 📁 Files Included

- `Doginal-Wallet-PERSISTENT-UTXO.exe` (150.3 MB) - Standalone executable
- `Doginal-Wallet-PERSISTENT-UTXO.zip` (124.76 MB) - Portable ZIP archive
- `Start-Persistent-Wallet.bat` - Easy launcher script

### 🚀 Quick Start

1. **Extract** `Doginal-Wallet-PERSISTENT-UTXO.zip` OR
2. **Run** `Doginal-Wallet-PERSISTENT-UTXO.exe` directly OR
3. **Use** `Start-Persistent-Wallet.bat` for detailed info

### 💡 Usage Tips

- **Send DOGE** to any of your wallet addresses while waiting
- **Monitor progress** in the inscription creation dialog
- **Cancel anytime** if you change your mind
- **Automatic completion** when funds are detected

### 🔧 Technical Details

- **Retry Attempts**: Up to 20 attempts with smart backoff
- **Address Coverage**: All wallet addresses are checked
- **Balance Updates**: Real-time monitoring every retry cycle
- **Network Efficiency**: Only checks when necessary
- **Error Recovery**: Handles network issues gracefully

---

**No more "No UTXOs available" errors!** 🎉

The wallet will patiently wait for your funds and create the inscription automatically when ready.
