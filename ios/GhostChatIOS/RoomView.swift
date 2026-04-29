import PhotosUI
import SwiftUI
import UIKit

struct RoomView: View {
    @ObservedObject var vm: ChatViewModel
    @Binding var isPresented: Bool
    @FocusState private var composerFocused: Bool
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var copiedURLFeedback = false
    @State private var showEncerrarConfirmation = false

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
                                    .contentShape(Rectangle())
                                    .simultaneousGesture(
                                        TapGesture().onEnded { resignComposerFocus() }
                                    )
                            }
                            if vm.othersTyping && !vm.ended && !vm.wiping {
                                Text("A outra pessoa está digitando…")
                                    .font(.system(size: 12, weight: .medium, design: .rounded))
                                    .foregroundStyle(GhostTheme.lavender.opacity(0.85))
                                    .padding(.horizontal, 4)
                                    .padding(.top, 4)
                                    .contentShape(Rectangle())
                                    .simultaneousGesture(TapGesture().onEnded { resignComposerFocus() })
                            }
                            Color.clear
                                .frame(minHeight: 280)
                                .frame(maxWidth: .infinity)
                                .contentShape(Rectangle())
                                .onTapGesture { resignComposerFocus() }
                        }
                        .padding(.vertical, 4)
                        .frame(maxWidth: .infinity)
                        .simultaneousGesture(TapGesture().onEnded { resignComposerFocus() })
                    }
                    .scrollDismissesKeyboard(.interactively)
                    .onChange(of: vm.messages.count) { _, _ in
                        if let last = vm.messages.last {
                            withAnimation {
                                proxy.scrollTo(last.id, anchor: .bottom)
                            }
                        }
                    }
                }

                if let err = vm.errorMessage, !vm.wiping {
                    Text(err)
                        .font(.system(size: 12, weight: .regular, design: .rounded))
                        .foregroundStyle(Color.red.opacity(0.9))
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 6)
                }

                if vm.ended && !vm.wiping {
                    endedFooter
                } else if !vm.ended && !vm.wiping {
                    composerRow
                    endConversationRow
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
            .padding(.bottom, 20)

            if vm.wiping {
                GhostWipeOverlayView {
                    isPresented = false
                }
                .transition(.opacity)
                .zIndex(50)
            }
        }
        .ghostScreenshotSecure()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 8) {
                        Image("Logo")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 26, height: 26)
                        Text(vm.wiping ? "Apagando…" : (vm.ended ? "Conversa terminada" : "Sala confidencial"))
                            .font(.system(size: 16, weight: .semibold, design: .rounded))
                            .foregroundStyle(GhostTheme.foreground)
                    }
                }
                ToolbarItem(placement: .topBarLeading) {
                    Button("← Início") {
                        resignComposerFocus()
                        isPresented = false
                    }
                    .foregroundStyle(GhostTheme.lavender.opacity(0.92))
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                }
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Recolher") {
                        resignComposerFocus()
                    }
                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                    .foregroundStyle(GhostTheme.mint)
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
                vm.clearRoomNavigationState()
            }
            .toolbarBackground(GhostTheme.background, for: .navigationBar)
    }

    private var chatHeaderCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Link desta sala (compartilhe com a outra pessoa)")
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .foregroundStyle(GhostTheme.lavender.opacity(0.92))

            if vm.shareRoomURLString.isEmpty {
                Text("—")
                    .font(.system(size: 13, weight: .regular, design: .rounded))
                    .foregroundStyle(GhostTheme.foreground.opacity(0.78))
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                Text(vm.shareRoomURLString)
                    .font(.system(size: 13, weight: .regular, design: .rounded))
                    .foregroundStyle(GhostTheme.foreground.opacity(0.78))
                    .lineLimit(4)
                    .textSelection(.enabled)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            if !vm.shareRoomURLString.isEmpty {
                HStack(spacing: 10) {
                    Button(action: copyRoomLinkToPasteboard) {
                        Label(copiedURLFeedback ? "Copiado" : "Copiar link", systemImage: copiedURLFeedback ? "checkmark.circle.fill" : "doc.on.doc")
                            .font(.system(size: 13, weight: .semibold, design: .rounded))
                    }
                    .buttonStyle(.bordered)
                    .tint(GhostTheme.lavender.opacity(0.65))

                    if let shareURL = URL(string: vm.shareRoomURLString), shareURL.scheme != nil {
                        ShareLink(item: shareURL, message: Text("Sala Ghost Chat")) {
                            Label("Compartilhar", systemImage: "square.and.arrow.up")
                                .font(.system(size: 13, weight: .semibold, design: .rounded))
                        }
                        .buttonStyle(.bordered)
                        .tint(GhostTheme.mint.opacity(0.85))
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            Divider()
                .background(GhostTheme.lavender.opacity(0.2))

            HStack(spacing: 12) {
                Text(vm.wiping ? "Apagando…" : (vm.ended ? "Sala encerrada" : "Ao vivo"))
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundStyle(
                        vm.wiping ? GhostTheme.lavender.opacity(0.9)
                            : (vm.ended ? Color.red.opacity(0.85) : GhostTheme.mint)
                    )
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

    private func resignComposerFocus() {
        composerFocused = false
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
        for scene in UIApplication.shared.connectedScenes {
            guard let windowScene = scene as? UIWindowScene else { continue }
            for window in windowScene.windows where window.isKeyWindow {
                window.endEditing(true)
                return
            }
        }
    }

    private func copyRoomLinkToPasteboard() {
        guard !vm.shareRoomURLString.isEmpty else { return }
        UIPasteboard.general.string = vm.shareRoomURLString
        copiedURLFeedback = true
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            copiedURLFeedback = false
        }
    }

    private func messageRow(_ message: MessageDTO) -> some View {
        let mine = vm.isFromCurrentClient(message)

        return HStack(alignment: .bottom, spacing: 8) {
            if mine { Spacer(minLength: 4) }

            VStack(alignment: mine ? .trailing : .leading, spacing: 6) {
                Text(mine ? "Você" : "Outra pessoa")
                    .font(.system(size: 10, weight: .semibold, design: .rounded))
                    .foregroundStyle(GhostTheme.lavender.opacity(0.7))

                if !message.body.isEmpty {
                    Text(message.body)
                        .font(.system(size: 16, weight: .regular, design: .rounded))
                        .foregroundStyle(GhostTheme.foreground.opacity(0.94))
                        .multilineTextAlignment(mine ? .trailing : .leading)
                        .frame(maxWidth: .infinity, alignment: mine ? .trailing : .leading)
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
                        .foregroundStyle(GhostTheme.lavender.opacity(0.68))
                        .frame(maxWidth: .infinity, alignment: mine ? .trailing : .leading)
                }
            }
            .padding(12)
            .frame(maxWidth: 300, alignment: mine ? .trailing : .leading)
            .background(messageBubbleBackground(isMine: mine))

            if !mine { Spacer(minLength: 4) }
        }
    }

    private func messageBubbleBackground(isMine: Bool) -> some View {
        let fill: Color =
            isMine
            ? Color(red: 78 / 255, green: 58 / 255, blue: 118 / 255).opacity(0.55)
            : Color(red: 13 / 255, green: 13 / 255, blue: 26 / 255).opacity(0.32)
        let strokeOpacity: Double = isMine ? 0.42 : 0.22

        return RoundedRectangle(cornerRadius: 16, style: .continuous)
            .stroke(
                isMine ? GhostTheme.mint.opacity(strokeOpacity) : GhostTheme.lavender.opacity(strokeOpacity),
                lineWidth: 1
            )
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(fill)
            )
    }

    private var endedFooter: some View {
        VStack(spacing: 12) {
            Text("Esta conversa terminou.")
                .font(.system(size: 15, weight: .medium, design: .rounded))
                .foregroundStyle(GhostTheme.foreground.opacity(0.86))
                .multilineTextAlignment(.center)

            Button("Voltar ao início") {
                isPresented = false
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
                prompt: Text("Digite uma mensagem…").foregroundStyle(GhostTheme.lavender.opacity(0.45)),
                axis: .vertical
            )
            .focused($composerFocused)
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
        !vm.messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !vm.ended && !vm.wiping
    }

    private var endConversationRow: some View {
        Button {
            resignComposerFocus()
            showEncerrarConfirmation = true
        } label: {
            Text("Encerrar conversa")
                .frame(maxWidth: .infinity)
        }
        .font(.system(size: 15, weight: .semibold, design: .rounded))
        .foregroundStyle(Color.white.opacity(0.94))
        .padding(.vertical, 13)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color(red: 132 / 255, green: 38 / 255, blue: 58 / 255).opacity(0.94))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(Color.red.opacity(0.35), lineWidth: 1)
                )
        )
        .shadow(color: Color.red.opacity(0.15), radius: 8, x: 0, y: 2)
        .disabled(vm.wiping)
        .confirmationDialog(
            "Encerrar esta conversa?",
            isPresented: $showEncerrarConfirmation,
            titleVisibility: .visible
        ) {
            Button("Encerrar", role: .destructive) {
                Task { await vm.endConversation() }
            }
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text("A sala será encerrada para todos neste link. Não será possível continuar aqui nem desfazer no app.")
        }
    }
}
