import SwiftUI

struct HomeView: View {
    @StateObject private var vm = ChatViewModel()
    @State private var joinRoomId: String = ""
    @State private var goToRoom = false

    var body: some View {
        ScrollView {
            VStack(spacing: 36) {
                    Image("Logo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 120, height: 120)
                        .shadow(color: GhostTheme.lavender.opacity(0.35), radius: 28, x: 0, y: 8)
                        .accessibilityLabel("Ghost Chat")

                    VStack(spacing: 12) {
                        GhostTheme.title("Ghost Chat")

                        GhostTheme.bodyText(
                            "Crie uma sala e partilhe um link único: a conversa é privada e confidencial — só entra quem tiver o link. Texto, emojis e fotos; em 24 horas o acesso expira e os dados são apagados, ou use Encerrar no chat quando quiser.",
                            opacity: 0.82
                        )
                        .padding(.horizontal, 4)
                    }

                    VStack(spacing: 14) {
                        Button {
                            Task { await vm.createRoom() }
                        } label: {
                            Group {
                                if vm.isLoading {
                                    ProgressView()
                                        .tint(GhostTheme.foreground)
                                        .padding(.vertical, 4)
                                } else {
                                    Text("Criar sala")
                                }
                            }
                            .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(GhostPrimaryButtonStyle())
                        .disabled(vm.isLoading)

                        GhostTheme.bodyText(
                            "Ligação segura (HTTPS). Sem PIX nesta versão nativa.",
                            opacity: 0.55
                        )
                        .font(.system(size: 13, weight: .regular, design: .rounded))
                    }

                    VStack(spacing: 12) {
                        Text("Já tens um ID de sala?")
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                            .foregroundStyle(GhostTheme.lavender.opacity(0.95))

                        TextField(
                            "",
                            text: $joinRoomId,
                            prompt: Text("ID da sala").foregroundStyle(GhostTheme.lavender.opacity(0.45))
                        )
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled(true)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 12)
                        .background(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .stroke(GhostTheme.lavender.opacity(0.35), lineWidth: 1)
                                .background(
                                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                                        .fill(Color(red: 26 / 255, green: 21 / 255, blue: 48 / 255).opacity(0.55))
                                )
                        )
                        .foregroundStyle(GhostTheme.foreground)

                        Button("Entrar na sala") {
                            vm.roomId = joinRoomId
                            goToRoom = true
                        }
                        .buttonStyle(.borderless)
                        .font(.system(size: 15, weight: .semibold, design: .rounded))
                        .foregroundStyle(GhostTheme.mint)
                        .disabled(joinRoomId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }

                    if let err = vm.errorMessage {
                        Text(err)
                            .font(.system(size: 13, weight: .regular, design: .rounded))
                            .foregroundStyle(Color.red.opacity(0.92))
                            .multilineTextAlignment(.center)
                            .padding(.top, 4)
                            .padding(.horizontal, 12)
                    }
            }
            .padding(.horizontal, 20)
            .padding(.top, 32)
            .padding(.bottom, 48)
            .frame(maxWidth: 520)
            .frame(maxWidth: .infinity)
        }
        .toolbar(.hidden, for: .navigationBar)
        .navigationDestination(isPresented: $goToRoom) {
            RoomView(vm: vm)
        }
        .onChange(of: vm.roomId) { _, newValue in
            let trimmed = newValue.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmed.isEmpty, !goToRoom {
                goToRoom = true
            }
        }
    }
}
