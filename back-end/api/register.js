import bcrypt from 'bcrypt';
import pool from '../../api/db';
import withCors from '../utils/withCors';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const hashed = await bcrypt.hash(password, 10);
  try {
    const result = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
      [email, hashed]
    );
    return res.status(201).json({ message: 'User created', user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

export default withCors(handler);
