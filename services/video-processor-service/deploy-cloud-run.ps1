# Google Cloud Run Deployment Script
# Target GCP Project: alfa-news-service-test-project
# Region: asia-south1 (Mumbai, India)

$PROJECT_ID = "alfa-news-service-test-project"
$REGION = "asia-south1"
$SERVICE_NAME = "video-processor-service"

Write-Host "Deploying NewsPress Video Processing Microservice to Google Cloud Run..." -ForegroundColor Cyan

gcloud builds submit --config cloudbuild.yaml --project $PROJECT_ID

Write-Host "Deployment complete! Verifying service URL..." -ForegroundColor Green
gcloud run services describe $SERVICE_NAME --region $REGION --project $PROJECT_ID --format 'value(status.url)'
