/**
 * API Configuration Constants
 * Doginal Inscription Wallet
 */

export const API_ENDPOINTS = {
  TREZOR_BLOCKBOOK: 'https://doge1.trezor.io/api',
  BLOCKCYPHER: 'https://api.blockcypher.com/v1/doge/main',
  DOGECHAIN: 'https://dogechain.info/api/v1'
};

export const API_RATE_LIMITS = {
  TREZOR: {
    maxRequests: 10,
    windowMs: 60000, // 1 minute
    backoffDelay: 2000
  },
  BLOCKCYPHER: {
    maxRequests: 5,
    windowMs: 60000,
    backoffDelay: 3000
  },
  DOGECHAIN: {
    maxRequests: 20,
    windowMs: 60000,
    backoffDelay: 1000
  }
};

export const CIRCUIT_BREAKER_CONFIG = {
  threshold: 5,
  timeout: 30000, // 30 seconds
  resetTimeout: 60000 // 1 minute
};
