#!/usr/bin/env bash
# deploy.sh – build, commit to GitHub y subir al hosting FTP
# Uso: ./deploy.sh "mensaje del commit"

set -e

FTP_HOST="duts.com.ar"
FTP_USER="ronda@duts.com.ar"
FTP_PASS='+(QhGUqRl$bH;S_a'
FTP_REMOTE_DIR="/"

COMMIT_MSG="${1:-"chore: deploy $(date +'%Y-%m-%d %H:%M')"}"

echo "▶ Build de producción..."
VITE_BASE=/ronda/ npm run build

echo "▶ Commit y push a GitHub..."
git add -A
git commit -m "$COMMIT_MSG" || echo "  (nada nuevo para commitear)"
git push origin main

echo "▶ Subiendo al FTP $FTP_HOST..."
lftp -c "
set ftp:ssl-allow no;
open ftp://$FTP_HOST;
user '$FTP_USER' '$FTP_PASS';
mirror --reverse --delete --verbose $(pwd)/dist/ $FTP_REMOTE_DIR;
bye
"

echo "✅ Deploy completo → http://$FTP_HOST"
