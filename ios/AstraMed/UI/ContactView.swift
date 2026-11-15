import SwiftUI

/// Contact the medical officer. With a ground link, the crew copies or shares a
/// prepared message into mission comms. Without one, ASTRA-MED lists on-board
/// steps and keeps the message on this iPad for the next contact. The app never sends anything.
struct ContactView: View {
    let initialPriority: String
    @Environment(MissionModel.self) private var model
    @Environment(\.dismiss) private var dismiss

    init(initialPriority: String) {
        self.initialPriority = initialPriority
        _priority = State(initialValue: initialPriority)
    }
    @State private var priority: String
    @State private var report = ""
    @State private var actionsTaken = ""
    @State private var message = ""

    var body: some View {
        @Bindable var model = model
        NavigationStack {
            Form {
                Section {
                    Label(model.linkUp ? "Ground link up" : "No ground link (loss of signal)", systemImage: model.linkUp ? "antenna.radiowaves.left.and.right" : "wifi.slash")
                        .foregroundStyle(model.linkUp ? Palette.cyan : Palette.caution)
                    if let snap = model.snapshot {
                        Text(model.linkUp
                             ? "One-way signal delay today is \(String(format: "%.1f", snap.signalDelayMinutes)) min, so the earliest reply is about \(Int((snap.signalDelayMinutes * 2).rounded())) min away."
                             : "Messages stay on this iPad and are handed over at the next contact. Decisions are made on board until then.")
                            .font(.subheadline)
                            .foregroundStyle(Palette.ink2)
                    }
                    Toggle("Simulate loss of signal", isOn: $model.simulatedLossOfSignal)
                }

                Section {
                    Picker("Priority", selection: $priority) {
                        Text("Urgent").tag("urgent")
                        Text("Routine").tag("routine")
                    }
                    .pickerStyle(.segmented)
                }

                if let steps = model.snapshot?.contactSteps, priority == "urgent" || !model.linkUp {
                    Section {
                        ForEach(Array(((priority == "urgent" ? steps.onboardFirst : []) + (model.linkUp ? [] : steps.noLink)).enumerated()), id: \.offset) { i, step in
                            HStack(alignment: .top) {
                                Text("\(i + 1).").monospacedDigit().foregroundStyle(Palette.critical)
                                Text(step)
                            }
                        }
                    } header: {
                        Label(model.linkUp ? "Do these now, on board" : "No link: do these on board", systemImage: "exclamationmark.triangle.fill")
                            .foregroundStyle(Palette.critical)
                    }
                }

                Section("What is happening?") {
                    TextField("Symptoms, when they started, readings you took", text: $report, axis: .vertical).lineLimit(3...6)
                }
                Section("What have you done so far?") {
                    TextField("Repeated the measurement, rested, told a crewmate…", text: $actionsTaken, axis: .vertical).lineLimit(2...4)
                }

                Section("Message preview") {
                    Text(message)
                        .font(.caption.monospaced())
                        .foregroundStyle(Palette.ink2)
                        .textSelection(.enabled)
                }

                Section {
                    if model.linkUp {
                        ShareLink("Share to mission comms", item: message)
                        Button("Copy message", systemImage: "doc.on.doc") {
                            UIPasteboard.general.string = message
                            model.notice = "Message copied. Paste it into the mission's messaging system."
                        }
                    }
                    Button(model.linkUp ? "Queue instead" : "Queue for next contact", systemImage: "tray.and.arrow.down") {
                        Task {
                            await model.perform("queueMessage", ["priority": priority, "text": message])
                            model.notice = "Queued on this iPad for the next contact."
                            dismiss()
                        }
                    }
                } footer: {
                    Text(model.linkUp ? (model.snapshot?.contactSteps.linkUpNote ?? "") : "ASTRA-MED does not send messages. The crew passes them on through the mission's own channels.")
                }

                if let outbox = model.snapshot?.tuesday.outbox, !outbox.isEmpty {
                    Section("Queued on this iPad (\(outbox.count))") {
                        ForEach(outbox) { q in
                            HStack {
                                Text(q.priority.uppercased()).font(.caption.weight(.bold)).foregroundStyle(q.priority == "urgent" ? Palette.critical : Palette.ink2)
                                Text("Day \(q.missionDay)").font(.caption.monospaced())
                                if q.reviewed == true { Text("Reviewed").font(.caption).foregroundStyle(Palette.nominal) }
                                Spacer()
                                if model.linkUp { ShareLink("Share", item: q.text).font(.caption) }
                            }
                            .swipeActions {
                                Button(model.linkUp ? "Sent" : "Remove", role: .destructive) {
                                    Task { await model.perform("removeQueued", ["id": q.id]) }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Contact the medical officer")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
            .task(id: "\(priority)|\(report)|\(actionsTaken)|\(model.linkUp)") {
                try? await Task.sleep(for: .milliseconds(150))
                message = await model.medicalMessage(priority: priority, report: report, actionsTaken: actionsTaken)
            }
            .onChange(of: model.simulatedLossOfSignal) { Task { await model.refresh() } }
        }
    }
}
