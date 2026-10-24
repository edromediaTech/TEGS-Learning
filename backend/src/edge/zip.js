/**
 * Extraction minimale de zip (methodes store / deflate, sans zip64) pour les paquets
 * cmi5 produits par CRNS. Pas de dependance externe ; chemins valides (pas de "..",
 * de chemin absolu ni d'antislash) pour qu'un paquet ne puisse pas ecrire hors de sa cible.
 */
const fs = require('fs/promises');
const path = require('path');
const zlib = require('zlib');

const MAX_TOTAL_BYTES = 50 * 1024 * 1024;

function entries(buf) {
  // Fin du repertoire central : signature 0x06054b50, cherchee depuis la fin.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 0xffff); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('zip invalide : repertoire central introuvable');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const list = [];
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('zip invalide : entree centrale');
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const size = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    list.push({ name, method, compSize, size, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return list;
}

function safeName(name) {
  if (!name || name.includes('\\') || name.startsWith('/') || /^[a-zA-Z]:/.test(name)) return false;
  return !name.split('/').some((seg) => seg === '..');
}

/** Extrait le zip `buf` dans `destDir` ; renvoie la liste des fichiers ecrits. */
async function extractZip(buf, destDir) {
  const list = entries(buf);
  const total = list.reduce((a, e) => a + e.size, 0);
  if (total > MAX_TOTAL_BYTES) throw new Error(`zip trop volumineux (${total} octets)`);
  const written = [];
  for (const e of list) {
    if (e.name.endsWith('/')) continue;
    if (!safeName(e.name)) throw new Error(`chemin refuse dans le zip : ${e.name}`);
    const lh = e.localOffset;
    if (buf.readUInt32LE(lh) !== 0x04034b50) throw new Error(`zip invalide : en-tete local ${e.name}`);
    const start = lh + 30 + buf.readUInt16LE(lh + 26) + buf.readUInt16LE(lh + 28);
    const raw = buf.subarray(start, start + e.compSize);
    let data;
    if (e.method === 0) data = raw;
    else if (e.method === 8) data = zlib.inflateRawSync(raw);
    else throw new Error(`methode de compression non geree (${e.method}) : ${e.name}`);
    if (data.length !== e.size) throw new Error(`taille incoherente : ${e.name}`);
    const target = path.join(destDir, e.name);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, data);
    written.push(e.name);
  }
  return written;
}

module.exports = { extractZip };
