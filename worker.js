/**
 * ╔══════════════════════════════════════════════════════╗
 * ║          MANUEL SIGMA — Cloudflare Worker            ║
 * ║  Proxy sécurisé pour l'API Claude (Anthropic)        ║
 * ╚══════════════════════════════════════════════════════╝
 *
 * Ce fichier tourne sur les serveurs de Cloudflare.
 * Ta clé API Claude est stockée dans les variables
 * d'environnement (secrets) — personne ne peut la voir.
 *
 * Gratuit jusqu'à 100 000 requêtes/jour.
 */

// ⚠️  NE PAS mettre ta clé ici en dur !
// Elle est dans les secrets Cloudflare (voir README)
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

// Domaine de ton GitHub Pages — pour la sécurité CORS
// Ex : "https://tonpseudo.github.io"
// Mets "*" pendant les tests, puis restreins après
const ALLOWED_ORIGIN = '*';

export default {
  async fetch(request, env) {

    // Répondre aux preflight CORS (navigateurs font ça automatiquement)
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    // Refuser tout sauf POST
    if (request.method !== 'POST') {
      return corsResponse(JSON.stringify({ error: 'Méthode non autorisée' }), 405);
    }

    // Récupérer la clé API depuis les secrets Cloudflare
    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return corsResponse(JSON.stringify({ error: 'Clé API non configurée' }), 500);
    }

    // Lire le body envoyé par l'app
    let body;
    try {
      body = await request.json();
    } catch {
      return corsResponse(JSON.stringify({ error: 'Body JSON invalide' }), 400);
    }

    // Envoyer la requête à l'API Claude avec la vraie clé
    const response = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return corsResponse(JSON.stringify(data), response.status);
  }
};

// Ajoute les headers CORS à toutes les réponses
function corsResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
