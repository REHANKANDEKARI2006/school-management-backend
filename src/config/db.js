import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,                       // limit pool size for serverless DB
  idleTimeoutMillis: 30000,     // close idle connections after 30s
  connectionTimeoutMillis: 10000, // timeout if connect takes >10s
  keepAlive: true,              // prevent TCP connection drops
});

pool.on("connect", () => {
  console.log("✅ PostgreSQL connected");
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL error", err);
});

export default pool;
