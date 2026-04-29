import SwiftUI
import UIKit

/// `UITextField` com `isSecureTextEntry` sem roubar toques: o SO ainda pode mascarar em capturas no hardware real.
private final class SecureTextFieldShell: UITextField {
    override var canBecomeFirstResponder: Bool { false }

    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        for sub in subviews.reversed() {
            let p = convert(point, to: sub)
            if let hit = sub.hitTest(p, with: event) {
                return hit
            }
        }
        return nil
    }

    override func point(inside point: CGPoint, with event: UIEvent?) -> Bool {
        for sub in subviews {
            let p = convert(point, to: sub)
            if sub.point(inside: p, with: event) {
                return true
            }
        }
        return false
    }
}

/// Hierarquia dentro de `UITextField` com `isSecureTextEntry`, o que tende a mascarar em
/// **screenshots e gravações** no dispositivo físico. O Simulador pode ignorar esta proteção.
struct ScreenshotSecureHost<Content: View>: UIViewRepresentable {
    let content: Content

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> UIView {
        let field = SecureTextFieldShell()
        field.isSecureTextEntry = true
        field.isUserInteractionEnabled = true
        field.backgroundColor = .clear
        field.text = " "
        field.textColor = .clear
        field.tintColor = .clear
        field.autocorrectionType = .no
        field.spellCheckingType = .no
        return field
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        guard let field = uiView as? SecureTextFieldShell else { return }
        if context.coordinator.host == nil {
            context.coordinator.embed(content: content, in: field)
        } else {
            context.coordinator.host?.rootView = content
            context.coordinator.canvasView?.setNeedsLayout()
            context.coordinator.canvasView?.layoutIfNeeded()
        }
    }

    final class Coordinator {
        var host: UIHostingController<Content>?
        weak var canvasView: UIView?

        func embed(content: Content, in field: UITextField) {
            field.setNeedsLayout()
            field.layoutIfNeeded()

            let hc = UIHostingController(rootView: content)
            hc.view.backgroundColor = .clear

            /// O subview interno “grande” costuma ser a tela segura que o iOS mascara em capturas.
            let targetContainer: UIView = {
                let subs = field.subviews
                if subs.isEmpty { return field }
                return subs.max { a, b in
                    a.bounds.width * a.bounds.height < b.bounds.width * b.bounds.height
                } ?? field
            }()
            targetContainer.backgroundColor = .clear

            hc.view.translatesAutoresizingMaskIntoConstraints = false
            targetContainer.addSubview(hc.view)
            NSLayoutConstraint.activate([
                hc.view.topAnchor.constraint(equalTo: targetContainer.topAnchor),
                hc.view.bottomAnchor.constraint(equalTo: targetContainer.bottomAnchor),
                hc.view.leadingAnchor.constraint(equalTo: targetContainer.leadingAnchor),
                hc.view.trailingAnchor.constraint(equalTo: targetContainer.trailingAnchor),
            ])

            canvasView = targetContainer
            host = hc
            host?.view.isUserInteractionEnabled = true

            targetContainer.layoutIfNeeded()
        }
    }
}

extension View {
    /// Conteúdo tratado pelo SO como camada segura quando o mecanismo aplicar (em geral só no hardware real).
    func ghostScreenshotSecure() -> some View {
        ScreenshotSecureHost(content: self)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
