#!/usr/bin/env bash
# ==============================================================
# Bilan d'un noeud TEGS-Edge en une commande (etape E7).
#   bash check.sh
# Code de sortie : 1 si un service est arrete ou l'API ne repond pas ; une synchro en
# echec (Internet coupe) n'est qu'un avertissement : la salle fonctionne sans.
# ==============================================================
set -uo pipefail
cd "$(dirname "$0")"
COMPOSE="docker compose -f docker-compose.edge.yml"
docker info >/dev/null 2>&1 || COMPOSE="sudo $COMPOSE"
PORT=$(grep -E '^LOCAL_PORT=' .env.edge 2>/dev/null | cut -d= -f2); PORT=${PORT:-80}
status=0

echo "=== Bilan du noeud TEGS-Edge ($(date '+%d/%m/%Y %H:%M')) ==="

echo "--- Services ---"
for svc in mongo backend web; do
  state=$($COMPOSE ps --format '{{.Service}} {{.State}} {{.Health}}' 2>/dev/null | awk -v s="$svc" '$1==s {print $2, $3}')
  case "$state" in
    running*unhealthy*|"") echo "  [ECHEC] $svc : ${state:-absent}"; status=1 ;;
    running*) echo "  [OK]    $svc : $state" ;;
    *) echo "  [ECHEC] $svc : $state"; status=1 ;;
  esac
done

echo "--- Acces de la salle ---"
code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/api/health")
[ "$code" = 200 ] && echo "  [OK]    API via nginx (port ${PORT})" || { echo "  [ECHEC] API via nginx : HTTP ${code}"; status=1; }
code=$(curl -sL -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/login")
[ "$code" = 200 ] && echo "  [OK]    page de connexion" || { echo "  [ECHEC] page de connexion : HTTP ${code}"; status=1; }
getent hosts tegs.local >/dev/null 2>&1 && echo "  [OK]    tegs.local resolu sur ce serveur" || echo "  [INFO]  tegs.local non resolu ici (normal si le DNS est fourni par le routeur)"

echo "--- Synchronisation avec le cloud ---"
$COMPOSE exec -T mongo mongosh --quiet tegs_edge --eval '
  const s = db.edgestates.findOne({ _id: "state" }) || {};
  const out = {}; db.statements.aggregate([{ $match: { "edge_sync.status": { $exists: true } } }, { $group: { _id: "$edge_sync.status", n: { $sum: 1 } } }]).forEach((g) => { out[g._id] = g.n; });
  const fmt = (d) => d ? new Date(d).toISOString().replace("T", " ").slice(0, 16) + " UTC" : "jamais";
  print(`  derniere reception : ${fmt(s.last_pull_ok_at)} | dernier envoi : ${fmt(s.last_push_ok_at)}`);
  print(`  echecs consecutifs : ${s.consecutive_failures || 0}${s.last_error ? " | derniere erreur : " + s.last_error : ""}`);
  print(`  resultats : ${(out.PENDING || 0) + (out.RETRY || 0)} en attente, ${out.SYNCED || 0} envoyes, ${out.FAILED || 0} refuses`);
  print(`  contenu local : ${db.users.countDocuments({ role: "student", isActive: true })} eleves actifs, ${db.crns_classrooms.countDocuments({ archived_at: null })} classes, ${db.modules.countDocuments({})} modules, ${Object.keys(s.installed || {}).length} simulations`);
' 2>/dev/null || { echo "  [ECHEC] base locale illisible"; status=1; }

echo "--- Disque ---"
df -h / | awk 'NR==2 {print "  " $4 " libres sur " $2 " (" $5 " utilises)"}'

echo
[ "$status" = 0 ] && echo "Noeud en service." || echo "Noeud en ECHEC : voir docker compose -f docker-compose.edge.yml logs --tail 100"
exit $status
