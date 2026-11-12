import Foundation
import UIKit
import AuthenticationServices
import Capacitor

/*
 Sign in with Apple (faqat iOS ilovasi). JS: registerPlugin('AppleSignIn') — authorize({ nonce }) → { identityToken, user, authorizationCode?, givenName?, familyName? }.

 Nega ilova ichidagi plugin (npm paket emas): loyiha Swift Package Manager (capacitor-swift-pm 8.x) ishlatadi. Tayyor
 @capacitor-community/apple-sign-in 7.x paketi `capacitor-swift-pm from "7.0.0"` (<8.0.0) talab qiladi — Capacitor 8 bilan SPM
 bog'liqligi hal bo'lmaydi; @capgo/capacitor-social-login esa Facebook va Google SDK'larini majburiy tortadi. Shuning uchun
 AppIconPlugin kabi, MainViewController da ro'yxatdan o'tkaziladigan ingichka plugin: faqat Apple'ning rasmiy AuthenticationServices API'si.

 Xavfsizlik/xulq-atvor:
   • nonce MAJBURIY (server bergan bir martalik challenge) — Apple uni identity token ichiga yozadi, server tekshiradi.
   • Faqat to'liq ism so'raladi (email so'ralmaydi: akkauntlar email bo'yicha birlashtirilmaydi, kerak ham emas).
   • Foydalanuvchi oynani bekor qilsa: reject, code = "1001" (ASAuthorizationError.canceled) — JS buni "bekor qilindi" deb ajratadi.
   • Majburiy ochish (!) yo'q: token/kod yo'q bo'lsa — aniq xato bilan reject.
   • Bir vaqtda faqat bitta so'rov (busy).
*/
@objc(AppleSignInPlugin)
public class AppleSignInPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppleSignInPlugin"
    public let jsName = "AppleSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise)
    ]

    // So'rov tugaguncha chaqiruv va controller kuchli havola bilan tirik turadi (aks holda delegate chaqirilmay qolishi mumkin)
    private var pendingCall: CAPPluginCall?
    private var authController: ASAuthorizationController?

    @objc func authorize(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if self.pendingCall != nil {
                call.reject("Apple orqali kirish allaqachon davom etmoqda", "busy")
                return
            }
            guard let nonce = call.getString("nonce"), !nonce.isEmpty else {
                call.reject("nonce kerak", "no_nonce")
                return
            }

            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.fullName]
            request.nonce = nonce

            self.pendingCall = call
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            self.authController = controller
            controller.performRequests()
        }
    }

    private func takePendingCall() -> CAPPluginCall? {
        let call = pendingCall
        pendingCall = nil
        authController = nil
        return call
    }
}

extension AppleSignInPlugin: ASAuthorizationControllerDelegate {
    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let call = takePendingCall() else { return }

        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = credential.identityToken,
              let identityToken = String(data: tokenData, encoding: .utf8) else {
            call.reject("Apple identity token olinmadi", "no_token")
            return
        }

        var result: [String: Any] = [
            "user": credential.user,
            "identityToken": identityToken
        ]
        if let codeData = credential.authorizationCode, let code = String(data: codeData, encoding: .utf8) {
            result["authorizationCode"] = code
        }
        // Ism faqat BIRINCHI avtorizatsiyada keladi
        if let givenName = credential.fullName?.givenName { result["givenName"] = givenName }
        if let familyName = credential.fullName?.familyName { result["familyName"] = familyName }
        call.resolve(result)
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        guard let call = takePendingCall() else { return }
        let nsError = error as NSError
        // ASAuthorizationError.canceled == 1001 (foydalanuvchi oynani yopdi) — JS code "1001" bo'yicha ajratadi
        call.reject(nsError.localizedDescription, String(nsError.code), error)
    }
}

extension AppleSignInPlugin: ASAuthorizationControllerPresentationContextProviding {
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }
}
