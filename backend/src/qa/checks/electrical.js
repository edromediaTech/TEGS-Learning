/**
 * Integrite topologique et electrique : la chaine conductrice va sans interruption de la
 * borne amont a la borne aval, chaque liaison declaree est un contact physique (boites a la
 * tolerance pres, interrupteur ferme), l'interrupteur s'ouvre vraiment, et chaque fil est loge
 * dans sa cage sous sa vis.
 */
const { boxGap } = require('../gltfInspect');

const mm = (m) => Math.round(m * 10000) / 10;

function checkElectrical(manifest, glb, { report, stateOverrides }) {
  const el = manifest.electrical;
  const tol = el.tolerance_m ?? 0.0005;
  const conductors = el.conductors || {};
  const nodeOf = (id) => conductors[id];
  const err = (code, message, details) => report.errors.push({ code, message, details });

  // Noeuds declares presents dans le GLB.
  for (const [id, node] of Object.entries(conductors)) {
    if (!glb.names.has(node)) err('ERR_UNKNOWN_NODE', `conducteur « ${id} » : noeud ${node} absent du GLB`, { id, node });
  }
  const sw = el.switch;
  const edges = [...(el.links || [])];
  if (sw) edges.push([sw.fixed, sw.moving]);
  for (const [a, b] of edges) {
    for (const id of [a, b]) {
      if (!(id in conductors)) err('ERR_SCHEMA', `liaison ${a} - ${b} : conducteur « ${id} » non declare`, { link: [a, b] });
    }
  }

  // Conducteurs orphelins (relies a rien).
  const degree = Object.fromEntries(Object.keys(conductors).map((id) => [id, 0]));
  for (const [a, b] of edges) { if (a in degree) degree[a]++; if (b in degree) degree[b]++; }
  for (const [id, d] of Object.entries(degree)) {
    if (d === 0) err('ERR_OPEN_CIRCUIT', `conducteur orphelin « ${id} » : relie a aucun autre`, { id });
  }

  // Chemin attendu : bornes aux extremites, chaque pas est une liaison declaree.
  const path = el.path || [];
  const key = (a, b) => [a, b].sort().join('|');
  const edgeSet = new Set(edges.map(([a, b]) => key(a, b)));
  if (path[0] !== 'borne_amont' || path[path.length - 1] !== 'borne_aval') {
    err('ERR_SCHEMA', 'le chemin doit aller de « borne_amont » a « borne_aval »', { path });
  }
  for (let i = 0; i + 1 < path.length; i++) {
    if (!edgeSet.has(key(path[i], path[i + 1]))) {
      err('ERR_OPEN_CIRCUIT', `chaine interrompue entre « ${path[i]} » et « ${path[i + 1]} » (aucune liaison declaree)`,
        { from: path[i], to: path[i + 1] });
    }
  }

  // Atteignabilite amont -> aval dans le graphe (interrupteur ferme).
  const adj = new Map();
  for (const [a, b] of edges) {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a).push(b); adj.get(b).push(a);
  }
  const seen = new Set(['borne_amont']);
  const queue = ['borne_amont'];
  while (queue.length) for (const n of adj.get(queue.shift()) || []) if (!seen.has(n)) { seen.add(n); queue.push(n); }
  if (!seen.has('borne_aval')) err('ERR_OPEN_CIRCUIT', 'circuit ouvert : la borne aval n\'est pas reliee a la borne amont', {});

  // Contacts geometriques, interrupteur ferme.
  const closed = glb.boxes(stateOverrides(sw ? { [sw.actuator]: sw.closed_state } : {}));
  const gaps = [];
  for (const [a, b] of edges) {
    const ba = closed.get(nodeOf(a)); const bb = closed.get(nodeOf(b));
    if (!ba || !bb) continue;
    const gap = boxGap(ba, bb);
    gaps.push({ link: [a, b], gap_mm: mm(gap) });
    if (gap > tol) {
      err('ERR_OPEN_CIRCUIT', `intervalle sans contact entre « ${a} » et « ${b} » : ${mm(gap)} mm (tolerance ${mm(tol)} mm)`,
        { link: [a, b], gap_mm: mm(gap), state: sw?.closed_state });
    }
  }

  // L'interrupteur s'ouvre vraiment.
  if (sw) {
    const open = glb.boxes(stateOverrides({ [sw.actuator]: sw.open_state }));
    const bf = open.get(nodeOf(sw.fixed)); const bm = open.get(nodeOf(sw.moving));
    if (bf && bm) {
      const gap = boxGap(bf, bm);
      gaps.push({ link: [sw.fixed, sw.moving], gap_mm: mm(gap), state: sw.open_state });
      const min = sw.min_open_gap_m ?? 0.002;
      if (gap < min) {
        err('ERR_SWITCH_STUCK', `les contacts ne s'ouvrent pas assez en position « ${sw.open_state} » : ${mm(gap)} mm (minimum ${mm(min)} mm)`,
          { gap_mm: mm(gap), min_mm: mm(min) });
      }
    }
  }

  // Raccordements : fil dans la cage, sous la vis, prolonge par son cable.
  for (const c of el.connections || []) {
    const cage = closed.get(nodeOf(c.terminal));
    for (const [what, node, against, againstName] of [
      ['fil', c.wire, cage, nodeOf(c.terminal)],
      ['vis', c.screw, closed.get(c.wire), c.wire],
      ['cable', c.cable, closed.get(c.wire), c.wire],
    ]) {
      if (!node) continue;
      const b = closed.get(node);
      if (!b) { err('ERR_UNKNOWN_NODE', `raccordement ${c.terminal} : noeud ${node} absent du GLB`, { node }); continue; }
      if (!against) continue;
      const gap = boxGap(b, against);
      if (gap > tol) {
        err('ERR_CONNECTION', `raccordement ${c.terminal} : ${what} ${node} sans contact avec ${againstName} (${mm(gap)} mm)`,
          { terminal: c.terminal, node, against: againstName, gap_mm: mm(gap) });
      }
    }
  }

  report.metrics.links_checked = gaps.length;
  report.metrics.gaps = gaps;
}

module.exports = { checkElectrical };
