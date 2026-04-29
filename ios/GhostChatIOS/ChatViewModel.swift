import Foundation
import UIKit

@MainActor
final class ChatViewModel: ObservableObject {
    /// Base HTTPS do site/API: requisições relativas como `/api/rooms`, `/api/rooms/{id}/messages`, etc.
    static let backendBaseURLString = "https://ghosth.chat"

    @Published var roomId: String = ""
    @Published var messages: [MessageDTO] = []
    @Published var messageText: String = ""
    @Published var othersTyping: Bool = false
    @Published var isLoading: Bool = false
    @Published var ended: Bool = false
    @Published var wiping: Bool = false
    @Published var errorMessage: String?

    let clientId: String
    private var pollTask: Task<Void, Never>?
    private var hadSuccessfulRoomLoad = false
    private var roomExpiresAt: Date?

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
            self.wiping = false
            self.errorMessage = nil
        }
    }

    var shareRoomURLString: String {
        let id = roomId.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !id.isEmpty else { return "" }
        let enc = id.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? id
        return "\(Self.backendBaseURLString)/c/\(enc)"
    }

    func isFromCurrentClient(_ message: MessageDTO) -> Bool {
        guard let sender = message.clientId, !sender.isEmpty else { return false }
        return sender == clientId
    }

    func connect(roomId: String) async {
        let trimmed = roomId.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        self.roomId = trimmed
        await withClient { [self] client in
            try await self.startRoom(client: client)
        }
    }

    func sendCurrentMessage() async {
        guard !messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        let text = messageText
        messageText = ""
        await withClient { [self] client in
            guard !self.roomId.isEmpty, !self.ended, !self.wiping else { return }
            _ = try await client.sendMessage(roomId: self.roomId, clientId: self.clientId, text: text, mediaUrl: nil)
            try await self.loadMessages(client: client)
        }
    }

    func sendImage(_ image: UIImage) async {
        guard let jpeg = image.jpegData(compressionQuality: 0.82) else { return }
        await withClient { [self] client in
            guard !self.roomId.isEmpty, !self.ended, !self.wiping else { return }
            let url = try await client.uploadImage(roomId: self.roomId, imageData: jpeg)
            _ = try await client.sendMessage(roomId: self.roomId, clientId: self.clientId, text: "📷", mediaUrl: url)
            try await self.loadMessages(client: client)
        }
    }

    func setTyping(active: Bool) async {
        await withClient { [self] client in
            guard !self.roomId.isEmpty, !self.ended, !self.wiping else { return }
            try await client.sendTyping(roomId: self.roomId, clientId: self.clientId, active: active)
        }
    }

    func endConversation() async {
        await withClient { [self] client in
            guard !self.roomId.isEmpty else { return }
            try await client.endRoom(roomId: self.roomId)
            self.stopPolling()
            self.wiping = true
        }
    }

    /// Limpa estado da sala ao sair da navegação (voltar, wipe concluído, etc.).
    func clearRoomNavigationState() {
        stopPolling()
        Task { await setTyping(active: false) }
        wiping = false
        ended = false
        hadSuccessfulRoomLoad = false
        roomExpiresAt = nil
        roomId = ""
        messages = []
        othersTyping = false
        messageText = ""
        errorMessage = nil
    }

    func stopPolling() {
        pollTask?.cancel()
        pollTask = nil
    }

    deinit {
        pollTask?.cancel()
    }

    private func parseExpiresAt(_ iso: String?) -> Date? {
        guard let iso, !iso.isEmpty else { return nil }
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = f.date(from: iso) { return d }
        f.formatOptions = [.withInternetDateTime]
        return f.date(from: iso)
    }

    private func startRoom(client: APIClient) async throws {
        let info = try await client.roomInfo(roomId: roomId)
        roomExpiresAt = parseExpiresAt(info.room.expiresAt)
        errorMessage = nil
        ended = false
        wiping = false
        try await loadMessages(client: client)
        if ended || wiping { return }
        hadSuccessfulRoomLoad = true
        startPolling(client: client)
    }

    private func loadMessages(client: APIClient) async throws {
        do {
            let payload = try await client.listMessages(roomId: roomId, clientId: clientId)
            messages = payload.messages
            othersTyping = payload.othersTyping ?? false
            if let exp = roomExpiresAt, Date() >= exp, !wiping {
                wiping = true
                stopPolling()
            }
        } catch let APIClientError.server(_, status) where status == 404 {
            stopPolling()
            if hadSuccessfulRoomLoad {
                wiping = true
            } else {
                ended = true
            }
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
