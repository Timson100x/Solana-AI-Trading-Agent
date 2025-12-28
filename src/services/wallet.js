/**
 * Professional Solana Wallet Service
 * ElizaOS-inspired with enterprise-grade security & performance
 */

import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
  createSyncNativeInstruction,
  getAccount,
  NATIVE_MINT
} from '@solana/spl-token';
import bs58 from 'bs58';
import { Logger } from '../utils/logger.js';

const logger = new Logger('WalletPro');

export class WalletService {
  constructor(connection) {
    this.connection = connection;
    this.keypair = null;
    this.publicKey = null;
    this.initialized = false;

    // Performance optimizations
    this.balanceCache = { sol: 0, wsol: 0, lastUpdate: 0 };
    this.cacheTTL = 10000; // 10 seconds
  }

  /**
   * Initialize wallet from private key
   */
  async initialize() {
    try {
      const privateKey = process.env.WALLET_PRIVATE_KEY;

      if (!privateKey) {
        throw new Error('WALLET_PRIVATE_KEY not found in environment');
      }

      // Decode Base58 private key
      const decoded = bs58.decode(privateKey);

      if (decoded.length !== 64) {
        throw new Error(`Invalid private key length: ${decoded.length} (expected 64)`);
      }

      this.keypair = Keypair.fromSecretKey(decoded);
      this.publicKey = this.keypair.publicKey;

      // Verify connection
      const balance = await this.connection.getBalance(this.publicKey);

      this.initialized = true;

      logger.success(`✅ Wallet initialized: ${this.publicKey.toBase58().slice(0, 8)}...`);
      logger.info(`💰 Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

      return true;
    } catch (error) {
      logger.error('Wallet initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get SOL balance (with caching)
   */
  async getBalance() {
    try {
      const now = Date.now();

      if (now - this.balanceCache.lastUpdate < this.cacheTTL) {
        return this.balanceCache.sol;
      }

      const balance = await this.connection.getBalance(this.publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;

      this.balanceCache.sol = solBalance;
      this.balanceCache.lastUpdate = now;

      return solBalance;
    } catch (error) {
      logger.error('Failed to get balance:', error);
      return 0;
    }
  }

  /**
   * Get wrapped SOL balance
   */
  async getWrappedSOLBalance() {
    try {
      const now = Date.now();

      if (now - this.balanceCache.lastUpdate < this.cacheTTL) {
        return this.balanceCache.wsol;
      }

      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.keypair,
        NATIVE_MINT,
        this.publicKey,
        false,
        'confirmed',
        { commitment: 'confirmed' }
      );

      const accountInfo = await getAccount(
        this.connection,
        tokenAccount.address,
        'confirmed'
      );

      const wsolBalance = Number(accountInfo.amount) / LAMPORTS_PER_SOL;

      this.balanceCache.wsol = wsolBalance;
      this.balanceCache.lastUpdate = now;

      return wsolBalance;
    } catch (error) {
      // Account might not exist yet
      return 0;
    }
  }

  /**
   * Wrap SOL to wSOL (optimized)
   */
  async wrapSOL(amount) {
    try {
      logger.info(`🔄 Wrapping ${amount.toFixed(4)} SOL...`);

      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

      // Get or create wSOL token account
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.keypair,
        NATIVE_MINT,
        this.publicKey,
        false,
        'confirmed',
        { commitment: 'confirmed' }
      );

      // Create transaction
      const transaction = new Transaction();

      // Transfer SOL to token account
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: this.publicKey,
          toPubkey: tokenAccount.address,
          lamports
        })
      );

      // Sync native (wrap)
      transaction.add(
        createSyncNativeInstruction(tokenAccount.address)
      );

      // Get recent blockhash with commitment
      const { blockhash, lastValidBlockHeight } = 
        await this.connection.getLatestBlockhash('confirmed');

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.publicKey;

      // Sign and send
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.keypair],
        {
          commitment: 'confirmed',
          maxRetries: 3,
          skipPreflight: false
        }
      );

      // Invalidate cache
      this.balanceCache.lastUpdate = 0;

      logger.success(`✅ Wrapped: ${signature.slice(0, 8)}...`);

      return signature;
    } catch (error) {
      logger.error('Wrap failed:', error);
      throw error;
    }
  }

  /**
   * Auto-wrap SOL for trading (keeps reserve)
   */
  async autoWrapForTrading() {
    try {
      const solBalance = await this.getBalance();
      const keepBalance = parseFloat(process.env.KEEP_SOL_BALANCE || 0.05);

      if (solBalance <= keepBalance) {
        logger.info('No SOL available to wrap');
        return false;
      }

      const amountToWrap = solBalance - keepBalance;

      if (amountToWrap < 0.01) {
        logger.info('Amount too small to wrap');
        return false;
      }

      logger.info(`🔄 Auto-wrapping ${amountToWrap.toFixed(4)} SOL (keeping ${keepBalance} SOL)`);

      await this.wrapSOL(amountToWrap);

      const wsolBalance = await this.getWrappedSOLBalance();
      logger.success(`✅ wSOL balance: ${wsolBalance.toFixed(4)}`);

      return true;
    } catch (error) {
      logger.error('Auto-wrap failed:', error);
      return false;
    }
  }

  /**
   * Get public key
   */
  getPublicKey() {
    return this.publicKey;
  }

  /**
   * Get keypair (use carefully!)
   */
  getKeypair() {
    return this.keypair;
  }

  /**
   * Invalidate balance cache
   */
  invalidateCache() {
    this.balanceCache.lastUpdate = 0;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await this.connection.getLatestBlockhash('confirmed');
      return { status: 'healthy', rpc: 'connected' };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}
