#!/usr/bin/env bash
# ==============================================================
# Demonstrateur 3D (jalon C1) sur le serveur de salle : http://tegs.local:8081/demo-3d
# Pile Docker SEPAREE du noeud (projet tegs-demo) : le noeud de salle (port 80, branche
# master gelee) n'est ni arrete ni modifie.
#
# A lancer depuis deploy/edge/ d'un checkout de la branche feature/threejs-engine,
# distinct de celui du noeud, par exemple :
#   git -C ~/TEGS-Learning fetch origin
#   git -C ~/TEGS-Learning worktree add ~/tegs-demo origin/feature/threejs-engine
#   cd ~/tegs-demo/deploy/edge
#
#   bash demo-3d.sh                          # construit (Internet requis) et demarre
#   bash demo-3d.sh --ufw 192.168.10.0/24    # + ouvre le port depuis la salle
#   bash demo-3d.sh --stop                   # arrete le demonstrateur
# Port : DEMO_PORT (defaut 8081).
# ==============================================================
set -euo pipefail
cd "$(dirname "$0")"

PORT="${DEMO_PORT:-8081}"
UFW_NET="" ; STOP=0
while [ $# -gt 0 ]; do
  case "$1" in
    --ufw) UFW_NET="${2:?reseau, ex. 192.168.10.0/24}"; shift 2 ;;
    --stop) STOP=1; shift ;;
    *) echo "Option inconnue : $1"; exit 1 ;;
  esac
done

ok()   { echo "  [OK]   $*"; }
warn() { echo "  [ATTENTION] $*"; }
fail() { echo "  [ECHEC] $*"; exit 1; }

COMPOSE="docker compose -p tegs-demo -f docker-compose.demo.yml"
docker info >/dev/null 2>&1 || COMPOSE="sudo $COMPOSE"
export DEMO_PORT="$PORT"

if [ "$STOP" = 1 ]; then
  $COMPOSE down && ok "demonstrateur arrete (noeud de salle inchange)"
  exit 0
fi

echo "=== Demonstrateur 3D : http://tegs.local:${PORT}/demo-3d ==="
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")
commit=$(git rev-parse --short HEAD 2>/dev/null || echo "?")
if git merge-base --is-ancestor "$commit" origin/feature/threejs-engine 2>/dev/null || [ "$branch" = "feature/threejs-engine" ]; then
  ok "checkout feature/threejs-engine ($commit)"
else
  warn "checkout $branch ($commit) : le demonstrateur vit sur feature/threejs-engine"
fi
[ -f ../../frontend/pages/demo-3d.vue ] || fail "pages/demo-3d.vue absent : mauvais checkout"
if ss -ltn 2>/dev/null | grep -q ":${PORT} " && ! $COMPOSE ps -q demo3d 2>/dev/null | grep -q .; then
  fail "port ${PORT} deja utilise par un autre service (DEMO_PORT=... pour en changer)"
fi

echo "--- Construction et demarrage ---"
$COMPOSE up -d --build
ok "conteneur demarre"

if [ -n "$UFW_NET" ]; then
  sudo ufw allow from "$UFW_NET" to any port "$PORT" proto tcp >/dev/null && ok "ufw : port ${PORT} ouvert depuis $UFW_NET"
fi

echo "--- Verification ---"
for i in $(seq 1 20); do curl -fsS -o /dev/null "http://localhost:${PORT}/demo-3d" && break; sleep 1; done
for path in /demo-3d /components/disjoncteur_c16_1pn/component.json /components/disjoncteur_c16_1pn/component.glb /vendor/three/0.184.0/three.module.min.js /vendor/three/0.184.0/GLTFLoader.js /vendor/draco/draco_decoder.wasm; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${PORT}${path}")
  [ "$code" = 200 ] && ok "$path" || fail "$path -> HTTP $code"
done
if curl -fsS -m 3 -o /dev/null "http://tegs.local:${PORT}/demo-3d" 2>/dev/null; then
  ok "http://tegs.local:${PORT}/demo-3d repond"
else
  warn "tegs.local injoignable depuis ce serveur (normal sans dnsmasq local) : tester depuis le poste du TNI"
fi
echo "=== Pret : ouvrir http://tegs.local:${PORT}/demo-3d sur le poste du TNI (Chrome, plein ecran) ==="
