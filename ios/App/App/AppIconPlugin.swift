import Foundation
import UIKit
import Capacitor

/*
 Mavsumiy ilova ikonkasi (iOS): alternate app icon. JS: registerPlugin('AppIcon') — getCurrent() → { theme }, setIcon({ theme }) → { theme, changed }.

 Mavzular: "default" (asosiy AppIcon) + Assets.xcassets dagi AppIcon-<Mavzu>.appiconset to'plamlari. Ular
 project.pbxproj dagi ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES ga yozilgan (Debug va Release).
 Ro'yxat src/lib/appIconSchedule.js (ICON_THEMES) bilan bir xil bo'lishi shart — tests/appIconNative.test.mjs tekshiradi.

 DIQQAT (Apple cheklovi): ikonka almashganda iOS foydalanuvchiga tizim oynasini ko'rsatadi
 ("Siz 'Lokma Go' ikonkasini o'zgartirdingiz"). Uni jimgina o'tkazish ochiq API'da yo'q — shuning uchun faqat mavzu HAQIQATAN
 o'zgargandagina chaqiriladi (yiliga ~7 marta). Faqat ilova oldingi planda (active) bo'lganda ishlaydi.
*/
@objc(AppIconPlugin)
public class AppIconPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppIconPlugin"
    public let jsName = "AppIcon"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getCurrent", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setIcon", returnType: CAPPluginReturnPromise)
    ]

    private static let assetNames: [String: String] = [
        "spring": "AppIcon-Spring",
        "summer": "AppIcon-Summer",
        "autumn": "AppIcon-Autumn",
        "ramadan": "AppIcon-Ramadan",
        "newyear": "AppIcon-NewYear"
    ]

    @objc func getCurrent(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let name = UIApplication.shared.alternateIconName
            let theme = AppIconPlugin.assetNames.first(where: { $0.value == name })?.key ?? "default"
            call.resolve(["theme": theme])
        }
    }

    @objc func setIcon(_ call: CAPPluginCall) {
        guard let theme = call.getString("theme") else {
            call.reject("theme kerak")
            return
        }
        let target: String?
        if theme == "default" {
            target = nil                       // asosiy AppIcon
        } else if let name = AppIconPlugin.assetNames[theme] {
            target = name
        } else {
            call.reject("Noma'lum mavzu: \(theme)")
            return
        }
        DispatchQueue.main.async {
            let app = UIApplication.shared
            guard app.supportsAlternateIcons else {
                call.reject("Bu qurilma ikonka almashtirishni qo'llamaydi")
                return
            }
            if app.alternateIconName == target {
                call.resolve(["theme": theme, "changed": false])
                return
            }
            app.setAlternateIconName(target) { error in
                if let error = error {
                    call.reject(error.localizedDescription)
                } else {
                    call.resolve(["theme": theme, "changed": true])
                }
            }
        }
    }
}
