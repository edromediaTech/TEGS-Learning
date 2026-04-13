#!/usr/bin/env bash
# ==============================================================
# TEGS-Learning - Configuration initiale GCP
# Execute une seule fois pour preparer le projet
# Usage: bash deploy/gcloud-setup.sh
# ==============================================================

set -euo pipefail

PROJECT_ID="luminous-mesh-459718-p4"
REGION="us-central1"

echo "=== TEGS-Learning GCP Setup ==="
echo "Project: $PROJECT_ID"
echo "Region:  $REGION"
echo ""

# 1. Definir le projet actif
gcloud config set project "$PROJECT_ID"

# 2. Activer les APIs necessaires
echo "--- Activation des APIs ---"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com \
  firebase.googleapis.com \
  firebasehosting.googleapis.com \
  --project="$PROJECT_ID"

# 3. Creer les secrets (valeurs a remplir)
echo ""
echo "--- Creation des secrets ---"
for SECRET in tegs-mongo-uri tegs-jwt-secret tegs-gcs-jwt-secret tegs-moncash-client-id tegs-moncash-client-secret tegs-natcash-merchant-id tegs-natcash-api-key; do
  if gcloud secrets describe "$SECRET" --project="$PROJECT_ID" &>/dev/null; then
    echo "  Secret '$SECRET' existe deja."
  else
    echo "  Creation du secret '$SECRET'..."
    printf "REPLACE_ME" | gcloud secrets create "$SECRET" \
      --data-file=- \
      --replication-policy="automatic" \
      --project="$PROJECT_ID"
    echo "  -> Mettez a jour: echo -n 'VALEUR' | gcloud secrets versions add $SECRET --data-file=-"
  fi
done

# 4. Donner acces aux secrets pour Cloud Run
echo ""
echo "--- Permissions Cloud Run -> Secrets ---"
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

for SECRET in tegs-mongo-uri tegs-jwt-secret tegs-gcs-jwt-secret tegs-moncash-client-id tegs-moncash-client-secret tegs-natcash-merchant-id tegs-natcash-api-key; do
  gcloud secrets add-iam-policy-binding "$SECRET" \
    --member="serviceAccount:${SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --project="$PROJECT_ID" \
    --quiet
done
echo "  Permissions accordees."

echo ""
echo "=== PROCHAINES ETAPES ==="
echo ""
echo "1. Mettez a jour les secrets :"
echo "   echo -n 'mongodb+srv://...' | gcloud secrets versions add tegs-mongo-uri --data-file=-"
echo "   echo -n 'votre_jwt_secret' | gcloud secrets versions add tegs-jwt-secret --data-file=-"
echo "   echo -n 'votre_gcs_secret' | gcloud secrets versions add tegs-gcs-jwt-secret --data-file=-"
echo ""
echo "   # Tournament / Payment secrets:"
echo "   echo -n 'MONCASH_ID' | gcloud secrets versions add tegs-moncash-client-id --data-file=-"
echo "   echo -n 'MONCASH_SECRET' | gcloud secrets versions add tegs-moncash-client-secret --data-file=-"
echo "   echo -n 'NATCASH_MERCHANT' | gcloud secrets versions add tegs-natcash-merchant-id --data-file=-"
echo "   echo -n 'NATCASH_KEY' | gcloud secrets versions add tegs-natcash-api-key --data-file=-"
echo ""
echo "2. Deploiement :"
echo "   bash deploy/deploy-manual.sh"
echo ""
echo "=== Setup termine ==="
