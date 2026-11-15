import Foundation
import JavaScriptCore

/// Errors raised by the core bridge. Messages are written for the crew, not developers.
enum CoreError: LocalizedError {
    case bundleMissing
    case startFailed(String)
    case call(String)

    var errorDescription: String? {
        switch self {
        case .bundleMissing: "The ASTRA-MED rules engine is missing from this app build."
        case .startFailed(let detail): "The rules engine could not start: \(detail)"
        case .call(let detail): detail
        }
    }
}

/// Key–value storage for the rules engine, kept in one JSON file in Application Support.
/// The file uses complete data protection: it is encrypted while the iPad is locked.
/// Nothing in it ever leaves the device.
final class DeviceStore: @unchecked Sendable {
    private var values: [String: String]
    private let url: URL
    private let lock = NSLock()

    init(fileName: String = "astra-med-store.json") {
        let dir = (try? FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true))
            ?? FileManager.default.temporaryDirectory
        url = dir.appendingPathComponent(fileName)
        if let data = try? Data(contentsOf: url),
           let decoded = try? JSONDecoder().decode([String: String].self, from: data) {
            values = decoded
        } else {
            values = [:]
        }
    }

    func get(_ key: String) -> String? {
        lock.lock(); defer { lock.unlock() }
        return values[key]
    }

    func set(_ key: String, _ value: String) {
        lock.lock(); defer { lock.unlock() }
        values[key] = value
        persist()
    }

    func remove(_ key: String) {
        lock.lock(); defer { lock.unlock() }
        values.removeValue(forKey: key)
        persist()
    }

    private func persist() {
        guard let data = try? JSONEncoder().encode(values) else { return }
        try? data.write(to: url, options: [.atomic, .completeFileProtection])
    }
}

/// Runs the ASTRA-MED core (the same TypeScript engines as the web console,
/// bundled as `astra-core.js`) in JavaScriptCore. Every status, threshold and
/// guidance sentence comes from that bundle, so the iPad, desktop and web apps
/// always agree. The actor keeps calls serial and off the main thread.
actor CoreEngine {
    private let context: JSContext
    private let core: JSValue
    let version: String

    init(store: DeviceStore = DeviceStore()) throws {
        guard let url = Bundle.main.url(forResource: "astra-core", withExtension: "js"),
              let source = try? String(contentsOf: url, encoding: .utf8) else { throw CoreError.bundleMissing }
        guard let context = JSContext() else { throw CoreError.startFailed("no JavaScript context") }
        context.name = "ASTRA-MED core"
        var startError: String?
        context.exceptionHandler = { _, exception in startError = exception?.toString() }
        context.evaluateScript(source, withSourceURL: url)

        let storage = JSValue(newObjectIn: context)!
        let getItem: @convention(block) (String) -> Any = { key in store.get(key) ?? NSNull() }
        let setItem: @convention(block) (String, String) -> Void = { key, value in store.set(key, value) }
        let removeItem: @convention(block) (String) -> Void = { key in store.remove(key) }
        storage.setObject(getItem, forKeyedSubscript: "getItem" as NSString)
        storage.setObject(setItem, forKeyedSubscript: "setItem" as NSString)
        storage.setObject(removeItem, forKeyedSubscript: "removeItem" as NSString)

        guard let api = context.objectForKeyedSubscript("AstraCore"), !api.isUndefined,
              let core = api.invokeMethod("create", withArguments: [storage]), !core.isUndefined else {
            throw CoreError.startFailed(startError ?? "AstraCore was not defined")
        }
        self.context = context
        self.core = core
        self.version = api.objectForKeyedSubscript("version")?.toString() ?? "?"
    }

    /// Calls one core method and returns the raw `result` JSON.
    func callRaw(_ method: String, _ args: [String: Any] = [:]) throws -> Data {
        let argData = try JSONSerialization.data(withJSONObject: args)
        let argJSON = String(decoding: argData, as: UTF8.self)
        guard let out = core.invokeMethod("call", withArguments: [method, argJSON])?.toString() else {
            throw CoreError.call("The rules engine did not answer.")
        }
        let envelope = try JSONSerialization.jsonObject(with: Data(out.utf8)) as? [String: Any] ?? [:]
        guard envelope["ok"] as? Bool == true else {
            throw CoreError.call(envelope["error"] as? String ?? "The rules engine returned an error.")
        }
        return try JSONSerialization.data(withJSONObject: envelope["result"] ?? NSNull(), options: [.fragmentsAllowed])
    }

    func call<T: Decodable>(_ method: String, _ args: [String: Any] = [:], as type: T.Type = T.self) throws -> T {
        try JSONDecoder().decode(T.self, from: callRaw(method, args))
    }
}
