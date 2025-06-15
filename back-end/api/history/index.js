import { authenticateToken } from '../../utils/auth';
import pool from '../../api/db';
import withCors from '../../utils/withCors';

async function handler(req, res) {
  const uid = req.user.id;

  if (req.method === 'GET') {
    const result = await pool.query(
      'SELECT id, target_color, target_amount, available_colors, recommended_mix, created_at, notes FROM paint_history WHERE user_id = $1 ORDER BY created_at DESC',
      [uid]
    );
    return res.json(result.rows);
  }

  if (req.method === 'POST') {
    const { target_color, target_amount, available_colors, recommended_mix, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO paint_history (user_id, target_color, target_amount, available_colors, recommended_mix, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [uid, target_color, target_amount, JSON.stringify(available_colors), JSON.stringify(recommended_mix), notes]
    );
    return res.status(201).json(result.rows[0]);
  }

  res.status(405).end();
}

export default withCors(authenticateToken(handler));
