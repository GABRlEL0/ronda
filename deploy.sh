#!/usr/bin/env bash
# deploy.sh – build, commit to GitHub y subir al hosting FTP
# Uso: ./deploy.sh "mensaje del commit"
#
# Credenciales FTP: se leen de .env.deploy (ignorado por git). Ver .env.deploy.example.

set -euo pipefail

cd "$(dirname "$0")"

if [[ -f .env.deploy ]]; then
  # shellcheck disable=SC1091
  set -a; source .env.deploy; set +a
fi

FTP_HOST="${FTP_HOST:-duts.com.ar}"
FTP_USER="${FTP_USER:-ronda@duts.com.ar}"
FTP_REMOTE_DIR="${FTP_REMOTE_DIR:-/}"

if [[ -z "${FTP_PASS:-}" ]]; then
  echo "✖ Falta FTP_PASS. Crealo en .env.deploy (ver .env.deploy.example)." >&2
  exit 1
fi

COMMIT_MSG="${1:-"chore: deploy $(date +'%Y-%m-%d %H:%M')"}"

echo "▶ Build de producción..."
VITE_BASE=/ronda/ npm run build

echo "▶ Commit y push a GitHub..."
git add -A
git commit -m "$COMMIT_MSG" || echo "  (nada nuevo para commitear)"
git push origin main

echo "▶ Subiendo al FTP $FTP_HOST..."
# La contraseña viaja por variable de entorno (LFTP_PASSWORD + --env-password)
# para que no aparezca en la lista de procesos.
LFTP_PASSWORD="$FTP_PASS" lftp -c "
set ftp:ssl-allow no;
open --user '$FTP_USER' --env-password ftp://$FTP_HOST;
mirror --reverse --delete --verbose $(pwd)/dist/ $FTP_REMOTE_DIR;
bye
"

echo "✅ Deploy completo → https://$FTP_HOST/ronda/"
