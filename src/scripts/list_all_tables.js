
import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function listAll() {
  try {
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log("ALL_TABLES:", tables.rows.map(r => r.table_name));

    // Check for a 'role' table or similar
    const roleTable = tables.rows.find(t => t.table_name.toLowerCase().includes('role'));
    if (roleTable) {
        const roles = await pool.query(`SELECT * FROM "${roleTable.table_name}"`);
        console.log("ROLES_DATA:", roles.rows);
    }

    // Check for admin related tables
    const adminTables = tables.rows.filter(t => t.table_name.toLowerCase().includes('admin'));
    console.log("ADMIN_RELATED_TABLES:", adminTables.map(t => t.table_name));
    
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await pool.end();
  }
}

listAll();
