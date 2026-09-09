import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/trak_local?schema=public' });
async function main() {
  const res = await pool.query("SELECT * FROM library_resources LIMIT 1");
  console.log(res.rows);
  await pool.end();
}
main();
