import SwiftUI

/// Tela de entrada in-app (além do LaunchScreen nativo): logo grande, brilho suave e CTA.
struct EntrySplashView: View {
    let onFinish: () -> Void

    @State private var showContent = false

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    GhostTheme.background,
                    Color(red: 32 / 255, green: 22 / 255, blue: 58 / 255),
                    GhostTheme.background,
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            TimelineView(.animation(minimumInterval: 1 / 30, paused: false)) { timeline in
                let t = timeline.date.timeIntervalSinceReferenceDate
                let pulse = (sin(t * 1.15) + 1) * 0.5

                RadialGradient(
                    colors: [
                        GhostTheme.lavender.opacity(0.2 + 0.22 * pulse),
                        Color.clear,
                    ],
                    center: .center,
                    startRadius: 20,
                    endRadius: 220
                )
                .frame(width: 420, height: 420)
                .offset(y: -80)
                .blur(radius: 28)
            }

            VStack(spacing: 0) {
                Spacer(minLength: 0)

                ZStack {
                    ForEach(0..<3, id: \.self) { ring in
                        Circle()
                            .stroke(
                                GhostTheme.lavender.opacity(0.08 + Double(ring) * 0.06),
                                lineWidth: 1.2
                            )
                            .frame(width: 148 + CGFloat(ring) * 36, height: 148 + CGFloat(ring) * 36)
                    }

                    Image("Logo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 140, height: 140)
                        .shadow(color: GhostTheme.mint.opacity(0.35), radius: 36, y: 10)
                        .shadow(color: GhostTheme.lavender.opacity(0.25), radius: 20, y: 0)
                }
                .padding(.bottom, 28)

                VStack(spacing: 12) {
                    Text("Ghost Chat")
                        .font(.system(size: 40, weight: .semibold, design: .rounded))
                        .foregroundStyle(GhostTheme.foreground)

                    Text("Conversas privadas, sem perfis públicos.\nSomente quem tiver o link entra na sala.")
                        .font(.system(size: 16, weight: .regular, design: .rounded))
                        .foregroundStyle(GhostTheme.foreground.opacity(0.78))
                        .multilineTextAlignment(.center)
                        .lineSpacing(4)
                        .padding(.horizontal, 28)
                }
                .opacity(showContent ? 1 : 0)
                .offset(y: showContent ? 0 : 12)
                .padding(.bottom, 36)

                Button(action: onFinish) {
                    Text("Começar")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(GhostPrimaryButtonStyle())
                .padding(.horizontal, 36)
                .opacity(showContent ? 1 : 0)
                .offset(y: showContent ? 0 : 16)

                Spacer(minLength: 0)

                Text("HTTPS · dados apagados ao expirar ou ao encerrar")
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundStyle(GhostTheme.lavender.opacity(0.55))
                    .padding(.bottom, 28)
                    .opacity(showContent ? 1 : 0)
            }
        }
        .onAppear {
            withAnimation(.spring(response: 0.85, dampingFraction: 0.82)) {
                showContent = true
            }
        }
    }
}
