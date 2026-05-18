require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;

const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

const tick  = `${c.green}✔${c.reset}`;
const cross = `${c.red}✖${c.reset}`;
const dot   = `${c.gray}◦${c.reset}`;

const ms = (n) => `${c.cyan}${n}ms${c.reset}`;
const now = () => new Date().toLocaleTimeString('en-IN', { hour12: false });

async function start() {
  const appStart = Date.now();

  console.log(`\n${c.bold}${c.cyan}  Importerr CRM — Starting up...${c.reset}\n`);

  // ── MongoDB ──────────────────────────────────────────────────
  process.stdout.write(`  ${dot} MongoDB       connecting...`);
  let dbMs;
  try {
    dbMs = await connectDB();
    process.stdout.write(`\r  ${tick} MongoDB       connected        ${ms(dbMs)}\n`);
  } catch (err) {
    process.stdout.write(`\r  ${cross} MongoDB       FAILED — ${err.message}\n`);
    process.exit(1);
  }

  // ── Redis (optional) ─────────────────────────────────────────
  const { getRedisUrl, isRedisConfigured } = require('./src/config/redis');
  if (isRedisConfigured()) {
    process.stdout.write(`  ${dot} Redis         connecting...`);
    const t0 = Date.now();
    try {
      const redis = require('redis');
      const client = redis.createClient({ url: getRedisUrl() });
      await client.connect();
      await client.ping();
      process.stdout.write(`\r  ${tick} Redis         connected        ${ms(Date.now() - t0)}\n`);
    } catch (err) {
      process.stdout.write(`\r  ${cross} Redis         FAILED — ${err.message}\n`);
    }
  } else {
    console.log(`  ${c.gray}◌ Redis         skipped (not configured)${c.reset}`);
  }

  // ── HTTP Server ───────────────────────────────────────────────
  process.stdout.write(`  ${dot} HTTP Server   starting...`);
  const t0 = Date.now();
  await new Promise((resolve) => {
    app.listen(PORT, () => {
      process.stdout.write(`\r  ${tick} HTTP Server   listening        ${ms(Date.now() - t0)}\n`);
      resolve();
    });
  });

  // ── Email Queue Worker ────────────────────────────────────────
  process.stdout.write(`  ${dot} Email Worker  starting...`);
  try {
    require('./src/queues/emailWorker');
    process.stdout.write(`\r  ${tick} Email Worker  ready           \n`);
  } catch (err) {
    process.stdout.write(`\r  ${cross} Email Worker  FAILED — ${err.message}\n`);
  }

  // ── Summary ───────────────────────────────────────────────────
  const total = Date.now() - appStart;
  console.log(`\n  ${c.bold}${c.green}Ready${c.reset} in ${ms(total)}  ${c.gray}[${now()}]${c.reset}`);
  console.log(`  ${c.gray}→ http://localhost:${PORT}${c.reset}\n`);
}

start();
