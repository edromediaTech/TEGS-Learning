/**
 * Service partage pour communiquer avec dp-ai-gateway-service.
 *
 * Remplace les copies dupliquees dans modules.js et reporting.js.
 * Ajoute callAIGatewayWithTools() pour le function calling agentique.
 */

const GATEWAY_URL_DEFAULT = 'https://dp-ai-gateway-service-746425674533.us-central1.run.app';

/**
 * Parse la reponse brute du gateway (plusieurs formats possibles).
 */
function extractGatewayText(data) {
  // Gateway wraps in { success, data: { response: "..." } }
  const inner = data.data || data;
  const text = inner.response || inner.text || inner.content || inner.result || inner.output || data.response || '';
  if (typeof text === 'object') return JSON.stringify(text);
  return text;
}

/**
 * Appel simple au gateway IA (generation de texte).
 *
 * @param {string} prompt - Le prompt a envoyer
 * @param {string} taskType - Type de tache ('generate', 'extract', 'classify')
 * @param {string} tenantId - ID du tenant (pour tracking)
 * @param {object} options - Options optionnelles { max_tokens, temperature, preferred_model }
 * @returns {string} Texte genere ou message d'erreur
 */
async function callAIGateway(prompt, taskType, tenantId, options = {}) {
  const gatewayUrl = process.env.AI_GATEWAY_URL || GATEWAY_URL_DEFAULT;
  const gatewayToken = process.env.GATEWAY_AUTH_TOKEN;

  if (!gatewayToken) {
    console.warn('[AI-GATEWAY] GATEWAY_AUTH_TOKEN not set — returning placeholder');
    return '[IA non disponible — configurez GATEWAY_AUTH_TOKEN]';
  }

  try {
    const response = await fetch(`${gatewayUrl}/api/ai-gateway`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${gatewayToken}`,
      },
      body: JSON.stringify({
        prompt,
        task_type: taskType,
        preferred_tier: options.preferred_tier || 'auto',
        preferred_model: options.preferred_model || 'gemini-2.0-flash',
        service_id: 'tegs-learning',
        user_id: String(tenantId),
        max_tokens: options.max_tokens || 4000,
        temperature: options.temperature ?? 0.7,
        language: 'fr',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gateway ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return extractGatewayText(data);
  } catch (err) {
    console.error('[AI-GATEWAY] Error:', err.message);
    return `[Erreur IA: ${err.message}]`;
  }
}

/**
 * Appel au gateway avec des definitions d'outils embarquees dans le system prompt.
 *
 * Le modele Gemini recoit les schemas d'outils dans le prompt et repond soit
 * en texte libre, soit avec un bloc JSON tool_call.
 *
 * @param {string} systemPrompt - Instructions systeme (incluant les schemas tools)
 * @param {Array<{role: string, content: string}>} messages - Historique de conversation
 * @param {string} tenantId - ID du tenant
 * @param {object} options - { max_tokens, temperature }
 * @returns {{ text: string, toolCall: object|null }} Reponse parsee
 */
async function callAIGatewayWithTools(systemPrompt, messages, tenantId, options = {}) {
  // Construire le prompt complet : system + historique
  const conversationParts = messages.map((m) => {
    const prefix = m.role === 'user' ? 'UTILISATEUR' : m.role === 'tool_result' ? 'RESULTAT_OUTIL' : 'ASSISTANT';
    return `${prefix}: ${m.content}`;
  });

  const fullPrompt = `${systemPrompt}\n\n--- CONVERSATION ---\n${conversationParts.join('\n')}\n\nASSISTANT:`;

  const rawText = await callAIGateway(fullPrompt, 'generate', tenantId, {
    max_tokens: options.max_tokens || 4000,
    temperature: options.temperature ?? 0.4,
  });

  // Tenter d'extraire un bloc tool_call JSON de la reponse
  const toolCall = parseToolCall(rawText);

  return {
    text: toolCall ? rawText.replace(toolCall._rawMatch, '').trim() : rawText,
    toolCall: toolCall ? { name: toolCall.name, arguments: toolCall.arguments } : null,
  };
}

/**
 * Parse un bloc tool_call JSON dans la reponse du LLM.
 * Formats reconnus :
 *   {"tool_call": {"name": "...", "arguments": {...}}}
 *   ```json\n{"tool_call": ...}\n```
 */
function parseToolCall(text) {
  if (!text || typeof text !== 'string') return null;

  // Chercher un bloc JSON contenant tool_call
  const patterns = [
    /```json\s*(\{[\s\S]*?"tool_call"[\s\S]*?\})\s*```/,
    /(\{"tool_call"\s*:\s*\{[\s\S]*?\}\s*\})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.tool_call && parsed.tool_call.name) {
          return {
            name: parsed.tool_call.name,
            arguments: parsed.tool_call.arguments || {},
            _rawMatch: match[0],
          };
        }
      } catch {
        // JSON malformed, ignorer
      }
    }
  }

  return null;
}

module.exports = {
  callAIGateway,
  callAIGatewayWithTools,
  parseToolCall,
};
