import Foundation
#if canImport(FoundationModels)
import FoundationModels
#endif

/// Apple's on-device language model (Apple Intelligence, iPadOS 26 and later).
/// It runs entirely on the iPad: the health brief never leaves the device.
/// When the model is not available, Tuesday answers with the core's onboard rules.
enum OnDeviceModel {
    static let name = "Apple on-device model"

    static var isAvailable: Bool {
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            return SystemLanguageModel.default.isAvailable
        }
        #endif
        return false
    }

    /// A one-line state for Settings.
    static var statusText: String {
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            switch SystemLanguageModel.default.availability {
            case .available:
                return "Ready. Answers are generated on this iPad and filtered by the onboard safety rules."
            case .unavailable(let reason):
                switch reason {
                case .deviceNotEligible: return "This iPad cannot run Apple Intelligence. Tuesday uses the onboard rules."
                case .appleIntelligenceNotEnabled: return "Apple Intelligence is off in Settings. Tuesday uses the onboard rules."
                case .modelNotReady: return "The on-device model is still downloading. Tuesday uses the onboard rules for now."
                @unknown default: return "The on-device model is not available. Tuesday uses the onboard rules."
                }
            }
        }
        #endif
        return "Needs iPadOS 26 with Apple Intelligence. Tuesday uses the onboard rules."
    }

    /// Answers within `timeout`, or throws so Tuesday falls back to the onboard rules.
    static func answer(_ prompt: ModelPrompt, timeout: Duration) async throws -> String {
        try await withThrowingTaskGroup(of: String.self) { group in
            group.addTask { try await answer(prompt) }
            group.addTask {
                try await Task.sleep(for: timeout)
                throw CoreError.call("The on-device model took too long.")
            }
            defer { group.cancelAll() }
            guard let first = try await group.next() else { throw CoreError.call("No answer.") }
            return first
        }
    }

    static func answer(_ prompt: ModelPrompt) async throws -> String {
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            let system = prompt.messages.first { $0.role == "system" }?.content ?? prompt.system
            // The on-device model is small: earlier turns pull it off topic, so it
            // sees only the health brief, the passages and the latest question.
            let question = prompt.messages.last { $0.role == "user" }?.content ?? ""
            let conversation = "Answer only this question from the astronaut, using the HEALTH BRIEF and PASSAGES. Do not repeat earlier topics.\n\nAstronaut: \(question)"
            let session = LanguageModelSession(instructions: system)
            let response = try await session.respond(to: conversation)
            return response.content
        }
        #endif
        throw CoreError.call("No on-device model.")
    }
}
