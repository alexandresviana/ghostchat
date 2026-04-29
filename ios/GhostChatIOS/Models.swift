import Foundation

struct APIErrorResponse: Codable {
    let error: String?
    let code: String?
}

struct RoomDTO: Codable {
    let id: String
    let slug: String?
    let createdAt: String?
    let expiresAt: String?
}

struct CreateRoomResponse: Codable {
    let room: RoomDTO
}

struct RoomInfoResponse: Codable {
    let room: RoomDTO
    let mediaUploadConfigured: Bool?
}

struct MessageDTO: Codable, Identifiable {
    let id: String
    let body: String
    let mediaUrl: String?
    let createdAt: String?
    let displayTime: String?
    /// Igual ao UUID em `ChatViewModel.clientId` quando a mensagem é deste dispositivo.
    let clientId: String?
}

struct MessagesResponse: Codable {
    let messages: [MessageDTO]
    let othersTyping: Bool?
}

struct SendMessageResponse: Codable {
    let message: MessageDTO
}

struct UploadResponse: Codable {
    let url: String
}

struct GenericOKResponse: Codable {
    let ok: Bool
}

