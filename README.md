# Ghost Chat

Conversas **privadas e efémeras** por link único (Next.js, Bunny Database & Storage).

Documentação da stack: **[GHOSTCHAT.md](./GHOSTCHAT.md)**.

## Desenvolvimento

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) → **Painel** em [/panel](/panel). Health: [/api/health](/api/health).

## Build

```bash
npm run build && npm start
```

## Docker

Local:

```bash
docker build -t ghostchat .
docker run --rm -p 3000:3000 --env-file .env.production ghostchat
```

Imagem publicada no **GitHub Container Registry** a cada push na `main` (workflow `.github/workflows/docker-publish.yml`):

```bash
docker pull ghcr.io/alexandresviana/ghostchat:latest
docker run --rm -p 3000:3000 --env-file .env.production ghcr.io/alexandresviana/ghostchat:latest
```

Na primeira vez, em GitHub → **Packages** → pacote `ghostchat` → tornar **público** (ou autentica com `docker login ghcr.io`).

Defina as variáveis de ambiente (ver `.env.example`): Bunny DB, storage, Pull Zone, etc.

Repositório: **https://github.com/alexandresviana/ghostchat**
