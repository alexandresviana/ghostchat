import PhotosUI
import SwiftUI

struct RoomView: View {
    @ObservedObject var vm: ChatViewModel
    @State private var selectedPhoto: PhotosPickerItem?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            GhostTheme.background.ignoresSafeArea()

            VStack(spacing: 14) {
                chatHeaderCard

                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 10) {
                            ForEach(vm.messages) { message in
                                messageRow(message)
                                    .id(message.id)
                            }
                            if vm.othersTyping && !vm.ended {
                                Text("A outra pessoa está a escrever…")
                                    .font(.system(size: 12, weight: .medium, design: .rounded))
                                    .foregroundStyle(GhostTheme.lavender.opacity(0.85))
                                    .padding(.horizontal, 4)
                                    .padding(.top, 4)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                    .onChange(of: vm.messages.count) { _, _ in
                        if let last = vm.messages.last {
                            withAnimation {
                                proxy.scrollTo(last.id, anchor: .bottom)
                            }
                        }
                    }
                }

                if let err = vm.errorMessage {
                    Text(err)
                        .font(.system(size: 12, weight: .regular, design: .rounded))
                        .foregroundStyle(Color.red.opacity(0.9))
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 6)
                }

                if vm.ended {
                    endedFooter
                } else {
                    composerRow
                    endConversationRow
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
            .padding(.bottom, 20)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 8) {
                        Image("Logo")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 26, height: 26)
                        Text(vm.ended ? "Conversa terminada" : "Sala confidencial")
                            .font(.system(size: 16, weight: .semibold, design: .rounded))
                            .foregroundStyle(GhostTheme.foreground)
                    }
                }
                ToolbarItem(placement: .topBarLeading) {
                    Button("← Início") {
                        vm.stopPolling()
                        Task { await vm.setTyping(active: false) }
                        dismiss()
                    }
                    .foregroundStyle(GhostTheme.lavender.opacity(0.92))
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                }
            }

            .task {
                await vm.connect(roomId: vm.roomId)
            }
            .onChange(of: selectedPhoto) { _, item in
                guard let item else { return }
                Task {
                    if let data = try? await item.loadTransferable(type: Data.self),
                       let image = UIImage(data: data) {
                        await vm.sendImage(image)
                    }
                    selectedPhoto = nil
                }
            }
            .onDisappear {
                vm.stopPolling()
                Task { await vm.setTyping(active: false) }
            }
            .toolbarBackground(GhostTheme.background, for: .navigationBar)
        }
    }

    private var chatHeaderCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Link desta sala (partilha com a outra pessoa)")
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .foregroundStyle(GhostTheme.lavender.opacity(0.92))

            Text(vm.shareRoomURLString.isEmpty ? "—" : vm.shareRoomURLString)
                .font(.system(size: 13, weight: .regular, design: .rounded))
                .foregroundStyle(GhostTheme.foreground.opacity(0.78))
                .lineLimit(3)

            Divider()
                .background(GhostTheme.lavender.opacity(0.2))

            HStack(spacing: 12) {
                Text(vm.ended ? "Sala encerrada" : "Ao vivo")
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundStyle(vm.ended ? Color.red.opacity(0.85) : GhostTheme.mint)
                Spacer()
            }
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(GhostTheme.lavender.opacity(0.28), lineWidth: 1)
                .background(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(Color(red: 26 / 255, green: 21 / 255, blue: 48 / 255).opacity(0.45))
                )
        )
    }

    private func messageRow(_ message: MessageDTO) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            if !message.body.isEmpty {
                Text(message.body)
                    .font(.system(size: 16, weight: .regular, design: .rounded))
                    .foregroundStyle(GhostTheme.foreground.opacity(0.94))
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            if let media = message.mediaUrl, let url = URL(string: media) {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .scaledToFit()
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                } placeholder: {
                    ProgressView().tint(GhostTheme.lavender)
                }
                .frame(maxHeight: 240)
            }

            if let time = message.displayTime {
                Text(time)
                    .font(.system(size: 11, weight: .regular, design: .rounded))
                    .foregroundStyle(GhostTheme.lavender.opacity(0.7))
                    .frame(maxWidth: .infinity, alignment: .trailing)
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(GhostTheme.lavender.opacity(0.2), lineWidth: 1)
                .background(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(Color(red: 13 / 255, green: 13 / 255, blue: 26 / 255).opacity(0.25))
                )
        )
    }

    private var endedFooter: some View {
        VStack(spacing: 12) {
            Text("Esta conversa terminou.")
                .font(.system(size: 15, weight: .medium, design: .rounded))
                .foregroundStyle(GhostTheme.foreground.opacity(0.86))
                .multilineTextAlignment(.center)

            Button("Voltar ao início") {
                vm.stopPolling()
                dismiss()
            }
            .buttonStyle(GhostPrimaryButtonStyle())
        }
        .padding(.top, 8)
    }

    private var composerRow: some View {
        HStack(alignment: .bottom, spacing: 10) {
            PhotosPicker(selection: $selectedPhoto, matching: .images) {
                Image(systemName: "camera.fill")
                    .font(.system(size: 20))
                    .foregroundStyle(GhostTheme.mint)
                    .padding(10)
                    .background(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(GhostTheme.lavender.opacity(0.35), lineWidth: 1)
                    )
            }

            TextField(
                "",
                text: $vm.messageText,
                prompt: Text("Escreve uma mensagem…").foregroundStyle(GhostTheme.lavender.opacity(0.45)),
                axis: .vertical
            )
            .lineLimit(1...6)
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .foregroundStyle(GhostTheme.foreground)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(GhostTheme.lavender.opacity(0.35), lineWidth: 1)
                    .background(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(Color(red: 26 / 255, green: 21 / 255, blue: 48 / 255).opacity(0.55))
                    )
            )
            .onChange(of: vm.messageText) { _, newText in
                Task { await vm.setTyping(active: !newText.isEmpty) }
            }

            Button {
                Task { await vm.sendCurrentMessage() }
            } label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.system(size: 30))
                    .foregroundStyle(canSend ? GhostTheme.mint : GhostTheme.lavender.opacity(0.35))
            }
            .disabled(!canSend)
        }
    }

    private var canSend: Bool {
        !vm.messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !vm.ended
    }

    private var endConversationRow: some View {
        Button {
            Task { await vm.endConversation() }
        } label: {
            Text("Encerrar conversa")
                .frame(maxWidth: .infinity)
        }
        .font(.system(size: 15, weight: .semibold, design: .rounded))
        .foregroundStyle(GhostTheme.foreground)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(GhostTheme.lavender.opacity(0.35), lineWidth: 1)
        )
    }
}
