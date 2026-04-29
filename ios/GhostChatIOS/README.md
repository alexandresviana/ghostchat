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

## Abrir o projeto

Na raiz `ios/GhostChatIOS/`:

```bash
xcodegen generate
open GhostChatIOS.xcodeproj
```

Requisitos: **Xcode 15+**, **iOS 17+**, e **XcodeGen** (`brew install xcodegen`) para regenerar o `.xcodeproj` a partir de `project.yml`.

## Backend

Fixo em código: `ChatViewModel.backendBaseURLString` (HTTPS de produção).

## Notas

- O app não mostra PIX nem ecrã de planos.
- Criar sala depende das regras do servidor (ex.: 402 se não houver entitlement).
- Ícones/registo: o `AppIcon` usa imagem **1024×1024** gerada a partir do mesmo SVG da web; para publicar na App Store, confirme no Xcode **Assets** se o conjunto de ícones está válido para a build alvo.
