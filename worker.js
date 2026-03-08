export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
    }
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Methode non autorisee' }), { status: 405, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
    const apiKey = env.GROQ_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Cle API manquante' }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }
    let body;
    try { body = await request.json(); } catch { return new Response(JSON.stringify({ error: 'JSON invalide' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }); }
    const messages = [];
    if (body.system) messages.push({ role: 'system', content: body.system });
    if (body.messages) for (const m of body.messages) messages.push({ role: m.role, content: m.content });
    const groqBody = { model: 'llama-3.1-8b-instant', max_tokens: body.max_tokens || 1000, messages: messages };
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey }, body: JSON.stringify(groqBody) });
    const data = await response.json();
    let result;
    if (data.choices && data.choices[0]) { result = { content: [{ type: 'text', text: data.choices[0].message.content }] }; }
    else { result = { error: 'Erreur Groq' }; }
    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
};
