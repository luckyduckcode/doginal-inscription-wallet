/**
 * HTTP API Service
 * Handles HTTP API calls to various Dogecoin services
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { API_ENDPOINTS, API_RATE_LIMITS, CIRCUIT_BREAKER_CONFIG } from '../constants';

interface APIEndpoint {
  name: string;
  baseURL: string;
  rateLimit: {
    maxRequests: number;
    windowMs: number;
    backoffDelay: number;
  };
}

interface CircuitBreaker {
  failures: number;
  isOpen: boolean;
  nextAttempt: number;
}

export class HTTPAPIService {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();
  
  private endpoints: APIEndpoint[] = [
    {
      name: 'Trezor',
      baseURL: API_ENDPOINTS.TREZOR_BLOCKBOOK,
      rateLimit: API_RATE_LIMITS.TREZOR
    },
    {
      name: 'BlockCypher',
      baseURL: API_ENDPOINTS.BLOCKCYPHER,
      rateLimit: API_RATE_LIMITS.BLOCKCYPHER
    },
    {
      name: 'DogeChain',
      baseURL: API_ENDPOINTS.DOGECHAIN,
      rateLimit: API_RATE_LIMITS.DOGECHAIN
    }
  ];

  constructor() {
    // Initialize circuit breakers
    for (const endpoint of this.endpoints) {
      this.circuitBreakers.set(endpoint.name, {
        failures: 0,
        isOpen: false,
        nextAttempt: 0
      });
    }
  }

  private async makeRequest(endpoint: APIEndpoint, path: string): Promise<any> {
    const breaker = this.circuitBreakers.get(endpoint.name);
    
    // Check circuit breaker
    if (breaker && breaker.isOpen && Date.now() < breaker.nextAttempt) {
      throw new Error(`Circuit breaker open for ${endpoint.name}`);
    }

    // Check rate limiting
    if (!this.checkRateLimit(endpoint)) {
      await this.delay(endpoint.rateLimit.backoffDelay);
    }

    try {
      const response = await axios.get(`${endpoint.baseURL}${path}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Doginal-Wallet/1.0.0'
        }
      });

      // Reset circuit breaker on success
      if (breaker) {
        breaker.failures = 0;
        breaker.isOpen = false;
      }

      return response.data;
    } catch (error) {
      // Update circuit breaker
      if (breaker) {
        breaker.failures++;
        if (breaker.failures >= CIRCUIT_BREAKER_CONFIG.threshold) {
          breaker.isOpen = true;
          breaker.nextAttempt = Date.now() + CIRCUIT_BREAKER_CONFIG.resetTimeout;
        }
      }
      throw error;
    }
  }

  private checkRateLimit(endpoint: APIEndpoint): boolean {
    const now = Date.now();
    const limits = this.requestCounts.get(endpoint.name);

    if (!limits || now > limits.resetTime) {
      this.requestCounts.set(endpoint.name, {
        count: 1,
        resetTime: now + endpoint.rateLimit.windowMs
      });
      return true;
    }

    if (limits.count >= endpoint.rateLimit.maxRequests) {
      return false;
    }

    limits.count++;
    return true;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getBalance(address: string): Promise<{ balance: number; unconfirmedBalance: number } | null> {
    const attempts = [
      {
        endpoint: this.endpoints[0], // Trezor
        path: `/address/${address}`
      },
      {
        endpoint: this.endpoints[2], // DogeChain
        path: `/address/balance/${address}`
      }
    ];

    for (const attempt of attempts) {
      try {
        const data = await this.makeRequest(attempt.endpoint, attempt.path);
        
        if (attempt.endpoint.name === 'Trezor') {
          return {
            balance: parseInt(data.balance) || 0,
            unconfirmedBalance: parseInt(data.unconfirmedBalance) || 0
          };
        } else if (attempt.endpoint.name === 'DogeChain') {
          return {
            balance: Math.round((data.balance || 0) * 100000000),
            unconfirmedBalance: 0
          };
        }
      } catch (error) {
        console.warn(`❌ ${attempt.endpoint.name} balance failed:`, error.message);
      }
    }

    return null;
  }

  async getUTXOs(address: string): Promise<any[]> {
    const attempts = [
      {
        endpoint: this.endpoints[0], // Trezor
        path: `/utxo/${address}`
      },
      {
        endpoint: this.endpoints[1], // BlockCypher
        path: `/addrs/${address}?unspentOnly=true`
      }
    ];

    for (const attempt of attempts) {
      try {
        const data = await this.makeRequest(attempt.endpoint, attempt.path);
        
        if (attempt.endpoint.name === 'Trezor' && Array.isArray(data)) {
          return data.map(utxo => ({
            txid: utxo.txid,
            vout: utxo.vout,
            value: parseInt(utxo.value)
          }));
        } else if (attempt.endpoint.name === 'BlockCypher' && data.txrefs) {
          return data.txrefs.map((utxo: any) => ({
            txid: utxo.tx_hash,
            vout: utxo.tx_output_n,
            value: utxo.value
          }));
        }
      } catch (error) {
        console.warn(`❌ ${attempt.endpoint.name} UTXO failed:`, error.message);
      }
    }

    return [];
  }

  async getTransactionHex(txid: string): Promise<string | null> {
    const attempts = [
      {
        endpoint: this.endpoints[0], // Trezor
        path: `/tx/${txid}`
      },
      {
        endpoint: this.endpoints[1], // BlockCypher
        path: `/txs/${txid}?includeHex=true`
      }
    ];

    for (const attempt of attempts) {
      try {
        const data = await this.makeRequest(attempt.endpoint, attempt.path);
        
        if (attempt.endpoint.name === 'Trezor' && data.hex) {
          return data.hex;
        } else if (attempt.endpoint.name === 'BlockCypher' && data.hex) {
          return data.hex;
        }
      } catch (error) {
        console.warn(`❌ ${attempt.endpoint.name} transaction hex failed:`, error.message);
      }
    }

    return null;
  }

  async broadcastTransaction(txHex: string): Promise<string | null> {
    const attempts = [
      {
        endpoint: this.endpoints[0], // Trezor
        path: '/sendtx',
        method: 'POST',
        data: { hex: txHex }
      },
      {
        endpoint: this.endpoints[1], // BlockCypher
        path: '/txs/push',
        method: 'POST',
        data: { tx: txHex }
      }
    ];

    for (const attempt of attempts) {
      try {
        const response = await axios.post(
          `${attempt.endpoint.baseURL}${attempt.path}`,
          attempt.data,
          {
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Doginal-Wallet/1.0.0'
            }
          }
        );

        if (attempt.endpoint.name === 'Trezor' && response.data.result) {
          return response.data.result;
        } else if (attempt.endpoint.name === 'BlockCypher' && response.data.tx) {
          return response.data.tx.hash;
        }
      } catch (error) {
        console.warn(`❌ ${attempt.endpoint.name} broadcast failed:`, error.message);
      }
    }

    return null;
  }
}
