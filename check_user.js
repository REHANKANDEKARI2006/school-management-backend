import pool from './src/config/db.js';

async function checkUser() {
    try {
        const res = await pool.query('SELECT user_id, email, status FROM "user" WHERE LOWER(email) = LOWER($1)', ['guildn56@gmail.com']);
        console.log('User found:', JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

checkUser();
