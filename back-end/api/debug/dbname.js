import pool from '../../api/db';
import withCors from '../../utils/withCors';

async function handler(req, res) {
  const result = await pool.query('SELECT current_database()');
  res.json({ connected: true, database: result.rows[0].current_database });
}

export default withCors(handler);
