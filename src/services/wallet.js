/**
 * Professional Wallet Service - ElizaOS Plugin V2
 * Using @solana/web3.js v2 + ElizaOS optimizations
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
  createSyncNativeInstruction,
  getAccount,
  NATIVE_MINT,
} from "@solana/spl-token";
import bs58 from "bs58";
import { Logger } from "../utils/logger.js";

const logger = new Logger("WalletV2");

export class WalletService {
  constructor(connection) {
    this.connection = connection;
    this.keypair = null;
    this.publicKey = null;
    this.initialized = false;

    // Performance optimizations (ElizaOS-inspired)
    this.balanceCache = { sol: 0, wsol: 0, lastUpdate: 0 };
    this.cacheTTL = 10000;

    // Transaction optimization settings
    this.computeUnitLimit = 200000;
    this.computeUnitPrice = 1000000; // 0.001 SOL base priority
    this.dynamicPriorityFees = true;
  }

  async initialize() {
    try {
      const privateKey = process.env.WALLET_PRIVATE_KEY;

      if (!privateKey) {
        throw new Error("WALLET_PRIVATE_KEY not found in environment");
      }

      const decoded = bs58.decode(privateKey);

      if (decoded.length !== 64) {
        throw new Error(
          `Invalid private key length: ${decoded.length} (expected 64)`
        );
      }

      this.keypair = Keypair.fromSecretKey(decoded);
      this.publicKey = this.keypair.publicKey;

      // Verify connection
      const balance = await this.connection.getBalance(this.publicKey);

      this.initialized = true;

      logger.success(
        `✅ Wallet V2 initialized: ${this.publicKey.toBase58().slice(0, 8)}...`
      );
      logger.info(`💰 Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
      logger.info(`⚡ ElizaOS optimizations: ENABLED`);

      return true;
    } catch (error) {
      logger.error("Wallet initialization failed:", error);
      throw error;
    }
  }

  async getBalance() {
    try {
      if (!this.publicKey) {
        logger.warn("Wallet not initialized - no public key");
        return 0;
      }

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
      logger.error("Failed to get balance:", error);
      return 0;
    }
  }

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
        "confirmed",
        { commitment: "confirmed" }
      );

      const accountInfo = await getAccount(
        this.connection,
        tokenAccount.address,
        "confirmed"
      );

      const wsolBalance = Number(accountInfo.amount) / LAMPORTS_PER_SOL;

      this.balanceCache.wsol = wsolBalance;
      this.balanceCache.lastUpdate = now;

      return wsolBalance;
    } catch (error) {
      return 0;
    }
  }

  /**
   * ElizaOS V2: Optimized transaction with compute budget
   */
  async optimizeTransaction(transaction) {
    try {
      // Add compute budget instructions (ElizaOS pattern)
      const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
        units: this.computeUnitLimit,
      });

      const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: this.computeUnitPrice,
      });

      // Add to beginning of transaction
      transaction.instructions = [
        modifyComputeUnits,
        addPriorityFee,
        ...transaction.instructions,
      ];

      return transaction;
    } catch (error) {
      logger.error("Transaction optimization failed:", error);
      return transaction;
    }
  }

  /**
   * ElizaOS V2: Dynamic priority fee calculation
   */
  async getDynamicPriorityFee() {
    try {
      if (!this.dynamicPriorityFees) {
        return this.computeUnitPrice;
      }

      // Get recent prioritization fees
      const recentFees = await this.connection.getRecentPrioritizationFees();

      if (!recentFees || recentFees.length === 0) {
        return this.computeUnitPrice;
      }

      // Calculate median fee
      const fees = recentFees
        .map((f) => f.prioritizationFee)
        .sort((a, b) => a - b);
      const median = fees[Math.floor(fees.length / 2)];

      // Add 20% buffer for competitive inclusion
      const optimizedFee = Math.floor(median * 1.2);

      // Cap at reasonable maximum (0.01 SOL)
      const maxFee = 10000000;

      return Math.min(optimizedFee, maxFee);
    } catch (error) {
      logger.error("Priority fee calculation failed:", error);
      return this.computeUnitPrice;
    }
  }

  async wrapSOL(amount) {
    try {
      logger.info(`🔄 Wrapping ${amount.toFixed(4)} SOL (V2 optimized)...`);

      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.keypair,
        NATIVE_MINT,
        this.publicKey,
        false,
        "confirmed",
        { commitment: "confirmed" }
      );

      let transaction = new Transaction();

      transaction.add(
        SystemProgram.transfer({
          fromPubkey: this.publicKey,
          toPubkey: tokenAccount.address,
          lamports,
        })
      );

      transaction.add(createSyncNativeInstruction(tokenAccount.address));

      // ElizaOS V2: Optimize transaction
      transaction = await this.optimizeTransaction(transaction);

      const { blockhash, lastValidBlockHeight } =
        await this.connection.getLatestBlockhash("confirmed");

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.publicKey;

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.keypair],
        {
          commitment: "confirmed",
          maxRetries: 3,
          skipPreflight: false,
        }
      );

      this.balanceCache.lastUpdate = 0;

      logger.success(`✅ Wrapped (V2): ${signature.slice(0, 8)}...`);

      return signature;
    } catch (error) {
      logger.error("Wrap failed:", error);
      throw error;
    }
  }

  async autoWrapForTrading() {
    try {
      const solBalance = await this.getBalance();
      const keepBalance = parseFloat(process.env.KEEP_SOL_BALANCE || 0.05);

      if (solBalance <= keepBalance) {
        logger.info("No SOL available to wrap");
        return false;
      }

      const amountToWrap = solBalance - keepBalance;

      if (amountToWrap < 0.01) {
        logger.info("Amount too small to wrap");
        return false;
      }

      logger.info(
        `🔄 Auto-wrapping ${amountToWrap.toFixed(
          4
        )} SOL (V2) (keeping ${keepBalance} SOL)`
      );

      await this.wrapSOL(amountToWrap);

      const wsolBalance = await this.getWrappedSOLBalance();
      logger.success(`✅ wSOL balance: ${wsolBalance.toFixed(4)}`);

      return true;
    } catch (error) {
      logger.error("Auto-wrap failed:", error);
      return false;
    }
  }

  getPublicKey() {
    return this.publicKey;
  }

  getKeypair() {
    return this.keypair;
  }

  invalidateCache() {
    this.balanceCache.lastUpdate = 0;
  }

  async healthCheck() {
    try {
      await this.connection.getLatestBlockhash("confirmed");

      // Check priority fee responsiveness
      const priorityFee = await this.getDynamicPriorityFee();

      return {
        status: "healthy",
        rpc: "connected",
        priorityFee,
        version: "ElizaOS V2",
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
        version: "ElizaOS V2",
      };
    }
  }

  /**
   * ElizaOS V2: Get compute unit stats
   */
  getComputeStats() {
    return {
      computeUnitLimit: this.computeUnitLimit,
      computeUnitPrice: this.computeUnitPrice,
      dynamicPriorityFees: this.dynamicPriorityFees,
    };
  }
}

export default WalletService;
