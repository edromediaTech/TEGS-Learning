/**
 * Identifiants eleves TEGS-Edge (E4) : matricule + PIN, distribues par l'enseignant.
 *
 * - Matricule : 8 caracteres lisibles groupes par 4 (ex. K7QM-3P9X), unique dans
 *   l'etablissement, sans caracteres ambigus (0/O, 1/I/L).
 * - PIN : 6 chiffres, montre une seule fois a l'enseignant, stocke hache (bcrypt 12).
 *   L'empreinte part sur les noeuds edge : verrouillage apres echecs repetes et
 *   chiffrement du disque du noeud limitent le risque d'attaque hors ligne.
 */
const crypto = require('crypto');
const User = require('../models/User');
const hashPool = require('./hashPool');

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const PIN_LENGTH = 6;
const BCRYPT_COST = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

function randomMatricule() {
  let s = '';
  for (let i = 0; i < 8; i++) s += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

function randomPin() {
  return String(crypto.randomInt(10 ** PIN_LENGTH)).padStart(PIN_LENGTH, '0');
}

async function uniqueMatricule(tenantId) {
  for (let i = 0; i < 10; i++) {
    const m = randomMatricule();
    if (!(await User.exists({ tenant_id: tenantId, matricule: m }))) return m;
  }
  throw new Error('Impossible de generer un matricule unique');
}

/**
 * Attribue un matricule (s'il manque) et un nouveau PIN a l'eleve, deverrouille le compte.
 * Renvoie le PIN en clair : a montrer une seule fois.
 */
async function issueCredentials(user) {
  if (!user.matricule) user.matricule = await uniqueMatricule(user.tenant_id);
  const pin = randomPin();
  user.pin_hash = await hashPool.hash(pin, BCRYPT_COST);
  user.pin_set_at = new Date();
  user.pin_failed_attempts = 0;
  user.pin_locked_until = undefined;
  await user.save();
  return { matricule: user.matricule, pin };
}

/**
 * Cree un compte eleve sans e-mail ni mot de passe utilisables (connexion par PIN).
 * Les champs requis du modele recoivent des valeurs techniques non communiquees.
 */
async function createStudent({ firstName, lastName, tenantId }) {
  const matricule = await uniqueMatricule(tenantId);
  const user = new User({
    firstName,
    lastName,
    role: 'student',
    tenant_id: tenantId,
    matricule,
    email: `${matricule.toLowerCase()}@eleves.tegslearning.local`,
    password: crypto.randomBytes(24).toString('base64url'),
  });
  const { pin } = await issueCredentials(user);
  return { user, pin };
}

module.exports = {
  PIN_LENGTH, MAX_FAILED_ATTEMPTS, LOCK_MINUTES, issueCredentials, createStudent,
};
