import UIKit
import Capacitor

/// Capacitor ko'prigi + ilovaning o'z plaginlari (mavsumiy ikonka, Sign in with Apple). SceneDelegate shu klassni ildiz qilib o'rnatadi.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(AppIconPlugin())
        bridge?.registerPluginInstance(AppleSignInPlugin())   // Sign in with Apple (faqat iOS; JS: registerPlugin('AppleSignIn'))
    }
}
