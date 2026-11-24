#!/usr/bin/env bash
# Bootstrap script for Debian 12 on Google Compute Engine e2-micro Always Free VM.
# Run as root (sudo bash setup-vm.sh) after copying this folder to /opt/newspress-wire-worker.

set -euo pipefail

APP_DIR="/opt/newspress-wire-worker"
ENV_FILE="/etc/newspress-wire-worker.env"
SERVICE_NAME="newspress-wire-worker.service"

echo "==> Checking Node.js 20 LTS..."
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "==> Creating dedicated non-root system user 'newspress'..."
if ! id -u newspress >/dev/null 2>&1; then
  useradd --system --no-create-home --shell /usr/sbin/nologin newspress
fi

echo "==> Installing production dependencies in ${APP_DIR}..."
mkdir -p "${APP_DIR}"
cd "${APP_DIR}"
npm install --omit=dev
chown -R newspress:newspress "${APP_DIR}"

if [ ! -f "${ENV_FILE}" ]; then
  echo "==> Creating ${ENV_FILE} from .env.example (chmod 600)..."
  cp "${APP_DIR}/.env.example" "${ENV_FILE}"
  chown root:newspress "${ENV_FILE}"
  chmod 640 "${ENV_FILE}"
  echo "IMPORTANT: Edit ${ENV_FILE} and set GEMINI_API_KEY_1..GEMINI_API_KEY_4 before starting the service."
fi

echo "==> Installing systemd service ${SERVICE_NAME}..."
cp "${APP_DIR}/${SERVICE_NAME}" "/etc/systemd/system/${SERVICE_NAME}"
chmod 644 "/etc/systemd/system/${SERVICE_NAME}"
systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"

if grep -Eq '^GEMINI_API_KEY(_[0-9]+|S)?=.+' "${ENV_FILE}"; then
  systemctl restart "${SERVICE_NAME}"
  echo "==> Service started. Tail logs with: sudo journalctl -u ${SERVICE_NAME} -f"
else
  echo "==> Setup complete. Set GEMINI_API_KEY_1..GEMINI_API_KEY_4 in ${ENV_FILE}, then run:"
  echo "    sudo systemctl start ${SERVICE_NAME}"
  echo "    sudo journalctl -u ${SERVICE_NAME} -f"
fi
