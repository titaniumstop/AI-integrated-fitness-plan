module.exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Missing GEMINI_API_KEY' }) };
    }

    const body = JSON.parse(event.body || '{}');
    const message = (body.message || '').toString().trim();
    const history = Array.isArray(body.history) ? body.history : [];
    const profile = body.profile || null;
    const plan = typeof body.plan === 'string' ? body.plan : '';

    if (!message) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Missing required field: message' })
      };
    }

    const isLocal = (process.env.NETLIFY_DEV || process.env.NETLIFY_LOCAL) ? true : false;

    const makeContents = () => {
      const parts = [];
      // Inject context as an initial user message so model can ground answers
      const contextLines = [];
      if (profile && typeof profile === 'object') {
        const keys = Object.keys(profile);
        if (keys.length) {
          contextLines.push('USER PROFILE:');
          for (const k of keys) {
            const v = profile[k];
            if (v === undefined || v === '') continue;
            contextLines.push(`- ${k}: ${v}`);
          }
        }
      }
      if (plan) {
        contextLines.push('', 'GENERATED PLAN (summary text):');
        // Trim very long plan to avoid excessive tokens in chat
        const trimmed = plan.length > 4000 ? plan.slice(0, 4000) + '... [truncated]' : plan;
        contextLines.push(trimmed);
      }
      if (contextLines.length) {
        parts.push({ role: 'user', parts: [{ text: contextLines.join('\n') }] });
      }
      for (const turn of history) {
        if (!turn || !turn.role || !turn.content) continue;
        parts.push({ role: turn.role === 'model' ? 'model' : 'user', parts: [{ text: String(turn.content) }] });
      }
      // current user message
      parts.push({ role: 'user', parts: [{ text: message }] });
      return parts;
    };

    async function callGeminiChat() {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
      const ctrl = new AbortController();
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: makeContents(),
          generationConfig: { maxOutputTokens: 512, temperature: 0.6, topP: 0.9 }
        }),
        signal: ctrl.signal
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`HTTP ${resp.status} ${resp.statusText}: ${txt}`);
      }
      const data = await resp.json();
      const text = (data?.candidates?.[0]?.content?.parts || [])
        .map(p => (typeof p === 'string' ? p : p.text || ''))
        .join('');
      if (!text) throw new Error('Empty model response');
      return text;
    }

    const reply = await callGeminiChat();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, reply })
    };
  } catch (err) {
    console.error('Chat function error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Chat failed', details: err.message })
    };
  }
};
