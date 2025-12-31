import { EventEmitter } from 'eventemitter3';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

/**
 * Webhook-basierter Risk Manager
 * Nutzt Echtzeit-Webhooks für automatische Stop-Loss & Take-Profit Execution
 */
export class WebhookRiskManager extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            connection: config.connection,
            wallet: config.wallet,
            jupiterApi: config.jupiterApi,
            
            // Risk Management Settings
            defaultStopLoss: config.defaultStopLoss || -10, // -10%
            defaultTakeProfit: config.defaultTakeProfit || 25, // +25%
            trailingStopLoss: config.trailingStopLoss || true,
            trailingStopDistance: config.trailingStopDistance || 5, // 5%
            
            // Advanced Settings
            partialTakeProfitLevels: config.partialTakeProfitLevels || [
                { percent: 15, sellAmount: 0.3 }, // Bei +15% verkaufe 30%
                { percent: 25, sellAmount: 0.5 }, // Bei +25% verkaufe weitere 50%
                { percent: 50, sellAmount: 1.0 }  // Bei +50% verkaufe alles
            ],
            
            emergencyStopLoss: config.emergencyStopLoss || -20, // -20% Hard Stop
            maxSlippage: config.maxSlippage || 5, // 5% max slippage
            
            enableLogging: config.enableLogging !== false,
            dryRun: config.dryRun || false
        };

        // Position Tracking
        this.positions = new Map(); // tokenMint -> position data
        this.executedTriggers = new Set(); // Verhindert Doppel-Execution
        
        this.stats = {
            stopLossTriggered: 0,
            takeProfitTriggered: 0,
            trailingStopTriggered: 0,
            emergencyStopTriggered: 0,
            totalSaved: 0,
            totalProfit: 0
        };
    }

    /**
     * Position registrieren (nach Kauf)
     */
    registerPosition(tokenMint, entryData) {
        const position = {
            mint: tokenMint,
            entryPrice: entryData.entryPrice,
            entryAmount: entryData.amount,
            entryTimestamp: Date.now(),
            entrySignature: entryData.signature,
            
            // Current values
            currentPrice: entryData.entryPrice,
            currentAmount: entryData.amount,
            highestPrice: entryData.entryPrice,
            
            // Triggers
            stopLoss: this.calculateStopLoss(entryData.entryPrice),
            takeProfit: this.calculateTakeProfit(entryData.entryPrice),
            trailingStop: null,
            
            // Partial TP tracking
            partialTakeProfitExecuted: [],
            
            // Status
            active: true,
            lastUpdate: Date.now()
        };

        this.positions.set(tokenMint, position);
        this.log(`✅ Position registered: ${tokenMint.substring(0, 8)}...`);
        this.log(`   Entry: $${entryData.entryPrice}`);
        this.log(`   Stop Loss: $${position.stopLoss.toFixed(6)} (${this.config.defaultStopLoss}%)`);
        this.log(`   Take Profit: $${position.takeProfit.toFixed(6)} (${this.config.defaultTakeProfit}%)`);
        
        this.emit('position_registered', position);
        return position;
    }

    /**
     * Balance Update von Webhook verarbeiten
     */
    async handleBalanceUpdate(balanceData) {
        try {
            const tokenMint = balanceData.mint;
            const position = this.positions.get(tokenMint);

            if (!position || !position.active) return;

            // Update current amount
            position.currentAmount = balanceData.uiAmount;
            position.lastUpdate = Date.now();

            this.log(`📊 Balance update: ${tokenMint.substring(0, 8)}... = ${balanceData.uiAmount}`);

            // Trigger check if amount changed significantly
            await this.checkAllTriggers(position);
            
        } catch (error) {
            this.log('❌ Balance update error:', error.message);
        }
    }

    /**
     * Swap Event von Webhook verarbeiten
     */
    async handleSwapEvent(swapData) {
        try {
            // Check if this was our position being closed
            const inputMint = swapData.input?.mint;
            const outputMint = swapData.output?.mint;

            // Position wurde verkauft (unser Token war Input)
            if (this.positions.has(inputMint)) {
                const position = this.positions.get(inputMint);
                
                if (position.active) {
                    this.log(`🔄 Position closed via swap: ${inputMint.substring(0, 8)}...`);
                    await this.closePosition(inputMint, swapData);
                }
            }

            // Neue Position gekauft (unser Token ist Output)
            if (outputMint && outputMint !== 'So11111111111111111111111111111111111111112') {
                // Dies könnte ein neuer Kauf sein - warte auf explizite Registrierung
                this.emit('potential_new_position', swapData);
            }
            
        } catch (error) {
            this.log('❌ Swap event error:', error.message);
        }
    }

    /**
     * Transaction Event verarbeiten (für Price Updates)
     */
    async handleTransaction(txData) {
        try {
            // Extract price information from transaction if available
            for (const [mint, position] of this.positions.entries()) {
                if (!position.active) continue;

                // Update price from transaction data
                const priceUpdate = this.extractPriceFromTransaction(txData, mint);
                
                if (priceUpdate) {
                    await this.updatePositionPrice(mint, priceUpdate);
                }
            }
        } catch (error) {
            this.log('❌ Transaction processing error:', error.message);
        }
    }

    /**
     * Preis aus Transaction extrahieren
     */
    extractPriceFromTransaction(txData, targetMint) {
        try {
            // Suche nach Token-Transfers die unseren Token betreffen
            const relevantTransfers = txData.tokenTransfers?.filter(t => 
                t.mint === targetMint
            );

            if (relevantTransfers && relevantTransfers.length > 0) {
                // Berechne Preis aus Transfer-Verhältnis
                // Dies ist vereinfacht - in Production würdest du Jupiter Price API nutzen
                return this.calculatePriceFromTransfers(relevantTransfers);
            }
        } catch (error) {
            return null;
        }
        return null;
    }

    /**
     * Position Preis aktualisieren
     */
    async updatePositionPrice(mint, newPrice) {
        const position = this.positions.get(mint);
        if (!position || !position.active) return;

        const oldPrice = position.currentPrice;
        position.currentPrice = newPrice;
        position.lastUpdate = Date.now();

        // Update highest price für trailing stop
        if (newPrice > position.highestPrice) {
            position.highestPrice = newPrice;
            
            // Update trailing stop loss
            if (this.config.trailingStopLoss) {
                const trailingDistance = position.highestPrice * (this.config.trailingStopDistance / 100);
                position.trailingStop = position.highestPrice - trailingDistance;
                
                this.log(`🔄 Trailing stop updated: $${position.trailingStop.toFixed(6)}`);
            }
        }

        // Berechne aktuellen P/L
        const pnlPercent = ((newPrice - position.entryPrice) / position.entryPrice) * 100;

        this.log(`💹 Price update: ${mint.substring(0, 8)}... | $${oldPrice.toFixed(6)} → $${newPrice.toFixed(6)} | P/L: ${pnlPercent > 0 ? '+' : ''}${pnlPercent.toFixed(2)}%`);

        // Check triggers
        await this.checkAllTriggers(position);
    }

    /**
     * Alle Triggers prüfen
     */
    async checkAllTriggers(position) {
        if (!position.active) return;

        const currentPrice = position.currentPrice;
        const pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

        // 1. Emergency Stop Loss Check (höchste Priorität)
        if (pnlPercent <= this.config.emergencyStopLoss) {
            await this.executeEmergencyStop(position, pnlPercent);
            return;
        }

        // 2. Regular Stop Loss Check
        if (currentPrice <= position.stopLoss) {
            await this.executeStopLoss(position, pnlPercent);
            return;
        }

        // 3. Trailing Stop Loss Check
        if (this.config.trailingStopLoss && position.trailingStop && currentPrice <= position.trailingStop) {
            await this.executeTrailingStop(position, pnlPercent);
            return;
        }

        // 4. Partial Take Profit Checks
        for (const level of this.config.partialTakeProfitLevels) {
            if (pnlPercent >= level.percent && !position.partialTakeProfitExecuted.includes(level.percent)) {
                await this.executePartialTakeProfit(position, level, pnlPercent);
            }
        }

        // 5. Full Take Profit Check
        if (currentPrice >= position.takeProfit) {
            await this.executeTakeProfit(position, pnlPercent);
            return;
        }
    }

    /**
     * Emergency Stop Loss ausführen
     */
    async executeEmergencyStop(position, pnlPercent) {
        const triggerId = `emergency_${position.mint}_${Date.now()}`;
        if (this.executedTriggers.has(triggerId)) return;
        
        this.executedTriggers.add(triggerId);
        this.stats.emergencyStopTriggered++;

        this.log(`🚨 EMERGENCY STOP LOSS TRIGGERED: ${position.mint.substring(0, 8)}... | P/L: ${pnlPercent.toFixed(2)}%`);

        await this.executeSell(position, 1.0, 'EMERGENCY_STOP', pnlPercent);
    }

    /**
     * Stop Loss ausführen
     */
    async executeStopLoss(position, pnlPercent) {
        const triggerId = `stop_${position.mint}_${Date.now()}`;
        if (this.executedTriggers.has(triggerId)) return;
        
        this.executedTriggers.add(triggerId);
        this.stats.stopLossTriggered++;

        this.log(`🛑 STOP LOSS TRIGGERED: ${position.mint.substring(0, 8)}... | P/L: ${pnlPercent.toFixed(2)}%`);

        await this.executeSell(position, 1.0, 'STOP_LOSS', pnlPercent);
    }

    /**
     * Trailing Stop ausführen
     */
    async executeTrailingStop(position, pnlPercent) {
        const triggerId = `trailing_${position.mint}_${Date.now()}`;
        if (this.executedTriggers.has(triggerId)) return;
        
        this.executedTriggers.add(triggerId);
        this.stats.trailingStopTriggered++;

        this.log(`📉 TRAILING STOP TRIGGERED: ${position.mint.substring(0, 8)}... | P/L: ${pnlPercent.toFixed(2)}%`);

        await this.executeSell(position, 1.0, 'TRAILING_STOP', pnlPercent);
    }

    /**
     * Take Profit ausführen
     */
    async executeTakeProfit(position, pnlPercent) {
        const triggerId = `tp_${position.mint}_${Date.now()}`;
        if (this.executedTriggers.has(triggerId)) return;
        
        this.executedTriggers.add(triggerId);
        this.stats.takeProfitTriggered++;
        this.stats.totalProfit += pnlPercent;

        this.log(`🎯 TAKE PROFIT TRIGGERED: ${position.mint.substring(0, 8)}... | P/L: +${pnlPercent.toFixed(2)}%`);

        await this.executeSell(position, 1.0, 'TAKE_PROFIT', pnlPercent);
    }

    /**
     * Partial Take Profit ausführen
     */
    async executePartialTakeProfit(position, level, pnlPercent) {
        const triggerId = `ptp_${position.mint}_${level.percent}`;
        if (this.executedTriggers.has(triggerId)) return;
        
        this.executedTriggers.add(triggerId);
        position.partialTakeProfitExecuted.push(level.percent);

        this.log(`💰 PARTIAL TAKE PROFIT: ${position.mint.substring(0, 8)}... | Level: +${level.percent}% | Sell: ${(level.sellAmount * 100).toFixed(0)}%`);

        await this.executeSell(position, level.sellAmount, 'PARTIAL_TP', pnlPercent, level.percent);
    }

    /**
     * Verkauf ausführen
     */
    async executeSell(position, sellRatio, reason, pnlPercent, tpLevel = null) {
        try {
            const sellAmount = position.currentAmount * sellRatio;
            
            if (this.config.dryRun) {
                this.log(`🧪 DRY RUN - Would sell ${sellAmount} tokens | Reason: ${reason}`);
                this.emit('dry_run_sell', { position, sellAmount, reason, pnlPercent });
                return;
            }

            // Actual sell execution via Jupiter
            const sellData = await this.executeJupiterSwap(
                position.mint,
                'So11111111111111111111111111111111111111112', // SOL
                sellAmount
            );

            this.log(`✅ Sell executed: ${sellData.signature}`);

            // Update oder close position
            if (sellRatio >= 1.0) {
                position.active = false;
                position.exitPrice = position.currentPrice;
                position.exitTimestamp = Date.now();
                position.exitReason = reason;
                position.finalPnL = pnlPercent;
            } else {
                position.currentAmount -= sellAmount;
            }

            // Emit event
            this.emit('sell_executed', {
                position,
                sellAmount,
                sellRatio,
                reason,
                pnlPercent,
                tpLevel,
                signature: sellData.signature
            });

            return sellData;
            
        } catch (error) {
            this.log(`❌ Sell execution failed: ${error.message}`);
            this.emit('sell_failed', { position, error: error.message, reason });
            throw error;
        }
    }

    /**
     * Jupiter Swap ausführen (Placeholder)
     */
    async executeJupiterSwap(inputMint, outputMint, amount) {
        // TODO: Implementiere tatsächlichen Jupiter Swap
        // Dies ist ein Placeholder - nutze deine existierende Jupiter Integration
        
        if (!this.config.jupiterApi) {
            throw new Error('Jupiter API not configured');
        }

        // Hier würdest du die tatsächliche Swap-Logik implementieren
        // aus deinem bestehenden Jupiter Service
        
        return {
            signature: 'mock_signature_' + Date.now(),
            success: true
        };
    }

    /**
     * Position schließen
     */
    async closePosition(mint, swapData = null) {
        const position = this.positions.get(mint);
        if (!position) return;

        position.active = false;
        position.exitTimestamp = Date.now();
        
        if (swapData) {
            position.exitSignature = swapData.signature;
        }

        this.log(`🔒 Position closed: ${mint.substring(0, 8)}...`);
        this.emit('position_closed', position);
    }

    /**
     * Stop Loss berechnen
     */
    calculateStopLoss(entryPrice) {
        return entryPrice * (1 + this.config.defaultStopLoss / 100);
    }

    /**
     * Take Profit berechnen
     */
    calculateTakeProfit(entryPrice) {
        return entryPrice * (1 + this.config.defaultTakeProfit / 100);
    }

    /**
     * Preis aus Transfers berechnen (vereinfacht)
     */
    calculatePriceFromTransfers(transfers) {
        // Vereinfachte Logik - in Production würdest du
        // Jupiter Price API oder On-Chain Price Feeds nutzen
        return null;
    }

    /**
     * Alle aktiven Positionen
     */
    getActivePositions() {
        return Array.from(this.positions.values()).filter(p => p.active);
    }

    /**
     * Statistiken
     */
    getStats() {
        return {
            ...this.stats,
            activePositions: this.getActivePositions().length,
            totalPositions: this.positions.size
        };
    }

    /**
     * Logging
     */
    log(...args) {
        if (this.config.enableLogging) {
            console.log(`[Risk Manager ${new Date().toLocaleTimeString('de-DE')}]`, ...args);
        }
    }
}

export default WebhookRiskManager;
