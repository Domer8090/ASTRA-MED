import SwiftUI

/// Manual entry. The core validates every value with the same rules as the web console.
struct LogReadingView: View {
    @Environment(MissionModel.self) private var model
    @State private var metricId = "heartRate"
    @State private var missionDay = 1
    @State private var shipTime = ""
    @State private var value = ""
    @State private var systolic = ""
    @State private var diastolic = ""
    @State private var glucoseContext = "fasting"
    @State private var notes = ""
    @State private var symptoms: [String: Bool] = ["blurredVision": false, "headache": false, "eyePressure": false, "otherSymptom": false]
    @State private var errors: [String: String] = [:]
    @State private var result: LogResult?
    @State private var history: [ManualMeasurement] = []

    private let symptomLabels: [(String, String)] = [
        ("blurredVision", "Blurred vision"), ("headache", "Headache"), ("eyePressure", "Eye pressure"), ("otherSymptom", "Other symptom"),
    ]

    var body: some View {
        if let snap = model.snapshot {
            Form {
                Section {
                    Picker("Indicator", selection: $metricId) {
                        ForEach(snap.metrics) { m in Text(m.name).tag(m.id) }
                    }
                    Stepper(value: $missionDay, in: 1...snap.mission.totalDays) {
                        LabeledContent("Mission day", value: "\(missionDay)")
                    }
                    field("Ship time (UTC), HH:MM", text: $shipTime, key: "recordedAt", keyboard: .numbersAndPunctuation)
                    if let err = errors["missionDay"] { errorText(err) }
                } header: {
                    Text("Reading")
                } footer: {
                    if let m = snap.metric(metricId) { Text("Device: \(m.guidance.deviceRequired)") }
                }

                Section("Value") {
                    switch metricId {
                    case "bloodPressure":
                        field("Systolic (mmHg)", text: $systolic, key: "systolic", keyboard: .numberPad)
                        field("Diastolic (mmHg)", text: $diastolic, key: "diastolic", keyboard: .numberPad)
                    case "symptoms":
                        ForEach(symptomLabels, id: \.0) { key, label in
                            Toggle(label, isOn: Binding(get: { symptoms[key] ?? false }, set: { symptoms[key] = $0 }))
                        }
                    default:
                        field(unitLabel(snap), text: $value, key: "value", keyboard: .decimalPad)
                        if metricId == "bloodGlucose" {
                            Picker("Context", selection: $glucoseContext) {
                                Text("Fasting").tag("fasting")
                                Text("After a meal").tag("post-meal")
                                Text("Other").tag("other")
                            }
                        }
                    }
                    TextField("Notes (optional, 280 characters)", text: $notes, axis: .vertical)
                    if let err = errors["notes"] { errorText(err) }
                }

                Section {
                    Button {
                        Task { await save(snap) }
                    } label: {
                        Label("Save reading", systemImage: "tray.and.arrow.down")
                    }
                    .disabled(model.busy)
                    if let result, result.ok {
                        VStack(alignment: .leading, spacing: 6) {
                            if let status = result.status {
                                HStack {
                                    Text("Engine status now")
                                    StatusBadge(status: status)
                                }
                            }
                            Text(result.message ?? "Saved.")
                            if let task = result.completedTaskTitle { Text("Completed task: \(task)").foregroundStyle(Palette.nominal) }
                            if result.persisted == false { Text("Not saved to storage on this iPad.").foregroundStyle(Palette.caution) }
                        }
                        .font(.subheadline)
                        .accessibilityElement(children: .combine)
                    }
                } footer: {
                    Text("Readings stay on this iPad. Values outside the plausible range for the device are rejected, not guessed.")
                }

                if !history.isEmpty {
                    Section("Your logged readings") {
                        ForEach(history.reversed()) { h in
                            HStack {
                                Text(snap.metric(h.metricId)?.name ?? h.metricId)
                                Spacer()
                                Text("Day \(h.missionDay)").font(.caption.monospaced()).foregroundStyle(Palette.ink2)
                            }
                            .swipeActions {
                                Button("Delete", role: .destructive) {
                                    Task {
                                        await model.perform("deleteMeasurement", ["id": h.id])
                                        history = await model.manualMeasurements()
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .consoleBackground()
            .navigationTitle("Log a reading")
            .onAppear {
                missionDay = snap.day
                if shipTime.isEmpty { shipTime = snap.shipTime }
            }
            .task { history = await model.manualMeasurements() }
            .onChange(of: metricId) { errors = [:]; result = nil }
        }
    }

    private func unitLabel(_ snap: Snapshot) -> String {
        guard let m = snap.metric(metricId) else { return "Value" }
        return m.unit.isEmpty ? "Value" : "Value (\(m.unit))"
    }

    @ViewBuilder
    private func field(_ label: String, text: Binding<String>, key: String, keyboard: UIKeyboardType) -> some View {
        LabeledContent(label) {
            TextField(label, text: text, prompt: Text("Enter"))
                .keyboardType(keyboard)
                .multilineTextAlignment(.trailing)
                .font(.body.monospacedDigit())
                .accessibilityLabel(label)
        }
        if let err = errors[key] { errorText(err) }
    }

    private func errorText(_ text: String) -> some View {
        Label(text, systemImage: "exclamationmark.circle")
            .font(.caption)
            .foregroundStyle(Palette.critical)
    }

    private func save(_ snap: Snapshot) async {
        var draft: [String: Any] = ["metricId": metricId, "missionDay": missionDay, "shipTime": shipTime, "notes": notes]
        switch metricId {
        case "bloodPressure":
            draft["systolic"] = systolic
            draft["diastolic"] = diastolic
        case "symptoms":
            draft["symptoms"] = symptoms
        default:
            draft["value"] = value
            if metricId == "bloodGlucose" { draft["glucoseContext"] = glucoseContext }
        }
        guard let r = await model.log(draft) else { return }
        result = r
        errors = r.errors ?? [:]
        if r.ok {
            value = ""; systolic = ""; diastolic = ""; notes = ""
            history = await model.manualMeasurements()
        }
    }
}
