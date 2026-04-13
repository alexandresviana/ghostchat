# Ghost Chat — Instruções de Desenvolvimento

> **Slogan:** Ghosting? Not here.  
> **Conceito principal:** salas de chat **por link** — você cria no painel, manda o link (ex.: WhatsApp) e conversa com texto, emojis e fotos. **Nada fica para sempre:** após **24 horas** o link expira e **apaga tudo**, ou os participantes encerram antes pelo botão **Encerrar** no próprio chat.

Arquitetura **serverless-first**: **Bunny Database** (libSQL) para salas e mensagens, **Bunny Edge** para API + WebSocket, **armazenamento de mídia** (ex.: **Bunny Storage** ou CDN) para URLs de fotos anexadas.

---

## Ideia principal (fluxo do produto)

1. O usuário entra no **painel** (`/panel`).
2. Clica em **Criar novo chat** — o sistema gera uma **sala** e uma **URL única** (ex.: `https://…/c/abc123`).
3. Ele **copia o link** e envia por **WhatsApp** (ou outro canal) para quem quiser conversar.
4. Quem abre o link entra na **mesma sala** — mensagens de **texto**, **emoji** e **fotos** (e, no futuro, outros anexos).
5. A conversa **termina** de dois jeitos:
   - **Tempo:** passadas **24 horas** desde a criação da sala, o link **expira** e os dados são **removidos** (sala + mensagens + arquivos associados).
   - **Manual:** alguém com acesso ao chat usa o botão **Encerrar** — a sala fecha e o conteúdo é **apagado** na mesma lógica de limpeza.

Não é o foco uma “lista infinita de conversas antigas”: o valor é **privacidade por janela de tempo** + **compartilhamento simples por URL**.

---

## Stack recomendada (serverless)

### Frontend

- **Next.js** (web) ou **React Native** (app)
- **Tailwind CSS** / NativeWind  
- Animações: Framer Motion / Reanimated  

### Backend e dados (Bunny)

| Camada | Serviço | Função |
|--------|---------|--------|
| Banco | **Bunny Database** | Salas (`rooms`), mensagens (`messages`), TTL lógico + job de limpeza |
| APIs + tempo real | **Bunny Edge Scripting** | REST (criar sala, postar mensagem, upload assinado) + **WebSockets** para entrega em tempo real |
| Arquivos | **Bunny Storage** (ou equivalente) | Fotos enviadas no chat; `messages.media_url` guarda a URL pública |

- Cliente SQL: **`@libsql/client`** com URL `libsql://…` e token.

### Autenticação (opcional no MVP)

- O MVP pode ser **sem login**: quem tem o link entra na sala.  
- Depois: login leve (magic link / OAuth) só para o **dono do painel** ou para moderar abusos.

---

## Estrutura de pastas (sugerida)

```text
ghostchat/
├── app/
│   ├── api/health/
│   ├── panel/              # Painel: criar sala e copiar URL
│   ├── c/[roomId]/         # Sala aberta pelo link compartilhado
│   ├── login/              # (opcional)
│   └── profile/            # (opcional)
├── components/
│   ├── GhostAvatar.tsx
│   ├── MessageBubble.tsx
│   ├── ChatComposer.tsx    # Texto + emoji + anexo foto
│   └── ...
├── lib/
│   ├── bunny-db.ts
│   ├── room-expiry.ts      # 24h + formatação de countdown
│   └── api.ts
├── db/
│   └── schema.sql
└── edge/
    └── chat-ws.example.ts
```

---

## Identidade visual

(Ver paleta e fontes na seção anterior do projeto — mantidas.)

---

## Funcionalidades

### MVP (v1)

- [ ] Painel com **Criar novo chat** e exibição/cópia da **URL**  
- [ ] Compartilhamento fácil (copiar link; deep link `whatsapp://` opcional)  
- [ ] Sala em tempo real: **texto** + **emoji** + **foto** (upload → URL no storage)  
- [ ] Contador/regressão até **expiração em 24h**  
- [ ] Botão **Encerrar** na sala (fecha e dispara limpeza)  
- [ ] Limpeza no backend: apagar sala, mensagens e objetos de storage ao expirar ou encerrar  

### V2 (exemplos)

- [ ] Vídeo / áudio  
- [ ] Limite de tamanho por sala ou por IP  
- [ ] Moderação / denúncia  

---

## Regras de negócio centrais

1. **Uma sala = um link** — quem tem o link participa (ajustar política de acesso conforme produto).  
2. **Duração máxima 24h** desde a criação — ao expirar, **apagar tudo** (DB + arquivos).  
3. **Encerrar** no chat encerra antes do prazo e **apaga tudo** da mesma forma.  
4. **Sem promessa de histórico eterno** — o produto é **efêmero por design**.

---

## Como rodar localmente

```bash
git clone https://github.com/seu-usuario/ghostchat.git
cd ghostchat
npm install
cp .env.example .env.local
npm run dev
```

Abra `http://localhost:3000` → **Painel** em `/panel`.

### Variáveis de ambiente (`.env.local`)

```env
BUNNY_DATABASE_URL=libsql://seu-database-id.lite.bunnydb.net
BUNNY_DATABASE_TOKEN=seu-token-de-acesso
NEXT_PUBLIC_EDGE_API_URL=https://seu-pullzone.b-cdn.net
# Opcional: URL base do site para montar links compartilháveis
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Modelo de dados (Bunny Database / SQLite)

Ver **`db/schema.sql`** no repositório — tabelas `rooms` (slug, `expires_at`, `ended_at`) e `messages` (texto + `media_url` opcional).

---

## Bunny Edge: API + WebSocket

- Criar sala, validar slug, postar mensagem, URL pré-assinada para upload de foto.  
- WebSocket por `room_id` para broadcast de mensagens.  
- Cron ou evento agendado (fora do request) para **purge** de salas expiradas.

---

## Deploy

- **Next.js:** Vercel / Netlify / etc.  
- **Edge + Storage + Database:** painel Bunny.  

---

## Próximos passos

1. Implementar API real: criar sala, mensagens, upload, expirar e encerrar.  
2. Conectar UI do painel e da rota `/c/[roomId]` ao Edge + DB.  
3. Testes de carga e limpeza de storage.  

---

**Ghost Chat — Ghosting? Not here.**
