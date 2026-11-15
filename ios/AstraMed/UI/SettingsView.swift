import SwiftUI

struct SettingsView: View {
    @Environment(MissionModel.self) private var model
    @State private var ared = 60
    @State private var hydration = 2.0
    @State private var confirmReset = false

    var body: some View {
        if let snap = model.snapshot {
            Form {
                Section {
                    Stepper("ARED target: \(ared) min", value: $ared, in: 10...180, step: 5)
                    Stepper("Fluid target: \(String(format: "%.1f", hydration)) L", value: $hydration, in: 0.5...5, step: 0.1)
                    Button("Save targets") {
                        Task { await model.perform("updatePlanTargets", ["aredTargetMinutes": ared, "hydrationTargetLiters": hydration]) }
                    }
                } header: {
                    Text("Mission plan targets")
                } footer: {
                    Text("Demo plan values. A real mission protocol sets these per crew member.")
                }

                Section("Tuesday") {
                    LabeledContent("On-device model") { Text(OnDeviceModel.isAvailable ? "Available" : "Not available") }
                    Text(OnDeviceModel.statusText).font(.caption).foregroundStyle(Palette.ink2)
                }

                Section("Data") {
                    LabeledContent("Telemetry", value: "SYNTHETIC")
                    LabeledContent("Storage", value: snap.storage.available ? "This iPad, encrypted when locked" : "Memory only")
                    LabeledContent("Rules engine", value: "ASTRA-MED core \(model.coreVersion)")
                    Button("Reset demo data", role: .destructive) { confirmReset = true }
                }

                Section("About") {
                    Text("ASTRA-MED is a NASA Space Apps Challenge 2026 prototype. Thresholds are demonstration values, not NASA flight rules or clinical standards. It never diagnoses, never suggests medication and never changes exercise or treatment.")
                        .font(.caption)
                        .foregroundStyle(Palette.ink2)
                    Link("Source code and integration guide", destination: URL(string: "https://github.com/Domer8090/ASTRA-MED")!)
                }
            }
            .consoleBackground()
            .navigationTitle("Settings")
            .onAppear {
                ared = snap.settings.aredTargetMinutes
                hydration = snap.settings.hydrationTargetLiters
            }
            .confirmationDialog("Reset demo data?", isPresented: $confirmReset, titleVisibility: .visible) {
                Button("Remove logged readings and task records", role: .destructive) {
                    Task { await model.perform("resetDemoData") }
                }
            } message: {
                Text("This removes every reading and task record logged on this iPad. It cannot be undone.")
            }
        }
    }
}
