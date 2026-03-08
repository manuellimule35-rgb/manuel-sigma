const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const ALLOWED_ORIGIN = '*';

export default {
  async fetch(request, env) {

    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    const url = new URL(request.url);

    if (request.method === 'GET' && url.searchParams.has('rss')) {
      const feedUrl = url.searchParams.get('rss');
      if (!feedUrl || !feedUrl.startsWith('https://')) {
        return rssResponse('', 400);
      }
      try {
        const resp = await fetch(feedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ManuelSigmaBot/1.0)',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          },
          cf: { cacheTtl: 600 }
        });
        const text = await resp.text();
        return rssResponse(text, resp.status);
      } catch (e) {
        return rssResponse('', 502);
      }
    }

    if (request.method !== 'POST') {
      return corsResponse(JSON.stringify({ error: 'Methode non autorisee' }), 405);
    }

    const apiKey = env.GROQ_API_KEY;
    if (!apiKey) {
      return corsResponse(JSON.stringify({ error: 'Cle API non configuree' }), 500);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return corsResponse(JSON.stringify({ error: 'Body JSON invalide' }), 400);
    }

    const messages = [];
    if (body.system) {
      messages.push({ role: 'system', content: body.system });
    }
    if (body.messages) {
      for (const msg of body.messages) {
        const content = Array.isArray(msg.content)
          ? msg.content.map(p => p.text || '').join('')
          : msg.content;
        messages.push({ role: msg.role, content });
      }
    }

    const groqBody = {
      model: GROQ_MODEL,
      messages,
      max_tokens: body.max_tokens || 1024,
      temperature: 0.7,
    };

    const response = await fetch(GROQ_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(groqBody),
    });

    const groqData = await response.json();

    const anthropicFormat = {
      id: groqData.id || 'groq-response',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: groqData.choices?.[0]?.message?.content || 'Erreur' }],
      model: GROQ_MODEL,
      stop_reason: 'end_turn',
      usage: {
        input_tokens: groqData.usage?.prompt_tokens || 0,
        output_tokens: groqData.usage?.completion_tokens || 0,
      }
    };

    return corsResponse(JSON.stringify(anthropicFormat), response.status);
  }
};

function corsResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function rssResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cache-Control': 'public, max-age=600',
    },
  });
}
