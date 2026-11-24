#!/usr/bin/env bash
# Provisions a Google Compute Engine e2-micro Always Free VM and deploys the NewsPress Wire Worker.
# Usage:
#   PROJECT_ID=alfa-news-service-test-project ZONE=us-central1-a ./deploy-gce-e2-micro.sh

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-alfa-news-service-test-project}"
ZONE="${ZONE:-us-central1-a}"
VM_NAME="${VM_NAME:-newspress-wire-worker}"
SA_NAME="newspress-wire-sa"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Using GCP Project: ${PROJECT_ID}, Zone: ${ZONE}, VM: ${VM_NAME}"
gcloud config set project "${PROJECT_ID}"

echo "==> Ensuring Compute Engine API is enabled..."
gcloud services enable compute.googleapis.com firestore.googleapis.com

echo "==> Creating dedicated least-privilege service account (${SA_EMAIL}) if needed..."
if ! gcloud iam service-accounts describe "${SA_EMAIL}" >/dev/null 2>&1; then
  gcloud iam service-accounts create "${SA_NAME}" \
    --display-name="NewsPress Wire Ingestion Worker"
fi

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/datastore.user" \
  --quiet

echo "==> Creating Always Free e2-micro VM (${VM_NAME}) if it does not exist..."
if ! gcloud compute instances describe "${VM_NAME}" --zone="${ZONE}" >/dev/null 2>&1; then
  gcloud compute instances create "${VM_NAME}" \
    --zone="${ZONE}" \
    --machine-type="e2-micro" \
    --image-family="debian-12" \
    --image-project="debian-cloud" \
    --boot-disk-size="30GB" \
    --boot-disk-type="pd-standard" \
    --service-account="${SA_EMAIL}" \
    --scopes="https://www.googleapis.com/auth/datastore"
fi

echo "==> Uploading worker package to ${VM_NAME}..."
gcloud compute ssh "${VM_NAME}" --zone="${ZONE}" --command="sudo mkdir -p /opt/newspress-wire-worker && sudo chmod 777 /opt/newspress-wire-worker"
gcloud compute scp --recurse --zone="${ZONE}" \
  "${SCRIPT_DIR}/package.json" \
  "${SCRIPT_DIR}/.env.example" \
  "${SCRIPT_DIR}/newspress-wire-worker.service" \
  "${SCRIPT_DIR}/setup-vm.sh" \
  "${SCRIPT_DIR}/src" \
  "${VM_NAME}:/opt/newspress-wire-worker/"

echo "==> Bootstrapping Node.js 20 and systemd service on ${VM_NAME}..."
gcloud compute ssh "${VM_NAME}" --zone="${ZONE}" --command="sudo bash /opt/newspress-wire-worker/setup-vm.sh"

echo ""
echo "Deployment complete!"
echo "Next steps:"
echo "  1. SSH into the VM and set GEMINI_API_KEY_1..GEMINI_API_KEY_4 in /etc/newspress-wire-worker.env:"
echo "     gcloud compute ssh ${VM_NAME} --zone=${ZONE}"
echo "     sudo nano /etc/newspress-wire-worker.env"
echo "  2. Start the worker and verify logs:"
echo "     sudo systemctl restart newspress-wire-worker"
echo "     sudo journalctl -u newspress-wire-worker -f"
