import Foundation

/// Mesmo valor que `GHOSTCHAT_IOS_API_SECRET` no servidor.
/// 1) Xcode → Product → Scheme → Edit Scheme → Run → Environment: `GHOSTCHAT_IOS_SECRET` ou `GHOSTCHAT_IOS_API_SECRET`
/// 2) Ou preencher `inlineReleaseSecret` abaixo só para Release (evitar em repos públicos).
private enum IOSNativeAPISecrets {
    private static let inlineReleaseSecret: String = ""

    static func resolvedSecret() -> String {
        for key in ["GHOSTCHAT_IOS_SECRET", "GHOSTCHAT_IOS_API_SECRET"] {
            if let v = ProcessInfo.processInfo.environment[key]?.trimmingCharacters(in: .whitespacesAndNewlines),
               !v.isEmpty {
                return v
            }
        }
        let inline = inlineReleaseSecret.trimmingCharacters(in: .whitespacesAndNewlines)
        return inline
    }
}

enum APIClientError: LocalizedError {
    case invalidBaseURL
    case invalidResponse
    case server(message: String, status: Int)
    case decoding

    var errorDescription: String? {
        switch self {
        case .invalidBaseURL:
            return "URL base inválida."
        case .invalidResponse:
            return "Resposta inválida do servidor."
        case .server(let message, let status):
            return "\(message) (HTTP \(status))"
        case .decoding:
            return "Erro ao interpretar resposta do servidor."
        }
    }
}

final class APIClient {
    private let jsonDecoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        return d
    }()

    /// Mesmas chaves que o fetch no navegador (`clientId`, `mediaUrl`) — não usar snake_case no body.
    private let jsonEncoder: JSONEncoder = {
        JSONEncoder()
    }()

    let baseURL: URL

    init(baseURLString: String) throws {
        guard let url = URL(string: baseURLString.trimmingCharacters(in: .whitespacesAndNewlines)),
              let scheme = url.scheme,
              (scheme == "http" || scheme == "https")
        else {
            throw APIClientError.invalidBaseURL
        }
        self.baseURL = url
    }

    func createRoom() async throws -> RoomDTO {
        let response: CreateRoomResponse = try await request(
            path: "/api/rooms/ios",
            method: "POST",
            body: Optional<String>.none
        )
        return response.room
    }

    func roomInfo(roomId: String) async throws -> RoomInfoResponse {
        try await request(path: "/api/rooms/\(encode(roomId))")
    }

    func listMessages(roomId: String, clientId: String) async throws -> MessagesResponse {
        try await request(
            path: "/api/rooms/\(encode(roomId))/messages?clientId=\(encodeQuery(clientId))"
        )
    }

    func sendTyping(roomId: String, clientId: String, active: Bool) async throws {
        struct Body: Codable {
            let clientId: String
            let active: Bool
        }
        let _: GenericOKResponse = try await request(
            path: "/api/rooms/\(encode(roomId))/typing",
            method: "POST",
            body: Body(clientId: clientId, active: active)
        )
    }

    func sendMessage(roomId: String, clientId: String, text: String, mediaUrl: String?) async throws -> MessageDTO {
        struct Body: Codable {
            let body: String
            let mediaUrl: String?
            let mediaKind: String?
            let clientId: String
        }
        let mediaKind = mediaUrl == nil ? nil : "image"
        let response: SendMessageResponse = try await request(
            path: "/api/rooms/\(encode(roomId))/messages",
            method: "POST",
            body: Body(body: text, mediaUrl: mediaUrl, mediaKind: mediaKind, clientId: clientId)
        )
        return response.message
    }

    func endRoom(roomId: String) async throws {
        let _: GenericOKResponse = try await request(
            path: "/api/rooms/\(encode(roomId))/end",
            method: "POST",
            body: Optional<String>.none
        )
    }

    func uploadImage(roomId: String, imageData: Data, fileName: String = "photo.jpg") async throws -> String {
        var request = URLRequest(url: fullURL(path: "/api/rooms/\(encode(roomId))/upload"))
        request.httpMethod = "POST"
        applyIosNativeSecret(&request)

        let boundary = "Boundary-\(UUID().uuidString)"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(fileName)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n".data(using: .utf8)!)
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIClientError.invalidResponse
        }
        if (200..<300).contains(http.statusCode) {
            guard let decoded = try? jsonDecoder.decode(UploadResponse.self, from: data) else {
                throw APIClientError.decoding
            }
            return decoded.url
        }
        throw try decodeError(data: data, status: http.statusCode)
    }

    private func request<T: Decodable>(
        path: String,
        method: String = "GET"
    ) async throws -> T {
        try await request(path: path, method: method, body: Optional<String>.none)
    }

    private func request<T: Decodable, B: Encodable>(
        path: String,
        method: String = "GET",
        body: B? = nil
    ) async throws -> T {
        var request = URLRequest(url: fullURL(path: path))
        request.httpMethod = method
        applyIosNativeSecret(&request)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try jsonEncoder.encode(body)
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIClientError.invalidResponse
        }
        guard (200..<300).contains(http.statusCode) else {
            throw try decodeError(data: data, status: http.statusCode)
        }
        guard let decoded = try? jsonDecoder.decode(T.self, from: data) else {
            throw APIClientError.decoding
        }
        return decoded
    }

    private func decodeError(data: Data, status: Int) throws -> APIClientError {
        if let parsed = try? jsonDecoder.decode(APIErrorResponse.self, from: data),
           let message = parsed.error, !message.isEmpty {
            return .server(message: message, status: status)
        }
        return .server(message: "Erro do servidor.", status: status)
    }

    /// Junta o caminho opcionalmente com `?query=…` ao host. **Não** usar `URL.appending(path:)` aqui:
    /// essa API codifica `?` como `%3F`, e `/messages%3FclientId=` retorna 404.
    private func fullURL(path: String) -> URL {
        if path.hasPrefix("//") || path.lowercased().hasPrefix("/http") {
            return URL(string: path) ?? baseURL
        }
        if let u = URL(string: path.hasPrefix("/") ? path : "/" + path, relativeTo: baseURL)?.absoluteURL {
            return u
        }
        return baseURL
    }

    private func encode(_ value: String) -> String {
        value.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? value
    }

    private func encodeQuery(_ value: String) -> String {
        let allowed = CharacterSet.urlQueryAllowed.subtracting(CharacterSet(charactersIn: "&+="))
        return value.addingPercentEncoding(withAllowedCharacters: allowed) ?? value
    }

    /// Cabeçalhos aceitos em `app/api/rooms/ios/route.ts` e rotas `/api/rooms/...` (também `Authorization: Bearer` se o proxy remover o X-*).
    private func applyIosNativeSecret(_ request: inout URLRequest) {
        let trimmed = IOSNativeAPISecrets.resolvedSecret()
        guard !trimmed.isEmpty else { return }
        request.setValue(trimmed, forHTTPHeaderField: "X-GhostChat-iOS-Secret")
        request.setValue("Bearer \(trimmed)", forHTTPHeaderField: "Authorization")
    }
}

