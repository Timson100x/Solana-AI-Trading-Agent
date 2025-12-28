/**
 * Simple logging utility
 * Complete implementation with GitHub Copilot
 */
export class Logger {
  constructor(module) {
    this.module = module;
  }

  info(message, ...args) {
    console.log(\`[\${new Date().toISOString()}] [\${this.module}] ℹ️  \${message}\`, ...args);
  }

  success(message, ...args) {
    console.log(\`[\${new Date().toISOString()}] [\${this.module}] ✅ \${message}\`, ...args);
  }

  warn(message, ...args) {
    console.warn(\`[\${new Date().toISOString()}] [\${this.module}] ⚠️  \${message}\`, ...args);
  }

  error(message, ...args) {
    console.error(\`[\${new Date().toISOString()}] [\${this.module}] ❌ \${message}\`, ...args);
  }
}
