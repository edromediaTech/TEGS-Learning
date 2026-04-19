const { defineTool } = require('./_baseTool');
const { callAIGateway } = require('../../services/aiGateway');
const { extract, ExtractionError } = require('../../services/knowledgeExtractor');

/**
 * Outil MUTATION : Generer une banque de questions (ou une structure de
 * formulaire) a partir d'un document ou d'une URL.
 *
 * Deux modes :
 *   - DATA : extrait des faits et les convertit en questions pedagogiques
 *   - STRUCTURE : detecte les champs necessaires (input, select, date) pour
 *     reproduire un formulaire
 *
 * Retourne toujours un PROPOSAL : l'admin doit editer puis confirmer avant
 * que le Module brouillon soit cree.
 */

const PROMPT_DATA = `Tu es un concepteur pedagogique expert. Transforme le contenu fourni en {count} questions {qtype} en francais.
Reponds UNIQUEMENT par un objet JSON valide sans texte avant ni apres, avec la forme suivante :
{
  "title": "Titre court du quiz deduit du contenu",
  "questions": [
    {
      "type": "quiz" | "true_false" | "open_answer",
      "prompt": "enonce de la question",
      "options": ["option A", "option B", "option C", "option D"],
      "correctIndex": 0,
      "explanation": "justification basee sur le texte"
    }
  ]
}
Pour "quiz" : fournis exactement {optionCount} options et un seul correctIndex.
Pour "true_false" : options ["Vrai", "Faux"] et correctIndex 0 ou 1.
Pour "open_answer" : options vides [] et correctIndex 0, ajoute la reponse attendue dans "explanation".
Ne fabrique aucun fait absent du texte. Si le texte ne suffit pas, genere moins de questions.`;

const PROMPT_STRUCTURE = `Tu es un analyste de formulaires. A partir du document fourni, detecte les champs a inclure dans un formulaire.
Reponds UNIQUEMENT par un objet JSON valide, sans texte avant ni apres :
{
  "title": "Titre du formulaire",
  "fields": [
    { "label": "Nom du champ", "type": "text" | "email" | "number" | "date" | "select" | "textarea", "required": true|false, "options": [] }
  ]
}
Pour "select" uniquement, remplis "options" avec les valeurs possibles. Sinon laisse un tableau vide.`;

