import { useState, useCallback } from 'react';
import { DoginalInscription, InscriptionRequest, InscriptionEstimate } from '../types';
import { DogeElectrumWallet } from '../wallet/dogeElectrum';
import { DoginalInscriptions } from '../inscriptions/doginal';
import { WALLET_CONFIG } from '../constants';

export interface UseInscriptionReturn {
  // State
  creating: boolean;
  estimating: boolean;
  history: DoginalInscription[];
  error: string | null;
  progress: string | null;
  
  // Actions
  createInscription: (request: InscriptionRequest, wallet: DogeElectrumWallet) => Promise<DoginalInscription | null>;
  estimateInscription: (request: InscriptionRequest, wallet: DogeElectrumWallet) => Promise<InscriptionEstimate | null>;
  loadHistory: () => Promise<void>;
  clearError: () => void;
}

export const useInscription = (): UseInscriptionReturn => {
  const [creating, setCreating] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [history, setHistory] = useState<DoginalInscription[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const createInscription = useCallback(async (
    request: InscriptionRequest,
    wallet: DogeElectrumWallet
  ): Promise<DoginalInscription | null> => {
    setCreating(true);
    setError(null);
    setProgress('Initializing inscription...');
    
    try {
      const inscriptionService = new DoginalInscriptions(wallet, WALLET_CONFIG.TAX_WALLET_ADDRESS);
      
      const requestWithProgress = {
        ...request,
        taxAmount: WALLET_CONFIG.TAX_AMOUNT * 100000000, // Convert DOGE to satoshis
        onProgress: (message: string) => {
          setProgress(message);
        }
      };
      
      const inscription = await inscriptionService.createInscription(requestWithProgress);
      
      // Add to history
      setHistory(prev => [inscription, ...prev]);
      
      setProgress('Inscription completed successfully!');
      return inscription;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create inscription';
      setError(errorMessage);
      setProgress(null);
      return null;
    } finally {
      setCreating(false);
    }
  }, []);

  const estimateInscription = useCallback(async (
    request: InscriptionRequest,
    wallet: DogeElectrumWallet
  ): Promise<InscriptionEstimate | null> => {
    setEstimating(true);
    setError(null);
    
    try {
      const inscriptionService = new DoginalInscriptions(wallet, WALLET_CONFIG.TAX_WALLET_ADDRESS);
      const estimate = await inscriptionService.estimateInscriptionCost(request);
      return estimate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to estimate inscription';
      setError(errorMessage);
      return null;
    } finally {
      setEstimating(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      // Load from localStorage or API
      const stored = localStorage.getItem('inscription-history');
      if (stored) {
        const parsed = JSON.parse(stored);
        setHistory(parsed);
      }
    } catch (err) {
      console.warn('Failed to load inscription history:', err);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    creating,
    estimating,
    history,
    error,
    progress,
    createInscription,
    estimateInscription,
    loadHistory,
    clearError
  };
};
