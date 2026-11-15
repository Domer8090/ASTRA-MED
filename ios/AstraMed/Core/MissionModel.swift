import Foundation
import Observation

/// App state for SwiftUI. Holds the latest engine snapshot and forwards every
/// change to the core, then reloads the snapshot. Views never compute a
/// status themselves.
@MainActor
@Observable
final class MissionModel {
    private(set) var snapshot: Snapshot?
    private(set) var startError: String?
    private(set) var lastError: String?
    private(set) var busy = false
    /// The question Tuesday is answering right now, shown until the answer is stored.
    private(set) var pendingQuestion: String?
    private(set) var coreVersion = ""
    /// Simulated loss of signal for the medical-officer contact flow. Session only.
    var simulatedLossOfSignal = false
    /// A short confirmation shown after a change was saved by the core.
    var notice: String?

    private var engine: CoreEngine?

    /// The iPad has no ground link in flight unless the crew says so; the toggle demonstrates both paths.
    var linkUp: Bool { !simulatedLossOfSignal }

    func start() async {
        guard engine == nil else { return }
        do {
            // Loading the rules engine parses a 300 KB script; keep it off the main thread.
            let engine = try await Task.detached(priority: .userInitiated) { try CoreEngine() }.value
            self.engine = engine
            coreVersion = engine.version
            await refresh()
        } catch {
            startError = error.localizedDescription
        }
    }

    func refresh() async {
        guard let engine else { return }
        do {
            snapshot = try await engine.call("snapshot", ["linkUp": linkUp], as: Snapshot.self)
            lastError = nil
        } catch {
            lastError = error.localizedDescription
        }
    }

    /// Runs a core action, reloads the snapshot and shows the core's own message.
    @discardableResult
    func perform(_ method: String, _ args: [String: Any] = [:]) async -> ActionResult? {
        guard let engine else { return nil }
        busy = true
        defer { busy = false }
        do {
            let result = try await engine.call(method, args, as: ActionResult.self)
            await refresh()
            if let message = result.message { notice = message }
            return result
        } catch {
            lastError = error.localizedDescription
            return nil
        }
    }

    func setDay(_ day: Int) async {
        guard let engine else { return }
        _ = try? await engine.callRaw("setDay", ["day": day])
        await refresh()
    }

    func series(_ metricId: String, window: TrendWindow) async -> Series? {
        guard let engine else { return nil }
        return try? await engine.call("series", ["metricId": metricId, "window": window.rawValue], as: Series.self)
    }

    func log(_ draft: [String: Any]) async -> LogResult? {
        guard let engine else { return nil }
        busy = true
        defer { busy = false }
        do {
            let result = try await engine.call("logMeasurement", draft, as: LogResult.self)
            if result.ok { await refresh() }
            return result
        } catch {
            lastError = error.localizedDescription
            return nil
        }
    }

    func manualMeasurements() async -> [ManualMeasurement] {
        guard let engine else { return [] }
        return (try? await engine.call("measurements", as: [ManualMeasurement].self)) ?? []
    }

    func setTask(_ taskId: String, completed: Bool) async {
        guard let day = snapshot?.day else { return }
        await perform("setTaskCompletion", ["day": day, "taskId": taskId, "completed": completed])
    }

    func setFollowUp(_ id: String, completed: Bool) async {
        guard let day = snapshot?.day else { return }
        await perform("setFollowUpCompletion", ["day": day, "id": id, "completed": completed])
    }

    func report() async -> String {
        guard let engine else { return "" }
        return (try? await engine.call("report", as: String.self)) ?? ""
    }

    func medicalMessage(priority: String, report: String, actionsTaken: String) async -> String {
        guard let engine else { return "" }
        let args: [String: Any] = ["priority": priority, "report": report, "actionsTaken": actionsTaken, "linkUp": linkUp]
        return (try? await engine.call("medicalMessage", args, as: String.self)) ?? ""
    }

    func logActivity(kind: String, minutes: Double? = nil, mood: Int? = nil, energy: Int? = nil) async {
        guard let engine else { return }
        var args: [String: Any] = ["kind": kind]
        if let minutes { args["minutes"] = minutes }
        if let mood { args["mood"] = mood }
        if let energy { args["energy"] = energy }
        _ = try? await engine.callRaw("logActivity", args)
        await refresh()
    }

    // MARK: Tuesday

    /// Asks Tuesday. Fixed replies (crisis, dangerous readings) always come from
    /// the core. Otherwise Apple's on-device model answers when the iPad has
    /// one, and the answer passes the core's safety filter before it is stored.
    func ask(_ text: String) async {
        guard let engine else { return }
        let question = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !question.isEmpty else { return }
        busy = true
        pendingQuestion = question
        defer { busy = false; pendingQuestion = nil }
        do {
            if OnDeviceModel.isAvailable,
               let prompt = try? await engine.call("tuesdayModelPrompt", ["text": question], as: ModelPrompt?.self) {
                do {
                    let answer = try await OnDeviceModel.answer(prompt, timeout: .seconds(45))
                    let sources = prompt.sources.map { ["label": $0.label, "url": $0.url] }
                    _ = try await engine.callRaw("tuesdayRecordModelAnswer", [
                        "question": question,
                        "answer": answer,
                        "model": OnDeviceModel.name,
                        "hasPassages": prompt.hasPassages,
                        "sources": sources,
                    ])
                    await refresh()
                    return
                } catch {
                    // Fall through to the onboard rules if the model fails.
                }
            }
            _ = try await engine.call("tuesdayAsk", ["text": question], as: AskResult?.self)
            await refresh()
        } catch {
            lastError = error.localizedDescription
        }
    }
}
