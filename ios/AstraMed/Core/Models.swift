import Foundation

/// The three status labels. Always shown with text and an icon, never colour alone.
enum HealthStatus: String, Codable, CaseIterable, Sendable {
    case nominal = "NOMINAL"
    case caution = "CAUTION"
    case critical = "CRITICAL"
}

struct SourceRef: Codable, Hashable, Sendable {
    let label: String
    let url: String
}

struct Basis: Codable, Sendable {
    let indicator: String
    let rule: String
    let provenance: String
    let reference: SourceRef?
    let referenceNote: String
}

struct RuleTrace: Codable, Sendable, Identifiable {
    var id: String { ruleId }
    let ruleId: String
    let status: HealthStatus
    let description: String
    let observed: String
    let threshold: String
    let provenance: String
}

struct MetricGuidance: Codable, Sendable {
    let whatItMeasures: String
    let whyItMatters: String
    let deviceRequired: String
    let howToMeasure: [String]
    let microgravityEffects: String
    let whenToRepeat: String
    let whatToRecord: [String]
    let nextStep: String
    let reference: SourceRef?
}

struct Metric: Codable, Sendable, Identifiable {
    let id: String
    let name: String
    let shortName: String
    let unit: String
    let system: String
    let status: HealthStatus
    let summary: String
    let explanation: String
    let recommendedNextStep: String
    let freshness: String
    let persistenceDays: Int
    let value: String?
    let delta: String?
    let recordedAt: String?
    let source: String?
    let notes: [String]
    let rules: [RuleTrace]
    let basis: Basis
    let guidance: MetricGuidance
}

struct BodySystem: Codable, Sendable, Identifiable {
    let id: String
    let name: String
    let shortName: String
    let status: HealthStatus
    let metrics: [String]
    let whyItMatters: String
    let observations: [String]
    let recommendedNextStep: String
}

struct Advisory: Codable, Sendable, Identifiable {
    let id: String
    let source: String
    let level: String
    let severity: HealthStatus
    let phase: String
    let title: String
    let summary: String
    let whyItMatters: String
    let nextStep: String
    let provenanceLabel: String
    let actions: [String]
}

struct CountermeasureTask: Codable, Sendable, Identifiable {
    let id: String
    let title: String
    let description: String
    let category: String
    let targetLabel: String
    let xp: Int
    let completed: Bool
    let linkedMetric: String?
}

struct FollowUpStep: Codable, Sendable, Identifiable {
    let id: String
    let text: String
    let completed: Bool
    let alsoResolves: String?
}

struct FollowUp: Codable, Sendable, Identifiable {
    let id: String
    let kind: String
    let severity: HealthStatus
    let title: String
    let reason: String
    let action: String
    let basis: Basis
    let completed: Bool
    let steps: [FollowUpStep]?
}

struct ReadinessComponent: Codable, Sendable, Identifiable {
    let id: String
    let label: String
    let weight: Double
    let fraction: Double
    let points: Double
    let detail: String
}

struct Readiness: Codable, Sendable {
    let score: Int
    let components: [ReadinessComponent]
    let completedTasks: Int
    let totalTasks: Int
    let totalXp: Int
    let todayXp: Int
    let streakDays: Int
    let message: String
}

struct PrimaryAction: Codable, Sendable {
    let text: String
    let severity: HealthStatus
    let source: String
}

struct TrendWatch: Codable, Sendable, Identifiable {
    var id: String { metricId + (part ?? "") }
    let metricId: String
    let part: String?
    let direction: String
    let daysToLimit: Int
    let text: String
}

struct DriftDriver: Codable, Sendable, Identifiable {
    var id: String { label }
    let label: String
    let pctChange: Double
    let text: String
}

struct DriftScore: Codable, Sendable, Identifiable {
    var id: Int { day }
    let day: Int
    let score: Double
}

struct Drift: Codable, Sendable {
    let state: String
    let text: String
    let unusualDays: Int
    let latestScore: Double?
    let scores: [DriftScore]
    let drivers: [DriftDriver]
}

struct HazardCard: Codable, Sendable, Identifiable {
    let id: String
    let name: String
    let status: HealthStatus?
    let chip: String?
    let facts: [String]
    let note: String
    let actionLabel: String
}

struct HazardInfo: Codable, Sendable, Identifiable {
    let id: String
    let name: String
    let summary: String
    let inApp: String
}

struct ContactSteps: Codable, Sendable {
    let onboardFirst: [String]
    let noLink: [String]
    let linkUpNote: String
}

struct Wellbeing: Codable, Sendable {
    let checkIns: Int
    let averageEnergy: Double?
    let rechargeMinutes: Int
    let sessions: Int
}

