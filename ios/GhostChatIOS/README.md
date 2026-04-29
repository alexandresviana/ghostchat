# GhostChat iOS (SwiftUI)

MVP nativo iOS da aplicacao GhostChat, sem fluxo de pagamento PIX no app.

## Escopo desta versao

- Criar sala (`POST /api/rooms`)
- Entrar em sala por ID
- Chat de texto
- Upload de imagem para sala
- Indicador de digitacao
- Encerrar conversa

## Requisitos

- Xcode 15+ (recomendado Xcode 16+)
- iOS 17+
- Backend GhostChat em execucao e acessivel via HTTPS (ou HTTP em rede local configurada no iOS)

## Como iniciar

1. Abra o Xcode e crie um novo projeto **iOS App (SwiftUI)** chamado `GhostChatIOS`.
2. Dentro do projeto criado, substitua os arquivos Swift pelos arquivos desta pasta:
   - `GhostChatIOSApp.swift`
   - `Models.swift`
   - `APIClient.swift`
   - `ChatViewModel.swift`
   - `HomeView.swift`
   - `RoomView.swift`
3. Defina o deployment target para iOS 17.
4. Rode no simulador.

## Observacoes

- O app nao mostra PIX nem tela de planos.
- A criacao de sala depende das regras do backend:
  - Se houver sessao/tokens validos no servidor, cria normalmente.
  - Se o backend exigir pagamento para criar sala e nao houver sessao, a API retorna 402.
- Mesmo sem criar sala, o app pode entrar e conversar em salas existentes via ID.
