/**
 * Electrum Service
 * Handles Electrum server connections and communications
 */

import { ELECTRUM_SERVERS, DOGECOIN_NETWORK } from '../constants';
import * as crypto from 'crypto';
import * as bitcoin from 'bitcoinjs-lib';

const ElectrumClient = require('electrum-client');

export class ElectrumService {
  private client: any = null;
  private isConnected: boolean = false;
  private currentServer: any = null;

  async connect(): Promise<boolean> {
    for (const server of ELECTRUM_SERVERS) {
      try {
        console.log(`🔗 Attempting to connect to ${server.name} (${server.host}:${server.port})...`);
        
        this.client = new ElectrumClient(server.port, server.host, server.protocol);
        await this.client.connect();
        
        const version = await this.client.server_version();
        console.log(`✅ Connected to ${server.name}:`, version);
        
        this.isConnected = true;
        this.currentServer = server;
        return true;
      } catch (error) {
        console.warn(`❌ Failed to connect to ${server.name}:`, error.message);
        if (this.client) {
          try {
            await this.client.close();
          } catch (e) {
            // Ignore close errors
          }
        }
      }
    }
    
    console.error('❌ Failed to connect to any Electrum server');
    return false;
  }

  async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      try {
        await this.client.close();
      } catch (error) {
        console.warn('Warning during disconnect:', error.message);
      }
    }
    this.isConnected = false;
    this.client = null;
    this.currentServer = null;
  }

  getScriptHash(address: string): string {
    const script = bitcoin.address.toOutputScript(address, DOGECOIN_NETWORK);
    const hash = crypto.createHash('sha256').update(script).digest();
    return hash.reverse().toString('hex');
  }

  async getBalance(address: string): Promise<{ confirmed: number; unconfirmed: number } | null> {
    if (!this.isConnected || !this.client) {
      throw new Error('Not connected to Electrum server');
    }

    try {
      const scriptHash = this.getScriptHash(address);
      const balance = await this.client.blockchainScripthash_getBalance(scriptHash);
      
      return {
        confirmed: balance.confirmed || 0,
        unconfirmed: balance.unconfirmed || 0
      };
    } catch (error) {
      console.error('Electrum balance error:', error);
      return null;
    }
  }

  async getUTXOs(address: string): Promise<any[]> {
    if (!this.isConnected || !this.client) {
      throw new Error('Not connected to Electrum server');
    }

    try {
      const scriptHash = this.getScriptHash(address);
      const utxos = await this.client.blockchainScripthash_listunspent(scriptHash);
      return utxos || [];
    } catch (error) {
      console.error('Electrum UTXO error:', error);
      return [];
    }
  }

  async broadcastTransaction(txHex: string): Promise<string> {
    if (!this.isConnected || !this.client) {
      throw new Error('Not connected to Electrum server');
    }

    try {
      const txid = await this.client.blockchainTransaction_broadcast(txHex);
      return txid;
    } catch (error) {
      console.error('Electrum broadcast error:', error);
      throw error;
    }
  }

  isServerConnected(): boolean {
    return this.isConnected;
  }

  getCurrentServer(): any {
    return this.currentServer;
  }
}
