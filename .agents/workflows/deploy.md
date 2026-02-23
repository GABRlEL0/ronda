---
description: build, commit a GitHub y subir al FTP de duts.com.ar
---

# Deploy completo (GitHub + FTP)

// turbo-all

## Prerequisitos (solo la primera vez)
```bash
brew install lftp
chmod +x deploy.sh
```

## Datos del hosting
| Campo | Valor |
|---|---|
| URL pública | https://duts.com.ar/ronda/ |
| FTP host | duts.com.ar |
| FTP usuario | ronda@duts.com.ar |
| FTP root | apunta a `duts.com.ar/ronda/` (subir siempre a `/`) |
| VITE_BASE | `/ronda/` — **nunca** usar `/` o los assets darán 404 |

## Pasos

1. Correr el deploy con mensaje de commit:
```bash
./deploy.sh "feat: descripción del cambio"
```

El script hace automáticamente:
- `VITE_BASE=/ronda/ npm run build`
- `git add -A && git commit && git push origin main`
- `lftp mirror` de `dist/` al raíz del FTP en `duts.com.ar`

## Si los assets dan 404 en producción
El problema casi siempre es el `VITE_BASE`. Verificar que `deploy.sh` use `VITE_BASE=/ronda/` y no `VITE_BASE=/`.
