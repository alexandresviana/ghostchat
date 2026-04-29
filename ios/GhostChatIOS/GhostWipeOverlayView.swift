import SwiftUI

/// Duração alinhada a `GHOST_WIPE_DURATION_MS` em `GhostWipeOverlay.tsx`.
enum GhostWipeTiming {
    static let totalNanoseconds: UInt64 = 9_200_000_000
}

/// Fantasma “apaga” o ecrã — equivalente visual à sequência em `globals.css` (sweep + bloom + avatar).
struct GhostWipeOverlayView: View {
    let onComplete: () -> Void

    @State private var sweepProgress: CGFloat = 0
    @State private var bloomScale: CGFloat = 0.2
    @State private var bloomOpacity: Double = 0.25
    @State private var avatarBlur: CGFloat = 0
    @State private var avatarScale: CGFloat = 1
    @State private var avatarOpacity: Double = 1
    @State private var captionOpacity: Double = 0.95

    var body: some View {
        ZStack {
            Color(red: 13 / 255, green: 13 / 255, blue: 26 / 255)
                .ignoresSafeArea()

            GeometryReader { geo in
                let h = geo.size.height
                Color(red: 13 / 255, green: 13 / 255, blue: 26 / 255)
                    .frame(height: max(1, h * sweepProgress))
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
            }
            .ignoresSafeArea()

            RadialGradient(
                colors: [
                    Color(red: 126 / 255, green: 240 / 255, blue: 200 / 255).opacity(0.55),
                    Color(red: 123 / 255, green: 94 / 255, blue: 167 / 255).opacity(0.45),
                    Color(red: 13 / 255, green: 13 / 255, blue: 26 / 255).opacity(0.95),
                ],
                center: .center,
                startRadius: 8,
                endRadius: 260
            )
            .scaleEffect(bloomScale)
            .opacity(bloomOpacity)
            .allowsHitTesting(false)

            VStack(spacing: 16) {
                Image("Logo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 112, height: 112)
                    .shadow(color: GhostTheme.lavender.opacity(0.35), radius: 20, y: 6)

                Text("Apagando tudo…")
                    .font(.system(size: 19, weight: .semibold, design: .rounded))
                    .foregroundStyle(GhostTheme.foreground.opacity(0.9))
                    .multilineTextAlignment(.center)

                Text("O fantasma está limpando esta sala. Em instantes não restará nada.")
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundStyle(GhostTheme.lavender.opacity(0.8))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
                    .opacity(captionOpacity)
            }
            .scaleEffect(avatarScale)
            .blur(radius: avatarBlur)
            .opacity(avatarOpacity)
        }
        .task {
            await MainActor.run {
                withAnimation(.timingCurve(0.4, 0, 0.2, 1, duration: 2.8)) {
                    sweepProgress = 1
                }
                withAnimation(.timingCurve(0.22, 1, 0.36, 1, duration: 6.5)) {
                    bloomScale = 6
                    bloomOpacity = 1
                }
                withAnimation(.easeIn(duration: 7.5)) {
                    avatarScale = 1.35
                    avatarBlur = 14
                    avatarOpacity = 0
                }
                withAnimation(.easeOut(duration: 7)) {
                    captionOpacity = 0
                }
            }
            try? await Task.sleep(nanoseconds: GhostWipeTiming.totalNanoseconds)
            await MainActor.run {
                onComplete()
            }
        }
    }
}
