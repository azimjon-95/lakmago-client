import UIKit
import Capacitor

/// Capacitor ko'prigi + ilovaning o'z plaginlari (mavsumiy ikonka). SceneDelegate shu klassni ildiz qilib o'rnatadi.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(AppIconPlugin())
    }
}
