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

O servidor espera o mesmo valor que **`GHOSTCHAT_IOS_API_SECRET`** na Vercel. Variáveis só no **Scheme → Run** do Xcode **não** vão para TestFlight/App Store — o binário precisa do segredo na build.

1. Copia `Config/Secrets.local.example.xcconfig` para **`Config/Secrets.local.xcconfig`** (este ficheiro está no `.gitignore`).
2. Edita uma linha: `GHOSTCHAT_IOS_API_SECRET = ` o mesmo segredo da Vercel, **sem aspas** e sem espaços extra.
3. Na pasta `ios/GhostChatIOS/`: `xcodegen generate` e volta a fazer **Archive** / enviar build.

Em CI, gera `Secrets.local.xcconfig` a partir de um segredo armazenado no pipeline antes do `xcodebuild`, ou exporta `GHOSTCHAT_IOS_API_SECRET` no ambiente do `xcodebuild` (o Info.plist usa `$(GHOSTCHAT_IOS_API_SECRET)`).

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
- Ícones/registo: o `AppIcon` usa imagem **1024×1024** gerada a partir do mesmo SVG da web; para publicar na App Store, confirme no Xcode **Assets** se o conjunto de ícones está válido para a build alvo.
