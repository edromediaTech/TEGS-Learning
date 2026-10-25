/**
 * Sobriete (laptops de salle) : polygones, taille des textures, compression Draco.
 */
const DEFAULT_BUDGET = { polygons: 10000, texture_px: 1024, warn_ratio: 0.8 };

function checkPerformance(manifest, glb, { report, budget = {} }) {
  const b = { ...DEFAULT_BUDGET, ...budget };
  const { triangles, draco, textures } = glb.metrics;
  const err = (message, details) => report.errors.push({ code: 'ERR_PERF_BUDGET', message, details });

  if (triangles > b.polygons) err(`${triangles} polygones : budget de ${b.polygons} depasse`, { triangles, budget: b.polygons });
  else if (triangles > b.polygons * b.warn_ratio) {
    report.warnings.push({ code: 'WARN_PERF_NEAR_BUDGET', message: `${triangles} polygones (plus de ${Math.round(b.warn_ratio * 100)} % du budget)`, details: { triangles } });
  }
  if (!draco) err('compression Draco absente sur au moins un maillage', {});
  let maxPx = 0;
  for (const t of textures) {
    if (t.external) { err(`texture ${t.name} externe : le paquet doit etre autonome (hors ligne)`, { texture: t.name }); continue; }
    if (!t.width || !t.height) { report.warnings.push({ code: 'WARN_TEXTURE_UNREAD', message: `taille de ${t.name} illisible`, details: {} }); continue; }
    maxPx = Math.max(maxPx, t.width, t.height);
    if (t.width > b.texture_px || t.height > b.texture_px) err(`texture ${t.name} : ${t.width}x${t.height} px (maximum ${b.texture_px})`, { texture: t.name });
  }
  Object.assign(report.metrics, { triangles, draco, textures: textures.length, max_texture_px: maxPx, budget: b });
}

module.exports = { checkPerformance, DEFAULT_BUDGET };
