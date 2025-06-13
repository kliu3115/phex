import express from 'express';
import pg from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import cors from 'cors';
import fetch from 'node-fetch';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

app.use(cors());
app.use(express.json());

app.get('/api/debug/dbname', async (req, res) => {
  try {
    const result = await pool.query('SELECT current_database()');
    res.json({ connected: true, database: result.rows[0].current_database });
  } catch (err) {
    console.error('DB connection failed:', err);
    res.status(500).json({ connected: false, error: err.message });
  }
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
}

function optionalAuthenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];

  if (!token) {
    req.user = null;
    return next(); // allow through without user
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log("⚠️ Invalid token, continuing without user");
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
}

// Register a new user
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
      [email, hashedPassword]
    );
    res.status(201).json({ message: 'User created', user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') { // unique violation
      res.status(409).json({ error: 'Email already exists' });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  }
});

// Login user and return JWT token
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add new paint history (auth required)
app.post('/api/history', authenticateToken, async (req, res) => {
  const { target_color, target_amount, available_colors, recommended_mix, notes} = req.body;
  console.log('Received /api/history request:', req.body);
  if (!target_color || !available_colors) {
    return res.status(400).json({ error: 'Missing paint data: target_color and available_colors required' });
  }

  try {
  const result = await pool.query(
    `INSERT INTO paint_history (user_id, target_color, target_amount, available_colors, recommended_mix, notes)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [req.user.id, target_color, target_amount, JSON.stringify(available_colors), JSON.stringify(recommended_mix), notes]
  );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's paint history (auth required)
app.get('/api/history', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
    'SELECT id, target_color, target_amount, available_colors, recommended_mix, created_at, notes FROM paint_history WHERE user_id = $1 ORDER BY created_at DESC',
  [req.user.id]
);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete paint history item by id (auth required)
app.delete('/api/history/:id', authenticateToken, async (req, res) => {
  const id = req.params.id;
  try {
    const result = await pool.query('DELETE FROM paint_history WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.user.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'History item not found or not owned by user' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max: 5,                     // limit each IP/user to 5 requests per window
  keyGenerator: (req) => {
    // if you want per-user instead of per-IP:
    return req.user?.id?.toString() || req.ip;
  },
  handler: (req, res /*, next */) => {
    res
      .status(429)
      .json({ error: 'Too many AI requests – please slow down.' });
  },
});

app.post('/api/calculate', optionalAuthenticateToken, aiLimiter, async (req, res) => {
  const { target_color, target_amount, available_colors } = req.body;
  console.log('Received /api/calculate request:', req.body);

  if (!target_color || !available_colors) {
    return res.status(400).json({ error: 'Missing required paint data' });
  }

  try {
const prompt = `
You are a helpful paint mixing assistant.

The user has a set of available paints and a target paint color. Your job is to recommend a mix using the available paints to best approximate the target color, even if an exact match is not possible.

Available paints:
${available_colors.map(c => `- ${c.amount} mL of ${c.color}`).join('\n')}

Target color: ${target_color}
Target amount: ${target_amount} mL

Instructions:
- Always provide a recommended_mix using the available colors.
- Try to get as close as possible to the target color, even if not exact.
- If an exact match is impossible, explain that in the notes and provide the best approximation.
- Your response must be valid JSON (do not include any extra text or explanation outside the JSON block).
- If a suggested mix exceeds the available amounts, mention it in notes.
- Give more than 2 colors in the recommended_mix if that leads to a better approximation, but keep the same format

Respond using this format:

{
  "recommended_mix": [
    { "hex": "#hex1", "amount": X },
    { "hex": "#hex2", "amount": Y }
  ],
  "target": {
    "hex": "#approximatedcolor",  // either target or closest match
    "amount": "amount made"
  },
  "notes": "Say whether this is an approximation or an exact match. Mention limitations or assumptions."
}
`;


    const geminiBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    };

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error(`Gemini API error: ${geminiResponse.status} ${errorText}`);
      return res.status(geminiResponse.status).json({ error: errorText });
    }

    const result = await geminiResponse.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    const jsonMatch = text.match(/{[\s\S]*}/);
    if (!jsonMatch) {
      console.error("No JSON block found in Gemini response:", text);
      return res.status(500).json({
        error: "Could not extract JSON from Gemini response",
        raw: text,
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Failed to parse Gemini response JSON:", parseError);
      return res.status(500).json({
        error: "Gemini returned unstructured response",
        raw: text,
      });
    }

    res.json({
      recommended_mix: parsed.recommended_mix || [],
      target: parsed.target || { color: target_color, amount: target_amount },
      notes: parsed.notes || "No additional notes.",
    });
    console.log("Extracted text:", text);
  } catch (err) {
    console.error("Fetch failed:", err);
    res.status(500).json({ error: "Failed to get AI recommendation" });
  }
});
