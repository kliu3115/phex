import fetch from 'node-fetch';
import { optionalAuthenticateToken } from '../utils/auth.js';
import aiLimiter from '../utils/aiLimiter.js';
import withCors from '../utils/withCors.js';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { target_color, target_amount, available_colors } = req.body;
  if (!target_color || !available_colors) {
    return res.status(400).json({ error: 'Missing required paint data' });
  }

  const prompt = `...your Gemini prompt...`;

  try {
    const geminiBody = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
    const geminiRes = await fetch(
      `https://.../generateContent?key=${process.env.GEMINI_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiBody) }
    );
    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API returned error:', geminiRes.status, errText);
      return res.status(geminiRes.status).json({ error: errText });
    }
    const data = await geminiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const match = text.match(/{[\s\S]*}/);
    if (!match) return res.status(500).json({ error: 'No JSON returned' });
    const parsed = JSON.parse(match[0]);
    res.json({
      recommended_mix: parsed.recommended_mix || [],
      target: parsed.target || { color: target_color, amount: target_amount },
      notes: parsed.notes || 'No notes',
    });
  } catch (err) {
    console.error('Gemini API call error:', err);
    res.status(500).json({ error: 'AI request failed' });
  }
}

export default withCors(optionalAuthenticateToken(aiLimiter(handler)));
