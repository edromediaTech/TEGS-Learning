/**
 * Lecture d'un GLB pour le linter QA des composants 3D (sans WebGL ni decodage Draco).
 *
 * Le format glTF impose min/max sur l'accesseur POSITION de chaque primitive, meme
 * compressee en Draco : la boite englobante locale de chaque maillage est donc connue sans
 * decoder la geometrie. Combinee aux transformations des noeuds (avec, au besoin, un etat
 * d'actionneur impose), elle donne des boites dans le repere du composant, suffisantes pour
 * verifier contacts, ecarts et pieces flottantes a la tolerance pres.
 */

const GLB_MAGIC = 0x46546c67;
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;

function parseGlb(buffer) {
  if (buffer.length < 20 || buffer.readUInt32LE(0) !== GLB_MAGIC) throw new Error('fichier GLB invalide (signature)');
  let offset = 12;
  let json = null;
  let bin = null;
  while (offset < buffer.length) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === CHUNK_JSON) json = JSON.parse(data.toString('utf8'));
    else if (type === CHUNK_BIN) bin = data;
    offset += 8 + length;
  }
  if (!json) throw new Error('fichier GLB invalide (pas de bloc JSON)');
  return { json, bin };
}

// --- Matrices 4x4 en colonnes (convention glTF) ---
function compose(t = [0, 0, 0], q = [0, 0, 0, 1], s = [1, 1, 1]) {
  const [x, y, z, w] = q;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  return [
    (1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0,
    (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0,
    (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0,
    t[0], t[1], t[2], 1,
  ];
}

function multiply(a, b) {
  const out = new Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return out;
}

function apply(m, p) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ];
}

function axisAngleQuat(axis, deg) {
  const half = (deg * Math.PI) / 360;
  const s = Math.sin(half);
  const v = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }[axis];
  if (!v) throw new Error(`axe inconnu : ${axis}`);
  return [v[0] * s, v[1] * s, v[2] * s, Math.cos(half)];
}

/**
 * Inspecte un GLB. Retourne un objet avec :
 *  - names : Map nom -> index de noeud ; parentOf : index -> index parent
 *  - boxes(overrides) : Map nom -> {min, max} dans le repere du composant ;
 *    overrides : { [nomNoeud]: { rotation?: quat, translationDelta?: [x,y,z] } }
 *  - isDescendant(nom, nomAncetre)
 *  - metrics : triangles, draco, textures [{name, width, height, mime}]
 */
function inspectGlb(buffer) {
  const { json: g, bin } = parseGlb(buffer);
  const nodes = g.nodes || [];
  const names = new Map();
  const parentOf = new Map();
  nodes.forEach((n, i) => {
    if (n.name) names.set(n.name, i);
    for (const c of n.children || []) parentOf.set(c, i);
  });
  const roots = (g.scenes?.[g.scene ?? 0]?.nodes) || nodes.map((_, i) => i).filter((i) => !parentOf.has(i));

  function localBox(meshIndex) {
    let min = [Infinity, Infinity, Infinity];
    let max = [-Infinity, -Infinity, -Infinity];
    for (const prim of g.meshes[meshIndex].primitives) {
      const acc = g.accessors[prim.attributes.POSITION];
      if (!acc?.min || !acc?.max) throw new Error(`maillage ${g.meshes[meshIndex].name || meshIndex} : min/max absents`);
      min = min.map((v, k) => Math.min(v, acc.min[k]));
      max = max.map((v, k) => Math.max(v, acc.max[k]));
    }
    return { min, max };
  }

  function boxes(overrides = {}) {
    const out = new Map();
    const visit = (i, parentMatrix) => {
      const n = nodes[i];
      const o = (n.name && overrides[n.name]) || {};
      let local;
      if (n.matrix) local = n.matrix;
      else {
        const t = [...(n.translation || [0, 0, 0])];
        if (o.translationDelta) o.translationDelta.forEach((d, k) => { t[k] += d; });
        local = compose(t, o.rotation || n.rotation || [0, 0, 0, 1], n.scale || [1, 1, 1]);
      }
      const world = parentMatrix ? multiply(parentMatrix, local) : local;
      if (n.mesh !== undefined && n.name) {
        const lb = localBox(n.mesh);
        const corners = [];
        for (const x of [lb.min[0], lb.max[0]]) for (const y of [lb.min[1], lb.max[1]]) for (const z of [lb.min[2], lb.max[2]]) corners.push(apply(world, [x, y, z]));
        out.set(n.name, {
          min: [0, 1, 2].map((k) => Math.min(...corners.map((c) => c[k]))),
          max: [0, 1, 2].map((k) => Math.max(...corners.map((c) => c[k]))),
        });
      }
      for (const c of n.children || []) visit(c, world);
    };
    roots.forEach((r) => visit(r, null));
    return out;
  }

  function isDescendant(name, ancestorName) {
    let i = names.get(name);
    const target = names.get(ancestorName);
    if (i === undefined || target === undefined) return false;
    while (parentOf.has(i)) {
      i = parentOf.get(i);
      if (i === target) return true;
    }
    return false;
  }

  // --- Metriques de sobriete ---
  let triangles = 0;
  let dracoAll = true;
  for (const n of nodes) {
    if (n.mesh === undefined) continue;
    for (const prim of g.meshes[n.mesh].primitives) {
      const count = prim.indices !== undefined ? g.accessors[prim.indices].count : g.accessors[prim.attributes.POSITION].count;
      triangles += Math.floor(count / 3);
      if (!prim.extensions?.KHR_draco_mesh_compression) dracoAll = false;
    }
  }
  const draco = dracoAll && (g.extensionsUsed || []).includes('KHR_draco_mesh_compression');
  const textures = (g.images || []).map((img, i) => {
    const info = { name: img.name || `image_${i}`, mime: img.mimeType || null, width: null, height: null };
    if (img.bufferView === undefined || !bin) return { ...info, external: true };
    const view = g.bufferViews[img.bufferView];
    const bytes = bin.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
    return { ...info, ...imageSize(bytes) };
  });

  return { json: g, names, parentOf, boxes, isDescendant, metrics: { triangles, draco, textures } };
}

// Dimensions d'une image PNG ou JPEG a partir de son en-tete.
function imageSize(b) {
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      const len = b.readUInt16BE(i + 2);
      // SOF0..SOF15 sauf DHT (C4), JPG (C8), DAC (CC)
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
  }
  return { width: null, height: null };
}

// Distance entre deux boites (0 si elles se touchent ou se chevauchent).
function boxGap(a, b) {
  let sum = 0;
  for (let k = 0; k < 3; k++) {
    const d = Math.max(0, a.min[k] - b.max[k], b.min[k] - a.max[k]);
    sum += d * d;
  }
  return Math.sqrt(sum);
}

module.exports = { parseGlb, inspectGlb, axisAngleQuat, boxGap, imageSize };
