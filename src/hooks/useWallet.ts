/**
 * Wallet State Hook
 * Manages wallet connection, balance, and address state
 */

import { useState, useEffect, useCallback } from 'react';
import { WalletBalance, WalletAddress, WalletConfig } from '../types';
import { DogeElectrumWallet } from '../wallet/dogeElectrum';

export interface UseWalletReturn {
  // State
  isConnected: boolean;
  balance: WalletBalance | null;
  addresses: WalletAddress[];
  currentAddress: string;
  loading: boolean;
  error: string | null;
  
  // Actions
  connect: (config: WalletConfig) => Promise<boolean>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  setCurrentAddress: (address: string) => void;
}

export const useWallet = (): UseWalletReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [addresses, setAddresses] = useState<WalletAddress[]>([]);
  const [currentAddress, setCurrentAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<DogeElectrumWallet | null>(null);

  const connect = useCallback(async (config: WalletConfig): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const newWallet = new DogeElectrumWallet();
      await newWallet.connect(config);
      
      setWallet(newWallet);
      setIsConnected(true);
      
      // Set the current address from config
      if (config.walletAddress) {
        setCurrentAddress(config.walletAddress);
        setAddresses([{
          address: config.walletAddress,
          balance: {
            confirmed: 0,
            unconfirmed: 0,
            total: 0
          },
          isUsed: false,
          derivationPath: "m/44'/3'/0'/0/0"
        }]);
      }
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to wallet');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wallet) {
      wallet.disconnect();
    }
    setWallet(null);
    setIsConnected(false);
    setBalance(null);
    setAddresses([]);
    setCurrentAddress('');
    setError(null);
  }, [wallet]);

  const refreshBalance = useCallback(async () => {
    if (!wallet || !currentAddress) return;
    
    setLoading(true);
    try {
      const walletBalance = await wallet.getBalance(currentAddress);
      setBalance(walletBalance);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh balance');
    } finally {
      setLoading(false);
    }
  }, [wallet, currentAddress]);

  const handleSetCurrentAddress = useCallback((address: string) => {
    setCurrentAddress(address);
    setBalance(null); // Reset balance when changing address
  }, []);

  // Auto-refresh balance when address changes
  useEffect(() => {
    if (currentAddress && isConnected) {
      refreshBalance();
    }
  }, [currentAddress, isConnected, refreshBalance]);

  return {
    isConnected,
    balance,
    addresses,
    currentAddress,
    loading,
    error,
    connect,
    disconnect,
    refreshBalance,
    setCurrentAddress: handleSetCurrentAddress
  };
};
