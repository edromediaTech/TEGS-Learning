/**
 * Service d'extraction de texte a partir de sources heterogenes.
 *
 * Supporte :
 *   - PDF texte (pdf-parse)
 *   - DOCX (mammoth)
 *   - Pages web (undici + cheerio)
 *
 * Les images et PDF scannes renvoient une erreur explicite — le gateway
 * IA actuel ne supporte pas la vision. Cette limite est documentee pour
 * que le frontend puisse afficher le message.
 */

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const cheerio = require('cheerio');
const { fetch: undiciFetch } = require('undici');

const MAX_CHARS = 60000;
const MAX_URL_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15000;

class ExtractionError extends Error {
  constructor(message, code = 'EXTRACTION_FAILED') {
    super(message);
    this.name = 'ExtractionError';
    this.code = code;
  }
}

function truncate(text) {
  if (!text) return '';
  const clean = String(text).replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (clean.length <= MAX_CHARS) return clean;
  return clean.slice(0, MAX_CHARS) + '\n\n[...texte tronque pour respecter la limite de traitement]';
}

async function extractFromPdf(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new ExtractionError('Le PDF est vide ou illisible.');
  }
  try {
    const result = await pdfParse(buffer);
    const text = (result.text || '').trim();
    if (text.length < 40) {
      throw new ExtractionError(
        'Impossible d\'extraire les donnees : la source est protegee ou illisible (PDF scanne ou image).',
        'SOURCE_UNREADABLE'
      );
    }
    return { text: truncate(text), meta: { pages: result.numpages, kind: 'pdf' } };
  } catch (err) {
    if (err instanceof ExtractionError) throw err;
    throw new ExtractionError(`Impossible de lire le PDF : ${err.message}`);
  }
}

async function extractFromDocx(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new ExtractionError('Le document Word est vide.');
  }
  try {
    const { value } = await mammoth.extractRawText({ buffer });
    const text = (value || '').trim();
    if (text.length < 20) {
      throw new ExtractionError(
        'Impossible d\'extraire les donnees : la source est protegee ou illisible.',
        'SOURCE_UNREADABLE'
      );
    }
    return { text: truncate(text), meta: { kind: 'docx' } };
  } catch (err) {
    if (err instanceof ExtractionError) throw err;
    throw new ExtractionError(`Impossible de lire le document Word : ${err.message}`);
  }
}

async function extractFromUrl(url) {
  if (!/^https?:\/\//i.test(url)) {
    throw new ExtractionError('L\'URL doit commencer par http:// ou https://.');
  }

  let response;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    response = await undiciFetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'TEGS-Learning/1.0 (knowledge-extractor)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.1',
      },
    });
    clearTimeout(timer);
  } catch (err) {
    throw new ExtractionError(
      `Impossible d'extraire les donnees : la source est protegee ou illisible (${err.message}).`,
      'SOURCE_UNREADABLE'
    );
  }

  if (!response.ok) {
    throw new ExtractionError(
      `Impossible d'extraire les donnees : la source est protegee ou illisible (HTTP ${response.status}).`,
      'SOURCE_UNREADABLE'
    );
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('text/html') && !contentType.includes('xml') && !contentType.includes('text/plain')) {
    throw new ExtractionError(
      'Type de contenu non supporte. Seules les pages HTML texte sont acceptees via URL.',
      'UNSUPPORTED_CONTENT'
    );
  }

  const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
  if (contentLength > MAX_URL_BYTES) {
    throw new ExtractionError('La page est trop volumineuse (limite 10 Mo).');
  }

  const html = await response.text();
  if (!html || html.length < 100) {
    throw new ExtractionError(
      'Impossible d\'extraire les donnees : la page est vide ou protegee.',
      'SOURCE_UNREADABLE'
    );
  }

  const $ = cheerio.load(html);
  $('script, style, noscript, iframe, nav, footer, header, aside, form, .mw-editsection, .navbox, .infobox, .sidebar, .reference, .references').remove();

  const title = $('title').first().text().trim() || $('h1').first().text().trim();
  const main = $('main, article, #content, #mw-content-text, .mw-parser-output').first();
  const root = main.length ? main : $('body');
  const text = root.text().replace(/\s+\n/g, '\n').replace(/\n\s+/g, '\n').replace(/[ \t]+/g, ' ').trim();

  if (text.length < 200) {
    throw new ExtractionError(
      'Impossible d\'extraire les donnees : la source est protegee ou illisible.',
      'SOURCE_UNREADABLE'
    );
  }

  return { text: truncate(text), meta: { kind: 'url', url, title } };
}

function rejectUnsupportedImage() {
  throw new ExtractionError(
    'Impossible d\'extraire les donnees : les images et PDF scannes ne sont pas encore supportes. Fournissez un PDF texte, un document Word ou une URL.',
    'UNSUPPORTED_MULTIMODAL'
  );
}

/**
 * Point d'entree unique. Decide quelle extraction faire selon le mime ou l'input.
 *
 * @param {object} source
 * @param {Buffer} [source.buffer] - Fichier upload
 * @param {string} [source.mimetype] - MIME type
 * @param {string} [source.originalname] - Nom original
 * @param {string} [source.url] - URL a scraper
 * @returns {{ text: string, meta: object }}
 */
async function extract(source) {
  if (!source) {
    throw new ExtractionError('Aucune source fournie.');
  }

  if (source.url) {
    return extractFromUrl(source.url);
  }

  if (!source.buffer || !Buffer.isBuffer(source.buffer)) {
    throw new ExtractionError('Aucun fichier recu.');
  }

  const mime = (source.mimetype || '').toLowerCase();
  const name = (source.originalname || '').toLowerCase();

  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    return extractFromPdf(source.buffer);
  }
  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  ) {
    return extractFromDocx(source.buffer);
  }
  if (mime.startsWith('image/')) {
    rejectUnsupportedImage();
  }
  if (mime === 'text/plain' || name.endsWith('.txt')) {
    const text = source.buffer.toString('utf-8').trim();
    if (text.length < 20) {
      throw new ExtractionError('Le fichier texte est vide ou illisible.', 'SOURCE_UNREADABLE');
    }
    return { text: truncate(text), meta: { kind: 'txt' } };
  }

  throw new ExtractionError(
    `Type de fichier non supporte : ${mime || 'inconnu'}. Formats acceptes : PDF texte, Word (.docx), .txt ou URL.`,
    'UNSUPPORTED_TYPE'
  );
}

module.exports = {
  extract,
  extractFromPdf,
  extractFromDocx,
  extractFromUrl,
  ExtractionError,
};
