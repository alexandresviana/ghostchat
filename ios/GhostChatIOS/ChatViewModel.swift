import Foundation
import UIKit

@MainActor
final class ChatViewModel: ObservableObject {
    /// Base HTTPS do site/API (mesmo host que o Next em produção): pedidos relativos tipo `/api/rooms`, `/api/rooms/{id}/messages`, etc.
    /// HTTP 502 costuma vir do proxy/hosting (origem offline ou erro no servidor), não de um path inventado no cliente.
    static let backendBaseURLString = "https://ghosth.chat"

    @Published var roomId: String = ""
    @Published var messages: [MessageDTO] = []
    @Published var messageText: String = ""
    @Published var othersTyping: Bool = false
    @Published var isLoading: Bool = false
    @Published var ended: Bool = false
    @Published var errorMessage: String?

    let clientId: String
    private var pollTask: Task<Void, Never>?

    init() {
        let key = "ghostchat.clientId"
        if let existing = UserDefaults.standard.string(forKey: key), !existing.isEmpty {
            self.clientId = existing
        } else {
            let generated = UUID().uuidString
            UserDefaults.standard.set(generated, forKey: key)
            self.clientId = generated
        }
    }

    func createRoom() async {
        await withClient { [self] client in
            self.isLoading = true
            defer { self.isLoading = false }
            let room = try await client.createRoom()
            self.roomId = room.id
            self.ended = false
            self.errorMessage = nil
        }
    }

    var shareRoomURLString: String {
        let id = roomId.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !id.isEmpty else { return "" }
        let enc = id.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? id
        return "\(Self.backendBaseURLString)/c/\(enc)"
    }

    func connect(roomId: String) async {
        self.roomId = roomId.trimmingCharacters(in: .whitespacesAndNewlines)
        await withClient { [self] client in
            try await self.startRoom(client: client)
        }
    }

    func sendCurrentMessage() async {
        guard !messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        let text = messageText
        messageText = ""
        await withClient { [self] client in
            guard !self.roomId.isEmpty, !self.ended else { return }
            _ = try await client.sendMessage(roomId: self.roomId, clientId: self.clientId, text: text, mediaUrl: nil)
            try await self.loadMessages(client: client)
        }
    }

    func sendImage(_ image: UIImage) async {
        guard let jpeg = image.jpegData(compressionQuality: 0.82) else { return }
        await withClient { [self] client in
            guard !self.roomId.isEmpty, !self.ended else { return }
            let url = try await client.uploadImage(roomId: self.roomId, imageData: jpeg)
            _ = try await client.sendMessage(roomId: self.roomId, clientId: self.clientId, text: "📷", mediaUrl: url)
            try await self.loadMessages(client: client)
        }
    }

    func setTyping(active: Bool) async {
        await withClient { [self] client in
            guard !self.roomId.isEmpty, !self.ended else { return }
            try await client.sendTyping(roomId: self.roomId, clientId: self.clientId, active: active)
        }
    }

    func endConversation() async {
        await withClient { [self] client in
            guard !self.roomId.isEmpty else { return }
            try await client.endRoom(roomId: self.roomId)
            self.ended = true
            self.stopPolling()
        }
    }

    func stopPolling() {
        pollTask?.cancel()
        pollTask = nil
    }

    deinit {
        pollTask?.cancel()
    }

    private func startRoom(client: APIClient) async throws {
        _ = try await client.roomInfo(roomId: roomId)
        errorMessage = nil
        ended = false
        try await loadMessages(client: client)
        startPolling(client: client)
    }

    private func loadMessages(client: APIClient) async throws {
        do {
            let payload = try await client.listMessages(roomId: roomId, clientId: clientId)
            messages = payload.messages
            othersTyping = payload.othersTyping ?? false
        } catch let APIClientError.server(_, status) where status == 404 {
            ended = true
            stopPolling()
        } catch {
            throw error
        }
    }

    private func startPolling(client: APIClient) {
        stopPolling()
        pollTask = Task { [weak self] in
            guard let self else { return }
            while !Task.isCancelled {
                do {
                    try await self.loadMessages(client: client)
                } catch {
                    self.errorMessage = error.localizedDescription
                }
                try? await Task.sleep(nanoseconds: 2_500_000_000)
            }
        }
    }

    private func withClient(_ operation: @escaping (APIClient) async throws -> Void) async {
        do {
            let client = try APIClient(baseURLString: Self.backendBaseURLString)
            try await operation(client)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

