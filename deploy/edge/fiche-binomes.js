#!/usr/bin/env node
/**
 * Fiche d'emargement des binomes d'une salle TEGS-Edge (pilote Fort-Liberte).
 *
 * Un compte par eleve, regroupes par deux sur chaque poste (poste 01 = eleves 1 et 2...).
 * Les PIN sont stockes haches (bcrypt) : impossible de les relire. Le script en genere
 * donc de NOUVEAUX pour toute la classe (les anciens cessent de fonctionner) et produit
 * une fiche imprimable (HTML) et un CSV, a garder confidentiels.
 *
 * A lancer contre le CLOUD (identifiants geres sur le cloud, 409 sur un noeud), avant la
 * seance : le noeud recoit les nouveaux PIN a son prochain pull (SYNC_INTERVAL_SECONDS).
 *
 * Usage :
 *   TEGS_API=https://tegs-backend-746425674533.us-central1.run.app/api \
 *   TEGS_EMAIL=prof@... TEGS_PASSWORD=... TEGS_TENANT_ID=<organisation> \
 *   node deploy/edge/fiche-binomes.js --classe <id ou CL-XXXX> [options]
 *
 * Options :
 *   --classe <id|code>      classe CRNS (code CL-XXXX : classes dont vous etes l'enseignant)
 *   --eleves <fichier.csv>  cree d'abord les eleves listes (prenom;nom ou prenom,nom par ligne)
 *   --binomes <n>           nombre de binomes attendu (defaut 20) : avertit si la classe differe
 *   --sortie <prefixe>      fichiers <prefixe>.html et <prefixe>.csv (defaut fiche-binomes-<code>)
 *   --oui                   ne pas demander confirmation avant de regenerer les PIN
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

function parseArgs(argv) {
  const args = { binomes: 20, oui: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--oui') args.oui = true;
    else if (['--classe', '--eleves', '--binomes', '--sortie'].includes(a)) args[a.slice(2)] = argv[++i];
    else throw new Error(`Option inconnue : ${a}`);
  }
  if (!args.classe) throw new Error('--classe <id ou CL-XXXX> est requis');
  args.binomes = Number(args.binomes);
  if (!Number.isInteger(args.binomes) || args.binomes < 1) throw new Error('--binomes : entier positif attendu');
  return args;
}

function env(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Variable d'environnement ${name} manquante`);
  return v;
}

async function api(base, method, route, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${route}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${route} -> HTTP ${res.status} : ${data.error || JSON.stringify(data)}`);
  return data;
}

function readStudentsCsv(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/)
    .map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
    .map((l, i) => {
      const [first, last] = l.split(/[;,]/).map((s) => (s || '').trim());
      if (!first || !last) throw new Error(`${file} ligne ${i + 1} : "prenom;nom" attendu`);
      return { first_name: first, last_name: last };
    });
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a.trim().toLowerCase()); }));
}

// Poste n = eleves 2n-1 et 2n (ordre alphabetique) ; un eleve seul en fin de liste garde son poste.
function pairUp(students) {
  const pairs = [];
  for (let i = 0; i < students.length; i += 2) pairs.push(students.slice(i, i + 2));
  return pairs;
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function renderHtml({ classroom, pairs, generatedAt }) {
  const rows = pairs.map((pair, i) => {
    const cells = [0, 1].map((k) => {
      const s = pair[k];
      return s
        ? `<td>${esc(s.last_name)} ${esc(s.first_name)}</td><td class="mono">${esc(s.matricule)}</td><td class="mono">${esc(s.pin)}</td><td class="sign"></td>`
        : '<td colspan="4" class="vide">-</td>';
    }).join('');
    return `<tr><td class="poste">${String(i + 1).padStart(2, '0')}</td>${cells}</tr>`;
  }).join('\n');
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Fiche des binômes - ${esc(classroom.name)}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 16mm; color: #111; }
  h1 { font-size: 18px; margin: 0 0 4px; } p { margin: 2px 0; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
  th, td { border: 1px solid #555; padding: 5px 6px; text-align: left; }
  th { background: #eee; } .mono { font-family: monospace; font-size: 13px; }
  .poste { text-align: center; font-weight: bold; } .sign { width: 18mm; } .vide { color: #999; text-align: center; }
  .alerte { margin-top: 8px; font-weight: bold; }
  @media print { body { margin: 8mm; } tr { page-break-inside: avoid; } }
</style></head><body>
<h1>Fiche d'émargement - ${esc(classroom.name)} (${esc(classroom.code)})</h1>
<p>Connexion sur chaque poste : <b>http://tegs.local</b>, onglet <b>Élève</b>, matricule + PIN.</p>
<p>Générée le ${esc(generatedAt)} - ${pairs.length} poste(s), ${pairs.flat().length} élève(s).</p>
<p class="alerte">Document confidentiel : les PIN ne sont affichés qu'ici. Les PIN précédents ne fonctionnent plus.</p>
<table>
<thead><tr><th>Poste</th><th>Élève A</th><th>Matricule</th><th>PIN</th><th>Signature</th><th>Élève B</th><th>Matricule</th><th>PIN</th><th>Signature</th></tr></thead>
<tbody>
${rows}
</tbody></table>
</body></html>
`;
}

function renderCsv(pairs) {
  const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const lines = ['poste;eleve;nom;prenom;matricule;pin'];
  pairs.forEach((pair, i) => pair.forEach((s, k) => {
    lines.push([String(i + 1).padStart(2, '0'), k === 0 ? 'A' : 'B', s.last_name, s.first_name, s.matricule, s.pin].map(q).join(';'));
  }));
  return `${lines.join('\n')}\n`;
}

function writePrivate(file, content) {
  fs.writeFileSync(file, content, { encoding: 'utf8', mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const base = env('TEGS_API').replace(/\/$/, '');
  const login = await api(base, 'POST', '/auth/login', {
    email: env('TEGS_EMAIL'), password: env('TEGS_PASSWORD'), tenant_id: process.env.TEGS_TENANT_ID || undefined,
  });
  const token = login.token;

  let classroomId = args.classe;
  if (/^CL-/i.test(args.classe)) {
    const { classrooms } = await api(base, 'GET', '/crns-classrooms', null, token);
    const found = classrooms.find((c) => c.code.toUpperCase() === args.classe.toUpperCase());
    if (!found) throw new Error(`Classe ${args.classe} introuvable parmi vos classes (passez son id si vous n'en etes pas l'enseignant)`);
    classroomId = found._id;
  }

  if (args.eleves) {
    const students = readStudentsCsv(args.eleves);
    const created = await api(base, 'POST', `/crns-classrooms/${classroomId}/students`, { students }, token);
    console.log(`${created.students.length} eleve(s) cree(s) dans ${created.classroom.name}.`);
  }

  const { classroom } = await api(base, 'GET', `/crns-classrooms/${classroomId}`, null, token);
  const count = (classroom.student_ids || []).length;
  if (count === 0) throw new Error('Classe vide : ajoutez des eleves (--eleves fichier.csv)');
  const expected = args.binomes * 2;
  console.log(`Classe ${classroom.name} (${classroom.code}) : ${count} eleve(s), soit ${Math.ceil(count / 2)} binome(s).`);
  if (count !== expected) console.warn(`ATTENTION : ${expected} eleves attendus pour ${args.binomes} binomes.`);

  if (!args.oui) {
    const answer = await ask(`Generer de NOUVEAUX PIN pour les ${count} eleves (les anciens cesseront de fonctionner) ? [o/N] `);
    if (answer !== 'o') { console.log('Annule : aucun PIN modifie.'); return; }
  }
  const { students } = await api(base, 'POST', `/crns-classrooms/${classroomId}/credentials`, {}, token);
  const pairs = pairUp(students);

  const prefix = args.sortie || `fiche-binomes-${classroom.code}`;
  const generatedAt = new Date().toLocaleString('fr-FR', { timeZone: 'America/Port-au-Prince' });
  writePrivate(`${prefix}.html`, renderHtml({ classroom, pairs, generatedAt }));
  writePrivate(`${prefix}.csv`, renderCsv(pairs));
  console.log(`Fiche : ${path.resolve(`${prefix}.html`)} (a imprimer)`);
  console.log(`CSV   : ${path.resolve(`${prefix}.csv`)}`);
  console.log('Le noeud de salle recoit les nouveaux PIN a son prochain pull : verifier /admin/edge avant la seance.');
}

if (require.main === module) {
  main().catch((err) => { console.error(`Erreur : ${err.message}`); process.exit(1); });
}

module.exports = { pairUp, renderCsv, renderHtml, readStudentsCsv };
