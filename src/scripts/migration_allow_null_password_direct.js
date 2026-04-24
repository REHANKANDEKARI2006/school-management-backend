import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

async function migrate() {
    const client = new pg.Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        console.log("🚀 Running migration (Client): Allow NULL for password_hash...");
        await client.query('ALTER TABLE "user" ALTER COLUMN password_hash DROP NOT NULL');
        console.log("✅ Successfully altered password_hash.");
    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        await client.end();
        process.exit();
    }
}

migrate();
