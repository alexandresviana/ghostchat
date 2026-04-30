import SwiftUI

/// Orquestra a tela de entrada animada e o resto da app.
struct RootShellView: View {
    @State private var showEntrySplash = true
    @State private var pendingDeepLinkRoomId: String?

    var body: some View {
        ZStack {
            if showEntrySplash {
                EntrySplashView {
                    withAnimation(.spring(response: 0.45, dampingFraction: 0.88)) {
                        showEntrySplash = false
                    }
                }
                .transition(.asymmetric(insertion: .opacity, removal: .opacity.combined(with: .scale(scale: 0.98))))
            } else {
                NavigationStack {
                    HomeView(
                        deepLinkRoomId: pendingDeepLinkRoomId,
                        onDeepLinkConsumed: { pendingDeepLinkRoomId = nil }
                    )
                }
                .transition(.opacity)
            }
        }
        .tint(GhostTheme.lavender)
        .preferredColorScheme(.dark)
        .ghostChrome()
        .screenRecordingShield()
        .onOpenURL { url in
            if let roomId = extractRoomId(from: url) {
                pendingDeepLinkRoomId = roomId
            }
        }
    }

    private func extractRoomId(from url: URL) -> String? {
        // Universal Link: https://ghosth.chat/c/{roomId}
        if let host = url.host?.lowercased(),
           ["ghosth.chat", "www.ghosth.chat"].contains(host) {
            let parts = url.pathComponents.filter { $0 != "/" }
            if parts.count >= 2, parts[0] == "c" {
                return parts[1].trimmingCharacters(in: .whitespacesAndNewlines)
            }
        }
        // Fallback custom scheme: ghostchat://c/{roomId}
        if url.scheme?.lowercased() == "ghostchat" {
            if let host = url.host, host == "c" {
                let parts = url.pathComponents.filter { $0 != "/" }
                if let first = parts.first {
                    return first.trimmingCharacters(in: .whitespacesAndNewlines)
                }
            }
            let parts = url.pathComponents.filter { $0 != "/" }
            if parts.count >= 2, parts[0] == "c" {
                return parts[1].trimmingCharacters(in: .whitespacesAndNewlines)
            }
        }
        return nil
    }
}
