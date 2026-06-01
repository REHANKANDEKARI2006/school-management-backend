import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 40,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
  keepAlive: true,
});

pool.on("connect", () => {
  console.log("✅ PostgreSQL connected");
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL error", err);
});

const queryWithRetry = async (text, params) => {
  for (let i = 0; i < 3; i++) {
    try {
      return await pool.query(text, params);
    } catch (err) {
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
