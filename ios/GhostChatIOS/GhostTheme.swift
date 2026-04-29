import SwiftUI

/// Cores do `styles/theme.ts` / web (--background / ghostTheme).
enum GhostTheme {
    static let background = Color(red: 13 / 255, green: 13 / 255, blue: 26 / 255)
    static let foreground = Color(red: 245 / 255, green: 240 / 255, blue: 255 / 255)
    static let purple = Color(red: 123 / 255, green: 94 / 255, blue: 167 / 255)
    static let lavender = Color(red: 196 / 255, green: 176 / 255, blue: 232 / 255)
    static let mint = Color(red: 126 / 255, green: 240 / 255, blue: 200 / 255)

    /// Título estilo Fredoka na web (`font-display`).
    static func title(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 36, weight: .semibold, design: .rounded))
            .foregroundStyle(foreground)
    }

    /// Corpo estilo web (Nunito ~ SF rounded).
    static func bodyText(_ text: String, opacity: Double = 0.85) -> some View {
        Text(text)
            .font(.system(size: 17, weight: .regular, design: .rounded))
            .foregroundStyle(foreground.opacity(opacity))
            .multilineTextAlignment(.center)
    }

}

struct GhostPrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 17, weight: .semibold, design: .rounded))
            .foregroundStyle(GhostTheme.foreground)
            .padding(.horizontal, 28)
            .padding(.vertical, 14)
            .background(GhostTheme.purple.opacity(configuration.isPressed ? 0.85 : 1))
            .clipShape(Capsule())
    }
}

struct GhostChromeBackground: ViewModifier {
    func body(content: Content) -> some View {
        content
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(GhostTheme.background)
    }
}

extension View {
    func ghostChrome() -> some View {
        modifier(GhostChromeBackground())
    }
}
