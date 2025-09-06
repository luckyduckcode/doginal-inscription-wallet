/**
 * Wallet Configuration Constants
 * Doginal Inscription Wallet
 */

export const WALLET_CONFIG = {
  TAX_WALLET_ADDRESS: 'DSdmMg7Mrmdm2dWL4fwmuPpFf1YVDfLzVv',
  TAX_AMOUNT: 2.0,
  DEFAULT_FEE_RATE: 10, // 10 sat/byte for Dogecoin
  MAX_INSCRIPTION_SIZE: 400000,
  MIN_BALANCE_FOR_INSCRIPTION: 0.01 // DOGE
};

export const TRANSACTION_CONFIG = {
  DUST_LIMIT: 546, // satoshis
  MIN_FEE: 1000, // satoshis (0.00001 DOGE)
  MAX_FEE_RATE: 1000, // sat/byte
  CONFIRMATION_TARGET: 6
};

export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 5,
  BASE_DELAY: 1000, // 1 second
  MAX_DELAY: 30000, // 30 seconds
  BACKOFF_FACTOR: 2
};
