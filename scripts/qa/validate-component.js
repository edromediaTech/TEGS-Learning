#!/usr/bin/env node
/**
 * Linter 3D des composants CRNS (verrou QA n°1), en ligne de commande.
 *
 *   node scripts/qa/validate-component.js <dossier | component.json> [--json] [--budget-polygons N]
 *
 * Le dossier contient component.json (crns-component/1) et le GLB qu'il designe (model.file).
 * Code de sortie : 0 = aucune erreur bloquante (CI_PASSED possible), 1 = erreurs, 2 = usage.
 * La logique vit dans backend/src/qa/ : le serveur l'execute lui-meme au depot d'un composant.
 */
const fs = require('fs');
const path = require('path');
const { validateComponent } = require('../../backend/src/qa/validateComponent');

function usage(message) {
  if (message) console.error(`Erreur : ${message}`);
  console.error('Usage : node scripts/qa/validate-component.js <dossier | component.json> [--json] [--budget-polygons N]');
  process.exit(2);
}

const args = process.argv.slice(2);
const json = args.includes('--json');
const budget = {};
const bi = args.indexOf('--budget-polygons');
if (bi >= 0) budget.polygons = Number(args[bi + 1]);
const target = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--budget-polygons');
if (!target) usage();

const manifestPath = fs.existsSync(target) && fs.statSync(target).isDirectory() ? path.join(target, 'component.json') : target;
if (!fs.existsSync(manifestPath)) usage(`${manifestPath} introuvable`);
let manifest;
try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch (e) { usage(`manifeste illisible : ${e.message}`); }
const glbPath = path.join(path.dirname(manifestPath), manifest.model?.file || 'component.glb');
if (!fs.existsSync(glbPath)) usage(`${glbPath} introuvable`);

const report = validateComponent({ manifest, glb: fs.readFileSync(glbPath), budget });

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Composant ${report.component} ${report.version} : ${report.ok ? 'CONFORME (CI_PASSED)' : 'NON CONFORME (reste DRAFT)'}`);
  const m = report.metrics;
  if (m.triangles !== undefined) {
    console.log(`  ${m.triangles} polygones / ${m.budget.polygons}, textures max ${m.max_texture_px} px, Draco ${m.draco ? 'oui' : 'NON'}, ${m.links_checked ?? 0} contacts verifies`);
  }
  for (const e of report.errors) console.log(`  [${e.code}] ${e.message}`);
  for (const w of report.warnings) console.log(`  (avertissement) [${w.code}] ${w.message}`);
}
process.exit(report.ok ? 0 : 1);
