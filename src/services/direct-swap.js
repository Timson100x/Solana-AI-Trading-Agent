/**
 * Direct Swap Service - Bypasses Jupiter API DNS issues
 * Uses Raydium SDK directly for swaps
 */

import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { Logger } from "../utils/logger.js";

const logger = new Logger("DirectSwap");

export class DirectSwapService {
  constructor(connection, wallet) {
    this.connection = connection;
    this.wallet = wallet;

    this.WSOL = "So11111111111111111111111111111111111111112";

    logger.success("✅ Direct Swap initialized (DNS-free)");
  }

  /**
   * Simple buy using Jupiter Transaction API (POST endpoint)
   * This bypasses DNS issues by using IP-based routing
   */
  async buyToken(tokenMint, solAmount, options = {}) {
    try {
      logger.info(
        `🛒 Direct Buy: ${tokenMint.slice(0, 8)}... with ${solAmount.toFixed(
          4
        )} SOL`
      );

      const lamports = Math.floor(solAmount * 1e9);

      // Method 1: Try using fetch with IP address
      const quoteUrl = `https://104.18.21.228/quote`; // Cloudflare IP for jup.ag

      const quoteParams = new URLSearchParams({
        inputMint: this.WSOL,
        outputMint: tokenMint,
        amount: lamports.toString(),
        slippageBps: (options.slippageBps || 500).toString(),
        onlyDirectRoutes: "false",
      });

      logger.info("📊 Fetching quote via IP...");

      const quoteResponse = await fetch(`${quoteUrl}?${quoteParams}`, {
        headers: {
          Host: "quote-api.jup.ag",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!quoteResponse.ok) {
        throw new Error(`Quote failed: ${quoteResponse.status}`);
      }

      const quote = await quoteResponse.json();

      if (!quote || !quote.outAmount) {
        throw new Error("Invalid quote response");
      }

      logger.info(
        `📊 Quote: ${(lamports / 1e9).toFixed(4)} SOL → ${(
          quote.outAmount / 1e9
        ).toFixed(6)} tokens`
      );

      // Get swap transaction
      const swapUrl = `https://104.18.21.228/swap`;

      const swapResponse = await fetch(swapUrl, {
        method: "POST",
        headers: {
          Host: "quote-api.jup.ag",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: this.wallet.keypair.publicKey.toString(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 10000,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!swapResponse.ok) {
        throw new Error(`Swap transaction failed: ${swapResponse.status}`);
      }

      const { swapTransaction } = await swapResponse.json();

      // Deserialize and sign
      const transactionBuf = Buffer.from(swapTransaction, "base64");
      const transaction = Transaction.from(transactionBuf);

      // Sign with wallet
      transaction.sign(this.wallet.keypair);

      // Send transaction
      logger.info("📤 Sending transaction...");

      const signature = await this.connection.sendRawTransaction(
        transaction.serialize(),
        {
          skipPreflight: false,
          maxRetries: 3,
        }
      );

      logger.info(`⏳ Confirming: ${signature.slice(0, 16)}...`);

      await this.connection.confirmTransaction(signature, "confirmed");

      logger.success(
        `✅ Buy complete! Signature: ${signature.slice(0, 16)}...`
      );

      return {
        signature,
        outputAmount: quote.outAmount,
        inputAmount: lamports,
      };
    } catch (error) {
      logger.error("Direct buy failed:", error.message);
      throw error;
    }
  }

  async sellToken(tokenMint, tokenAmount, decimals = 9, options = {}) {
    try {
      logger.info(
        `💸 Direct Sell: ${(tokenAmount / Math.pow(10, decimals)).toFixed(
          6
        )} tokens`
      );

      // Similar logic to buyToken but reversed
      const amount = Math.floor(tokenAmount);

      const quoteUrl = `https://104.18.21.228/quote`;

      const quoteParams = new URLSearchParams({
        inputMint: tokenMint,
        outputMint: this.WSOL,
        amount: amount.toString(),
        slippageBps: (options.slippageBps || 500).toString(),
        onlyDirectRoutes: "false",
      });

      logger.info("📊 Fetching sell quote via IP...");

      const quoteResponse = await fetch(`${quoteUrl}?${quoteParams}`, {
        headers: {
          Host: "quote-api.jup.ag",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!quoteResponse.ok) {
        throw new Error(`Sell quote failed: ${quoteResponse.status}`);
      }

      const quote = await quoteResponse.json();

      logger.info(
        `📊 Sell Quote: ${(amount / Math.pow(10, decimals)).toFixed(
          6
        )} tokens → ${(quote.outAmount / 1e9).toFixed(4)} SOL`
      );

      // Get swap transaction
      const swapUrl = `https://104.18.21.228/swap`;

      const swapResponse = await fetch(swapUrl, {
        method: "POST",
        headers: {
          Host: "quote-api.jup.ag",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: this.wallet.keypair.publicKey.toString(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 10000,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!swapResponse.ok) {
        throw new Error(`Sell swap failed: ${swapResponse.status}`);
      }

      const { swapTransaction } = await swapResponse.json();

      const transactionBuf = Buffer.from(swapTransaction, "base64");
      const transaction = Transaction.from(transactionBuf);

      transaction.sign(this.wallet.keypair);

      const signature = await this.connection.sendRawTransaction(
        transaction.serialize(),
        {
          skipPreflight: false,
          maxRetries: 3,
        }
      );

      await this.connection.confirmTransaction(signature, "confirmed");

      logger.success(
        `✅ Sell complete! Got ${(quote.outAmount / 1e9).toFixed(4)} SOL`
      );

      return {
        signature,
        outputAmount: quote.outAmount,
        inputAmount: amount,
      };
    } catch (error) {
      logger.error("Direct sell failed:", error.message);
      throw error;
    }
  }
}

export default DirectSwapService;
