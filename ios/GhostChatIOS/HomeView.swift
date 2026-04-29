import SwiftUI

struct HomeView: View {
    @StateObject private var vm = ChatViewModel()
    @State private var joinRoomId: String = ""
    @State private var goToRoom = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Text("GhostChat iOS")
                    .font(.largeTitle.bold())

                Text("Sem fluxo de PIX no app. Crie ou entre numa sala.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)

                VStack(alignment: .leading, spacing: 8) {
                    Text("Backend URL")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    TextField("https://seu-dominio.com", text: $vm.baseURLString)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled(true)
                        .keyboardType(.URL)
                        .padding(10)
                        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 10))
                }

                Button {
                    Task { await vm.createRoom() }
                } label: {
                    if vm.isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                    } else {
                        Text("Criar nova sala")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(vm.isLoading)

                Divider().padding(.vertical, 8)

                VStack(alignment: .leading, spacing: 8) {
                    Text("Entrar por ID da sala")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    TextField("roomId", text: $joinRoomId)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled(true)
                        .padding(10)
                        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 10))
                    Button("Entrar na sala") {
                        vm.roomId = joinRoomId
                        goToRoom = true
                    }
                    .buttonStyle(.bordered)
                    .disabled(joinRoomId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }

                if let err = vm.errorMessage {
                    Text(err)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                        .padding(.top, 8)
                }

                Spacer()

            }
            .padding()
            .onChange(of: vm.roomId) { _, newValue in
                if !newValue.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    goToRoom = true
                }
            }
            .navigationDestination(isPresented: $goToRoom) {
                RoomView(vm: vm)
            }
        }
    }
}

