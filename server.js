require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
// gpt-oss models think before answering; keep that short and out of the response.
const REASONING = MODEL.includes('gpt-oss') ? { reasoning_effort: 'low', include_reasoning: false } : {};

const CATEGORIES = {
  greeting: 'says hi / hello / hey / sup',
  love: 'says they love or like Sein romantically (e.g. "i love you", "ily", "aku sayang kamu")',
  compliment: 'praises Sein or the website',
  insult: 'hate comment: insults, mocks, or is rude',
  who: 'asks who Sein is, their name, or about them',
  how_are_you: 'asks how Sein is doing',
  work: 'asks about portfolio, projects, skills, drawings, animation or web work',
  why_did_you_make_this: 'asks why Sein made this website/chatbot, or what it is for',
  AI: 'asks whether this was made with AI / ChatGPT / Claude / vibe coding, or says it looks AI-made',
  joke: 'laughs, jokes, or asks for a joke',
  leave: 'wants to leave, skip, exit, or says goodbye',
  unknown: 'anything else: random, weird, unclear or nonsense ("gak jelas")',
};

const SYSTEM_PROMPT = `You classify a visitor's chat message on an artist's portfolio website.
The message may be English, Indonesian, or slang. Pick exactly one category:
${Object.entries(CATEGORIES).map(([k, v]) => `- ${k}: ${v}`).join('\n')}
Respond with JSON only: {"category": "<one of the keys above>"}`;

app.use(express.json({ limit: '4kb' }));
app.use(express.static(path.join(__dirname, 'public'), { dotfiles: 'deny' }));

// the "built with" section shows how long this file is, without serving the file itself
const SERVER_LINES = fs.readFileSync(__filename, 'utf8').split('\n').length;
app.get('/api/server-lines', (req, res) => res.json({ lines: SERVER_LINES }));

app.post('/api/classify', async (req, res) => {
  const message = String(req.body?.message ?? '').trim().slice(0, 300);
  if (!message) return res.status(400).json({ error: 'message is required' });
  if (!process.env.GROQ_API_KEY) return res.status(503).json({ error: 'GROQ_API_KEY not set' });

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        max_tokens: 300,
        ...REASONING,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`Groq ${r.status}: ${await r.text()}`);
    const data = await r.json();
    const { category } = JSON.parse(data.choices[0].message.content);
    res.json({ category: Object.hasOwn(CATEGORIES, category) ? category : 'unknown' });
  } catch (err) {
    console.error('classify failed:', err.message);
    res.status(502).json({ error: 'classification failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Running on http://localhost:${PORT}`);
  if (!process.env.GROQ_API_KEY) console.log('No GROQ_API_KEY in .env — the site will use keyword matching instead.');
});
