/**
 * Auto-Deploy Service - ElizaOS V2
 * Deployed generierten Code automatisch auf VPS
 */

import { Logger } from "../utils/logger.js";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);
const logger = new Logger("AutoDeploy");

export class AutoDeployService {
  constructor(config = {}) {
    this.config = {
      repoPath: config.repoPath || process.cwd(),
      vpsHost: config.vpsHost || process.env.VPS_HOST,
      vpsUser: config.vpsUser || process.env.VPS_USER || "root",
      vpsPath: config.vpsPath || "/root/Solana-AI-Trading-Agent",
      branch: config.branch || "main",
      ...config,
    };
  }

  /**
   * Deploy generated code to GitHub + VPS
   */
  async deploy(generatedCode, spec) {
    logger.info("🚀 Starting auto-deploy...");

    try {
      // 1. Save code to file
      const filename = await this.saveCode(generatedCode, spec);

      // 2. Commit to Git
      await this.commitToGit(filename, spec);

      // 3. Push to GitHub
      await this.pushToGitHub();

      // 4. Deploy to VPS (if configured)
      if (this.config.vpsHost) {
        await this.deployToVPS();
      }

      logger.success("✅ Auto-deploy completed!");

      return {
        success: true,
        filename,
        deployed: !!this.config.vpsHost,
      };
    } catch (error) {
      logger.error("❌ Auto-deploy failed:", error);
      throw error;
    }
  }

  /**
   * Save generated code to file
   */
  async saveCode(code, spec) {
    const filename = code.filename;
    const filepath = path.join(this.config.repoPath, "bots", filename);

    // Ensure bots directory exists
    await fs.mkdir(path.join(this.config.repoPath, "bots"), {
      recursive: true,
    });

    // Write file
    await fs.writeFile(filepath, code.code, "utf-8");

    logger.success(`✅ Code saved: ${filename}`);
    return filename;
  }

  /**
   * Commit to Git
   */
  async commitToGit(filename, spec) {
    logger.info("📝 Committing to Git...");

    const commitMessage = `🤖 Auto-generated: ${spec.description}\n\nGenerated from: "${spec.nlInput}"`;

    try {
      await execAsync(`git add bots/${filename}`, {
        cwd: this.config.repoPath,
      });

      await execAsync(`git commit -m "${commitMessage}"`, {
        cwd: this.config.repoPath,
      });

      logger.success("✅ Committed to Git");
    } catch (error) {
      if (error.message.includes("nothing to commit")) {
        logger.info("ℹ️ No changes to commit");
      } else {
        throw error;
      }
    }
  }

  /**
   * Push to GitHub
   */
  async pushToGitHub() {
    logger.info("⬆️ Pushing to GitHub...");

    try {
      const { stdout } = await execAsync(
        `git push origin ${this.config.branch}`,
        { cwd: this.config.repoPath }
      );

      logger.success("✅ Pushed to GitHub");
      return stdout;
    } catch (error) {
      if (error.message.includes("up-to-date")) {
        logger.info("ℹ️ Already up to date");
      } else {
        throw error;
      }
    }
  }

  /**
   * Deploy to VPS via SSH
   */
  async deployToVPS() {
    logger.info(`🌐 Deploying to VPS: ${this.config.vpsHost}`);

    const commands = [
      `cd ${this.config.vpsPath}`,
      `git pull origin ${this.config.branch}`,
      `npm install --omit=dev`,
      `pm2 restart solana-bot || pm2 start index.js --name solana-bot`,
    ];

    try {
      for (const cmd of commands) {
        logger.info(`🔧 Executing: ${cmd}`);

        const { stdout } = await execAsync(
          `ssh ${this.config.vpsUser}@${this.config.vpsHost} "${cmd}"`,
          { timeout: 30000 }
        );

        if (stdout) logger.info(stdout);
      }

      logger.success("✅ Deployed to VPS");
    } catch (error) {
      logger.error("❌ VPS deployment failed:", error.message);
      throw error;
    }
  }

  /**
   * Health check after deployment
   */
  async healthCheck() {
    if (!this.config.vpsHost) return { healthy: true, reason: "Local only" };

    try {
      const { stdout } = await execAsync(
        `ssh ${this.config.vpsUser}@${this.config.vpsHost} "pm2 status solana-bot"`,
        { timeout: 10000 }
      );

      const isOnline = stdout.includes("online");

      return {
        healthy: isOnline,
        status: stdout,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
      };
    }
  }

  /**
   * Rollback deployment
   */
  async rollback() {
    logger.warn("⚠️ Rolling back deployment...");

    try {
      await execAsync(`git reset --hard HEAD~1`, {
        cwd: this.config.repoPath,
      });

      if (this.config.vpsHost) {
        await execAsync(
          `ssh ${this.config.vpsUser}@${this.config.vpsHost} "cd ${this.config.vpsPath} && git reset --hard HEAD~1 && pm2 restart solana-bot"`,
          { timeout: 30000 }
        );
      }

      logger.success("✅ Rollback completed");
    } catch (error) {
      logger.error("❌ Rollback failed:", error);
      throw error;
    }
  }
}
