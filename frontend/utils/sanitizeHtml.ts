import DOMPurify from 'dompurify';

// Proprietes CSS conservees depuis l'editeur riche (couleur, police, alignement).
const SAFE_CSS = /^(color|background-color|background|font-size|font-family|font-weight|font-style|text-align|text-decoration)$/;

function keepSafeStyle(style: string): string {
  return style.split(';')
    .map((s) => s.trim())
    .filter((s) => SAFE_CSS.test(s.split(':')[0]?.trim().toLowerCase() || '') && !/url\s*\(|expression\s*\(/i.test(s))
    .join('; ');
}

let hooked = false;

/**
 * Nettoie le HTML affiche par v-html (blocs texte, lecteur public). Analyse par le
 * navigateur (DOMPurify) : les entites (`jav&#x61;script:`), attributs on*, balises
 * script/iframe/form... sont neutralises quelle que soit leur ecriture.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  if (!hooked) {
    DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
      if (data.attrName === 'style') {
        data.attrValue = keepSafeStyle(data.attrValue);
        if (!data.attrValue) data.keepAttr = false;
      }
    });
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      // Liens ouverts dans un nouvel onglet sans acces a la page d'origine.
      if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
        node.setAttribute('rel', 'noopener noreferrer');
      }
    });
    hooked = true;
  }
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select', 'iframe', 'object', 'embed', 'link', 'meta', 'base'],
    ADD_ATTR: ['target'],
  });
}
