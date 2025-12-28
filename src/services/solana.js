/**
 * Solana Service - Blockchain interactions
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { Logger } from '../utils/logger.js';

const logger = new Logger('Solana');

export class SolanaService {
  constructor(connection) {
    this.connection = connection || new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );

    logger.success('✅ Solana service initialized');
  }

  async getRecentTransactions(walletAddress, limit = 10) {
    try {
      const pubkey = new PublicKey(walletAddress);
      const signatures = await this.connection.getSignaturesForAddress(
        pubkey, 
        { limit }
      );

      const transactions = [];

      for (const sig of signatures) {
        try {
          const tx = await this.connection.getParsedTransaction(
            sig.signature,
            {
              maxSupportedTransactionVersion: 0,
              commitment: 'confirmed'
            }
          );

          if (tx && tx.meta && tx.meta.err === null) {
            const parsed = this.parseTransaction(tx);
            if (parsed) {
              transactions.push(parsed);
            }
          }
        } catch (error) {
          logger.warn(`Failed to parse tx ${sig.signature.slice(0, 8)}`);
        }
      }

      return transactions;
    } catch (error) {
      logger.error('Failed to get transactions:', error);
      return [];
    }
  }

  parseTransaction(tx) {
    try {
      const signature = tx.transaction.signatures[0];
      const blockTime = tx.blockTime;
      const instructions = tx.transaction.message.instructions;

      // Look for token swaps
      let tokenSwap = null;
      let tokenMint = null;

      for (const instruction of instructions) {
        if (instruction.parsed && instruction.parsed.type === 'transfer') {
          // Token transfer detected
          const info = instruction.parsed.info;

          if (info.mint) {
            tokenMint = info.mint;
          }
        }
      }

      return {
        signature,
        blockTime,
        timestamp: new Date(blockTime * 1000),
        instructions: instructions.length,
        success: tx.meta.err === null,
        tokenMint,
        fee: tx.meta.fee / 1e9,
        accounts: tx.transaction.message.accountKeys.length
      };
    } catch (error) {
      logger.error('Parse error:', error);
      return null;
    }
  }

  async getBalance(walletAddress) {
    try {
      const pubkey = new PublicKey(walletAddress);
      const balance = await this.connection.getBalance(pubkey);
      return balance / 1e9;
    } catch (error) {
      logger.error('Failed to get balance:', error);
      return 0;
    }
  }

  async getTokenAccountsByOwner(walletAddress) {
    try {
      const pubkey = new PublicKey(walletAddress);
      const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

      const accounts = await this.connection.getParsedTokenAccountsByOwner(
        pubkey,
        { programId: TOKEN_PROGRAM_ID }
      );

      return accounts.value.map(acc => ({
        mint: acc.account.data.parsed.info.mint,
        amount: acc.account.data.parsed.info.tokenAmount.uiAmount,
        decimals: acc.account.data.parsed.info.tokenAmount.decimals
      }));
    } catch (error) {
      logger.error('Failed to get token accounts:', error);
      return [];
    }
  }
}
