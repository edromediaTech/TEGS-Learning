/**
 * Continuite cinematique : tout organe qui bouge est un actionneur declare ou une piece
 * entrainee par un actionneur (enfant dans le GLB, ou dependance declaree), et l'actionneur
 * de l'interrupteur entraine bien le contact mobile. Interdit la manette « dans le vide ».
 */
function checkKinematics(manifest, glb, { report }) {
  const k = manifest.kinematics || {};
  const err = (code, message, details) => report.errors.push({ code, message, details });
  const warn = (code, message, details) => report.warnings.push({ code, message, details });
  const actuators = new Map((k.actuators || []).map((a) => [a.id, a]));

  for (const a of actuators.values()) {
    if (!glb.names.has(a.node)) err('ERR_UNKNOWN_NODE', `actionneur « ${a.id} » : noeud ${a.node} absent du GLB`, { actuator: a.id });
    if (!['rotation', 'translation'].includes(a.type)) err('ERR_SCHEMA', `actionneur « ${a.id} » : type ${a.type} inconnu`, { actuator: a.id });
    const states = Object.keys(a.states || {});
    if (states.length < 2) err('ERR_SCHEMA', `actionneur « ${a.id} » : au moins deux etats attendus`, { actuator: a.id });
    if (a.initial && !states.includes(a.initial)) err('ERR_SCHEMA', `actionneur « ${a.id} » : etat initial ${a.initial} inconnu`, { actuator: a.id });
  }

  // Pieces entrainees : lien formalise et reel.
  const drivenBy = new Map();
  for (const d of k.driven || []) {
    const a = actuators.get(d.by);
    if (!a) { err('ERR_KINEMATIC_CHAIN', `piece ${d.node} : actionneur « ${d.by} » non declare`, { node: d.node }); continue; }
    if (!glb.names.has(d.node)) { err('ERR_UNKNOWN_NODE', `piece entrainee ${d.node} absente du GLB`, { node: d.node }); continue; }
    if (d.link === 'child' && !glb.isDescendant(d.node, a.node)) {
      err('ERR_KINEMATIC_CHAIN', `piece ${d.node} declaree enfant de ${a.node} mais independante dans le GLB : elle ne suivrait pas l'actionneur`,
        { node: d.node, actuator: a.id });
      continue;
    }
    if (!['child', 'declared'].includes(d.link)) err('ERR_SCHEMA', `piece ${d.node} : lien ${d.link} inconnu (child | declared)`, { node: d.node });
    drivenBy.set(d.node, a.id);
  }

  // L'actionneur de l'interrupteur entraine le contact mobile.
  const sw = manifest.electrical?.switch;
  if (sw) {
    const a = actuators.get(sw.actuator);
    const moving = manifest.electrical.conductors?.[sw.moving];
    if (!a) err('ERR_KINEMATIC_CHAIN', `interrupteur : actionneur « ${sw.actuator} » non declare`, {});
    else if (moving !== a.node && drivenBy.get(moving) !== a.id) {
      err('ERR_KINEMATIC_CHAIN', `l'actionneur « ${a.id} » (${a.node}) n'entraine pas le contact mobile ${moving} : il tournerait dans le vide`,
        { actuator: a.id, moving });
    }
    for (const st of [sw.closed_state, sw.open_state]) {
      if (a && !(st in (a.states || {}))) err('ERR_SCHEMA', `interrupteur : etat « ${st} » absent de l'actionneur ${a.id}`, {});
    }
  }

  // Tout organe anime par le TP est declare.
  const ia = manifest.interaction || {};
  const animated = new Set([
    ...Object.values(ia.pickable || {}),
    ...(ia.faults || []).map((f) => f.actuator),
    ...(ia.trip ? [ia.trip.actuator] : []),
  ]);
  for (const id of animated) {
    if (!actuators.has(id)) err('ERR_KINEMATIC_CHAIN', `le TP anime « ${id} » sans actionneur declare`, { actuator: id });
  }

  // Enfants d'actionneur non declares : ils bougent, le manifeste doit le dire.
  for (const a of actuators.values()) {
    const idx = glb.names.get(a.node);
    for (const c of glb.json.nodes[idx]?.children || []) {
      const name = glb.json.nodes[c].name;
      if (name && !drivenBy.has(name)) warn('WARN_UNDECLARED_DRIVEN', `${name} suit ${a.node} (enfant) sans etre declare dans kinematics.driven`, { node: name });
    }
  }
}

module.exports = { checkKinematics };
