import pool from '../config/db.js';

export const up = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS document_templates (
                id SERIAL PRIMARY KEY,
                document_type VARCHAR(255) NOT NULL,
                language VARCHAR(50) NOT NULL DEFAULT 'english',
                content TEXT NOT NULL,
                character_limit INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(document_type, language)
            )
        `);

        await client.query('COMMIT');
        console.log("✅ document_templates table created successfully.");
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("❌ Failed to create document_templates table", e);
        throw e;
    } finally {
        client.release();
    }
};

export const down = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DROP TABLE IF EXISTS document_templates CASCADE');
        await client.query('COMMIT');
        console.log("✅ document_templates table dropped.");
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};