struct TuesdayActionRef: Codable, Sendable, Hashable {
    let kind: String
    let metricId: String?
    let priority: String?
}

struct TuesdayMessage: Codable, Sendable, Identifiable {
    let id: String
    let role: String
    let text: String
    let at: String
    let via: String?
    let model: String?
    let sources: [SourceRef]?
    let actions: [TuesdayActionRef]?
    let filtered: Int?
}

struct QueuedMessage: Codable, Sendable, Identifiable {
    let id: String
    let createdAt: String
    let missionDay: Int
    let priority: String
    let text: String
    let reviewed: Bool?
}

struct TuesdayState: Codable, Sendable {
    let messages: [TuesdayMessage]
    let outbox: [QueuedMessage]
    let bestScore: Int
    let persisted: Bool
}

struct ScenarioEvent: Codable, Sendable, Identifiable {
    let id: String
    let title: String
    let startDay: Int
    let endDay: Int
    let kind: String
    let description: String
}

struct Scenario: Codable, Sendable, Identifiable {
    let id: String
    let code: String
    let name: String
    let summary: String
    let focusDay: Int
    let events: [ScenarioEvent]?
}

struct MissionSettings: Codable, Sendable {
    let scenarioId: String
    let selectedDay: Int
    let aredTargetMinutes: Int
    let hydrationTargetLiters: Double
}

struct StorageHealth: Codable, Sendable {
    let available: Bool
    let lastWriteOk: Bool
}

struct Overall: Codable, Sendable {
    let status: HealthStatus
    let counts: [String: Int]
    let advisoryCount: Int
    let drivers: [String]
}

struct MissionInfo: Codable, Sendable {
    let name: String
    let shortName: String
    let crewId: String
    let crewLabel: String
    let totalDays: Int
}

struct SunPoint: Codable, Sendable {
    let lat: Double
    let lon: Double
}

/// Everything the engines derive for the selected mission day.
struct Snapshot: Codable, Sendable {
    let coreVersion: String
    let dataLabel: String
    let disclaimer: String
    let mission: MissionInfo
    let day: Int
    let shipTime: String
    let signalDelayMinutes: Double
    let settings: MissionSettings
    let storage: StorageHealth
    let scenario: Scenario
    let scenarios: [Scenario]
    let overall: Overall
    let dayStatus: [HealthStatus]
    let metrics: [Metric]
    let systems: [BodySystem]
    let advisories: [Advisory]
    let tasks: [CountermeasureTask]
    let followUps: [FollowUp]
    let readiness: Readiness
    let primaryAction: PrimaryAction
    let trends: [TrendWatch]
    let drift: Drift
    let hazards: [HazardCard]
    let hazardInfo: [HazardInfo]
    let contactSteps: ContactSteps
    let wellbeing: Wellbeing
    let sun: SunPoint
    let tuesday: TuesdayState

    func metric(_ id: String) -> Metric? { metrics.first { $0.id == id } }
}

struct SeriesPoint: Codable, Sendable, Identifiable {
    var id: Int { day }
    let day: Int
    let status: HealthStatus
    let values: [String: Double?]
    let manual: Bool
}

struct ChartLines: Codable, Sendable {
    let reference: [Double]?
    let caution: [Double]
    let critical: [Double]
    let provenance: String
}

struct Series: Codable, Sendable {
    let metricId: String
    let range: [Int]
    let keys: [String]
    let points: [SeriesPoint]
    let lines: ChartLines?
    let events: [ScenarioEvent]
}

struct ActionResult: Codable, Sendable {
    let ok: Bool
    let persisted: Bool?
    let message: String?
}

struct LogResult: Codable, Sendable {
    let ok: Bool
    let persisted: Bool?
    let message: String?
    let status: HealthStatus?
    let completedTaskTitle: String?
    let errors: [String: String]?
}

struct ManualMeasurement: Codable, Sendable, Identifiable {
    let id: String
    let metricId: String
    let missionDay: Int
    let recordedAt: String
    let unit: String
}

struct ModelPrompt: Codable, Sendable {
    struct Message: Codable, Sendable {
        let role: String
        let content: String
    }
    let intent: String
    let system: String
    let messages: [Message]
    let sources: [SourceRef]
    let hasPassages: Bool
}

struct AskResult: Codable, Sendable {
    let intent: String
    let fixed: Bool
    let message: TuesdayMessage
}

enum TrendWindow: Int, CaseIterable, Identifiable, Sendable {
    case week = 7, month = 30, quarter = 90, mission = 180
    var id: Int { rawValue }
    var label: String {
        switch self {
        case .week: "7 d"
        case .month: "30 d"
        case .quarter: "90 d"
        case .mission: "180 d"
        }
    }
}
