import SwiftUI

/// Orquestra a tela de entrada animada e o resto da app.
struct RootShellView: View {
    @State private var showEntrySplash = true

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
                    HomeView()
                }
                .transition(.opacity)
            }
        }
        .tint(GhostTheme.lavender)
        .preferredColorScheme(.dark)
        .ghostChrome()
    }
}
