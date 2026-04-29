import SwiftUI

@main
struct GhostChatIOSApp: App {
    var body: some Scene {
        WindowGroup {
            NavigationStack {
                HomeView()
            }
            .tint(GhostTheme.lavender)
            .preferredColorScheme(.dark)
            .ghostChrome()
        }
    }
}
