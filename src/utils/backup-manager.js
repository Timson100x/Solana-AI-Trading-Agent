/**
 * Backup & Restore System
 */

import fs from 'fs/promises';
import { Logger } from './logger.js';

const logger = new Logger('Backup');

export class BackupManager {
  constructor() {
    this.backupDir = './backups';
  }

  async createBackup() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${this.backupDir}/backup-${timestamp}`;

      await fs.mkdir(backupPath, { recursive: true });

      // Backup config files
      await this.backupFile('config/smart-wallets.json', `${backupPath}/smart-wallets.json`);
      await this.backupFile('config/wallet-performance.json', `${backupPath}/wallet-performance.json`);

      // Backup logs
      await this.backupFile('logs/trade-history.json', `${backupPath}/trade-history.json`);

      // Backup .env (without sensitive keys)
      await this.backupEnvSafe(`${backupPath}/.env.backup`);

      logger.success(`✅ Backup created: ${backupPath}`);

      // Cleanup old backups (keep last 10)
      await this.cleanupOldBackups(10);

      return backupPath;
    } catch (error) {
      logger.error('Backup failed:', error);
      return null;
    }
  }

  async backupFile(source, dest) {
    try {
      await fs.copyFile(source, dest);
      logger.info(`📦 Backed up: ${source}`);
    } catch (error) {
      logger.warn(`Could not backup ${source}: ${error.message}`);
    }
  }

  async backupEnvSafe(dest) {
    try {
      const env = await fs.readFile('.env', 'utf-8');

      // Remove sensitive values - comprehensive sanitization
      const safe = env
        .replace(/HELIUS_API_KEY=.*/g, 'HELIUS_API_KEY=***REDACTED***')
        .replace(/WALLET_PRIVATE_KEY=.*/g, 'WALLET_PRIVATE_KEY=***REDACTED***')
        .replace(/TELEGRAM_BOT_TOKEN=.*/g, 'TELEGRAM_BOT_TOKEN=***REDACTED***')
        .replace(/TELEGRAM_CHAT_ID=.*/g, 'TELEGRAM_CHAT_ID=***REDACTED***')
        .replace(/GOOGLE_AI_API_KEY=.*/g, 'GOOGLE_AI_API_KEY=***REDACTED***')
        .replace(/GEMINI_API_KEY=.*/g, 'GEMINI_API_KEY=***REDACTED***')
        .replace(/GROQ_API_KEY=.*/g, 'GROQ_API_KEY=***REDACTED***')
        .replace(/MORALIS_API_KEY=.*/g, 'MORALIS_API_KEY=***REDACTED***')
        .replace(/BIRDEYE_API_KEY=.*/g, 'BIRDEYE_API_KEY=***REDACTED***')
        .replace(/EXTERNAL_API_KEY=.*/g, 'EXTERNAL_API_KEY=***REDACTED***')
        .replace(/NGROK_AUTH_TOKEN=.*/g, 'NGROK_AUTH_TOKEN=***REDACTED***')
        .replace(/HELIUS_WEBHOOK_SECRET=.*/g, 'HELIUS_WEBHOOK_SECRET=***REDACTED***')
        .replace(/QUICKNODE_RPC_URL=.*/g, 'QUICKNODE_RPC_URL=***REDACTED***')
        .replace(/ALCHEMY_RPC_URL=.*/g, 'ALCHEMY_RPC_URL=***REDACTED***')
        .replace(/QUICKNODE_MEV_RPC=.*/g, 'QUICKNODE_MEV_RPC=***REDACTED***')
        .replace(/TWITTER_API_KEY=.*/g, 'TWITTER_API_KEY=***REDACTED***')
        .replace(/TWITTER_API_SECRET=.*/g, 'TWITTER_API_SECRET=***REDACTED***')
        .replace(/TWITTER_ACCESS_TOKEN=.*/g, 'TWITTER_ACCESS_TOKEN=***REDACTED***')
        .replace(/TWITTER_ACCESS_SECRET=.*/g, 'TWITTER_ACCESS_SECRET=***REDACTED***')
        .replace(/TIKTOK_ACCESS_TOKEN=.*/g, 'TIKTOK_ACCESS_TOKEN=***REDACTED***')
        .replace(/EMAIL_PASSWORD=.*/g, 'EMAIL_PASSWORD=***REDACTED***')
        .replace(/api-key=[a-zA-Z0-9-]+/g, 'api-key=***REDACTED***');

      await fs.writeFile(dest, safe);
      logger.info('📦 Backed up: .env (sanitized)');
    } catch (error) {
      logger.warn(`Could not backup .env: ${error.message}`);
    }
  }

  async restoreBackup(backupPath) {
    try {
      logger.info(`🔄 Restoring from: ${backupPath}`);

      await this.restoreFile(`${backupPath}/smart-wallets.json`, 'config/smart-wallets.json');
      await this.restoreFile(`${backupPath}/wallet-performance.json`, 'config/wallet-performance.json');
      await this.restoreFile(`${backupPath}/trade-history.json`, 'logs/trade-history.json');

      logger.success('✅ Restore complete');

      return true;
    } catch (error) {
      logger.error('Restore failed:', error);
      return false;
    }
  }

  async restoreFile(source, dest) {
    try {
      await fs.copyFile(source, dest);
      logger.info(`📥 Restored: ${dest}`);
    } catch (error) {
      logger.warn(`Could not restore ${source}: ${error.message}`);
    }
  }

  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = files
        .filter(f => f.startsWith('backup-'))
        .sort()
        .reverse();

      return backups.map(name => {
        const timestamp = name.replace('backup-', '').replace(/\./g, ':');
        return {
          name,
          path: `${this.backupDir}/${name}`,
          timestamp
        };
      });
    } catch {
      return [];
    }
  }

  async cleanupOldBackups(keep = 10) {
    try {
      const backups = await this.listBackups();

      if (backups.length > keep) {
        const toDelete = backups.slice(keep);

        for (const backup of toDelete) {
          await fs.rm(backup.path, { recursive: true, force: true });
          logger.info(`🗑️  Deleted old backup: ${backup.name}`);
        }
      }
    } catch (error) {
      logger.warn('Cleanup failed:', error);
    }
  }
}
