---
description: build, commit a GitHub y subir al FTP de duts.com.ar
---

# Deploy completo (GitHub + FTP)

// turbo-all

1. Dar permisos al script si es la primera vez:
```bash
chmod +x deploy.sh
```

2. Correr el deploy con mensaje opcional:
```bash
./deploy.sh "feat: descripción del cambio"
```

El script hace automáticamente:
- `VITE_BASE=/ npm run build`
- `git add -A && git commit && git push origin main`
- `lftp mirror` del `dist/` al raíz del FTP en `duts.com.ar`
