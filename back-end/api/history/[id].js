import { authenticateToken } from '../../utils/auth.js';
import pool from '../../db.js';
import withCors from '../../utils/withCors.js';

async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end();

  const id = req.query.id;
  const uid = req.user.id;
  const result = await pool.query('DELETE FROM paint_history WHERE id = $1 AND user_id = $2 RETURNING *', [id, uid]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Not found or not yours' });

  res.json({ message: 'Deleted successfully' });
}

export default withCors(authenticateToken(handler));
