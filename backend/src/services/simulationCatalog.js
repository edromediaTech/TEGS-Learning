/**
 * Catalogue des simulations CRNS publiees (manifeste v2 sur GCS), pour la
 * synchronisation des noeuds TEGS-Edge. Chaque entree porte un paquet cmi5
 * autonome (package.url, package.sha256) produit par CRNS.
 *
 * CRNS_MANIFEST_URL : URL http(s) ou chemin local d'un manifest.json.
 */
const fs = require('fs/promises');

const DEFAULT_MANIFEST_URL =
  'https://storage.googleapis.com/crns-simulations-luminous/simulations/manifest.json';
const CACHE_MS = 60 * 1000;

let cache = { at: 0, url: '', simulations: [] };

async function loadManifest(url) {
  if (!/^https?:\/\//.test(url)) return JSON.parse(await fs.readFile(url, 'utf8'));
  const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`manifest ${res.status}`);
  return res.json();
}

/** Simulations publiees ; garde le dernier catalogue connu si GCS est injoignable. */
async function getSimulations() {
  const url = process.env.CRNS_MANIFEST_URL || DEFAULT_MANIFEST_URL;
  if (cache.url === url && Date.now() - cache.at < CACHE_MS) return cache.simulations;
  try {
    const manifest = await loadManifest(url);
    cache = { at: Date.now(), url, simulations: manifest.simulations || [] };
  } catch (err) {
    if (cache.url !== url) throw err;
    console.warn(`[edge] manifeste CRNS injoignable, catalogue en cache conserve : ${err.message}`);
  }
  return cache.simulations;
}

module.exports = { getSimulations };
