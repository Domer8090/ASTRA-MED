import SwiftUI

struct CountermeasuresView: View {
    @Environment(MissionModel.self) private var model

    var body: some View {
        if let snap = model.snapshot {
            List {
                Section {
                    ReadinessPanel(readiness: snap.readiness)
                        .listRowInsets(EdgeInsets())
                        .listRowBackground(Color.clear)
                }

                if !snap.followUps.isEmpty {
                    Section("Follow-ups") {
                        ForEach(snap.followUps) { f in
                            FollowUpRow(followUp: f)
                                .listRowBackground(Palette.panel)
                        }
                    }
                }

                Section("Today's countermeasures") {
                    ForEach(snap.tasks) { t in
                        Toggle(isOn: Binding(get: { t.completed }, set: { v in Task { await model.setTask(t.id, completed: v) } })) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(t.title).foregroundStyle(Palette.ink)
                                Text("\(t.targetLabel) · \(t.xp) XP").font(.caption).foregroundStyle(Palette.ink2)
                            }
                        }
                        .toggleStyle(CheckToggleStyle())
                        .listRowBackground(Palette.panel)
                    }
                }

                Section {
                    ForEach(snap.readiness.components) { c in
                        LabeledContent(c.label) {
                            Text("\(Int(c.points.rounded())) / \(Int(c.weight))").monospacedDigit()
                        }
                        .listRowBackground(Palette.panel)
                    }
                } header: {
                    Text("How readiness is scored")
                } footer: {
                    Text("A high score never hides a CAUTION or CRITICAL indicator.")
                }
            }
            .consoleBackground()
            .navigationTitle("Countermeasures")
        }
    }
}

private struct FollowUpRow: View {
    let followUp: FollowUp
    @Environment(MissionModel.self) private var model

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                StatusBadge(status: followUp.severity)
                Text(followUp.title).font(.headline).foregroundStyle(Palette.ink)
            }
            Text(followUp.reason).font(.subheadline).foregroundStyle(Palette.ink2)
            if let steps = followUp.steps, !steps.isEmpty {
                ForEach(Array(steps.enumerated()), id: \.element.id) { i, step in
                    Toggle(isOn: Binding(get: { step.completed }, set: { v in Task { await model.setFollowUp(step.id, completed: v) } })) {
                        Text("Step \(i + 1): \(step.text)").font(.subheadline)
                    }
                    .toggleStyle(CheckToggleStyle())
                }
            } else {
                Toggle(isOn: Binding(get: { followUp.completed }, set: { v in Task { await model.setFollowUp(followUp.id, completed: v) } })) {
                    Text(followUp.action).font(.subheadline)
                }
                .toggleStyle(CheckToggleStyle())
            }
            BasisLine(basis: followUp.basis)
        }
        .padding(.vertical, 4)
    }
}

/// A checkbox: large hit area, state in the icon and in the accessibility value.
struct CheckToggleStyle: ToggleStyle {
    func makeBody(configuration: Configuration) -> some View {
        Button {
            configuration.isOn.toggle()
        } label: {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: configuration.isOn ? "checkmark.square.fill" : "square")
                    .font(.title3)
                    .foregroundStyle(configuration.isOn ? Palette.nominal : Palette.ink2)
                configuration.label
                Spacer(minLength: 0)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .frame(minHeight: 44)
        .accessibilityValue(configuration.isOn ? "Done" : "Not done")
    }
}
