import SwiftUI

struct HomeView: View {
    @StateObject private var vm = ChatViewModel()
    @State private var goToRoom = false
    var deepLinkRoomId: String?
    var onDeepLinkConsumed: (() -> Void)?

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
                            "Crie uma sala e compartilhe um link único: a conversa é privada e confidencial — só entra quem tiver o link. Texto, emojis e fotos; em 24 horas o acesso expira e os dados são apagados, ou use Encerrar no chat quando quiser.",
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
                            "Conexão segura.",
                            opacity: 0.55
                        )
                        .font(.system(size: 13, weight: .regular, design: .rounded))
                    }

                    VStack(spacing: 12) {
                        Text("Salas recentes (ainda válidas)")
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                            .foregroundStyle(GhostTheme.lavender.opacity(0.95))

                        if vm.recentRooms.isEmpty {
                            GhostTheme.bodyText("Nenhuma sala válida salva neste aparelho ainda.", opacity: 0.58)
                                .font(.system(size: 13, weight: .regular, design: .rounded))
                        } else {
                            VStack(spacing: 8) {
                                ForEach(vm.recentRooms) { room in
                                    HStack(spacing: 10) {
                                        Button {
                                            vm.roomId = room.id
                                            goToRoom = true
                                        } label: {
                                            VStack(alignment: .leading, spacing: 2) {
                                                Text(room.id)
                                                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                                                    .foregroundStyle(GhostTheme.foreground)
                                                    .lineLimit(1)
                                                if let exp = room.expiresAt {
                                                    Text("Válida até \(exp.formatted(date: .abbreviated, time: .shortened))")
                                                        .font(.system(size: 11, weight: .regular, design: .rounded))
                                                        .foregroundStyle(GhostTheme.lavender.opacity(0.7))
                                                }
                                            }
                                            .frame(maxWidth: .infinity, alignment: .leading)
                                        }
                                        .buttonStyle(.plain)

                                        Button(role: .destructive) {
                                            vm.removeRecentRoom(room.id)
                                        } label: {
                                            Image(systemName: "trash")
                                                .font(.system(size: 12, weight: .bold))
                                        }
                                        .buttonStyle(.borderless)
                                        .foregroundStyle(Color.red.opacity(0.85))
                                    }
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 10)
                                    .background(
                                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                                            .stroke(GhostTheme.lavender.opacity(0.28), lineWidth: 1)
                                            .background(
                                                RoundedRectangle(cornerRadius: 12, style: .continuous)
                                                    .fill(Color(red: 26 / 255, green: 21 / 255, blue: 48 / 255).opacity(0.45))
                                            )
                                    )
                                }
                            }
                        }
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
            RoomView(vm: vm, isPresented: $goToRoom)
        }
        .onChange(of: vm.roomId) { _, newValue in
            let trimmed = newValue.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmed.isEmpty, !goToRoom {
                goToRoom = true
            }
        }
        .onAppear {
            consumeDeepLinkIfNeeded(deepLinkRoomId)
        }
        .onChange(of: deepLinkRoomId) { _, newValue in
            consumeDeepLinkIfNeeded(newValue)
        }
    }

    private func consumeDeepLinkIfNeeded(_ maybeRoomId: String?) {
        guard let roomId = maybeRoomId?.trimmingCharacters(in: .whitespacesAndNewlines), !roomId.isEmpty else {
            return
        }
        vm.roomId = roomId
        goToRoom = true
        onDeepLinkConsumed?()
    }
}
