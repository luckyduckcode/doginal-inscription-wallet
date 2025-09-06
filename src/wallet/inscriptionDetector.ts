export interface DetectedInscription {
  txid: string;
  vout: number;
  value: number;
  address: string;
  inscriptionId?: string;
  contentType?: string;
  content?: string;
  inscriptionNumber?: number;
}

export interface UTXOResponse {
  txid: string;
  vout: number;
  value: number;
  height?: number;
  confirmations?: number;
}

export class InscriptionDetector {
  private static readonly BLOCKBOOK_ENDPOINTS = [
    'https://doge1.trezor.io',
    'https://doge2.trezor.io',
    'https://dogechain.info'
  ];

  private static readonly ORDINALS_ENDPOINTS = [
    'https://ordinals.com/api',
    'https://unisat.io/api'
  ];

  /**
   * Detects inscriptions for given addresses
   */
  static async detectInscriptions(addresses: string[]): Promise<DetectedInscription[]> {
    const allInscriptions: DetectedInscription[] = [];

    for (const address of addresses) {
      try {
        const inscriptions = await this.getInscriptionsForAddress(address);
        allInscriptions.push(...inscriptions);
      } catch (error) {
        console.error(`Error detecting inscriptions for address ${address}:`, error);
      }
    }

    return allInscriptions;
  }

