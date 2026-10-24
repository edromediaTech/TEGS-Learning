#!/usr/bin/env bash
# ==============================================================
# TEGS-Learning - Deploiement production (manuel : aucun trigger Cloud Build)
# Usage : bash deploy/deploy-manual.sh [all|backend|frontend]   (defaut : all)
#
# Prerequis :
#   - gcloud auth login  +  gcloud auth application-default login
#   - firebase-tools     (npm install -g firebase-tools)
#   - frontend/.env avec la vraie NUXT_PUBLIC_PIXABAY_KEY
# ==============================================================

set -euo pipefail

PROJECT_ID="luminous-mesh-459718-p4"
REGION="us-central1"
SERVICE="tegs-backend"
API_BASE="https://tegs-backend-746425674533.us-central1.run.app/api"
CRNS_MANIFEST_URL="https://storage.googleapis.com/crns-simulations-luminous/simulations/manifest.json"
TARGET="${1:-all}"

case "$TARGET" in all|backend|frontend) ;; *) echo "Cible inconnue : $TARGET (all|backend|frontend)"; exit 1 ;; esac
cd "$(dirname "$0")/.."

# --- Garde-fous : on deploie master, propre et a jour ---
git fetch -q origin
[ "$(git rev-parse --abbrev-ref HEAD)" = "master" ] || { echo "Deployer depuis la branche master."; exit 1; }
[ -z "$(git status --porcelain --untracked-files=no)" ] || { echo "Modifications non commitees."; exit 1; }
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/master)" ] || { echo "master local != origin/master : git pull."; exit 1; }

COMMIT=$(git rev-parse --short HEAD)
PREV_REVISION=$(gcloud run services describe "$SERVICE" --region="$REGION" --project="$PROJECT_ID" \
  --format='value(status.latestReadyRevisionName)')
echo "=== TEGS-Learning : deploiement '$TARGET' du commit $COMMIT ==="
echo "Revision backend actuelle : $PREV_REVISION"
read -r -p "Deployer en production ? [o/N] " answer
[ "$answer" = "o" ] || { echo "Annule."; exit 1; }

# ============================================================
# BACKEND -> Cloud Run
# ============================================================
if [ "$TARGET" != "frontend" ]; then
  echo "--- Backend (Cloud Run, construit avec backend/Dockerfile) ---"
  # --source conserve les variables et secrets deja configures sur le service.
  # Ne JAMAIS ajouter --set-env-vars / --set-secrets ici : ils REMPLACENT toute la
  # configuration (GATEWAY_AUTH_TOKEN, FRONTEND_URL=https://tegslearning.com...).
  # Pour changer une variable : gcloud run services update tegs-backend --update-env-vars CLE=valeur
  gcloud run deploy "$SERVICE" --source backend --region="$REGION" --project="$PROJECT_ID" --quiet
  curl -fsS "$API_BASE/health" && echo
  echo "Retour arriere backend :"
  echo "  gcloud run services update-traffic $SERVICE --to-revisions=$PREV_REVISION=100 --region=$REGION --project=$PROJECT_ID"
fi

# ============================================================
# FRONTEND -> Firebase Hosting (site tegs-learning = tegslearning.com)
# ============================================================
if [ "$TARGET" != "backend" ]; then
  echo "--- Frontend (Nuxt generate + Firebase Hosting) ---"
  if ! grep -qE '^NUXT_PUBLIC_PIXABAY_KEY=[0-9]+-[0-9a-f]+' frontend/.env 2>/dev/null; then
    echo "Cle Pixabay absente de frontend/.env : la recherche d'images serait cassee en prod."
    exit 1
  fi
  cd frontend
  npm ci --no-audit --no-fund
  # Les variables explicites priment sur frontend/.env (qui pointe sur localhost en dev).
  NUXT_PUBLIC_API_BASE="$API_BASE" NUXT_PUBLIC_CRNS_MANIFEST_URL="$CRNS_MANIFEST_URL" npx nuxi generate
  # Sans `firebase login`, firebase-tools utilise les identifiants gcloud (ADC).
  GOOGLE_APPLICATION_CREDENTIALS="${GOOGLE_APPLICATION_CREDENTIALS:-$HOME/.config/gcloud/application_default_credentials.json}" \
    firebase deploy --only hosting --project="$PROJECT_ID" -m "master $COMMIT"
  cd ..
  echo "Retour arriere frontend : console Firebase > Hosting > historique des versions > Rollback"
fi

echo "=== Deploiement termine : https://tegslearning.com ==="
