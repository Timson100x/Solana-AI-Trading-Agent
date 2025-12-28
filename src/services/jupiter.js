/**
 * Professional Jupiter Aggregator Service
 * Optimized for high-frequency trading with ElizaOS patterns
 */

import { Connection, VersionedTransaction, PublicKey } from '@solana/web3.js';
import axios from 'axios';
import { Logger } from '../utils/logger.js';

const logger = new Logger('JupiterPro');

export class JupiterService {
  constructor(connection, wallet) {
    this.connection = connection;
    this.wallet = wallet;
    this.baseUrl = 'https://quote-api.jup.ag/v6';

    // Token mints
    this.WSOL = 'So11111111111111111111111111111111111111112';

    // Performance tracking
    this.successRate = { success: 0, failed: 0 };

    logger.success('✅ Jupiter Aggregator initialized');
  }

  /**
   * Get quote for token swap (with retry logic)
   */
  async getQuote(inputMint, outputMint, amount, options = {}) {
    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const params = {
          inputMint,
          outputMint,
          amount: Math.floor(amount),
          slippageBps: options.slippageBps || parseInt(process.env.SLIPPAGE_BPS || 100),
          onlyDirectRoutes: options.onlyDirectRoutes || false,
          maxAccounts: options.maxAccounts || 64
        };

        const response = await axios.get(`${this.baseUrl}/quote`, {
          params,
          timeout: 10000
        });

        if (!response.data || !response.data.outAmount) {
          throw new Error('Invalid quote response');
        }

        const quote = response.data;

        logger.info(
          `📊 Quote: ${(amount / 1e9).toFixed(4)} → ${(quote.outAmount / 1e9).toFixed(4)} ` +
          `(${quote.routePlan?.length || 0} routes)`
        );

        return quote;
      } catch (error) {
        lastError = error;
        logger.warn(`Quote attempt ${attempt}/${maxRetries} failed: ${error.message}`);

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw new Error(`Failed to get quote after ${maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Execute swap transaction (optimized)
   */
  async executeSwap(quote, options = {}) {
    try {
      logger.info('🔄 Preparing swap transaction...');

      // Get serialized transaction from Jupiter
      const response = await axios.post(
        `${this.baseUrl}/swap`,
        {
          quoteResponse: quote,
          userPublicKey: this.wallet.getPublicKey().toBase58(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          priorityLevelWithMaxLamports: {
            maxLamports: options.priorityFee || 10000,
            priorityLevel: options.priorityLevel || 'high'
          }
        },
        { timeout: 15000 }
      );

      if (!response.data || !response.data.swapTransaction) {
        throw new Error('Invalid swap response');
      }

      // Deserialize transaction
      const swapTransactionBuf = Buffer.from(response.data.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      // Sign transaction
      transaction.sign([this.wallet.getKeypair()]);

      logger.info('📤 Sending transaction...');

      // Send with confirmation strategy
      const signature = await this.connection.sendRawTransaction(
        transaction.serialize(),
        {
          skipPreflight: false,
          maxRetries: 3,
          preflightCommitment: 'confirmed'
        }
      );

      // Wait for confirmation (with timeout)
      const confirmation = await Promise.race([
        this.connection.confirmTransaction(signature, 'confirmed'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Confirmation timeout')), 60000)
        )
      ]);

      if (confirmation.value?.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      this.successRate.success++;
      this.wallet.invalidateCache();

      logger.success(`✅ Swap executed: ${signature.slice(0, 8)}...`);

      return {
        signature,
        inputAmount: quote.inAmount,
        outputAmount: quote.outAmount,
        quote
      };
    } catch (error) {
      this.successRate.failed++;
      logger.error('Swap execution failed:', error);
      throw error;
    }
  }

  /**
   * Buy token with SOL/wSOL
   */
  async buyToken(tokenMint, solAmount, options = {}) {
    try {
      logger.info(`🛒 Buying ${tokenMint.slice(0, 8)}... with ${solAmount.toFixed(4)} SOL`);

      const lamports = Math.floor(solAmount * 1e9);

      // Get quote: wSOL → Token
      const quote = await this.getQuote(
        this.WSOL,
        tokenMint,
        lamports,
        options
      );

      // Execute swap
      const result = await this.executeSwap(quote, options);

      logger.success(`✅ Bought ${(result.outputAmount / 1e9).toFixed(6)} tokens`);

      return result;
    } catch (error) {
      logger.error('Buy failed:', error);
      throw error;
    }
  }

  /**
   * Sell token for SOL/wSOL
   */
  async sellToken(tokenMint, tokenAmount, decimals = 9, options = {}) {
    try {
      logger.info(`💸 Selling ${(tokenAmount / Math.pow(10, decimals)).toFixed(6)} ${tokenMint.slice(0, 8)}...`);

      const amount = Math.floor(tokenAmount);

      // Get quote: Token → wSOL
      const quote = await this.getQuote(
        tokenMint,
        this.WSOL,
        amount,
        options
      );

      // Execute swap
      const result = await this.executeSwap(quote, options);

      logger.success(`✅ Sold for ${(result.outputAmount / 1e9).toFixed(4)} SOL`);

      return result;
    } catch (error) {
      logger.error('Sell failed:', error);
      throw error;
    }
  }

  /**
   * Get token price in SOL
   */
  async getTokenPrice(tokenMint, amount = 1e9) {
    try {
      const quote = await this.getQuote(tokenMint, this.WSOL, amount);
      return quote.outAmount / amount;
    } catch (error) {
      logger.error('Price check failed:', error);
      return 0;
    }
  }

  /**
   * Get success rate statistics
   */
  getStats() {
    const total = this.successRate.success + this.successRate.failed;
    const rate = total > 0 ? (this.successRate.success / total) * 100 : 0;

    return {
      successRate: rate.toFixed(2),
      totalSwaps: total,
      successful: this.successRate.success,
      failed: this.successRate.failed
    };
  }
}
