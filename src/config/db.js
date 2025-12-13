import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL

},
 console.log("connected") 
);

// Robust error logging
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});



export default pool;
