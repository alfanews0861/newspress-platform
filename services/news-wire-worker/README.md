# NewsPress Marketplace Wire Worker (Google Compute Engine `e2-micro`)

Lightweight Node.js 20 background worker designed for Google Cloud's **Always Free `e2-micro`** Compute Engine tier (1 GB RAM, 30 GB `pd-standard` boot disk in `us-central1`, `us-west1`, or `us-east1`).

## What It Does
1. Reads active source URLs from Firestore (`wireFeedSources` where `enabled == true`), tagged by **Language** and **Category** from the NewsPress Admin Console (`/admin/wire-feeds`).
2. Supports **both RSS/Atom XML feeds and direct news website URLs** without launching a heavy headless browser.
3. Enforces outbound URL & DNS validation on every request and redirect hop (blocking private/loopback/metadata IPs and oversized responses).
4. Deduplicates every discovered story by SHA-256 hash of its canonical URL (`wireDedupeIndex/{urlHash}`).
5. Rewrites each new story into a punchy newspaper headline and faithful full-body report in the target language preserving every factual detail.
6. Auto-publishes directly into Firestore `news/{newsId}` and `marketplaceListings/{listingId}` (`status: 'ACTIVE'`, `price: 0`, `includedInSubscription: true`) with the extracted lead photograph.
7. Records per-source run logs (`wireScraperRuns`) and worker health heartbeats (`wireWorkerStatus/primary`).

## Quick Deployment to GCE `e2-micro` Always Free

### Linux / macOS
```bash
chmod +x deploy-gce-e2-micro.sh
PROJECT_ID=alfa-news-service-test-project ZONE=us-central1-a ./deploy-gce-e2-micro.sh
```

### Windows PowerShell
```powershell
.\deploy-gce-e2-micro.ps1 -ProjectId "alfa-news-service-test-project" -Zone "us-central1-a"
```

### Configure 4 Free-Tier Project API Keys on the VM
Add your 4 free-tier API keys (from 4 separate projects) to `/etc/newspress-wire-worker.env`.
The worker automatically rotates round-robin across all 4 projects using high-quota light models (`gemini-3.1-flash-lite` primary, `gemini-4-hydrogen` fallback) with per-(key, model) 429 cooldown failover:

```bash
gcloud compute ssh newspress-wire-worker --zone=us-central1-a
sudo nano /etc/newspress-wire-worker.env
```

Set inside `/etc/newspress-wire-worker.env`:
```env
GEMINI_API_KEY_1=<project-1-free-key>
GEMINI_API_KEY_2=<project-2-free-key>
GEMINI_API_KEY_3=<project-3-free-key>
GEMINI_API_KEY_4=<project-4-free-key>
GEMINI_MODELS=gemini-3.1-flash-lite,gemini-4-hydrogen
```

Then restart and tail logs:
```bash
sudo systemctl restart newspress-wire-worker
sudo journalctl -u newspress-wire-worker -f
```

## Single-Cycle Dry Test on the VM
```bash
cd /opt/newspress-wire-worker
sudo -u newspress bash -c 'set -a && source /etc/newspress-wire-worker.env && set +a && npm run run-once'
```