  /**
   * Gets UTXOs for an address using multiple endpoints for fallback
   */
  private static async getUTXOs(address: string): Promise<UTXOResponse[]> {
    for (const endpoint of this.BLOCKBOOK_ENDPOINTS) {
      try {
        const response = await fetch(`${endpoint}/api/v2/utxo/${address}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.warn(`Failed to fetch UTXOs from ${endpoint}:`, error);
        continue;
      }
    }

    throw new Error('All UTXO endpoints failed');
  }

  /**
   * Gets transaction details
   */
  private static async getTransaction(txid: string): Promise<any> {
    for (const endpoint of this.BLOCKBOOK_ENDPOINTS) {
      try {
        const response = await fetch(`${endpoint}/api/v2/tx/${txid}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.warn(`Failed to fetch transaction from ${endpoint}:`, error);
        continue;
      }
    }

    throw new Error('All transaction endpoints failed');
  }

  /**
   * Gets inscriptions for a specific address
   */
  private static async getInscriptionsForAddress(address: string): Promise<DetectedInscription[]> {
    try {
      const utxos = await this.getUTXOs(address);
      const inscriptions: DetectedInscription[] = [];

      for (const utxo of utxos) {
        try {
          // Check if this UTXO contains an inscription
          const inscription = await this.checkUTXOForInscription(utxo, address);
          if (inscription) {
            inscriptions.push(inscription);
          }
        } catch (error) {
          console.warn(`Error checking UTXO ${utxo.txid}:${utxo.vout}:`, error);
        }
      }

      return inscriptions;
    } catch (error) {
      console.error(`Error getting inscriptions for address ${address}:`, error);
      return [];
    }
  }

  /**
   * Checks if a UTXO contains an inscription
   */
  private static async checkUTXOForInscription(
    utxo: UTXOResponse, 
    address: string
  ): Promise<DetectedInscription | null> {
    try {
      const tx = await this.getTransaction(utxo.txid);
      
      // Check if this transaction creates an inscription
      const inscriptionData = await this.parseInscriptionFromTransaction(tx, utxo.vout);
      
      if (inscriptionData) {
        return {
          txid: utxo.txid,
          vout: utxo.vout,
          value: utxo.value,
          address: address,
          inscriptionId: `${utxo.txid}i${utxo.vout}`,
          contentType: inscriptionData.contentType,
          content: inscriptionData.content,
          inscriptionNumber: inscriptionData.inscriptionNumber
        };
      }

      return null;
    } catch (error) {
      console.warn(`Error checking UTXO for inscription:`, error);
      return null;
    }
  }

  /**
   * Parses inscription data from transaction
   */
  private static async parseInscriptionFromTransaction(tx: any, vout: number): Promise<{
    contentType?: string;
    content?: string;
    inscriptionNumber?: number;
  } | null> {
    try {
      // Look for inscription envelope in the transaction
      const output = tx.vout[vout];
      if (!output || !output.scriptPubKey || !output.scriptPubKey.hex) {
        return null;
      }

      const scriptHex = output.scriptPubKey.hex;
      
      // Look for inscription patterns in the script
      // Doginals use OP_FALSE OP_IF "ord" OP_1 <content-type> OP_0 <content> OP_ENDIF
      const inscriptionEnvelope = this.findInscriptionEnvelope(scriptHex);
      
      if (inscriptionEnvelope) {
        return {
          contentType: inscriptionEnvelope.contentType,
          content: inscriptionEnvelope.content,
          inscriptionNumber: await this.getInscriptionNumber(tx.txid, vout)
        };
      }

      return null;
    } catch (error) {
      console.warn('Error parsing inscription from transaction:', error);
      return null;
    }
  }

  /**
   * Finds inscription envelope in script hex
   */
  private static findInscriptionEnvelope(scriptHex: string): {
    contentType?: string;
    content?: string;
  } | null {
    try {
      // Convert hex to bytes
      const script = this.hexToBytes(scriptHex);
      
      // Look for the inscription pattern: OP_FALSE OP_IF "ord" OP_1
      // OP_FALSE = 0x00, OP_IF = 0x63, "ord" = 0x6f7264, OP_1 = 0x51
      const ordPattern = [0x00, 0x63, 0x03, 0x6f, 0x72, 0x64, 0x51];
      
      let patternIndex = -1;
      for (let i = 0; i <= script.length - ordPattern.length; i++) {
        let match = true;
        for (let j = 0; j < ordPattern.length; j++) {
          if (script[i + j] !== ordPattern[j]) {
            match = false;
            break;
          }
        }
        if (match) {
          patternIndex = i;
          break;
        }
      }

      if (patternIndex === -1) {
        return null;
      }

      // Parse content-type and content after the pattern
      let currentIndex = patternIndex + ordPattern.length;
      
      // Read content-type length and data
      if (currentIndex >= script.length) return null;
      const contentTypeLength = script[currentIndex++];
      if (currentIndex + contentTypeLength > script.length) return null;
      
      const contentTypeBytes = script.slice(currentIndex, currentIndex + contentTypeLength);
      const contentType = new TextDecoder().decode(new Uint8Array(contentTypeBytes));
      currentIndex += contentTypeLength;

      // Look for OP_0 (0x00) separator
      if (currentIndex >= script.length || script[currentIndex] !== 0x00) return null;
      currentIndex++;

      // Read content length and data
      if (currentIndex >= script.length) return null;
      const contentLength = script[currentIndex++];
      if (currentIndex + contentLength > script.length) return null;

      const contentBytes = script.slice(currentIndex, currentIndex + contentLength);
      const content = this.bytesToHex(contentBytes);

      return {
        contentType,
        content
      };
    } catch (error) {
      console.warn('Error finding inscription envelope:', error);
      return null;
    }
  }

  /**
   * Gets inscription number from ordinals API
   */
  private static async getInscriptionNumber(txid: string, vout: number): Promise<number | undefined> {
    const inscriptionId = `${txid}i${vout}`;
    
    for (const endpoint of this.ORDINALS_ENDPOINTS) {
      try {
        const response = await fetch(`${endpoint}/inscription/${inscriptionId}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) continue;

        const data = await response.json();
        return data.number || data.inscription_number;
      } catch (error) {
        console.warn(`Failed to get inscription number from ${endpoint}:`, error);
        continue;
      }
    }

    return undefined;
  }

  /**
   * Utility: Convert hex string to byte array
   */
  private static hexToBytes(hex: string): number[] {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
  }

  /**
   * Utility: Convert byte array to hex string
   */
  private static bytesToHex(bytes: number[]): string {
    return bytes.map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Gets transferable inscriptions (UTXOs that can be spent)
   */
  static async getTransferableInscriptions(addresses: string[]): Promise<DetectedInscription[]> {
    const inscriptions = await this.detectInscriptions(addresses);
    
    // Filter for inscriptions that are actually transferable
    // This means they should be unspent UTXOs
    const transferable: DetectedInscription[] = [];
    
    for (const inscription of inscriptions) {
      try {
        // Verify the UTXO is still unspent
        const utxos = await this.getUTXOs(inscription.address);
        const isUnspent = utxos.some(utxo => 
          utxo.txid === inscription.txid && utxo.vout === inscription.vout
        );
        
        if (isUnspent) {
          transferable.push(inscription);
        }
      } catch (error) {
        console.warn(`Error checking if inscription is transferable:`, error);
      }
    }
    
    return transferable;
  }
}

export default InscriptionDetector;
