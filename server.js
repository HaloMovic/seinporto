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

/* ---------- guestbook ---------- */
// Stored in Upstash Redis (Vercel Marketplace adds these env vars). Without them, running
// locally keeps signatures in guestbook.local.json; on Vercel the guestbook reports it's offline.
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const LOCAL_BOOK = path.join(__dirname, 'guestbook.local.json');
const KEEP = 200; // oldest signatures fall off the end
const SHOW = 60;
const COOLDOWN = 60; // seconds between signatures from one visitor

async function redis(...commands) {
  const r = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(5000),
  });
  if (!r.ok) throw new Error(`Redis ${r.status}`);
  return (await r.json()).map(x => x.result);
}

const localCooldowns = new Map();
const book = REDIS_URL && REDIS_TOKEN ? {
  async list() {
    const [items] = await redis(['LRANGE', 'guestbook', 0, SHOW - 1]);
    return items.map(s => JSON.parse(s));
  },
  async cooling(ip) {
    const [ok] = await redis(['SET', `guestbook:ip:${ip}`, 1, 'NX', 'EX', COOLDOWN]);
    return ok !== 'OK';
  },
  async add(entry) {
    await redis(['LPUSH', 'guestbook', JSON.stringify(entry)], ['LTRIM', 'guestbook', 0, KEEP - 1]);
  },
} : process.env.VERCEL ? null : {
  async list() {
    try { return JSON.parse(fs.readFileSync(LOCAL_BOOK, 'utf8')).slice(0, SHOW); } catch { return []; }
  },
  async cooling(ip) {
    const last = localCooldowns.get(ip) || 0;
    if (Date.now() - last < COOLDOWN * 1000) return true;
    localCooldowns.set(ip, Date.now());
    return false;
  },
  async add(entry) {
    let all = [];
    try { all = JSON.parse(fs.readFileSync(LOCAL_BOOK, 'utf8')); } catch {}
    fs.writeFileSync(LOCAL_BOOK, JSON.stringify([entry, ...all].slice(0, KEEP), null, 2));
  },
};

// one line of plain text: no control characters, no runs of spaces
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const HAS_LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|xyz|ru|id|co)\b)/i;

app.get('/api/guestbook', async (req, res) => {
  if (!book) return res.status(503).json({ error: 'the guestbook is closed for now' });
  try {
    res.json({ entries: await book.list() });
  } catch (err) {
    console.error('guestbook read failed:', err.message);
    res.status(502).json({ error: "couldn't open the guestbook" });
  }
});

app.post('/api/guestbook', async (req, res) => {
  if (!book) return res.status(503).json({ error: 'the guestbook is closed for now' });
  // bots fill every field, people never see this one
  if (req.body?.website) return res.status(204).end();
  const name = clean(req.body?.name, 24);
  const message = clean(req.body?.message, 140);
  if (!name || !message) return res.status(400).json({ error: 'write your name and a message' });
  if (HAS_LINK.test(name) || HAS_LINK.test(message)) return res.status(400).json({ error: 'no links, sorry' });

  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  try {
    if (await book.cooling(ip)) return res.status(429).json({ error: 'slow down, you just signed' });
    const entry = { name, message, at: Date.now() };
    await book.add(entry);
    res.status(201).json({ entry });
  } catch (err) {
    console.error('guestbook write failed:', err.message);
    res.status(502).json({ error: "couldn't sign the guestbook" });
  }
});

app.listen(PORT, () => {
  console.log(`Running on http://localhost:${PORT}`);
  if (!process.env.GROQ_API_KEY) console.log('No GROQ_API_KEY in .env — the site will use keyword matching instead.');
  if (!REDIS_URL) console.log('No Redis env vars: the guestbook is saved to guestbook.local.json.');
});
