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
    const geminiBody = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
    console.log('Sending request to Gemini API');
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiBody) }
    );
    console.log('Gemini API response status:', geminiRes.status);
    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API returned error:', geminiRes.status, errText);
      return res.status(geminiRes.status).json({ error: errText });
    }
    const data = await geminiRes.json();
    console.log('Gemini API response data:', data);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('Extracted text:', text);
    const match = text.match(/{[\s\S]*}/);
    if (!match) return res.status(500).json({ error: 'No JSON returned' });
    let parsed;
    try {
      parsed = JSON.parse(match[0]);
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr);
      return res.status(500).json({ error: 'Failed to parse JSON from AI response' });
    }
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
