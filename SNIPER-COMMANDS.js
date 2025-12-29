/**
 * Sniper Bot Telegram Commands
 * Add to telegram.js for sniper control
 */

// /sniper start - Start sniper bot
bot.onText(/\/sniper start/, async (msg) => {
  if (msg.chat.id.toString() !== chatId) return;

  try {
    if (!this.agent.sniperBot) {
      const { ProfessionalSniperBot } = await import(
        "./src/bots/professional-sniper-bot.js"
      );

      const config = {
        targetLiquidity: parseFloat(process.env.SNIPER_MIN_LIQ || 50),
        maxLiquidity: parseFloat(process.env.SNIPER_MAX_LIQ || 500),
        buyAmount: parseFloat(process.env.SNIPER_BUY_AMOUNT || 0.05),
        takeProfitPercent: parseInt(process.env.SNIPER_TAKE_PROFIT || 200),
        stopLossPercent: parseInt(process.env.SNIPER_STOP_LOSS || 50),
        maxPositions: parseInt(process.env.SNIPER_MAX_POSITIONS || 3),
        bundleEnabled: process.env.SNIPER_JITO_BUNDLE !== "false",
      };

      this.agent.sniperBot = new ProfessionalSniperBot(config, this.agent);
    }

    await this.agent.sniperBot.start();

    await sendMessage(
      `🎯 *Sniper Bot Started*\n\n` +
        `Monitoring Pump.fun for new launches...\n` +
        `Target: $${this.agent.sniperBot.config.targetLiquidity}-${this.agent.sniperBot.config.maxLiquidity}\n` +
        `Buy: ${this.agent.sniperBot.config.buyAmount} SOL\n\n` +
        `Ready to snipe! 🔫`
    );
  } catch (error) {
    await sendMessage(`❌ Failed to start sniper: ${error.message}`);
  }
});

// /sniper stop - Stop sniper bot
bot.onText(/\/sniper stop/, async (msg) => {
  if (msg.chat.id.toString() !== chatId) return;

  try {
    if (this.agent.sniperBot) {
      await this.agent.sniperBot.stop();
      await sendMessage(`🛑 Sniper Bot stopped`);
    } else {
      await sendMessage(`ℹ️ Sniper Bot is not running`);
    }
  } catch (error) {
    await sendMessage(`❌ Error: ${error.message}`);
  }
});

// /sniper stats - Show sniper statistics
bot.onText(/\/sniper stats/, async (msg) => {
  if (msg.chat.id.toString() !== chatId) return;

  try {
    if (!this.agent.sniperBot) {
      await sendMessage(`ℹ️ Sniper Bot not initialized`);
      return;
    }

    const stats = this.agent.sniperBot.getStats();

    await sendMessage(
      `📊 *Sniper Bot Statistics*\n\n` +
        `Total Snipes: ${stats.totalSnipes}\n` +
        `Successful: ${stats.successful}\n` +
        `Failed: ${stats.failed}\n` +
        `Win Rate: ${stats.winRate}\n\n` +
        `Open Positions: ${stats.openPositions}\n` +
        `Total Profit: ${stats.totalProfit} SOL 💰\n` +
        `Total Loss: ${stats.totalLoss} SOL\n` +
        `Net P&L: ${stats.netProfit} SOL\n\n` +
        `Daily Loss: ${stats.dailyLoss} SOL`
    );
  } catch (error) {
    await sendMessage(`❌ Error: ${error.message}`);
  }
});

// /sniper positions - Show open positions
bot.onText(/\/sniper positions/, async (msg) => {
  if (msg.chat.id.toString() !== chatId) return;

  try {
    if (
      !this.agent.sniperBot ||
      this.agent.sniperBot.stats.positions.size === 0
    ) {
      await sendMessage(`📍 No open sniper positions`);
      return;
    }

    let message = `📍 *Open Sniper Positions*\n\n`;

    for (const [mint, pos] of this.agent.sniperBot.stats.positions.entries()) {
      const ageMinutes = Math.floor((Date.now() - pos.buyTime) / 60000);
      message += `Token: ${pos.token}\n`;
      message += `Buy: ${pos.amount.toFixed(4)} SOL\n`;
      message += `Liquidity: $${pos.liquidity}\n`;
      message += `Age: ${ageMinutes}m\n\n`;
    }

    await sendMessage(message);
  } catch (error) {
    await sendMessage(`❌ Error: ${error.message}`);
  }
});

// /sniper config - Show configuration
bot.onText(/\/sniper config/, async (msg) => {
  if (msg.chat.id.toString() !== chatId) return;

  try {
    const config = this.agent.sniperBot?.config || {
      targetLiquidity: process.env.SNIPER_MIN_LIQ || 50,
      maxLiquidity: process.env.SNIPER_MAX_LIQ || 500,
      buyAmount: process.env.SNIPER_BUY_AMOUNT || 0.05,
      takeProfitPercent: process.env.SNIPER_TAKE_PROFIT || 200,
      stopLossPercent: process.env.SNIPER_STOP_LOSS || 50,
      maxPositions: process.env.SNIPER_MAX_POSITIONS || 3,
      bundleEnabled: process.env.SNIPER_JITO_BUNDLE !== "false",
    };

    await sendMessage(
      `⚙️ *Sniper Configuration*\n\n` +
        `Target Liquidity: $${config.targetLiquidity}-${config.maxLiquidity}\n` +
        `Buy Amount: ${config.buyAmount} SOL\n` +
        `Take Profit: ${config.takeProfitPercent}%\n` +
        `Stop Loss: ${config.stopLossPercent}%\n` +
        `Max Positions: ${config.maxPositions}\n` +
        `Jito Bundles: ${config.bundleEnabled ? "✅" : "❌"}\n\n` +
        `Edit in .env file`
    );
  } catch (error) {
    await sendMessage(`❌ Error: ${error.message}`);
  }
});
