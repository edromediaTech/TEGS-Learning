#!/usr/bin/env bash
# ==============================================================
# Installation d'un noeud TEGS-Edge sur Ubuntu Server (etape E7).
# A lancer depuis deploy/edge/, avec Internet (construction des images).
#
#   bash install.sh                                  # noeud seul
#   bash install.sh --dnsmasq enp2s0 192.168.10.1    # + DHCP/DNS de la salle (tegs.local)
#   bash install.sh --ufw 192.168.10.0/24            # + pare-feu (HTTP depuis la salle, SSH)
#
# Idempotent : relancer ne recree pas .env.edge et met le noeud a jour.
# Guide complet : docs/edge-deploiement.md
# ==============================================================
set -euo pipefail
cd "$(dirname "$0")"

COMPOSE="docker compose -f docker-compose.edge.yml"
DEFAULT_CLOUD="https://tegs-backend-746425674533.us-central1.run.app"
DNS_IFACE="" ; DNS_IP="" ; UFW_NET=""
while [ $# -gt 0 ]; do
  case "$1" in
    --dnsmasq) DNS_IFACE="${2:?interface}"; DNS_IP="${3:?adresse IP du serveur}"; shift 3 ;;
    --ufw) UFW_NET="${2:?reseau, ex. 192.168.10.0/24}"; shift 2 ;;
    *) echo "Option inconnue : $1"; exit 1 ;;
  esac
done

ok()   { echo "  [OK]   $*"; }
warn() { echo "  [ATTENTION] $*"; }
fail() { echo "  [ECHEC] $*"; exit 1; }

echo "=== TEGS-Edge : installation du noeud de salle ==="

# --- 1. Prerequis ---
echo "--- Prerequis ---"
grep -qi ubuntu /etc/os-release 2>/dev/null && ok "Ubuntu" || warn "systeme non Ubuntu : non teste"
mem_gb=$(awk '/MemTotal/ {printf "%d", $2/1024/1024}' /proc/meminfo)
[ "$mem_gb" -ge 8 ] && ok "memoire ${mem_gb} Go" || warn "memoire ${mem_gb} Go (16 Go recommandes)"
free_gb=$(df -BG --output=avail . | tail -1 | tr -dc '0-9')
[ "$free_gb" -ge 20 ] && ok "disque libre ${free_gb} Go" || warn "disque libre ${free_gb} Go (20 Go minimum conseilles)"
# Les empreintes des PIN et des mots de passe sont sur ce disque : il doit etre chiffre.
if lsblk -o TYPE 2>/dev/null | grep -q crypt; then
  ok "disque chiffre (LUKS)"
else
  warn "disque NON chiffre : un disque vole permettrait de retrouver les PIN (voir docs/edge-deploiement.md)"
fi

# --- 2. Docker ---
echo "--- Docker ---"
if ! command -v docker >/dev/null 2>&1; then
  echo "  Installation de Docker (Internet requis)..."
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER" || true
  COMPOSE="sudo $COMPOSE"
fi
docker compose version >/dev/null 2>&1 || sudo docker compose version >/dev/null 2>&1 || fail "docker compose indisponible"
ok "$(docker --version 2>/dev/null || sudo docker --version)"
if ! docker info >/dev/null 2>&1; then COMPOSE="sudo docker compose -f docker-compose.edge.yml"; fi

# --- 3. Configuration du noeud (.env.edge) ---
echo "--- Configuration ---"
if [ -f .env.edge ]; then
  ok ".env.edge deja present (conserve)"
else
  echo "  Valeurs donnees par la page « Centres de salle » du cloud TEGS :"
  read -r -p "  Identifiant du centre (ex. CRNS-NORD-EST-01) : " center_id
  read -r -p "  Nom du centre : " center_name
  read -r -s -p "  Jeton du noeud (tegs_edge_..., saisie masquee) : " node_token; echo
  read -r -p "  URL du cloud [$DEFAULT_CLOUD] : " cloud_url
  [ -n "$center_id" ] && [[ "$node_token" == tegs_edge_* ]] || fail "identifiant ou jeton invalide"
  umask 077
  cat > .env.edge <<EOF
TEGS_CENTER_ID=${center_id^^}
TEGS_CENTER_NAME="${center_name}"
TEGS_CLOUD_GATEWAY_URL=${cloud_url:-$DEFAULT_CLOUD}
TEGS_EDGE_API_KEY=${node_token}
JWT_SECRET=$(openssl rand -hex 32)
LOCAL_PORT=80
SYNC_INTERVAL_SECONDS=300
EOF
  ok ".env.edge cree (droits 600, secret JWT genere)"
fi

# --- 4. Reseau de la salle (optionnel) ---
if [ -n "$DNS_IFACE" ]; then
  echo "--- dnsmasq : DHCP + DNS tegs.local sur $DNS_IFACE ---"
  sudo apt-get install -y dnsmasq >/dev/null
  prefix="${DNS_IP%.*}"
  sudo tee /etc/dnsmasq.d/tegs.conf >/dev/null <<EOF
interface=${DNS_IFACE}
bind-interfaces
dhcp-range=${prefix}.50,${prefix}.150,12h
address=/tegs.local/${DNS_IP}
EOF
  sudo systemctl restart dnsmasq && ok "dnsmasq : tegs.local -> ${DNS_IP}, DHCP ${prefix}.50-150"
fi
if [ -n "$UFW_NET" ]; then
  echo "--- Pare-feu ---"
  sudo ufw allow OpenSSH >/dev/null
  sudo ufw allow from "$UFW_NET" to any port 80 proto tcp >/dev/null
  [ -n "$DNS_IFACE" ] && sudo ufw allow in on "$DNS_IFACE" to any port 53 >/dev/null && sudo ufw allow in on "$DNS_IFACE" to any port 67 proto udp >/dev/null
  sudo ufw --force enable >/dev/null && ok "ufw actif (HTTP depuis $UFW_NET, SSH)"
fi

# --- 5. Demarrage ---
echo "--- Construction et demarrage (plusieurs minutes la premiere fois) ---"
$COMPOSE up -d --build --wait --wait-timeout 600
ok "services demarres"
bash ./check.sh
echo
echo "Postes de la salle : http://tegs.local  (etat du noeud : http://tegs.local/admin/edge)"
