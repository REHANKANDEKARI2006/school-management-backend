import pg from "pg";
import dotenv from "dotenv";
import { AsyncLocalStorage } from "node:async_hooks";
import { logQuery } from "../utils/query_logger.js";
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  min: 0,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 20000,  // 20s — allows for Neon cold-start wake-up after compute suspension
  keepAlive: false,
  allowExitOnIdle: true,
});

pool.on("connect", () => {
  console.log("✅ PostgreSQL connected");
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL error", err);
});

// AsyncLocalStorage to carry request context into nested async calls
const queryContext = new AsyncLocalStorage();

/**
 * Set the query context for the current async scope.
 * Call this from middleware to tag all queries within a request.
 */
export function setQueryContext(context, triggerType = 'api') {
  const store = queryContext.getStore();
  if (store) {
    store.context = context;
    store.triggerType = triggerType;
  }
}

/**
 * Get the current query context (route path, cron tag, etc.)
 */
export function getQueryContext() {
  return queryContext.getStore() || { context: 'unknown', triggerType: 'unknown' };
}

/**
 * Run a function within a query context scope.
 */
export function runWithQueryContext(context, triggerType, fn) {
  return queryContext.run({ context, triggerType }, fn);
}

const queryWithRetry = async (text, params) => {
  const start = performance.now();
  let result;
  let lastErr;

  for (let i = 0; i < 3; i++) {
    try {
      result = await pool.query(text, params);
      break;
    } catch (err) {
      lastErr = err;
      const isNetworkError = 
        err.code === 'ENOTFOUND' || 
        err.code === 'EAI_AGAIN' || 
        err.code === 'ECONNRESET' ||
        (err.message && err.message.includes("Connection terminated unexpectedly")) ||
        (err.message && err.message.includes("timeout")) ||
        (err.message && err.message.includes("ENOTFOUND"));

      if (isNetworkError && i < 2) {
        console.warn(`⚠️ DB Network Error (${err.code || err.message}), retrying query...`);
        await new Promise(res => setTimeout(res, 1000));
        continue;
      }
      throw err;
    }
  }

  // Log the query after successful execution
  const durationMs = performance.now() - start;
  const { context, triggerType } = getQueryContext();
  logQuery(context, typeof text === 'string' ? text : '(prepared)', durationMs, triggerType);

  return result;
};

const dbProxy = new Proxy(pool, {
  get: (target, prop) => {
    if (prop === 'query') {
      return queryWithRetry;
    }
    const value = target[prop];
    return typeof value === 'function' ? value.bind(target) : value;
  }
});

export default dbProxy;
