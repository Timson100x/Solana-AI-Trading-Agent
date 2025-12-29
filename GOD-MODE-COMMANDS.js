/**
 * 🔥 GOD MODE TELEGRAM COMMANDS
 * Add these commands to telegram.js setupCommands() method
 */

// /godmode - Toggle God Mode
bot.onText(/\/godmode/, async (msg) => {
  if (msg.chat.id.toString() !== chatId) return;

  try {
    const currentState = process.env.GODMODE === "true";
    process.env.GODMODE = currentState ? "false" : "true";

    if (!currentState) {
      await agent.startGodMode();
      await sendMessage(
        `🔥 *GOD MODE ACTIVATED*\n\n` +
          `Win Rate Target: 95%\n` +
          `Systems Online:\n` +
          `✅ 12-Layer Filter\n` +
          `✅ 90% Reinvest\n` +
          `✅ MEV Protection\n` +
          `✅ Jito Bundles\n` +
          `✅ Raydium Sniper\n\n` +
          `Let's make it rain! 💎`
      );
    } else {
      await sendMessage(
        `⚠️ *GOD MODE DEACTIVATED*\n\n` + `Returning to standard trading mode.`
      );
    }
  } catch (error) {
    await sendMessage(`❌ God Mode toggle failed: ${error.message}`);
  }
});

// /reinvest - Force reinvest check
bot.onText(/\/reinvest/, async (msg) => {
  if (msg.chat.id.toString() !== chatId) return;

  try {
    await sendMessage("🔄 Checking for reinvest opportunities...");
    await agent.reinvestOptimizer.forceReinvest();

    const stats = agent.reinvestOptimizer.getStats();
    await sendMessage(
      `🔄 *REINVEST COMPLETE*\n\n` +
        `Total Reinvested: ${stats.totalReinvested.toFixed(4)} SOL\n` +
        `Count: ${stats.reinvestCount}\n` +
        `Ratio: ${(stats.reinvestRatio * 100).toFixed(0)}% WSOL / ${(
          (1 - stats.reinvestRatio) *
          100
        ).toFixed(0)}% SOL`
    );
  } catch (error) {
    await sendMessage(`❌ Reinvest failed: ${error.message}`);
  }
});

// /mev - Show mempool activity
bot.onText(/\/mev/, async (msg) => {
  if (msg.chat.id.toString() !== chatId) return;

  try {
    const stats = agent.privateMempool.getStats();

    await sendMessage(
      `🔮 *MEMPOOL STATUS*\n\n` +
        `Status: ${stats.isRunning ? "🟢 Active" : "🔴 Inactive"}\n` +
        `Tracked Wallets: ${stats.trackedWallets}\n` +
        `Cached Txs: ${stats.pendingTxCached}\n` +
        `Min Win Rate: ${(stats.minWinRate * 100).toFixed(0)}%\n` +
        `Check Interval: ${stats.checkInterval / 1000}s\n\n` +
        `💡 Monitoring smart wallet pending buys`
    );
  } catch (error) {
    await sendMessage(`❌ MEV status failed: ${error.message}`);
  }
});

// /optimize - Optimize wallet balance
bot.onText(/\/optimize/, async (msg) => {
  if (msg.chat.id.toString() !== chatId) return;

  try {
    await sendMessage("💎 Optimizing wallet balance...");

    const result = await agent.walletOptimizer.optimize();

    if (result.success) {
      await sendMessage(
        `💎 *WALLET OPTIMIZED*\n\n` +
          `WSOL: ${result.wsol.toFixed(4)}\n` +
          `SOL: ${result.sol.toFixed(4)}\n` +
          `Total: ${(result.wsol + result.sol).toFixed(4)} SOL\n\n` +
          `Signature: \`${result.signature.slice(0, 16)}...\``
      );
    } else {
      await sendMessage(`❌ Optimization failed: ${result.error}`);
    }
  } catch (error) {
    await sendMessage(`❌ Optimize error: ${error.message}`);
  }
});

// /godscore <address> - Run God Mode analysis
bot.onText(/\/godscore (.+)/, async (msg, match) => {
  if (msg.chat.id.toString() !== chatId) return;

  try {
    const tokenAddress = match[1].trim();
    await sendMessage(
      `🔥 Running God Mode analysis for ${tokenAddress.slice(0, 8)}...`
    );

    const tokenData = { address: tokenAddress };
    const analysis = await agent.godModeAnalyzer.godModeFilter(tokenData);

    const emoji = analysis.verdict === "GOD_MODE_BUY" ? "🔥" : "⚠️";

    await sendMessage(
      `${emoji} *GOD MODE ANALYSIS*\n\n` +
        `Token: \`${tokenAddress.slice(0, 16)}...\`\n` +
        `Verdict: ${analysis.verdict}\n` +
        `God Score: ${analysis.score}/12 (${analysis.confidence.toFixed(
          0
        )}%)\n\n` +
        `${
          analysis.verdict === "GOD_MODE_BUY"
            ? "✅ ELITE SIGNAL!"
            : "❌ Does not meet criteria"
        }`
    );
  } catch (error) {
    await sendMessage(`❌ God Score error: ${error.message}`);
  }
});

// /migration - Show liquidity migrations
bot.onText(/\/migration/, async (msg) => {
  if (msg.chat.id.toString() !== chatId) return;

  try {
    const stats = agent.liquidityMigration.getStats();

    await sendMessage(
      `🎯 *LIQUIDITY MIGRATION*\n\n` +
        `Status: ${stats.isRunning ? "🟢 Active" : "🔴 Inactive"}\n` +
        `Tracked: ${stats.trackedMigrations}\n` +
        `Min Liquidity: ${stats.minLiquidity} SOL\n` +
        `Max Liquidity: ${stats.maxLiquidity} SOL\n` +
        `Check Interval: ${stats.checkInterval / 1000}s\n\n` +
        `💡 Sniping Raydium pool creations`
    );
  } catch (error) {
    await sendMessage(`❌ Migration status failed: ${error.message}`);
  }
});
