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

      // Remove sensitive values
      const safe = env.split('\n').map(line => {
        if (line.includes('_KEY=') || line.includes('_TOKEN=')) {
          const [key] = line.split('=');
          return `${key}=***REDACTED***`;
        }
        return line;
      }).join('\n');

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
