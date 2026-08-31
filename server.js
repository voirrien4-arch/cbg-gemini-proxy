// Petit serveur proxy pour appeler Gemini sans exposer la clé API au navigateur.
//
// La clé vit UNIQUEMENT dans la variable d'environnement GEMINI_API_KEY,
// configurée sur Render (Dashboard → ton service → Environment).
// Elle n'est jamais envoyée au client, jamais dans le HTML/JS du site.

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

// N'autorise que ton site à appeler ce proxy (remplace par ton vrai domaine).
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: ALLOWED_ORIGINS.includes('*') ? true : ALLOWED_ORIGINS,
  })
);
app.use(express.json({ limit: '1mb' }));

// Limite très simple anti-abus (par IP, en mémoire — suffisant pour une démo).
const rateLimitWindowMs = 60_000;
const rateLimitMax = 20;
const hits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const windowStart = now - rateLimitWindowMs;
  const timestamps = (hits.get(ip) || []).filter((t) => t > windowStart);
  timestamps.push(now);
  hits.set(ip, timestamps);
  return timestamps.length > rateLimitMax;
}

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'cbg-gemini-proxy' });
});

app.post('/api/ai', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY_NOT_CONFIGURED' });
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    if (isRateLimited(ip)) {
      return res.status(429).json({ error: 'RATE_LIMITED' });
    }

    const { question, context, system, expiresAt } = req.body || {};

    if (expiresAt && Date.now() > Date.parse(expiresAt)) {
      return res.status(410).json({ error: 'INTEGRATION_EXPIRED' });
    }
    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'EMPTY_QUESTION' });
    }

    const promptParts = [];
    if (system) promptParts.push(system);
    if (context) promptParts.push(`CONTEXTE VÉRIFIÉ:\n${context}`);
    promptParts.push(`QUESTION: ${question}`);

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: promptParts.join('\n\n') }],
            },
          ],
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text().catch(() => '');
      console.error('Gemini API error:', geminiResponse.status, errText);
      return res.status(502).json({ error: 'GEMINI_UPSTREAM_ERROR' });
    }

    const data = await geminiResponse.json();
    const answer = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';

    if (!answer.trim()) {
      return res.status(502).json({ error: 'GEMINI_EMPTY_RESPONSE' });
    }

    return res.json({ answer: answer.trim() });
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

app.listen(PORT, () => {
  console.log(`CBG Gemini proxy listening on port ${PORT}`);
});
