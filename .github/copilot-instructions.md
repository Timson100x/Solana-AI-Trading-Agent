# GitHub Copilot Instructions - Solana AI Trading Agent

## Project Context
This is a professional Solana AI Trading Agent with ElizaOS V2 integration. The bot analyzes tokens, executes trades via Jupiter, and uses AI for decision-making.

## Tech Stack
- Node.js 20+
- Solana web3.js v2.0.0
- @elizaos/plugin-solana v0.1.7
- Jupiter Aggregator V6
- Google Gemini AI
- Telegram Bot API

## Code Style Guidelines

### 1. Modern ES6+ Syntax
```javascript
// ✅ Use ES6 imports
import { Connection, PublicKey } from '@solana/web3.js';

// ❌ Don't use CommonJS
const { Connection } = require('@solana/web3.js');

// ✅ Use arrow functions
const calculateProfit = (buy, sell) => ((sell - buy) / buy) * 100;

// ✅ Use async/await
async function executeSwap() {
  const result = await jupiter.buyToken(mint, amount);
  return result;
}
```

### 2. Error Handling
```javascript
// ✅ Always wrap in try-catch with logging
try {
  const result = await riskyOperation();
  logger.success('Operation succeeded');
  return result;
} catch (error) {
  logger.error('Operation failed:', error);
  throw error; // Re-throw if caller needs to handle
}

// ✅ Use optional chaining
const price = data?.quote?.price ?? 0;

// ✅ Validate inputs
if (!tokenMint || amount <= 0) {
  throw new Error('Invalid parameters');
}
```

### 3. ElizaOS V2 Patterns
```javascript
// ✅ Use dynamic priority fees
const priorityFee = await wallet.getDynamicPriorityFee();

// ✅ Optimize transactions
transaction = await wallet.optimizeTransaction(transaction);

// ✅ Add retry logic (3x)
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    return await operation();
  } catch (error) {
    if (attempt === 3) throw error;
    await sleep(1000 * attempt);
  }
}
```

### 4. Logging Standards
```javascript
// ✅ Use logger class
logger.info('Starting operation...');
logger.success('✅ Operation completed');
logger.error('❌ Operation failed:', error);
logger.warn('⚠️ Warning message');

// ✅ Include context
logger.info(\`Processing token: \${mint.slice(0, 8)}...\`);
logger.success(\`✅ Trade executed: \${signature.slice(0, 8)}...\`);
```

### 5. Configuration Management
```javascript
// ✅ Use environment variables with defaults
const slippage = parseInt(process.env.SLIPPAGE_BPS || 100);
const minConfidence = parseFloat(process.env.MIN_CONFIDENCE || 75);

// ✅ Validate configuration
if (minConfidence < 0 || minConfidence > 100) {
  throw new Error('MIN_CONFIDENCE must be between 0 and 100');
}
```

### 6. Service Architecture
```javascript
// ✅ Dependency injection in constructors
constructor(connection, wallet, config) {
  this.connection = connection;
  this.wallet = wallet;
  this.config = config;
}

// ✅ Initialize services with health checks
async initialize() {
  const health = await this.healthCheck();
  if (health.status !== 'healthy') {
    throw new Error('Service unhealthy');
  }
  this.initialized = true;
}

// ✅ Graceful shutdown
async shutdown() {
  logger.info('Shutting down service...');
  // Cleanup resources
  this.initialized = false;
}
```

## Security Best Practices

### 1. Private Key Handling
```javascript
// ✅ Never log private keys
logger.info(\`Wallet: \${publicKey.toBase58()}\`); // OK
// ❌ logger.info(\`Key: \${privateKey}\`); // NEVER!

// ✅ Validate key length
if (decoded.length !== 64) {
  throw new Error('Invalid key length');
}
```

### 2. Input Validation
```javascript
// ✅ Validate all external inputs
function validateMint(mint) {
  try {
    new PublicKey(mint);
    return true;
  } catch {
    return false;
  }
}

// ✅ Sanitize amounts
const lamports = Math.floor(Number(amount));
if (!Number.isFinite(lamports) || lamports <= 0) {
  throw new Error('Invalid amount');
}
```

### 3. Rate Limiting
```javascript
// ✅ Implement cooldowns
const lastRequest = Date.now();
const cooldown = 1000; // 1 second
if (Date.now() - lastRequest < cooldown) {
  throw new Error('Rate limited');
}
```

## Performance Optimization

### 1. Caching
```javascript
// ✅ Cache with TTL
const cache = { data: null, timestamp: 0, ttl: 10000 };

async function getData() {
  if (Date.now() - cache.timestamp < cache.ttl) {
    return cache.data;
  }
  cache.data = await fetchData();
  cache.timestamp = Date.now();
  return cache.data;
}
```

### 2. Parallel Operations
```javascript
// ✅ Use Promise.all for independent operations
const [balance, price, liquidity] = await Promise.all([
  getBalance(),
  getPrice(),
  getLiquidity()
]);

// ✅ Use Promise.race for timeouts
const result = await Promise.race([
  operation(),
  timeout(30000, 'Operation timeout')
]);
```

## Testing Guidelines

### 1. Manual Testing
```javascript
// ✅ Add test mode checks
if (process.env.TRADING_ENABLED !== 'true') {
  logger.warn('Trading disabled - Alert mode only');
  return;
}

// ✅ Dry run support
if (dryRun) {
  logger.info('DRY RUN - Would execute trade');
  return simulatedResult;
}
```

### 2. Error Simulation
```javascript
// ✅ Test error paths
if (process.env.NODE_ENV === 'test') {
  throw new Error('Simulated error for testing');
}
```

## Common Patterns

### 1. Retry with Exponential Backoff
```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * Math.pow(2, i));
    }
  }
}
```

### 2. Health Checks
```javascript
async healthCheck() {
  try {
    await this.connection.getLatestBlockhash('confirmed');
    return { status: 'healthy', timestamp: Date.now() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}
```

### 3. Event Emitters
```javascript
import EventEmitter from 'eventemitter3';

class TradingBot extends EventEmitter {
  constructor() {
    super();
  }

  async executeTrade() {
    this.emit('trade:start', { token, amount });
    const result = await trade();
    this.emit('trade:complete', result);
  }
}
```

## AI Integration

### 1. Prompt Engineering
```javascript
// ✅ Clear, structured prompts
const prompt = \`
Analyze this Solana token:
- Name: \${data.name}
- Symbol: \${data.symbol}
- Liquidity: \${data.liquidity} SOL
- Holders: \${data.holders}

Provide:
1. Confidence score (0-100)
2. Risk assessment
3. Trade recommendation
\`;
```

### 2. Response Parsing
```javascript
// ✅ Extract structured data
function parseAIResponse(text) {
  const confidenceMatch = text.match(/confidence[:\s]+(\d+)/i);
  const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 0;
  return { confidence, raw: text };
}
```

## Deployment

### 1. Environment Validation
```javascript
// ✅ Check required env vars on startup
const required = ['RPC_ENDPOINT', 'WALLET_PRIVATE_KEY', 'TELEGRAM_BOT_TOKEN'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(\`Missing required env var: \${key}\`);
  }
}
```

### 2. Graceful Shutdown
```javascript
// ✅ Handle shutdown signals
process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  await bot.shutdown();
  process.exit(0);
});
```

## Remember
- Always use ElizaOS V2 optimizations
- Log all important operations
- Handle errors gracefully
- Validate all inputs
- Never expose sensitive data
- Test in alert mode first
- Monitor performance metrics
