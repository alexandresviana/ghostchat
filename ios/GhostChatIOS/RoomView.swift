import PhotosUI
import SwiftUI

struct RoomView: View {
    @ObservedObject var vm: ChatViewModel
    @State private var selectedPhoto: PhotosPickerItem?

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Sala: \(vm.roomId)")
                    .font(.headline)
                Spacer()
                if vm.ended {
                    Text("Encerrada")
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(.red.opacity(0.15), in: Capsule())
                }
            }

            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 8) {
                        ForEach(vm.messages) { message in
                            VStack(alignment: .leading, spacing: 4) {
                                if !message.body.isEmpty {
                                    Text(message.body)
                                }
                                if let media = message.mediaUrl,
                                   let url = URL(string: media) {
                                    AsyncImage(url: url) { image in
                                        image
                                            .resizable()
                                            .scaledToFit()
                                            .clipShape(RoundedRectangle(cornerRadius: 10))
                                    } placeholder: {
                                        ProgressView()
                                    }
                                    .frame(maxHeight: 220)
                                }
                                if let time = message.displayTime {
                                    Text(time)
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            .padding(10)
                            .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))
                            .id(message.id)
                        }
                        if vm.othersTyping && !vm.ended {
                            Text("A outra pessoa esta digitando...")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
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
                    .font(.footnote)
                    .foregroundStyle(.red)
            }

            if vm.ended {
                VStack(spacing: 8) {
                    Text("Esta conversa foi encerrada.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Button("Voltar") {
                        vm.stopPolling()
                    }
                    .buttonStyle(.bordered)
                }
            } else {
                HStack(alignment: .bottom, spacing: 8) {
                    PhotosPicker(selection: $selectedPhoto, matching: .images) {
                        Image(systemName: "photo")
                            .padding(8)
                    }
                    .buttonStyle(.bordered)

                    TextField("Mensagem", text: $vm.messageText, axis: .vertical)
                        .lineLimit(1...4)
                        .textFieldStyle(.roundedBorder)
                        .onChange(of: vm.messageText) { _, newText in
                            Task { await vm.setTyping(active: !newText.isEmpty) }
                        }

                    Button("Enviar") {
                        Task { await vm.sendCurrentMessage() }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(vm.messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }

                Button(role: .destructive) {
                    Task { await vm.endConversation() }
                } label: {
                    Text("Encerrar conversa")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
            }
        }
        .padding()
        .navigationTitle("Chat")
        .navigationBarTitleDisplayMode(.inline)
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
    }
}

