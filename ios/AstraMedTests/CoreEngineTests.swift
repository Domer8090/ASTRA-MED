import Foundation
import Testing
@testable import AstraMed

/// The iPad app runs the same core bundle as the web console. These tests
/// check the bridge and that every engine output decodes into the Swift models.
struct CoreEngineTests {
    private func makeEngine() throws -> CoreEngine {
        try CoreEngine(store: DeviceStore(fileName: "test-\(UUID().uuidString).json"))
    }

    @Test func snapshotDecodesForEveryScenario() async throws {
        let engine = try makeEngine()
        for id in ["nominal", "cardiovascular", "sep"] {
            _ = try await engine.callRaw("setScenario", ["scenarioId": id])
            let snap = try await engine.call("snapshot", [:], as: Snapshot.self)
            #expect(snap.metrics.count == 11)
            #expect(snap.dayStatus.count == snap.mission.totalDays)
            #expect(snap.dataLabel == "SYNTHETIC")
        }
    }

    @Test func scenarioBShowsCardiovascularCaution() async throws {
        let engine = try makeEngine()
        _ = try await engine.callRaw("setScenario", ["scenarioId": "cardiovascular"])
        let snap = try await engine.call("snapshot", [:], as: Snapshot.self)
        #expect(snap.overall.status == .caution)
        #expect(snap.metric("heartRate")?.status == .caution)
        #expect(snap.drift.state == "drift")
    }

    @Test func entryRulesMatchTheConsole() async throws {
        let engine = try makeEngine()
        let rejected = try await engine.call("logMeasurement", ["metricId": "heartRate", "missionDay": 42, "shipTime": "07:30", "value": "250"], as: LogResult.self)
        #expect(rejected.ok == false)
        #expect(rejected.errors?["value"] != nil)
        let saved = try await engine.call("logMeasurement", ["metricId": "heartRate", "missionDay": 42, "shipTime": "07:30", "value": "110"], as: LogResult.self)
        #expect(saved.ok)
        #expect(saved.status == .critical)
    }

    @Test func crisisGetsTheFixedReply() async throws {
        let engine = try makeEngine()
        let r = try await engine.call("tuesdayAsk", ["text": "I want to die"], as: AskResult.self)
        #expect(r.fixed)
        let prompt = try await engine.call("tuesdayModelPrompt", ["text": "my heart rate is 250 bpm"], as: ModelPrompt?.self)
        #expect(prompt == nil)
    }

    @Test func seriesDecodes() async throws {
        let engine = try makeEngine()
        for id in ["heartRate", "bloodPressure", "radiation", "sleep"] {
            let s = try await engine.call("series", ["metricId": id, "window": 30], as: Series.self)
            #expect(s.points.count == 30)
        }
    }

    @Test func dataPersistsAcrossLaunches() async throws {
        let name = "test-\(UUID().uuidString).json"
        let a = try CoreEngine(store: DeviceStore(fileName: name))
        _ = try await a.callRaw("logMeasurement", ["metricId": "sleep", "missionDay": 42, "shipTime": "06:00", "value": "5.5"])
        let b = try CoreEngine(store: DeviceStore(fileName: name))
        let list = try await b.call("measurements", [:], as: [ManualMeasurement].self)
        #expect(list.count == 1)
    }
}

struct CoreTimingTests {
    @Test func startupAndSnapshotTimes() async throws {
        let clock = ContinuousClock()
        var engine: CoreEngine?
        let start = clock.measure { engine = try? CoreEngine(store: DeviceStore(fileName: "timing-\(UUID().uuidString).json")) }
        let e = try #require(engine)
        let first = try await clock.measure { _ = try await e.callRaw("snapshot") }
        let second = try await clock.measure { _ = try await e.callRaw("snapshot") }
        print("TIMING start=\(start) firstSnapshot=\(first) secondSnapshot=\(second)")
        #expect(second < .seconds(2))
    }
}
