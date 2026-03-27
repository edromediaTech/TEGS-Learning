#!/usr/bin/env bash
# ==============================================================
# TEGS-Learning - Deploiement Backend (Cloud Run) + Frontend (Firebase)
# Usage: bash deploy/deploy-manual.sh
# ==============================================================

set -euo pipefail

PROJECT_ID="luminous-mesh-459718-p4"
REGION="us-central1"
TAG=$(date +%Y%m%d-%H%M%S)

echo "=== TEGS-Learning - Deploiement Production ==="
echo "Project: $PROJECT_ID | Region: $REGION | Tag: $TAG"
echo ""

# ============================================================
# 1. BACKEND -> Cloud Run
# ============================================================
echo "--- [1/3] Build & Deploy Backend (Cloud Run) ---"

gcloud builds submit ./backend \
  --tag "gcr.io/$PROJECT_ID/tegs-backend:$TAG" \
  --project="$PROJECT_ID"

gcloud run deploy tegs-backend \
  --image="gcr.io/$PROJECT_ID/tegs-backend:$TAG" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --port=3000 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=1 \
  --max-instances=10 \
  --set-env-vars="GCS_ENABLED=true,GCS_SERVICE_URL=https://dp-storage-service-746425674533.us-central1.run.app,JWT_EXPIRES_IN=24h" \
  --set-secrets="MONGODB_URI=tegs-mongo-uri:latest,JWT_SECRET=tegs-jwt-secret:latest,GCS_JWT_SECRET=tegs-gcs-jwt-secret:latest" \
  --project="$PROJECT_ID"

BACKEND_URL=$(gcloud run services describe tegs-backend \
  --region="$REGION" \
  --format='value(status.url)' \
  --project="$PROJECT_ID")

echo ""
echo "Backend deploye: $BACKEND_URL"

# ============================================================
# 2. FRONTEND -> Build Nuxt avec l'URL backend
# ============================================================
echo ""
echo "--- [2/3] Build Frontend (Nuxt 3) ---"

cd frontend
NUXT_PUBLIC_API_BASE="${BACKEND_URL}/api" npx nuxi generate

# ============================================================
# 3. FRONTEND -> Firebase Hosting
# ============================================================
echo ""
echo "--- [3/3] Deploy Frontend (Firebase Hosting) ---"

npx firebase-tools deploy --only hosting --project="$PROJECT_ID"

FRONTEND_URL="https://${PROJECT_ID}.web.app"

cd ..

echo ""
echo "======================================================="
echo "  TEGS-Learning deploye avec succes !"
echo ""
echo "  Backend  (Cloud Run):      $BACKEND_URL"
echo "  Frontend (Firebase):       $FRONTEND_URL"
echo "  Alt URL:                   https://${PROJECT_ID}.firebaseapp.com"
echo ""
echo "  Pour un domaine personnalise (ex: learning.ddene.edu.ht):"
echo "    firebase hosting:channel:deploy --project=$PROJECT_ID"
echo "    Ou: Console Firebase > Hosting > Domaines personnalises"
echo "======================================================="
