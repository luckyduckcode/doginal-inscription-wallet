# 🐕 Doginal Inscription Wallet - Organized Codebase

A professional desktop application for creating Doginal inscriptions on the Dogecoin blockchain. Built with Electron, React, and TypeScript with clean architecture patterns.

## 📁 Project Structure

```
src/
├── components/           # React UI components
│   ├── WalletConnect.tsx
│   ├── WalletDashboard.tsx
│   ├── InscriptionCreator.tsx
│   ├── InscriptionHistory.tsx
│   └── ...
├── constants/           # Configuration constants
│   ├── networks.ts      # Dogecoin network parameters
│   ├── api.ts          # API endpoints and rate limits
│   ├── wallet.ts       # Wallet configuration
│   └── index.ts
├── services/           # Business logic services
│   ├── electrumService.ts   # Electrum server communication
│   ├── httpApiService.ts    # HTTP API fallbacks
│   └── index.ts
├── hooks/              # Custom React hooks
│   ├── useWallet.ts    # Wallet state management
│   ├── useInscription.ts   # Inscription operations
│   └── index.ts
├── wallet/             # Core wallet implementations
│   ├── dogeElectrum.ts      # Original implementation (working)
│   └── dogeElectrumRefactored.ts  # Clean organized version
├── types/              # TypeScript type definitions
│   └── index.ts
├── utils/              # Utility functions
│   └── errorHandler.ts
└── inscriptions/       # Inscription logic
    └── doginal.ts
```

## ✨ Architectural Improvements

### 🔧 **Separation of Concerns**
- **Services Layer**: Clean API communication with circuit breakers and rate limiting
- **Constants**: Centralized configuration management
- **Hooks**: Reusable state management for React components
- **Types**: Comprehensive TypeScript definitions

### 🛡️ **Resilience Features**
- **Circuit Breaker Pattern**: Automatic API failover when services are down
- **Rate Limiting**: Respects API limits with exponential backoff
- **HTTP API Fallbacks**: Multiple Dogecoin API endpoints for redundancy
- **Private Key Re-derivation**: Automatic key recovery from seed when needed

### ⚡ **Performance Optimizations**
- **Balance Caching**: 30-second TTL to reduce API calls
- **UTXO Optimization**: Efficient UTXO selection and management
- **Smart Retry Logic**: Progressive delays with maximum limits

## 🔄 Migration Path

### Current Working Version: `dogeElectrum.ts`
- ✅ **Fee calculation fixed** (10 sat/byte realistic rates)
- ✅ **HTTP API fallbacks** for balance, UTXOs, transaction hex
- ✅ **Private key re-derivation** for signing
- ✅ **Circuit breakers** and rate limiting
- ✅ **All inscription functionality working**

### Future Organized Version: `dogeElectrumRefactored.ts`
- 🔄 **Clean service separation** 
- 🔄 **Improved maintainability**
- 🔄 **Better error handling**
- 🔄 **Enhanced testing capabilities**

## 🚀 Key Fixes Implemented

1. **Realistic Fee Calculation**
   ```typescript
   // Before: 500,000 sat/byte (unrealistic)
   // After: 10 sat/byte (Dogecoin standard)
   estimateFee(inputCount, outputCount, feeRate = 10)
   ```

2. **Multi-API Resilience**
   ```typescript
   // Trezor Blockbook → BlockCypher → DogeChain fallback chain
   // Circuit breakers prevent cascading failures
   ```

3. **Private Key Recovery**
   ```typescript
   // Re-derive from seed when stored keys missing
   // Solves "Invalid length: Expected 32 but received 0"
   ```

## 📦 Build System

### Current Working Builds
- `dist-signing-fixed/` - **Latest working version** with all fixes
- `dist/` - Original build
- `build/` - React production build

### Build Commands
```bash
# Compile TypeScript
npx tsc

# Build Electron app
npx electron-builder --dir --config.directories.output=dist-signing-fixed

# Run development
npm start
```

## 🔧 Development Guidelines

### Using the New Structure

1. **Import from organized modules:**
   ```typescript
   import { DOGECOIN_NETWORK, WALLET_CONFIG } from '../constants';
   import { ElectrumService, HTTPAPIService } from '../services';
   import { useWallet } from '../hooks';
   ```

2. **Service-based architecture:**
   ```typescript
   // Instead of inline API calls
   const balance = await httpApiService.getBalance(address);
   const utxos = await electrumService.getUTXOs(address);
   ```

3. **Hook-based state management:**
   ```typescript
   const { balance, connect, disconnect } = useWallet();
   ```

## 🧪 Testing

### Current Status
- ✅ **Balance detection**: 12.1 DOGE confirmed
- ✅ **UTXO detection**: 2 UTXOs found (10.0 + 2.1 DOGE)
- ✅ **Transaction creation**: Working with HTTP API fallbacks
- ✅ **Private key signing**: Re-derivation fallback implemented

### Test Commands
```bash
# Test wallet functionality
./Run-Complete-Wallet.bat

# Test specific address
node test-api.js DAYfTtLaVgDR69f5eVd9dj45Ck8f7s7Bqd
```

## 📚 Documentation

- `README.md` - Main project documentation
- `COMPLETE-README.md` - Complete wallet with DLLs
- `PERSISTENT-UTXO-README.md` - UTXO detection features

---

**Status**: Code organization complete ✅  
**Next**: Test refactored implementation and migrate components