function safeJsonParse(text) {
  if (!text) return null;
  const trimmed = String(text).trim();

  let candidate = trimmed;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) candidate = fenced[1].trim();

  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
  const jsonStr = candidate.slice(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function normalizeQuestions(raw, desiredCount, optionCount) {
  if (!raw || !Array.isArray(raw.questions)) return { title: raw?.title || '', questions: [] };
  const questions = raw.questions.slice(0, desiredCount).map((q, i) => {
    const type = ['quiz', 'true_false', 'open_answer'].includes(q.type) ? q.type : 'quiz';
    let options = Array.isArray(q.options) ? q.options.map((o) => String(o)) : [];
    let correctIndex = Number.isInteger(q.correctIndex) ? q.correctIndex : 0;

    if (type === 'true_false') {
      options = ['Vrai', 'Faux'];
      if (correctIndex !== 0 && correctIndex !== 1) correctIndex = 0;
    } else if (type === 'quiz') {
      if (options.length < 2) {
        options = ['Option A', 'Option B', 'Option C', 'Option D'].slice(0, optionCount);
      }
      if (options.length > optionCount) options = options.slice(0, optionCount);
      if (correctIndex < 0 || correctIndex >= options.length) correctIndex = 0;
    } else {
      options = [];
      correctIndex = 0;
    }

    return {
      order: i,
      type,
      prompt: String(q.prompt || '').trim() || `Question ${i + 1}`,
      options,
      correctIndex,
      explanation: String(q.explanation || '').trim(),
    };
  });
  return { title: String(raw.title || '').trim(), questions };
}

function normalizeFields(raw) {
  if (!raw || !Array.isArray(raw.fields)) return { title: raw?.title || '', fields: [] };
  const allowed = ['text', 'email', 'number', 'date', 'select', 'textarea'];
  const fields = raw.fields.slice(0, 50).map((f, i) => ({
    order: i,
    label: String(f.label || '').trim() || `Champ ${i + 1}`,
    type: allowed.includes(f.type) ? f.type : 'text',
    required: Boolean(f.required),
    options: Array.isArray(f.options) ? f.options.map((o) => String(o)) : [],
  }));
  return { title: String(raw.title || '').trim(), fields };
}

module.exports = defineTool({
  id: 'knowledgeToForm',
  name: 'Generer un quiz depuis un document',
  description:
    'Transforme un document (PDF, Word, URL) en banque de questions ou en structure de formulaire. Retourne une proposition editable avant enregistrement en base.',
  parameters: {
    type: 'object',
    properties: {
      source: {
        type: 'object',
        description: 'Source du contenu. Fournir soit url, soit buffer via la route /analyze.',
        properties: {
          url: { type: 'string', description: 'URL publique a analyser' },
          mimetype: { type: 'string' },
          originalname: { type: 'string' },
        },
      },
      extractionMode: {
        type: 'string',
        enum: ['DATA', 'STRUCTURE'],
        description: 'DATA = generer des questions ; STRUCTURE = detecter les champs du formulaire.',
      },
      questionCount: { type: 'number', description: 'Nombre de questions voulu (1-20, defaut 10)' },
      questionType: {
        type: 'string',
        enum: ['quiz', 'true_false', 'open_answer', 'mixed'],
        description: 'Type de questions souhaite (defaut: quiz QCM).',
      },
      optionCount: { type: 'number', description: 'Nombre d\'options par QCM (2-6, defaut 4).' },
      targetType: {
        type: 'string',
        enum: ['module_draft', 'tournament_draft'],
        description: 'Ou enregistrer le resultat apres confirmation.',
      },
      targetTitle: { type: 'string', description: 'Titre a donner au brouillon (optionnel).' },
    },
    required: ['extractionMode'],
  },
  requiredRoles: ['admin_ddene', 'superadmin'],
  isMutation: true,

  async execute(args, context) {
    const {
      source = {},
      extractionMode = 'DATA',
      questionCount = 10,
      questionType = 'quiz',
      optionCount = 4,
      targetType = 'module_draft',
      targetTitle = '',
    } = args;

    const count = Math.max(1, Math.min(20, Number(questionCount) || 10));
    const opts = Math.max(2, Math.min(6, Number(optionCount) || 4));

    // 1. Extraction du texte
    let extracted;
    try {
      extracted = await extract(source);
    } catch (err) {
      if (err instanceof ExtractionError) {
        return { error: err.message };
      }
      throw err;
    }

    // 2. Appel IA
    let prompt;
    if (extractionMode === 'STRUCTURE') {
      prompt = `${PROMPT_STRUCTURE}\n\n--- CONTENU ---\n${extracted.text}`;
    } else {
      const qtypeLabel = questionType === 'mixed' ? 'variees (QCM, Vrai/Faux, ouvertes)' : {
        quiz: 'QCM',
        true_false: 'Vrai/Faux',
        open_answer: 'ouvertes',
      }[questionType] || 'QCM';
      prompt = PROMPT_DATA
        .replace('{count}', count)
        .replace('{qtype}', qtypeLabel)
        .replace('{optionCount}', opts) + `\n\n--- CONTENU ---\n${extracted.text}`;
    }

    const aiText = await callAIGateway(prompt, 'generate', context.tenantId, {
      max_tokens: 4000,
      temperature: 0.3,
      preferred_model: 'gemini-1.5-pro',
    });

    if (typeof aiText === 'string' && aiText.startsWith('[Erreur IA')) {
      return { error: `Le moteur de reponse n'a pas pu traiter le document : ${aiText}` };
    }
    if (typeof aiText === 'string' && aiText.startsWith('[IA non disponible')) {
      return { error: 'Le moteur de reponse n\'est pas configure. Contactez l\'administrateur technique.' };
    }

    const parsed = safeJsonParse(aiText);
    if (!parsed) {
      return { error: 'Le moteur de reponse a produit une sortie illisible. Reessayez avec un texte plus court ou une URL plus simple.' };
    }

    // 3. Normalisation
    if (extractionMode === 'STRUCTURE') {
      const normalized = normalizeFields(parsed);
      const displayTitle = targetTitle.trim() || normalized.title || 'Formulaire genere';
      if (normalized.fields.length === 0) {
        return { error: 'Aucun champ de formulaire detecte dans le document.' };
      }
      const summary = `Formulaire "${displayTitle}" — ${normalized.fields.length} champ(s) detecte(s)`;
      return {
        summary,
        actionData: {
          targetType,
          mode: 'STRUCTURE',
          title: displayTitle,
          fields: normalized.fields,
          sourceMeta: extracted.meta,
        },
        details: {
          mode: 'Structure de formulaire',
          source: extracted.meta.kind + (extracted.meta.url ? ` (${extracted.meta.url})` : ''),
          champs: normalized.fields.length,
          types: [...new Set(normalized.fields.map((f) => f.type))],
        },
      };
    }

    // DATA mode
    const normalized = normalizeQuestions(parsed, count, opts);
    if (normalized.questions.length === 0) {
      return { error: 'Aucune question n\'a pu etre generee a partir de ce contenu.' };
    }
    const displayTitle = targetTitle.trim() || normalized.title || 'Quiz genere';
    const summary = `Quiz "${displayTitle}" — ${normalized.questions.length} question(s) generee(s)`;

    return {
      summary,
      actionData: {
        targetType,
        mode: 'DATA',
        title: displayTitle,
        questions: normalized.questions,
        sourceMeta: extracted.meta,
      },
      details: {
        mode: 'Questions pedagogiques',
        source: extracted.meta.kind + (extracted.meta.url ? ` (${extracted.meta.url})` : ''),
        questions: normalized.questions.length,
        types: [...new Set(normalized.questions.map((q) => q.type))],
        cible: targetType === 'tournament_draft' ? 'Tournoi brouillon' : 'Module brouillon',
      },
    };
  },
});
