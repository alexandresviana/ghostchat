# Ghost Chat

**Ghosting? Not here.** App de chat com mensagens persistentes e presença visível.

Documentação completa da stack (Bunny Database, Bunny Edge, WebSockets, MVP): **[GHOSTCHAT.md](./GHOSTCHAT.md)**.

## Desenvolvimento

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) → **Painel** em [/panel](/panel) para criar sala e link. Health: [/api/health](/api/health).

## Build

```bash
npm run build && npm start
```
