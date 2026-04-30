# GhostChat iOS (SwiftUI)

MVP nativo iOS alinhado ao **layout e cores da versão web** (`#0d0d1a`, roxo, hortelã/lavanda), **sem fluxo de PIX** no app.

## Escopo desta versão

- Criar sala (`POST /api/rooms/ios` com segredo no header)
- Entrar em sala por ID
- Chat de texto + fotos
- Indicador de digitação
- Encerrar conversa
- **Branding:** fundo escuro, botão primário roxo (estilo «Abrir painel» na home web)
- **Ícone do app** a partir do `public/ghost-logo.svg` (PNG 1024 gerado para o AppIcon)
- **Launch screen** (`LaunchScreen.storyboard`) com logótipo centrado e fundo `#0d0d1a`

## Identidade do app (fixa)

- **Bundle ID:** `com.ghosthchat`
- **Nome no ícone / ecrã:** GhostChat (`CFBundleDisplayName`)
- O ficheiro **`project.yml`** é a fonte de verdade; o `.xcodeproj` gera-se com XcodeGen. Não repor o `project.pbxproj` de versões antigas sem alinhar o YAML.

## Segredo da API (obrigatório para criar sala em produção)

O endpoint `POST /api/rooms/ios` é **HTTPS público**: o servidor exige o mesmo valor que **`GHOSTCHAT_IOS_API_SECRET`** na Vercel (header) para evitar criação massiva de salas por scripts. Não substitui App Attest, mas é simples de operar.

**Método recomendado (TestFlight / App Store):** edita **`GhostChatSecrets.swift`** e preenche `iosApiSecret` com o **mesmo** texto que na Vercel (string literal, sem aspas extra). Variáveis só no **Scheme → Run** não vão no binário de distribuição.

Opcional: `Config/Secrets.local.xcconfig` (gitignored) para outras definições; o Info.plist gerado **não** embute chaves custom fiáveis só com `INFOPLIST_KEY_*` — por isso o Swift acima é o caminho estável.

Depois de alterar `project.yml`, corre `xcodegen generate` antes do Archive.

## Abrir o projeto

Na raiz `ios/GhostChatIOS/`:

```bash
xcodegen generate
open GhostChat.xcodeproj
```

Requisitos: **Xcode 15+**, **iOS 17+**, e **XcodeGen** (`brew install xcodegen`) para regenerar o `.xcodeproj` a partir de `project.yml`.

## Backend

Fixo em código: `ChatViewModel.backendBaseURLString` (HTTPS de produção).

## Notas

- O app não mostra PIX nem ecrã de planos.
- Criar sala depende das regras do servidor (ex.: 402 se não houver entitlement).
- Ícones/registo: o `AppIcon` usa imagem **1024×1024** gerada a partir do mesmo SVG da web; para publicar na App Store, confirme no Xcode **Assets** se o conjunto de ícones está válido para a build alvo. Depois de alterar `project.yml`, corra `xcodegen generate` para o `Assets.xcassets` continuar referenciado no alvo (sem isso o bundle pode sair sem ícone).
