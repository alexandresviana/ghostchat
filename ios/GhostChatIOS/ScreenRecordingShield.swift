import SwiftUI
import UIKit

/// Oculta o conteúdo quando há gravação de tela ou espelhamento (`UIScreen.isCaptured`).
/// Screenshots são tratadas de outra forma: ver `SensitiveContentShield.swift` (`ghostScreenshotSecure()`).
struct ScreenRecordingShieldModifier: ViewModifier {
    @State private var isCaptured: Bool

    init() {
        _isCaptured = State(initialValue: Self.anyScreenCaptured())
    }

    func body(content: Content) -> some View {
        ZStack {
            content
            if isCaptured {
                Color(red: 0.04, green: 0.04, blue: 0.08).ignoresSafeArea()
                VStack(spacing: 16) {
                    Image(systemName: "eye.slash.fill")
                        .font(.system(size: 42))
                        .foregroundStyle(Color.white.opacity(0.85))
                    Text("Por privacidade, o conteúdo do Ghost Chat fica oculto enquanto a tela estiver sendo gravada ou espelhada.")
                        .font(.system(size: 16, weight: .medium, design: .rounded))
                        .foregroundStyle(Color.white.opacity(0.92))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 28)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .allowsHitTesting(!isCaptured)
        .onReceive(NotificationCenter.default.publisher(for: UIScreen.capturedDidChangeNotification)) { _ in
            isCaptured = Self.anyScreenCaptured()
        }
        .onAppear {
            isCaptured = Self.anyScreenCaptured()
        }
    }

    private static func anyScreenCaptured() -> Bool {
        UIApplication.shared.connectedScenes.lazy.compactMap { $0 as? UIWindowScene }.contains {
            $0.screen.isCaptured
        }
    }
}

extension View {
    func screenRecordingShield() -> some View {
        modifier(ScreenRecordingShieldModifier())
    }
}
