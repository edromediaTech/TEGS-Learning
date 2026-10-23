// Scoring auto du rapport de diagnostic ecrit par l'eleve.
// Compare les mots-cles significatifs du `diagnostic_hint` du composant
// reellement defaillant avec le texte rendu par l'eleve.
// Bareme v1 :
//   - Bon composant identifie : 60 pts
//   - Justification (matching keywords) : jusqu'a 40 pts
// Total /100. Partial credit possible meme si composant errone.

const STOPWORDS_FR = new Set([
  'le', 'la', 'les', 'un', 'une', 'de', 'du', 'des', 'et', 'ou', 'a',
  'au', 'aux', 'dans', 'sur', 'par', 'pour', 'avec', 'ce', 'cette', 'ces',
  'son', 'sa', 'ses', 'leur', 'leurs', 'je', 'tu', 'il', 'elle', 'on',
  'nous', 'vous', 'ils', 'elles', 'est', 'sont', 'ont', 'pas', 'plus',
  'mais', 'donc', 'alors', 'comme', 'si', 'que', 'qui', 'quoi', 'dont',
  'cas', 'tout', 'tous', 'toute', 'toutes', 'meme', 'memes', 'aussi',
  'tres', 'bien', 'mal', 'sans', 'sous', 'jusqu', 'apres', 'avant',
  'puis', 'ainsi', 'cela', 'ceci', 'voici', 'voila', 'parfois', 'souvent',
  'toujours', 'jamais', 'beaucoup', 'peu', 'assez', 'trop', 'plutot',
  'cependant', 'pourtant', 'sinon', 'soit', 'doit', 'peut', 'fait',
  'faire', 'etre', 'avoir', 'voir', 'savoir', 'falloir',
  // FR contractions cleaned
  'qu', 'd', 'l', 's', 'n', 'm', 't', 'c', 'j',
]);

/** Normalise une chaine FR : lowercase + sans accents + tokens sans stopwords. */
export function tokenize(text: string): string[] {
  if (!text) return [];
  const norm = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .replace(/[''-]/g, ' ');
  return norm
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS_FR.has(w));
}

export interface DiagnosticScore {
  componentCorrect: boolean;
  componentScore: number;        // 0 ou 60
  reportRatio: number;           // 0..1 keyword match
  reportScore: number;           // 0..40
  matchedKeywords: string[];
  expectedKeywords: string[];
  total: number;                 // 0..100
}

export function gradeDiagnostic(
  componentCorrect: boolean,
  reportText: string,
  hint: string | null,
): DiagnosticScore {
  const COMPONENT_WEIGHT = 60;
  const REPORT_WEIGHT = 40;

  const componentScore = componentCorrect ? COMPONENT_WEIGHT : 0;

  const expectedTokens = Array.from(new Set(tokenize(hint || '')));
  const reportTokens = new Set(tokenize(reportText || ''));

  const matched: string[] = [];
  for (const t of expectedTokens) {
    if (reportTokens.has(t)) matched.push(t);
  }

  const reportRatio = expectedTokens.length > 0 ? matched.length / expectedTokens.length : 0;
  const reportScore = Math.round(reportRatio * REPORT_WEIGHT);

  return {
    componentCorrect,
    componentScore,
    reportRatio,
    reportScore,
    matchedKeywords: matched,
    expectedKeywords: expectedTokens,
    total: componentScore + reportScore,
  };
}
