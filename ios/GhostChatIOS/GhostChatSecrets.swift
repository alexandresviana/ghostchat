import Foundation

/// Mesmo valor que `GHOSTCHAT_IOS_API_SECRET` na Vercel.
/// Preenche aqui antes do Archive (TestFlight). Em repos públicos, usa `git update-index --skip-worktree` neste ficheiro ou CI com substituição segura.
/// Deixa vazio para tentar só variáveis do Scheme (Xcode) ou `GhostChatIosApiSecret` no Info.plist (se configurado).
enum GhostChatSecrets {
    static let iosApiSecret: String = ""
}
