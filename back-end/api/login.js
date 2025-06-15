import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../../api/db';
import withCors from '../utils/withCors';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, password } = req.body;
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
}

export default withCors(handler);
