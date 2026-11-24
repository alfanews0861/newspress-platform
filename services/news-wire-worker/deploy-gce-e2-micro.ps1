<#
.SYNOPSIS
  Provisions a Google Compute Engine e2-micro Always Free VM and deploys the NewsPress Wire Worker.
.EXAMPLE
  .\deploy-gce-e2-micro.ps1 -ProjectId "alfa-news-service-test-project" -Zone "us-central1-a"
#>

param(
  [string]$ProjectId = "alfa-news-service-test-project",
  [string]$Zone = "us-central1-a",
  [string]$VmName = "newspress-wire-worker",
  [string]$ServiceAccountName = "newspress-wire-sa"
)

$ErrorActionPreference = "Stop"
$SaEmail = "$ServiceAccountName@$ProjectId.iam.gserviceaccount.com"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "==> Configuring gcloud project: $ProjectId (Zone: $Zone)" -ForegroundColor Cyan
gcloud config set project $ProjectId
gcloud services enable compute.googleapis.com firestore.googleapis.com

Write-Host "==> Ensuring service account $SaEmail exists..." -ForegroundColor Cyan
$saExists = $true
try {
  gcloud iam service-accounts describe $SaEmail 2>$null | Out-Null
} catch {
  $saExists = $false
}

if (-not $saExists) {
  gcloud iam service-accounts create $ServiceAccountName `
    --display-name="NewsPress Wire Ingestion Worker"
}

gcloud projects add-iam-policy-binding $ProjectId `
  --member="serviceAccount:$SaEmail" `
  --role="roles/datastore.user" `
  --quiet

Write-Host "==> Checking e2-micro VM $VmName..." -ForegroundColor Cyan
$vmExists = $true
try {
  gcloud compute instances describe $VmName --zone=$Zone 2>$null | Out-Null
} catch {
  $vmExists = $false
}

if (-not $vmExists) {
  gcloud compute instances create $VmName `
    --zone=$Zone `
    --machine-type="e2-micro" `
    --image-family="debian-12" `
    --image-project="debian-cloud" `
    --boot-disk-size="30GB" `
    --boot-disk-type="pd-standard" `
    --service-account=$SaEmail `
    --scopes="https://www.googleapis.com/auth/datastore"
}

Write-Host "==> Uploading worker package to $VmName..." -ForegroundColor Cyan
gcloud compute ssh $VmName --zone=$Zone --command="sudo mkdir -p /opt/newspress-wire-worker && sudo chmod 777 /opt/newspress-wire-worker"

gcloud compute scp --recurse --zone=$Zone `
  "$ScriptDir\package.json" `
  "$ScriptDir\.env.example" `
  "$ScriptDir\newspress-wire-worker.service" `
  "$ScriptDir\setup-vm.sh" `
  "$ScriptDir\src" `
  "${VmName}:/opt/newspress-wire-worker/"

Write-Host "==> Running VM bootstrap script..." -ForegroundColor Cyan
gcloud compute ssh $VmName --zone=$Zone --command="sudo bash /opt/newspress-wire-worker/setup-vm.sh"

Write-Host ""
Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "Next steps:"
Write-Host "  1. SSH into the VM and set GEMINI_API_KEY_1..GEMINI_API_KEY_4 in /etc/newspress-wire-worker.env:"
Write-Host "     gcloud compute ssh $VmName --zone=$Zone"
Write-Host "     sudo nano /etc/newspress-wire-worker.env"
Write-Host "  2. Start the service and inspect logs:"
Write-Host "     sudo systemctl restart newspress-wire-worker"
Write-Host "     sudo journalctl -u newspress-wire-worker -f"
