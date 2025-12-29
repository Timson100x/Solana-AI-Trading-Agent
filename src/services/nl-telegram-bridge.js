/**
 * Natural Language Telegram Bridge - ElizaOS V2
 * Verbindet Telegram Commands mit NL Command Handler
 */

import { Logger } from "../utils/logger.js";
import { NLCommandHandler } from "../core/nl-command-handler.js";
import { AutoDeployService } from "./auto-deploy.js";

const logger = new Logger("NL-Bridge");

export class NLTelegramBridge {
  constructor(telegramService, aiProvider) {
    this.telegram = telegramService;
    this.nlHandler = new NLCommandHandler(aiProvider);
    this.autoDeploy = new AutoDeployService();
    this.setupCommands();
  }

  setupCommands() {
    // /buildbot command - Natural Language Bot Builder
    this.telegram.bot.onText(/\/buildbot (.+)/, async (msg, match) => {
      if (msg.chat.id.toString() !== this.telegram.chatId) return;

      const userInput = match[1];

      await this.telegram.sendMessage(
        `🧠 Verstehe Anfrage...\n\n"${userInput}"\n\n⏳ Generiere Code...`
      );

      try {
        // 1. Parse Natural Language
        const parseResult = await this.nlHandler.parse(userInput);

        if (!parseResult.success) {
          await this.telegram.sendMessage(
            `❌ Konnte Anfrage nicht verstehen.\n\n` +
              `Versuche:\n` +
              parseResult.suggestions.map((s) => `• ${s}`).join("\n")
          );
          return;
        }

        // 2. Generate Code
        const generatedCode = await this.nlHandler.generateCode(
          parseResult.spec
        );

        // 3. Preview
        await this.telegram.sendMessage(
          `✅ Bot generiert!\n\n` +
            `**${parseResult.spec.description}**\n\n` +
            `Datei: \`${generatedCode.filename}\`\n` +
            `Parameter: ${JSON.stringify(
              parseResult.spec.parameters,
              null,
              2
            )}\n\n` +
            `Deploy mit: \`/deploy ${generatedCode.filename}\``
        );

        // Save for later deployment
        this.pendingDeploy = { generatedCode, spec: parseResult.spec };
      } catch (error) {
        logger.error("❌ Bot generation failed:", error);
        await this.telegram.sendMessage(
          `❌ Fehler bei Code-Generierung:\n\n${error.message}`
        );
      }
    });

    // /deploy command - Deploy generated bot
    this.telegram.bot.onText(/\/deploy/, async (msg) => {
      if (msg.chat.id.toString() !== this.telegram.chatId) return;

      if (!this.pendingDeploy) {
        await this.telegram.sendMessage(
          `❌ Kein Bot zum Deployen vorhanden.\n\nErstelle zuerst einen Bot mit \`/buildbot\``
        );
        return;
      }

      await this.telegram.sendMessage(
        `🚀 Deploye Bot...\n\n` +
          `⏳ Git Commit...\n` +
          `⏳ GitHub Push...\n` +
          `⏳ VPS Deploy...`
      );

      try {
        const result = await this.autoDeploy.deploy(
          this.pendingDeploy.generatedCode,
          this.pendingDeploy.spec
        );

        // Health check
        const health = await this.autoDeploy.healthCheck();

        await this.telegram.sendMessage(
          `✅ **Deployment erfolgreich!**\n\n` +
            `Datei: \`${result.filename}\`\n` +
            `GitHub: ✅ Pushed\n` +
            `VPS: ${health.healthy ? "✅ Online" : "⚠️ Check logs"}\n\n` +
            `Bot läuft jetzt auf dem VPS! 🔥`
        );

        // Clear pending
        this.pendingDeploy = null;
      } catch (error) {
        logger.error("❌ Deployment failed:", error);
        await this.telegram.sendMessage(
          `❌ Deployment fehlgeschlagen:\n\n${error.message}\n\n` +
            `Rollback mit: \`/rollback\``
        );
      }
    });

    // /listbots - Show available bot templates
    this.telegram.bot.onText(/\/listbots/, async (msg) => {
      if (msg.chat.id.toString() !== this.telegram.chatId) return;

      const templates = Object.values(this.nlHandler.commands);

      const message =
        `🤖 **Verfügbare Bot-Typen:**\n\n` +
        templates.map((t) => `• **${t.description}**`).join("\n") +
        `\n\n**Beispiele:**\n` +
        `• \`/buildbot baue einen gridbot für SOL von 50-150 mit 10 levels\`\n` +
        `• \`/buildbot erstelle dca bot für BONK alle 4h mit 0.01 SOL\`\n` +
        `• \`/buildbot sniper bot für neue pump.fun tokens\``;

      await this.telegram.sendMessage(message);
    });

    // /rollback - Rollback last deployment
    this.telegram.bot.onText(/\/rollback/, async (msg) => {
      if (msg.chat.id.toString() !== this.telegram.chatId) return;

      await this.telegram.sendMessage(`⚠️ Rolling back...`);

      try {
        await this.autoDeploy.rollback();
        await this.telegram.sendMessage(`✅ Rollback erfolgreich!`);
      } catch (error) {
        await this.telegram.sendMessage(
          `❌ Rollback fehlgeschlagen:\n\n${error.message}`
        );
      }
    });

    logger.success("✅ NL Telegram Bridge initialized");
  }
}
